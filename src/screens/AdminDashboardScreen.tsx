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
  SafeAreaView,
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
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({ working: 0, onBreak: 0, checkedOut: 0, offline: 0 });
  const [refreshing, setRefreshing] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
    let filtered = users;

    // Filter by status if selected
    if (selectedStatus) {
      filtered = filtered.filter(user => {
        const status = user.currentStatus || 'OFFLINE';
        return status === selectedStatus;
      });
    }

    // Filter by search query
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
  };

  const handleStatusFilter = (status: string) => {
    // Toggle filter: if same status is clicked, clear filter
    if (selectedStatus === status) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(status);
    }
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
    colors: string[],
    status: string
  ) => {
    const isActive = selectedStatus === status;
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleStatusFilter(status)}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.statCard,
            isActive && styles.statCardActive
          ]}
        >
          <Ionicons name={icon as any} size={28} color="#fff" />
          <Text style={styles.statNumber}>{count}</Text>
          <Text style={styles.statLabel}>{label}</Text>
          {isActive && (
            <View style={styles.activeIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleUserPress(item.uid)}
      style={styles.cardTouchable}
    >
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {/* Left Section - Avatar */}
          <View style={styles.leftSection}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            
            {/* Status indicator dot on avatar */}
            <View style={[styles.statusIndicatorDot, { 
              backgroundColor: getStatusColor(item.currentStatus),
            }]} />
          </View>

          {/* Middle Section - User Info */}
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.isActive === false && (
                <View style={styles.inactiveBadge}>
                  <Ionicons name="ban-outline" size={10} color="#dc2626" />
                  <Text style={styles.inactiveBadgeText}>Inactive</Text>
                </View>
              )}
            </View>
            
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={13} color="#9ca3af" />
              <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
            </View>
            
            {item.lastActive && (
              <View style={styles.lastActiveRow}>
                <Ionicons name="time-outline" size={12} color="#9ca3af" />
                <Text style={styles.lastActiveText}>
                  {format(item.lastActive, 'MMM dd, h:mm a')}
                </Text>
              </View>
            )}
          </View>

          {/* Right Section - Status & Arrow */}
          <View style={styles.rightSection}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.currentStatus) }]}>
              <Text style={styles.statusText}>{getStatusLabel(item.currentStatus)}</Text>
            </View>
            
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color="#9ca3af" 
              style={styles.chevronIcon}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header with Title and Search */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.compactSearchContainer}>
          <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.compactSearchInput}
            placeholder="Search..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Header */}
      <View style={styles.statsContainer}>
        {renderStatCard('briefcase', stats.working, 'Working', ['#10b981', '#059669'], 'WORKING')}
        {renderStatCard('cafe', stats.onBreak, 'On Break', ['#f59e0b', '#d97706'], 'ON_BREAK')}
        {renderStatCard('checkmark-circle', stats.checkedOut, 'Done', ['#6b7280', '#4b5563'], 'CHECKED_OUT')}
        {renderStatCard('moon', stats.offline, 'Offline', ['#ef4444', '#dc2626'], 'OFFLINE')}
      </View>

      {/* Content Container (Overlapping) */}
      <View style={styles.contentContainer}>
        {/* Search Bar (Hidden/Deprecated, but structure remains for minimal diff) */}
        
        {/* Active Filter Indicator */}
        {selectedStatus && (
          <View style={styles.filterIndicator}>
            <View style={styles.filterIconContainer}>
              <Ionicons 
                name={
                  selectedStatus === 'WORKING' ? 'briefcase' :
                  selectedStatus === 'ON_BREAK' ? 'cafe' :
                  selectedStatus === 'CHECKED_OUT' ? 'checkmark-circle' :
                  'moon'
                } 
                size={20} 
                color="#667eea" 
              />
            </View>
            <View style={styles.filterTextContainer}>
              <Text style={styles.filterText}>
                Showing <Text style={styles.filterStatusText}>{getStatusLabel(selectedStatus)}</Text> users
              </Text>
              <Text style={styles.filterCount}>
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setSelectedStatus(null)}
              style={styles.clearFilterButton}
            >
              <Text style={styles.clearFilterText}>Clear</Text>
              <Ionicons name="close-circle" size={18} color="#667eea" />
            </TouchableOpacity>
          </View>
        )}

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb' 
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 115,
  },
  statCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 160,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  statNumber: { 
    fontSize: 32, 
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    marginBottom: 6,
  },
  statLabel: { 
    fontSize: 13, 
    color: '#fff', 
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statCardActive: {
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  searchContainer: {
    // Deprecated styles, keeping for reference or removal
    display: 'none',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#f9fafb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  compactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    width: '50%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  compactSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    paddingVertical: 0, 
    height: 20,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
  },
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8, // Added for clear separation
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  filterIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  filterTextContainer: {
    flex: 1,
  },
  filterText: {
    fontSize: 14,
    color: '#5b21b6',
    fontWeight: '600',
    marginBottom: 2,
  },
  filterStatusText: {
    fontWeight: '700',
    color: '#667eea',
  },
  filterCount: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '500',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
  },
  list: { 
    padding: 16,
    paddingTop: 0,
  },
  cardTouchable: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    elevation: 3,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 18,
    alignItems: 'center',
    gap: 14,
  },
  leftSection: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  statusIndicatorDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3.5,
    borderColor: '#ffffff',
    elevation: 3,
  },
  userInfo: { 
    flex: 1,
    gap: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: { 
    fontSize: 16.5, 
    fontWeight: '700', 
    color: '#111827',
    flex: 1,
    letterSpacing: 0.2,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  inactiveBadgeText: {
    fontSize: 9.5,
    color: '#dc2626',
    fontWeight: '700',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  email: { 
    fontSize: 13, 
    color: '#6b7280', 
    fontWeight: '500',
    flex: 1,
  },
  lastActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastActiveText: {
    fontSize: 11.5,
    color: '#9ca3af',
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
  },
  statusBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 7, 
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  statusText: { 
    color: '#fff', 
    fontSize: 11.5, 
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chevronIcon: {
    opacity: 0.6,
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
