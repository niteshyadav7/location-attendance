import React, { memo } from 'react';
import { Briefcase, Coffee, CheckCircle, Moon } from 'lucide-react';

const StatsCards = memo(({ stats, selectedStatus, onStatusSelect, usersCount }) => {
  return (
    <div className="stats-grid-mobile">
      <div 
        className={`stat-card-mobile working ${selectedStatus === 'WORKING' ? 'active' : ''}`}
        onClick={() => onStatusSelect('WORKING')}
      >
        <div className="stat-icon-container">
          <Briefcase className="stat-icon" size={32} />
        </div>
        <div className="stat-number">{stats.working}</div>
        <div className="stat-label">Working</div>
        <div className="stat-percentage">
          {usersCount > 0 ? Math.round((stats.working / usersCount) * 100) : 0}%
        </div>
        {selectedStatus === 'WORKING' && <div className="active-check">✓</div>}
      </div>

      <div 
        className={`stat-card-mobile onbreak ${selectedStatus === 'ON_BREAK' ? 'active' : ''}`}
        onClick={() => onStatusSelect('ON_BREAK')}
      >
        <div className="stat-icon-container">
          <Coffee className="stat-icon" size={32} />
        </div>
        <div className="stat-number">{stats.onBreak}</div>
        <div className="stat-label">On Break</div>
        <div className="stat-percentage">
          {usersCount > 0 ? Math.round((stats.onBreak / usersCount) * 100) : 0}%
        </div>
        {selectedStatus === 'ON_BREAK' && <div className="active-check">✓</div>}
      </div>

      <div 
        className={`stat-card-mobile done ${selectedStatus === 'CHECKED_OUT' ? 'active' : ''}`}
        onClick={() => onStatusSelect('CHECKED_OUT')}
      >
        <div className="stat-icon-container">
          <CheckCircle className="stat-icon" size={32} />
        </div>
        <div className="stat-number">{stats.checkedOut}</div>
        <div className="stat-label">Done</div>
        <div className="stat-percentage">
          {usersCount > 0 ? Math.round((stats.checkedOut / usersCount) * 100) : 0}%
        </div>
        {selectedStatus === 'CHECKED_OUT' && <div className="active-check">✓</div>}
      </div>

      <div 
        className={`stat-card-mobile offline ${selectedStatus === 'OFFLINE' ? 'active' : ''}`}
        onClick={() => onStatusSelect('OFFLINE')}
      >
        <div className="stat-icon-container">
          <Moon className="stat-icon" size={32} />
        </div>
        <div className="stat-number">{stats.offline}</div>
        <div className="stat-label">Offline</div>
        <div className="stat-percentage">
          {usersCount > 0 ? Math.round((stats.offline / usersCount) * 100) : 0}%
        </div>
        {selectedStatus === 'OFFLINE' && <div className="active-check">✓</div>}
      </div>
    </div>
  );
});

export default StatsCards;
