import React from 'react';
import { StatusPill, StatusPillVariant } from './StatusPill';

/**
 * @deprecated Use StatusPill directly instead. Badge is maintained as a backward-compatibility wrapper.
 */
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  return (
    <StatusPill variant={variant as StatusPillVariant} size="xs" className={className}>
      {children}
    </StatusPill>
  );
};

export default Badge;
