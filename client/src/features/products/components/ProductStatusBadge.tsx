import React from 'react';
import { Badge } from '../../../components/ui/Badge';

interface ProductStatusBadgeProps {
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
}

export const ProductStatusBadge: React.FC<ProductStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">Operational / In Stock</Badge>;
    case 'INACTIVE':
      return <Badge variant="warning">Maintenance / Inactive</Badge>;
    case 'OUT_OF_STOCK':
      return <Badge variant="danger">Depleted / Out of Stock</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};
