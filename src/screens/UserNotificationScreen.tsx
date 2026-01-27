import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserNotifications } from '../hooks/useUserNotifications'; // New hook
import { useNotices } from '../hooks/useLeaves';
import { Notification, Notice } from '../types';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import { useAds } from '../hooks/useAds';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

export const UserNotificationScreen = ({ navigation }: any) => {
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('userNotifications');
  const [activeTab, setActiveTab] = useState<'notifications' | 'notices'>('notifications');
  
  // Notifications State
  const { notifications, loading: loadingNotifications, markAllAsRead } = useUserNotifications();

  // Notices State
  const { notices, loading: loadingNotices } = useNotices();
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'CHECK_IN': return 'log-in-outline';
      case 'CHECK_OUT': return 'log-out-outline';
      case 'BREAK_START': return 'cafe-outline';
      case 'BREAK_END': return 'briefcase-outline';
      case 'DEVICE_RESET': return 'phone-portrait-outline';
      case 'MONEY_REQUEST': return 'wallet-outline';
      case 'MONEY_APPROVED': return 'checkmark-circle-outline';
      case 'MONEY_REJECTED': return 'close-circle-outline';
      case 'LEAVE_APPROVED': return 'calendar-outline';
      case 'LEAVE_REJECTED': return 'calendar-sharp';
      default: return 'notifications-outline';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'CHECK_IN': return COLORS.status.working;
      case 'CHECK_OUT': return COLORS.status.checkedOut;
      case 'BREAK_START': return COLORS.status.onBreak;
      case 'BREAK_END': return '#2196f3';
      case 'DEVICE_RESET': return '#f59e0b'; 
      case 'MONEY_REQUEST': return '#10b981';
      case 'MONEY_APPROVED': return '#22c55e';
      case 'MONEY_REJECTED': return '#ef4444'; 
      case 'LEAVE_APPROVED': return '#22c55e';
      case 'LEAVE_REJECTED': return '#ef4444';
      default: return COLORS.text.secondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return COLORS.priority.urgent;
      case 'high': return COLORS.priority.high;
      case 'normal': return COLORS.priority.normal;
      default: return COLORS.priority.low;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'alert-circle';
      case 'high': return 'warning';
      case 'normal': return 'information-circle';
      default: return 'chatbox-ellipses';
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    // Basic log notification for user
    return (
      <View style={[styles.card, !item.read && styles.unreadCard]}>
        <View style={[styles.iconContainer, { backgroundColor: getColor(item.type) }]}>
          <Icon name={getIcon(item.type)} size={24} color={COLORS.white} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{format(item.timestamp, 'PP p')}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </View>
    );
  };

  const renderNoticeItem = ({ item }: { item: Notice }) => (
    <TouchableOpacity 
      style={styles.noticeCard}
      onPress={() => {
        setSelectedNotice(item);
        setNoticeModalVisible(true);
      }}
    >
      <View style={styles.noticeHeader}>
        <View style={styles.noticeIconContainer}>
          <Icon 
            name={getPriorityIcon(item.priority)} 
            size={24} 
            color={getPriorityColor(item.priority)} 
          />
        </View>
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.noticeDate}>{format(item.createdAt, 'PPp')}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
        </View>
      </View>
      {item.message && (
        <Text style={styles.noticePreview} numberOfLines={2}>{item.message}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ alignItems: 'center', backgroundColor: COLORS.white }}>
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

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Icon 
            name="notifications" 
            size={20} 
            color={activeTab === 'notifications' ? COLORS.primary : COLORS.text.light} 
          />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Notifications
          </Text>
          {notifications.filter(n => !n.read).length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifications.filter(n => !n.read).length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notices' && styles.activeTab]}
          onPress={() => setActiveTab('notices')}
        >
          <Icon 
            name="megaphone" 
            size={20} 
            color={activeTab === 'notices' ? COLORS.primary : COLORS.text.light} 
          />
          <Text style={[styles.tabText, activeTab === 'notices' && styles.activeTabText]}>
            Notice Board
          </Text>
          {notices.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notices.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Header with Action Button */}
      {activeTab === 'notifications' && (
        <View style={styles.header}>
          <Text style={styles.title}>Your Updates</Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {activeTab === 'notifications' ? (
        <>
          {loadingNotifications ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
            />
          )}
        </>
      ) : (
        <>
          {loadingNotices ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={notices}
              renderItem={renderNoticeItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No active notices.</Text>}
            />
          )}
        </>
      )}

      {/* Notice Detail Modal */}
      <Modal visible={noticeModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.noticeModalHeader}>
              <Icon 
                name={selectedNotice ? getPriorityIcon(selectedNotice.priority) : 'information-circle'} 
                size={32} 
                color={selectedNotice ? getPriorityColor(selectedNotice.priority) : COLORS.priority.normal} 
              />
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setNoticeModalVisible(false)}
              >
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.noticeModalTitle}>{selectedNotice?.title}</Text>
            
            <View style={styles.noticeModalMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: selectedNotice ? getPriorityColor(selectedNotice.priority) : COLORS.priority.normal }]}>
                <Text style={styles.priorityText}>{selectedNotice?.priority.toUpperCase()}</Text>
              </View>
              <Text style={styles.noticeModalDate}>
                {selectedNotice && format(selectedNotice.createdAt, 'PPp')}
              </Text>
            </View>

            <ScrollView style={styles.noticeModalBody}>
              <Text style={styles.noticeModalMessage}>{selectedNotice?.message}</Text>
            </ScrollView>

            <TouchableOpacity 
              style={styles.button}
              onPress={() => setNoticeModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.light,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  badge: {
    backgroundColor: COLORS.status.offline,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary },
  markReadText: { color: COLORS.primary, fontWeight: '600' },

  // List
  list: { padding: 15 },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.text.secondary, fontSize: 16 },

  // Notification Card
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  unreadCard: {
    backgroundColor: '#e3f2fd',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contentContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196f3',
    marginLeft: 10,
  },

  // Notice Card
  noticeCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noticeIconContainer: {
    marginRight: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  noticeDate: {
    fontSize: 12,
    color: COLORS.text.light,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  priorityText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  noticePreview: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginTop: 4,
  },

  // Modal
  modalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: COLORS.white, 
    borderRadius: 15, 
    padding: 20,
    maxHeight: '80%',
  },
  noticeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  noticeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
    lineHeight: 28,
  },
  noticeModalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  noticeModalDate: {
    fontSize: 13,
    color: COLORS.text.light,
  },
  noticeModalBody: {
    maxHeight: 300,
    marginBottom: 16,
  },
  noticeModalMessage: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  button: { 
    backgroundColor: COLORS.primary, 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center',
  },
  buttonText: { 
    color: COLORS.white, 
    fontWeight: 'bold',
    fontSize: 16,
  },
});
