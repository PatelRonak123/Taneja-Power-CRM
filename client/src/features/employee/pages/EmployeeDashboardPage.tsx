import React from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { EmployeeWelcomeBanner } from '../components/EmployeeWelcomeBanner';
import { EmployeeMetricsGrid } from '../components/EmployeeMetricsGrid';
import { EmployeeQuickActions } from '../components/EmployeeQuickActions';
import { EmployeeActivityFeed } from '../components/EmployeeActivityFeed';

export const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Welcome Banner Header */}
      <EmployeeWelcomeBanner fullName={user?.fullName} />

      {/* Overview Metric Cards */}
      <EmployeeMetricsGrid />

      {/* Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Actions Card */}
        <div className="lg:col-span-7">
          <EmployeeQuickActions />
        </div>

        {/* Recent Activity & System Logs Feed */}
        <div className="lg:col-span-5">
          <EmployeeActivityFeed email={user?.email} />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
