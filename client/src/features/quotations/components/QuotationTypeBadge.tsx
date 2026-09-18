import React from 'react';
import { QuotationType } from '../types/quotation.types';
import { Package, Cpu, Wrench, ShieldAlert } from 'lucide-react';

interface Props {
  type: QuotationType | string;
  size?: 'sm' | 'md';
}

export const QuotationTypeBadge: React.FC<Props> = ({ type, size = 'md' }) => {
  const getConfig = () => {
    switch (type) {
      case 'PRODUCT':
        return {
          label: 'Product',
          icon: Package,
          classes: 'bg-blue-50 text-blue-700 border-blue-200/80',
        };
      case 'TECHNICAL':
        return {
          label: 'Technical',
          icon: Cpu,
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        };
      case 'SERVICE':
        return {
          label: 'Service',
          icon: Wrench,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        };
      case 'AMC':
        return {
          label: 'AMC Contract',
          icon: ShieldAlert,
          classes: 'bg-amber-50 text-amber-700 border-amber-200/80',
        };
      default:
        return {
          label: type,
          icon: Package,
          classes: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  const iconSize = size === 'sm' ? 11 : 13;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-lg border ${config.classes} ${sizeClasses}`}
    >
      <Icon size={iconSize} className="shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};
