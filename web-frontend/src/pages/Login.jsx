import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, MapPin } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import './Login.css';
import Loader from '../components/common/Loader';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    return { isValid: true };
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    setEmailError('');
    if (value) {
      const validation = validateEmail(value);
      if (!validation.isValid) {
        setEmailError(validation.error);
      }
    }
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    setPasswordError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');
    setLoading(true);

    // Validation
    if (!email || !password) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error);
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Fetch user document
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (!userData.organizationId) {
          setError('Your account is missing an Organization ID. Please contact your administrator.');
          await auth.signOut();
          return;
        }

        // Success - will be handled by App.js
        console.log('Login successful!');
      } else {
        setError('User profile not found. Please contact support.');
        await auth.signOut();
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later');
      } else {
        setError(error.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };
if (loading) {
    return <Loader />;
  }
  return (
    <div className="login-wrapper">
      
      <div className="login-background"></div>
      
      <div className="login-split-container">
        {/* Left Panel - Login Form */}
        <div className="login-left-panel">

          <div className="login-brand">
            <div className="brand-logo">
              <MapPin size={28} className="brand-icon" />
            </div>
          </div>

          <div className="login-header">
            <h1 className="app-title">Welcome Back</h1>
            <p className="app-subtitle">Enter your credentials to access the admin portal.</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="input-label">Email Address</label>
              <div className={`input-container ${emailError ? 'input-error' : ''}`}>
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="admin@company.com"
                  required
                />
              </div>
              {emailError && <span className="error-message">{emailError}</span>}
            </div>

            <div className="form-group">
              <label className="input-label">Password</label>
              <div className={`input-container ${passwordError ? 'input-error' : ''}`}>
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordError && <span className="error-message">{passwordError}</span>}
            </div>

            {error && (
              <div className="alert-error">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              Login
            </button>
          </form>

          <div className="login-footer">
            <p>&copy; phyteam.com</p>
          </div>

      
        </div>

        {/* Right Panel - Illustration */}
        <div className="login-right-panel">
          <div className="illustration-container">
            <img src="/login-bg-v2.png" alt="Location Attendance System" className="illustration-image" />
            <div className="illustration-overlay">
              {/* Overlay removed as image has text */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
