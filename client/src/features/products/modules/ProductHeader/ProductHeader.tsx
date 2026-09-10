import React from 'react';
import { Button } from '@/components/ui/Button';

interface ProductHeaderProps {
  totalCount?: number;
  onAddProduct: () => void;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({
  totalCount = 0,
  onAddProduct,
}) => {
  return (
    <div className="module-header">
      <div className="module-header-info">
        <h1 className="module-title">Power Equipment & Asset Catalog</h1>
        <p className="module-subtitle">
          Manage generators, inverters, energy storage units, and switchgear assets across your industrial grid.
        </p>
      </div>
      <div className="module-header-actions">
        <div className="stats-pill">
          <span className="stats-num">{totalCount}</span>
          <span className="stats-label">Total Assets</span>
        </div>
        <Button onClick={onAddProduct} size="md">
          + Deploy New Asset
        </Button>
      </div>
    </div>
  );
};
