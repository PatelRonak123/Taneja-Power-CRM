import React from 'react';
import { User } from 'lucide-react';
import { navigate } from '../../../app/router/navigation';

interface EmployeeWelcomeBannerProps {
  fullName?: string;
}

export const EmployeeWelcomeBanner: React.FC<EmployeeWelcomeBannerProps> = ({ fullName }) => {
  const userInitials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'EMP';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
          {userInitials}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> OPERATIONAL SESSION ACTIVE
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {fullName || 'Employee'}!
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Taneja Power Operations & Equipment Management Portal. Monitoring grid assets, stock inventory, and telemetry diagnostics.
          </p>
        </div>
      </div>

      <button
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
        onClick={() => navigate('/profile')}
      >
        <User size={16} />
        <span>My Profile</span>
      </button>
    </div>
  );
};
