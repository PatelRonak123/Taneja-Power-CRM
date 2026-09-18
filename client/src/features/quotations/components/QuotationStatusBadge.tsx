import React from 'react';
import { QuotationStatus } from '../types/quotation.types';
import { Clock, CheckCircle2, XCircle, FileEdit, Send, PhoneCall, Check, UserX, AlertCircle } from 'lucide-react';

interface Props {
  status: QuotationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const QuotationStatusBadge: React.FC<Props> = ({ status, size = 'md', showIcon = true }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Draft',
          icon: FileEdit,
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'PENDING_APPROVAL':
        return {
          label: 'Pending Approval',
          icon: Clock,
          classes: 'bg-amber-50 text-amber-700 border-amber-300/80 shadow-xs animate-pulse',
        };
      case 'APPROVED':
        return {
          label: 'Approved',
          icon: CheckCircle2,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs',
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          icon: XCircle,
          classes: 'bg-rose-50 text-rose-700 border-rose-300',
        };
      case 'SENT':
        return {
          label: 'Sent to Client',
          icon: Send,
          classes: 'bg-blue-50 text-blue-700 border-blue-300',
        };
      case 'FOLLOW_UP':
        return {
          label: 'Follow-up',
          icon: PhoneCall,
          classes: 'bg-purple-50 text-purple-700 border-purple-300',
        };
      case 'ACCEPTED':
        return {
          label: 'Accepted',
          icon: Check,
          classes: 'bg-teal-50 text-teal-700 border-teal-300 font-bold',
        };
      case 'REJECTED_BY_CUSTOMER':
        return {
          label: 'Rejected by Client',
          icon: UserX,
          classes: 'bg-zinc-100 text-zinc-700 border-zinc-300',
        };
      case 'EXPIRED':
        return {
          label: 'Expired',
          icon: AlertCircle,
          classes: 'bg-red-50 text-red-600 border-red-200',
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
