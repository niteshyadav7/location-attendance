import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit, updateDoc } from '@react-native-firebase/firestore';
import { UserProfile, AttendanceRecord, LeaveRequest } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

interface UserDetailsScreenProps {
  route: any;
  navigation: any;
}

export const UserDetailsScreen: React.FC<UserDetailsScreenProps> = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
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

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const db = getFirestore();
      
      // Fetch user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as UserProfile;
        setUser(userData);

        // Fetch location name if assigned
        if (userData.assignedLocationId) {
          const locationDoc = await getDoc(doc(db, 'locations', userData.assignedLocationId));
          if (locationDoc.exists()) {
            setLocationName(locationDoc.data()?.name || 'Unknown Location');
          }
        }

        // Check if user has active attendance today
        const today = format(new Date(), 'yyyy-MM-dd');
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', userId),
          where('date', '==', today)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        if (!attendanceSnapshot.empty) {
          const attendanceDoc = attendanceSnapshot.docs[0];
          const attendanceData = attendanceDoc.data() as AttendanceRecord;
          if (!attendanceData.checkOutTime) {
            setCurrentAttendanceId(attendanceDoc.id);
          }
        }

        // Fetch attendance stats for current month
        await fetchAttendanceStats(userId);
        
        // Fetch recent attendance records
        await fetchRecentAttendance(userId);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentAttendanceId || !user) return;

    Alert.alert(
      'Checkout User',
      `Are you sure you want to checkout ${user.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Checkout',
          style: 'destructive',
          onPress: async () => {
            try {
              setCheckingOut(true);
              const db = getFirestore();
              const now = Date.now();

              // Update attendance record
              await updateDoc(doc(db, 'attendance', currentAttendanceId), {
                checkOutTime: now,
                status: 'CHECKED_OUT',
              });

              // Update user status
              await updateDoc(doc(db, 'users', userId), {
                currentStatus: 'CHECKED_OUT',
                lastActive: now,
              });

              Alert.alert('Success', `${user.name} has been checked out successfully`);
              
              // Refresh user details
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

  const fetchAttendanceStats = async (uid: string) => {
    try {
      const db = getFirestore();
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      // Fetch all attendance records for this user (no date filter to avoid composite index)
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', uid)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      let totalPresent = 0;
      let totalWorkingMinutes = 0;
      let checkInTimes: number[] = [];
      let checkOutTimes: number[] = [];

      attendanceSnapshot.forEach((doc: any) => {
        const record = doc.data() as AttendanceRecord;
        
        // Filter by date in JavaScript
        if (record.date >= monthStart && record.date <= monthEnd) {
          totalPresent++;
          
          if (record.checkInTime) {
            checkInTimes.push(record.checkInTime);
          }
          
          if (record.checkOutTime && record.checkInTime) {
            checkOutTimes.push(record.checkOutTime);
            const workingMinutes = (record.checkOutTime - record.checkInTime) / (1000 * 60);
            
            // Subtract break time
            if (record.breaks && record.breaks.length > 0) {
              record.breaks.forEach((breakSession) => {
                if (breakSession.endTime) {
                  const breakMinutes = (breakSession.endTime - breakSession.startTime) / (1000 * 60);
                  totalWorkingMinutes += (workingMinutes - breakMinutes);
                }
              });
            } else {
              totalWorkingMinutes += workingMinutes;
            }
          }
        }
      });

      // Fetch approved leaves for this user
      const leavesQuery = query(
        collection(db, 'leaves'),
        where('userId', '==', uid),
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
        
        // Count days that fall within current month
        let currentDate = new Date(Math.max(leaveStart.getTime(), monthStartDate.getTime()));
        const endDate = new Date(Math.min(leaveEnd.getTime(), monthEndDate.getTime()));
        
        while (currentDate <= endDate) {
          totalLeaves++;
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      // Calculate averages
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

  const fetchRecentAttendance = async (uid: string) => {
    try {
      const db = getFirestore();
      // Fetch all attendance for this user (no orderBy to avoid composite index)
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', uid)
      );
      const snapshot = await getDocs(attendanceQuery);
      const records: AttendanceRecord[] = [];
      snapshot.forEach((doc: any) => {
        records.push({ ...doc.data(), id: doc.id } as AttendanceRecord);
      });
      
      // Sort by checkInTime in JavaScript and take last 5
      const sortedRecords = records
        .sort((a, b) => b.checkInTime - a.checkInTime)
        .slice(0, 5);
      
      setRecentAttendance(sortedRecords);
    } catch (error) {
      console.error('Error fetching recent attendance:', error);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'WORKING': return '#10b981';
      case 'ON_BREAK': return '#f59e0b';
      case 'CHECKED_OUT': return '#6b7280';
      default: return '#ef4444';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'WORKING': return 'Working';
      case 'ON_BREAK': return 'On Break';
      case 'CHECKED_OUT': return 'Checked Out';
      default: return 'Offline';
    }
  };

  const calculateWorkingHours = (record: AttendanceRecord): string => {
    if (!record.checkOutTime) return 'In Progress';
    
    let workingMinutes = (record.checkOutTime - record.checkInTime) / (1000 * 60);
    
    if (record.breaks && record.breaks.length > 0) {
      record.breaks.forEach((breakSession) => {
        if (breakSession.endTime) {
          const breakMinutes = (breakSession.endTime - breakSession.startTime) / (1000 * 60);
          workingMinutes -= breakMinutes;
        }
      });
    }
    
    const hours = Math.floor(workingMinutes / 60);
    const minutes = Math.round(workingMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  const canCheckout = user?.currentStatus === 'WORKING' || user?.currentStatus === 'ON_BREAK';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Card with Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.currentStatus) }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{getStatusLabel(user.currentStatus)}</Text>
        </View>

        {user.lastActive && (
          <Text style={styles.lastActiveText}>
            Last active: {format(user.lastActive, 'MMM dd, yyyy h:mm a')}
          </Text>
        )}

        {/* Admin Checkout Button */}
        {canCheckout && currentAttendanceId && (
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            disabled={checkingOut}
          >
            {checkingOut ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.checkoutButtonText}>Checkout User</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* User Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="briefcase-outline" size={20} color="#667eea" />
              <Text style={styles.infoLabel}>Role</Text>
            </View>
            <Text style={styles.infoValue}>{user.role === 'admin' ? 'Administrator' : 'Employee'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color="#667eea" />
              <Text style={styles.infoLabel}>Assigned Location</Text>
            </View>
            <Text style={styles.infoValue}>{locationName}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#667eea" />
              <Text style={styles.infoLabel}>Account Status</Text>
            </View>
            <View style={[styles.accountStatusBadge, { 
              backgroundColor: user.isActive === false ? '#fee2e2' : '#d1fae5' 
            }]}>
              <Text style={[styles.accountStatusText, { 
                color: user.isActive === false ? '#dc2626' : '#059669' 
              }]}>
                {user.isActive === false ? 'Inactive' : 'Active'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Monthly Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Month's Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="calendar-outline" size={24} color="#2563eb" />
            <Text style={[styles.statNumber, { color: '#2563eb' }]}>{attendanceStats.totalPresent}</Text>
            <Text style={styles.statLabel}>Days Present</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="time-outline" size={24} color="#d97706" />
            <Text style={[styles.statNumber, { color: '#d97706' }]}>{attendanceStats.totalLeaves}</Text>
            <Text style={styles.statLabel}>Leaves Taken</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Ionicons name="hourglass-outline" size={24} color="#059669" />
            <Text style={[styles.statNumber, { color: '#059669' }]}>{attendanceStats.totalWorkingHours}h</Text>
            <Text style={styles.statLabel}>Working Hours</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#e0e7ff' }]}>
            <Ionicons name="trending-up-outline" size={24} color="#6366f1" />
            <Text style={[styles.statNumber, { color: '#6366f1', fontSize: 16 }]}>{attendanceStats.avgCheckInTime}</Text>
            <Text style={styles.statLabel}>Avg Check-in</Text>
          </View>
        </View>
      </View>

      {/* Recent Attendance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Attendance</Text>
        
        {recentAttendance.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No attendance records yet</Text>
          </View>
        ) : (
          recentAttendance.map((record, index) => (
            <View key={record.id} style={styles.attendanceCard}>
              <View style={styles.attendanceHeader}>
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar" size={16} color="#667eea" />
                  <Text style={styles.dateText}>{format(new Date(record.date), 'MMM dd, yyyy')}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: record.checkOutTime ? '#d1fae5' : '#fef3c7' }]}>
                  <Text style={[styles.statusChipText, { color: record.checkOutTime ? '#059669' : '#d97706' }]}>
                    {record.checkOutTime ? 'Completed' : 'In Progress'}
                  </Text>
                </View>
              </View>

              <View style={styles.attendanceDetails}>
                <View style={styles.timeRow}>
                  <Ionicons name="log-in-outline" size={16} color="#10b981" />
                  <Text style={styles.timeLabel}>Check-in:</Text>
                  <Text style={styles.timeValue}>{format(record.checkInTime, 'h:mm a')}</Text>
                </View>

                {record.checkOutTime && (
                  <View style={styles.timeRow}>
                    <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                    <Text style={styles.timeLabel}>Check-out:</Text>
                    <Text style={styles.timeValue}>{format(record.checkOutTime, 'h:mm a')}</Text>
                  </View>
                )}

                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={16} color="#667eea" />
                  <Text style={styles.timeLabel}>Working:</Text>
                  <Text style={styles.timeValue}>{calculateWorkingHours(record)}</Text>
                </View>

                {record.breaks && record.breaks.length > 0 && (
                  <View style={styles.timeRow}>
                    <Ionicons name="cafe-outline" size={16} color="#f59e0b" />
                    <Text style={styles.timeLabel}>Breaks:</Text>
                    <Text style={styles.timeValue}>{record.breaks.length}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

