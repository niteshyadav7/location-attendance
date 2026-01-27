import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LeaveRequest } from '../types';
import { format } from 'date-fns';
import { useAdminLeaves } from '../hooks/useLeaves';
import { COLORS } from '../constants/theme';
import { useAds } from '../hooks/useAds';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

type TabType = 'PENDING' | 'APPROVED';

export const AdminLeaveScreen = () => {
  const { pendingLeaves, approvedLeaves, loading, updateLeaveStatus } = useAdminLeaves();
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('adminLeaves');
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateLeaveStatus(id, status);
      Alert.alert('Success', `Leave request ${status.toLowerCase()}.`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderPendingItem = ({ item }: { item: LeaveRequest }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.userName}</Text>
        <Text style={styles.date}>{format(item.requestDate, 'MMM d')}</Text>
      </View>
      
      <Text style={styles.period}>
        {item.startDate}  ➔  {item.endDate}
      </Text>
      
      <Text style={styles.reason}>"{item.reason}"</Text>

      <View style={styles.actions}>
        <TouchableOpacity 
            style={[styles.button, styles.rejectButton]} 
            onPress={() => handleAction(item.id, 'REJECTED')}
        >
            <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.button, styles.approveButton]} 
            onPress={() => handleAction(item.id, 'APPROVED')}
        >
            <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderApprovedItem = ({ item }: { item: LeaveRequest }) => (
    <View style={[styles.card, styles.approvedCard]}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.userName}</Text>
        <View style={styles.approvedBadge}>
          <Text style={styles.approvedBadgeText}>✓ Approved</Text>
        </View>
      </View>
      
      <Text style={styles.period}>
        {item.startDate}  ➔  {item.endDate}
      </Text>
      
      <Text style={styles.reason}>"{item.reason}"</Text>
      
      <Text style={styles.requestedDate}>
        Requested on {format(item.requestDate, 'MMM d, yyyy')}
      </Text>
    </View>
  );

  const currentData = activeTab === 'PENDING' ? pendingLeaves : approvedLeaves;
  const renderItem = activeTab === 'PENDING' ? renderPendingItem : renderApprovedItem;

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'PENDING' && styles.activeTab]}
          onPress={() => setActiveTab('PENDING')}
        >
          <Text style={[styles.tabText, activeTab === 'PENDING' && styles.activeTabText]}>
            Pending ({pendingLeaves.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'APPROVED' && styles.activeTab]}
          onPress={() => setActiveTab('APPROVED')}
        >
          <Text style={[styles.tabText, activeTab === 'APPROVED' && styles.activeTabText]}>
            Approved ({approvedLeaves.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ alignItems: 'center', backgroundColor: COLORS.background, paddingVertical: 10 }}>
        {showAd && (
          <BannerAd
            unitId={effectiveBannerId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={currentData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {activeTab === 'PENDING' 
                ? 'No pending leave requests.' 
                : 'No approved leaves yet.'}
            </Text>
          }
        />
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  list: { padding: 20 },
  card: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  approvedCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.status.working, // Green
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  name: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary },
  date: { fontSize: 12, color: COLORS.text.light },
  approvedBadge: {
    backgroundColor: COLORS.status.working + '20', // Opacity
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  approvedBadgeText: {
    color: COLORS.status.working,
    fontSize: 12,
    fontWeight: 'bold',
  },
  period: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 5 },
  reason: { fontSize: 14, color: '#555', fontStyle: 'italic', marginBottom: 15 },
  requestedDate: {
    fontSize: 12,
    color: COLORS.text.light,
    marginTop: 5,
  },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  approveButton: { backgroundColor: COLORS.status.working },
  rejectButton: { backgroundColor: COLORS.status.offline },
  buttonText: { color: COLORS.white, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.text.secondary, fontSize: 16 },
});
