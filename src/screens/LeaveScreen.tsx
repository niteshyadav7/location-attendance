import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { getFirestore, collection, query, where, addDoc, onSnapshot, orderBy } from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { LeaveRequest } from '../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';

export const LeaveScreen = () => {
  const user = useAuthStore((state) => state.user);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const db = getFirestore();
    const q = query(
        collection(db, 'leaves'), 
        where('userId', '==', user.uid)
        // orderBy('requestDate', 'desc') // Requires index
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as LeaveRequest));
      // Client-side sort
      data.sort((a: LeaveRequest, b: LeaveRequest) => b.requestDate - a.requestDate);
      setLeaves(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleRequest = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    // Simple regex for YYYY-MM-DD
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

  const renderItem = ({ item }: { item: LeaveRequest }) => (
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

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={leaves}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No leave requests found.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  date: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  reason: { fontSize: 14, color: '#666', marginBottom: 5 },
  timestamp: { fontSize: 12, color: '#999' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#007AFF', width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', elevation: 5
  },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  button: { flex: 1, backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginLeft: 5 },
  cancelButton: { backgroundColor: '#FF3B30', marginRight: 5 },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});
