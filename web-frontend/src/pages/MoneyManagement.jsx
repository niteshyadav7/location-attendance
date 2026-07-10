import React, { useState, useEffect, useMemo } from 'react';
import { moneyService } from '../services/money.service';
import { exportService } from '../services/export.service';
import { attendanceService } from '../services/attendance.service';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { 
  Wallet, CheckCircle, XCircle, Clock, Search, 
  Download, Ban, Check,
  ChevronLeft, Calendar, Loader2, Edit2
} from 'lucide-react';
import './MoneyManagement.css';

const MoneyManagement = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState({}); // Map of userId -> userData
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const fetchData = React.useCallback(async (force = false) => {
    try {
      setLoading(true);
      const [moneyData, usersData] = await Promise.all([
        moneyService.getMoneyRequests(user.organizationId, {}, force),
        attendanceService.getUsers(user.organizationId, force)
      ]);
      
      setRequests(moneyData);

      // Create a map for easier lookup
      const usersMap = {};
      usersData.forEach(u => {
        usersMap[u.uid] = u;
      });
      setAllUsers(usersMap);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchUsersOnly = React.useCallback(async (force = false) => {
    try {
      const usersData = await attendanceService.getUsers(user.organizationId, force);
      const usersMap = {};
      usersData.forEach(u => {
        usersMap[u.uid] = u;
      });
      setAllUsers(usersMap);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [user.organizationId]);

  // Derived Selected User
  const selectedUser = useMemo(() => {
      if (!selectedUserId) return null;
      
      const userProfile = allUsers[selectedUserId];
      const userRequests = requests.filter(r => r.userId === selectedUserId);
      
      if (!userProfile && userRequests.length === 0) return null;

      const userName = userProfile?.name || userRequests[0]?.userName || 'Unknown User';
      const userEmail = userProfile?.email || userRequests[0]?.userEmail || 'No Email';
      const salaryLimit = userProfile?.salaryLimit ? Number(userProfile.salaryLimit) : 25000;

      const usedAmount = userRequests
        .filter(r => r.status === 'APPROVED' || r.status === 'PENDING')
        .reduce((sum, r) => sum + r.amount, 0);

      return {
        userId: selectedUserId,
        userName,
        userEmail,
        totalAmount: userRequests.reduce((sum, r) => sum + r.amount, 0),
        pendingCount: userRequests.filter(r => r.status === 'PENDING').length,
        requests: userRequests,
        salaryLimit,
        usedAmount,
        remainingAmount: salaryLimit - usedAmount,
        usagePercentage: Math.min((usedAmount / salaryLimit) * 100, 100)
      };
  }, [selectedUserId, requests, allUsers]);

  // Group requests by user
  const groupedUsers = useMemo(() => {
    if (selectedUserId) return null;
    
    // Group logic based on active tab
    // If Tab is PENDING, we prioritize users with pending requests
    const usersMap = {};
    
    requests.forEach(req => {
      if (!usersMap[req.userId]) {
        usersMap[req.userId] = {
          userId: req.userId,
          userName: req.userName,
          userEmail: req.userEmail,
          totalAmount: 0,
          pendingCount: 0,
          requests: []
        };
      }
      usersMap[req.userId].requests.push(req);
      usersMap[req.userId].totalAmount += req.amount;
      if (req.status === 'PENDING') {
        usersMap[req.userId].pendingCount += 1;
      }
    });

    let groups = Object.values(usersMap);

    // Enrich with Salary Data from allUsers
    groups = groups.map(group => {
       const userProfile = allUsers[group.userId];
       const salaryLimit = userProfile?.salaryLimit ? Number(userProfile.salaryLimit) : 25000; // Default if not set
       
       const usedAmount = group.requests // Only count APPROVED and PENDING for "Used/Blocked"
          .filter(r => r.status === 'APPROVED' || r.status === 'PENDING')
          .reduce((sum, r) => sum + r.amount, 0);

       return {
         ...group,
         salaryLimit,
         usedAmount,
         remainingAmount: salaryLimit - usedAmount,
         usagePercentage: Math.min((usedAmount / salaryLimit) * 100, 100)
       };
    });

    if (activeTab === 'PENDING') {
      groups = groups.filter(u => u.pendingCount > 0);
    } else if (activeTab === 'HISTORY') {
      // Show all users who have history
      groups = groups.filter(u => u.requests.some(r => r.status !== 'PENDING'));
    }

    return groups.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [requests, activeTab, selectedUserId, allUsers]);

  // Filter requests for detail view
  const filteredRequests = useMemo(() => {
    if (!selectedUser) return [];

    let data = selectedUser.requests;

    if (activeTab === 'PENDING') {
      data = data.filter(r => r.status === 'PENDING');
    } else {
      data = data.filter(r => r.status !== 'PENDING');
    }

    // Month filter
    if (monthFilter !== 'all') {
      const now = new Date();
      let startDate, endDate;

      switch (monthFilter) {
        case 'current':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'last':
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case 'last3':
          startDate = startOfMonth(subMonths(now, 2));
          endDate = endOfMonth(now);
          break;
        default:
          startDate = new Date(0);
          endDate = now;
      }

      data = data.filter(r =>
        isWithinInterval(new Date(r.requestDate), { start: startDate, end: endDate })
      );
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter(r =>
        r.reason?.toLowerCase().includes(query) ||
        r.amount?.toString().includes(query)
      );
    }

    return data.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
  }, [selectedUser, activeTab, monthFilter, searchQuery]);

  const stats = useMemo(() => moneyService.calculateStats(requests), [requests]);

  const handleApprove = async (requestId) => {
    if (!window.confirm("Approve this advance request? It will be deducted from remaining salary.")) return;
    try {
      await moneyService.approveRequest(requestId, user.uid, user.name);
      fetchData(true); // Reload all data
      // Keep selectedUser view invalidation logic handled by effect below
    } catch (error) {
      alert('Error approving request');
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;
    
    try {
      await moneyService.rejectRequest(requestId, user.uid, user.name, reason);
      fetchData(true);
    } catch (error) {
      alert('Error rejecting request');
    }
  };

  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [newSalaryLimit, setNewSalaryLimit] = useState('');

  // ... (existing effects)

  const handleUpdateSalary = () => {
    if (!selectedUser) return;
    setNewSalaryLimit(selectedUser.salaryLimit.toString());
    setShowSalaryModal(true);
  };

  const saveSalaryUpdate = async () => {
    const limit = Number(newSalaryLimit);
    if (isNaN(limit) || limit < 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      await attendanceService.updateUser(selectedUser.userId, { salaryLimit: limit });
      await fetchUsersOnly(true);
      setShowSalaryModal(false);
    } catch (error) {
      alert("Failed to update salary limit");
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of methods)

  const handleExport = () => {
    exportService.exportMoneyRequests(requests, {
      userName: selectedUser ? selectedUser.userName : 'All Users',
      dateRange: monthFilter
    });
  };



  if (loading && !requests.length && !Object.keys(allUsers).length) {
    return (
      <div className="loading-spinner">
        <Loader2 size={40} className="spinner-icon" />
        <span style={{ marginLeft: '12px' }}>Loading Financial Data...</span>
      </div>
    );
  }

  return (
    <div className="money-management">
      {/* Header */}
      <div className="header">
        <h1>
          <Wallet size={32} color="#6366f1" />
          Wallet & Advances
        </h1>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleExport}>
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {!selectedUser && (
        <div className="summary-card">
          <div className="stat total">
            <div className="stat-icon">💰</div>
            <div>
              <span className="label">Total Disbursed</span>
              <div className="value">₹{stats.approvedAmount.toLocaleString()}</div>
            </div>
          </div>
          <div className="stat pending">
            <div className="stat-icon">⏳</div>
            <div>
              <span className="label">Pending Requests</span>
              <div className="value">₹{stats.pendingAmount.toLocaleString()}</div>
            </div>
          </div>
          <div className="stat approved">
            <div className="stat-icon">✅</div>
            <div>
              <span className="label">Total Requests</span>
              <div className="value">{requests.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="content-container">

        {/* Navigation / Filters */}
        <div className="controls">
          {selectedUser ? (
             <div className="back-header" style={{ marginBottom: 0 }}>
               <button className="back-btn" onClick={() => setSelectedUserId(null)}>
                 <ChevronLeft size={24} />
               </button>
               <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>{selectedUser.userName}</h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Transaction History</p>
               </div>
             </div>
          ) : (
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'PENDING' ? 'active' : ''}`}
                onClick={() => setActiveTab('PENDING')}
              >
                <Clock size={16} /> Pending
              </button>
              <button
                className={`tab ${activeTab === 'HISTORY' ? 'active' : ''}`}
                onClick={() => setActiveTab('HISTORY')}
              >
                <Clock size={16} /> History
              </button>
            </div>
          )}

          <div style={{ flex: 1 }}></div>

          <div className="search-bar">
            {selectedUser ? (
               <input
                type="text"
                placeholder="Search reason or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            ) : (
              <></> 
            )}
            {selectedUser && <Search size={18} className="search-icon" />}
          </div>

          {selectedUser && (
            <div className="filter-chips">
              {['all', 'current', 'last', 'last3'].map(filter => (
                <button
                  key={filter}
                  className={`chip ${monthFilter === filter ? 'active' : ''}`}
                  onClick={() => setMonthFilter(filter)}
                >
                  {filter === 'all' ? 'All Time' :
                   filter === 'current' ? 'This Month' :
                   filter === 'last' ? 'Last Month' : 'Last 3 Months'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Salary Overview for Selected User */}
        {selectedUser && (
          <div className="salary-card">
            <div className="salary-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3>💵 Monthly Salary Limit</h3>
                <button 
                  className="icon-btn" 
                  style={{ padding: '4px 8px', fontSize: '12px', height: 'auto' }}
                  onClick={handleUpdateSalary}
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                 ₹{selectedUser.salaryLimit.toLocaleString()}
              </span>
            </div>
            <div className="progress-container">
               <div className="progress-bar-bg">
                 <div
                   className="progress-bar-fill"
                   style={{
                     width: `${selectedUser.usagePercentage}%`,
                     backgroundColor: selectedUser.usagePercentage > 80 ? '#ef4444' : '#10b981'
                   }}
                 ></div>
               </div>
            </div>
            <div className="salary-meta">
               <div className="meta-item">
                 <span>Used (Advances)</span>
                 <strong style={{ color: '#ef4444' }}>₹{selectedUser.usedAmount.toLocaleString()}</strong>
               </div>
               <div className="meta-item">
                 <span>Remaining</span>
                 <strong style={{ color: '#10b981' }}>₹{selectedUser.remainingAmount.toLocaleString()}</strong>
               </div>
            </div>
          </div>
        )}

        {/* Views */}
        {!selectedUser ? (
          <div className="user-grid">
            {groupedUsers.length === 0 ? (
               <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                 <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                 <p>No {activeTab.toLowerCase()} requests found.</p>
               </div>
            ) : (
              groupedUsers.map(userGroup => (
                <div
                  key={userGroup.userId}
                  className={`user-card ${userGroup.pendingCount > 0 ? 'has-pending' : ''}`}
                  onClick={() => setSelectedUserId(userGroup.userId)}
                >
                  {userGroup.pendingCount > 0 && (
                    <div className="pending-badge">
                      <span></span>
                      {userGroup.pendingCount} Pending
                    </div>
                  )}
                  <div className="user-header">
                    <div className="avatar">{userGroup.userName?.charAt(0)}</div>
                    <div className="user-details">
                      <h3>{userGroup.userName}</h3>
                      <p>{userGroup.userEmail}</p>
                    </div>
                  </div>

                  {/* Salary Mini Bar */}
                  <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontWeight: '600' }}>
                       <span style={{ color: '#64748b' }}>Limit Used</span>
                       <span style={{ color: userGroup.usagePercentage > 80 ? '#ef4444' : '#10b981' }}>
                         {userGroup.usagePercentage.toFixed(0)}%
                       </span>
                    </div>
                     <div className="progress-bar-bg" style={{ height: '6px' }}>
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${userGroup.usagePercentage}%`,
                            backgroundColor: userGroup.usagePercentage > 80 ? '#ef4444' : '#10b981'
                          }}
                        ></div>
                     </div>
                  </div>

                  <div className="card-stats">
                    <div className="mini-stat">
                        <label>Remaining</label>
                        <div style={{ color: '#10b981' }}>₹{userGroup.remainingAmount.toLocaleString()}</div>
                    </div>
                    <div className="view-link">
                      Manage →
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="requests-container">
            {filteredRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                <p>No records found for this period.</p>
              </div>
            ) : (
              filteredRequests.map(request => (
                <div key={request.id} className={`request-item ${request.status.toLowerCase()}`}>
                  <div className="req-info">
                    <div className="req-icon">
                      {request.status === 'PENDING' ? <Clock size={24} /> :
                       request.status === 'APPROVED' ? <CheckCircle size={24} /> :
                       <XCircle size={24} />}
                    </div>
                    <div className="req-details">
                       <h4>{request.reason || 'No reason provided'}</h4>
                       <p className="req-meta">
                         <Calendar size={12} />
                         {format(new Date(request.requestDate), 'dd MMM yyyy, HH:mm')}
                       </p>
                       {request.processedBy && (
                         <p className="req-meta" style={{ marginTop: '4px' }}>
                           Processed by {request.processedBy}
                         </p>
                       )}
                    </div>
                  </div>
                  <div className="req-right">
                    <div className="req-amount">
                      ₹{request.amount.toLocaleString()}
                    </div>
                    {request.status === 'PENDING' ? (
                      <div className="action-buttons">
                        <button 
                          className="reject-btn"
                          onClick={(e) => { e.stopPropagation(); handleReject(request.id); }}
                          title="Reject"
                        >
                          <Ban size={16} /> Reject
                        </button>
                        <button 
                          className="approve-btn"
                          onClick={(e) => { e.stopPropagation(); handleApprove(request.id); }}
                          title="Approve"
                        >
                          <Check size={16} /> Approve
                        </button>
                      </div>
                    ) : (
                      <span className={`status-badge ${request.status.toLowerCase()}`}>
                        {request.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Salary Modal */}
      {showSalaryModal && (
        <div className="modal-overlay" onClick={() => setShowSalaryModal(false)}>
          <div className="edit-salary-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Salary Limit</h3>
              <p>Set a new monthly limit for {selectedUser?.userName}</p>
            </div>
            
            <div className="input-group">
              <label>Monthly Limit (₹)</label>
              <div className="currency-input">
                <span>₹</span>
                <input 
                  type="number" 
                  value={newSalaryLimit}
                  onChange={(e) => setNewSalaryLimit(e.target.value)}
                  placeholder="25000"
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSalaryModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveSalaryUpdate}>
                Update Limit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoneyManagement;
