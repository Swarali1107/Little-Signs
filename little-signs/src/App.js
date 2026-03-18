import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ISLLibrary from './pages/ISLLibrary';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import LoginPage  from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Learner pages
import LearnerHome     from './pages/LearnerHome';
import AlphabetPage    from './pages/AlphabetPage';
import NumbersPage     from './pages/NumbersPage';
import WordDictionary  from './pages/WordDictionary';
import SentenceBuilder from './pages/SentenceBuilder';
import AboutPage       from './pages/AboutPage';

// Role dashboards
import LearnerDashboard from './pages/dashboards/LearnerDashboard';
import ParentDashboard  from './pages/dashboards/ParentDashboard';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';

// ✅ NEW: ISL Buddy chatbot (floating button, shows on all learner pages)
import ISLBuddyButton from './components/ISLBuddyButton';

// Smart root redirect
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'#03030f', color:'white',
      fontFamily:'Orbitron, sans-serif', fontSize:'1.2rem', letterSpacing:'2px',
    }}>✨ Loading Universe...</div>
  );
  if (!user) return <Navigate to="/login" replace />;
  const map = {
    learner: '/home',
    parent:  '/dashboard/parent',
    teacher: '/dashboard/teacher',
  };
  return <Navigate to={map[user.role] || '/login'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Root */}
          <Route path="/" element={<RootRedirect />} />

          {/* Auth */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Learner home */}
          <Route path="/home" element={
            <ProtectedRoute roles={['learner']}>
              <LearnerHome />
            </ProtectedRoute>
          } />

          {/* 4 core feature pages */}
          <Route path="/alphabet" element={
            <ProtectedRoute roles={['learner','teacher']}>
              <AlphabetPage />
            </ProtectedRoute>
          } />
          <Route path="/numbers" element={
            <ProtectedRoute roles={['learner','teacher']}>
              <NumbersPage />
            </ProtectedRoute>
          } />
          <Route path="/word-dictionary" element={
  <ProtectedRoute roles={['learner','teacher']}>
    <WordDictionary />
  </ProtectedRoute>
} />
          <Route path="/library" element={
  <ProtectedRoute roles={['learner','teacher']}>
    <ISLLibrary />
  </ProtectedRoute>
} />
          <Route path="/sentence-builder" element={
            <ProtectedRoute roles={['learner','teacher']}>
              <SentenceBuilder />
            </ProtectedRoute>
          } />

          {/* About (public) */}
          <Route path="/about" element={<AboutPage />} />

          {/* Dashboards */}
          <Route path="/dashboard/learner" element={
            <ProtectedRoute roles={['learner']}>
              <LearnerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/parent" element={
            <ProtectedRoute roles={['parent']}>
              <ParentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/teacher" element={
            <ProtectedRoute roles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* ✅ ISL Buddy — floats over every page, only shows when logged in as learner */}
        <ISLBuddyButton />
      </Router>
    </AuthProvider>
  );
}

export default App;
