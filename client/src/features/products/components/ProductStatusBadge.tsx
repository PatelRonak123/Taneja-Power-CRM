import React from 'react';

interface ProductStatusBadgeProps {
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
}

export const ProductStatusBadge: React.FC<ProductStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="telemetry-badge telemetry-badge-active">
          <span className="status-pulse-dot active" />
          <span>Operational</span>
        </span>
      );
    case 'INACTIVE':
      return (
        <span className="telemetry-badge telemetry-badge-inactive">
          <span className="status-pulse-dot inactive" />
          <span>Maintenance</span>
        </span>
      );
    case 'OUT_OF_STOCK':
      return (
        <span className="telemetry-badge telemetry-badge-out">
          <span className="status-pulse-dot out" />
          <span>Out of Stock</span>
        </span>
      );
    default:
      return (
        <span className="telemetry-badge telemetry-badge-neutral">
          <span className="status-pulse-dot" />
          <span>{status}</span>
        </span>
      );
  }
};

export default ProductStatusBadge;
