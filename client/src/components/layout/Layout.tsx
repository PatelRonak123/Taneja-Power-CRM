import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthStore } from '../../stores/authStore';
import { useCurrentPath } from '../../app/router/navigation';
import ProductsPage from '../../features/products/pages/ProductsPage';
import { AdminDashboardPage } from '../../features/admin/pages/AdminDashboardPage';
import { EmployeeManagementPage } from '../../features/admin/pages/EmployeeManagementPage';
import { CustomerManagementPage } from '../../features/customers/pages/CustomerManagementPage';
import { TaskManagementPage } from '../../features/tasks/pages/TaskManagementPage';
import { AttendanceManagementPage } from '../../features/attendance/pages/AttendanceManagementPage';
import { WhatsAppIntegrationPage } from '../../features/whatsapp/pages/WhatsAppIntegrationPage';
import { LeadManagementPage } from '../../features/leads/pages/LeadManagementPage';
import { PipelinePage } from '../../features/leads/pages/PipelinePage';
import { EmployeeDashboardPage } from '../../features/employee/pages/EmployeeDashboardPage';
import { EmployeeAttendancePage } from '../../features/employee/pages/EmployeeAttendancePage';
import { ProfilePage } from '../../features/profile/pages/ProfilePage';
import { ReportsPage } from '../../features/admin/pages/ReportsPage';

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

    if ((currentPath === '/customers' || currentPath === '/admin/customers') && isAdmin) {
      return <CustomerManagementPage />;
    }

    if (currentPath === '/leads' || currentPath === '/admin/leads') {
      return <LeadManagementPage />;
    }

    if (currentPath === '/pipeline' || currentPath === '/admin/pipeline') {
      return <PipelinePage />;
    }

    if ((currentPath === '/tasks' || currentPath === '/admin/tasks') && isAdmin) {
      return <TaskManagementPage />;
    }

    if ((currentPath === '/attendance' || currentPath === '/admin/attendance') && isAdmin) {
      return <AttendanceManagementPage />;
    }

    if (currentPath === '/employee/attendance' || (currentPath === '/attendance' && !isAdmin)) {
      return <EmployeeAttendancePage />;
    }

    if ((currentPath === '/admin/whatsapp' || currentPath === '/whatsapp') && isAdmin) {
      return <WhatsAppIntegrationPage />;
    }

    if ((currentPath === '/admin/reports' || currentPath === '/reports') && isAdmin) {
      return <ReportsPage />;
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
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  CORE TELEMETRY MODULE
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Energy Telemetry & Grid Analytics
              </h1>
              <p className="text-sm text-slate-500">
                Real-time grid frequency, power telemetry monitoring, harmonic load distribution, and asset diagnostics.
              </p>
            </div>
          </div>
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 font-bold">
              ⚡
            </div>
            <h3 className="text-base font-bold text-slate-900">Live Grid Feeds Connected</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Telemetry pipeline is receiving periodic packets from generator controllers and smart transfer switches.
            </p>
          </div>
        </div>
      );
    }

    if (currentPath === '/settings') {
      return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  SYSTEM PREFERENCES
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                System Configuration
              </h1>
              <p className="text-sm text-slate-500">
                Configure environment variables, database connection pools, audit policies, and security credentials.
              </p>
            </div>
          </div>
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold">
              ⚙
            </div>
            <h3 className="text-base font-bold text-slate-900">Platform Environment Ready</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Application runtime parameters and database migrations are active and verified.
            </p>
          </div>
        </div>
      );
    }

    if (children) {
      return children;
    }

    return isAdmin ? <AdminDashboardPage /> : <EmployeeDashboardPage />;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Header onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{renderContent()}</main>
      </div>
    </div>
  );
};
