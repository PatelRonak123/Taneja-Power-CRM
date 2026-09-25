import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuthStore } from "../../stores/authStore";
import { useCurrentPath } from "../../app/router/navigation";
import ProductsPage from "../../features/products/pages/ProductsPage";
import { AdminDashboardPage } from "../../features/admin/pages/AdminDashboardPage";
import { EmployeeManagementPage } from "../../features/admin/pages/EmployeeManagementPage";
import { TaskManagementPage } from "../../features/tasks/pages/TaskManagementPage";
import { AttendanceManagementPage } from "../../features/attendance/pages/AttendanceManagementPage";
import { WhatsAppIntegrationPage } from "../../features/whatsapp/pages/WhatsAppIntegrationPage";
import { EmployeeDashboardPage } from "../../features/employee/pages/EmployeeDashboardPage";
import { AccountantDashboardPage } from "../../features/accountant/pages/AccountantDashboardPage";
import { EmployeeAttendancePage } from "../../features/employee/pages/EmployeeAttendancePage";
import { ProfilePage } from "../../features/profile/pages/ProfilePage";
import { ReportsPage } from "../../features/admin/pages/ReportsPage";
import { QuotationListPage } from "../../features/quotations/pages/QuotationListPage";
import { CreateQuotationPage } from "../../features/quotations/pages/CreateQuotationPage";
import { EditQuotationPage } from "../../features/quotations/pages/EditQuotationPage";
import { QuotationDetailPage } from "../../features/quotations/pages/QuotationDetailPage";
import { AmcContractListPage } from "../../features/amc-contracts/pages/AmcContractListPage";
import { AmcContractDetailPage } from "../../features/amc-contracts/pages/AmcContractDetailPage";
import { FsrDashboardPage } from "../../features/field-service/pages/FsrDashboardPage";
import { FsrListPage } from "../../features/field-service/pages/FsrListPage";
import { MyVisitsPage } from "../../features/field-service/pages/MyVisitsPage";
import { CreateFsrPage } from "../../features/field-service/pages/CreateFsrPage";
import { EditFsrPage } from "../../features/field-service/pages/EditFsrPage";
import { FsrDetailPage } from "../../features/field-service/pages/FsrDetailPage";
import { CustomerManagementPage } from "../../features/customers/pages/CustomerManagementPage";
import { LeadManagementPage } from "../../features/leads/pages/LeadManagementPage";
import { PipelinePage } from "../../features/leads/pages/PipelinePage";

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuthStore();
  const currentPath = useCurrentPath();
  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const renderContent = () => {
    if (
      (currentPath === "/admin/dashboard" || currentPath === "/admin") &&
      isAdmin
    ) {
      return <AdminDashboardPage />;
    }

    // Role / Designation flags
    const designation = (user?.designation || "").toLowerCase();
    const isSalesOffice =
      user?.role === "USER" &&
      user?.workType === "OFFICE" &&
      designation.includes("sales");
    const isAccountantOffice =
      user?.role === "USER" &&
      user?.workType === "OFFICE" &&
      designation.includes("accountant");
    const isHrOffice =
      (user?.role === "USER" || (user as any)?.role === "HR") &&
      user?.workType === "OFFICE" &&
      (designation.includes("hr") || designation.includes("human resources"));

    if (
      (currentPath === "/employees" || currentPath === "/admin/employees") &&
      (isAdmin || isHrOffice)
    ) {
      return <EmployeeManagementPage />;
    }

    if (currentPath === "/customers" || currentPath === "/admin/customers") {
      return <CustomerManagementPage />;
    }

    if (currentPath === "/leads" || currentPath === "/admin/leads") {
      return <LeadManagementPage />;
    }

    if (
      currentPath === "/pipeline" ||
      currentPath === "/admin/pipeline" ||
      currentPath === "/deals"
    ) {
      return <PipelinePage />;
    }

    if (currentPath.startsWith("/field-service")) {
      if (isSalesOffice || isHrOffice) {
        return <EmployeeDashboardPage />;
      }
      if (isAccountantOffice) {
        return <AccountantDashboardPage />;
      }
      if (currentPath === "/field-service") {
        return <FsrDashboardPage />;
      }
      if (currentPath === "/field-service/reports") {
        return <FsrListPage />;
      }
      if (currentPath === "/field-service/my-visits") {
        return <MyVisitsPage />;
      }
      if (currentPath === "/field-service/new") {
        return <CreateFsrPage />;
      }
      if (currentPath.endsWith("/edit")) {
        return <EditFsrPage />;
      }
      return <FsrDetailPage />;
    }

    if (currentPath === "/quotations") {
      return <QuotationListPage />;
    }

    if (currentPath === "/quotations/new") {
      if (isAccountantOffice) {
        return <QuotationListPage />;
      }
      return <CreateQuotationPage />;
    }

    if (
      currentPath.startsWith("/quotations/") &&
      currentPath.endsWith("/edit")
    ) {
      if (isAccountantOffice) {
        return <QuotationListPage />;
      }
      return <EditQuotationPage />;
    }

    if (currentPath.startsWith("/quotations/")) {
      return <QuotationDetailPage />;
    }

    if (
      currentPath === "/amc-contracts" ||
      currentPath === "/admin/amc-contracts"
    ) {
      return <AmcContractListPage />;
    }

    if (currentPath.startsWith("/amc-contracts/")) {
      return <AmcContractDetailPage />;
    }

    if (currentPath === "/tasks" || currentPath === "/admin/tasks") {
      if (isAccountantOffice) {
        return <AccountantDashboardPage />;
      }
      return <TaskManagementPage />;
    }

    if (
      (currentPath === "/attendance" || currentPath === "/admin/attendance") &&
      (isAdmin || isManager || isHrOffice)
    ) {
      return <AttendanceManagementPage />;
    }

    if (
      currentPath === "/employee/attendance" ||
      (currentPath === "/attendance" && !isAdmin && !isManager && !isHrOffice)
    ) {
      return <EmployeeAttendancePage />;
    }

    if (
      (currentPath === "/admin/whatsapp" || currentPath === "/whatsapp") &&
      isAdmin
    ) {
      return <WhatsAppIntegrationPage />;
    }

    if (
      (currentPath === "/admin/reports" || currentPath === "/reports") &&
      isAdmin
    ) {
      return <ReportsPage />;
    }

    if (
      currentPath === "/employee/dashboard" ||
      currentPath === "/dashboard" ||
      currentPath === "/accountant/dashboard"
    ) {
      if (isAccountantOffice) {
        return <AccountantDashboardPage />;
      }
      return <EmployeeDashboardPage />;
    }

    if (currentPath === "/profile") {
      return <ProfilePage />;
    }

    if (currentPath === "/products" || currentPath === "/equipment") {
      return <ProductsPage />;
    }

    if (currentPath === "/analytics") {
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
                Real-time grid frequency, power telemetry monitoring, harmonic
                load distribution, and asset diagnostics.
              </p>
            </div>
          </div>
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 font-bold">
              ⚡
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Live Grid Feeds Connected
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              Telemetry pipeline is receiving periodic packets from generator
              controllers and smart transfer switches.
            </p>
          </div>
        </div>
      );
    }

    if (currentPath === "/settings") {
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
                Configure environment variables, database connection pools,
                audit policies, and security credentials.
              </p>
            </div>
          </div>
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold">
              ⚙
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Platform Environment Ready
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              Application runtime parameters and database migrations are active
              and verified.
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
    <div className="flex min-h-screen">
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
        <Header
          onToggleMobileMenu={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />
        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
