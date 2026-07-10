import { useState, useEffect } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { getFirestore, collection, query, where, limit, onSnapshot, addDoc, updateDoc, doc, getDocs, increment } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getCurrentLocation, calculateDistance } from '../services/location';
import { notificationService } from '../services/notificationService';
import { AttendanceRecord, BreakSession, LocationConfig, UserProfile, Organization } from '../types';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConnectedWifiSSID } from '../services/wifi';

export const useAttendance = (user: UserProfile | null, assignedLocation: LocationConfig | null, organization?: Organization | null) => {
  const [attendanceDocId, setAttendanceDocId] = useState<string | null>(null);
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const db = getFirestore();

  const checkOnlineStatus = async (): Promise<boolean> => {
    try {
      const res = await fetch('https://www.google.com', { method: 'HEAD' });
      return res.status >= 200 && res.status < 400;
    } catch (err) {
      return false;
    }
  };

  const syncOfflineQueue = async () => {
    if (!user?.uid) return;
    try {
      const queueJson = await AsyncStorage.getItem('offline_attendance_queue');
      if (!queueJson) return;

      const queue: any[] = JSON.parse(queueJson);
      if (queue.length === 0) return;

      const isOnline = await checkOnlineStatus();
      if (!isOnline) return;

      console.log('📡 Internet restored! Syncing buffered offline check-ins...');
      
      for (const record of queue) {
        if (record.actionType === 'CHECK_IN') {
          const q = query(
            collection(db, 'attendance'),
            where('userId', '==', record.userId),
            where('date', '==', record.date),
            limit(1)
          );
          const snap = await getDocs(q);
          if (snap.empty) {
            await addDoc(collection(db, 'attendance'), {
              userId: record.userId,
              userName: record.userName,
              locationId: record.locationId,
              locationName: record.locationName,
              organizationId: record.organizationId,
              date: record.date,
              checkInTime: record.timestamp,
              breaks: [],
              status: 'PRESENT',
              latitude: record.latitude,
              longitude: record.longitude,
              verificationMethod: 'OFFLINE',
              isOfflineBuffered: true,
            });
          }
        } else if (record.actionType === 'CHECK_OUT') {
          const q = query(
            collection(db, 'attendance'),
            where('userId', '==', record.userId),
            where('date', '==', record.date),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docId = snap.docs[0].id;
            await updateDoc(doc(db, 'attendance', docId), {
              status: 'CHECKED_OUT',
              checkOutTime: record.timestamp,
              isOfflineBuffered: true,
            });
          }
        }
      }

      await AsyncStorage.removeItem('offline_attendance_queue');
      console.log('✅ Offline queue synchronized!');
      
      // Reload today's record
      const today = getLocalDateStr();
      const refQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', user.uid),
        where('date', '==', today),
        limit(1)
      );
      const refSnap = await getDocs(refQuery);
      if (!refSnap.empty) {
        setAttendanceDocId(refSnap.docs[0].id);
        setAttendanceRecord(refSnap.docs[0].data() as AttendanceRecord);
      }
    } catch (err) {
      console.log('Failed to sync offline logs:', err);
    }
  };

  // Helper to get local date string YYYY-MM-DD
  const getLocalDateStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000; 
    const localDate = new Date(d.getTime() - offset);
    return localDate.toISOString().split('T')[0];
  };

  // State to track current date for query ensuring we switch to new day if app stays open overnight
  const [currentDateStr, setCurrentDateStr] = useState(getLocalDateStr());

  // Listen for AppState changes to refresh date and trigger stale checks
  useEffect(() => {
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
          if (nextAppState === 'active') {
              const nowStr = getLocalDateStr();
              if (nowStr !== currentDateStr) {
                  setCurrentDateStr(nowStr);
              }
              // Always re-check for stale sessions when coming to foreground
              checkStaleSessions();
          }
      });

      return () => {
          subscription.remove();
      };
  }, [currentDateStr, user?.uid]);

  // Listen to Today's Attendance
  useEffect(() => {
    if (!user?.uid) return;
    
    // helper to get "today" consistent with state
    const today = currentDateStr; 
    
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('date', '==', today),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot && !snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setAttendanceDocId(docSnap.id);
        setAttendanceRecord(docSnap.data() as AttendanceRecord);
      } else {
        setAttendanceDocId(null);
        setAttendanceRecord(null);
      }
    }, (error) => {
        const auth = getAuth();
        if (auth.currentUser) {
            console.error("Attendance listener error:", error);
        }
    });

    return () => unsubscribe();
  }, [user?.uid, currentDateStr]); // Re-run if user changes or DAY changes

  // Auto Checkout / Stale Session Logic
  const checkStaleSessions = async () => {
      if (!user?.uid) return;

      try {
          const q = query(
              collection(db, 'attendance'),
              where('userId', '==', user.uid),
              where('status', 'in', ['PRESENT', 'ON_BREAK'])
          );
          
          const snapshot = await getDocs(q);
          if (snapshot.empty) return;

          const now = new Date();
          const currentHour = now.getHours();
          const todayStr = getLocalDateStr(); // Always use fresh "now" for staleness
          
          for (const docSnap of snapshot.docs) {
              const data = docSnap.data() as AttendanceRecord;
              const isToday = data.date === todayStr;
              
              // Skip if already auto checked out
              if (data.autoCheckout || data.autoCheckedOut) continue;
              
              // Condition 1: Old Date (yesterday or older)
              // Condition 2: Today but after 11 PM (23:00)
              if (!isToday || (isToday && currentHour >= 23)) {
                 
                 // NEW LOGIC: Dynamic Cutoff Rule
                 const cutoffHour = organization?.autoCheckoutCutoffHour || 19;
                 const targetHours = organization?.autoCheckoutHours || 7;
                 
                 const sevenHoursMs = targetHours * 60 * 60 * 1000;
                 const targetCheckOut = data.checkInTime + sevenHoursMs;
                 
                 const cutoffDate = new Date(data.date);
                 cutoffDate.setHours(cutoffHour, 0, 0, 0); 
                 const cutoffTimestamp = cutoffDate.getTime();
                 
                 // Logic: Min(Target, Cutoff)
                 let finalCheckOutTime = Math.min(targetCheckOut, cutoffTimestamp);
                 
                 // If check-in is after cutoff, this logic might produce checkOut < checkIn.
                 if (finalCheckOutTime < data.checkInTime) {
                     finalCheckOutTime = data.checkInTime; 
                 }

                 let breaks = data.breaks || [];
                 if (data.status === 'ON_BREAK' && breaks.length > 0) {
                      const lastBreak = breaks[breaks.length - 1];
                      if (!lastBreak.endTime) {
                           lastBreak.endTime = finalCheckOutTime;
                      }
                 }
                 
                 // Calculate credited hours for display
                 const durationMs = finalCheckOutTime - data.checkInTime;
                 const hoursCredited = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;

                 await updateDoc(doc(db, 'attendance', docSnap.id), {
                     status: 'CHECKED_OUT',
                     checkOutTime: finalCheckOutTime,
                     breaks: breaks,
                     autoCheckout: true,
                     fixedHours: hoursCredited, 
                     notes: `Auto-checked out. Credited ${hoursCredited}h (capped at ${targetHours}h/${cutoffHour}:00 limits)`
                 });
                 
                 await updateDoc(doc(db, 'users', user.uid), {
                     currentStatus: 'CHECKED_OUT',
                     lastActive: Date.now(),
                     missedCheckouts: increment(1),
                     lastAutoCheckoutTime: Date.now() 
                 });
                   
                 Alert.alert(
                     '⚠️ Auto Checkout', 
                     `You were automatically checked out for ${data.date}.\n\nSystem limits working hours to ${cutoffHour}:00.\nHours Credited: ${hoursCredited}h`
                 );
              }
          }
      } catch (err) {
          const auth = getAuth();
          if (auth.currentUser) {
              console.error("Auto checkout check failed", err);
          }
      }
  };

  const checkLocation = async () => {
    if (!assignedLocation) return false;
    
    // 1. Wi-Fi Lockdown bypass verification
    if (assignedLocation.wifiLockEnabled && assignedLocation.wifiSSID) {
      try {
        const activeSSID = await getConnectedWifiSSID();
        console.log('📶 Active Wi-Fi Connected SSID:', activeSSID);
        
        if (activeSSID && activeSSID.toLowerCase() === assignedLocation.wifiSSID.toLowerCase()) {
          console.log('✅ Wi-Fi verification matches! Bypassing GPS checks.');
          return { 
            latitude: assignedLocation.latitude, 
            longitude: assignedLocation.longitude,
            verificationMethod: 'WIFI' as const 
          };
        }
      } catch (err) {
        console.log('Wi-Fi checks failed, falling back to GPS:', err);
      }
    }

    // 2. Fallback GPS geofence checks
    try {
      const pos = await getCurrentLocation();
      const dist = calculateDistance(
        { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        { latitude: assignedLocation.latitude, longitude: assignedLocation.longitude }
      );

      if (dist > assignedLocation.radius) {
         Alert.alert('Out of Range', `You are ${Math.round(dist)}m away from the shop. Must be within ${assignedLocation.radius}m.`);
         return false;
      }
      return { 
        latitude: pos.coords.latitude, 
        longitude: pos.coords.longitude,
        verificationMethod: 'GPS' as const 
      };
    } catch (error) {
      Alert.alert('Error', 'Could not fetch GPS coordinates. Please make sure location settings are active.');
      return false;
    }
  };

  const handleCheckIn = async () => {
    if (!user || !assignedLocation) return;
    
    setLoading(true);
    try {
        const coords = await checkLocation();
        if (!coords) return;

        const today = getLocalDateStr();
        const now = Date.now();
        
        // Ensure organizationId exists
        if (!user.organizationId) {
            Alert.alert('Error', 'User organization not found. Please contact admin.');
            return;
        }
        
        // Check if attendance record already exists for today
        const todayAttendanceQuery = query(
            collection(db, 'attendance'),
            where('userId', '==', user.uid),
            where('date', '==', today),
            limit(1)
        );
        const todaySnapshot = await getDocs(todayAttendanceQuery);
        
        if (!todaySnapshot.empty) {
            // Record exists - check status
            const existingDoc = todaySnapshot.docs[0];
            const existingData = existingDoc.data() as AttendanceRecord;
            
            if (existingData.status === 'CHECKED_OUT') {
                // User already checked out - ONLY ADMIN can reopen
                Alert.alert(
                    'Already Checked Out',
                    'You have already checked out for today. If you checked out by mistake, please contact your admin to reopen your attendance.',
                    [{ text: 'OK', onPress: () => setLoading(false) }]
                );
                return;
            } else {
                // Already checked in and working
                Alert.alert('Already Checked In', 'You are already checked in for today.');
                setLoading(false);
                return;
            }
        }
        
        // Check Online Connectivity
        const isOnline = await checkOnlineStatus();
        if (!isOnline) {
          // Cache Check-In offline
          const bufferRecord = {
            actionType: 'CHECK_IN',
            userId: user.uid,
            userName: user.name,
            locationId: assignedLocation.id,
            locationName: assignedLocation.name,
            organizationId: user.organizationId,
            date: today,
            timestamp: now,
            latitude: coords.latitude,
            longitude: coords.longitude,
          };

          const queueJson = await AsyncStorage.getItem('offline_attendance_queue');
          const queue = queueJson ? JSON.parse(queueJson) : [];
          queue.push(bufferRecord);
          await AsyncStorage.setItem('offline_attendance_queue', JSON.stringify(queue));

          setAttendanceRecord({
            id: 'OFFLINE_BUFFERED',
            userId: user.uid,
            userName: user.name,
            locationId: assignedLocation.id,
            locationName: assignedLocation.name,
            organizationId: user.organizationId,
            date: today,
            checkInTime: now,
            breaks: [],
            status: 'PRESENT',
            latitude: coords.latitude,
            longitude: coords.longitude,
            verificationMethod: 'OFFLINE',
            isOfflineBuffered: true,
          });

          await updateDoc(doc(db, 'users', user.uid), {
              currentStatus: 'WORKING',
              lastActive: now
          }).catch(() => {});

          Alert.alert('🛜 Offline Mode', 'Checked in locally. Your logs will automatically sync when connection returns!');
          setLoading(false);
          return;
        }

        // No existing record - create new one
        await addDoc(collection(db, 'attendance'), {
            userId: user.uid,
            userName: user.name,
            locationId: assignedLocation.id,
            locationName: assignedLocation.name,
            organizationId: user.organizationId,
            date: today,
            checkInTime: now,
            breaks: [],
            status: 'PRESENT',
            latitude: coords.latitude,
            longitude: coords.longitude,
            verificationMethod: coords.verificationMethod || 'GPS',
        });
        
        // Notifications
        // Notification handled by Cloud Function onAttendanceChange

        updateDoc(doc(db, 'users', user.uid), {
            currentStatus: 'WORKING',
            lastActive: now
        });



        Alert.alert('✅ Success', 'Checked In Successfully!');
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleTakeBreak = async () => {
    if (!attendanceDocId || !user) return;
    
    if (!user.organizationId) {
        Alert.alert('Error', 'User organization not found. Please contact admin.');
        return;
    }

    // BREAK POLICY ENFORCEMENT
    const breakSettings = user.breakSettings || assignedLocation?.breakSettings;
    if (breakSettings) {
        if (breakSettings.isEnabled === false) {
             Alert.alert('Not Allowed', 'Breaks are disabled for your account/location.');
             return;
        }



        const existingBreaks = attendanceRecord?.breaks || [];
        let usedMinutes = 0;
        existingBreaks.forEach(b => {
             if (b.endTime && b.startTime) {
                 usedMinutes += (b.endTime - b.startTime) / (1000 * 60);
             }
        });
        

    }
    
    setLoading(true);
    try {
        const now = Date.now();
        const newBreak: BreakSession = { startTime: now };
        await updateDoc(doc(db, 'attendance', attendanceDocId), {
            status: 'ON_BREAK',
            breaks: [...(attendanceRecord?.breaks || []), newBreak]
        });
        
        // Notification handled by Cloud Function onAttendanceChange

        updateDoc(doc(db, 'users', user.uid), {
            currentStatus: 'ON_BREAK',
            lastActive: now
        });



        Alert.alert('☕ Break Started', 'Enjoy your break!');
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleResumeWork = async () => {
    if (!attendanceDocId || !attendanceRecord || !user) return;
    
    if (!user.organizationId) {
        Alert.alert('Error', 'User organization not found. Please contact admin.');
        return;
    }
    
    setLoading(true);
    try {
        const now = Date.now();
        const breaks = [...attendanceRecord.breaks];
        if (breaks.length > 0) {
            breaks[breaks.length - 1].endTime = now;
        }

        await updateDoc(doc(db, 'attendance', attendanceDocId), {
            status: 'PRESENT',
            breaks: breaks
        });

        // Notification handled by Cloud Function onAttendanceChange

        updateDoc(doc(db, 'users', user.uid), {
            currentStatus: 'WORKING',
            lastActive: now
        });



        Alert.alert('💼 Resumed', 'Welcome back!');
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceDocId || !attendanceRecord || !user || !assignedLocation) return;
    
    if (!user.organizationId) {
        Alert.alert('Error', 'User organization not found. Please contact admin.');
        return;
    }
    
    setLoading(true);
    try {
        const today = getLocalDateStr();
        const now = Date.now();
        const coords = await checkLocation();
        if (!coords) return;

        let breaks = [...attendanceRecord.breaks];
        if (attendanceRecord.status === 'ON_BREAK' && breaks.length > 0) {
            breaks[breaks.length - 1].endTime = Date.now();
        }

        const isOnline = await checkOnlineStatus();
        if (!isOnline) {
          // Cache Check-Out offline
          const bufferRecord = {
            actionType: 'CHECK_OUT',
            userId: user.uid,
            userName: user.name,
            locationId: assignedLocation.id,
            locationName: assignedLocation.name,
            organizationId: user.organizationId,
            date: today,
            timestamp: now,
            latitude: coords.latitude,
            longitude: coords.longitude,
          };

          const queueJson = await AsyncStorage.getItem('offline_attendance_queue');
          const queue = queueJson ? JSON.parse(queueJson) : [];
          queue.push(bufferRecord);
          await AsyncStorage.setItem('offline_attendance_queue', JSON.stringify(queue));

          setAttendanceRecord(prev => prev ? {
            ...prev,
            status: 'CHECKED_OUT',
            checkOutTime: now,
            isOfflineBuffered: true,
          } : null);

          await updateDoc(doc(db, 'users', user.uid), {
              currentStatus: 'CHECKED_OUT',
              lastActive: now
          }).catch(() => {});

          Alert.alert('🛜 Offline Mode', 'Checked out locally. Payout logs will sync when internet returns!');
          setLoading(false);
          return;
        }

        await updateDoc(doc(db, 'attendance', attendanceDocId), {
            status: 'CHECKED_OUT',
            checkOutTime: Date.now(),
            breaks: breaks
        });
        
        // Notification handled by Cloud Function onAttendanceChange

        updateDoc(doc(db, 'users', user.uid), {
            currentStatus: 'CHECKED_OUT',
            lastActive: Date.now()
        });



        Alert.alert('👋 Success', 'Checked Out Successfully!');
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  // Run once on mount, and whenever user changes
  useEffect(() => {
    checkStaleSessions();
    if (user?.uid) {
      syncOfflineQueue();
    }
  }, [user?.uid]);

  return {
    attendanceRecord,
    loading,
    handleCheckIn,
    handleTakeBreak,
    handleResumeWork,
    handleCheckOut
  };
};
