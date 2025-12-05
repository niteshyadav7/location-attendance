import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { UserProfile } from '../types';
import { format } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const AdminDashboardScreen = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ working: 0, onBreak: 0, checkedOut: 0, offline: 0 });

  useEffect(() => {
    const db = getFirestore();
    const q = query(collection(db, 'users'), where('role', '==', 'user'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: UserProfile[] = [];
      let working = 0, onBreak = 0, checkedOut = 0, offline = 0;

      snapshot.forEach((doc: any) => {
        const userData = { ...doc.data(), uid: doc.id } as UserProfile;
        userList.push(userData);

        // Calculate Stats
        const status = userData.currentStatus || 'OFFLINE';
        if (status === 'WORKING') working++;
        else if (status === 'ON_BREAK') onBreak++;
        else if (status === 'CHECKED_OUT') checkedOut++;
        else offline++;
      });

      setUsers(userList);
      setStats({ working, onBreak, checkedOut, offline });
      setLoading(false);
    }, (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'WORKING': return '#4CD964'; // Green
      case 'ON_BREAK': return '#F5A623'; // Orange
      case 'CHECKED_OUT': return '#8E8E93'; // Gray
      default: return '#FF3B30'; // Red (Offline/Absent)
    }
  };

  const getStatusLabel = (status?: string) => {
      switch (status) {
          case 'WORKING': return 'Working';
          case 'ON_BREAK': return 'On Break';
          case 'CHECKED_OUT': return 'Checked Out';
          default: return 'Offline';
      }
  };

  const renderItem = ({ item }: { item: UserProfile }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.userInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.currentStatus) }]}>
            <Text style={styles.badgeText}>{getStatusLabel(item.currentStatus)}</Text>
        </View>
      </View>
      {item.lastActive && (
        <View style={styles.details}>
            <Text style={styles.detailText}>
                <Ionicons name="time-outline" size={14} /> Last Update: {format(item.lastActive, 'p')}
            </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#4CD964' }]}>{stats.working}</Text>
            <Text style={styles.statLabel}>Working</Text>
        </View>
        <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#F5A623' }]}>{stats.onBreak}</Text>
            <Text style={styles.statLabel}>Break</Text>
        </View>
        <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#8E8E93' }]}>{stats.checkedOut}</Text>
            <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{stats.offline}</Text>
            <Text style={styles.statLabel}>Offline</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={item => item.uid}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    elevation: 2,
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  list: { padding: 15 },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 12, color: '#888', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  details: { flexDirection: 'row', marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  detailText: { fontSize: 12, color: '#666', marginRight: 15 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
});
