import React, { useState } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const DebugPage = ({ user }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkFirestore = async () => {
    setLoading(true);
    const checks = {};

    try {
      // Check users collection
      const usersQuery = query(
        collection(db, 'users'),
        where('organizationId', '==', user.organizationId)
      );
      const usersSnap = await getDocs(usersQuery);
      checks.users = {
        count: usersSnap.size,
        data: usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      };

      // Check attendance collection
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('organizationId', '==', user.organizationId)
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      checks.attendance = {
        count: attendanceSnap.size,
        data: attendanceSnap.docs.slice(0, 3).map(d => ({ id: d.id, ...d.data() }))
      };

      // Check money_requests collection
      const moneyQuery = query(
        collection(db, 'money_requests'),
        where('organizationId', '==', user.organizationId)
      );
      const moneySnap = await getDocs(moneyQuery);
      checks.money_requests = {
        count: moneySnap.size,
        data: moneySnap.docs.slice(0, 3).map(d => ({ id: d.id, ...d.data() }))
      };

      setResults(checks);
    } catch (error) {
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 Firestore Debug Tool</h1>
      
      <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3>Current User Info:</h3>
        <pre style={{ background: 'white', padding: '12px', borderRadius: '8px', overflow: 'auto' }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <button 
        onClick={checkFirestore}
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Checking...' : 'Check Firestore Data'}
      </button>

      {results && (
        <div>
          {results.error ? (
            <div style={{ background: '#fee2e2', padding: '20px', borderRadius: '12px', color: '#dc2626' }}>
              <h3>❌ Error:</h3>
              <p>{results.error}</p>
            </div>
          ) : (
            <div>
              <div style={{ background: '#dbeafe', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3>👥 Users Collection</h3>
                <p><strong>Count:</strong> {results.users.count}</p>
                <pre style={{ background: 'white', padding: '12px', borderRadius: '8px', overflow: 'auto', fontSize: '12px' }}>
                  {JSON.stringify(results.users.data, null, 2)}
                </pre>
              </div>

              <div style={{ background: '#d1fae5', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3>📋 Attendance Collection</h3>
                <p><strong>Count:</strong> {results.attendance.count}</p>
                {results.attendance.count === 0 ? (
                  <p style={{ color: '#059669' }}>✅ No attendance records yet. This is normal if you haven't used the mobile app.</p>
                ) : (
                  <pre style={{ background: 'white', padding: '12px', borderRadius: '8px', overflow: 'auto', fontSize: '12px' }}>
                    {JSON.stringify(results.attendance.data, null, 2)}
                  </pre>
                )}
              </div>

              <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '12px' }}>
                <h3>💰 Money Requests Collection</h3>
                <p><strong>Count:</strong> {results.money_requests.count}</p>
                {results.money_requests.count === 0 ? (
                  <p style={{ color: '#d97706' }}>✅ No money requests yet. This is normal if you haven't created any.</p>
                ) : (
                  <pre style={{ background: 'white', padding: '12px', borderRadius: '8px', overflow: 'auto', fontSize: '12px' }}>
                    {JSON.stringify(results.money_requests.data, null, 2)}
                  </pre>
                )}
              </div>

              <div style={{ background: '#e0e7ff', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
                <h3>📊 Summary</h3>
                <ul>
                  <li>Users: {results.users.count}</li>
                  <li>Attendance Records: {results.attendance.count}</li>
                  <li>Money Requests: {results.money_requests.count}</li>
                </ul>
                {results.users.count === 0 && results.attendance.count === 0 && results.money_requests.count === 0 ? (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#fffbeb', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#92400e' }}>
                      <strong>ℹ️ No data found.</strong> This means your Firebase connection is working, 
                      but there's no data for your organization yet. Use the mobile app to create some data first!
                    </p>
                  </div>
                ) : (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#d1fae5', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#065f46' }}>
                      <strong>✅ Success!</strong> Firebase connection is working and data was found!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugPage;
