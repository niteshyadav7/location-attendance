import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc, orderBy } from '@react-native-firebase/firestore';
import { LeaveRequest } from '../types';
import { format } from 'date-fns';

type TabType = 'PENDING' | 'APPROVED';

export const AdminLeaveScreen = () => {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');

  useEffect(() => {
    const db = getFirestore();
    
    // Query for pending leaves
    const pendingQuery = query(collection(db, 'leaves'), where('status', '==', 'PENDING'));
    
    // Query for approved leaves
    const approvedQuery = query(collection(db, 'leaves'), where('status', '==', 'APPROVED'));

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as LeaveRequest));
      // Sort by oldest first
      data.sort((a: LeaveRequest, b: LeaveRequest) => a.requestDate - b.requestDate);
      setPendingRequests(data);
      setLoading(false);
    });

    const unsubscribeApproved = onSnapshot(approvedQuery, (snapshot) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as LeaveRequest));
      // Sort by newest first for approved
      data.sort((a: LeaveRequest, b: LeaveRequest) => b.requestDate - a.requestDate);
      setApprovedRequests(data);
    });

    return () => {
      unsubscribePending();
      unsubscribeApproved();
    };
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'leaves', id), { status });
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

  const currentData = activeTab === 'PENDING' ? pendingRequests : approvedRequests;
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
            Pending ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'APPROVED' && styles.activeTab]}
          onPress={() => setActiveTab('APPROVED')}
        >
          <Text style={[styles.tabText, activeTab === 'APPROVED' && styles.activeTabText]}>
            Approved ({approvedRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#007AFF',
  },
  list: { padding: 20 },
  card: { 
    backgroundColor: '#fff', 
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
    borderLeftColor: '#4CD964',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  date: { fontSize: 12, color: '#999' },
  approvedBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  approvedBadgeText: {
    color: '#4CD964',
    fontSize: 12,
    fontWeight: 'bold',
  },
  period: { fontSize: 16, fontWeight: '600', color: '#007AFF', marginBottom: 5 },
  reason: { fontSize: 14, color: '#555', fontStyle: 'italic', marginBottom: 15 },
  requestedDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  approveButton: { backgroundColor: '#4CD964' },
  rejectButton: { backgroundColor: '#FF3B30' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 },
});
