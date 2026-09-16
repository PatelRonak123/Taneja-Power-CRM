import React from 'react';
import { ClipboardList, UserCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { TaskMetrics } from '../types/task.types';

interface TaskMetricsCardsProps {
  metrics: TaskMetrics;
}

export const TaskMetricsCards: React.FC<TaskMetricsCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Tasks */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-blue-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.total}</span>
          <span className="text-[11px] text-slate-400 font-medium">All logged orders</span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
          <ClipboardList size={20} />
        </div>
      </div>

      {/* Assigned */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-indigo-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.assigned}</span>
          <span className="text-[11px] text-indigo-600/80 font-medium">Pending technician</span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
          <UserCheck size={20} />
        </div>
      </div>

      {/* In Progress */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-amber-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Progress</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.inProgress}</span>
          <span className="text-[11px] text-amber-600/80 font-medium">On-site execution</span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
          <Clock size={20} />
        </div>
      </div>

      {/* Completed */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-emerald-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.completed}</span>
          <span className="text-[11px] text-emerald-600/80 font-medium">Verified resolved</span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
          <CheckCircle2 size={20} />
        </div>
      </div>

      {/* Cancelled */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-rose-300/80 transition-all duration-200 group">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cancelled</span>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{metrics.cancelled}</span>
          <span className="text-[11px] text-rose-600/80 font-medium">Voided work orders</span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
          <XCircle size={20} />
        </div>
      </div>
    </div>
  );
};

