import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fieldService } from '../services/fieldService';
import { FsrActivityLog } from '../types/field-service.types';
import {
  Clock,
  CheckCircle2,
  FileEdit,
  ShieldCheck,
  UserPlus,
  PlayCircle,
  PenTool,
  XCircle,
  Activity,
  Loader2,
} from 'lucide-react';

export interface FsrActivityTimelineProps {
  activityLogs?: FsrActivityLog[];
  fsrId?: string;
}

export const FsrActivityTimeline: React.FC<FsrActivityTimelineProps> = ({
  activityLogs: propLogs,
  fsrId,
}) => {
  const { data: fetchedLogs, isLoading } = useQuery({
    queryKey: ['fsr-activity', fsrId],
    queryFn: async () => {
      if (!fsrId) return [];
      const res = await fieldService.getActivityLogs(fsrId);
      return res.data || [];
    },
    enabled: !propLogs && !!fsrId,
  });

  const logs = propLogs || fetchedLogs || [];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <FileEdit size={16} className="text-blue-500" />;
      case 'STARTED':
        return <PlayCircle size={16} className="text-amber-500" />;
      case 'FSE_ASSIGNED':
        return <UserPlus size={16} className="text-purple-500" />;
      case 'CUSTOMER_SIGNED':
      case 'FSE_SIGNED':
        return <PenTool size={16} className="text-emerald-500" />;
      case 'COMPLETED':
        return <CheckCircle2 size={16} className="text-emerald-600" />;
      case 'CLOSED':
        return <ShieldCheck size={16} className="text-indigo-600" />;
      case 'CANCELLED':
        return <XCircle size={16} className="text-rose-500" />;
      case 'UPDATED':
        return <Activity size={16} className="text-slate-500" />;
      default:
        return <Clock size={16} className="text-slate-400" />;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 size={14} className="animate-spin text-blue-600" />
        Loading activity history...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-400 italic">
        No recorded activity events for this report.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {logs.map((log) => (
        <div key={log.id} className="relative group">
          {/* Timeline Node Icon */}
          <div className="absolute -left-[23px] top-0.5 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
            {getActionIcon(log.action)}
          </div>

          {/* Event Content */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">{log.title}</span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {formatDate(log.createdAt)}
              </span>
            </div>

            {log.description && (
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {log.description}
              </p>
            )}

            {log.user && (
              <div className="mt-2 pt-1.5 border-t border-slate-200/50 text-[11px] text-slate-500">
                Action by:{' '}
                <span className="font-semibold text-slate-700">
                  {log.user.fullName || log.user.email}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
