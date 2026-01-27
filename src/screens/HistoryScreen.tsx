import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Modal, TextInput, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AttendanceRecord } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { COLORS } from '../constants/theme';
import { useAttendanceAnalytics, DateFilterType } from '../hooks/useAttendanceAnalytics';
import { exportAttendanceToCSV, exportComprehensiveReport, exportAttendanceWithAdvance } from '../utils/csvExport';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '../hooks/useAds';
import DatePicker from 'react-native-date-picker';
import { parse } from 'date-fns';
import firestore from '@react-native-firebase/firestore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Memoized User Item for smooth scrolling in Modal
const UserItem = memo(({ item, isSelected, onToggle }: { item: any, isSelected: boolean, onToggle: (id: string) => void }) => (
    <TouchableOpacity
        style={[
        styles.userItem,
        isSelected && styles.selectedUserItem
        ]}
        onPress={() => onToggle(item.uid)}
        activeOpacity={0.7}
    >
        <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
        <Icon name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? COLORS.primary : '#ccc'} />
        <View>
            <Text style={styles.userName}>{item.name}</Text>
            {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
        </View>
        </View>
    </TouchableOpacity>
), (prev, next) => prev.isSelected === next.isSelected && prev.item.uid === next.item.uid);

// Memoized Helper for Status Color
const getStatusColor = (status: string) => {
    switch (status) {
        case 'PRESENT': return COLORS.status.working;
        case 'CHECKED_OUT': return COLORS.status.checkedOut;
        case 'ON_BREAK': return COLORS.status.onBreak;
        default: return COLORS.status.offline;
    }
};

// Memoized Attendance Card
const AttendanceCard = memo(({ item, onPress }: { item: AttendanceRecord, onPress: (item: AttendanceRecord) => void }) => {
    const checkIn = item.checkInTime || (item as any).timestamp;
    const checkOut = item.checkOutTime;
    
    // Date formatting
    const dateObj = checkIn ? new Date(checkIn) : new Date();
    const dayNum = format(dateObj, 'dd');
    const monthStr = format(dateObj, 'MMM');
    const dayName = format(dateObj, 'EEE');

    const checkInTime = checkIn ? format(new Date(checkIn), 'h:mm a') : '--:--';
    const checkOutTime = checkOut ? format(new Date(checkOut), 'h:mm a') : '--:--';
    
    let durationStr = '';
    if (checkIn && checkOut) {
        if (item.autoCheckout) {
             const fixed = item.fixedHours || 7;
             durationStr = `${fixed}h 0m (Auto)`;
        } else {
            let totalBreak = 0;
            if (item.breaks) {
                totalBreak = item.breaks.reduce((acc, b) => {
                    const end = b.endTime || b.startTime;
                    return acc + (end - b.startTime);
                }, 0);
            }
            
            const worked = checkOut - checkIn - totalBreak;
            const hours = Math.floor(worked / (1000 * 60 * 60));
            const minutes = Math.floor((worked / (1000 * 60)) % 60);
            durationStr = `${hours}h ${minutes}m`;
        }
    }

    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity 
        style={[styles.card, { borderLeftColor: statusColor }]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
            {/* Date Box */}
            <View style={styles.dateBox}>
                <Text style={styles.dayNum}>{dayNum}</Text>
                <Text style={styles.monthText}>{monthStr}</Text>
                <Text style={styles.dayName}>{dayName}</Text>
            </View>

            {/* Main Info */}
            <View style={styles.infoContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.cardUserName}>{item.userName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status.replace('_', ' ')}</Text>
                    </View>
                </View>

                {/* Time Row */}
                <View style={styles.timeRow}>
                    <View style={styles.timeBlock}>
                        <Text style={styles.timeLabel}>Check In</Text>
                        <View style={styles.timeValueRow}>
                            <Icon name="log-in-outline" size={12} color={COLORS.status.present} />
                            <Text style={styles.timeValue}>{checkInTime}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.dividerVertical} />

                    <View style={styles.timeBlock}>
                        <Text style={styles.timeLabel}>Check Out</Text>
                        <View style={styles.timeValueRow}>
                            <Icon name="log-out-outline" size={12} color={COLORS.status.checkedOut} />
                            <Text style={styles.timeValue}>{checkOutTime}</Text>
                        </View>
                    </View>
                    
                    {durationStr ? (
                        <>
                            <View style={styles.dividerVertical} />
                            <View style={styles.timeBlock}>
                                <Text style={styles.timeLabel}>Duration</Text>
                                <View style={styles.timeValueRow}>
                                    <Icon name="time-outline" size={12} color={COLORS.primary} />
                                    <Text style={styles.timeValue}>{durationStr}</Text>
                                </View>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* Footer Info */}
                <View style={styles.footerRow}>
                    <View style={styles.locationContainer}>
                        <Icon name="location-sharp" size={12} color={COLORS.text.light} />
                        <Text style={styles.locationText} numberOfLines={1}>{item.locationName || 'Unknown Location'}</Text>
                    </View>
                </View>
            </View>
        </View>
      </TouchableOpacity>
    );
});

