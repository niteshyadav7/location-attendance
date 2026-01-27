import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { useLocationDetails } from '../hooks/useLocations';
import { useAuthStore } from '../store/useAuthStore';
import { getCurrentLocation, calculateDistance, requestLocationPermission } from '../services/location';
import { LocationConfig, Notice } from '../types';
import { NoticeModal } from '../components/NoticeModal';
import { notificationService } from '../services/notificationService';
import { useAttendance } from '../hooks/useAttendance';
import { useNotices } from '../hooks/useLeaves';
import { COLORS } from '../constants/theme';
import LinearGradient from 'react-native-linear-gradient';


import { ScreenAdBanner, ScreenAdNative, useScreenInterstitial } from '../components/ScreenAds';
import { useAds } from '../hooks/useAds';
import { useSmartInterstitial } from '../hooks/useSmartInterstitial';

export const UserHomeScreen = () => {
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const [userData, setUserData] = useState(user); // Local state for real-time updates
  const { location: assignedLocation } = useLocationDetails(user?.assignedLocationId);
  
  // Triggers interstitial on mount if enabled for 'home'
  useScreenInterstitial('home');
  
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const { notices } = useNotices();
  const [currentNotice, setCurrentNotice] = useState<Notice | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  
  const { 
    attendanceRecord, 
    loading, 
    handleCheckIn, 
    handleTakeBreak, 
    handleResumeWork, 
    handleCheckOut 
  } = useAttendance(userData, assignedLocation, organization);

  const { showAdIfEnabled } = useSmartInterstitial();

  const onCheckInPress = async () => {
    await handleCheckIn();
    showAdIfEnabled('onCheckIn');
  };

  const onCheckOutPress = async () => {
    await handleCheckOut();
    showAdIfEnabled('onCheckOut');
  };




  // 1. Request Permissions
  useEffect(() => {
    notificationService.initialize();
    requestLocationPermission().then(granted => {
      setHasPermission(granted);
      if (!granted) Alert.alert('Permission Required', 'Location permission is required.');
    });
  }, []);

  // Notice Effect
  useEffect(() => {
    if (notices.length > 0 && !currentNotice) {
      const urgentNotice = notices.find(n => n.priority === 'urgent' || n.priority === 'high');
      setCurrentNotice(urgentNotice || notices[0]);
      setShowNoticeModal(true);
    }
  }, [notices]);

  // 4. Periodic Location Check (for distance display only)
  useEffect(() => {
    if (!assignedLocation) return;
    const locationInterval = setInterval(async () => {
      try {
        const pos = await getCurrentLocation();
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCurrentLocation(coords);
        
        const dist = calculateDistance(coords, {
          latitude: assignedLocation.latitude,
          longitude: assignedLocation.longitude,
        });
        setDistance(dist);
      } catch (err) {
        console.log("Location check failed", err);
      }
    }, 10000); 

    return () => clearInterval(locationInterval);
  }, [assignedLocation]);

  const refreshLocation = async () => {
    setCheckingLocation(true);
    try {
      const pos = await getCurrentLocation();
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCurrentLocation(coords);
      if (assignedLocation) {
        setDistance(calculateDistance(coords, { latitude: assignedLocation.latitude, longitude: assignedLocation.longitude }));
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get location.');
    } finally {
      setCheckingLocation(false);
    }
  };

  const getStatusBadge = () => {
    if (!attendanceRecord) {
      return { text: 'Not Started', color: '#95A5A6', emoji: '⏸️' };
    }
    switch (attendanceRecord.status) {
      case 'PRESENT': return { text: 'Working', color: COLORS.status.working, emoji: '💼' };
      case 'ON_BREAK': return { text: 'On Break', color: COLORS.status.onBreak, emoji: '☕' };
      case 'CHECKED_OUT': return { text: 'Checked Out', color: COLORS.status.checkedOut, emoji: '✅' };
      default: return { text: 'Unknown', color: '#95A5A6', emoji: '❓' };
    }
  };

  const statusBadge = getStatusBadge();

  if (!user?.assignedLocationId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.errorMessage}>📍 No location assigned</Text>
          <Text style={styles.errorSubtext}>Please contact your administrator</Text>
        </View>
      </SafeAreaView>
    );
  }



  // Listen to User Data (for real-time missedCheckouts updates)
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestore();
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data() as any);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // Auto-Checkout Warning Logic
  const [showAutoCheckoutWarning, setShowAutoCheckoutWarning] = useState(false);

  useEffect(() => {
      if (userData && (userData as any).lastAutoCheckoutTime) {
          const lastTime = (userData as any).lastAutoCheckoutTime;
          const diff = Date.now() - lastTime;
          // Show if happened within last 24 hours
          if (diff < 24 * 60 * 60 * 1000) {
              setShowAutoCheckoutWarning(true);
          } else {
              setShowAutoCheckoutWarning(false);
          }
      }
  }, [userData]); 

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ alignItems: 'center', backgroundColor: COLORS.background }}>
        <ScreenAdBanner screen="home" />
      </View>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingLabel}>Hello,</Text>
            <Text style={styles.greetingName}>{user?.name} 👋</Text>
          </View>
          
          <LinearGradient 
             colors={[COLORS.primary, '#818cf8']}
             start={{x: 0, y: 0}} 
             end={{x: 1, y: 0}}
             style={styles.subtitleBadge}
          >
             <Icon name="calendar" size={14} color="#fff" />
             <Text style={styles.subtitleText}>Track your attendance</Text>
          </LinearGradient>
        </View>

        {/* Penalty Stats Row */}
        {(userData?.missedCheckouts || 0) > 0 && (
            <View style={styles.statsRow}>
                <View style={styles.statBadge}>
                    <Text style={styles.statLabel}>Missed Checkouts:</Text>
                    <Text style={styles.statValue}>{userData?.missedCheckouts}</Text>
                </View>
                <Text style={styles.penaltyText}>Total Penalty: {(userData?.missedCheckouts || 0) * 5} hrs</Text>
            </View>
        )}

        {/* Today's Penalty Warning (Specific Event) */}
        {showAutoCheckoutWarning && (
            <View style={styles.penaltyCard}>
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <Text style={styles.penaltyTitle}>⚠️ Auto-Checkout Alert</Text>
                    <TouchableOpacity onPress={() => setShowAutoCheckoutWarning(false)}>
                        <Icon name="close" size={20} color="#B91C1C" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.penaltyMsg}>
                    You were automatically checked out by the system. 
                    If you worked past your assigned checkout time, a <Text style={{fontWeight:'bold'}}>1 Hour Penalty</Text> may have been applied.
                </Text>
            </View>
        )}

        {/* Professional Status Card */}
        {/* Professional Status Card */}
        <View style={styles.proStatusCard}>
            {/* Top Row: Location */}
            <View style={styles.cardHeaderRow}>
                <View style={styles.locationInfo}>
                    <View style={styles.iconBox}>
                         <Icon name="business" size={24} color={COLORS.primary} />
                    </View>
                    <View>
                        <Text style={styles.cardLabel}>Current Location</Text>
                        <Text style={styles.proLocationName}>{assignedLocation?.name || 'Loading...'}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Middle Row: Status & Distance Grid */}
            <View style={styles.cardBodyRow}>
                {/* Status Column */}
                <View style={styles.infoColumn}>
                     <Text style={styles.cardLabel}>My Status</Text>
                     <View style={[styles.proStatusBadge, { backgroundColor: statusBadge.color + '10', borderColor: statusBadge.color + '30' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusBadge.color }]} />
                        <Text style={[styles.proStatusText, { color: statusBadge.color }]}>{statusBadge.text}</Text>
                     </View>
                </View>
                
                {/* Distance Column */}
                {distance !== null && (
                    <View style={styles.infoColumn}>
                        <Text style={styles.cardLabel}>Distance</Text>
                        <View style={styles.distanceRow}>
                            <Icon 
                                name={distance < 100 ? "checkmark-circle" : "warning"} 
                                size={16} 
                                color={distance < 100 ? COLORS.status.working : COLORS.status.offline} 
                            />
                            <Text style={[styles.proDistanceValue, { color: distance < 100 ? '#374151' : COLORS.status.offline }]}>
                                {Math.round(distance)}m
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Bottom: Refresh Action */}
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={refreshLocation} 
                style={styles.proRefreshButton} 
                disabled={checkingLocation}
            >
                {checkingLocation ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                    <Icon name="locate" size={16} color={COLORS.primary} />
                )}
                <Text style={styles.proRefreshText}>
                    {checkingLocation ? 'Updating Coordinates...' : 'Refresh GPS Location'}
                </Text>
            </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!attendanceRecord && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.checkInButton]} 
              onPress={onCheckInPress} 
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonIcon}>✓</Text>
              <Text style={styles.actionButtonText}>Check In</Text>
            </TouchableOpacity>
          )}

          {attendanceRecord?.status === 'PRESENT' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.breakButton]} 
                onPress={handleTakeBreak} 
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonIcon}>☕</Text>
                <Text style={styles.actionButtonText}>Take Break</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.checkOutButton]} 
                onPress={onCheckOutPress} 
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonIcon}>👋</Text>
                <Text style={styles.actionButtonText}>Check Out</Text>
              </TouchableOpacity>
            </>
          )}

          {attendanceRecord?.status === 'ON_BREAK' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.resumeButton]} 
              onPress={handleResumeWork} 
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonIcon}>💼</Text>
              <Text style={styles.actionButtonText}>Resume Work</Text>
            </TouchableOpacity>
          )}

          {attendanceRecord?.status === 'CHECKED_OUT' && (
            <View style={styles.completedCard}>
              <Text style={styles.completedEmoji}>🎉</Text>
              <Text style={styles.completedText}>Attendance Completed</Text>
              <Text style={styles.completedSubtext}>See you tomorrow!</Text>
            </View>
          )}
        </View>

        {/* Notice Board Button */}
        {notices.length > 0 && (
          <TouchableOpacity 
            style={styles.noticeBoardButton}
            onPress={() => {
              setCurrentNotice(notices[0]);
              setShowNoticeModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.noticeBoardIcon}>📢</Text>
            <View style={styles.noticeBoardContent}>
              <Text style={styles.noticeBoardTitle}>Notice Board</Text>
              <Text style={styles.noticeBoardSubtitle}>{notices.length} active notice{notices.length > 1 ? 's' : ''}</Text>
            </View>
            <Text style={styles.noticeBoardArrow}>›</Text>
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}




        {/* Granular Native Ad */}
        <ScreenAdNative screen="home" />

      </ScrollView>

      <NoticeModal
        notice={currentNotice}
        visible={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
      />
      

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100, // Extra padding for bottom tab bar
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  locationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusEmoji: {
    fontSize: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  distanceContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  distanceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  refreshButton: {
    marginTop: 8,
  },
  refreshText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    gap: 10,
  },
  checkInButton: {
    backgroundColor: '#007AFF',
  },
  breakButton: {
    backgroundColor: '#F39C12',
  },
  checkOutButton: {
    backgroundColor: '#E74C3C',
  },
  resumeButton: {
    backgroundColor: '#27AE60',
  },
  actionButtonIcon: {
    fontSize: 24,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  completedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completedEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  completedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27AE60',
    marginBottom: 4,
  },
  completedSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorMessage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 100,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  noticeBoardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 12,
  },
  noticeBoardIcon: {
    fontSize: 28,
  },
  noticeBoardContent: {
    flex: 1,
  },
  noticeBoardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  noticeBoardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  noticeBoardArrow: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#B91C1C',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    color: '#B91C1C',
    fontWeight: 'bold',
  },
  penaltyText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  penaltyCard: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  penaltyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B91C1C',
    marginBottom: 4,
  },
  penaltyMsg: {
    fontSize: 14,
    color: '#7F1D1D',
  },

  // Professional Status Card Styles
  proStatusCard: {
      backgroundColor: '#fff',
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      borderWidth: 1,
      borderColor: '#f3f4f6',
  },
  cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  },
  locationInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
  },
  iconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#EFF6FF',
      justifyContent: 'center',
      alignItems: 'center',
  },
  cardLabel: {
      fontSize: 12,
      color: '#6B7280',
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: 2,
  },
  proLocationName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#111827',
  },
  timeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F3F4F6',
  },
  liveTime: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
  },
  divider: {
      height: 1,
      backgroundColor: '#F3F4F6',
      marginBottom: 16,
  },
  cardBodyRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
  },
  infoColumn: {
      flex: 1,
  },
  proStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 4,
  },
  statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
  },
  proStatusText: {
      fontSize: 14,
      fontWeight: 'bold',
  },
  distanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      backgroundColor: '#F9FAFB',
      padding: 10,
      borderRadius: 12,
  },
  proDistanceValue: {
      fontSize: 15,
      fontWeight: 'bold',
  },
  proRefreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      backgroundColor: '#EFF6FF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#BFDBFE',
  },
  proRefreshText: {
      color: COLORS.primary,
      fontWeight: '600',
      fontSize: 14,
  },
  
  // New Header Styles
  greetingLabel: {
      fontSize: 18,
      color: COLORS.primary,
      fontWeight: 'bold',
      marginBottom: 4,
  },
  greetingName: {
      fontSize: 32,
      fontWeight: '800', // Extra bold
      color: '#111827',
      marginBottom: 12,
      letterSpacing: -0.5,
  },
  subtitleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      alignSelf: 'flex-start',
      gap: 8,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
  },
  subtitleText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
  },
});
