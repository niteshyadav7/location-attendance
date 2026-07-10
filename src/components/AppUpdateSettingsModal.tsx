import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';
import firestore from '@react-native-firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface AppUpdateSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface AppConfig {
  minAppVersion: string;
  latestAppVersion: string;
  forceUpdateEnabled: boolean;
  playStoreUrl: string;
  message: string;
}

export const AppUpdateSettingsModal = ({ visible, onClose }: AppUpdateSettingsModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [minAppVersion, setMinAppVersion] = useState('');
  const [latestAppVersion, setLatestAppVersion] = useState('');
  const [forceUpdateEnabled, setForceUpdateEnabled] = useState(false);
  const [playStoreUrl, setPlayStoreUrl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    const db = firestore();
    const unsubscribe = db
      .collection('admin_settings')
      .doc('app_config')
      .onSnapshot(
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as AppConfig;
            setMinAppVersion(data.minAppVersion || '1.0.0');
            setLatestAppVersion(data.latestAppVersion || '1.0.0');
            setForceUpdateEnabled(!!data.forceUpdateEnabled);
            setPlayStoreUrl(data.playStoreUrl || '');
            setMessage(data.message || '');
          }
          setLoading(false);
        },
        (error) => {
          console.error('Failed to load app config settings:', error);
          Alert.alert('Error', 'Failed to load app update configuration');
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [visible]);

  const handleSave = async () => {
    if (!minAppVersion.trim() || !latestAppVersion.trim() || !playStoreUrl.trim()) {
      Alert.alert('Validation Error', 'Minimum Version, Latest Version, and Play Store URL are required.');
      return;
    }

    setSaving(true);
    try {
      const db = firestore();
      await db.collection('admin_settings').doc('app_config').set({
        minAppVersion: minAppVersion.trim(),
        latestAppVersion: latestAppVersion.trim(),
        forceUpdateEnabled,
        playStoreUrl: playStoreUrl.trim(),
        message: message.trim(),
      }, { merge: true });

      Alert.alert('🎉 Success', 'App Update configuration saved successfully!');
      onClose();
    } catch (error: any) {
      console.error('Failed to save update configuration:', error);
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const { width } = Dimensions.get('window');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.container, { width: width * 0.95, maxHeight: '90%' }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Ionicons name="phone-portrait" size={24} color={COLORS.primary} />
              <Text style={styles.title}>Update Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButtonContainer}>
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Fetching App Config...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              
              {/* Force Update Switch */}
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.switchLabelContainer}>
                    <Text style={styles.label}>Force Update Lockout</Text>
                    <Text style={styles.hint}>Locks out users below Minimum Version</Text>
                  </View>
                  <Switch
                    value={forceUpdateEnabled}
                    onValueChange={setForceUpdateEnabled}
                    trackColor={{ false: '#767577', true: COLORS.primary }}
                  />
                </View>
              </View>

              {/* Version Controls */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Version Targets</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Minimum Allowed Version *</Text>
                  <TextInput
                    style={styles.input}
                    value={minAppVersion}
                    onChangeText={setMinAppVersion}
                    placeholder="e.g., 4.0.0"
                    placeholderTextColor={COLORS.text.light}
                  />

                  <Text style={styles.inputLabel}>Latest Released Version *</Text>
                  <TextInput
                    style={styles.input}
                    value={latestAppVersion}
                    onChangeText={setLatestAppVersion}
                    placeholder="e.g., 4.0.2"
                    placeholderTextColor={COLORS.text.light}
                  />
                </View>
              </View>

              {/* Play Store Link */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>App Details</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Play Store URL *</Text>
                  <TextInput
                    style={styles.input}
                    value={playStoreUrl}
                    onChangeText={setPlayStoreUrl}
                    placeholder="market://details?id=com.locationattendence"
                    placeholderTextColor={COLORS.text.light}
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Lockout Display Message</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Please update to the latest version to access attendance services."
                    placeholderTextColor={COLORS.text.light}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Configuration</Text>
                )}
              </TouchableOpacity>

            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  closeButtonContainer: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  content: {
    gap: 16,
    paddingBottom: 20,
  },
  centerLoading: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.text.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  hint: {
    fontSize: 12,
    color: COLORS.text.light,
    marginTop: 2,
  },
  inputGroup: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