export const HistoryScreen = () => {
  const user = useAuthStore((state) => state.user);
  
  // Custom Hook for Logic
  const { 
    allUsers, 
    filteredRecords, 
    loading, 
    error, 
    statistics, 
    chartData, 
    filters 
  } = useAttendanceAnalytics(user);

  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('history');

  const { selectedUserIds, setSelectedUserIds, dateFilterType, setDateFilterType, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate } = filters;

  // UI Local State
  /* Optimization: Temp state for modal to avoid heavy re-renders on every selection */
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Date Picker States
  const [openStartDate, setOpenStartDate] = useState(false);
  const [openEndDate, setOpenEndDate] = useState(false);

  // Money Requests State
  const [moneyRequests, setMoneyRequests] = useState<any[]>([]);
  const [loadingMoneyRequests, setLoadingMoneyRequests] = useState(false);

  // Fetch Money Requests based on filters
  useEffect(() => {
    if (!user?.organizationId) return;

    const fetchMoneyRequests = async () => {
      setLoadingMoneyRequests(true);
      try {
        let query = firestore()
          .collection('money_requests')
          .where('organizationId', '==', user.organizationId);

        // Filter by user if selected
        if (selectedUserIds.length === 1) {
          query = query.where('userId', '==', selectedUserIds[0]);
        }

        const snapshot = await query.get();
        let requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side filter for multiple users
        if (selectedUserIds.length > 1) {
            requests = requests.filter(req => selectedUserIds.includes((req as any).userId));
        }

        // Filter by date range
        const now = new Date();
        let startDate: Date, endDate: Date;

        switch (dateFilterType) {
          case 'TODAY':
            startDate = startOfDay(now);
            endDate = endOfDay(now);
            break;
          case 'WEEK':
            startDate = startOfWeek(now);
            endDate = endOfWeek(now);
            break;
          case 'MONTH':
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
          case 'CUSTOM':
            startDate = parse(customStartDate, 'yyyy-MM-dd', new Date());
            endDate = parse(customEndDate, 'yyyy-MM-dd', new Date());
            break;
          default:
            startDate = new Date(0);
            endDate = now;
        }

        requests = requests.filter(req => {
          const r = req as any;
          if (!r.requestDate) return false;
          const reqDate = new Date(r.requestDate);
          return reqDate >= startDate && reqDate <= endDate;
        });

        setMoneyRequests(requests);
      } catch (error) {
        console.error('Error fetching money requests:', error);
      } finally {
        setLoadingMoneyRequests(false);
      }
    };

    fetchMoneyRequests();
  }, [user?.organizationId, selectedUserIds, dateFilterType, customStartDate, customEndDate]);

  const displayedRecords = React.useMemo(() => {
      let data = [...filteredRecords];
      // Local Search (Admin mainly)
      if (searchText) {
          const lower = searchText.toLowerCase();
          data = data.filter(r => r.userName.toLowerCase().includes(lower));
      }
      // Local Sort
      return data.sort((a, b) => {
           const timeA = a.checkInTime || (a as any).timestamp;
           const timeB = b.checkInTime || (b as any).timestamp;
           return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
  }, [filteredRecords, searchText, sortOrder]);

  // Smooth Layout Animation when list changes
  useEffect(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [displayedRecords.length, sortOrder]);

  const handleCardPress = useCallback((item: AttendanceRecord) => {
      setSelectedRecord(item);
      setDetailModalVisible(true);
  }, []);

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (filteredRecords.length === 0) {
        Alert.alert('No Data', 'No attendance data to export');
        return;
    }

    setExporting(true);
    try {
        const advanceMap: Record<string, number> = {};
        moneyRequests.forEach((req: any) => {
             // Assuming moneyRequests are already filtered by date and user
             const uid = req.userId;
             if (!advanceMap[uid]) advanceMap[uid] = 0;
             advanceMap[uid] += (Number(req.amount) || 0);
        });

        let start = new Date(0);
        let end = new Date();
        const now = new Date();

        switch (dateFilterType) {
            case 'TODAY':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'WEEK':
                // Assuming week starts on Monday as per hook
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'MONTH':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'CUSTOM':
                if (customStartDate && customEndDate) {
                   // parse expects specific format
                   start = parse(customStartDate, 'yyyy-MM-dd', new Date());
                   end = parse(customEndDate, 'yyyy-MM-dd', new Date());
                }
                break;
        }

        const fromDate = format(start, 'yyyy-MM-dd');
        const toDate = format(end, 'yyyy-MM-dd');
        const fileNamePrefix = `attendance_${fromDate}_${toDate}`;

        await exportAttendanceWithAdvance(filteredRecords, advanceMap, fileNamePrefix);
    } catch (error) {
        // handled in util
    } finally {
        setExporting(false);
    }
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

  const renderAttendanceItem = useCallback(({ item }: { item: AttendanceRecord }) => {
      return <AttendanceCard item={item} onPress={handleCardPress} />;
  }, [handleCardPress]);

  const renderUserItem = useCallback(({ item }: { item: any }) => {
      return (
        <UserItem 
            item={item} 
            isSelected={tempSelectedIds.includes(item.uid)} 
            onToggle={(uid) => {
                setTempSelectedIds(prev => {
                    if (prev.includes(uid)) return prev.filter(id => id !== uid);
                    return [...prev, uid];
                });
            }}
        />
      );
  }, [tempSelectedIds]);


  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => COLORS.primary,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 1,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={{ alignItems: 'center', backgroundColor: COLORS.background }}>
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
      {/* Header with Icon Buttons */}
      {user?.role !== 'user' && (
        <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Attendance History</Text>
            <View style={{flexDirection: 'row', gap: 8}}>
                {/* User Selection Button - Icon Only */}
                <TouchableOpacity 
                    style={[styles.iconButton, {backgroundColor: '#6366F1'}]} 
                    onPress={() => {
                        setTempSelectedIds(selectedUserIds);
                        setShowUserPicker(true);
                    }}
                >
                    <Icon name="person-outline" size={20} color="#fff" />
                </TouchableOpacity>
                
                {/* Date Range Button - Icon Only */}
                <TouchableOpacity 
                    style={[styles.iconButton, {backgroundColor: '#8B5CF6'}]} 
                    onPress={() => setShowDateFilter(true)}
                >
                    <Icon name="calendar-outline" size={20} color="#fff" />
                </TouchableOpacity>
                
                {/* Export CSV Button - Icon Only */}
                <TouchableOpacity 
                    style={[styles.iconButton, {backgroundColor: COLORS.primary}]} 
                    onPress={handleExport}
                    disabled={exporting || loading}
                >
                    {exporting ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Icon name="download-outline" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
      )}

      {/* Professional Search & Filter Bar */}
      <View style={styles.filterSection}>
        {/* Top Row: Search (Admin) & Sort */}
        {/* Search Row (Admin Only) */}
        {user?.role !== 'user' && (
            <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                    <Icon name="search" size={20} color={COLORS.text.secondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search employee..."
                        placeholderTextColor={COLORS.text.light}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                     {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Icon name="close-circle" size={18} color={COLORS.text.light} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        )}

        {/* Filters Row: Sort (Icon) + Date Chips */}
        <View style={styles.filterRow}>
            <TouchableOpacity 
                style={styles.iconSortButton} 
                onPress={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            >
                <Icon name={sortOrder === 'desc' ? "arrow-down" : "arrow-up"} size={22} color={COLORS.text.primary} />
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.filterChipsContainer}
            >
                {[
                    { label: 'All', value: 'ALL', icon: 'apps-outline' },
                    { label: 'Today', value: 'TODAY', icon: 'today-outline' },
                    { label: 'Week', value: 'WEEK', icon: 'calendar-outline' },
                    { label: 'Month', value: 'MONTH', icon: 'calendar-number-outline' },
                    { label: 'Custom', value: 'CUSTOM', icon: 'options-outline' },
                ].map((filter) => (
                    <TouchableOpacity
                        key={filter.value}
                        style={[
                            styles.filterChip,
                            dateFilterType === filter.value && styles.activeFilterChip
                        ]}
                        onPress={() => {
                            if (filter.value === 'CUSTOM') {
                                setShowDateFilter(true);
                            } else {
                                setDateFilterType(filter.value as any);
                            }
                        }}
                    >
                        <Icon 
                            name={filter.icon} 
                            size={14} 
                            color={dateFilterType === filter.value ? '#fff' : COLORS.text.secondary} 
                        />
                        <Text style={[
                            styles.filterChipText,
                            dateFilterType === filter.value && styles.activeFilterChipText
                        ]}>
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      </View>

      {/* Date Range Badges (if Custom) */}
      {dateFilterType === 'CUSTOM' && (
          <View style={styles.activeFiltersRow}>
              <View style={styles.activeFilterBadge}>
                  <Text style={styles.activeFilterText}>{customStartDate} - {customEndDate}</Text>
                  <TouchableOpacity onPress={() => setDateFilterType('ALL')}>
                      <Icon name="close" size={14} color={COLORS.primary} />
                  </TouchableOpacity>
              </View>
          </View>
      )}

      <FlatList
        data={displayedRecords}
        renderItem={renderAttendanceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyContainer}>
                    <Icon name="clipboard-outline" size={64} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>No records found</Text>
                    <Text style={styles.emptySubtitle}>
                        Try adjusting your filters or search criteria.
                    </Text>
                </View>
            ) : null
        }
        ListHeaderComponent={
            <>
                {/* Statistics Card */}
                {(selectedUserIds.length > 0 || user?.role === 'user' || dateFilterType !== 'ALL') && filteredRecords.length > 0 && (
                    <View style={styles.statsCard}>
                    <Text style={styles.statsTitle}>📊 Summary ({getFilterLabel()})</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.status.present }]}>{statistics.totalPresent}</Text>
                            <Text style={styles.statLabel}>Present</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.primary }]}>{statistics.totalWorkingHours}h</Text>
                            <Text style={styles.statLabel}>Hours</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#333' }]}>{statistics.totalDaysMarked}</Text>
                            <Text style={styles.statLabel}>Days</Text>
                        </View>
                    </View>
                    </View>
                )}

                {/* Charts Section */}
                {(selectedUserIds.length > 0 || user?.role === 'user' || dateFilterType !== 'ALL') && chartData && chartData.labels.length > 0 && (
                    <View>
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>📈 Daily Working Hours</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <LineChart
                                    data={{
                                        labels: chartData.labels,
                                        datasets: [{ data: chartData.workingHours }]
                                    }}
                                    width={Math.max(350, chartData.labels.length * 50)}
                                    height={220}
                                    chartConfig={{
                                        ...chartConfig,
                                        color: (opacity = 1) => COLORS.primary,
                                    }}
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
                                    width={Math.max(350, chartData.labels.length * 50)}
                                    height={220}
                                    yAxisLabel=""
                                    yAxisSuffix=""
                                    chartConfig={{
                                        ...chartConfig,
                                        color: (opacity = 1) => COLORS.status.present,
                                    }}
                                    style={styles.chart}
                                />
                            </ScrollView>
                        </View>
                    </View>
                )}
            </>
        }

      />

      <Modal
        visible={showUserPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Users</Text>
              <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity onPress={() => setTempSelectedIds([])}>
                      <Text style={{color: COLORS.primary, fontWeight: '600'}}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                      setSelectedUserIds(tempSelectedIds);
                      setShowUserPicker(false);
                  }}>
                    <Text style={{color: COLORS.primary, fontWeight: 'bold'}}>Done</Text>
                  </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={allUsers}
              keyExtractor={(item) => item.uid}
              initialNumToRender={15}
              windowSize={5}
              renderItem={renderUserItem}
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
              <Text style={styles.modalTitle}>Refine Period</Text>
              <TouchableOpacity onPress={() => setShowDateFilter(false)} style={styles.closeBtn}>
                <Icon name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateOptions}>
                {['ALL', 'TODAY', 'WEEK', 'MONTH'].map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.dateOption, dateFilterType === type && styles.selectedDateOption]}
                        onPress={() => {
                            setDateFilterType(type as DateFilterType);
                            // Auto close for Today/Week
                            if (type !== 'CUSTOM') setShowDateFilter(false);
                        }}
                    >
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                            <Icon 
                                name={type === 'ALL' ? 'infinite' : type === 'TODAY' ? 'today' : type === 'WEEK' ? 'calendar' : 'calendar-number'} 
                                size={20} 
                                color={dateFilterType === type ? COLORS.white : COLORS.text.secondary} 
                            />
                            <Text style={[styles.dateOptionText, dateFilterType === type && styles.selectedDateOptionText]}>
                                {type === 'ALL' ? 'All Time' : 
                                 type === 'TODAY' ? 'Today' : 
                                 type === 'WEEK' ? 'This Week' : 'This Month'}
                            </Text>
                        </View>
                        {dateFilterType === type && <Icon name="checkmark-circle" size={20} color="#fff" />}
                    </TouchableOpacity>
                ))}

                <TouchableOpacity
                    style={[styles.dateOption, dateFilterType === 'CUSTOM' && styles.selectedDateOption]}
                    onPress={() => setDateFilterType('CUSTOM')}
                >
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                        <Icon name="options" size={20} color={dateFilterType === 'CUSTOM' ? COLORS.white : COLORS.text.secondary} />
                        <Text style={[styles.dateOptionText, dateFilterType === 'CUSTOM' && styles.selectedDateOptionText]}>
                            Custom Range
                        </Text>
                    </View>
                    {dateFilterType === 'CUSTOM' && <Icon name="checkmark-circle" size={20} color="#fff" />}
                </TouchableOpacity>

                {dateFilterType === 'CUSTOM' && (
                    <View style={styles.customDateContainer}>
                        <Text style={styles.customDateLabel}>Select Date Range</Text>
                        <View style={styles.dateInputRow}>
                            <View style={{flex: 1}}>
                                <Text style={styles.dateInputLabel}>Start Date</Text>
                                <TouchableOpacity 
                                    style={styles.datePickerButton}
                                    onPress={() => setOpenStartDate(true)}
                                >
                                    <Icon name="calendar-outline" size={18} color={COLORS.primary} />
                                    <Text style={styles.datePickerText}>{customStartDate || 'YYYY-MM-DD'}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{width: 10}} />
                            <View style={{flex: 1}}>
                                <Text style={styles.dateInputLabel}>End Date</Text>
                                <TouchableOpacity 
                                    style={styles.datePickerButton}
                                    onPress={() => setOpenEndDate(true)}
                                >
                                    <Icon name="calendar-outline" size={18} color={COLORS.primary} />
                                    <Text style={styles.datePickerText}>{customEndDate || 'YYYY-MM-DD'}</Text>
                                </TouchableOpacity>
                            </View>
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
        <DatePicker
            modal
            open={openStartDate}
            date={customStartDate ? new Date(customStartDate) : new Date()}
            mode="date"
            onConfirm={(date) => {
              setOpenStartDate(false);
              setCustomStartDate(format(date, 'yyyy-MM-dd'));
            }}
            onCancel={() => setOpenStartDate(false)}
        />
        <DatePicker
            modal
            open={openEndDate}
            date={customEndDate ? new Date(customEndDate) : new Date()}
            mode="date"
            onConfirm={(date) => {
              setOpenEndDate(false);
              setCustomEndDate(format(date, 'yyyy-MM-dd'));
            }}
            onCancel={() => setOpenEndDate(false)}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.detailModalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Daily Details</Text>
                    <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeBtn}>
                        <Icon name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {selectedRecord && (
                    <ScrollView contentContainerStyle={styles.detailScroll}>
                        {/* Header Section */}
                        <View style={styles.detailHeader}>
                             <Text style={styles.detailDate}>
                                 {format(new Date(selectedRecord.checkInTime || (selectedRecord as any).timestamp), 'EEEE, MMMM do, yyyy')}
                             </Text>
                             <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRecord.status) + '20', alignSelf: 'flex-start', marginTop: 8 }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(selectedRecord.status) }]}>{selectedRecord.status.replace('_', ' ')}</Text>
                            </View>
                        </View>

                        {/* Timing Grid */}
                        <View style={styles.detailGrid}>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Check In</Text>
                                <Text style={styles.detailValue}>
                                    {selectedRecord.checkInTime ? format(new Date(selectedRecord.checkInTime), 'h:mm a') : '--:--'}
                                </Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Check Out</Text>
                                <Text style={styles.detailValue}>
                                    {selectedRecord.checkOutTime ? format(new Date(selectedRecord.checkOutTime), 'h:mm a') : '--:--'}
                                </Text>
                            </View>
                        </View>

                        {/* Breaks Section */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Break History</Text>
                             {selectedRecord.breaks && selectedRecord.breaks.length > 0 ? (
                                 selectedRecord.breaks.map((brk, index) => (
                                     <View key={index} style={styles.breakRow}>
                                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                             <Icon name="cafe-outline" size={16} color={COLORS.text.secondary} />
                                             <Text style={styles.breakTime}>
                                                 {format(new Date(brk.startTime), 'h:mm a')} - {brk.endTime ? format(new Date(brk.endTime), 'h:mm a') : 'Now'}
                                             </Text>
                                         </View>
                                         <Text style={styles.breakDuration}>
                                            {brk.endTime ? Math.floor((brk.endTime - brk.startTime) / 60000) + ' min' : 'Ongoing'}
                                         </Text>
                                     </View>
                                 ))
                             ) : (
                                 <Text style={styles.noDataText}>No breaks taken.</Text>
                             )}
                        </View>

                        {/* Location */}
                        <View style={styles.sectionContainer}>
                             <Text style={styles.sectionTitle}>Location</Text>
                             <View style={styles.locationRow}>
                                 <Icon name="location" size={18} color={COLORS.primary} />
                                 <Text style={styles.locationDetailText}>
                                     {selectedRecord.locationName || 'Location data not available'}
                                 </Text>
                             </View>
                        </View>


                    </ScrollView>
                )}
            </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
  },
  dateBox: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    width: 70,
  },
  dayNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  monthText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dayName: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  dividerVertical: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  timeLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  penaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  penaltyText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedUserItem: {
    backgroundColor: '#EEF2FF',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateOptions: {
    gap: 8,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedDateOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  selectedDateOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  customDateContainer: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  customDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  dateInputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dateInputLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  datePickerText: {
    fontSize: 14,
    color: '#374151',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorText: { fontSize: 16, color: '#666', marginBottom: 10 },
  errorMessage: { fontSize: 14, color: COLORS.status.offline, textAlign: 'center' },
  detailModalContent: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      width: '100%',
      maxHeight: '90%',
      marginTop: 'auto', // Bottom Sheet style
  },
  closeBtn: { padding: 4 },
  detailScroll: { paddingBottom: 20 },
  detailHeader: { marginBottom: 20 },
  detailDate: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  detailGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
  },
  detailItem: {
      flex: 1,
      backgroundColor: '#f9fafb',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
  },
  detailLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' },
  detailValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  breakRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
  },
  breakTime: { fontSize: 14, color: '#4b5563' },
  breakDuration: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  noDataText: { color: '#9ca3af', fontStyle: 'italic' },
  locationRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  locationDetailText: { fontSize: 14, color: '#4b5563', flex: 1, lineHeight: 20 },
  penaltyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FEF2F2',
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
  },
  penaltyDetailText: { color: '#B91C1C', flex: 1, fontSize: 13, lineHeight: 18 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 20 },

  // Search & Filter Section
  filterSection: { padding: 16, backgroundColor: '#fff', paddingTop: 0 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  searchContainer: { 
      flex: 1, 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: '#f3f4f6', 
      borderRadius: 12, 
      paddingHorizontal: 12,
      height: 48,
  },
  searchInput: { flex: 1, height: '100%', color: '#111827', fontSize: 14 },
  sortButton: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 6, 
      backgroundColor: '#f3f4f6', 
      paddingHorizontal: 12, 
      height: 48, 
      borderRadius: 12 
  },
  sortText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterChipsContainer: { gap: 8, paddingBottom: 4 },
  filterChip: { 
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14, 
      paddingVertical: 10, 
      borderRadius: 24, 
      backgroundColor: '#f3f4f6', 
      marginRight: 8,
      borderWidth: 1,
      borderColor: 'transparent',
  },
  activeFilterChip: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 13, color: '#4b5563', fontWeight: '500' },
  activeFilterChipText: { color: '#fff', fontWeight: '600' },
  activeFiltersRow: { paddingHorizontal: 16, marginBottom: 16 },
  activeFilterBadge: { 
      alignSelf: 'flex-start', 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 8, 
      backgroundColor: '#EFF6FF', 
      paddingHorizontal: 12, 
      paddingVertical: 6, 
      borderRadius: 8, 
      borderWidth: 1, 
      borderColor: '#BFDBFE' 
  },
  activeFilterText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  iconSortButton: { 
      padding: 10, 
      backgroundColor: '#f3f4f6', 
      borderRadius: 12,
      marginRight: 10,
  },
  verticalDivider: {
      width: 1,
      height: 24,
      backgroundColor: '#e5e7eb',
      marginRight: 10,
  },
  
  // Empty State
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
  },
  emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#374151',
      marginTop: 16,
  },
  emptySubtitle: {
      fontSize: 14,
      color: '#9CA3AF',
      marginTop: 8,
      textAlign: 'center',
      paddingHorizontal: 40,
  },
  // User Selection Modal Styles
  userOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
  },
  selectedUserOption: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
  },
  userAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#E0E7FF',
      alignItems: 'center',
      justifyContent: 'center',
  },
  userAvatarText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.primary,
  },
  userOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.text.primary,
  },
  userOptionEmail: {
      fontSize: 12,
      color: COLORS.text.secondary,
      marginTop: 2,
  },
});
