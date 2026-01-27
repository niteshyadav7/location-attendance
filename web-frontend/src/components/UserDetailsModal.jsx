import React from 'react';
import { X, Mail, MapPin, Smartphone, Calendar, Clock, Briefcase, LogOut, LogIn, Shield, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import './UserDetailsModal.css';

const UserDetailsModal = ({ user, onClose, onCheckin, onCheckout }) => {
  if (!user) return null;

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

  const canCheckout = user.currentStatus === 'WORKING' || user.currentStatus === 'ON_BREAK';
  const canCheckin = user.currentStatus === 'CHECKED_OUT' || !user.currentStatus || user.currentStatus === 'OFFLINE';

  return (
    <div className="user-modal-overlay" onClick={onClose}>
      <div className="user-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="user-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Header with Gradient */}
        <div className="user-modal-header">
          <div className="user-modal-avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          
          <div className="user-modal-header-info">
            <h2 className="user-modal-name">{user.name}</h2>
            <p className="user-modal-email">
              <Mail size={14} />
              {user.email}
            </p>
            
            <div className="user-modal-status" style={{ backgroundColor: getStatusColor(user.currentStatus) }}>
              <span className="status-pulse"></span>
              {getStatusLabel(user.currentStatus)}
            </div>

            {user.lastActive && (
              <p className="user-modal-last-active">
                <Clock size={12} />
                Last active: {format(new Date(user.lastActive), 'MMM dd, h:mm a')}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {(canCheckout || canCheckin) && (
            <div className="user-modal-actions">
              {canCheckout && (
                <button className="user-modal-btn checkout" onClick={() => onCheckout(user.uid)}>
                  <LogOut size={16} />
                  Checkout
                </button>
              )}
              {canCheckin && (
                <button className="user-modal-btn checkin" onClick={() => onCheckin(user.uid)}>
                  <LogIn size={16} />
                  Check-in
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="user-modal-body">
          {/* User Information */}
          <div className="user-modal-section">
            <h3 className="user-modal-section-title">User Information</h3>
            
            <div className="user-modal-info-grid">
              <div className="user-modal-info-item">
                <div className="info-item-icon">
                  <Briefcase size={18} />
                </div>
                <div className="info-item-content">
                  <span className="info-item-label">Role</span>
                  <span className="info-item-value">
                    {user.role === 'company_admin' ? 'Administrator' : 'Employee'}
                  </span>
                </div>
              </div>

              <div className="user-modal-info-item">
                <div className="info-item-icon">
                  <MapPin size={18} />
                </div>
                <div className="info-item-content">
                  <span className="info-item-label">Assigned Location</span>
                  <span className="info-item-value">{user.locationId || 'Not Assigned'}</span>
                </div>
              </div>

              {user.appVersion && (
                <div className="user-modal-info-item">
                  <div className="info-item-icon">
                    <Smartphone size={18} />
                  </div>
                  <div className="info-item-content">
                    <span className="info-item-label">App Version</span>
                    <span className="info-item-value">v{user.appVersion}</span>
                  </div>
                </div>
              )}

              <div className="user-modal-info-item">
                <div className="info-item-icon">
                  <Shield size={18} />
                </div>
                <div className="info-item-content">
                  <span className="info-item-label">Device Lock</span>
                  <span className={`info-item-badge ${user.registeredDeviceId ? 'locked' : 'unlocked'}`}>
                    {user.registeredDeviceId ? 'Locked' : 'Unlocked'}
                  </span>
                </div>
              </div>

              <div className="user-modal-info-item">
                <div className="info-item-icon">
                  <Calendar size={18} />
                </div>
                <div className="info-item-content">
                  <span className="info-item-label">Account Created</span>
                  <span className="info-item-value">
                    {user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="user-modal-section">
            <h3 className="user-modal-section-title">Quick Stats</h3>
            
            <div className="user-modal-stats">
              <div className="user-modal-stat-card">
                <div className="stat-card-icon working">
                  <Briefcase size={20} />
                </div>
                <div className="stat-card-info">
                  <div className="stat-card-value">0</div>
                  <div className="stat-card-label">Total Days</div>
                </div>
              </div>

              <div className="user-modal-stat-card">
                <div className="stat-card-icon hours">
                  <Clock size={20} />
                </div>
                <div className="stat-card-info">
                  <div className="stat-card-value">0h</div>
                  <div className="stat-card-label">Total Hours</div>
                </div>
              </div>

              <div className="user-modal-stat-card">
                <div className="stat-card-icon wallet">
                  <Wallet size={20} />
                </div>
                <div className="stat-card-info">
                  <div className="stat-card-value">₹0</div>
                  <div className="stat-card-label">Advances</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
