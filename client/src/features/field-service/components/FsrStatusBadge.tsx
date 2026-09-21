import React from 'react';
import { FsrStatus } from '../types/field-service.types';
import { Clock, CheckCircle2, FileEdit, ShieldCheck, XCircle } from 'lucide-react';

interface Props {
  status: FsrStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const FsrStatusBadge: React.FC<Props> = ({ status, size = 'md', showIcon = true }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Draft',
          icon: FileEdit,
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          icon: Clock,
          classes: 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs',
        };
      case 'COMPLETED':
        return {
          label: 'Completed',
          icon: CheckCircle2,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs',
        };
      case 'CLOSED':
        return {
          label: 'Closed',
          icon: ShieldCheck,
          classes: 'bg-purple-50 text-purple-700 border-purple-300',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          icon: XCircle,
          classes: 'bg-rose-50 text-rose-700 border-rose-300',
        };
      default:
        return {
          label: status,
          icon: FileEdit,
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2 font-semibold',
  }[size];

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15,
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.classes} ${sizeClasses} transition-all`}
    >
      {showIcon && <Icon size={iconSizes} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
