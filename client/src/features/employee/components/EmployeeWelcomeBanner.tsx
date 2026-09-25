import React from 'react';
import { User } from 'lucide-react';
import { navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';

interface EmployeeWelcomeBannerProps {
  fullName?: string;
}

export const EmployeeWelcomeBanner: React.FC<EmployeeWelcomeBannerProps> = ({ fullName }) => {
  const { user } = useAuthStore();
  const designation = (user?.designation || '').toLowerCase();
  const isSalesOffice = user?.workType === 'OFFICE' && designation.includes('sales');
  const isServiceOffice = user?.workType === 'OFFICE' && designation.includes('service');
  const isAccountantOffice = user?.workType === 'OFFICE' && designation.includes('accountant');
  const isHrOffice =
    (user?.role === 'USER' || (user as any)?.role === 'HR') &&
    user?.workType === 'OFFICE' &&
    (designation.includes('hr') || designation.includes('human resources'));

  const userInitials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'EMP';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-xl border border-border shadow-xs">
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shrink-0">
          {userInitials}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{' '}
              {isHrOffice
                ? 'HR MANAGEMENT ACTIVE'
                : isAccountantOffice
                ? 'FINANCE WORKSPACE ACTIVE'
                : isServiceOffice
                ? 'SERVICE OFFICE ACTIVE'
                : isSalesOffice
                ? 'SALES OFFICE ACTIVE'
                : 'OPERATIONAL SESSION ACTIVE'}
            </span>
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-snug wrap-break-word">
            Welcome back, {fullName || 'Employee'}!
          </h1>
          <p className="text-[13px] text-slate-500 max-w-2xl leading-relaxed">
            {isHrOffice
              ? 'HR Operational Portal. Oversee employee records, process workforce attendance, and administer staff profiles.'
              : isAccountantOffice
              ? 'Taneja Power Financial Portal. Monitor customer accounts, deal status, quotations, and commercial inventory.'
              : isServiceOffice
              ? 'Taneja Power Service Workspace. Monitor field service reports, active AMC contracts, service quotations, and assigned tasks.'
              : isSalesOffice
              ? 'Taneja Power Sales Workspace. Manage your customer relationships, leads pipeline, quotations, and daily schedule.'
              : 'Taneja Power Operations & Equipment Management Portal. Monitoring grid assets, stock inventory, and telemetry diagnostics.'}
          </p>
        </div>
      </div>

      <div className="shrink-0 mt-1 sm:mt-0">
        <Button
          variant="outline"
          size="md"
          onClick={() => navigate('/profile')}
        >
          <User size={15} className="mr-1.5" />
          <span>My Profile</span>
        </Button>
      </div>
    </div>
  );
};
