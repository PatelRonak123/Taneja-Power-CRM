import React from 'react';
import { Product } from '../../types/product.types';
import { ProductStatusBadge } from '../../components/ProductStatusBadge';
import { ProductPrice } from '../../components/ProductPrice';
import { formatDate } from '../../utils/productFormatters';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';

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
      <table className="enterprise-table">
        <thead>
          <tr>
            <th>EQUIPMENT & DETAILS</th>
            <th>CATEGORY</th>
            <th>SKU / CODE</th>
            <th>UNIT PRICE</th>
            <th>STOCK QTY</th>
            <th>STATUS</th>
            <th>REGISTERED</th>
            <th className="text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="table-product-info">
                  <span className="product-name">{product.name}</span>
                  {product.description && (
                    <span className="product-desc">{product.description}</span>
                  )}
                </div>
              </td>
              <td>
                <span className="category-tag">{product.category}</span>
              </td>
              <td>
                <code className="sku-code">{product.sku}</code>
              </td>
              <td>
                <ProductPrice price={product.price} />
              </td>
              <td>
                <span className="stock-count">{product.stockQuantity} units</span>
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
                    onClick={() => onEdit(product)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
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
          ))}
        </tbody>
      </table>
    </div>
  );
};
