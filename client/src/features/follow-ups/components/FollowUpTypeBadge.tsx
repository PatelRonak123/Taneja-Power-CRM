import React from 'react';
import { FollowUpType } from '../types/follow-up.types';
import {
  PhoneCall,
  Users,
  Mail,
  MapPin,
  FileSpreadsheet,
  IndianRupee,
  ShieldCheck,
  Calendar,
  Building2,
  HelpCircle,
} from 'lucide-react';

interface FollowUpTypeBadgeProps {
  type: FollowUpType;
  className?: string;
  showIconOnly?: boolean;
}

export const FollowUpTypeBadge: React.FC<FollowUpTypeBadgeProps> = ({
  type,
  className = '',
  showIconOnly = false,
}) => {
  const getDetails = (t: FollowUpType) => {
    switch (t) {
      case 'CALL':
        return {
          label: 'Phone Call',
          icon: PhoneCall,
          styles: 'bg-blue-50 text-blue-700 border-blue-200/80',
        };
      case 'MEETING':
        return {
          label: 'Meeting',
          icon: Users,
          styles: 'bg-purple-50 text-purple-700 border-purple-200/80',
        };
      case 'EMAIL':
        return {
          label: 'Email',
          icon: Mail,
          styles: 'bg-sky-50 text-sky-700 border-sky-200/80',
        };
      case 'SITE_VISIT':
        return {
          label: 'Site Visit',
          icon: MapPin,
          styles: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        };
      case 'QUOTATION_FOLLOW_UP':
        return {
          label: 'Quotation Follow-up',
          icon: FileSpreadsheet,
          styles: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        };
      case 'PAYMENT_FOLLOW_UP':
        return {
          label: 'Payment Follow-up',
          icon: IndianRupee,
          styles: 'bg-amber-50 text-amber-700 border-amber-200/80',
        };
      case 'AMC_RENEWAL':
        return {
          label: 'AMC Renewal',
          icon: ShieldCheck,
          styles: 'bg-teal-50 text-teal-700 border-teal-200/80',
        };
      case 'AMC_EXPIRY':
        return {
          label: 'AMC Expiry',
          icon: Calendar,
          styles: 'bg-rose-50 text-rose-700 border-rose-200/80',
        };
      case 'CUSTOMER_VISIT':
        return {
          label: 'Customer Visit',
          icon: Building2,
          styles: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
        };
      case 'WARRANTY_EXPIRY':
        return {
          label: 'Warranty Expiry',
          icon: ShieldCheck,
          styles: 'bg-amber-50 text-amber-700 border-amber-200/80',
        };
      case 'OTHER':
      default:
        return {
          label: 'General Interaction',
          icon: HelpCircle,
          styles: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const { label, icon: Icon, styles } = getDetails(type);

  if (showIconOnly) {
    return (
      <span
        title={label}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border ${styles} ${className}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </span>
  );
};
