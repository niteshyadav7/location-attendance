import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parse, differenceInDays, parseISO, format } from 'date-fns';
import { AttendanceRecord, LeaveRequest, UserProfile } from '../types';

export type DateFilterType = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

export const useAttendanceAnalytics = (user: UserProfile | null) => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const db = getFirestore();

  // Fetch Users (Admin Only)
  useEffect(() => {
    if (!user || (user.role !== 'company_admin' && user.role !== 'super_admin')) return;

    // MULTI-TENANCY: Filter users by organization for company_admin
    const constraints = [];
    if (user.role === 'company_admin' && user.organizationId) {
      constraints.push(where('organizationId', '==', user.organizationId));
    }
    // Super admin sees all users (no filter)

    const q = constraints.length > 0 
      ? query(collection(db, 'users'), ...constraints as any)
      : collection(db, 'users');

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const users: UserProfile[] = [];
        const ids = new Set<string>();
        snapshot.forEach((doc: any) => {
            const data = doc.data();
            // Ensure uid exists (fallback to doc.id)
            const userData = { ...data, uid: data.uid || doc.id } as UserProfile;
            users.push(userData);
            ids.add(userData.uid);
        });
        setValidUserIds(ids);
        // Filter to only show regular users (not admins)
        setAllUsers(users.filter(u => u.role === 'user' && u.status === 'approved')); 
      },
      (err) => console.error('Error fetching users:', err)
    );
    return () => unsubscribe();
  }, [user?.role, user?.organizationId]);

  // Fetch Attendance & Leaves
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const constraints = [];
    
    // MULTI-TENANCY: Filter by role and organization
    if (user.role === 'user') {
      // Regular users see only their own records
      constraints.push(where('userId', '==', user.uid));
    } else if (user.role === 'company_admin') {
      // Company admin sees their organization's records
      if (user.organizationId) {
        constraints.push(where('organizationId', '==', user.organizationId));
      }
      // If a specific user is selected, filter by that user
      // If a specific user is selected (single), filter by that user. Multiple users handled via client-side filter.
      if (selectedUserIds.length === 1) {
        constraints.push(where('userId', '==', selectedUserIds[0]));
      }
    } else if (user.role === 'super_admin') {
      // Super admin sees all records, or filtered by selected user(s)
      if (selectedUserIds.length === 1) {
        constraints.push(where('userId', '==', selectedUserIds[0]));
      }
    }

    // Attendance Listener
    const qAttendance = query(collection(db, 'attendance'), ...constraints as any);
    const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
        if (!snapshot) return;
        const recs: AttendanceRecord[] = [];
        snapshot.forEach((doc: any) => recs.push({ id: doc.id, ...doc.data() } as AttendanceRecord));
        // Client-side sort to avoid composite index issues
        recs.sort((a, b) => b.checkInTime - a.checkInTime);
        setRecords(recs);
        setLoading(false);
    }, (err) => {
        console.error('Attendance error', err);
        setError(err.message);
        setLoading(false);
    });

    // Leaves Listener
    const qLeaves = query(
        collection(db, 'leaves'), 
        where('status', '==', 'APPROVED'),
        ...constraints as any
    );
    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
        if (!snapshot) return;
        const leaveList: LeaveRequest[] = [];
        snapshot.forEach((doc: any) => leaveList.push({ id: doc.id, ...doc.data() } as LeaveRequest));
        setLeaves(leaveList);
    });

    return () => {
        unsubAttendance();
        unsubLeaves();
    };
  }, [user, selectedUserIds]);

  const [validUserIds, setValidUserIds] = useState<Set<string>>(new Set());

  // Derived: Filtered Records
  const filteredRecords = useMemo(() => {
    // For admins, filter out records from users who no longer exist (deleted)
    let currentRecords = records;
    if ((user?.role === 'company_admin' || user?.role === 'super_admin') && validUserIds.size > 0) {
        currentRecords = records.filter(r => validUserIds.has(r.userId));
    }

    // Explicitly filter by selected user(s)
    if (selectedUserIds.length > 0) {
        currentRecords = currentRecords.filter(r => selectedUserIds.includes(r.userId));
    }

    if (dateFilterType === 'ALL') return currentRecords;

    const now = new Date();
    let start: Date, end: Date;

    try {
        switch (dateFilterType) {
            case 'TODAY':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'WEEK':
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'MONTH':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'CUSTOM':
                if (!customStartDate || !customEndDate) return currentRecords;
                start = startOfDay(parse(customStartDate, 'yyyy-MM-dd', new Date()));
                end = endOfDay(parse(customEndDate, 'yyyy-MM-dd', new Date()));
                break;
            default:
                return currentRecords;
        }
        return currentRecords.filter(record => {
            const recordDate = new Date(record.checkInTime || (record as any).timestamp);
            return isWithinInterval(recordDate, { start, end });
        });
    } catch (e) {
        console.error("Filter error:", e);
        return [];
    }
  }, [records, dateFilterType, customStartDate, customEndDate, validUserIds, user?.role]);

  // Derived: Statistics
  const statistics = useMemo(() => {
    const totalPresent = filteredRecords.filter(r => r.status === 'CHECKED_OUT' || r.status === 'PRESENT').length;
    
    // Simplistic leave calculation for selected period
    // Ideally should intersect leave range with filter range
    const totalLeaveDays = leaves.length; 

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
        
        totalWorkingMs += record.checkOutTime - record.checkInTime - totalBreak;
      }
    });
    const totalWorkingHours = Math.floor(totalWorkingMs / (1000 * 60 * 60));
    const uniqueDates = new Set(filteredRecords.map(r => r.date));

    return { totalPresent, totalLeaveDays, totalWorkingHours, totalDaysMarked: uniqueDates.size };
  }, [filteredRecords, leaves]);

  // Derived: Chart Data
  const chartData = useMemo(() => {
    if (filteredRecords.length === 0) return null;

    const grouped = filteredRecords.reduce((acc, record) => {
        const date = format(new Date(record.checkInTime || (record as any).timestamp), 'MM/dd');
        if (!acc[date]) acc[date] = { count: 0, hours: 0 };
        
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
    return {
        labels,
        attendanceCounts: labels.map(date => grouped[date].count),
        workingHours: labels.map(date => grouped[date].hours)
    };
  }, [filteredRecords]);

  return {
    allUsers,
    filteredRecords,
    loading,
    error,
    statistics,
    chartData,
    filters: {
        selectedUserIds,
        setSelectedUserIds,
        dateFilterType,
        setDateFilterType,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate
    }
  };
};
