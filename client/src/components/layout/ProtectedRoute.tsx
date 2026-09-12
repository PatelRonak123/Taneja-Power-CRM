import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectToLogin?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectToLogin }) => {
  const { isAuthenticated, isInitialized, initializeAuth } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated && redirectToLogin) {
      redirectToLogin();
    }
  }, [isInitialized, isAuthenticated, redirectToLogin]);

  if (!isInitialized) {
    return (
      <div className="loading-container" style={{ height: '100vh', background: 'var(--bg-app)' }}>
        <div className="spinner" />
        <div className="loading-message">Verifying authentication session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
