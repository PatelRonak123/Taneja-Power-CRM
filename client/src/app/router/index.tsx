import React, { useEffect } from 'react';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';
import { Layout } from '../../components/layout/Layout';
import { useAuthStore } from '../../stores/authStore';
import { navigate, useCurrentPath } from './navigation';

export { navigate, useCurrentPath };

export const AppRouter: React.FC = () => {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const currentPath = useCurrentPath();

  const defaultHomePath = user?.role === 'ADMIN' ? '/admin/dashboard' : '/employee/dashboard';

  // Handle automatic route redirects
  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated) {
      if (currentPath === '/login' || currentPath === '/') {
        navigate(defaultHomePath);
      } else if (
        (currentPath === '/admin/dashboard' ||
          currentPath === '/employees' ||
          currentPath === '/admin/employees' ||
          currentPath === '/customers' ||
          currentPath === '/admin/customers' ||
          currentPath === '/leads' ||
          currentPath === '/admin/leads' ||
          currentPath === '/tasks' ||
          currentPath === '/admin/tasks' ||
          currentPath === '/admin/whatsapp' ||
          currentPath === '/whatsapp') &&
        user?.role !== 'ADMIN'
      ) {
        navigate('/employee/dashboard');
      }
    }
  }, [isInitialized, isAuthenticated, currentPath, user?.role, defaultHomePath]);

  // Unauthenticated Login route
  if (currentPath === '/login') {
    if (isInitialized && isAuthenticated) {
      return (
        <ProtectedRoute redirectToLogin={() => navigate('/login')}>
          <Layout />
        </ProtectedRoute>
      );
    }
    return (
      <LoginPage
        onLoginSuccess={() => {
          const target = useAuthStore.getState().user?.role === 'ADMIN' ? '/admin/dashboard' : '/employee/dashboard';
          navigate(target);
        }}
      />
    );
  }

  // All protected routes wrapped in ProtectedRoute and Layout
  return (
    <ProtectedRoute redirectToLogin={() => navigate('/login')}>
      <Layout />
    </ProtectedRoute>
  );
};
