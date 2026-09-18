import React from 'react';
import { QuotationActivityLog } from '../types/quotation.types';
import { Activity, PlusCircle, Edit3, Send, CheckCircle2, XCircle, GitBranch, RotateCcw } from 'lucide-react';

interface Props {
  activityLogs: QuotationActivityLog[];
}

export const QuotationActivityTimeline: React.FC<Props> = ({ activityLogs }) => {
  if (!activityLogs || activityLogs.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
        No activity events recorded yet.
      </div>
    );
  }

  const getEventIcon = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <PlusCircle size={14} className="text-blue-600" />;
      case 'UPDATED':
        return <Edit3 size={14} className="text-slate-600" />;
      case 'SUBMITTED':
        return <Send size={14} className="text-indigo-600" />;
      case 'APPROVED':
        return <CheckCircle2 size={14} className="text-emerald-600" />;
      case 'REJECTED':
        return <XCircle size={14} className="text-rose-600" />;
      case 'REVISED':
        return <GitBranch size={14} className="text-purple-600" />;
      case 'WITHDRAWN':
        return <RotateCcw size={14} className="text-amber-600" />;
      default:
        return <Activity size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {activityLogs.map((log) => (
        <div key={log.id} className="relative flex flex-col gap-1">
          {/* Dot Icon */}
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center">
            {getEventIcon(log.action)}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-900">{log.title}</span>
            <span className="text-[10px] text-slate-400">
              {new Date(log.createdAt).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {log.description && (
            <p className="text-xs text-slate-600 leading-relaxed">{log.description}</p>
          )}

          {log.user && (
            <span className="text-[11px] text-slate-400">
              By: <strong className="text-slate-700">{log.user.fullName}</strong> ({log.user.email})
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
