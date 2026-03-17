import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a route so only authenticated users (optionally with specific roles) can access it.
 * Usage:
 *   <ProtectedRoute roles={['learner']}>
 *     <LearnerDashboard />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0a0a2a', color: 'white',
        fontFamily: 'Fredoka One, cursive', fontSize: '1.5rem',
      }}>
        Loading... ✨
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    // Redirect to their own dashboard
    const dashMap = {
      learner: '/dashboard/learner',
      parent:  '/dashboard/parent',
      teacher: '/dashboard/teacher',
      admin:   '/dashboard/admin',
    };
    return <Navigate to={dashMap[user.role] || '/login'} replace />;
  }

  return children;
}
