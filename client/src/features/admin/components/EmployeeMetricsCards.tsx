import React from 'react';
import { Users, ShieldCheck, Briefcase, UserCheck } from 'lucide-react';
import { EmployeeMetrics } from '../types/employee.types';

interface EmployeeMetricsCardsProps {
  metrics: EmployeeMetrics;
}

export const EmployeeMetricsCards: React.FC<EmployeeMetricsCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Employees */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors hover:border-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-slate-500">Total Staff</span>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{metrics.total}</span>
          <span className="text-xs text-slate-400">{metrics.active} active profiles</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Users size={18} />
        </div>
      </div>

      {/* Administrators */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors hover:border-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-slate-500">Administrators</span>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{metrics.admins}</span>
          <span className="text-xs text-orange-600 font-medium">Root access</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} />
        </div>
      </div>

      {/* Managers */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors hover:border-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-slate-500">Managers</span>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{metrics.managers}</span>
          <span className="text-xs text-indigo-600 font-medium">Operations & dispatch</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <Briefcase size={18} />
        </div>
      </div>

      {/* Standard Staff */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors hover:border-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-slate-500">Field Personnel</span>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums leading-tight">{metrics.users}</span>
          <span className="text-xs text-emerald-600 font-medium">Technicians & engineers</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <UserCheck size={18} />
        </div>
      </div>
    </div>
  );
};
