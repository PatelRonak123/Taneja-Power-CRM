import React from 'react';

export type StatusPillVariant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'purple'
  | 'cyan'
  | 'error'
  | 'pending'
  | 'primary';

export interface StatusPillProps {
  variant?: StatusPillVariant;
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  dotPulse?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<
  string,
  {
    pill: string;
    dot: string;
  }
> = {
  success: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  danger: {
    pill: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
  },
  error: {
    pill: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
  },
  warning: {
    pill: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  pending: {
    pill: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  info: {
    pill: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dot: 'bg-blue-500',
  },
  primary: {
    pill: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dot: 'bg-blue-500',
  },
  neutral: {
    pill: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dot: 'bg-slate-400',
  },
  purple: {
    pill: 'bg-purple-50 text-purple-700 border-purple-200/80',
    dot: 'bg-purple-500',
  },
  cyan: {
    pill: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    dot: 'bg-cyan-500',
  },
};

const sizeStyles = {
  xs: 'h-5 px-2 text-[10px]',
  sm: 'h-6 px-2.5 text-[11px]',
  md: 'h-7 px-3 text-xs',
};

export const StatusPill: React.FC<StatusPillProps> = ({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  dotPulse = false,
  icon,
  children,
  className = '',
}) => {
  const styles = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border leading-tight shrink-0 select-none ${styles.pill} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
          {dotPulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${styles.dot}`} />
        </span>
      )}
      {icon && (
        <span className="shrink-0 flex items-center [&>svg]:w-3.5 [&>svg]:h-3.5" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
};

export default StatusPill;
