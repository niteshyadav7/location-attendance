import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useManageNotices } from '../hooks/useManageNotices';
import { useAuthStore } from '../store/useAuthStore';
import { Notice } from '../types';
import { COLORS } from '../constants/theme';
import { useAds } from '../hooks/useAds';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

export const AdminNoticeScreen = () => {
  const user = useAuthStore((state) => state.user);
  const { notices, loading: noticesLoading, addNotice, toggleNoticeActive, deleteNotice } = useManageNotices(user?.organizationId);
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('adminNotices');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [expiryDays, setExpiryDays] = useState('7');

  // Data fetching handled by hook

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

      await addNotice({
        title: title.trim(),
        message: message.trim(),
        priority,
        organizationId: user?.organizationId || '', // MULTI-TENANCY
        createdBy: user?.uid || '',
        createdAt: Date.now(),
        expiresAt,
        isActive: true,
      });

      Alert.alert('Success', 'Notice posted successfully!');
      setTitle('');
      setMessage('');
      setPriority('medium');
      setExpiryDays('7');
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
      await toggleNoticeActive(noticeId, currentStatus);
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
              await deleteNotice(noticeId);
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
      case 'urgent': return COLORS.priority.urgent;
      case 'high': return COLORS.priority.high;
      case 'medium': return COLORS.priority.normal;
      case 'low': return COLORS.priority.low;
      default: return COLORS.priority.low;
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
      <View style={{ alignItems: 'center', backgroundColor: COLORS.background }}>
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
              placeholderTextColor={COLORS.text.light}
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
              placeholderTextColor={COLORS.text.light}
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
              placeholderTextColor={COLORS.text.light}
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
                  <ActivityIndicator color={COLORS.white} />
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


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  createButtonIcon: {
    fontSize: 20,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
    marginTop: 12,
  },
  labelHint: {
    fontSize: 12,
    color: COLORS.text.light,
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityButtonText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  priorityButtonTextActive: {
    color: COLORS.white,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: COLORS.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  noticesSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.light,
  },
  noticeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  noticePriorityText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  noticeMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  noticeDate: {
    fontSize: 12,
    color: COLORS.text.light,
    marginBottom: 4,
  },
  noticeExpiry: {
    fontSize: 12,
    color: COLORS.status.onBreak,
    fontWeight: '600',
  },
  appUrlBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  appUrlText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
  },
  noticeActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  noticeActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary, 
  },
});
