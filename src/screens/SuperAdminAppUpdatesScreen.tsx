import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppUpdates } from '../hooks/useAppUpdates';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../constants/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';

export const SuperAdminAppUpdatesScreen = ({ navigation }: any) => {
  const user = useAuthStore((state) => state.user);
  const { appUpdates, loading: loadingUpdates, addAppUpdate, toggleAppUpdateActive, deleteAppUpdate } = useAppUpdates();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');

  const handleCreateAppUpdate = async () => {
    if (!title.trim() || !message.trim() || !appUrl.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Message, and App URL)');
      return;
    }

    setLoading(true);
    try {
      const expiresAt = expiryDays 
        ? Date.now() + (parseInt(expiryDays) * 24 * 60 * 60 * 1000)
        : undefined;

      await addAppUpdate({
        title: title.trim(),
        message: message.trim(),
        appUrl: appUrl.trim(),
        createdBy: user?.uid || '',
        createdAt: Date.now(),
        expiresAt,
        isActive: true,
      });

      Alert.alert('✅ Success', 'App update posted successfully!');
      setTitle('');
      setMessage('');
      setAppUrl('');
      setExpiryDays('30');
      setShowForm(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (updateId: string, currentStatus: boolean) => {
    try {
      await toggleAppUpdateActive(updateId, currentStatus);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    Alert.alert(
      'Delete App Update',
      'Are you sure you want to delete this app update?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppUpdate(updateId);
              Alert.alert('Success', 'App update deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    return format(timestamp, 'MMM dd, yyyy HH:mm');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>📱 App Updates</Text>
            <Text style={styles.headerSubtitle}>Manage app update announcements</Text>
          </View>
        </View>

        {/* Create Notice Button */}
        {!showForm && (
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <Icon name="add-circle" size={24} color={COLORS.white} />
            <Text style={styles.createButtonText}>Post App Update</Text>
          </TouchableOpacity>
        )}

        {/* Create Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>📢 New App Update</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New Version Available!"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={COLORS.text.light}
            />

            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what's new in this update..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={COLORS.text.light}
            />

            <Text style={styles.label}>Play Store URL *</Text>
            <Text style={styles.labelHint}>Full Google Play Store link</Text>
            <TextInput
              style={styles.input}
              placeholder="https://play.google.com/store/apps/details?id=..."
              value={appUrl}
              onChangeText={setAppUrl}
              placeholderTextColor={COLORS.text.light}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.label}>Expires in (days)</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
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
                  setAppUrl('');
                  setExpiryDays('30');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.submitButton]}
                onPress={handleCreateAppUpdate}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Post Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* App Updates List */}
        <View style={styles.noticesSection}>
          <Text style={styles.sectionTitle}>
            Active Updates ({appUpdates.filter(u => u.isActive).length})
          </Text>
          
          {appUpdates.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📱</Text>
              <Text style={styles.emptyText}>No app updates yet</Text>
              <Text style={styles.emptySubtext}>Post your first app update announcement</Text>
            </View>
          ) : (
            appUpdates.map((update) => (
              <View 
                key={update.id} 
                style={[
                  styles.noticeCard,
                  !update.isActive && styles.noticeCardInactive,
                ]}
              >
                {/* App Update Badge */}
                <View style={styles.appUpdateBadge}>
                  <Icon name="logo-google-playstore" size={16} color={COLORS.white} />
                  <Text style={styles.appUpdateBadgeText}>APP UPDATE</Text>
                </View>

                {/* Content */}
                <Text style={styles.noticeTitle}>{update.title}</Text>
                <Text style={styles.noticeMessage} numberOfLines={3}>{update.message}</Text>
                
                {/* App URL */}
                <View style={styles.urlContainer}>
                  <Icon name="link" size={14} color="#0284C7" />
                  <Text style={styles.urlText} numberOfLines={1}>{update.appUrl}</Text>
                </View>

                <Text style={styles.noticeDate}>📅 {formatDate(update.createdAt)}</Text>
                
                {update.expiresAt && (
                  <Text style={styles.noticeExpiry}>
                    ⏰ Expires: {formatDate(update.expiresAt)}
                  </Text>
                )}

                {/* Actions */}
                <View style={styles.noticeActions}>
                  <TouchableOpacity
                    style={[styles.noticeActionButton, update.isActive ? styles.deactivateButton : styles.activateButton]}
                    onPress={() => handleToggleActive(update.id, update.isActive)}
                    activeOpacity={0.7}
                  >
                    <Icon name={update.isActive ? "pause-circle" : "play-circle"} size={16} color={COLORS.text.primary} />
                    <Text style={styles.noticeActionButtonText}>
                      {update.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.noticeActionButton, styles.deleteButton]}
                    onPress={() => handleDeleteUpdate(update.id)}
                    activeOpacity={0.7}
                  >
                    <Icon name="trash" size={16} color={COLORS.text.primary} />
                    <Text style={styles.noticeActionButtonText}>Delete</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
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
    backgroundColor: '#10B981',
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
  appUpdateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  appUpdateBadgeText: {
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
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '500',
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
  noticeActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  noticeActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
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
