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
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-blue-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.total}</span>
          <span className="text-[11px] text-slate-400 font-medium">{metrics.active} active profiles</span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
          <Users size={22} />
        </div>
      </div>

      {/* Administrators */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-orange-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Administrators</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.admins}</span>
          <span className="text-[11px] text-orange-600/80 font-medium">Full root permissions</span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200/60 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-xs">
          <ShieldCheck size={22} />
        </div>
      </div>

      {/* Managers */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-indigo-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Managers</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.managers}</span>
          <span className="text-[11px] text-indigo-600/80 font-medium">Operations & dispatch</span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
          <Briefcase size={22} />
        </div>
      </div>

      {/* Standard Staff */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-emerald-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Field Personnel</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.users}</span>
          <span className="text-[11px] text-emerald-600/80 font-medium">Technicians & engineers</span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
          <UserCheck size={22} />
        </div>
      </div>
    </div>
  );
};

