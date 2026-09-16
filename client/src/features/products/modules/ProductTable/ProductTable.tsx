import React from 'react';
import { Product } from '../../types/product.types';
import { ProductStatusBadge } from '../../components/ProductStatusBadge';
import { ProductPrice } from '../../components/ProductPrice';
import { formatDate } from '../../utils/productFormatters';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { EmptyState } from '@/components/feedback/EmptyState';
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-3.5 min-w-70">EQUIPMENT & SPECIFICATIONS</th>
              <th className="px-4 py-3.5 min-w-35">CATEGORY</th>
              <th className="px-4 py-3.5 min-w-32.5">MODEL / SKU</th>
              <th className="px-4 py-3.5 min-w-32.5">UNIT VALUE</th>
              <th className="px-4 py-3.5 min-w-32.5">STOCK RESERVE</th>
              <th className="px-4 py-3.5 min-w-35">TELEMETRY STATUS</th>
              <th className="px-4 py-3.5 min-w-30">REGISTERED</th>
              <th className="px-6 py-3.5 min-w-37.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => {
              const stockStatus =
                product.stockQuantity === 0
                  ? 'bg-rose-500'
                  : product.stockQuantity < 15
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              return (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                        {getCategoryIcon(product.category, 18)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{product.name}</span>
                        {product.description && (
                          <span className="text-xs text-slate-500 line-clamp-1 max-w-xs" title={product.description}>
                            {product.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                      <span>{getCategoryIcon(product.category, 13)}</span>
                      <span>{product.category}</span>
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <code className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {product.sku}
                    </code>
                  </td>

                  <td className="px-4 py-4">
                    <ProductPrice price={product.price} />
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{product.stockQuantity} units</span>
                      <span className={`w-2 h-2 rounded-full ${stockStatus}`} />
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <ProductStatusBadge status={product.status} />
                  </td>

                  <td className="px-4 py-4">
                    <span className="text-xs text-slate-500 font-medium">{formatDate(product.createdAt)}</span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        onClick={() => onEdit(product)}
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${product.name}?`)) {
                            onDelete(product.id);
                          }
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
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
