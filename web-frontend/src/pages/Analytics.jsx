import React, { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendance.service';
import { moneyService } from '../services/money.service';
import AttendanceTrendChart from '../components/charts/AttendanceTrendChart';
import MoneyDistributionPie from '../components/charts/MoneyDistributionPie';
import WorkingHoursBar from '../components/charts/WorkingHoursBar';
import ActivityHeatmap from '../components/charts/ActivityHeatmap';
import AttendanceTimeline from '../components/charts/AttendanceTimeline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  BarChart2, TrendingUp, PieChart, Clock, 
  Activity, Calendar, CreditCard, Lightbulb, 
  Users, ArrowUpRight, Loader2
} from 'lucide-react';
import './Analytics.css';

const Analytics = ({ user }) => {
  const [attendance, setAttendance] = useState([]);
  const [moneyRequests, setMoneyRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('MONTH');

  const fetchAnalyticsData = React.useCallback(async () => {
    try {
      setLoading(true);

      const [attendanceData, moneyData, usersData] = await Promise.all([
        attendanceService.getAttendanceRecords(user.organizationId, { dateFilter: timeRange }),
        moneyService.getMoneyRequests(user.organizationId),
        attendanceService.getUsers(user.organizationId)
      ]);

      setAttendance(attendanceData);
      setMoneyRequests(moneyData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user.organizationId, timeRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const chartData = attendanceService.prepareChartData(attendance);
  const moneyStats = moneyService.calculateStats(moneyRequests);
  
  const userWorkingHours = users.map(u => {
    const userAttendance = attendance.filter(a => a.userId === u.uid);
    const stats = attendanceService.calculateStats(userAttendance);
    return {
      userName: u.name,
      totalHours: stats.totalWorkingHours,
      presentDays: stats.totalPresent
    };
  }).sort((a, b) => b.totalHours - a.totalHours);

  // Prepare money trend data
  const moneyTrendData = moneyRequests
    .reduce((acc, req) => {
      const date = new Date(req.requestDate).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, amount: 0, count: 0 };
      }
      acc[date].amount += req.amount;
      acc[date].count += 1;
      return acc;
    }, {});

  const moneyTrend = Object.values(moneyTrendData).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  if (loading) {
    return (
      <div className="loading-spinner">
        <Loader2 size={40} className="spinner-icon" />
        <span style={{ marginLeft: '12px' }}>Loading Analytics...</span>
      </div>
    );
  }

  return (
    <div className="analytics">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1>
            <BarChart2 size={32} color="#6366f1" />
            Advanced Analytics
          </h1>
          <p>Comprehensive insights and performance metrics</p>
        </div>
        <div className="time-range-selector">
          {['WEEK', 'MONTH', 'ALL'].map(range => (
            <button
              key={range}
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range === 'ALL' ? 'All Time' : `This ${range.toLowerCase()}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="analytics-grid">
        {/* Attendance Trend */}
        <div className="chart-card full-width">
          <div className="chart-container">
            <h3><TrendingUp size={20} color="#6366f1" /> Attendance Trend</h3>
            <AttendanceTrendChart data={chartData} />
          </div>
        </div>

        {/* Money Distribution */}
        <div className="chart-card">
          <div className="chart-container">
            <h3><PieChart size={20} color="#ec4899" /> Expense Distribution</h3>
            <MoneyDistributionPie data={moneyStats} />
          </div>
        </div>

        {/* Working Hours */}
        <div className="chart-card">
          <div className="chart-container">
            <h3><Clock size={20} color="#f59e0b" /> Top Working Hours</h3>
            <WorkingHoursBar data={userWorkingHours} />
          </div>
        </div>

        {/* Money Requests Trend (Area Chart) */}
        <div className="chart-card full-width">
          <div className="chart-container">
            <h3><CreditCard size={20} color="#8b5cf6" /> Advance Requests Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={moneyTrend}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '12px'
                  }}
                  formatter={(value) => [`₹${value}`, 'Amount']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="chart-card full-width">
          <div className="chart-container">
            <h3><Activity size={20} color="#10b981" /> Activity Heatmap</h3>
            <ActivityHeatmap data={attendance} />
          </div>
        </div>

        {/* Timeline */}
        <div className="chart-card full-width">
          <div className="chart-container">
            <h3><Calendar size={20} color="#3b82f6" /> Recent Activity Timeline</h3>
            <AttendanceTimeline data={attendance.slice(0, 20)} />
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="insights-section">
        <h2><Lightbulb size={24} color="#f59e0b" /> Key Insights</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">
              <ArrowUpRight size={28} />
            </div>
            <div className="insight-content">
              <h3>Most Active Day</h3>
              <p>Wednesday shows highest attendance</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">
              <Clock size={28} />
            </div>
            <div className="insight-content">
              <h3>Peak Hours</h3>
              <p>9 AM - 11 AM has maximum check-ins</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">
              <TrendingUp size={28} />
            </div>
            <div className="insight-content">
              <h3>Advance Trend</h3>
              <p>Requests increase towards month-end</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">
              <Users size={28} />
            </div>
            <div className="insight-content">
              <h3>Top Performer</h3>
              <p>{userWorkingHours[0]?.userName || 'N/A'}</p>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                {userWorkingHours[0]?.totalHours || 0} hours logged
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
