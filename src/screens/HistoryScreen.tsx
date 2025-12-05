import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, PermissionsAndroid, Platform, Modal, TextInput, Dimensions, ScrollView } from 'react-native';
import { getFirestore, collection, query, where, orderBy, onSnapshot, getDocs } from '@react-native-firebase/firestore';
import { AttendanceRecord, UserProfile, LeaveRequest } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { format, parseISO, differenceInDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parse } from 'date-fns';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Ionicons';
import { LineChart, BarChart } from 'react-native-chart-kit';

type DateFilterType = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

export const HistoryScreen = () => {
  const user = useAuthStore((state) => state.user);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Date Filter State
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Fetch all users (for admin dropdown)
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const db = getFirestore();
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((doc: any) => {
          users.push({ ...doc.data() } as UserProfile);
        });
        setAllUsers(users.filter(u => u.role === 'user')); // Only show regular users
      },
      (err) => {
        console.error('Error fetching users:', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch attendance records
  useEffect(() => {
    if (!user) return;

    const db = getFirestore();
    const constraints = [];

    if (user.role !== 'admin') {
      constraints.push(where('userId', '==', user.uid));
    } else if (selectedUserId) {
      constraints.push(where('userId', '==', selectedUserId));
    }

    const q = query(collection(db, 'attendance'), ...constraints as any);

    const unsubscribe = onSnapshot(q,
        (snapshot) => {
          const recs: AttendanceRecord[] = [];
          snapshot.forEach((doc: any) => {
            recs.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
          });
          recs.sort((a, b) => {
            const timeA = a.checkInTime || (a as any).timestamp || 0;
            const timeB = b.checkInTime || (b as any).timestamp || 0;
            return timeB - timeA;
          });
          setRecords(recs);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Firestore error:', err);
          setError(err.message);
          setLoading(false);
          if (err.message.includes('index')) {
            setRecords([]);
          }
        }
      );

    return () => unsubscribe();
  }, [user, selectedUserId]);

  // Fetch leave requests
  useEffect(() => {
    if (!user) return;

    const db = getFirestore();
    const constraints = [where('status', '==', 'APPROVED')];

    if (user.role !== 'admin') {
      constraints.push(where('userId', '==', user.uid));
    } else if (selectedUserId) {
      constraints.push(where('userId', '==', selectedUserId));
    }

    const q = query(collection(db, 'leaves'), ...constraints as any);

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const leaveList: LeaveRequest[] = [];
        snapshot.forEach((doc: any) => {
          leaveList.push({ id: doc.id, ...doc.data() } as LeaveRequest);
        });
        setLeaves(leaveList);
      },
      (err) => {
        console.error('Error fetching leaves:', err);
      }
    );

    return () => unsubscribe();
  }, [user, selectedUserId]);

  // Filter Records based on Date
  const filteredRecords = useMemo(() => {
      if (dateFilterType === 'ALL') return records;

      const now = new Date();
      let start: Date, end: Date;

      switch (dateFilterType) {
          case 'TODAY':
              start = startOfDay(now);
              end = endOfDay(now);
              break;
          case 'WEEK':
              start = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
              end = endOfWeek(now, { weekStartsOn: 1 });
              break;
          case 'MONTH':
              start = startOfMonth(now);
              end = endOfMonth(now);
              break;
          case 'CUSTOM':
              if (!customStartDate || !customEndDate) return records;
              try {
                  start = startOfDay(parse(customStartDate, 'yyyy-MM-dd', new Date()));
                  end = endOfDay(parse(customEndDate, 'yyyy-MM-dd', new Date()));
              } catch (e) {
                  return records;
              }
              break;
          default:
              return records;
      }

      return records.filter(record => {
          const recordDate = new Date(record.checkInTime || (record as any).timestamp);
          return isWithinInterval(recordDate, { start, end });
      });
  }, [records, dateFilterType, customStartDate, customEndDate]);

  // Calculate statistics based on FILTERED records
  const statistics = useMemo(() => {
    const totalPresent = filteredRecords.filter(r => r.status === 'CHECKED_OUT' || r.status === 'PRESENT').length;
    
    const totalLeaveDays = leaves.reduce((acc, leave) => {
      const start = parseISO(leave.startDate);
      const end = parseISO(leave.endDate);
      return acc + differenceInDays(end, start) + 1;
    }, 0);

    let totalWorkingMs = 0;
    filteredRecords.forEach(record => {
      if (record.checkInTime && record.checkOutTime) {
        let totalBreak = 0;
        if (record.breaks) {
          totalBreak = record.breaks.reduce((acc, b) => {
            const end = b.endTime || b.startTime;
            return acc + (end - b.startTime);
          }, 0);
        }
        totalWorkingMs += (record.checkOutTime - record.checkInTime - totalBreak);
      }
    });

    const totalWorkingHours = Math.floor(totalWorkingMs / (1000 * 60 * 60));

    const uniqueDates = new Set(filteredRecords.map(r => r.date));
    const totalDaysMarked = uniqueDates.size;

    return {
      totalPresent,
      totalLeaveDays,
      totalWorkingHours,
      totalDaysMarked,
    };
  }, [filteredRecords, leaves]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
      if (filteredRecords.length === 0) return null;

      // Group by date
      const grouped = filteredRecords.reduce((acc, record) => {
          const date = format(new Date(record.checkInTime || (record as any).timestamp), 'MM/dd');
          if (!acc[date]) {
              acc[date] = { count: 0, hours: 0 };
          }
          acc[date].count += 1;
          
          if (record.checkInTime && record.checkOutTime) {
              let totalBreak = 0;
              if (record.breaks) {
                  totalBreak = record.breaks.reduce((bAcc, b) => {
                      const end = b.endTime || b.startTime;
                      return bAcc + (end - b.startTime);
                  }, 0);
              }
              const worked = record.checkOutTime - record.checkInTime - totalBreak;
              acc[date].hours += worked / (1000 * 60 * 60);
          }
          return acc;
      }, {} as Record<string, { count: number, hours: number }>);

      const labels = Object.keys(grouped).sort();
      const attendanceCounts = labels.map(date => grouped[date].count);
      const workingHours = labels.map(date => grouped[date].hours);

      return {
          labels,
          attendanceCounts,
          workingHours
      };
  }, [filteredRecords]);

  const screenWidth = Dimensions.get('window').width;

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 1,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    return `${hours}h ${minutes}m`;
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Platform.Version >= 33) {
        return true;
      } else if (Platform.Version >= 30) {
        return true;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs access to your storage to export CSV files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  };

  const handleExport = async () => {
    if (filteredRecords.length === 0) {
        Alert.alert('No Data', 'There are no records to export for the selected range.');
        return;
    }

    setExporting(true);
    try {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Storage permission is required to export CSV files.');
            setExporting(false);
            return;
        }

        const selectedUser = selectedUserId ? allUsers.find(u => u.uid === selectedUserId) : null;
        const userName = selectedUser ? selectedUser.name : 'All Users';

        let summarySection = `ATTENDANCE REPORT\n`;
        summarySection += `User,${userName}\n`;
        summarySection += `Date Range,${dateFilterType === 'CUSTOM' ? `${customStartDate} to ${customEndDate}` : dateFilterType}\n`;
        summarySection += `Generated On,${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n`;
        summarySection += `\n`;
        summarySection += `STATISTICS\n`;
        summarySection += `Total Present Days,${statistics.totalPresent}\n`;
        summarySection += `Total Working Hours,${statistics.totalWorkingHours}h\n`;
        summarySection += `\n`;
        summarySection += `DETAILED RECORDS\n`;

        const header = 'User Name,Date,Check In,Check Out,Duration,Breaks Count,Total Break Time,Break Details,Status,Location\n';
        const rows = filteredRecords.map(item => {
            const checkIn = item.checkInTime || (item as any).timestamp;
            const checkOut = item.checkOutTime;
            
            let dateStr = checkIn ? format(new Date(checkIn), 'dd/MM/yyyy') : '';
            let timeInStr = checkIn ? format(new Date(checkIn), 'HH:mm:ss') : '';
            let timeOutStr = checkOut ? format(new Date(checkOut), 'HH:mm:ss') : '';
            
            let durationStr = '';
            let breaksCount = 0;
            let totalBreakTime = 0;
            let breakDetails = '';
            
            if (item.breaks && item.breaks.length > 0) {
                breaksCount = item.breaks.length;
                
                const breakList = item.breaks.map((b, index) => {
                    const start = format(new Date(b.startTime), 'HH:mm:ss');
                    const end = b.endTime ? format(new Date(b.endTime), 'HH:mm:ss') : 'Ongoing';
                    const duration = b.endTime ? b.endTime - b.startTime : 0;
                    totalBreakTime += duration;
                    
                    const durationMin = Math.floor(duration / 60000);
                    return `Break ${index + 1}: ${start} - ${end} (${durationMin}min)`;
                }).join('; ');
                
                breakDetails = breakList;
            }
            
            const totalBreakStr = formatDuration(totalBreakTime);
            
            if (checkIn && checkOut) {
                const worked = checkOut - checkIn - totalBreakTime;
                durationStr = formatDuration(worked);
            }

            const escapeField = (field: string) => `"${field.replace(/"/g, '""')}"`;
            
            return `${escapeField(item.userName)},${escapeField(dateStr)},${escapeField(timeInStr)},${escapeField(timeOutStr)},${escapeField(durationStr)},${breaksCount},${escapeField(totalBreakStr)},${escapeField(breakDetails)},${escapeField(item.status)},${escapeField(item.locationName)}`;
        }).join('\n');

        const csvContent = summarySection + header + rows;
        
        const userSuffix = selectedUser ? `_${selectedUser.name.replace(/\s+/g, '_')}` : '';
        const rangeSuffix = `_${dateFilterType}`;
        const fileName = `attendance${userSuffix}${rangeSuffix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
        
        await RNFS.writeFile(path, csvContent, 'utf8');
        
        const shareOptions = {
            title: `Export Attendance Report`,
            url: Platform.OS === 'android' ? `file://${path}` : path,
            type: 'text/csv',
            filename: fileName,
            failOnCancel: false,
        };

        await Share.open(shareOptions);

    } catch (error: any) {
        console.error('Export error:', error);
        Alert.alert('Export Error', error.message || 'Failed to export CSV.');
    } finally {
        setExporting(false);
    }
  };

  const renderItem = ({ item }: { item: AttendanceRecord }) => {
    const checkIn = item.checkInTime || (item as any).timestamp;
    const checkOut = item.checkOutTime;
    
    let dateStr = 'Unknown Date';
    let timeStr = '';
    
    if (checkIn) {
        dateStr = format(new Date(checkIn), 'PP');
        timeStr = format(new Date(checkIn), 'p');
        if (checkOut) {
            timeStr += ` - ${format(new Date(checkOut), 'p')}`;
        } else if (item.status === 'PRESENT') {
            timeStr += ' - Now';
        }
    }

    let durationStr = '';
    if (checkIn && checkOut) {
        let totalBreak = 0;
        if (item.breaks) {
            totalBreak = item.breaks.reduce((acc, b) => {
                const end = b.endTime || b.startTime;
                return acc + (end - b.startTime);
            }, 0);
        }
        const worked = checkOut - checkIn - totalBreak;
        durationStr = ` • ${formatDuration(worked)}`;
    }

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.name}>{item.userName}</Text>
          <Text style={[styles.status, { 
              color: item.status === 'CHECKED_OUT' ? 'gray' : 
                     item.status === 'PRESENT' ? 'green' : 'orange' 
          }]}>{item.status}</Text>
        </View>
        <Text style={styles.location}>{item.locationName}</Text>
        <Text style={styles.time}>{dateStr} • {timeStr}{durationStr}</Text>
      </View>
    );
  };

  const getFilterLabel = () => {
      switch(dateFilterType) {
          case 'TODAY': return 'Today';
          case 'WEEK': return 'This Week';
          case 'MONTH': return 'This Month';
          case 'CUSTOM': return 'Custom Range';
          default: return 'All Time';
      }
  };

  return (
    <View style={styles.container}>
      {/* Header with Export Button */}
      {user?.role === 'admin' && (
        <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Attendance History</Text>
            <TouchableOpacity 
                style={styles.exportButton} 
                onPress={handleExport}
                disabled={exporting || loading}
            >
                {exporting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.exportText}>Export CSV</Text>}
            </TouchableOpacity>
        </View>
      )}

      {/* Filters (Admin Only) */}
      {user?.role === 'admin' && (
        <View style={styles.filterContainer}>
          {/* User Filter */}
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowUserPicker(true)}
          >
            <Icon name="person-outline" size={20} color="#667eea" />
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {selectedUserId ? allUsers.find(u => u.uid === selectedUserId)?.name || 'Select User' : 'All Users'}
            </Text>
            <Icon name="chevron-down" size={20} color="#667eea" />
          </TouchableOpacity>
          {selectedUserId && (
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={() => setSelectedUserId(null)}
            >
              <Icon name="close-circle" size={20} color="#ff6b6b" />
            </TouchableOpacity>
          )}

          {/* Date Filter */}
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowDateFilter(true)}
          >
            <Icon name="calendar-outline" size={20} color="#667eea" />
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {getFilterLabel()}
            </Text>
            <Icon name="chevron-down" size={20} color="#667eea" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredRecords}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
            <>
                {/* Statistics Card */}
                {(selectedUserId || user?.role !== 'admin' || dateFilterType !== 'ALL') && filteredRecords.length > 0 && (
                    <View style={styles.statsCard}>
                    <Text style={styles.statsTitle}>📊 Summary ({getFilterLabel()})</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                        <Text style={styles.statValue}>{statistics.totalPresent}</Text>
                        <Text style={styles.statLabel}>Present</Text>
                        </View>
                        <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#667eea' }]}>{statistics.totalWorkingHours}h</Text>
                        <Text style={styles.statLabel}>Hours</Text>
                        </View>
                        <View style={styles.statItem}>
                        <Text style={styles.statValue}>{statistics.totalDaysMarked}</Text>
                        <Text style={styles.statLabel}>Days</Text>
                        </View>
                    </View>
                    </View>
                )}

                {/* Charts Section */}
                {(selectedUserId || user?.role !== 'admin' || dateFilterType !== 'ALL') && chartData && chartData.labels.length > 0 && (
                    <View>
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>📈 Daily Working Hours</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <LineChart
                                    data={{
                                        labels: chartData.labels,
                                        datasets: [{ data: chartData.workingHours }]
                                    }}
                                    width={Math.max(screenWidth - 60, chartData.labels.length * 50)}
                                    height={220}
                                    chartConfig={chartConfig}
                                    bezier
                                    style={styles.chart}
                                />
                            </ScrollView>
                        </View>

                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>📊 Attendance Count</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <BarChart
                                    data={{
                                        labels: chartData.labels,
                                        datasets: [{ data: chartData.attendanceCounts }]
                                    }}
                                    width={Math.max(screenWidth - 60, chartData.labels.length * 50)}
                                    height={220}
                                    yAxisLabel=""
                                    yAxisSuffix=""
                                    chartConfig={{
                                        ...chartConfig,
                                        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                                    }}
                                    style={styles.chart}
                                />
                            </ScrollView>
                        </View>
                    </View>
                )}
            </>
        }
        ListEmptyComponent={
            !loading && !error ? <Text style={styles.emptyText}>No records found for this period.</Text> : null
        }
      />

      {/* User Picker Modal */}
      <Modal
        visible={showUserPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select User</Text>
              <TouchableOpacity onPress={() => setShowUserPicker(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ uid: null, name: 'All Users', email: '' } as any, ...allUsers]}
              keyExtractor={(item) => item.uid || 'all'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    selectedUserId === item.uid && styles.selectedUserItem
                  ]}
                  onPress={() => {
                    setSelectedUserId(item.uid);
                    setShowUserPicker(false);
                  }}
                >
                  <View>
                    <Text style={styles.userName}>{item.name}</Text>
                    {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
                  </View>
                  {selectedUserId === item.uid && (
                    <Icon name="checkmark-circle" size={24} color="#667eea" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilter}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Period</Text>
              <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateOptions}>
                {['ALL', 'TODAY', 'WEEK', 'MONTH'].map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.dateOption, dateFilterType === type && styles.selectedDateOption]}
                        onPress={() => {
                            setDateFilterType(type as DateFilterType);
                            if (type !== 'CUSTOM') setShowDateFilter(false);
                        }}
                    >
                        <Text style={[styles.dateOptionText, dateFilterType === type && styles.selectedDateOptionText]}>
                            {type === 'ALL' ? 'All Time' : 
                             type === 'TODAY' ? 'Today' : 
                             type === 'WEEK' ? 'This Week' : 'This Month'}
                        </Text>
                        {dateFilterType === type && <Icon name="checkmark" size={20} color="#fff" />}
                    </TouchableOpacity>
                ))}

                <TouchableOpacity
                    style={[styles.dateOption, dateFilterType === 'CUSTOM' && styles.selectedDateOption]}
                    onPress={() => setDateFilterType('CUSTOM')}
                >
                    <Text style={[styles.dateOptionText, dateFilterType === 'CUSTOM' && styles.selectedDateOptionText]}>
                        Custom Range
                    </Text>
                    {dateFilterType === 'CUSTOM' && <Icon name="checkmark" size={20} color="#fff" />}
                </TouchableOpacity>

                {dateFilterType === 'CUSTOM' && (
                    <View style={styles.customDateContainer}>
                        <Text style={styles.customDateLabel}>Enter dates (YYYY-MM-DD):</Text>
                        <View style={styles.dateInputRow}>
                            <TextInput
                                style={styles.dateInput}
                                placeholder="Start (YYYY-MM-DD)"
                                value={customStartDate}
                                onChangeText={setCustomStartDate}
                                placeholderTextColor="#999"
                            />
                            <TextInput
                                style={styles.dateInput}
                                placeholder="End (YYYY-MM-DD)"
                                value={customEndDate}
                                onChangeText={setCustomEndDate}
                                placeholderTextColor="#999"
                            />
                        </View>
                        <TouchableOpacity 
                            style={styles.applyButton}
                            onPress={() => setShowDateFilter(false)}
                        >
                            <Text style={styles.applyButtonText}>Apply Filter</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
      
      {!loading && error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading history:</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>
            {error.includes('index') 
              ? 'Please create a Firestore index or contact admin.' 
              : 'Please try again later.'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff', 
    elevation: 2 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  exportButton: { backgroundColor: '#007AFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  exportText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  // Filter Container
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
    justifyContent: 'space-between'
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  clearFilterButton: {
    padding: 8,
  },

  // Statistics Card
  statsCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 15,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // Chart Styles
  chartCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 15,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedUserItem: {
    backgroundColor: '#f0f4ff',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
  },
  
  // Date Filter Styles
  dateOptions: {
      padding: 20,
  },
  dateOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      borderRadius: 10,
      backgroundColor: '#f8f9fa',
      marginBottom: 10,
  },
  selectedDateOption: {
      backgroundColor: '#667eea',
  },
  dateOptionText: {
      fontSize: 16,
      color: '#333',
      fontWeight: '500',
  },
  selectedDateOptionText: {
      color: '#fff',
      fontWeight: 'bold',
  },
  customDateContainer: {
      marginTop: 10,
      padding: 15,
      backgroundColor: '#f8f9fa',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e9ecef',
  },
  customDateLabel: {
      fontSize: 14,
      color: '#666',
      marginBottom: 10,
  },
  dateInputRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 15,
  },
  dateInput: {
      flex: 1,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 10,
      color: '#333',
  },
  applyButton: {
      backgroundColor: '#667eea',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
  },
  applyButtonText: {
      color: '#fff',
      fontWeight: 'bold',
  },

  // Existing styles
  list: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  status: { fontSize: 14, color: 'green', fontWeight: 'bold' },
  location: { fontSize: 14, color: '#666', marginBottom: 5 },
  time: { fontSize: 12, color: '#999' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  errorText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#d32f2f', 
    marginBottom: 10 
  },
  errorMessage: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 10 
  },
  errorHint: { 
    fontSize: 12, 
    color: '#999', 
    textAlign: 'center', 
    fontStyle: 'italic' 
  },
});
