import React, { memo } from 'react';
import { Mail, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const UserList = memo(({ users, onUserClick }) => {
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
      case 'CHECKED_OUT': return 'Done';
      default: return 'Offline';
    }
  };

  return (
    <div className="users-list">
      {users.map(u => (
        <div key={u.uid} className="user-card" onClick={() => onUserClick(u.uid)}>
          <div className="user-avatar">
            <div className="avatar-circle">{u.name?.charAt(0).toUpperCase()}</div>
            <div 
              className="status-dot" 
              style={{ backgroundColor: getStatusColor(u.currentStatus) }}
            ></div>
          </div>
          
          <div className="user-info">
            <div className="user-name-row">
              <span className="user-name">{u.name}</span>
              {u.appVersion && <span className="app-version">v{u.appVersion}</span>}
            </div>
            <div className="user-email">
              <Mail size={13} />
              {u.email}
            </div>
            {u.lastActive && (
              <div className="user-last-active">
                <Clock size={12} />
                {format(new Date(u.lastActive), 'MMM dd, h:mm a')}
              </div>
            )}
          </div>

          <div className="user-status">
            <div 
              className="status-badge" 
              style={{ backgroundColor: getStatusColor(u.currentStatus) }}
            >
              {getStatusLabel(u.currentStatus)}
            </div>
            <ChevronRight size={20} />
          </div>
        </div>
      ))}
    </div>
  );
});

export default UserList;
