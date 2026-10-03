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

      const designationLower = (user?.designation || '').toLowerCase();
      const isSalesOffice = user?.role === 'USER' && user?.workType === 'OFFICE' && designationLower.includes('sales');
      const isServiceOffice =
        ((user?.role === 'USER' || (user as any)?.role === 'SERVICE') &&
          designationLower.includes('service')) ||
        (user?.workType === 'OFFICE' && designationLower.includes('service'));
      const isAccountantOffice = user?.role === 'USER' && user?.workType === 'OFFICE' && designationLower.includes('accountant');
      const isHrOffice = (user?.role === 'USER' || (user as any)?.role === 'HR') && user?.workType === 'OFFICE' && (designationLower.includes('hr') || designationLower.includes('human resources'));

      if (currentPath === '/login' || currentPath === '/') {
        navigate(defaultHomePath);
      } else if (isHrOffice) {
        const allowedHrPaths = [
          '/employee/dashboard',
          '/dashboard',
          '/hr/dashboard',
          '/attendance',
          '/employee/attendance',
          '/employees',
          '/admin/employees',
          '/profile',
        ];
        if (!allowedHrPaths.includes(currentPath)) {
          navigate('/employee/dashboard');
        }
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
        (isSalesOffice || isAccountantOffice)
      ) {
        navigate('/employee/dashboard');
      } else if (
        (currentPath.startsWith('/sales-orders') || currentPath.startsWith('/admin/sales-orders')) &&
        isServiceOffice
      ) {
        navigate('/employee/dashboard');
      } else if (
        isAccountantOffice &&
        (currentPath === '/quotations/new' || /^\/quotations\/[^/]+\/edit$/.test(currentPath))
      ) {
        navigate('/quotations');
      } else if (
        isAccountantOffice &&
        (currentPath === '/tasks' || currentPath === '/admin/tasks')
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
