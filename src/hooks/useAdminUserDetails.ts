import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, arrayUnion } from '@react-native-firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { UserProfile, AttendanceRecord, LeaveRequest, BreakSettings } from '../types';

export const useAdminUserDetails = (userId: string) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [startingBreak, setStartingBreak] = useState(false);
  const [endingBreak, setEndingBreak] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    totalPresent: 0,
    totalLeaves: 0,
    totalWorkingHours: 0,
    avgCheckInTime: '',
    avgCheckOutTime: '',
  });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [locationName, setLocationName] = useState('Not Assigned');
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);

  const fetchAttendanceStats = async (uid: string, orgId: string, db: any) => {
    try {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', uid),
        where('organizationId', '==', orgId)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      let totalPresent = 0;
      let totalWorkingMinutes = 0;
      let checkInTimes: number[] = [];
      let checkOutTimes: number[] = [];

      attendanceSnapshot.forEach((doc: any) => {
        const record = doc.data() as AttendanceRecord;
        if (record.date >= monthStart && record.date <= monthEnd) {
          totalPresent++;
          if (record.checkInTime) checkInTimes.push(record.checkInTime);
          if (record.checkOutTime && record.checkInTime) {
            checkOutTimes.push(record.checkOutTime);
            const workingMinutes = (record.checkOutTime - record.checkInTime) / (1000 * 60);
            let breakMinutes = 0;
            if (record.breaks && record.breaks.length > 0) {
              record.breaks.forEach((breakSession: any) => {
                if (breakSession.endTime) {
                  breakMinutes += (breakSession.endTime - breakSession.startTime) / (1000 * 60);
                }
              });
            } 
             totalWorkingMinutes += (workingMinutes - breakMinutes);
          }
        }
      });

      const leavesQuery = query(
        collection(db, 'leaves'),
        where('userId', '==', uid),
        where('organizationId', '==', orgId),
        where('status', '==', 'APPROVED')
      );
      const leavesSnapshot = await getDocs(leavesQuery);
      let totalLeaves = 0;
      
      leavesSnapshot.forEach((doc: any) => {
          const leave = doc.data() as LeaveRequest;
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);
          const monthStartDate = startOfMonth(now);
          const monthEndDate = endOfMonth(now);
          
          let currentDate = new Date(Math.max(leaveStart.getTime(), monthStartDate.getTime()));
          const endDate = new Date(Math.min(leaveEnd.getTime(), monthEndDate.getTime()));
          
          while (currentDate <= endDate) {
            totalLeaves++;
            currentDate.setDate(currentDate.getDate() + 1);
          }
      });

      const avgCheckIn = checkInTimes.length > 0
        ? format(new Date(checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length), 'h:mm a')
        : 'N/A';
      
      const avgCheckOut = checkOutTimes.length > 0
        ? format(new Date(checkOutTimes.reduce((a, b) => a + b, 0) / checkOutTimes.length), 'h:mm a')
        : 'N/A';

      setAttendanceStats({
        totalPresent,
        totalLeaves,
        totalWorkingHours: Math.round(totalWorkingMinutes / 60 * 10) / 10,
        avgCheckInTime: avgCheckIn,
        avgCheckOutTime: avgCheckOut,
      });
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    }
  };

  const fetchRecentAttendance = async (uid: string, orgId: string, db: any) => {
      try {
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('userId', '==', uid),
            where('organizationId', '==', orgId)
        );
        const snapshot = await getDocs(attendanceQuery);
        const records: AttendanceRecord[] = [];
        snapshot.forEach((doc: any) => {
            records.push({ ...doc.data(), id: doc.id } as AttendanceRecord);
        });
        
        const sortedRecords = records
            .sort((a, b) => b.checkInTime - a.checkInTime)
            .slice(0, 5);
        
        setRecentAttendance(sortedRecords);
      } catch (error) {
        console.error('Error fetching recent attendance:', error);
      }
  };

  const fetchUserDetails = useCallback(async () => {
    try {
      const db = getFirestore();
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as UserProfile;
        setUser(userData);

        if (userData.assignedLocationId) {
          const locationDoc = await getDoc(doc(db, 'locations', userData.assignedLocationId));
          if (locationDoc.exists()) {
            setLocationName(locationDoc.data()?.name || 'Unknown Location');
          }
        }

        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', userId),
          where('organizationId', '==', userData.organizationId)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        let mostRecentUncheckedOut = null;
        let mostRecentTime = 0;
        
        attendanceSnapshot.forEach((doc: any) => {
          const data = doc.data() as AttendanceRecord;
          if (!data.checkOutTime && data.checkInTime > mostRecentTime) {
            mostRecentUncheckedOut = doc.id;
            mostRecentTime = data.checkInTime;
          }
        });
        
        if (mostRecentUncheckedOut) {
          setCurrentAttendanceId(mostRecentUncheckedOut);
        } else {
            setCurrentAttendanceId(null);
        }

        await fetchAttendanceStats(userId, userData.organizationId, db);
        await fetchRecentAttendance(userId, userData.organizationId, db);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleCheckout = async () => {
    if (!currentAttendanceId || !user) return;

    Alert.alert(
      'Checkout User',
      `Are you sure you want to checkout ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Checkout',
          style: 'destructive',
          onPress: async () => {
            try {
              setCheckingOut(true);
              const db = getFirestore();
              const now = Date.now();
              await updateDoc(doc(db, 'attendance', currentAttendanceId), {
                checkOutTime: now,
                status: 'CHECKED_OUT',
              });
              await updateDoc(doc(db, 'users', userId), {
                currentStatus: 'CHECKED_OUT',
                lastActive: now,
              });
              Alert.alert('Success', `${user.name} has been checked out successfully`);
              await fetchUserDetails();
            } catch (error) {
              console.error('Error checking out user:', error);
              Alert.alert('Error', 'Failed to checkout user. Please try again.');
            } finally {
              setCheckingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleCheckin = async () => {
    if (!user) return;

    Alert.alert(
      'Check-in User',
      `Are you sure you want to check-in ${user.name}? This will create a new attendance record for today.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check-in',
          style: 'default',
          onPress: async () => {
            try {
              setCheckingIn(true);
              const db = getFirestore();
              const now = Date.now();
              const today = new Date().toISOString().split('T')[0];

              const todayAttendanceQuery = query(
                collection(db, 'attendance'),
                where('userId', '==', userId),
                where('date', '==', today)
              );
              const todaySnapshot = await getDocs(todayAttendanceQuery);

              if (!todaySnapshot.empty) {
                const existingDoc = todaySnapshot.docs[0];
                await updateDoc(doc(db, 'attendance', existingDoc.id), {
                  checkOutTime: null,
                  status: 'PRESENT',
                });
                setCurrentAttendanceId(existingDoc.id);
              } else {
                const newAttendanceRef = await addDoc(collection(db, 'attendance'), {
                  userId: user.uid,
                  userName: user.name,
                  organizationId: user.organizationId,
                  locationId: user.assignedLocationId || '',
                  locationName: locationName,
                  date: today,
                  checkInTime: now,
                  breaks: [],
                  status: 'PRESENT',
                });
                setCurrentAttendanceId(newAttendanceRef.id);
              }

              await updateDoc(doc(db, 'users', userId), {
                currentStatus: 'WORKING',
                lastActive: now,
              });

              await addDoc(collection(db, 'notifications'), {
                type: 'CHECK_IN',
                userId: user.uid,
                userName: user.name,
                organizationId: user.organizationId,
                message: `${user.name} was checked in by admin`,
                timestamp: now,
                read: false,
              });

              Alert.alert('Success', `${user.name} has been checked in successfully`);
              await fetchUserDetails();
            } catch (error) {
              console.error('Error checking in user:', error);
              Alert.alert('Error', 'Failed to check-in user. Please try again.');
            } finally {
              setCheckingIn(false);
            }
          },
        },
      ]
    );
  };



  const handleStartBreak = async () => {
    if (!currentAttendanceId || !user) return;

    Alert.alert(
      'Start Break',
      `Are you sure you want to start a break for ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Break',
          style: 'default',
          onPress: async () => {
            try {
              setStartingBreak(true);
              const db = getFirestore();
              const now = Date.now();
              
              const breakSession = {
                startTime: now,
              };

              await updateDoc(doc(db, 'attendance', currentAttendanceId), {
                breaks: arrayUnion(breakSession),
                status: 'ON_BREAK',
              });
              
              await updateDoc(doc(db, 'users', userId), {
                currentStatus: 'ON_BREAK',
                lastActive: now,
              });

              await addDoc(collection(db, 'notifications'), {
                type: 'BREAK_START',
                userId: user.uid,
                userName: user.name,
                organizationId: user.organizationId,
                message: `${user.name} was moved to break by admin`,
                timestamp: now,
                read: false,
              });

              Alert.alert('Success', `${user.name} is now on break`);
              await fetchUserDetails();
            } catch (error) {
              console.error('Error starting break:', error);
              Alert.alert('Error', 'Failed to start break. Please try again.');
            } finally {
              setStartingBreak(false);
            }
          },
        },
      ]
    );
  };

  const handleEndBreak = async () => {
    if (!currentAttendanceId || !user) return;

    Alert.alert(
      'End Break',
      `Are you sure you want to end break for ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Break',
          style: 'default',
          onPress: async () => {
            try {
              setEndingBreak(true);
              const db = getFirestore();
              const now = Date.now();
              
              const attendanceRef = doc(db, 'attendance', currentAttendanceId);
              const attendanceDoc = await getDoc(attendanceRef);
              
              if (attendanceDoc.exists()) {
                const data = attendanceDoc.data() as AttendanceRecord;
                const breaks = data.breaks || [];
                
                const updatedBreaks = breaks.map(b => {
                  if (!b.endTime) {
                    return { ...b, endTime: now };
                  }
                  return b;
                });

                await updateDoc(attendanceRef, {
                  breaks: updatedBreaks,
                  status: 'PRESENT',
                });

                await updateDoc(doc(db, 'users', userId), {
                  currentStatus: 'WORKING',
                  lastActive: now,
                });

                await addDoc(collection(db, 'notifications'), {
                  type: 'BREAK_END',
                  userId: user.uid,
                  userName: user.name,
                  organizationId: user.organizationId,
                  message: `${user.name} break ended by admin`,
                  timestamp: now,
                  read: false,
                });

                Alert.alert('Success', `${user.name} is back to work`);
                await fetchUserDetails();
              }
            } catch (error) {
              console.error('Error ending break:', error);
              Alert.alert('Error', 'Failed to end break. Please try again.');
            } finally {
              setEndingBreak(false);
            }
          },
        },
      ]
    );
  };

  const updateBreakSettings = async (settings: BreakSettings) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'users', userId), {
        breakSettings: settings
      });
      await fetchUserDetails(); // Refresh local state
      return true;
    } catch (error) {
       console.error("Error updating break settings:", error);
       throw error;
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  return {
    user,
    loading,
    locationName,
    attendanceStats,
    recentAttendance,
    currentAttendanceId,
    checkingOut,
    checkingIn,
    handleCheckin,
    handleCheckout,
    handleStartBreak,
    handleEndBreak,
    startingBreak,
    endingBreak,
    updateBreakSettings,
    resetDeviceLock: async () => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'users', userId), {
                registeredDeviceId: null, // Clear the lock
                deviceResetRequested: false, // Clear the flag
                deviceResetRequestDate: null 
            });
            Alert.alert('Success', 'Device lock reset successfully. The user can now login from a new device.');
            await fetchUserDetails();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    },
    refresh: fetchUserDetails
  };
};
