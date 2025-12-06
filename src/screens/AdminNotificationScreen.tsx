import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { getFirestore, collection, query, orderBy, onSnapshot, limit, updateDoc, doc, where, writeBatch } from '@react-native-firebase/firestore';
import { Notification, Notice } from '../types';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';

export const AdminNotificationScreen = () => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'notices'>('notifications');
  
  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Notices State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);

  // Fetch Notifications
  useEffect(() => {
    const db = getFirestore();
    const q = query(
      collection(db, 'notifications'), 
      orderBy('timestamp', 'desc'), 
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc: any) => {
        notifs.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notifs);
      setLoadingNotifications(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Notices
  useEffect(() => {
    const db = getFirestore();
    const q = query(
      collection(db, 'notices'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const noticeList: Notice[] = [];
      snapshot.forEach((doc: any) => {
        const notice = { id: doc.id, ...doc.data() } as Notice;
        if (!notice.expiresAt || notice.expiresAt > Date.now()) {
          noticeList.push(notice);
        }
      });
      noticeList.sort((a, b) => b.createdAt - a.createdAt);
      setNotices(noticeList);
      setLoadingNotices(false);
    });

    return () => unsubscribe();
  }, []);

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'CHECK_IN': return 'log-in-outline';
      case 'CHECK_OUT': return 'log-out-outline';
      case 'BREAK_START': return 'cafe-outline';
      case 'BREAK_END': return 'briefcase-outline';
      default: return 'notifications-outline';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'CHECK_IN': return '#4caf50';
      case 'CHECK_OUT': return '#f44336';
      case 'BREAK_START': return '#ff9800';
      case 'BREAK_END': return '#2196f3';
      default: return '#666';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'normal': return '#007AFF';
      default: return '#8E8E93';
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

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <View style={[styles.card, !item.read && styles.unreadCard]}>
      <View style={[styles.iconContainer, { backgroundColor: getColor(item.type) }]}>
        <Icon name={getIcon(item.type)} size={24} color="#fff" />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{format(item.timestamp, 'PP p')}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </View>
  );

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
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Icon 
            name="notifications" 
            size={20} 
            color={activeTab === 'notifications' ? '#667eea' : '#8E8E93'} 
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
            color={activeTab === 'notices' ? '#667eea' : '#8E8E93'} 
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
          <Text style={styles.title}>Attendance Updates</Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {activeTab === 'notifications' ? (
        <>
          {loadingNotifications ? (
            <ActivityIndicator size="large" color="#667eea" style={{ marginTop: 20 }} />
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
            <ActivityIndicator size="large" color="#667eea" style={{ marginTop: 20 }} />
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
                color={selectedNotice ? getPriorityColor(selectedNotice.priority) : '#007AFF'} 
              />
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setNoticeModalVisible(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.noticeModalTitle}>{selectedNotice?.title}</Text>
            
            <View style={styles.noticeModalMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: selectedNotice ? getPriorityColor(selectedNotice.priority) : '#007AFF' }]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#667eea',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  markReadText: { color: '#667eea', fontWeight: '600' },

  // List
  list: { padding: 15 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 },

  // Notification Card
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#888',
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
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 4,
  },
  noticeDate: {
    fontSize: 12,
    color: '#999',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noticePreview: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#fff', 
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
    color: '#333',
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
    color: '#999',
  },
  noticeModalBody: {
    maxHeight: 300,
    marginBottom: 16,
  },
  noticeModalMessage: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  button: { 
    backgroundColor: '#667eea', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center',
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 16,
  },
});
