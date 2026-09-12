import React from 'react';
import { Product } from '../../types/product.types';
import { ProductStatusBadge } from '../../components/ProductStatusBadge';
import { ProductPrice } from '../../components/ProductPrice';
import { formatDate } from '../../utils/productFormatters';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import { Pencil, Trash2 } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDeployFirst?: () => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
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
    <div className="table-wrapper">
      <div className="table-scroll-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th style={{ minWidth: '280px' }}>EQUIPMENT & SPECIFICATIONS</th>
              <th style={{ minWidth: '140px' }}>CATEGORY</th>
              <th style={{ minWidth: '130px' }}>MODEL / SKU</th>
              <th style={{ minWidth: '130px' }}>UNIT VALUE</th>
              <th style={{ minWidth: '130px' }}>STOCK RESERVE</th>
              <th style={{ minWidth: '140px' }}>TELEMETRY STATUS</th>
              <th style={{ minWidth: '120px' }}>REGISTERED</th>
              <th className="text-right" style={{ minWidth: '150px' }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const stockStatus =
                product.stockQuantity === 0
                  ? 'out'
                  : product.stockQuantity < 15
                  ? 'low'
                  : 'good';

              return (
                <tr key={product.id} className="table-row-item">
                  <td>
                    <div className="table-product-cell">
                      <div className="product-category-avatar">
                        {getCategoryIcon(product.category, 18)}
                      </div>
                      <div className="table-product-info">
                        <span className="product-name">{product.name}</span>
                        {product.description && (
                          <span className="product-desc" title={product.description}>
                            {product.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="category-tag">
                      <span className="category-tag-icon">{getCategoryIcon(product.category, 13)}</span>
                      <span>{product.category}</span>
                    </span>
                  </td>

                  <td>
                    <code className="sku-code">{product.sku}</code>
                  </td>

                  <td>
                    <ProductPrice price={product.price} />
                  </td>

                  <td>
                    <div className="stock-cell">
                      <span className="stock-count">{product.stockQuantity} units</span>
                      <span className={`stock-indicator-dot ${stockStatus}`} />
                    </div>
                  </td>

                  <td>
                    <ProductStatusBadge status={product.status} />
                  </td>

                  <td>
                    <span className="date-tag">{formatDate(product.createdAt)}</span>
                  </td>

                  <td>
                    <div className="table-actions">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
