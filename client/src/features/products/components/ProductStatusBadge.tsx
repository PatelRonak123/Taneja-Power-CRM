import React from 'react';
import { StatusPill } from '@/components/ui/StatusPill';

interface ProductStatusBadgeProps {
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | string;
  size?: 'xs' | 'sm' | 'md';
}

export const ProductStatusBadge: React.FC<ProductStatusBadgeProps> = ({ status, size = 'xs' }) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <StatusPill variant="success" size={size} dot dotPulse>
          Operational
        </StatusPill>
      );
    case 'INACTIVE':
      return (
        <StatusPill variant="warning" size={size} dot>
          Maintenance
        </StatusPill>
      );
    case 'OUT_OF_STOCK':
      return (
        <StatusPill variant="danger" size={size} dot>
          Out of Stock
        </StatusPill>
      );
    default:
      return (
        <StatusPill variant="neutral" size={size} dot>
          {status}
        </StatusPill>
      );
  }
};

export default ProductStatusBadge;
