import React from 'react';
import { FollowUpStatus } from '../types/follow-up.types';
import { CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface FollowUpStatusBadgeProps {
  status: FollowUpStatus;
  scheduledDate?: string;
  className?: string;
}

export const FollowUpStatusBadge: React.FC<FollowUpStatusBadgeProps> = ({
  status,
  scheduledDate,
  className = '',
}) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const isOverdue =
    status === 'PENDING' && scheduledDate && scheduledDate < today;

  if (isOverdue || status === 'OVERDUE') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        Overdue
      </span>
    );
  }

  switch (status) {
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Completed
        </span>
      );
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          Cancelled
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          Pending
        </span>
      );
  }
};
