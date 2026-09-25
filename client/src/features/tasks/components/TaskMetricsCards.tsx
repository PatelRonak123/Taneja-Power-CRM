import React from 'react';
import { ClipboardList, UserCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { TaskMetrics } from '../types/task.types';

interface TaskMetricsCardsProps {
  metrics: TaskMetrics;
}

export const TaskMetricsCards: React.FC<TaskMetricsCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* Total Tasks */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">Total Tasks</p>
          <p className="text-[22px] font-bold text-slate-900 tabular-nums leading-none">{metrics.total}</p>
          <p className="text-[11px] text-slate-400">All logged orders</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ClipboardList size={18} />
        </div>
      </div>

      {/* Assigned */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">Assigned</p>
          <p className="text-[22px] font-bold text-slate-900 tabular-nums leading-none">{metrics.assigned}</p>
          <p className="text-[11px] text-indigo-600/80">Pending technician</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <UserCheck size={18} />
        </div>
      </div>

      {/* In Progress */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">In Progress</p>
          <p className="text-[22px] font-bold text-slate-900 tabular-nums leading-none">{metrics.inProgress}</p>
          <p className="text-[11px] text-amber-600/80">On-site execution</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Clock size={18} />
        </div>
      </div>

      {/* Completed */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">Completed</p>
          <p className="text-[22px] font-bold text-slate-900 tabular-nums leading-none">{metrics.completed}</p>
          <p className="text-[11px] text-emerald-600/80">Verified resolved</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 size={18} />
        </div>
      </div>

      {/* Cancelled */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium">Cancelled</p>
          <p className="text-[22px] font-bold text-slate-900 tabular-nums leading-none">{metrics.cancelled}</p>
          <p className="text-[11px] text-rose-600/80">Voided work orders</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <XCircle size={18} />
        </div>
      </div>
    </div>
  );
};
