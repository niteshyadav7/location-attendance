import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../services/attendance.service';

import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  Search, X, Calendar, RefreshCw
} from 'lucide-react';
import './Dashboard.css';

// Imported Components
import StatsCards from '../components/dashboard/StatsCards';
import UserList from '../components/dashboard/UserList';
import DashboardCharts from '../components/dashboard/DashboardCharts';

import Loader from '../components/common/Loader';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [attendanceData, usersData] = await Promise.all([
        attendanceService.getAttendanceRecords(user.organizationId),
        attendanceService.getUsers(user.organizationId)
      ]);

      setAttendance(attendanceData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.organizationId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Filter users by date
  const filteredUsersByDate = useMemo(() => {
    if (dateFilter === 'ALL') return users;
    
    const now = new Date();
    let startDate, endDate;

    if (dateFilter === 'CUSTOM') {
      if (!customStartDate || !customEndDate) return users;
      startDate = startOfDay(customStartDate);
      endDate = endOfDay(customEndDate);
    } else {
      switch (dateFilter) {
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
        default:
          return users;
      }
    }

    return users.filter(u => {
      if (!u.lastActive) return false;
      const lastActive = new Date(u.lastActive);
      return lastActive >= startDate && lastActive <= endDate;
    });
  }, [users, dateFilter, customStartDate, customEndDate]);

  // Calculate user stats
  const stats = useMemo(() => {
    const working = filteredUsersByDate.filter(u => u.currentStatus === 'WORKING').length;
    const onBreak = filteredUsersByDate.filter(u => u.currentStatus === 'ON_BREAK').length;
    const checkedOut = filteredUsersByDate.filter(u => u.currentStatus === 'CHECKED_OUT').length;
    const offline = filteredUsersByDate.filter(u => !u.currentStatus || u.currentStatus === 'OFFLINE').length;
    
    return { working, onBreak, checkedOut, offline };
  }, [filteredUsersByDate]);

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = filteredUsersByDate;
    
    if (selectedStatus) {
      filtered = filtered.filter(u => 
        selectedStatus === 'OFFLINE' 
          ? (!u.currentStatus || u.currentStatus === 'OFFLINE')
          : u.currentStatus === selectedStatus
      );
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [filteredUsersByDate, selectedStatus, searchQuery]);

  const chartData = useMemo(() => attendanceService.prepareChartData(attendance), [attendance]);

  // Prepare chart data
  const statusData = useMemo(() => [
    { name: 'Working', value: stats.working, color: '#10b981' },
    { name: 'On Break', value: stats.onBreak, color: '#f59e0b' },
    { name: 'Done', value: stats.checkedOut, color: '#3b82f6' },
    { name: 'Offline', value: stats.offline, color: '#6b7280' }
  ], [stats]);

  const handleUserClick = useCallback((userId) => {
    navigate(`/user/${userId}`);
  }, [navigate]);

  const handleStatusSelect = useCallback((status) => {
    setSelectedStatus(prev => prev === status ? null : status);
  }, []);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'WORKING': return 'Working';
      case 'ON_BREAK': return 'On Break';
      case 'CHECKED_OUT': return 'Done';
      default: return 'Offline';
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="dashboard-mobile-style">
      {/* Header */}
      <div className="dash-header">
        <div className="header-top">
          <h1>Dashboard</h1>
          <div className="header-actions">
            <button className="action-btn refresh-btn" onClick={handleRefresh} title="Refresh">
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        
        <div className="header-filters">
          <div className="filter-group">
            <Calendar size={18} className="filter-icon" />
            <div className="date-filter-buttons">
              <button 
                className={`filter-btn ${dateFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setDateFilter('ALL')}
              >
                All Time
              </button>
              <button 
                className={`filter-btn ${dateFilter === 'TODAY' ? 'active' : ''}`}
                onClick={() => setDateFilter('TODAY')}
              >
                Today
              </button>
              <button 
                className={`filter-btn ${dateFilter === 'WEEK' ? 'active' : ''}`}
                onClick={() => setDateFilter('WEEK')}
              >
                This Week
              </button>
              <button 
                className={`filter-btn ${dateFilter === 'MONTH' ? 'active' : ''}`}
                onClick={() => setDateFilter('MONTH')}
              >
                This Month
              </button>
              <button 
                className={`filter-btn ${dateFilter === 'CUSTOM' ? 'active' : ''}`}
                onClick={() => setDateFilter('CUSTOM')}
              >
                Custom Range
              </button>
            </div>
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="custom-date-range">
              <div className="date-picker-wrapper">
                <label>From:</label>
                <DatePicker
                  selected={customStartDate}
                  onChange={(date) => setCustomStartDate(date)}
                  selectsStart
                  startDate={customStartDate}
                  endDate={customEndDate}
                  maxDate={new Date()}
                  dateFormat="MMM dd, yyyy"
                  placeholderText="Start Date"
                  className="custom-date-input"
                />
              </div>
              <div className="date-picker-wrapper">
                <label>To:</label>
                <DatePicker
                  selected={customEndDate}
                  onChange={(date) => setCustomEndDate(date)}
                  selectsEnd
                  startDate={customStartDate}
                  endDate={customEndDate}
                  minDate={customStartDate}
                  maxDate={new Date()}
                  dateFormat="MMM dd, yyyy"
                  placeholderText="End Date"
                  className="custom-date-input"
                />
              </div>
            </div>
          )}

          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards 
        stats={stats} 
        selectedStatus={selectedStatus} 
        onStatusSelect={handleStatusSelect} 
        usersCount={users.length} 
      />

      {/* Filter Indicator */}
      {selectedStatus && (
        <div className="filter-indicator">
          <div className="filter-info">
            <span>Showing <strong>{getStatusLabel(selectedStatus)}</strong> users</span>
            <span className="filter-count">{filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found</span>
          </div>
          <button className="clear-filter" onClick={() => setSelectedStatus(null)}>Clear</button>
        </div>
      )}

      {/* Charts Section */}
      <DashboardCharts 
        statusData={statusData} 
        chartData={chartData} 
      />

      {/* User List */}
      <div className="users-section">
        <h2>Team Members ({filteredUsers.length})</h2>
        <UserList 
          users={filteredUsers} 
          onUserClick={handleUserClick} 
        />
      </div>
    </div>
  );
};

export default Dashboard;
