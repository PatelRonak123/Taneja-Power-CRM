import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthStore } from '../../stores/authStore';
import { useCurrentPath } from '../../app/router/navigation';
import ProductsPage from '../../features/products/pages/ProductsPage';
import { AdminDashboardPage } from '../../features/admin/pages/AdminDashboardPage';
import { EmployeeManagementPage } from '../../features/admin/pages/EmployeeManagementPage';
import { EmployeeDashboardPage } from '../../features/employee/pages/EmployeeDashboardPage';
import { ProfilePage } from '../../features/profile/pages/ProfilePage';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuthStore();
  const currentPath = useCurrentPath();
  const isAdmin = user?.role === 'ADMIN';
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const renderContent = () => {
    if ((currentPath === '/admin/dashboard' || currentPath === '/admin') && isAdmin) {
      return <AdminDashboardPage />;
    }

    if ((currentPath === '/employees' || currentPath === '/admin/employees') && isAdmin) {
      return <EmployeeManagementPage />;
    }

    if (currentPath === '/employee/dashboard' || currentPath === '/dashboard') {
      return <EmployeeDashboardPage />;
    }

    if (currentPath === '/profile') {
      return <ProfilePage />;
    }

    if (currentPath === '/products') {
      return <ProductsPage />;
    }

    if (currentPath === '/analytics') {
      return (
        <div style={{ padding: '24px 0' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Energy Telemetry & Analytics
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Real-time grid frequency, power telemetry monitoring, and asset diagnostics.
          </p>
        </div>
      );
    }

    if (currentPath === '/settings') {
      return (
        <div style={{ padding: '24px 0' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            System Configuration
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Configure environment variables, API endpoints, and database connection pools.
          </p>
        </div>
      );
    }

    if (children) {
      return children;
    }

    // Default fallback based on role
    return isAdmin ? <AdminDashboardPage /> : <EmployeeDashboardPage />;
  };

  return (
    <div className="app-layout">
      {isMobileSidebarOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="app-main-content">
        <Header onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
        <main className="content-container">{renderContent()}</main>
      </div>
    </div>
  );
};
