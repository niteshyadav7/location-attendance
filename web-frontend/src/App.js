import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Navbar from './components/layout/Navbar';
import Loader from './components/common/Loader';
import './App.css';

// Lazy loading pages for performance optimization
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const MoneyManagement = React.lazy(() => import('./pages/MoneyManagement'));
const AttendanceHistory = React.lazy(() => import('./pages/AttendanceHistory'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const LocationManagement = React.lazy(() => import('./pages/LocationManagement'));
const UserDetails = React.lazy(() => import('./pages/UserDetails'));
const Login = React.lazy(() => import('./pages/Login'));

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              name: userData.name || currentUser.displayName || 'Admin',
              role: userData.role || 'user',
              organizationId: userData.organizationId || userData.companyId || ''
            });
          } else {
            // If user document doesn't exist, create basic user object
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || 'Admin',
              role: 'company_admin',
              organizationId: '' // Will need to be set
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <Router>
      <div className="app">
        {user && <Navbar user={user} />}
        
        <div className="app-content">
          <Suspense fallback={<Loader fullScreen />}>
            <Routes>
              <Route 
                path="/login" 
                element={user ? <Navigate to="/" /> : <Login />} 
              />
              
              <Route 
                path="/" 
                element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/money-management" 
                element={user ? <MoneyManagement user={user} /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/attendance" 
                element={user ? <AttendanceHistory user={user} /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/analytics" 
                element={user ? <Analytics user={user} /> : <Navigate to="/login" />} 
              />

              <Route 
                path="/locations" 
                element={user ? <LocationManagement user={user} /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/user/:userId" 
                element={user ? <UserDetails user={user} /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="*" 
                element={<Navigate to="/" />} 
              />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  );
}

export default App;
