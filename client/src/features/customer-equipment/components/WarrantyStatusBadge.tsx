import React from 'react';
import type { CustomerEquipmentWarrantyStatus } from '../types/customer-equipment.types';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface WarrantyStatusBadgeProps {
  status?: CustomerEquipmentWarrantyStatus | string | null;
  expiryDate?: string | null;
  showExpiry?: boolean;
  className?: string;
}

export const WarrantyStatusBadge: React.FC<WarrantyStatusBadgeProps> = ({
  status,
  expiryDate,
  showExpiry = false,
  className = '',
}) => {
  const normalizedStatus = status || 'PENDING_ACTIVATION';

  const formatExpiry = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formattedExpiry = formatExpiry(expiryDate);

  switch (normalizedStatus) {
    case 'ACTIVE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
          title={formattedExpiry ? `Warranty active until ${formattedExpiry}` : 'Active Warranty'}
        >
          <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
          <span>Active</span>
          {showExpiry && formattedExpiry && (
            <span className="text-[10px] text-emerald-800/80 font-normal ml-0.5">
              (Exp: {formattedExpiry})
            </span>
          )}
        </span>
      );

    case 'EXPIRING_SOON':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse-once ${className}`}
          title={formattedExpiry ? `Warranty expiring soon on ${formattedExpiry}` : 'Warranty Expiring Soon'}
        >
          <AlertTriangle size={12} className="text-amber-600 shrink-0" />
          <span>Expiring Soon</span>
          {showExpiry && formattedExpiry && (
            <span className="text-[10px] text-amber-900 font-normal ml-0.5">
              (Exp: {formattedExpiry})
            </span>
          )}
        </span>
      );

    case 'EXPIRED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 ${className}`}
          title={formattedExpiry ? `Warranty expired on ${formattedExpiry}` : 'Warranty Expired'}
        >
          <XCircle size={12} className="text-slate-500 shrink-0" />
          <span>Expired</span>
          {showExpiry && formattedExpiry && (
            <span className="text-[10px] text-slate-500 font-normal ml-0.5">
              ({formattedExpiry})
            </span>
          )}
        </span>
      );

    case 'AMC_COVERED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
          title="Covered under active AMC Contract"
        >
          <Shield size={12} className="text-blue-600 shrink-0" />
          <span>AMC Covered</span>
        </span>
      );

    case 'PENDING_ACTIVATION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50/70 text-amber-700 border border-amber-200/80 ${className}`}
          title="Awaiting commissioning to activate warranty"
        >
          <Clock size={12} className="text-amber-600 shrink-0" />
          <span>Pending Activation</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 ${className}`}
          title={`Status: ${normalizedStatus}`}
        >
          <HelpCircle size={12} className="text-gray-400 shrink-0" />
          <span>{normalizedStatus}</span>
        </span>
      );
  }
};
