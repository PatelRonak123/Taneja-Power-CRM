import React from 'react';
import { Product } from '../../types/product.types';
import { ProductStatusBadge } from '../../components/ProductStatusBadge';
import { ProductPrice } from '../../components/ProductPrice';
import { formatDate } from '../../utils/productFormatters';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Pencil, Trash2, Calendar, Package } from 'lucide-react';
import { confirmModal } from '@/utils/confirmModal';

interface ProductGridProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDeployFirst?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onEdit,
  onDelete,
  onDeployFirst,
  canEdit = true,
  canDelete = true,
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => {
        const stockPct = Math.min(100, Math.max(8, (product.stockQuantity / 100) * 100));
        const stockStatusClass =
          product.stockQuantity === 0
            ? 'bg-rose-500'
            : product.stockQuantity < 15
            ? 'bg-amber-500'
            : 'bg-emerald-500';

        return (
          <div key={product.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
            {/* Card Top Header */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                  <span>{getCategoryIcon(product.category, 14)}</span>
                  <span>{product.category}</span>
                </div>
                <ProductStatusBadge status={product.status} />
              </div>

              {/* Asset Title & SKU */}
              <h3 className="text-base font-bold text-slate-900 tracking-tight">{product.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-slate-400">SKU:</span>
                <code className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{product.sku}</code>
              </div>

              {product.description && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed" title={product.description}>
                  {product.description}
                </p>
              )}

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl my-4 border border-slate-100">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Unit Value</span>
                  <div className="mt-0.5">
                    <ProductPrice price={product.price} />
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Inventory</span>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs font-bold text-slate-800">
                    <Package size={14} className="text-slate-400" />
                    <span>{product.stockQuantity} units</span>
                  </div>
                </div>
              </div>

              {/* Stock Health Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Stock Reserve</span>
                  <span className="font-semibold text-slate-700">
                    {product.stockQuantity === 0
                      ? 'Out of Stock'
                      : product.stockQuantity < 15
                      ? 'Low Stock'
                      : 'Nominal'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stockStatusClass}`}
                    style={{ width: `${stockPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card Footer with Metadata & Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar size={13} />
                <span>{formatDate(product.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    onClick={() => onEdit(product)}
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    onClick={async () => {
                      const isConfirmed = await confirmModal.danger(
                        'Delete Equipment Asset',
                        `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
                        'Delete'
                      );
                      if (isConfirmed) {
                        onDelete(product.id);
                      }
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductGrid;
