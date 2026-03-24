import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabase'; 
import { LayoutDashboard, User, BookOpen, Sparkles, LineChart, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast'; 
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TestCorner from './pages/TestCorner';
import Prediction from './pages/Prediction';
import FinancialAdvisor from './pages/FinancialAdvisor'; 
import Login from './pages/Login';
import './App.css';

function NavItem({ to, icon, label }) {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <li>
            <Link to={to} className={isActive ? "active" : ""}>
                <div className="nav-icon">{icon}</div>
                <span className="nav-label">{label}</span>
            </Link>
        </li>
    );
}

function App() {
  const [session, setSession] = useState(null);
  
  // NEW: State to control the logout confirmation popup
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => { 
      setShowLogoutModal(false); // Close modal
      await supabase.auth.signOut(); // Execute logout
  };

  // IF NO USER, SHOW LOGIN SCREEN
  if (!session) {
    return (
      <>
        <Toaster position="top-center" reverseOrder={false} />
        <Login />
      </>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      
      <div className="app-layout">
        
        {/* MOBILE HEADER */}
        <header className="mobile-top-bar">
            <div className="logo-mobile">Finance Tracker</div>
            {/* Updated to open modal instead of logging out instantly */}
            <button className="logout-icon-mobile" onClick={() => setShowLogoutModal(true)}>
                <LogOut size={20} color="#ef4444"/>
            </button>
        </header>

        {/* NAVIGATION */}
        <nav className="sidebar">
          <div className="logo-desktop">Finance Tracker</div>
          
          <ul className="nav-links">
            <NavItem to="/" icon={<LayoutDashboard size={24}/>} label="Dashboard" />
            <NavItem to="/profile" icon={<User size={24}/>} label="Profile" />
            <NavItem to="/predict" icon={<LineChart size={24}/>} label="Health Check" />
            <NavItem to="/test-corner" icon={<BookOpen size={24}/>} label="Learn" />
            <NavItem to="/advisor" icon={<Sparkles size={24}/>} label="Advisor" />
          </ul>
          
          {/* Updated to open modal instead of logging out instantly */}
          <button className="logout-btn-desktop" onClick={() => setShowLogoutModal(true)}>
            <LogOut size={20}/> <span className="nav-label">Log Out</span>
          </button>
        </nav>
        
        {/* MAIN CONTENT */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/predict" element={<Prediction />} />
            <Route path="/test-corner" element={<TestCorner />} />
            <Route path="/advisor" element={<FinancialAdvisor />} />
          </Routes>
        </main>

        {/* --- LOGOUT CONFIRMATION MODAL --- */}
        {showLogoutModal && (
          <div style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
              padding: '20px', boxSizing: 'border-box'
          }}>
              <div style={{
                  background: 'white', width: '100%', maxWidth: '400px', borderRadius: '25px',
                  padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center',
                  animation: 'fadeUp 0.2s ease-out'
              }}>
                  <div style={{ 
                      width: '60px', height: '60px', background: '#FEE2E2', borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' 
                  }}>
                      <LogOut size={30} color="#EF4444" />
                  </div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#1F2937' }}>Ready to leave?</h2>
                  <p style={{ color: '#64748B', marginBottom: '25px', fontSize: '1rem' }}>
                      Are you sure you want to log out of your account?
                  </p>
                  
                  <div style={{ display: 'flex', gap: '15px' }}>
                      <button onClick={() => setShowLogoutModal(false)} style={{ 
                          flex: 1, padding: '14px', borderRadius: '16px', background: '#F1F5F9', 
                          border: 'none', color: '#4B5563', fontWeight: 'bold', cursor: 'pointer' 
                      }}>
                          Cancel
                      </button>
                      <button onClick={handleLogout} style={{ 
                          flex: 1, padding: '14px', borderRadius: '16px', background: '#EF4444', 
                          border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', 
                          boxShadow: '0 4px 0 #B91C1C', transition: 'transform 0.1s' 
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(2px)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                          Yes, Log Out
                      </button>
                  </div>
              </div>
          </div>
        )}

      </div>
    </Router>
  );
}

export default App;