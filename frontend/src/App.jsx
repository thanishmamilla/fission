import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function MainApp() {
  const { user, token, loading } = useAuth();
  const [view, setView] = useState('login');

  // Sync state view with authentication status
  useEffect(() => {
    if (!loading) {
      if (token && user) {
        setView('dashboard');
      } else {
        if (view === 'dashboard') {
          setView('login');
        }
      }
    }
  }, [user, token, loading]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0D0B09',
        color: '#D4AF37',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(212, 175, 55, 0.1)',
          borderTopColor: '#D4AF37',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <h3>Loading TableReserve...</h3>
      </div>
    );
  }

  switch (view) {
    case 'login':
      return <Login onViewChange={setView} />;
    case 'register':
      return <Register onViewChange={setView} />;
    case 'dashboard':
      return <Dashboard onViewChange={setView} />;
    default:
      return <Login onViewChange={setView} />;
  }
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
