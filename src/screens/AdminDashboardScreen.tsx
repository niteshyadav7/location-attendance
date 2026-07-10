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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserProfile } from '../types';
import { format } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../constants/theme';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { useAuthStore } from '../store/useAuthStore';

import { ScreenAdBanner, useScreenInterstitial } from '../components/ScreenAds';
import { useAds } from '../hooks/useAds';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const user = useAuthStore((state) => state.user);
  const { shouldShowAd } = useAds();
  
  // Interstitial on mount
  useScreenInterstitial('adminDashboard');

  const {
    filteredUsers,
    loading,
    stats,
    refreshing,
    handleRefresh,
    searchQuery,
    setSearchQuery,
    selectedStatus,
    handleStatusFilter
  } = useAdminDashboard();
  


  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'WORKING': return COLORS.status.working;
      case 'ON_BREAK': return COLORS.status.onBreak;
      case 'CHECKED_OUT': return COLORS.status.checkedOut;
      default: return COLORS.status.offline;
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
    if (!userId) {
        console.warn("Attempted to navigate with empty userId");
        return;
    }
    console.log("Navigating to UserDetails with:", userId);
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
        style={styles.statCardTouchable}
      >
        <View style={styles.statCardContainer}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.statCircle,
              isActive && styles.statCircleActive
            ]}
          >
            <Ionicons name={icon as any} size={14} color={COLORS.white} style={{ marginBottom: 1 }} />
            <Text style={styles.statNumber}>{count}</Text>
            {isActive && (
              <View style={styles.activeIndicatorCircle}>
                <Ionicons name="checkmark-circle" size={10} color={COLORS.white} />
              </View>
            )}
          </LinearGradient>
          <Text style={[styles.statLabelText, isActive && styles.statLabelTextActive]}>{label}</Text>
        </View>
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
              colors={COLORS.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            
            {/* Status indicator dot on avatar */}
            <View style={[styles.statusIndicatorDot, { 
              backgroundColor: getStatusColor(item.currentStatus),
              borderColor: COLORS.white,
            }]} />
          </View>

          {/* Middle Section - User Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {item.appVersion && (
              <Text style={styles.appVersion}>v{item.appVersion}</Text>
            )}
            {item.isActive === false && (
              <View style={styles.inactiveBadge}>
                <Ionicons name="ban-outline" size={10} color={COLORS.status.offline} />
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>
          
          <View style={styles.emailRow}>
            <Ionicons name="mail-outline" size={13} color={COLORS.text.light} />
            <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
          </View>
          
          {item.lastActive && (
            <View style={styles.lastActiveRow}>
              <Ionicons name="time-outline" size={12} color={COLORS.text.light} />
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
              color={COLORS.text.light}
              style={styles.chevronIcon}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ alignItems: 'center', backgroundColor: COLORS.background }}>
        <ScreenAdBanner screen="adminDashboard" />
      </View>
      {/* Custom Header with Title and Search */}
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AdminPaybook')}
            style={{
              padding: 8,
              backgroundColor: '#EEF2FF',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#C7D2FE',
            }}
          >
            <Ionicons name="card" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.compactSearchContainer}>
          <Ionicons name="search" size={18} color={COLORS.text.light} style={styles.searchIcon} />
          <TextInput
            style={styles.compactSearchInput}
            placeholder="Search..."
            placeholderTextColor={COLORS.text.light}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.text.light} />
            </TouchableOpacity>
          )}
        </View>
      </View>

        {/* Stats Header */}
        <View style={styles.statsContainer}>
        {renderStatCard('briefcase', stats.working, 'Working', COLORS.gradients.working, 'WORKING')}
        {renderStatCard('cafe', stats.onBreak, 'On Break', COLORS.gradients.onBreak, 'ON_BREAK')}
        {renderStatCard('checkmark-circle', stats.checkedOut, 'Done', COLORS.gradients.checkedOut, 'CHECKED_OUT')}
        {renderStatCard('moon', stats.offline, 'Offline', COLORS.gradients.offline, 'OFFLINE')}
      </View>

      {/* Content Container (Overlapping) */}
      <View style={styles.contentContainer}>
        
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
                color={COLORS.primary} 
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
              onPress={() => handleStatusFilter(selectedStatus)}
              style={styles.clearFilterButton}
            >
              <Text style={styles.clearFilterText}>Clear</Text>
              <Ionicons name="close-circle" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* User List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
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
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={COLORS.text.light} />
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
    backgroundColor: COLORS.background,
  },
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: COLORS.background,
    marginBottom: 12,
  },
  statCardTouchable: {
    flex: 1,
    alignItems: 'center',
  },
  statCardContainer: {
    alignItems: 'center',
  },
  statCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: 'transparent',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    position: 'relative',
  },
  statCircleActive: {
    borderColor: COLORS.white,
    elevation: 5,
    transform: [{ scale: 1.05 }],
  },
  statNumber: { 
    fontSize: 20, 
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: -2,
  },
  statLabelText: { 
    fontSize: 11, 
    color: COLORS.text.secondary, 
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  statLabelTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  activeIndicatorCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  compactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
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
    color: COLORS.text.primary,
    paddingVertical: 0, 
    height: 20,
  },
  searchIcon: {
    marginRight: 6,
  },
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe', // Keep simplified tint
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
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
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  filterTextContainer: {
    flex: 1,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  filterStatusText: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterCount: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 13,
    color: COLORS.primary,
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
    backgroundColor: COLORS.white,
    borderRadius: 18,
    elevation: 3,
    shadowColor: COLORS.primary,
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  statusIndicatorDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3.5,
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
    color: COLORS.text.primary,
    flex: 1,
    letterSpacing: 0.2,
  },
  appVersion: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.light,
    marginLeft: 4,
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
    color: COLORS.status.offline,
    fontWeight: '700',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  email: { 
    fontSize: 13, 
    color: COLORS.text.secondary, 
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
    color: COLORS.text.light,
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
    color: COLORS.white, 
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
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 16, 
    color: COLORS.text.light,
    fontSize: 14,
  },
  settingsButton: {
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});
