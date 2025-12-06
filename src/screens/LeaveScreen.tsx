import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { getFirestore, collection, query, where, addDoc, onSnapshot } from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { LeaveRequest, Notice } from '../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';

export const LeaveScreen = () => {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'leaves' | 'notices'>('leaves');
  
  // Leaves State
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Notices State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);

  // Fetch Leaves
  useEffect(() => {
    if (!user) return;
    const db = getFirestore();
    const q = query(
      collection(db, 'leaves'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as LeaveRequest));
      data.sort((a: LeaveRequest, b: LeaveRequest) => b.requestDate - a.requestDate);
      setLeaves(data);
      setLoadingLeaves(false);
    });

    return () => unsubscribe();
  }, [user]);

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

  const handleRequest = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      Alert.alert('Error', 'Date must be in YYYY-MM-DD format');
      return;
    }

    setSubmitting(true);
    try {
      const db = getFirestore();
      await addDoc(collection(db, 'leaves'), {
        userId: user?.uid,
        userName: user?.name,
        startDate,
        endDate,
        reason,
        status: 'PENDING',
        requestDate: Date.now(),
      });
      setModalVisible(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      Alert.alert('Success', 'Leave request submitted');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#4CD964';
      case 'REJECTED': return '#FF3B30';
      default: return '#F5A623';
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

  const renderLeaveItem = ({ item }: { item: LeaveRequest }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.date}>{item.startDate} to {item.endDate}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.reason}>{item.reason}</Text>
      <Text style={styles.timestamp}>Requested on {format(item.requestDate, 'PP')}</Text>
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
          <Ionicons 
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
          style={[styles.tab, activeTab === 'leaves' && styles.activeTab]}
          onPress={() => setActiveTab('leaves')}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={activeTab === 'leaves' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[styles.tabText, activeTab === 'leaves' && styles.activeTabText]}>
            My Leaves
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notices' && styles.activeTab]}
          onPress={() => setActiveTab('notices')}
        >
          <Ionicons 
            name="megaphone" 
            size={20} 
            color={activeTab === 'notices' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[styles.tabText, activeTab === 'notices' && styles.activeTabText]}>
            Notice Board
          </Text>
          {notices.length > 0 && (
            <View style={styles.noticeBadge}>
              <Text style={styles.noticeBadgeText}>{notices.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'leaves' ? (
        <>
          {loadingLeaves ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={leaves}
              renderItem={renderLeaveItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No leave requests found.</Text>}
            />
          )}

          <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          {loadingNotices ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={notices}
              renderItem={renderNoticeItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No active notices.</Text>}
            />
          )}
        </>
      )}

      {/* Leave Request Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Leave</Text>
            
            <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="2023-12-01" 
              value={startDate} 
              onChangeText={setStartDate} 
              keyboardType="numeric"
            />

            <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="2023-12-05" 
              value={endDate} 
              onChangeText={setEndDate} 
              keyboardType="numeric"
            />

            <Text style={styles.label}>Reason</Text>
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              placeholder="Sick leave, Vacation..." 
              value={reason} 
              onChangeText={setReason} 
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleRequest} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notice Detail Modal */}
      <Modal visible={noticeModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.noticeModalHeader}>
              <Ionicons 
                name={selectedNotice ? getPriorityIcon(selectedNotice.priority) : 'information-circle'} 
                size={32} 
                color={selectedNotice ? getPriorityColor(selectedNotice.priority) : '#007AFF'} 
              />
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setNoticeModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
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
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#007AFF',
  },
  noticeBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  noticeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // List
  list: { padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 },

  // Leave Card
  card: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  reason: { fontSize: 14, color: '#666', marginBottom: 8, lineHeight: 20 },
  timestamp: { fontSize: 12, color: '#999' },

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

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#333',
  },
  label: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 5,
    fontWeight: '600',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 15, 
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10,
    gap: 10,
  },
  button: { 
    flex: 1, 
    backgroundColor: '#007AFF', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center',
  },
  cancelButton: { 
    backgroundColor: '#FF3B30',
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Notice Modal
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
});
