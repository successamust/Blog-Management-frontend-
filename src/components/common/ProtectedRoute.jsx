import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from './Spinner';

const ProtectedRoute = ({ children, requireAdmin = false, requireAuthor = false, requireAuthorOrAdmin = false }) => {
  const { isAuthenticated, isAdmin, isAuthor, isAuthorOrAdmin, loading } = useAuth();
  const location = useLocation();

  // If auth check completes and user is not authenticated, ensure we redirect
  // This prevents components from trying to fetch data before redirect happens
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect immediately - don't wait
      // This prevents race conditions where components try to fetch data before redirect
      const redirectPath = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
      // Use replace to avoid adding to history
      window.location.replace(redirectPath);
    }
  }, [loading, isAuthenticated, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Spinner size="3xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAuthor && !isAuthor()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAuthorOrAdmin && !isAuthorOrAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;