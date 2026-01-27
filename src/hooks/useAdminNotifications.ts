import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, writeBatch, doc, where } from '@react-native-firebase/firestore';
import { Notification } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export const useAdminNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        if (!user?.organizationId) return;

        const db = getFirestore();
        let q;

        if (user.role === 'super_admin') {
            // Super Admin might see all? Or filtered? Let's filter by org for consistency for now
            // or just allow all if they are truly super. 
            // NOTE: Firestore rules limit queries to one-org-at-a-time unless we query very widely.
            // For safety, let's filter by Org. 
             q = query(
                 collection(db, 'notifications'), 
                 where('organizationId', '==', user.organizationId),
                 orderBy('timestamp', 'desc'), 
                 limit(50)
            );
        } else {
             q = query(
                 collection(db, 'notifications'), 
                 where('organizationId', '==', user.organizationId),
                 orderBy('timestamp', 'desc'), 
                 limit(50)
            );
        }
        
        const unsub = onSnapshot(q, (snapshot) => {
             const list: Notification[] = [];
             snapshot.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() } as Notification));
             setNotifications(list);
             setLoading(false);
        }, (err) => {
            console.error('Notification Error:', err);
            setLoading(false);
        });
        return () => unsub();
    }, [user?.organizationId]);

    const markAllAsRead = async () => {
        const db = getFirestore();
        const batch = writeBatch(db);
        
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;
    
        unread.forEach(n => {
          const ref = doc(db, 'notifications', n.id);
          batch.update(ref, { read: true });
        });
    
        try {
          await batch.commit();
        } catch (error) {
          console.error("Error marking as read", error);
        }
    };

    return { notifications, loading, markAllAsRead };
};
