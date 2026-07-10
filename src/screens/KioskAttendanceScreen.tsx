import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import { format } from 'date-fns';
import { COLORS } from '../constants/theme';
import { MantraScannerService, UserTemplateRecord } from '../services/MantraScanner';
import { useAuthStore } from '../store/useAuthStore';
import { LocationConfig, UserProfile, AttendanceRecord, BreakSession } from '../types';

interface KioskAttendanceScreenProps {
  route?: {
    params: {
      location: LocationConfig;
    };
  };
  navigation?: any;
}

export const KioskAttendanceScreen = ({
  route,
  navigation,
}: any) => {
  const { location } = route.params;
  const adminOrganization = useAuthStore((state) => state.organization);

  // States
  const [loading, setLoading] = useState(false);
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [scannerError, setScannerError] = useState<string>('');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing Mantra Scanner...');
  
  // Database Users
  const [eligibleUsers, setEligibleUsers] = useState<UserProfile[]>([]);
  
  // Active User Flow
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [todayDocId, setTodayDocId] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [scanQuality, setScanQuality] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Refs for tracking unmount and loop state
  const isMounted = useRef(true);
  const isScanning = useRef(false);
  const actionTimeoutRef = useRef<any>(null);

  // 1. Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), 'hh:mm:ss a'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Load users with registered fingerprints
  useEffect(() => {
    if (!adminOrganization) return;

    const unsubscribe = firestore()
      .collection('users')
      .where('organizationId', '==', adminOrganization.id)
      .where('isActive', '==', true)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) return;
          const usersList: UserProfile[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as UserProfile;
            if (data.fingerprintTemplate) {
              usersList.push(data);
            }
          });
          setEligibleUsers(usersList);
        },
        (err) => {
          console.error('Failed to listen to users', err);
        }
      );

    return () => unsubscribe();
  }, [adminOrganization]);

  // 3. Initialize Scanner and Start Scan Loop
  useEffect(() => {
    isMounted.current = true;
    let attachedSub: any;
    let detachedSub: any;
    let previewSub: any;

    const startScanner = async () => {
      try {
        await MantraScannerService.initializeScanner();
        setDeviceConnected(true);
        setIsScannerReady(true);
        setStatusMessage('Scanner ready. Please place finger on sensor.');
        // Trigger loop after initialization
        triggerScan();
      } catch (err: any) {
        console.warn('Mantra init failed', err);
        setScannerError(err.message || 'Mantra Driver Init Failed');
        setStatusMessage('Scanner connection error.');
      }
    };

    // Listeners
    attachedSub = MantraScannerService.addListener('onDeviceAttached', (data) => {
      setDeviceConnected(data.hasPermission);
      if (data.hasPermission) {
        setIsScannerReady(true);
        setStatusMessage('Scanner re-connected and ready.');
        setScannerError('');
        triggerScan();
      } else {
        setStatusMessage('Scanner connected. Granting permission...');
      }
    });

    detachedSub = MantraScannerService.addListener('onDeviceDetached', () => {
      setDeviceConnected(false);
      setIsScannerReady(false);
      isScanning.current = false;
      setStatusMessage('Scanner disconnected. Plug in device via OTG.');
    });

    previewSub = MantraScannerService.addListener('onPreview', (data) => {
      if (data && typeof data.quality === 'number') {
        setScanQuality(data.quality);
      }
    });

    startScanner();

    return () => {
      isMounted.current = false;
      attachedSub?.remove();
      detachedSub?.remove();
      previewSub?.remove();
      MantraScannerService.stopCapture().catch(console.error);
      MantraScannerService.uninitializeScanner().catch(console.error);
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
  }, []);

  // Main Scan Execution
  const triggerScan = async () => {
    if (!isMounted.current || isScanning.current || showActionModal) return;
    
    isScanning.current = true;
    setScanQuality(null);
    setStatusMessage('Place your finger on the scanner sensor...');

    try {
      // quality 50, timeout 30s
      const result = await MantraScannerService.startCapture(50, 30000);
      isScanning.current = false;

      if (!isMounted.current || showActionModal) return;

      // Local match loop
      setStatusMessage('Matching fingerprint template...');
      const listToMatch: UserTemplateRecord[] = eligibleUsers.map((u) => ({
        uid: u.uid,
        name: u.name,
        fingerprintTemplate: u.fingerprintTemplate,
      }));

      const match = await MantraScannerService.matchUser(result.isoTemplate, listToMatch);

      if (match) {
        const fullUser = eligibleUsers.find((u) => u.uid === match.uid);
        if (fullUser) {
          setScanQuality(result.quality);
          handleUserRecognized(fullUser);
          return;
        }
      }

      // No match found
      setStatusMessage('Fingerprint not recognized. Try again.');
      setTimeout(() => {
        triggerScan();
      }, 2000);
    } catch (err: any) {
      isScanning.current = false;
      if (!isMounted.current) return;

      if (err.code === 'CAPTURE_FAILED' && err.message.includes('Timeout')) {
        // If timeout, just silent restart loop
        triggerScan();
      } else {
        setStatusMessage(`Scan error: ${err.message || 'Unknown'}. Retrying...`);
        setTimeout(() => {
          triggerScan();
        }, 3000);
      }
    }
  };

  // User Identified
  const handleUserRecognized = async (user: UserProfile) => {
    setLoading(true);
    setMatchedUser(user);
    
    try {
      // Find today's attendance record
      const today = format(new Date(), 'yyyy-MM-dd');
      const q = await firestore()
        .collection('attendance')
        .where('userId', '==', user.uid)
        .where('date', '==', today)
        .limit(1)
        .get();

      if (!q.empty) {
        setTodayDocId(q.docs[0].id);
        setTodayRecord(q.docs[0].data() as AttendanceRecord);
      } else {
        setTodayDocId(null);
        setTodayRecord(null);
      }

      setShowActionModal(true);
      setStatusMessage('Recognized! Select shift action.');

      // Auto dismiss modal in 15 seconds of inactivity to restart scanning
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = setTimeout(() => {
        closeActionModal();
      }, 15000);

    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch attendance info: ' + err.message);
      resetFlow();
    } finally {
      setLoading(false);
    }
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setMatchedUser(null);
    setTodayRecord(null);
    setTodayDocId(null);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    // Restart scan loop
    setTimeout(() => {
      triggerScan();
    }, 1000);
  };

  const resetFlow = () => {
    closeActionModal();
  };

  // Check-In Action
  const performCheckIn = async () => {
    if (!matchedUser) return;
    setLoading(true);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = Date.now();
      
      await firestore().collection('attendance').add({
        userId: matchedUser.uid,
        userName: matchedUser.name,
        locationId: location.id,
        locationName: location.name,
        organizationId: matchedUser.organizationId,
        date: today,
        checkInTime: now,
        breaks: [],
        status: 'PRESENT',
        latitude: location.latitude,
        longitude: location.longitude,
        verificationMethod: 'MANTRA_FINGERPRINT',
        kioskRegistered: true,
      });

      await firestore().collection('users').doc(matchedUser.uid).update({
        currentStatus: 'WORKING',
        lastActive: now,
      });

      Alert.alert('Checked In', `Good morning ${matchedUser.name}! Attendance registered.`);
      closeActionModal();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to check-in: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Break Action
  const performTakeBreak = async () => {
    if (!matchedUser || !todayDocId || !todayRecord) return;
    setLoading(true);

    try {
      const now = Date.now();
      const newBreak: BreakSession = { startTime: now };
      
      await firestore()
        .collection('attendance')
        .doc(todayDocId)
        .update({
          status: 'ON_BREAK',
          breaks: [...(todayRecord.breaks || []), newBreak],
        });

      await firestore().collection('users').doc(matchedUser.uid).update({
        currentStatus: 'ON_BREAK',
        lastActive: now,
      });

      Alert.alert('Break Started', `Enjoy your break, ${matchedUser.name}!`);
      closeActionModal();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to start break: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resume Action
  const performResumeWork = async () => {
    if (!matchedUser || !todayDocId || !todayRecord) return;
    setLoading(true);

    try {
      const now = Date.now();
      const breaks = [...(todayRecord.breaks || [])];
      if (breaks.length > 0) {
        breaks[breaks.length - 1].endTime = now;
      }

      await firestore()
        .collection('attendance')
        .doc(todayDocId)
        .update({
          status: 'PRESENT',
          breaks: breaks,
        });

      await firestore().collection('users').doc(matchedUser.uid).update({
        currentStatus: 'WORKING',
        lastActive: now,
      });

      Alert.alert('Resumed Work', `Welcome back, ${matchedUser.name}!`);
      closeActionModal();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to resume work: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check-Out Action
  const performCheckOut = async () => {
    if (!matchedUser || !todayDocId || !todayRecord) return;
    setLoading(true);

    try {
      const now = Date.now();
      let breaks = [...(todayRecord.breaks || [])];
      
      if (todayRecord.status === 'ON_BREAK' && breaks.length > 0) {
        breaks[breaks.length - 1].endTime = now;
      }

      await firestore()
        .collection('attendance')
        .doc(todayDocId)
        .update({
          status: 'CHECKED_OUT',
          checkOutTime: now,
          breaks: breaks,
        });

      await firestore().collection('users').doc(matchedUser.uid).update({
        currentStatus: 'CHECKED_OUT',
        lastActive: now,
      });

      Alert.alert('Checked Out', `Goodbye ${matchedUser.name}! Shift completed successfully.`);
      closeActionModal();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to check-out: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Exit Kiosk Mode
  const handleExitKiosk = () => {
    Alert.alert(
      'Exit Kiosk Mode',
      'Are you sure you want to exit shared Kiosk mode?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Exit', 
          style: 'destructive',
          onPress: () => {
            navigation.goBack();
          } 
        }
      ]
    );
  };

  return (
    <LinearGradient
      colors={COLORS.gradients.primary}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.exitButton} onPress={handleExitKiosk}>
            <Icon name="exit-outline" size={24} color={COLORS.white} />
            <Text style={styles.exitText}>Exit Kiosk</Text>
          </TouchableOpacity>
          <View style={styles.locationTag}>
            <Icon name="location" size={16} color={COLORS.white} />
            <Text style={styles.locationTagName}>{location.name}</Text>
          </View>
        </View>

        {/* Center Clock and Status */}
        <View style={styles.clockContainer}>
          <Text style={styles.timeString}>{currentTime || '00:00:00'}</Text>
          <Text style={styles.dateString}>
            {format(new Date(), 'EEEE, MMMM dd, yyyy')}
          </Text>
        </View>

        {/* Scanner Panel */}
        <View style={styles.scannerPanel}>
          <View style={styles.scannerCard}>
            
            {/* Status Icons */}
            <View style={styles.statusRow}>
              <View style={styles.badge}>
                <View style={[
                  styles.badgeDot, 
                  { backgroundColor: deviceConnected ? COLORS.status.working : COLORS.status.offline }
                ]} />
                <Text style={styles.badgeText}>
                  {deviceConnected ? 'OTG CONNECTED' : 'OTG DISCONNECTED'}
                </Text>
              </View>
              {scanQuality !== null && (
                <Text style={styles.qualityLabel}>Scan Quality: {scanQuality}%</Text>
              )}
            </View>

            {/* Glowing fingerprint area */}
            <View style={[
              styles.iconWrapper,
              isScanning.current && styles.pulseWrapper
            ]}>
              {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} />
              ) : (
                <Icon 
                  name="finger-print" 
                  size={100} 
                  color={
                    !deviceConnected 
                      ? COLORS.text.light 
                      : isScanning.current 
                      ? COLORS.primary 
                      : COLORS.status.working
                  } 
                />
              )}
            </View>

            <Text style={styles.statusDescription}>{statusMessage}</Text>
            
            {!deviceConnected && (
              <Text style={styles.warningText}>
                ⚠️ Please ensure your Mantra MFS100 device is connected using an OTG adapter and USB debugging/OTG is enabled in system settings.
              </Text>
            )}

            {scannerError ? (
              <Text style={styles.errorText}>Error: {scannerError}</Text>
            ) : null}
            
            {/* Trigger Button if loop got stuck */}
            {!isScanning.current && deviceConnected && !showActionModal && (
              <TouchableOpacity style={styles.manualScanBtn} onPress={triggerScan}>
                <Text style={styles.manualScanBtnText}>Tap to Scan Fingerprint</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Registered Kiosk Workers: {eligibleUsers.length}
          </Text>
        </View>

        {/* Action Picker Modal */}
        <Modal
          visible={showActionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={closeActionModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              
              <View style={styles.modalHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {matchedUser?.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.welcomeTitle}>Recognized User</Text>
                <Text style={styles.matchedName}>{matchedUser?.name}</Text>
                <Text style={styles.matchedEmail}>{matchedUser?.email}</Text>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.todayStatusLabel}>
                  Today's Status:{' '}
                  <Text style={styles.todayStatusValue}>
                    {todayRecord ? todayRecord.status : 'NOT CHECKED IN'}
                  </Text>
                </Text>

                {loading ? (
                  <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
                ) : (
                  <ScrollView contentContainerStyle={styles.buttonsContainer}>
                    
                    {/* Check In Option */}
                    {!todayRecord && (
                      <TouchableOpacity 
                        style={[styles.kioskActionBtn, { backgroundColor: COLORS.status.working }]}
                        onPress={performCheckIn}
                      >
                        <Icon name="log-in-outline" size={24} color={COLORS.white} />
                        <Text style={styles.kioskActionText}>CLOCK IN (SHIFT START)</Text>
                      </TouchableOpacity>
                    )}

                    {/* Break Option (Only if currently checked in and not checked out) */}
                    {todayRecord && todayRecord.status === 'PRESENT' && (
                      <TouchableOpacity 
                        style={[styles.kioskActionBtn, { backgroundColor: COLORS.status.onBreak }]}
                        onPress={performTakeBreak}
                      >
                        <Icon name="cafe-outline" size={24} color={COLORS.white} />
                        <Text style={styles.kioskActionText}>START BREAK</Text>
                      </TouchableOpacity>
                    )}

                    {/* Resume Option (Only if currently on break) */}
                    {todayRecord && todayRecord.status === 'ON_BREAK' && (
                      <TouchableOpacity 
                        style={[styles.kioskActionBtn, { backgroundColor: COLORS.primary }]}
                        onPress={performResumeWork}
                      >
                        <Icon name="play-outline" size={24} color={COLORS.white} />
                        <Text style={styles.kioskActionText}>RESUME WORK</Text>
                      </TouchableOpacity>
                    )}

                    {/* Check Out Option (Only if checked in and not checked out yet) */}
                    {todayRecord && todayRecord.status !== 'CHECKED_OUT' && (
                      <TouchableOpacity 
                        style={[styles.kioskActionBtn, { backgroundColor: COLORS.status.offline }]}
                        onPress={performCheckOut}
                      >
                        <Icon name="log-out-outline" size={24} color={COLORS.white} />
                        <Text style={styles.kioskActionText}>CLOCK OUT (SHIFT END)</Text>
                      </TouchableOpacity>
                    )}

                    {todayRecord && todayRecord.status === 'CHECKED_OUT' && (
                      <View style={styles.alreadyDoneCard}>
                        <Icon name="checkmark-done" size={40} color={COLORS.status.working} />
                        <Text style={styles.alreadyDoneText}>
                          You have already completed your shift today!
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity 
                      style={styles.kioskCancelBtn}
                      onPress={closeActionModal}
                    >
                      <Text style={styles.kioskCancelText}>CANCEL</Text>
                    </TouchableOpacity>

                  </ScrollView>
                )}
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  exitText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  locationTagName: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  clockContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  timeString: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dateString: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 5,
  },
  scannerPanel: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 20,
  },
  scannerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
  },
  qualityLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  iconWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E9D5FF',
    marginBottom: 20,
  },
  pulseWrapper: {
    borderColor: COLORS.primary,
    borderWidth: 3,
    backgroundColor: '#EEF2F6',
  },
  statusDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 11,
    color: COLORS.status.offline,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.status.offline,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  manualScanBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  manualScanBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  welcomeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text.light,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  matchedName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 4,
  },
  matchedEmail: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  modalBody: {
    padding: 24,
  },
  todayStatusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  todayStatusValue: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  buttonsContainer: {
    gap: 12,
  },
  kioskActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  kioskActionText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  alreadyDoneCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 20,
    borderRadius: 14,
    marginBottom: 10,
  },
  alreadyDoneText: {
    color: '#065F46',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  kioskCancelBtn: {
    borderColor: COLORS.text.light,
    borderWidth: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  kioskCancelText: {
    color: COLORS.text.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
