import React from 'react';
import { FollowUpPriority } from '../types/follow-up.types';
import { ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';

interface FollowUpPriorityBadgeProps {
  priority: FollowUpPriority;
  className?: string;
}

export const FollowUpPriorityBadge: React.FC<FollowUpPriorityBadgeProps> = ({
  priority,
  className = '',
}) => {
  switch (priority) {
    case 'HIGH':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}
        >
          <ArrowUp className="w-3 h-3 text-rose-600 shrink-0" strokeWidth={2.5} />
          High
        </span>
      );
    case 'MEDIUM':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}
        >
          <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" strokeWidth={2.5} />
          Medium
        </span>
      );
    case 'LOW':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          <ArrowDown className="w-3 h-3 text-slate-500 shrink-0" strokeWidth={2.5} />
          Low
        </span>
      );
  }
};
