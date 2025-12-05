import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native';
import { getFirestore, collection, addDoc, query, onSnapshot, updateDoc, doc, deleteDoc } from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { Notice } from '../types';

export const AdminNoticeScreen = () => {
  const user = useAuthStore((state) => state.user);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [expiryDays, setExpiryDays] = useState('7');

  const db = getFirestore();

  useEffect(() => {
    // Simplified query - sort in app instead of Firestore
    const q = query(collection(db, 'notices'));
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        if (!snapshot) {
          console.log('No snapshot received');
          return;
        }

        const noticeList: Notice[] = [];
        snapshot.forEach((doc: any) => {
          noticeList.push({ id: doc.id, ...doc.data() } as Notice);
        });
        
        // Sort by createdAt in the app (newest first)
        noticeList.sort((a, b) => b.createdAt - a.createdAt);
        
        setNotices(noticeList);
      },
      (error) => {
        console.error('Error fetching notices:', error);
        Alert.alert('Error', 'Failed to load notices. Please try again.');
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCreateNotice = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const expiresAt = expiryDays 
        ? Date.now() + (parseInt(expiryDays) * 24 * 60 * 60 * 1000)
        : undefined;

      await addDoc(collection(db, 'notices'), {
        title: title.trim(),
        message: message.trim(),
        priority,
        createdBy: user?.uid,
        createdAt: Date.now(),
        expiresAt,
        isActive: true,
      });

      Alert.alert('Success', 'Notice posted successfully!');
      setTitle('');
      setMessage('');
      setPriority('medium');
      setExpiryDays('7');
      setShowForm(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (noticeId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'notices', noticeId), {
        isActive: !currentStatus,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    Alert.alert(
      'Delete Notice',
      'Are you sure you want to delete this notice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'notices', noticeId));
              Alert.alert('Success', 'Notice deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return '#E74C3C';
      case 'high': return '#F39C12';
      case 'medium': return '#3498DB';
      case 'low': return '#95A5A6';
      default: return '#95A5A6';
    }
  };

  const getPriorityIcon = (p: string) => {
    switch (p) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return 'ℹ️';
      case 'low': return '📌';
      default: return '📌';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📢 Notice Board</Text>
          <Text style={styles.headerSubtitle}>Manage announcements</Text>
        </View>

        {/* Create Notice Button */}
        {!showForm && (
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonIcon}>➕</Text>
            <Text style={styles.createButtonText}>Post New Notice</Text>
          </TouchableOpacity>
        )}

        {/* Create Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create New Notice</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter notice title..."
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter notice message..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && { backgroundColor: getPriorityColor(p) },
                  ]}
                  onPress={() => setPriority(p)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    priority === p && styles.priorityButtonTextActive,
                  ]}>
                    {getPriorityIcon(p)} {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Expires in (days)</Text>
            <TextInput
              style={styles.input}
              placeholder="7"
              value={expiryDays}
              onChangeText={setExpiryDays}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setShowForm(false);
                  setTitle('');
                  setMessage('');
                  setPriority('medium');
                  setExpiryDays('7');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.submitButton]}
                onPress={handleCreateNotice}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Post Notice</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Notices List */}
        <View style={styles.noticesSection}>
          <Text style={styles.sectionTitle}>Active Notices ({notices.filter(n => n.isActive).length})</Text>
          
          {notices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No notices yet</Text>
              <Text style={styles.emptySubtext}>Create your first announcement</Text>
            </View>
          ) : (
            notices.map((notice) => (
              <View 
                key={notice.id} 
                style={[
                  styles.noticeCard,
                  !notice.isActive && styles.noticeCardInactive,
                ]}
              >
                {/* Priority Badge */}
                <View style={[styles.noticePriorityBadge, { backgroundColor: getPriorityColor(notice.priority) }]}>
                  <Text style={styles.noticePriorityText}>
                    {getPriorityIcon(notice.priority)} {notice.priority.toUpperCase()}
                  </Text>
                </View>

                {/* Content */}
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeMessage} numberOfLines={3}>{notice.message}</Text>
                <Text style={styles.noticeDate}>📅 {formatDate(notice.createdAt)}</Text>
                
                {notice.expiresAt && (
                  <Text style={styles.noticeExpiry}>
                    ⏰ Expires: {formatDate(notice.expiresAt)}
                  </Text>
                )}

                {/* Actions */}
                <View style={styles.noticeActions}>
                  <TouchableOpacity
                    style={[styles.noticeActionButton, notice.isActive ? styles.deactivateButton : styles.activateButton]}
                    onPress={() => handleToggleActive(notice.id, notice.isActive)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.noticeActionButtonText}>
                      {notice.isActive ? '🔕 Deactivate' : '🔔 Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.noticeActionButton, styles.deleteButton]}
                    onPress={() => handleDeleteNotice(notice.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.noticeActionButtonText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    padding: moderateScale(20),
  },
  header: {
    marginBottom: moderateScale(20),
  },
  headerTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: moderateScale(4),
  },
  headerSubtitle: {
    fontSize: moderateScale(16),
    color: '#6B7280',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: moderateScale(16),
    borderRadius: moderateScale(12),
    marginBottom: moderateScale(20),
    gap: moderateScale(8),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  createButtonIcon: {
    fontSize: moderateScale(20),
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    marginBottom: moderateScale(20),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: moderateScale(16),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: moderateScale(8),
    marginTop: moderateScale(12),
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    fontSize: moderateScale(15),
    color: '#1A1A1A',
  },
  textArea: {
    height: moderateScale(100),
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  priorityButton: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityButtonText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    fontWeight: '600',
  },
  priorityButtonTextActive: {
    color: '#FFFFFF',
  },
  formActions: {
    flexDirection: 'row',
    gap: moderateScale(12),
    marginTop: moderateScale(20),
  },
  actionButton: {
    flex: 1,
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontWeight: 'bold',
  },
  noticesSection: {
    marginTop: moderateScale(10),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: moderateScale(16),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: moderateScale(60),
  },
  emptyIcon: {
    fontSize: moderateScale(64),
    marginBottom: moderateScale(16),
  },
  emptyText: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: moderateScale(4),
  },
  emptySubtext: {
    fontSize: moderateScale(14),
    color: '#9CA3AF',
  },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  noticeCardInactive: {
    opacity: 0.6,
  },
  noticePriorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(6),
    marginBottom: moderateScale(12),
  },
  noticePriorityText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11),
    fontWeight: 'bold',
  },
  noticeTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: moderateScale(8),
  },
  noticeMessage: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    lineHeight: moderateScale(20),
    marginBottom: moderateScale(8),
  },
  noticeDate: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    marginBottom: moderateScale(4),
  },
  noticeExpiry: {
    fontSize: moderateScale(12),
    color: '#F59E0B',
    fontWeight: '600',
  },
  noticeActions: {
    flexDirection: 'row',
    gap: moderateScale(8),
    marginTop: moderateScale(12),
  },
  noticeActionButton: {
    flex: 1,
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(6),
    alignItems: 'center',
  },
  deactivateButton: {
    backgroundColor: '#FEF3C7',
  },
  activateButton: {
    backgroundColor: '#D1FAE5',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  noticeActionButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
});
