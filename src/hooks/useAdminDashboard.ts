import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { UserProfile } from '../types';

import { useAuthStore } from '../store/useAuthStore';

export const useAdminDashboard = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({ working: 0, onBreak: 0, checkedOut: 0, offline: 0 });
  const [refreshing, setRefreshing] = useState(false);
  
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!user?.organizationId) return;

    const db = getFirestore();
    const q = query(
        collection(db, 'users'), 
        where('organizationId', '==', user.organizationId),
        where('role', '==', 'user')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: UserProfile[] = [];
      let working = 0, onBreak = 0, checkedOut = 0, offline = 0;

      snapshot.forEach((doc: any) => {
        const userData = { ...doc.data(), uid: doc.id } as UserProfile;
        userList.push(userData);

        const status = userData.currentStatus || 'OFFLINE';
        if (status === 'WORKING') working++;
        else if (status === 'ON_BREAK') onBreak++;
        else if (status === 'CHECKED_OUT') checkedOut++;
        else offline++;
      });

      setUsers(userList);
      setStats({ working, onBreak, checkedOut, offline });
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
        setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user?.organizationId]);

  useEffect(() => {
    let filtered = users;
    if (selectedStatus) {
      filtered = filtered.filter(user => {
        const status = user.currentStatus || 'OFFLINE';
        return status === selectedStatus;
      });
    }
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredUsers(filtered);
  }, [searchQuery, users, selectedStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000); 
  };

  const handleStatusFilter = (status: string) => {
    if (selectedStatus === status) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(status);
    }
  };

  return {
    filteredUsers,
    loading,
    stats,
    refreshing,
    handleRefresh,
    searchQuery,
    setSearchQuery,
    selectedStatus,
    handleStatusFilter,
    usersCount: users.length
  };
};
