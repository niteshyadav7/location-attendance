import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Dimensions, SafeAreaView } from 'react-native';
import { getFirestore, doc, onSnapshot, collection, addDoc, query, where, limit, updateDoc, orderBy } from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { getCurrentLocation, calculateDistance, requestLocationPermission } from '../services/location';
import { LocationConfig, AttendanceRecord, BreakSession, Notice } from '../types';
import { NoticeModal } from '../components/NoticeModal';
import { notificationService } from '../services/notificationService';

export const UserHomeScreen = () => {
  const user = useAuthStore((state) => state.user);
  const [assignedLocation, setAssignedLocation] = useState<LocationConfig | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Attendance State
  const [attendanceDocId, setAttendanceDocId] = useState<string | null>(null);
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null);

  // Notice State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [currentNotice, setCurrentNotice] = useState<Notice | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  const db = getFirestore();

  // 1. Request Permissions
  useEffect(() => {
    // Initialize notifications
    notificationService.initialize();
    
    requestLocationPermission().then(granted => {
      setHasPermission(granted);
      if (!granted) Alert.alert('Permission Required', 'Location permission is required.');
    });
  }, []);

  // 2. Fetch Assigned Location
  useEffect(() => {
    if (!user?.assignedLocationId) return;
    const unsubscribe = onSnapshot(doc(db, 'locations', user.assignedLocationId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setAssignedLocation({ id: docSnapshot.id, ...docSnapshot.data() } as LocationConfig);
      }
    });
    return () => unsubscribe();
  }, [user?.assignedLocationId]);

  // 3. Listen to Today's Attendance
  useEffect(() => {
    if (!user?.uid) return;
    const today = new Date().toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('date', '==', today),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setAttendanceDocId(docSnap.id);
        setAttendanceRecord(docSnap.data() as AttendanceRecord);
      } else {
        setAttendanceDocId(null);
        setAttendanceRecord(null);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // 4. Fetch Active Notices
  useEffect(() => {
    // Simplified query - no orderBy to avoid composite index requirement
    const q = query(
      collection(db, 'notices'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        if (!snapshot) {
          console.log('No snapshot received');
          return;
        }

        const noticeList: Notice[] = [];
        snapshot.forEach((doc: any) => {
          const notice = { id: doc.id, ...doc.data() } as Notice;
          // Check if notice is not expired
          if (!notice.expiresAt || notice.expiresAt > Date.now()) {
            noticeList.push(notice);
          }
        });

        // Sort by createdAt in the app (newest first)
        noticeList.sort((a, b) => b.createdAt - a.createdAt);
        
        setNotices(noticeList);
        
        // Show the latest urgent/high priority notice only once
        if (noticeList.length > 0 && !currentNotice) {
          const urgentNotice = noticeList.find(n => n.priority === 'urgent' || n.priority === 'high');
          if (urgentNotice) {
            setCurrentNotice(urgentNotice);
            setShowNoticeModal(true);
          } else {
            setCurrentNotice(noticeList[0]);
            setShowNoticeModal(true);
          }
        }
      },
      (error) => {
        console.error('Error fetching notices:', error);
        // Don't show error to user, just log it
      }
    );

    return () => unsubscribe();
  }, []);

  // 5. Periodic Location Check (just for distance display)
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
    }, 10000); // Check every 10 seconds

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

  // --- ACTIONS ---

  const handleCheckIn = async () => {
    if (!user || !assignedLocation) return;
    
    setLoading(true);
    try {
        const pos = await getCurrentLocation();
        const dist = calculateDistance(
            { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
            { latitude: assignedLocation.latitude, longitude: assignedLocation.longitude }
        );

        if (dist > assignedLocation.radius) {
            Alert.alert('Out of Range', `You are ${Math.round(dist)}m away. Must be within ${assignedLocation.radius}m.`);
            setLoading(false);
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        await addDoc(collection(db, 'attendance'), {
            userId: user.uid,
            userName: user.name,
            locationId: assignedLocation.id,
            locationName: assignedLocation.name,
            date: today,
            checkInTime: Date.now(),
            breaks: [],
            status: 'PRESENT',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
        });
        
        // Send Notification
        addDoc(collection(db, 'notifications'), {
            type: 'CHECK_IN',
            userId: user.uid,
            userName: user.name,
            message: `${user.name} checked in at ${assignedLocation.name}`,
            timestamp: Date.now(),
            read: false
        });

        // Update User Status
        updateDoc(doc(db, 'users', user.uid), {
            currentStatus: 'WORKING',
            lastActive: Date.now()
        });

        // Show local notification
        const checkInTime = new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        await notificationService.showCheckInNotification(
          user.name,
          assignedLocation.name,
          checkInTime
        );

        Alert.alert('✅ Success', 'Checked In Successfully!');
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleTakeBreak = async () => {
    if (!attendanceDocId || !user) return;
    setLoading(true);
    try {
        const newBreak: BreakSession = { 
            startTime: Date.now()
        };
        await updateDoc(doc(db, 'attendance', attendanceDocId), {
            status: 'ON_BREAK',
            breaks: [...(attendanceRecord?.breaks || []), newBreak]
        });
        
        // Send Notification
        addDoc(collection(db, 'notifications'), {
            type: 'BREAK_START',
            userId: user.uid,
            userName: user.name,
            message: `${user.name} started a break`,
            timestamp: Date.now(),
            read: false
        });

        // Update User Status
        updateDoc(doc(db, 'users', user.uid), {
            currentStatus: 'ON_BREAK',
            lastActive: Date.now()
        });

        // Show local notification
        const breakTime = new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        await notificationService.showBreakStartNotification(user.name, breakTime);

        Alert.alert('☕ Break Started', 'Enjoy your break!');
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleResumeWork = async () => {
    if (!attendanceDocId || !attendanceRecord || !user) return;
    setLoading(true);
    try {
        const pos = await getCurrentLocation();
        const dist = calculateDistance(
            { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
            { latitude: assignedLocation!.latitude, longitude: assignedLocation!.longitude }
        );
        
        if (dist > assignedLocation!.radius) {
             Alert.alert('Out of Range', 'You must be at the location to resume work.');
             setLoading(false);
             return;
        }

        const breaks = [...attendanceRecord.breaks];
        if (breaks.length > 0) {
            breaks[breaks.length - 1].endTime = Date.now();
        }

        await updateDoc(doc(db, 'attendance', attendanceDocId), {
            status: 'PRESENT',
            breaks: breaks
        });

        // Send Notification
        addDoc(collection(db, 'notifications'), {
            type: 'BREAK_END',
            userId: user.uid,
            userName: user.name,
            message: `${user.name} resumed work`,
            timestamp: Date.now(),
            read: false
        });

        // Update User Status
        updateDoc(doc(db, 'users', user.uid), {
            currentStatus: 'WORKING',
            lastActive: Date.now()
        });

        // Show local notification
        const resumeTime = new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        // Calculate break duration
        const lastBreak = breaks[breaks.length - 1];
        const breakDuration = Math.round((lastBreak.endTime! - lastBreak.startTime) / 60000); // in minutes
        const breakDurationStr = breakDuration < 60 
          ? `${breakDuration} min` 
          : `${Math.floor(breakDuration / 60)}h ${breakDuration % 60}m`;
        
        await notificationService.showBreakEndNotification(user.name, breakDurationStr, resumeTime);

        Alert.alert('💼 Resumed', 'Welcome back!');
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceDocId || !attendanceRecord || !user) return;
    
    setLoading(true);
    let breaks = [...attendanceRecord.breaks];
    if (attendanceRecord.status === 'ON_BREAK' && breaks.length > 0) {
        breaks[breaks.length - 1].endTime = Date.now();
    }

    try {
        await updateDoc(doc(db, 'attendance', attendanceDocId), {
            status: 'CHECKED_OUT',
            checkOutTime: Date.now(),
            breaks: breaks
        });
        
        // Send Notification
        addDoc(collection(db, 'notifications'), {
            type: 'CHECK_OUT',
            userId: user.uid,
            userName: user.name,
            message: `${user.name} checked out`,
            timestamp: Date.now(),
            read: false
        });

        // Update User Status
        updateDoc(doc(db, 'users', user.uid), {
            currentStatus: 'CHECKED_OUT',
            lastActive: Date.now()
        });

        // Show local notification
        const checkOutTime = new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        // Calculate total hours worked
        const totalMinutes = Math.round((Date.now() - attendanceRecord.checkInTime) / 60000);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        const totalHoursStr = `${totalHours}h ${remainingMinutes}m`;
        
        await notificationService.showCheckOutNotification(user.name, totalHoursStr, checkOutTime);

        Alert.alert('👋 Success', 'Checked Out Successfully!');
    } catch (error: any) {
        console.error("Check out error", error);
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    if (!attendanceRecord) {
      return { text: 'Not Started', color: '#95A5A6', emoji: '⏸️' };
    }
    switch (attendanceRecord.status) {
      case 'PRESENT':
        return { text: 'Working', color: '#27AE60', emoji: '💼' };
      case 'ON_BREAK':
        return { text: 'On Break', color: '#F39C12', emoji: '☕' };
      case 'CHECKED_OUT':
        return { text: 'Checked Out', color: '#E74C3C', emoji: '✅' };
      default:
        return { text: 'Unknown', color: '#95A5A6', emoji: '❓' };
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name}! 👋</Text>
          <Text style={styles.subtitle}>Track your attendance</Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.locationLabel}>📍 Location</Text>
              <Text style={styles.locationName}>{assignedLocation?.name || 'Loading...'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
              <Text style={styles.statusEmoji}>{statusBadge.emoji}</Text>
              <Text style={styles.statusText}>{statusBadge.text}</Text>
            </View>
          </View>
          
          {distance !== null && (
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceLabel}>Current Distance</Text>
              <Text style={styles.distanceValue}>{Math.round(distance)}m</Text>
              <TouchableOpacity onPress={refreshLocation} style={styles.refreshButton} disabled={checkingLocation}>
                <Text style={styles.refreshText}>{checkingLocation ? '🔄 Updating...' : '🔄 Refresh GPS'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!attendanceRecord && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.checkInButton]} 
              onPress={handleCheckIn} 
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
                onPress={handleCheckOut} 
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
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}

      </ScrollView>

      {/* Notice Modal */}
      <NoticeModal
        notice={currentNotice}
        visible={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
      />
    </SafeAreaView>
  );
};

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flexGrow: 1,
    padding: moderateScale(20),
    paddingBottom: verticalScale(30),
  },
  header: {
    marginBottom: verticalScale(24),
  },
  greeting: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: verticalScale(4),
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: '#6B7280',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: moderateScale(20),
    marginBottom: verticalScale(20),
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
    marginBottom: verticalScale(16),
  },
  locationLabel: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: verticalScale(4),
  },
  locationName: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(20),
    gap: moderateScale(6),
  },
  statusEmoji: {
    fontSize: moderateScale(16),
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  distanceContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    alignItems: 'center',
  },
  distanceLabel: {
    fontSize: moderateScale(13),
    color: '#6B7280',
    marginBottom: verticalScale(4),
  },
  distanceValue: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: verticalScale(8),
  },
  refreshButton: {
    marginTop: verticalScale(8),
  },
  refreshText: {
    fontSize: moderateScale(14),
    color: '#007AFF',
    fontWeight: '600',
  },
  actionsContainer: {
    gap: verticalScale(12),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(16),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    gap: moderateScale(10),
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
    fontSize: moderateScale(24),
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(18),
    fontWeight: 'bold',
  },
  completedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: moderateScale(32),
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completedEmoji: {
    fontSize: moderateScale(48),
    marginBottom: verticalScale(12),
  },
  completedText: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#27AE60',
    marginBottom: verticalScale(4),
  },
  completedSubtext: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  loadingContainer: {
    marginTop: verticalScale(20),
    alignItems: 'center',
    gap: verticalScale(8),
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  errorMessage: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: verticalScale(100),
  },
  errorSubtext: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
    marginTop: verticalScale(8),
  },
  noticeBoardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginTop: verticalScale(20),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: moderateScale(12),
  },
  noticeBoardIcon: {
    fontSize: moderateScale(28),
  },
  noticeBoardContent: {
    flex: 1,
  },
  noticeBoardTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: verticalScale(2),
  },
  noticeBoardSubtitle: {
    fontSize: moderateScale(13),
    color: '#6B7280',
  },
  noticeBoardArrow: {
    fontSize: moderateScale(24),
    color: '#9CA3AF',
  },
});
