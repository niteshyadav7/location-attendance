import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { moneyService } from '../services/money.service';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  ArrowLeft, Mail, MapPin, Smartphone, Calendar, Clock, Briefcase, 
  LogOut, LogIn, Shield, Wallet, TrendingUp, Activity, DollarSign,
  Table, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import './UserDetails.css';

const UserDetails = ({ user: currentUser }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAttendanceId, setCurrentAttendanceId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationName, setLocationName] = useState('Not Assigned');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [attendanceFilter, setAttendanceFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH, CUSTOM
  const [customAttendanceStart, setCustomAttendanceStart] = useState(null);
  const [customAttendanceEnd, setCustomAttendanceEnd] = useState(null);
  const [attendanceView, setAttendanceView] = useState('table'); // table, bar, line
  const [moneyFilter, setMoneyFilter] = useState('ALL'); // ALL, APPROVED, PENDING, REJECTED
  const [moneyDateFilter, setMoneyDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH, CUSTOM
  const [customMoneyStart, setCustomMoneyStart] = useState(null);
  const [customMoneyEnd, setCustomMoneyEnd] = useState(null);
  const [moneyView, setMoneyView] = useState('table'); // table, bar, pie
  const [moneyRequests, setMoneyRequests] = useState([]);
  const [moneyStats, setMoneyStats] = useState({
    totalRequested: 0,
    totalApproved: 0,
    totalPending: 0,
    totalRejected: 0
  });
  const [stats, setStats] = useState({
    totalDays: 0,
    totalHours: 0,
    avgHours: 0,
    presentDays: 0
  });

  const fetchUserDetails = React.useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.error('User not found');
        return;
      }

      const userData = { uid: userId, ...userDoc.data() };
      setUser(userData);

      // Fetch location name if assigned
      let fetchedLocationName = 'Not Assigned';
      if (userData.assignedLocationId) {
        const locationDoc = await getDoc(doc(db, 'locations', userData.assignedLocationId));
        if (locationDoc.exists()) {
          fetchedLocationName = locationDoc.data()?.name || 'Unknown Location';
        }
      }
      setLocationName(fetchedLocationName);

      // Fetch attendance records with organizationId filter (like mobile app)
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('userId', '==', userId),
        where('organizationId', '==', userData.organizationId)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceData = attendanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort client-side to avoid index requirement
      attendanceData.sort((a, b) => b.checkInTime - a.checkInTime);
      
      setAttendance(attendanceData);

      // Calculate stats locally
      let totalMinutes = 0;
      let presentDays = 0;
      attendanceData.forEach(record => {
        if (record.checkOutTime) {
          presentDays++;
          const duration = (record.checkOutTime - record.checkInTime) / (1000 * 60);
          totalMinutes += duration;
        }
      });
      const totalHours = Math.floor(totalMinutes / 60);
      const avgHours = presentDays > 0 ? (totalMinutes / presentDays / 60).toFixed(1) : 0;
      setStats({
        totalDays: attendanceData.length,
        totalHours,
        avgHours,
        presentDays
      });

      // Find most recent unchecked-out attendance (like mobile app)
      let mostRecentUncheckedOut = null;
      let mostRecentTime = 0;
      
      attendanceSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.checkOutTime && data.checkInTime > mostRecentTime) {
          mostRecentUncheckedOut = docSnap.id;
          mostRecentTime = data.checkInTime;
        }
      });
      
      if (mostRecentUncheckedOut) {
        setCurrentAttendanceId(mostRecentUncheckedOut);
      } else {
        setCurrentAttendanceId(null);
      }

      // Fetch money requests with organizationId filter
      const moneyData = await moneyService.getMoneyRequests(userData.organizationId, { userId });
      setMoneyRequests(moneyData);
      
      // Calculate money stats
      const totalRequested = moneyData.reduce((sum, req) => sum + req.amount, 0);
      const totalApproved = moneyData
        .filter(req => req.status === 'APPROVED')
        .reduce((sum, req) => sum + req.amount, 0);
      const totalPending = moneyData
        .filter(req => req.status === 'PENDING')
        .reduce((sum, req) => sum + req.amount, 0);
      const totalRejected = moneyData
        .filter(req => req.status === 'REJECTED')
        .reduce((sum, req) => sum + req.amount, 0);
      
      setMoneyStats({
        totalRequested,
        totalApproved,
        totalPending,
        totalRejected
      });

    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to load user details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const handleCheckout = async () => {
    if (!currentAttendanceId || !user) return;

    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Checkout User',
      message: `Are you sure you want to checkout ${user.name}? This will end their current work session.`,
      onConfirm: async () => {
        try {
          setActionLoading(true);
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

          alert(`✅ ${user.name} has been checked out successfully`);
          await fetchUserDetails();
        } catch (error) {
          console.error('Error checking out user:', error);
          alert('❌ Failed to checkout user. Please try again.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleCheckin = async () => {
    if (!user) return;

    setConfirmDialog({
      isOpen: true,
      type: 'success',
      title: 'Check-in User',
      message: `Are you sure you want to check-in ${user.name}? This will create a new attendance record for today.`,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const now = Date.now();
          const today = new Date().toISOString().split('T')[0];

          // Check if there's already an attendance record for today
          const todayAttendanceQuery = query(
            collection(db, 'attendance'),
            where('userId', '==', userId),
            where('date', '==', today)
          );
          const todaySnapshot = await getDocs(todayAttendanceQuery);

          let attendanceId;

          if (!todaySnapshot.empty) {
            // Update existing record
            const existingDoc = todaySnapshot.docs[0];
            await updateDoc(doc(db, 'attendance', existingDoc.id), {
              checkOutTime: null,
              status: 'PRESENT',
            });
            attendanceId = existingDoc.id;
          } else {
            // Create new attendance record
            const newAttendanceRef = await addDoc(collection(db, 'attendance'), {
              userId: user.uid,
              userName: user.name,
              organizationId: user.organizationId,
              locationId: user.assignedLocationId || '',
              date: today,
              checkInTime: now,
              breaks: [],
              status: 'PRESENT',
            });
            attendanceId = newAttendanceRef.id;
          }

          // Update user status
          await updateDoc(doc(db, 'users', userId), {
            currentStatus: 'WORKING',
            lastActive: now,
          });

          // Create notification
          await addDoc(collection(db, 'notifications'), {
            type: 'CHECK_IN',
            userId: user.uid,
            userName: user.name,
            organizationId: user.organizationId,
            message: `${user.name} was checked in by admin`,
            timestamp: now,
            read: false,
          });

          setCurrentAttendanceId(attendanceId);
          alert(`✅ ${user.name} has been checked in successfully`);
          await fetchUserDetails();
        } catch (error) {
          console.error('Error checking in user:', error);
          alert('❌ Failed to check-in user. Please try again.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleDeviceReset = async () => {
    if (!user) return;

    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: user.deviceResetRequested ? 'Approve Device Reset' : 'Unlink Device',
      message: user.deviceResetRequested 
        ? `${user.name} has requested a device reset. Approving will allow them to login from a new device.`
        : `Are you sure you want to unlink ${user.name}'s device? They will be able to login from a new device.`,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          
          await updateDoc(doc(db, 'users', userId), {
            registeredDeviceId: null,
            deviceResetRequested: false,
            deviceResetRequestDate: null
          });

          alert('✅ Device lock reset successfully. The user can now login from a new device.');
          await fetchUserDetails();
        } catch (error) {
          console.error('Error resetting device lock:', error);
          alert('❌ Failed to reset device lock. Please try again.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleFingerprintReset = async () => {
    if (!user) return;

    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Delete Fingerprint Template',
      message: `Are you sure you want to delete the registered fingerprint template for ${user.name}? This will prevent them from checking in at the kiosk until they re-enroll on the mobile app.`,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          
          await updateDoc(doc(db, 'users', userId), {
            fingerprintTemplate: null
          });

          alert('✅ Fingerprint template deleted successfully.');
          await fetchUserDetails();
        } catch (error) {
          console.error('Error deleting fingerprint template:', error);
          alert('❌ Failed to delete fingerprint template. Please try again.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'WORKING': return '#10b981';
      case 'ON_BREAK': return '#f59e0b';
      case 'CHECKED_OUT': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'WORKING': return 'Working';
      case 'ON_BREAK': return 'On Break';
      case 'CHECKED_OUT': return 'Checked Out';
      default: return 'Offline';
    }
  };

  const calculateWorkingHours = (record) => {
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

  // Filter attendance by date range
  const filteredAttendance = useMemo(() => {
    if (attendanceFilter === 'ALL') return attendance;

    const now = new Date();
    let startDate, endDate;

    if (attendanceFilter === 'CUSTOM') {
      if (!customAttendanceStart || !customAttendanceEnd) return attendance;
      startDate = startOfDay(customAttendanceStart).getTime();
      endDate = endOfDay(customAttendanceEnd).getTime();
    } else {
      switch (attendanceFilter) {
        case 'TODAY':
          startDate = startOfDay(now).getTime();
          endDate = endOfDay(now).getTime();
          break;
        case 'WEEK':
          startDate = startOfWeek(now).getTime();
          endDate = endOfWeek(now).getTime();
          break;
        case 'MONTH':
          startDate = startOfMonth(now).getTime();
          endDate = endOfMonth(now).getTime();
          break;
        default:
          return attendance;
      }
    }

    return attendance.filter(record => {
      const checkInTime = record.checkInTime;
      return checkInTime >= startDate && checkInTime <= endDate;
    });
  }, [attendance, attendanceFilter, customAttendanceStart, customAttendanceEnd]);

  // Prepare chart data
  const chartData = filteredAttendance.slice(0, 7).reverse().map(record => ({
    date: format(new Date(record.checkInTime), 'MMM dd'),
    hours: record.checkOutTime 
      ? ((record.checkOutTime - record.checkInTime) / (1000 * 60 * 60)).toFixed(1)
      : 0
  }));

  // Filter money requests
  const filteredMoneyRequests = useMemo(() => {
    let result = moneyRequests;

    // Filter by Status
    if (moneyFilter !== 'ALL') {
      result = result.filter(req => req.status === moneyFilter);
    }

    // Filter by Date
    if (moneyDateFilter !== 'ALL') {
      const now = new Date();
      let startDate, endDate;

      if (moneyDateFilter === 'CUSTOM') {
        if (customMoneyStart && customMoneyEnd) {
          startDate = startOfDay(customMoneyStart).getTime();
          endDate = endOfDay(customMoneyEnd).getTime();
        }
      } else {
        switch (moneyDateFilter) {
          case 'TODAY':
            startDate = startOfDay(now).getTime();
            endDate = endOfDay(now).getTime();
            break;
          case 'WEEK':
            startDate = startOfWeek(now).getTime();
            endDate = endOfWeek(now).getTime();
            break;
          case 'MONTH':
            startDate = startOfMonth(now).getTime();
            endDate = endOfMonth(now).getTime();
            break;
          default:
            break;
        }
      }

      if (startDate && endDate) {
        result = result.filter(req => {
          const reqDate = new Date(req.requestDate).getTime();
          return reqDate >= startDate && reqDate <= endDate;
        });
      }
    }

    return result;
  }, [moneyRequests, moneyFilter, moneyDateFilter, customMoneyStart, customMoneyEnd]);

  // Calculate Filtered Stats for Cards & Charts
  const filteredMoneyStats = useMemo(() => {
    const totalRequested = filteredMoneyRequests.reduce((sum, req) => sum + req.amount, 0);
    const totalApproved = filteredMoneyRequests
      .filter(req => req.status === 'APPROVED')
      .reduce((sum, req) => sum + req.amount, 0);
    const totalPending = filteredMoneyRequests
      .filter(req => req.status === 'PENDING')
      .reduce((sum, req) => sum + req.amount, 0);
    const totalRejected = filteredMoneyRequests
      .filter(req => req.status === 'REJECTED')
      .reduce((sum, req) => sum + req.amount, 0);
    
    return {
      totalRequested,
      totalApproved,
      totalPending,
      totalRejected
    };
  }, [filteredMoneyRequests]);

  // Prepare Money Pie Chart Data
  const moneyPieData = useMemo(() => {
    const data = [
      { name: 'Approved', value: filteredMoneyStats.totalApproved, color: '#10b981' },
      { name: 'Pending', value: filteredMoneyStats.totalPending, color: '#f59e0b' },
      { name: 'Rejected', value: filteredMoneyStats.totalRejected, color: '#ef4444' }
    ];
    return data.filter(item => item.value > 0);
  }, [filteredMoneyStats]);

  // Prepare Money Bar Chart Data
  const moneyBarData = useMemo(() => {
    return filteredMoneyRequests.slice(0, 10).reverse().map(req => ({
      date: format(new Date(req.requestDate), 'MMM dd'),
      amount: req.amount,
      status: req.status
    }));
  }, [filteredMoneyRequests]);

  if (loading) {
    return <div className="user-details-loading">Loading...</div>;
  }

  if (!user) {
    return <div className="user-details-error">User not found</div>;
  }

  const canCheckout = user.currentStatus === 'WORKING' || user.currentStatus === 'ON_BREAK';
  const canCheckin = user.currentStatus === 'CHECKED_OUT' || !user.currentStatus || user.currentStatus === 'OFFLINE';

  return (
    <div className="user-details-page">
      {/* Header */}
      <div className="user-details-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
      </div>

      {/* User Profile Card */}
      <div className="user-profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          
          <div className="profile-info">
            <h1>{user.name}</h1>
            <p className="profile-email">
              <Mail size={16} />
              {user.email}
            </p>
            
            <div className="profile-status" style={{ backgroundColor: getStatusColor(user.currentStatus) }}>
              <span className="status-pulse"></span>
              {getStatusLabel(user.currentStatus)}
            </div>

            {user.lastActive && (
              <p className="profile-last-active">
                <Clock size={14} />
                Last active: {format(new Date(user.lastActive), 'MMM dd, yyyy h:mm a')}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="profile-actions">
            {canCheckout && (
              <button 
                className="action-button checkout" 
                onClick={handleCheckout}
                disabled={actionLoading}
              >
                <LogOut size={18} />
                {actionLoading ? 'Processing...' : 'Checkout User'}
              </button>
            )}
            {canCheckin && (
              <button 
                className="action-button checkin" 
                onClick={handleCheckin}
                disabled={actionLoading}
              >
                <LogIn size={18} />
                {actionLoading ? 'Processing...' : 'Check-in User'}
              </button>
            )}
          </div>
        </div>

        {/* User Info Grid */}
        <div className="user-info-grid">
          <div className="info-item">
            <div className="info-icon">
              <Briefcase size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">Role</span>
              <span className="info-value">
                {user.role === 'company_admin' ? 'Administrator' : 'Employee'}
              </span>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">
              <MapPin size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">Location</span>
              <span className="info-value">{locationName}</span>
            </div>
          </div>

          {user.appVersion && (
            <div className="info-item">
              <div className="info-icon">
                <Smartphone size={18} />
              </div>
              <div className="info-content">
                <span className="info-label">App Version</span>
                <span className="info-value">v{user.appVersion}</span>
              </div>
            </div>
          )}

          <div className="info-item">
            <div className="info-icon">
              <Shield size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">Device Lock</span>
              <span className={`info-badge ${user.registeredDeviceId ? 'locked' : 'unlocked'}`}>
                {user.registeredDeviceId ? 'Locked' : 'Unlocked'}
              </span>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">
              <Shield size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">Fingerprint</span>
              <span className={`info-badge ${user.fingerprintTemplate ? 'locked' : 'unlocked'}`} style={{ backgroundColor: user.fingerprintTemplate ? '#d1fae5' : '#fee2e2', color: user.fingerprintTemplate ? '#065f46' : '#991b1b' }}>
                {user.fingerprintTemplate ? 'Registered' : 'Not Registered'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {/* Device Reset Section */}
          {(user.registeredDeviceId || user.deviceResetRequested) && (
            <div className="device-reset-section" style={{ flex: 1, minWidth: '240px' }}>
              {user.deviceResetRequested && (
                <div className="reset-requested-alert">
                  <Shield size={16} />
                  <span>Device Reset Requested by User</span>
                </div>
              )}
              <button 
                className="device-reset-button" 
                onClick={handleDeviceReset}
                disabled={actionLoading}
              >
                <Shield size={18} />
                {user.deviceResetRequested ? 'Approve Device Reset' : 'Unlink Device'}
              </button>
            </div>
          )}

          {/* Fingerprint Reset Section */}
          {user.fingerprintTemplate && (
            <div className="device-reset-section" style={{ flex: 1, minWidth: '240px', background: 'linear-gradient(135deg, #fee2e2, #fecaca)', borderColor: '#fca5a5' }}>
              <div className="reset-requested-alert" style={{ background: '#fef2f2', border: '2px solid #fecaca', color: '#991b1b' }}>
                <Shield size={16} />
                <span>Biometric Profile Enrolled</span>
              </div>
              <button 
                className="device-reset-button" 
                onClick={handleFingerprintReset}
                disabled={actionLoading}
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              >
                <Shield size={18} />
                Delete Fingerprint
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon working">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.presentDays}</div>
            <div className="stat-label">Present Days</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon hours">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalHours}h</div>
            <div className="stat-label">Total Hours</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon average">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.avgHours}h</div>
            <div className="stat-label">Avg Hours/Day</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon wallet">
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">₹{moneyStats.totalApproved.toLocaleString()}</div>
            <div className="stat-label">Total Approved</div>
          </div>
        </div>
      </div>

      {/* Money & Advances Section */}
      <div className="money-section">
        <div className="attendance-header">
          <h2>
            <Wallet size={20} />
            Money & Advances
          </h2>
          
          <div className="attendance-header-actions">
            <div className="view-toggle">
              <button
                className={`view-btn ${moneyView === 'table' ? 'active' : ''}`}
                onClick={() => setMoneyView('table')}
                title="Table View"
              >
                <Table size={18} />
              </button>
              <button
                className={`view-btn ${moneyView === 'bar' ? 'active' : ''}`}
                onClick={() => setMoneyView('bar')}
                title="Bar Chart"
              >
                <BarChart3 size={18} />
              </button>
              <button
                className={`view-btn ${moneyView === 'pie' ? 'active' : ''}`}
                onClick={() => setMoneyView('pie')}
                title="Pie Chart"
              >
                <PieChartIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Money Stats Cards */}
        <div className="money-stats-grid">
          <div className="money-stat-card requested">
            <div className="money-stat-icon">
              <DollarSign size={20} />
            </div>
            <div className="money-stat-info">
              <div className="money-stat-value">₹{filteredMoneyStats.totalRequested.toLocaleString()}</div>
              <div className="money-stat-label">Total Requested</div>
              <div className="money-stat-count">{filteredMoneyRequests.length} requests</div>
            </div>
          </div>

          <div className="money-stat-card approved">
            <div className="money-stat-icon">
              <DollarSign size={20} />
            </div>
            <div className="money-stat-info">
              <div className="money-stat-value">₹{filteredMoneyStats.totalApproved.toLocaleString()}</div>
              <div className="money-stat-label">Approved</div>
              <div className="money-stat-count">
                {filteredMoneyRequests.filter(r => r.status === 'APPROVED').length} approved
              </div>
            </div>
          </div>

          <div className="money-stat-card pending">
            <div className="money-stat-icon">
              <DollarSign size={20} />
            </div>
            <div className="money-stat-info">
              <div className="money-stat-value">₹{filteredMoneyStats.totalPending.toLocaleString()}</div>
              <div className="money-stat-label">Pending</div>
              <div className="money-stat-count">
                {filteredMoneyRequests.filter(r => r.status === 'PENDING').length} pending
              </div>
            </div>
          </div>

          <div className="money-stat-card rejected">
            <div className="money-stat-icon">
              <DollarSign size={20} />
            </div>
            <div className="money-stat-info">
              <div className="money-stat-value">₹{filteredMoneyStats.totalRejected.toLocaleString()}</div>
              <div className="money-stat-label">Rejected</div>
              <div className="money-stat-count">
                {filteredMoneyRequests.filter(r => r.status === 'REJECTED').length} rejected
              </div>
            </div>
          </div>
        </div>

        {/* Money Filters */}
        <div className="attendance-filters">
          {/* Date Filters */}
          <div className="filter-buttons-group" style={{ marginBottom: '16px' }}>
            <button
              className={`attendance-filter-btn ${moneyDateFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setMoneyDateFilter('ALL')}
            >
              All Time
            </button>
            <button
              className={`attendance-filter-btn ${moneyDateFilter === 'TODAY' ? 'active' : ''}`}
              onClick={() => setMoneyDateFilter('TODAY')}
            >
              Today
            </button>
            <button
              className={`attendance-filter-btn ${moneyDateFilter === 'WEEK' ? 'active' : ''}`}
              onClick={() => setMoneyDateFilter('WEEK')}
            >
              This Week
            </button>
            <button
              className={`attendance-filter-btn ${moneyDateFilter === 'MONTH' ? 'active' : ''}`}
              onClick={() => setMoneyDateFilter('MONTH')}
            >
              This Month
            </button>
            <button
              className={`attendance-filter-btn ${moneyDateFilter === 'CUSTOM' ? 'active' : ''}`}
              onClick={() => setMoneyDateFilter('CUSTOM')}
            >
              Custom Range
            </button>
          </div>

          {moneyDateFilter === 'CUSTOM' && (
            <div className="custom-attendance-range" style={{ marginBottom: '16px' }}>
              <div className="attendance-date-picker">
                <label>From:</label>
                <DatePicker
                  selected={customMoneyStart}
                  onChange={(date) => setCustomMoneyStart(date)}
                  selectsStart
                  startDate={customMoneyStart}
                  endDate={customMoneyEnd}
                  maxDate={new Date()}
                  dateFormat="MMM dd, yyyy"
                  placeholderText="Start Date"
                  className="attendance-date-input"
                />
              </div>
              <div className="attendance-date-picker">
                <label>To:</label>
                <DatePicker
                  selected={customMoneyEnd}
                  onChange={(date) => setCustomMoneyEnd(date)}
                  selectsEnd
                  startDate={customMoneyStart}
                  endDate={customMoneyEnd}
                  minDate={customMoneyStart}
                  maxDate={new Date()}
                  dateFormat="MMM dd, yyyy"
                  placeholderText="End Date"
                  className="attendance-date-input"
                />
              </div>
            </div>
          )}

          {/* Status Filters */}
          <div className="filter-buttons-group">
            {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map(status => (
              <button
                key={status}
                className={`attendance-filter-btn ${moneyFilter === status ? 'active' : ''}`}
                onClick={() => setMoneyFilter(status)}
              >
                {status === 'ALL' ? 'All Requests' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Money Requests Views */}
        {moneyView === 'table' && (
          <div className="money-requests-table">
            <div className="table-header">
              <div className="table-cell">Date</div>
              <div className="table-cell">Amount</div>
              <div className="table-cell">Reason</div>
              <div className="table-cell">Status</div>
              <div className="table-cell">Processed By</div>
            </div>

            {filteredMoneyRequests.map(request => (
              <div key={request.id} className="table-row">
                <div className="table-cell">
                  <strong>{format(new Date(request.requestDate), 'MMM dd, yyyy')}</strong>
                  <br />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {format(new Date(request.requestDate), 'h:mm a')}
                  </span>
                </div>
                <div className="table-cell">
                  <span className="amount-badge">₹{request.amount.toLocaleString()}</span>
                </div>
                <div className="table-cell">
                  {request.reason || 'No reason provided'}
                </div>
                <div className="table-cell">
                  <span 
                    className={`status-badge-small ${request.status.toLowerCase()}`}
                    style={{ 
                      backgroundColor: 
                        request.status === 'APPROVED' ? '#10b981' : 
                        request.status === 'PENDING' ? '#f59e0b' : 
                        '#ef4444'
                    }}
                  >
                    {request.status}
                  </span>
                </div>
                <div className="table-cell">
                  {request.processedBy || '-'}
                </div>
              </div>
            ))}

            {filteredMoneyRequests.length === 0 && (
              <div className="no-data">No money requests found matching filters</div>
            )}
          </div>
        )}

        {moneyView === 'bar' && (
          <div className="chart-view">
            {moneyBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={moneyBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '13px', fontWeight: '600' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '13px', fontWeight: '600' }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '2px solid #e5e7eb', 
                      borderRadius: '12px',
                      fontWeight: '600'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontWeight: '700' }} />
                  <Bar dataKey="amount" name="Amount (₹)" radius={[8, 8, 0, 0]}>
                    {moneyBarData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.status === 'APPROVED' ? '#10b981' : 
                          entry.status === 'PENDING' ? '#f59e0b' : 
                          '#ef4444'
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data to display</div>
            )}
          </div>
        )}

        {moneyView === 'pie' && (
          <div className="chart-view">
            {moneyPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={moneyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {moneyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data to display</div>
            )}
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>
            <Activity size={20} />
            Working Hours Trend (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" fill="#6366f1" name="Hours Worked" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance History */}
      <div className="attendance-history">
        <div className="attendance-header">
          <h2>
            <Calendar size={20} />
            Attendance History
          </h2>
          <div className="attendance-header-actions">
            <span className="attendance-count">
              {filteredAttendance.length} {filteredAttendance.length === 1 ? 'record' : 'records'}
            </span>
            
            {/* View Toggle */}
            <div className="view-toggle">
              <button
                className={`view-btn ${attendanceView === 'table' ? 'active' : ''}`}
                onClick={() => setAttendanceView('table')}
                title="Table View"
              >
                <Table size={18} />
              </button>
              <button
                className={`view-btn ${attendanceView === 'bar' ? 'active' : ''}`}
                onClick={() => setAttendanceView('bar')}
                title="Bar Chart"
              >
                <BarChart3 size={18} />
              </button>
              <button
                className={`view-btn ${attendanceView === 'line' ? 'active' : ''}`}
                onClick={() => setAttendanceView('line')}
                title="Line Chart"
              >
                <LineChartIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Filters */}
        <div className="attendance-filters">
          <div className="filter-buttons-group">
            <button
              className={`attendance-filter-btn ${attendanceFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setAttendanceFilter('ALL')}
            >
              All Time
            </button>
            <button
              className={`attendance-filter-btn ${attendanceFilter === 'TODAY' ? 'active' : ''}`}
              onClick={() => setAttendanceFilter('TODAY')}
            >
              Today
            </button>
            <button
              className={`attendance-filter-btn ${attendanceFilter === 'WEEK' ? 'active' : ''}`}
              onClick={() => setAttendanceFilter('WEEK')}
            >
              This Week
            </button>
            <button
              className={`attendance-filter-btn ${attendanceFilter === 'MONTH' ? 'active' : ''}`}
              onClick={() => setAttendanceFilter('MONTH')}
            >
              This Month
            </button>
            <button
              className={`attendance-filter-btn ${attendanceFilter === 'CUSTOM' ? 'active' : ''}`}
              onClick={() => setAttendanceFilter('CUSTOM')}
            >
              Custom Range
            </button>
          </div>

          {attendanceFilter === 'CUSTOM' && (
            <div className="custom-attendance-range">
              <div className="attendance-date-picker">
                <label>From:</label>
                <DatePicker
                  selected={customAttendanceStart}
                  onChange={(date) => setCustomAttendanceStart(date)}
                  selectsStart
                  startDate={customAttendanceStart}
                  endDate={customAttendanceEnd}
                  maxDate={new Date()}
                  dateFormat="MMM dd, yyyy"
                  placeholderText="Start Date"
                  className="attendance-date-input"
                />
              </div>
              <div className="attendance-date-picker">
                <label>To:</label>
                <DatePicker
                  selected={customAttendanceEnd}
                  onChange={(date) => setCustomAttendanceEnd(date)}
                  selectsEnd
                  startDate={customAttendanceStart}
                  endDate={customAttendanceEnd}
                  minDate={customAttendanceStart}
                  maxDate={new Date()}
                  dateFormat="MMM dd, yyyy"
                  placeholderText="End Date"
                  className="attendance-date-input"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Table View */}
        {attendanceView === 'table' && (
          <div className="attendance-table">
            <div className="table-header">
              <div className="table-cell">Date</div>
              <div className="table-cell">Check In</div>
              <div className="table-cell">Check Out</div>
              <div className="table-cell">Hours</div>
              <div className="table-cell">Status</div>
            </div>

            {filteredAttendance.map(record => (
              <div key={record.id} className="table-row">
                <div className="table-cell">
                  <strong>{format(new Date(record.checkInTime), 'MMM dd, yyyy')}</strong>
                </div>
                <div className="table-cell">
                  {format(new Date(record.checkInTime), 'h:mm a')}
                </div>
                <div className="table-cell">
                  {record.checkOutTime 
                    ? format(new Date(record.checkOutTime), 'h:mm a')
                    : '-'
                  }
                </div>
                <div className="table-cell">
                  <span className="hours-badge">{calculateWorkingHours(record)}</span>
                </div>
                <div className="table-cell">
                  <span 
                    className="status-badge-small" 
                    style={{ backgroundColor: record.checkOutTime ? '#10b981' : '#f59e0b' }}
                  >
                    {record.checkOutTime ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}

            {filteredAttendance.length === 0 && (
              <div className="no-data">No attendance records found for the selected period</div>
            )}
          </div>
        )}

        {/* Bar Chart View */}
        {attendanceView === 'bar' && (
          <div className="chart-view">
            {filteredAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    style={{ fontSize: '13px', fontWeight: '600' }} 
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    style={{ fontSize: '13px', fontWeight: '600' }}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontWeight: '700' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '2px solid #e5e7eb', 
                      borderRadius: '12px',
                      fontWeight: '600'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontWeight: '700' }} />
                  <Bar 
                    dataKey="hours" 
                    fill="url(#barGradient)" 
                    name="Hours Worked" 
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data to display</div>
            )}
          </div>
        )}

        {/* Line Chart View */}
        {attendanceView === 'line' && (
          <div className="chart-view">
            {filteredAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    style={{ fontSize: '13px', fontWeight: '600' }} 
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    style={{ fontSize: '13px', fontWeight: '600' }}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontWeight: '700' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '2px solid #e5e7eb', 
                      borderRadius: '12px',
                      fontWeight: '600'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontWeight: '700' }} />
                  <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorHours)" 
                    name="Hours Worked"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data to display</div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
};

export default UserDetails;
