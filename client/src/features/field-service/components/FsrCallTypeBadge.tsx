import React from 'react';
import { FsrCallType } from '../types/field-service.types';
import { AlertTriangle, Wrench, ShieldCheck, HeartHandshake } from 'lucide-react';

interface Props {
  callType: FsrCallType | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const FsrCallTypeBadge: React.FC<Props> = ({ callType, size = 'md', showIcon = true }) => {
  const normalizedType = (callType || '').toString().trim().toUpperCase();

  const getBadgeConfig = () => {
    switch (normalizedType) {
      case 'BD':
      case 'BREAKDOWN':
        return {
          label: 'Breakdown (BD)',
          icon: AlertTriangle,
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'PM':
      case 'PREVENTIVE':
        return {
          label: 'Preventive (PM)',
          icon: Wrench,
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'INSTALLATION':
        return {
          label: 'Installation',
          icon: ShieldCheck,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'COURTESY':
        return {
          label: 'Courtesy',
          icon: HeartHandshake,
          classes: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      default:
        return {
          label: callType || 'Service',
          icon: Wrench,
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  const iconSize = size === 'sm' ? 11 : 13;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap shrink-0 ${config.classes} ${sizeClasses} transition-all`}
    >
      {showIcon && <Icon size={iconSize} className="shrink-0" />}
      <span className="whitespace-nowrap">{config.label}</span>
    </span>
  );
};
