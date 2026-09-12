import React from 'react';
import { Product } from '../../types/product.types';
import { ProductStatusBadge } from '../../components/ProductStatusBadge';
import { ProductPrice } from '../../components/ProductPrice';
import { formatDate } from '../../utils/productFormatters';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import { Pencil, Trash2, Calendar, Package } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDeployFirst?: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onEdit,
  onDelete,
  onDeployFirst,
}) => {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No Power Equipment Found"
        description="No equipment matching your criteria was found. Try refining search filters or deploy a new asset."
        actionLabel={onDeployFirst ? "+ Deploy First Asset" : undefined}
        onAction={onDeployFirst}
      />
    );
  }

  return (
    <div className="asset-grid-container">
      {products.map((product) => {
        const stockPct = Math.min(100, Math.max(8, (product.stockQuantity / 100) * 100));
        const stockStatusClass =
          product.stockQuantity === 0
            ? 'stock-out'
            : product.stockQuantity < 15
            ? 'stock-low'
            : 'stock-good';

        return (
          <div key={product.id} className="asset-card">
            {/* Card Top Header */}
            <div className="asset-card-header">
              <div className="asset-cat-badge">
                <span className="asset-cat-icon">{getCategoryIcon(product.category, 16)}</span>
                <span className="asset-cat-name">{product.category}</span>
              </div>
              <ProductStatusBadge status={product.status} />
            </div>

            {/* Asset Title & SKU */}
            <div className="asset-card-body">
              <h3 className="asset-card-title">{product.name}</h3>
              <div className="asset-sku-wrapper">
                <span className="asset-sku-label">SKU:</span>
                <code className="asset-sku-chip">{product.sku}</code>
              </div>

              {product.description && (
                <p className="asset-card-desc" title={product.description}>
                  {product.description}
                </p>
              )}

              {/* Specs Grid */}
              <div className="asset-specs-card">
                <div className="asset-spec-item">
                  <span className="asset-spec-label">Unit Value</span>
                  <ProductPrice price={product.price} />
                </div>
                <div className="asset-spec-item">
                  <span className="asset-spec-label">Inventory</span>
                  <div className="asset-stock-value">
                    <Package size={14} className="asset-stock-icon" />
                    <span>{product.stockQuantity} units</span>
                  </div>
                </div>
              </div>

              {/* Stock Health Bar */}
              <div className="asset-stock-bar-wrapper">
                <div className="asset-stock-bar-header">
                  <span>Stock Reserve</span>
                  <span className={`asset-stock-tag ${stockStatusClass}`}>
                    {product.stockQuantity === 0
                      ? 'Out of Stock'
                      : product.stockQuantity < 15
                      ? 'Low Stock'
                      : 'Nominal'}
                  </span>
                </div>
                <div className="asset-stock-track">
                  <div
                    className={`asset-stock-fill ${stockStatusClass}`}
                    style={{ width: `${stockPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card Footer with Metadata & Actions */}
            <div className="asset-card-footer">
              <div className="asset-meta-date">
                <Calendar size={13} />
                <span>{formatDate(product.createdAt)}</span>
              </div>

              <div className="asset-card-actions">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Pencil size={13} />}
                  onClick={() => onEdit(product)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 size={13} />}
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
                      onDelete(product.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductGrid;
