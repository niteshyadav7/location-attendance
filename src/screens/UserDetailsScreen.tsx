import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { AttendanceRecord } from '../types';
import { format } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../constants/theme';
import { useAdminUserDetails } from '../hooks/useAdminUserDetails';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '../hooks/useAds';

interface UserDetailsScreenProps {
  route: any;
  navigation: any;
}

export const UserDetailsScreen: React.FC<UserDetailsScreenProps> = ({ route, navigation }) => {
  const { userId } = route.params;
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('userDetails');
  const {
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
    resetDeviceLock,
    updateBreakSettings,
    handleStartBreak,
    handleEndBreak,
    startingBreak,
    endingBreak,
  } = useAdminUserDetails(userId);

  // Break Settings State






  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'WORKING': return COLORS.status.working;
      case 'ON_BREAK': return COLORS.status.onBreak;
      case 'CHECKED_OUT': return COLORS.status.checkedOut;
      default: return COLORS.status.offline;
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
  const canCheckin = user?.currentStatus === 'CHECKED_OUT' || !user?.currentStatus || user?.currentStatus === 'OFFLINE';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header Card with Gradient */}
      <LinearGradient
        colors={COLORS.gradients.primary}
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

        {/* Admin Action Buttons */}
        {canCheckout && currentAttendanceId && (
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            disabled={checkingOut}
          >
            {checkingOut ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
                <Text style={styles.checkoutButtonText}>Checkout User</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canCheckin && (
          <TouchableOpacity
            style={styles.checkinButton}
            onPress={handleCheckin}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={COLORS.white} />
                <Text style={styles.checkinButtonText}>Check-in User</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Break Management Buttons */}
        {user?.currentStatus === 'WORKING' && currentAttendanceId && (
          <TouchableOpacity
            style={styles.breakButton}
            onPress={handleStartBreak}
            disabled={startingBreak}
          >
            {startingBreak ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="cafe-outline" size={20} color={COLORS.white} />
                <Text style={styles.breakButtonText}>Start Break</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {user?.currentStatus === 'ON_BREAK' && currentAttendanceId && (
          <TouchableOpacity
            style={styles.breakButton}
            onPress={handleEndBreak}
            disabled={endingBreak}
          >
            {endingBreak ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="briefcase-outline" size={20} color={COLORS.white} />
                <Text style={styles.breakButtonText}>End Break</Text>
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
              <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Role</Text>
            </View>
            <Text style={styles.infoValue}>{user.role === 'company_admin' ? 'Administrator' : 'Employee'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Assigned Location</Text>
            </View>
            <Text style={styles.infoValue}>{locationName}</Text>
          </View>

          <View style={styles.divider} />

          {user.appVersion && (
            <>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="smartphone-outline" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>App Version</Text>
              </View>
              <Text style={styles.infoValue}>v{user.appVersion}</Text>
            </View>
            <View style={styles.divider} />
            </>
          )}


            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="phone-portrait-outline" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Device Lock</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                  <View style={[styles.accountStatusBadge, { 
                      backgroundColor: user.registeredDeviceId ? '#e0f2fe' : '#fff7ed' 
                  }]}>
                    <Text style={[styles.accountStatusText, { 
                        color: user.registeredDeviceId ? '#0369a1' : '#c2410c' 
                    }]}>
                      {user.registeredDeviceId ? 'Locked to Device' : 'No Device Linked'}
                    </Text>
                  </View>
                  {user.deviceResetRequested && (
                      <View style={[styles.accountStatusBadge, { backgroundColor: '#fef2f2' }]}>
                          <Text style={[styles.accountStatusText, { color: '#dc2626' }]}>Reset Requested</Text>
                      </View>
                  )}
              </View>
             </View>
              
             <View style={{ marginTop: 10 }}>
                {user.deviceResetRequested ? (
                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: COLORS.status.working }]}
                        onPress={resetDeviceLock}
                    >
                         <Ionicons name="refresh-circle" size={20} color={COLORS.white} />
                         <Text style={styles.actionButtonText}>Approve Device Reset</Text>
                    </TouchableOpacity>
                ) : user.registeredDeviceId ? (
                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#64748b' }]}
                        onPress={() => {
                            Alert.alert('Reset Device Lock', 'Are you sure? The user will be able to link a new phone on their next login.', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Reset', onPress: resetDeviceLock }
                            ]);
                        }}
                    >
                         <Ionicons name="phone-portrait" size={20} color={COLORS.white} />
                         <Text style={styles.actionButtonText}>Unlink Device</Text>
                    </TouchableOpacity>
                ) : null}
             </View>

             <View style={styles.divider} />
             <TouchableOpacity 
                  style={[styles.infoRow, { justifyContent: 'space-between', marginTop: 5 }]}
                  onPress={() => navigation.navigate('UserWalletHistory', { targetUserId: userId })}
             >
                  <View style={styles.infoItem}>
                      <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.infoLabel}>Wallet & Advances History</Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={20} color={COLORS.text.secondary} />
             </TouchableOpacity>
        </View>
      </View>


      {/* Break Policy Section Override */}


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
            <Ionicons name="document-text-outline" size={48} color={COLORS.text.light} />
            <Text style={styles.emptyText}>No attendance records yet</Text>
          </View>
        ) : (
          recentAttendance.map((record, index) => (
            <View key={record.id} style={styles.attendanceCard}>
              <View style={styles.attendanceHeader}>
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar" size={16} color={COLORS.primary} />
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
                  <Ionicons name="time-outline" size={16} color={COLORS.primary} />
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
      
      <View style={{ alignItems: 'center', marginVertical: 20 }}>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  headerCard: {
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginRight: 8,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  lastActiveText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  checkinButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  breakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.9)', // Amber-500
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  breakButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  accountStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accountStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  emptyText: {
    marginTop: 12,
    color: COLORS.text.light,
    fontSize: 16,
  },
  attendanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceDetails: {
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    width: 80,
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 12,
      gap: 8,
  },
  actionButtonText: {
      color: COLORS.white,
      fontWeight: '600',
      fontSize: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  label: { fontSize: 14, color: COLORS.text.secondary, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text.primary,
  },
  rowInputs: { flexDirection: 'row' },
});
