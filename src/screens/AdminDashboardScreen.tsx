import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { UserProfile } from '../types';
import { format } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ working: 0, onBreak: 0, checkedOut: 0, offline: 0 });
  const [refreshing, setRefreshing] = useState(false);

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
      setFilteredUsers(userList);
      setStats({ working, onBreak, checkedOut, offline });
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
        setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleRefresh = () => {
    setRefreshing(true);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'WORKING': return '#10b981';
      case 'ON_BREAK': return '#f59e0b';
      case 'CHECKED_OUT': return '#6b7280';
      default: return '#ef4444';
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

  const handleUserPress = (userId: string) => {
    navigation.navigate('UserDetails', { userId });
  };

  const renderStatCard = (
    icon: string,
    count: number,
    label: string,
    colors: string[]
  ) => (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statCard}
    >
      <Ionicons name={icon as any} size={24} color="#fff" />
      <Text style={styles.statNumber}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  );

  const renderItem = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleUserPress(item.uid)}
    >
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.name}</Text>
              {item.isActive === false && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inactive</Text>
                </View>
              )}
            </View>
            <Text style={styles.email}>{item.email}</Text>
            
            {item.lastActive && (
              <View style={styles.lastActiveRow}>
                <Ionicons name="time-outline" size={12} color="#9ca3af" />
                <Text style={styles.lastActiveText}>
                  {format(item.lastActive, 'MMM dd, h:mm a')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.currentStatus) }]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{getStatusLabel(item.currentStatus)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" style={{ marginTop: 8 }} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        {renderStatCard('briefcase', stats.working, 'Working', ['#10b981', '#059669'])}
        {renderStatCard('cafe', stats.onBreak, 'On Break', ['#f59e0b', '#d97706'])}
        {renderStatCard('checkmark-circle', stats.checkedOut, 'Done', ['#6b7280', '#4b5563'])}
        {renderStatCard('moon', stats.offline, 'Offline', ['#ef4444', '#dc2626'])}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* User List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={item => item.uid}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No users found matching your search' : 'No users found'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb' 
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: { 
    fontSize: 11, 
    color: 'rgba(255, 255, 255, 0.9)', 
    marginTop: 4,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
  },
  list: { 
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: { 
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1f2937',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inactiveBadgeText: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '600',
  },
  email: { 
    fontSize: 13, 
    color: '#6b7280', 
    marginBottom: 6,
  },
  lastActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastActiveText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  statusText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 16, 
    color: '#9ca3af',
    fontSize: 14,
  },
});
