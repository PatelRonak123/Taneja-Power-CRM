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
      if (user?.workType === 'FIELD' && user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
        useAuthStore.getState().logout();
        navigate('/login');
        return;
      }

      if (currentPath === '/login' || currentPath === '/') {
        navigate(defaultHomePath);
      } else if (
        (currentPath === '/admin/dashboard' ||
          currentPath === '/admin' ||
          currentPath === '/employees' ||
          currentPath === '/admin/employees' ||
          currentPath === '/admin/whatsapp' ||
          currentPath === '/whatsapp' ||
          currentPath === '/reports' ||
          currentPath === '/admin/reports' ||
          currentPath === '/analytics' ||
          currentPath === '/settings') &&
        user?.role !== 'ADMIN'
      ) {
        navigate('/employee/dashboard');
      } else if (
        currentPath.startsWith('/field-service') &&
        user?.role === 'USER' &&
        user?.workType === 'OFFICE' &&
        (user?.designation || '').toLowerCase().includes('sales')
      ) {
        navigate('/employee/dashboard');
      }
    }
  }, [isInitialized, isAuthenticated, currentPath, user?.role, user?.workType, user?.designation, defaultHomePath]);

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
