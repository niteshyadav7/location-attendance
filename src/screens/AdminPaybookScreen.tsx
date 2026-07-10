import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../constants/theme';
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { UserProfile, AttendanceRecord, MoneyRequest, MonthlyPaybook, PaybookAdjustment } from '../types';

export const AdminPaybookScreen = ({ navigation }: any) => {
  const currentOrg = useAuthStore((state) => state.organization);
  const currentUser = useAuthStore((state) => state.user);

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [payrollData, setPayrollData] = useState<Record<string, {
    presentDays: number;
    workingHours: number;
    advances: number;
    adjustments: PaybookAdjustment[];
    status: 'PENDING' | 'APPROVED' | 'PAID';
    docExists: boolean;
  }>>({});

  // Adjustment Modal States
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [adjType, setAdjType] = useState<'bonus' | 'deduction'>('bonus');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const monthStr = format(selectedMonth, 'yyyy-MM');

  const fetchPayrollRoster = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);
    try {
      const db = firestore();
      const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      // 1. Fetch all datasets concurrently to avoid N+1 query bottlenecks and composite index requirements
      const [employeesSnap, attendanceSnap, advancesSnap, paybooksSnap] = await Promise.all([
        // A. Get all employee profiles in the organization
        db.collection('users')
          .where('organizationId', '==', currentOrg.id)
          .where('role', '==', 'user')
          .get(),

        // B. Get all attendance logs for the organization (filtered by date range client-side)
        db.collection('attendance')
          .where('organizationId', '==', currentOrg.id)
          .get(),

        // C. Get all approved money requests for the organization in the selected month
        db.collection('money_requests')
          .where('organizationId', '==', currentOrg.id)
          .where('monthStr', '==', monthStr)
          .where('status', '==', 'APPROVED')
          .get(),

        // D. Get all existing paybooks for the organization in the selected month
        db.collection('paybooks')
          .where('organizationId', '==', currentOrg.id)
          .where('monthStr', '==', monthStr)
          .get(),
      ]);

      // 2. Parse staff list
      const staffList: UserProfile[] = [];
      employeesSnap.forEach((docSnap) => {
        staffList.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      setEmployees(staffList);

      // 3. Map attendance logs by userId (filtered by month start/end client-side)
      const attendanceMap: Record<string, AttendanceRecord[]> = {};
      attendanceSnap.forEach((docSnap) => {
        const rec = docSnap.data() as AttendanceRecord;
        if (rec.date && rec.date >= monthStart && rec.date <= monthEnd && rec.userId) {
          if (!attendanceMap[rec.userId]) {
            attendanceMap[rec.userId] = [];
          }
          attendanceMap[rec.userId].push(rec);
        }
      });

      // 4. Map advances total by userId
      const advancesMap: Record<string, number> = {};
      advancesSnap.forEach((docSnap) => {
        const req = docSnap.data() as MoneyRequest;
        if (req.userId) {
          advancesMap[req.userId] = (advancesMap[req.userId] || 0) + (req.amount || 0);
        }
      });

      // 5. Map paybooks by userId
      const paybooksMap: Record<string, MonthlyPaybook> = {};
      paybooksSnap.forEach((docSnap) => {
        const pb = docSnap.data() as MonthlyPaybook;
        if (pb.userId) {
          paybooksMap[pb.userId] = pb;
        }
      });

      // 6. Compute payroll roster instantly from memory
      const computedData: typeof payrollData = {};

      for (const staff of staffList) {
        // A. Calculate attendance
        const staffAttendance = attendanceMap[staff.uid] || [];
        let presentDays = 0;
        let totalHours = 0;

        staffAttendance.forEach((rec) => {
          if (rec.status === 'CHECKED_OUT' || rec.status === 'PRESENT') {
            presentDays++;
            if (rec.checkInTime && rec.checkOutTime) {
              let duration = (rec.checkOutTime - rec.checkInTime) / (1000 * 60 * 60);
              let breakHours = 0;
              (rec.breaks || []).forEach((b) => {
                if (b.endTime && b.startTime) {
                  breakHours += (b.endTime - b.startTime) / (1000 * 60 * 60);
                }
              });
              totalHours += Math.max(0, duration - breakHours);
            } else if (rec.fixedHours) {
              totalHours += rec.fixedHours;
            }
          }
        });

        // B. Retrieve advances
        const advancesTotal = advancesMap[staff.uid] || 0;

        // C. Retrieve existing paybook
        const pb = paybooksMap[staff.uid];
        const adjustments = pb?.adjustments || [];
        const status = pb?.status || 'PENDING';
        const docExists = !!pb;

        computedData[staff.uid] = {
          presentDays,
          workingHours: Math.round(totalHours * 10) / 10,
          advances: advancesTotal,
          adjustments,
          status,
          docExists,
        };
      }

      setPayrollData(computedData);
    } catch (error) {
      console.error('Error fetching payroll records:', error);
      Alert.alert('Error', 'Failed to load payroll roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollRoster();
  }, [selectedMonth, currentOrg?.id]);

  const handlePrevMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  const openAdjustmentModal = (userId: string, type: 'bonus' | 'deduction') => {
    setTargetUserId(userId);
    setAdjType(type);
    setAdjAmount('');
    setAdjReason('');
    setAdjustmentModalVisible(true);
  };

  const handleSaveAdjustment = async () => {
    if (!targetUserId || !currentOrg?.id || !currentUser?.uid) return;
    const amountNum = parseFloat(adjAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!adjReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a description for this adjustment.');
      return;
    }

    setSavingAdjustment(true);
    try {
      const db = firestore();
      const paybookId = `${targetUserId}_${monthStr}`;
      const paybookRef = db.collection('paybooks').doc(paybookId);

      const newAdj: PaybookAdjustment = {
        id: Math.random().toString(36).substring(7),
        amount: amountNum,
        type: adjType,
        reason: adjReason.trim(),
        timestamp: Date.now(),
        createdBy: currentUser.name || 'Admin',
      };

      const staffData = employees.find(e => e.uid === targetUserId);
      const computed = payrollData[targetUserId] || { presentDays: 0, workingHours: 0, advances: 0, adjustments: [], status: 'PENDING', docExists: false };
      
      const currentSalaryType = staffData?.salaryType || 'daily';
      const rate = staffData?.salaryRate || 0;
      
      let baseSalary = 0;
      if (currentSalaryType === 'daily') {
        baseSalary = computed.presentDays * rate;
      } else if (currentSalaryType === 'monthly') {
        baseSalary = rate;
      } else if (currentSalaryType === 'hourly') {
        baseSalary = computed.workingHours * rate;
      }

      const updatedAdjustments = [...computed.adjustments, newAdj];

      // Recalculate net payout
      let adjustmentsTotal = 0;
      updatedAdjustments.forEach(a => {
        if (a.type === 'bonus') adjustmentsTotal += a.amount;
        else adjustmentsTotal -= a.amount;
      });

      const netPayout = Math.max(0, baseSalary + adjustmentsTotal - computed.advances);

      await paybookRef.set({
        id: paybookId,
        userId: targetUserId,
        userName: staffData?.name || 'Staff',
        organizationId: currentOrg.id,
        monthStr,
        baseSalary,
        earnedSalary: baseSalary,
        advancesDeducted: computed.advances,
        adjustments: updatedAdjustments,
        netPayout,
        status: computed.status,
        updatedAt: Date.now(),
      }, { merge: true });

      setAdjustmentModalVisible(false);
      Alert.alert('Success', 'Adjustment recorded successfully.');
      fetchPayrollRoster();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save adjustment: ' + error.message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'PAID' | 'APPROVED') => {
    if (!currentOrg?.id) return;
    
    const staffData = employees.find(e => e.uid === userId);
    const computed = payrollData[userId];
    if (!computed) return;

    Alert.alert(
      newStatus === 'PAID' ? 'Confirm Payment' : 'Approve Paybook',
      `Are you sure you want to mark Ramesh Kumar's salary as ${newStatus} for ${format(selectedMonth, 'MMMM yyyy')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const db = firestore();
              const paybookId = `${userId}_${monthStr}`;
              const paybookRef = db.collection('paybooks').doc(paybookId);

              const rate = staffData?.salaryRate || 0;
              const currentSalaryType = staffData?.salaryType || 'daily';
              let baseSalary = 0;
              if (currentSalaryType === 'daily') {
                baseSalary = computed.presentDays * rate;
              } else if (currentSalaryType === 'monthly') {
                baseSalary = rate;
              } else if (currentSalaryType === 'hourly') {
                baseSalary = computed.workingHours * rate;
              }

              let adjustmentsTotal = 0;
              computed.adjustments.forEach(a => {
                if (a.type === 'bonus') adjustmentsTotal += a.amount;
                else adjustmentsTotal -= a.amount;
              });

              const netPayout = Math.max(0, baseSalary + adjustmentsTotal - computed.advances);

              await paybookRef.set({
                id: paybookId,
                userId: userId,
                userName: staffData?.name || 'Staff',
                organizationId: currentOrg.id,
                monthStr,
                baseSalary,
                earnedSalary: baseSalary,
                advancesDeducted: computed.advances,
                adjustments: computed.adjustments,
                netPayout,
                status: newStatus,
                updatedAt: Date.now(),
              }, { merge: true });

              Alert.alert('Success', `Paybook updated to ${newStatus}`);
              fetchPayrollRoster();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleShareReport = () => {
    // Sprint D helper: WhatsApp CSV report sharing
    let report = `📊 *ATTENDANCE & PAYROLL REPORT (${format(selectedMonth, 'MMMM yyyy').toUpperCase()})*\n`;
    report += `🏪 *Store:* ${currentOrg?.name || 'My Store'}\n`;
    report += `-------------------------------------\n\n`;

    employees.forEach((emp, index) => {
      const stats = payrollData[emp.uid];
      if (!stats) return;

      const rate = emp.salaryRate || 0;
      const type = emp.salaryType || 'daily';
      let earned = 0;
      if (type === 'daily') earned = stats.presentDays * rate;
      else if (type === 'monthly') earned = rate;
      else if (type === 'hourly') earned = stats.workingHours * rate;

      let adjVal = 0;
      stats.adjustments.forEach(a => {
        if (a.type === 'bonus') adjVal += a.amount;
        else adjVal -= a.amount;
      });

      const net = Math.max(0, earned + adjVal - stats.advances);

      report += `${index + 1}. *${emp.name}* (${type === 'daily' ? 'Daily Waged' : type === 'monthly' ? 'Monthly' : 'Hourly'})\n`;
      report += `   📍 Present: *${stats.presentDays} days* (${stats.workingHours}h)\n`;
      report += `   💼 Base Earned: ₹${earned}\n`;
      if (stats.advances > 0) report += `   💸 Advances Taken: ₹${stats.advances}\n`;
      if (adjVal !== 0) report += `   ⚖️ Adjustments: ${adjVal > 0 ? '+' : ''}₹${adjVal}\n`;
      report += `   🪙 *Net Payable: ₹${net}* [Status: *${stats.status}*]\n\n`;
    });

    report += `-------------------------------------\n`;
    report += `_Generated via Location Attendance App_`;

    const shareUrl = `whatsapp://send?text=${encodeURIComponent(report)}`;
    
    // Open in WhatsApp
    const { Linking } = require('react-native');
    Linking.canOpenURL(shareUrl).then((supported: boolean) => {
      if (supported) {
        Linking.openURL(shareUrl);
      } else {
        // Fallback using RN share standard
        const { Share } = require('react-native');
        Share.share({ message: report });
      }
    }).catch(() => {
      const { Share } = require('react-native');
      Share.share({ message: report });
    });
  };

  const renderEmployeeCard = ({ item: staff }: { item: UserProfile }) => {
    const stats = payrollData[staff.uid] || {
      presentDays: 0,
      workingHours: 0,
      advances: 0,
      adjustments: [],
      status: 'PENDING',
    };

    const rate = staff.salaryRate || 0;
    const type = staff.salaryType || 'daily';

    let earned = 0;
    if (type === 'daily') {
      earned = stats.presentDays * rate;
    } else if (type === 'monthly') {
      earned = rate;
    } else if (type === 'hourly') {
      earned = stats.workingHours * rate;
    }

    let adjustmentTotal = 0;
    stats.adjustments.forEach(a => {
      if (a.type === 'bonus') adjustmentTotal += a.amount;
      else adjustmentTotal -= a.amount;
    });

    const netPayout = Math.max(0, earned + adjustmentTotal - stats.advances);

    return (
      <View style={styles.employeeCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.staffName}>{staff.name}</Text>
            <Text style={styles.staffEmail}>{staff.email}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: stats.status === 'PAID' ? '#d1fae5' : stats.status === 'APPROVED' ? '#dbeafe' : '#fef3c7' }
          ]}>
            <Text style={[
              styles.statusBadgeText,
              { color: stats.status === 'PAID' ? '#059669' : stats.status === 'APPROVED' ? '#2563eb' : '#d97706' }
            ]}>
              {stats.status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Calculation Table */}
        <View style={styles.ledgerTable}>
          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>Attendance Log</Text>
            <Text style={styles.ledgerValue}>{stats.presentDays} days ({stats.workingHours} hrs)</Text>
          </View>
          
          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>Wage Structure</Text>
            <Text style={styles.ledgerValue}>₹{rate} / {type === 'daily' ? 'day' : type === 'monthly' ? 'month' : 'hr'}</Text>
          </View>

          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>Calculated Gross</Text>
            <Text style={styles.ledgerValue}>₹{earned}</Text>
          </View>

          {stats.advances > 0 && (
            <View style={styles.ledgerRow}>
              <Text style={[styles.ledgerLabel, { color: '#ef4444' }]}>Approved Advances (-)</Text>
              <Text style={[styles.ledgerValue, { color: '#ef4444' }]}>₹{stats.advances}</Text>
            </View>
          )}

          {stats.adjustments.map((a) => (
            <View key={a.id} style={styles.ledgerRow}>
              <Text style={[styles.ledgerLabel, { color: a.type === 'bonus' ? '#059669' : '#d97706' }]}>
                {a.type === 'bonus' ? '🎁 Bonus' : '⚠️ Deduction'} ({a.reason})
              </Text>
              <Text style={[styles.ledgerValue, { color: a.type === 'bonus' ? '#059669' : '#d97706' }]}>
                {a.type === 'bonus' ? '+' : '-'}₹{a.amount}
              </Text>
            </View>
          ))}

          <View style={[styles.ledgerRow, styles.netRow]}>
            <Text style={styles.netLabel}>Net Payable Balance</Text>
            <Text style={styles.netValue}>₹{netPayout}</Text>
          </View>
        </View>

        {/* Actions Button Row */}
        {stats.status !== 'PAID' && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.smallActionButton, { backgroundColor: '#e0f2fe' }]}
              onPress={() => openAdjustmentModal(staff.uid, 'bonus')}
            >
              <Icon name="gift-outline" size={14} color="#0369a1" />
              <Text style={[styles.smallActionText, { color: '#0369a1' }]}>Add Bonus</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.smallActionButton, { backgroundColor: '#fee2e2' }]}
              onPress={() => openAdjustmentModal(staff.uid, 'deduction')}
            >
              <Icon name="warning-outline" size={14} color="#b91c1c" />
              <Text style={[styles.smallActionText, { color: '#b91c1c' }]}>Deduct</Text>
            </TouchableOpacity>

            {stats.status === 'PENDING' ? (
              <TouchableOpacity 
                style={[styles.smallActionButton, { backgroundColor: '#e0e7ff', flex: 1.5 }]}
                onPress={() => handleUpdateStatus(staff.uid, 'APPROVED')}
              >
                <Icon name="checkmark-circle-outline" size={14} color="#4338ca" />
                <Text style={[styles.smallActionText, { color: '#4338ca' }]}>Approve</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.smallActionButton, { backgroundColor: COLORS.status.working, flex: 1.5 }]}
                onPress={() => handleUpdateStatus(staff.uid, 'PAID')}
              >
                <Icon name="cash-outline" size={14} color="#fff" />
                <Text style={[styles.smallActionText, { color: '#fff' }]}>Mark as Paid</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Month Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={navigation.goBack} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.chevron}>
            <Icon name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{format(selectedMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.chevron}>
            <Icon name="chevron-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleShareReport} style={styles.shareBtn}>
          <Icon name="logo-whatsapp" size={24} color="#25D366" />
        </TouchableOpacity>
      </View>

      {/* Main Roster List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.text.secondary }}>Calculating monthly ledger...</Text>
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="people-outline" size={60} color={COLORS.text.light} />
          <Text style={styles.emptyText}>No employee profiles found in this organization.</Text>
          <Text style={styles.emptySubtext}>Define staff roles inside user settings.</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployeeCard}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Manual Adjustments Entry Modal */}
      <Modal
        visible={adjustmentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAdjustmentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {adjType === 'bonus' ? '🎁 Add Festive/Performance Bonus' : '⚠️ Record Wage Deduction'}
              </Text>
              <TouchableOpacity onPress={() => setAdjustmentModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 15, marginTop: 15 }}>
              <View>
                <Text style={styles.inputLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter amount in ₹"
                  keyboardType="numeric"
                  value={adjAmount}
                  onChangeText={setAdjAmount}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Reason / Notes</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder={adjType === 'bonus' ? 'e.g. Diwali Bonus, Overtime reward' : 'e.g. Break limit overruns, Late check-in penalty'}
                  multiline={true}
                  value={adjReason}
                  onChangeText={setAdjReason}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: adjType === 'bonus' ? COLORS.primary : '#ef4444' }]}
                onPress={handleSaveAdjustment}
                disabled={savingAdjustment}
              >
                {savingAdjustment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Record Adjustment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: COLORS.white,
  },
  backBtn: {
    padding: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chevron: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  shareBtn: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 5,
  },
  employeeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  staffEmail: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  ledgerTable: {
    gap: 8,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerLabel: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  ledgerValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  netRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  netValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 15,
  },
  smallActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
    height: 34,
    borderRadius: 6,
  },
  smallActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text.primary,
    backgroundColor: '#f8fafc',
  },
  saveBtn: {
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
