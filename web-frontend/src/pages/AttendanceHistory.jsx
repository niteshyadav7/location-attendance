import React, { useState, useEffect, useMemo } from 'react';
import { attendanceService } from '../services/attendance.service';
import { moneyService } from '../services/money.service';
import { exportService } from '../services/export.service';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { 
  Users, Calendar, Download, Search, 
  FileText, CheckCircle, Clock, Wallet,
  X, Check, MapPin,
  LogIn, LogOut, Coffee
} from 'lucide-react';
import './AttendanceHistory.css';
import Loader from '../components/common/Loader';

const AttendanceHistory = ({ user }) => {
  const [attendance, setAttendance] = useState([]);
  const [moneyRequests, setMoneyRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dateFilter, setDateFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const usersData = await attendanceService.getUsers(user.organizationId);
      setUsers(usersData);

      // Fetch attendance
      const attendanceData = await attendanceService.getAttendanceRecords(
        user.organizationId,
        {
          userId: selectedUser?.uid,
          dateFilter,
          customStart: customStartDate,
          customEnd: customEndDate
        }
      );
      setAttendance(attendanceData);

      // Fetch money requests
      const moneyData = await moneyService.getMoneyRequests(
        user.organizationId,
        { userId: selectedUser?.uid }
      );
      setMoneyRequests(moneyData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.organizationId, selectedUser, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMoneyRequests = useMemo(() => {
    if (!moneyRequests.length) return [];
    
    // Filter by date
    let filtered = moneyRequests;
    const now = new Date();

    if (dateFilter === 'TODAY') {
      filtered = filtered.filter(req => 
        isWithinInterval(new Date(req.requestDate), { start: startOfDay(now), end: endOfDay(now) })
      );
    } else if (dateFilter === 'WEEK') {
      filtered = filtered.filter(req => 
        isWithinInterval(new Date(req.requestDate), { start: startOfWeek(now), end: endOfWeek(now) })
      );
    } else if (dateFilter === 'MONTH') {
      filtered = filtered.filter(req => 
        isWithinInterval(new Date(req.requestDate), { start: startOfMonth(now), end: endOfMonth(now) })
      );
    } else if (dateFilter === 'CUSTOM' && customStartDate && customEndDate) {
      filtered = filtered.filter(req => 
        isWithinInterval(new Date(req.requestDate), { 
          start: startOfDay(parseISO(customStartDate)), 
          end: endOfDay(parseISO(customEndDate)) 
        })
      );
    }

    // Filter by search query (user name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req => 
        req.userName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [moneyRequests, dateFilter, customStartDate, customEndDate, searchQuery]);

  const filteredAttendance = useMemo(() => {
    if (!searchQuery.trim()) return attendance;
    
    const query = searchQuery.toLowerCase();
    return attendance.filter(record =>
      record.userName?.toLowerCase().includes(query) ||
      record.locationName?.toLowerCase().includes(query)
    );
  }, [attendance, searchQuery]);

  const stats = useMemo(() => 
    attendanceService.calculateStats(filteredAttendance),
    [filteredAttendance]
  );

  const moneyStats = useMemo(() => 
    moneyService.calculateStats(filteredMoneyRequests),
    [filteredMoneyRequests]
  );

  const handleExport = () => {
    const metadata = {
      userName: selectedUser ? selectedUser.name : 'All Users',
      dateRange: dateFilter,
      totalPresent: stats.totalPresent,
      totalWorkingHours: stats.totalWorkingHours,
      totalAdvanceAmount: moneyStats.totalAmount,
      totalApprovedAmount: moneyStats.approvedAmount,
      totalPendingAmount: moneyStats.pendingAmount
    };

    exportService.exportComprehensiveReport(
      filteredAttendance.map(r => ({
        date: r.checkInTime,
        checkIn: r.checkInTime,
        checkOut: r.checkOutTime,
        duration: r.checkOutTime ? attendanceService.formatDuration(
          new Date(r.checkOutTime) - new Date(r.checkInTime)
        ) : '',
        breaksCount: r.breaks?.length || 0,
        breakTime: r.breaks ? attendanceService.formatDuration(
          r.breaks.reduce((sum, b) => sum + (b.endTime ? new Date(b.endTime) - new Date(b.startTime) : 0), 0)
        ) : '',
        status: r.status,
        location: r.locationName
      })),
      filteredMoneyRequests,
      metadata
    );
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'CHECKED_IN': return <LogIn size={14} />;
      case 'CHECKED_OUT': return <LogOut size={14} />;
      case 'ON_BREAK': return <Coffee size={14} />;
      default: return <CheckCircle size={14} />;
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="attendance-history">
      {/* Header */}
      <div className="header">
        <h1>
          <div className="header-icon-bg">
            <FileText size={28} className="text-primary" />
          </div>
          Attendance History
        </h1>
        <div className="header-actions">
          <button 
            className="icon-btn user-btn"
            onClick={() => setShowUserModal(true)}
            title="Select User"
          >
            <Users size={24} />
          </button>
          <button 
            className="icon-btn date-btn"
            onClick={() => setShowDateModal(true)}
            title="Date Range"
          >
            <Calendar size={24} />
          </button>
          <button 
            className="icon-btn export-btn"
            onClick={handleExport}
            title="Export CSV"
          >
            <Download size={24} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Records</span>
            <span className="stat-value">{stats.totalRecords}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Present Days</span>
            <span className="stat-value">{stats.totalPresent}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Working Hours</span>
            <span className="stat-value">{stats.totalWorkingHours}h</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Wallet size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Advance Requests</span>
            <span className="stat-value">₹{moneyStats?.totalAmount?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      <div className="active-filters">
        {selectedUser && (
          <div className="filter-badge">
            <Users size={14} />
            {selectedUser.name}
            <button onClick={() => setSelectedUser(null)}><X size={14} /></button>
          </div>
        )}
        {dateFilter !== 'ALL' && (
          <div className="filter-badge">
            <Calendar size={14} />
            {dateFilter}
            <button onClick={() => setDateFilter('ALL')}><X size={14} /></button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-wrapper" style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
          <Search className="search-icon" size={20} color="#94a3b8" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by employee name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="results-count">
          {filteredAttendance.length} record{filteredAttendance.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Attendance Table */}
      <div className="attendance-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Duration</th>
              <th>Breaks</th>
              <th>Status</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.map(record => (
              <tr key={record.id}>
                <td>{format(new Date(record.checkInTime), 'dd MMM yyyy')}</td>
                <td>
                  <div className="employee-cell">
                    <div className="avatar-sm">{record.userName?.charAt(0)}</div>
                    <span>{record.userName}</span>
                  </div>
                </td>
                <td>{format(new Date(record.checkInTime), 'HH:mm')}</td>
                <td>{record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '-'}</td>
                <td>
                  {record.checkOutTime ? 
                    attendanceService.formatDuration(new Date(record.checkOutTime) - new Date(record.checkInTime))
                    : '-'
                  }
                </td>
                <td>{record.breaks?.length || 0}</td>
                <td>
                  <span className={`status-badge ${record.status?.toLowerCase() || ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {getStatusIcon(record.status)}
                    {record.status?.replace('_', ' ') || 'Unknown'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                    {record.locationName ? <MapPin size={14} /> : null}
                    {record.locationName || '-'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Selection Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select User</h2>
              <button onClick={() => setShowUserModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div 
                className={`user-option ${!selectedUser ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedUser(null);
                  setShowUserModal(false);
                }}
              >
                <div className="avatar"><Users size={20} /></div>
                <span>All Users</span>
                {!selectedUser && <span className="checkmark"><CheckCircle size={20} /></span>}
              </div>
              {users.map(u => (
                <div
                  key={u.uid}
                  className={`user-option ${selectedUser?.uid === u.uid ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedUser(u);
                    setShowUserModal(false);
                  }}
                >
                  <div className="avatar">{u.name?.charAt(0)}</div>
                  <div>
                    <div className="user-name">{u.name}</div>
                    <div className="user-email">{u.email}</div>
                  </div>
                  {selectedUser?.uid === u.uid && <span className="checkmark"><CheckCircle size={20} /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Date Filter Modal */}
      {showDateModal && (
        <div className="modal-overlay" onClick={() => setShowDateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Date Range</h2>
              <button onClick={() => setShowDateModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {['ALL', 'TODAY', 'WEEK', 'MONTH', 'CUSTOM'].map(filter => (
                <div
                  key={filter}
                  className={`date-option ${dateFilter === filter ? 'selected' : ''}`}
                  onClick={() => {
                    if (filter !== 'CUSTOM') {
                      setDateFilter(filter);
                      setShowDateModal(false);
                    } else if (dateFilter !== 'CUSTOM') {
                        setDateFilter('CUSTOM');
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="icon-box">
                      <Calendar size={20} />
                    </div>
                    <span style={{ fontWeight: 600, color: dateFilter === filter ? '#0f172a' : '#64748b' }}>
                      {filter === 'ALL' ? 'All Time' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                    </span>
                  </div>
                  {dateFilter === filter && (
                    <span className="checkmark">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </div>
              ))}
              {dateFilter === 'CUSTOM' && (
                <div className="custom-date-inputs">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                  <button onClick={() => {
                    setLoading(true); // Trigger loading
                    fetchData(); // Fetch with new dates
                    setShowDateModal(false);
                  }}>Apply Range</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;
