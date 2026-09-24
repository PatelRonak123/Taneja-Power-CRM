import React from 'react';
import { User } from 'lucide-react';
import { navigate } from '../../../app/router/navigation';
import { useAuthStore } from '../../../stores/authStore';

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 bg-white p-4 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs">
      <div className="flex items-start sm:items-center gap-3 sm:gap-5 min-w-0 flex-1">
        <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white font-black text-base sm:text-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
          {userInitials}
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{' '}
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
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug break-words">
            Welcome back, {fullName || 'Employee'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
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

      <button
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm border border-slate-200/90 rounded-xl transition-colors cursor-pointer w-full sm:w-auto shrink-0 shadow-2xs mt-1 sm:mt-0"
        onClick={() => navigate('/profile')}
      >
        <User size={16} />
        <span>My Profile</span>
      </button>
    </div>
  );
};
