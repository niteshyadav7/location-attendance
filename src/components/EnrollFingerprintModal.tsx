import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { MantraScannerService, FingerprintCaptureResult } from '../services/MantraScanner';
import { COLORS } from '../constants/theme';
import { UserProfile } from '../types';

interface EnrollFingerprintModalProps {
  visible: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onEnrollSuccess?: (template: string) => void;
}

export const EnrollFingerprintModal: React.FC<EnrollFingerprintModalProps> = ({
  visible,
  user,
  onClose,
  onEnrollSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<string>('Initializing scanner...');
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanQuality, setScanQuality] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [capturedData, setCapturedData] = useState<FingerprintCaptureResult | null>(null);

  // Initialize and register scanner listeners
  useEffect(() => {
    if (!visible || !user) return;

    let attachedSubscription: any;
    let detachedSubscription: any;
    let previewSubscription: any;

    const initScanner = async () => {
      setLoading(true);
      try {
        await MantraScannerService.initializeScanner();
        setScannerStatus('Scanner initialized. Checking connection...');
        setIsDeviceConnected(true); // Assume connected initially, listeners will update
      } catch (err: any) {
        console.error('Scanner init failed', err);
        setScannerStatus('Failed to init scanner driver.');
        setErrorMessage(err.message || 'Mantra Driver Init Error');
        setScanState('error');
      } finally {
        setLoading(false);
      }
    };

    // Register hardware event listeners
    attachedSubscription = MantraScannerService.addListener('onDeviceAttached', (data) => {
      setIsDeviceConnected(data.hasPermission);
      setScannerStatus(data.hasPermission ? 'Scanner connected & ready.' : 'Scanner connected. Requesting permission...');
    });

    detachedSubscription = MantraScannerService.addListener('onDeviceDetached', () => {
      setIsDeviceConnected(false);
      setScannerStatus('Scanner disconnected. Please connect via OTG.');
      if (scanState === 'scanning') {
        setScanState('idle');
      }
    });

    previewSubscription = MantraScannerService.addListener('onPreview', (data) => {
      if (data && typeof data.quality === 'number') {
        setScanQuality(data.quality);
      }
    });

    initScanner();

    return () => {
      // Clean up subscriptions
      attachedSubscription?.remove();
      detachedSubscription?.remove();
      previewSubscription?.remove();
      
      // Stop scanner
      MantraScannerService.stopCapture().catch(console.error);
      MantraScannerService.uninitializeScanner().catch(console.error);
    };
  }, [visible, user]);

  const handleStartCapture = async () => {
    if (!user) return;
    
    setScanState('scanning');
    setScanQuality(null);
    setErrorMessage('');
    
    try {
      // Min quality 55, timeout 15000ms
      const result = await MantraScannerService.startCapture(55, 15000);
      setCapturedData(result);
      setScanQuality(result.quality);
      setScanState('success');
    } catch (err: any) {
      console.warn('Capture failed', err);
      setErrorMessage(err.message || 'Scan failed. Please try again.');
      setScanState('error');
    }
  };

  const handleSaveFingerprint = async () => {
    if (!user || !capturedData) return;

    setLoading(true);
    try {
      // Save Base64 template to Firestore
      await firestore().collection('users').doc(user.uid).update({
        fingerprintTemplate: capturedData.isoTemplate,
      });

      Alert.alert('Success', `Fingerprint registered for ${user.name}!`);
      
      if (onEnrollSuccess) {
        onEnrollSuccess(capturedData.isoTemplate);
      }
      handleClose();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save template: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setScanState('idle');
    setScanQuality(null);
    setErrorMessage('');
    setCapturedData(null);
    onClose();
  };

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Register Fingerprint</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Icon name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          {/* User Brief */}
          <View style={styles.userCard}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>

          {/* Device Status Indicator */}
          <View style={styles.statusBanner}>
            <Icon 
              name={isDeviceConnected ? "checkmark-circle" : "alert-circle"} 
              size={18} 
              color={isDeviceConnected ? COLORS.status.working : COLORS.status.offline} 
            />
            <Text style={[styles.statusText, { color: isDeviceConnected ? COLORS.status.working : COLORS.status.offline }]}>
              {scannerStatus}
            </Text>
          </View>

          {/* Core Scanner UI */}
          <View style={styles.scannerContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <>
                {scanState === 'idle' && (
                  <View style={styles.stateContainer}>
                    <Icon name="finger-print-outline" size={80} color={COLORS.text.light} />
                    <Text style={styles.instructionText}>
                      Ready to register. Tap below to scan.
                    </Text>
                    <TouchableOpacity
                      style={[styles.actionButton, !isDeviceConnected && styles.disabledButton]}
                      onPress={handleStartCapture}
                      disabled={!isDeviceConnected}
                    >
                      <Text style={styles.actionButtonText}>Start Scan</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {scanState === 'scanning' && (
                  <View style={styles.stateContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 15 }} />
                    <Icon name="finger-print" size={80} color={COLORS.primary} />
                    <Text style={styles.instructionText}>
                      Place employee's finger on the scanner sensor now...
                    </Text>
                    {scanQuality !== null && (
                      <Text style={styles.qualityText}>Quality: {scanQuality}%</Text>
                    )}
                    <TouchableOpacity
                      style={[styles.secondaryButton, { marginTop: 15 }]}
                      onPress={() => MantraScannerService.stopCapture().then(() => setScanState('idle'))}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {scanState === 'success' && (
                  <View style={styles.stateContainer}>
                    <Icon name="checkmark-circle" size={80} color={COLORS.status.working} />
                    <Text style={styles.successText}>Fingerprint Captured!</Text>
                    {scanQuality !== null && (
                      <Text style={styles.qualityText}>Scan Quality: {scanQuality}%</Text>
                    )}
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={styles.secondaryButton} onPress={handleStartCapture}>
                        <Text style={styles.secondaryButtonText}>Scan Again</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={handleSaveFingerprint}>
                        <Text style={styles.actionButtonText}>Save & Register</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {scanState === 'error' && (
                  <View style={styles.stateContainer}>
                    <Icon name="close-circle" size={80} color={COLORS.status.offline} />
                    <Text style={styles.errorTitle}>Capture Failed</Text>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity style={styles.actionButton} onPress={handleStartCapture}>
                      <Text style={styles.actionButtonText}>Retry Scan</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  userCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 6,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    paddingVertical: 10,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 5,
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.status.working,
    marginTop: 15,
    marginBottom: 5,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.status.offline,
    marginTop: 15,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: COLORS.text.light,
    opacity: 0.6,
  },
  secondaryButton: {
    borderColor: COLORS.text.light,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
});
