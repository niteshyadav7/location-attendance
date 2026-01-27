import React, { useState } from 'react';
import ConfirmDialog from '../ConfirmDialog';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { FiLogOut } from 'react-icons/fi';
import { 
  LayoutDashboard, 
  Wallet, 
  ClipboardList, 
  BarChart2, 
  MapPin 
} from 'lucide-react';
import './Navbar.css';

const Navbar = ({ user }) => {
  const location = useLocation();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const performLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
          <div className="logo-container">
            <MapPin size={24} color="white" />
          </div>
          <h2>Location Attendance</h2>
        </Link>

        <div className="navbar-menu">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link 
            to="/money-management" 
            className={`nav-link ${isActive('/money-management') ? 'active' : ''}`}
          >
            <Wallet size={18} />
            <span>Money</span>
          </Link>
          <Link 
            to="/attendance" 
            className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}
          >
            <ClipboardList size={18} />
            <span>Attendance</span>
          </Link>
          <Link 
            to="/analytics" 
            className={`nav-link ${isActive('/analytics') ? 'active' : ''}`}
          >
            <BarChart2 size={18} />
            <span>Analytics</span>
          </Link>
          <Link 
            to="/locations" 
            className={`nav-link ${isActive('/locations') ? 'active' : ''}`}
          >
            <MapPin size={18} />
            <span>Locations</span>
          </Link>
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <div className="user-avatar">{user.name?.charAt(0)}</div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-role">Admin</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogoutClick} title="Logout">
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      <ConfirmDialog 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={performLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        confirmText="Logout"
        cancelText="Stay Logged In"
        type="danger"
        icon={FiLogOut}
      />
    </nav>
  );
};

export default Navbar;
