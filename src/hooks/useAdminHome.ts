import { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot, doc, deleteDoc, query, where } from '@react-native-firebase/firestore';
import { LocationConfig } from '../types';
import { Alert } from 'react-native';

import { useAuthStore } from '../store/useAuthStore';

export const useAdminHome = () => {
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!user?.organizationId) return;
    
    const db = getFirestore();
    const orgId = user.organizationId;
    
    // Fetch locations (filtered by Org)
    const locationsUnsubscribe = onSnapshot(
        query(collection(db, 'locations'), where('organizationId', '==', orgId)),
        (snapshot) => {
          const locs: LocationConfig[] = [];
          snapshot.forEach((doc: any) => {
            locs.push({ id: doc.id, ...doc.data() } as LocationConfig);
          });
          setLocations(locs);
          setLoading(false);
          setError(null);
        },
        (err: any) => {
          console.error('Locations Error:', err);
          setError(err.message);
          setLoading(false);
        }
      );

    // Fetch pending users count (filtered by Org)
    const pendingUnsubscribe = onSnapshot(
      query(collection(db, 'users'), where('organizationId', '==', orgId), where('status', '==', 'pending')),
      (snapshot) => {
        setPendingCount(snapshot.size);
      },
      (err) => console.log('Pending Users Error:', err)
    );

    // Fetch unread notifications count (filtered by Org OR User)
    // Notifications might need complex query, but let's stick to simple org-wide or user-specific
    // For now, let's just query where organizationId matches (if notifications have it)
    let notifQuery = query(collection(db, 'notifications'), where('read', '==', false));
    if (user.role !== 'super_admin') {
        notifQuery = query(collection(db, 'notifications'), where('organizationId', '==', orgId), where('read', '==', false));
    }

    const notifUnsubscribe = onSnapshot(
        notifQuery,
        (snapshot) => {
            setUnreadNotifCount(snapshot.size);
        },
        (err) => console.log('Notif Error:', err)
    );

    return () => {
      locationsUnsubscribe();
      pendingUnsubscribe();
      notifUnsubscribe();
    };
  }, [user?.organizationId]);

  const handleDeleteLocation = async (id: string) => {
    Alert.alert(
        "Delete Location",
        "Are you sure?",
        [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                const db = getFirestore();
                await deleteDoc(doc(db, 'locations', id));
            }}
        ]
    );
  };

  return {
    locations,
    loading,
    error,
    pendingCount,
    unreadNotifCount,
    handleDeleteLocation
  };
};
