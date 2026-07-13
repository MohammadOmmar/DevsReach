import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'parent') return <Navigate to="/parent" replace />;
    if (user.role === 'driver') return <Navigate to="/driver" replace />;
    if (user.role === 'school') return <Navigate to="/school" replace />;
    if (user.role === 'rto') return <Navigate to="/rto" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
