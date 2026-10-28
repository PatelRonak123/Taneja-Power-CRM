import React from 'react';
import { Product } from '../../types/product.types';
import { ProductStatusBadge } from '../../components/ProductStatusBadge';
import { ProductPrice } from '../../components/ProductPrice';
import { formatDate } from '../../utils/productFormatters';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { Pencil, Trash2, Package, Plus, SlidersHorizontal, History } from 'lucide-react';
import { confirmModal } from '@/utils/confirmModal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmptyState,
  TablePagination,
} from '../../../../components/ui/table';
import { Button } from '@/components/ui/Button';

interface ProductTableProps {
  products: Product[];
  page?: number;
  totalPages?: number;
  totalCount?: number;
  limit?: number;
  onPageChange?: (newPage: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDeployFirst?: () => void;
  onAdjustStock?: (product: Product) => void;
  onViewHistory?: (product: Product) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  page,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  onEdit,
  onDelete,
  onDeployFirst,
  onAdjustStock,
  onViewHistory,
  canEdit = true,
  canDelete = true,
}) => {
  return (
    <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <Table density="standard">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-64">Equipment & Specifications</TableHead>
              <TableHead className="min-w-32">Category</TableHead>
              <TableHead className="min-w-30">Model / SKU</TableHead>
              <TableHead align="right" className="min-w-30">Unit Value</TableHead>
              <TableHead align="right" className="min-w-32">Stock Reserve</TableHead>
              <TableHead className="min-w-32">Status</TableHead>
              <TableHead className="min-w-28">Registered</TableHead>
              <TableHead align="right" className="min-w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableEmptyState
                colSpan={8}
                icon={<Package size={24} />}
                title="No Power Equipment Found"
                description="No equipment matching your criteria was found. Try refining search filters or deploy a new asset."
                action={
                  onDeployFirst ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus size={14} />}
                      onClick={onDeployFirst}
                    >
                      Deploy First Asset
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              products.map((product) => {
                const stockStatus =
                  product.stockQuantity === 0
                    ? 'bg-rose-500'
                    : product.stockQuantity < 15
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                          {getCategoryIcon(product.category, 16)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-semibold text-slate-900 truncate">{product.name}</span>
                          {product.description && (
                            <span className="text-xs text-slate-500 line-clamp-1 max-w-xs font-normal" title={product.description}>
                              {product.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        <span>{getCategoryIcon(product.category, 13)}</span>
                        <span>{product.category}</span>
                      </span>
                    </TableCell>

                    <TableCell>
                      <code className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {product.sku}
                      </code>
                    </TableCell>

                    <TableCell align="right" numeric className="tabular-nums">
                      <ProductPrice price={product.price} />
                    </TableCell>

                    <TableCell align="right" numeric>
                      <div className="inline-flex items-center justify-end gap-1.5 tabular-nums">
                        <span className="text-xs font-semibold text-slate-800 tabular-nums">{product.stockQuantity} units</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${stockStatus} shrink-0`} />
                      </div>
                    </TableCell>

                    <TableCell>
                      <ProductStatusBadge status={product.status} size="xs" />
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 font-normal tabular-nums whitespace-nowrap">
                      {formatDate(product.createdAt)}
                    </TableCell>

                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onViewHistory && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
                            onClick={() => onViewHistory(product)}
                            title="View Stock Ledger History"
                            aria-label={`Audit history for ${product.name}`}
                          >
                            <History size={13} />
                          </button>
                        )}
                        {onAdjustStock && canEdit && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-700 hover:border-amber-300 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
                            onClick={() => onAdjustStock(product)}
                            title="Adjust Inventory Stock"
                            aria-label={`Adjust stock for ${product.name}`}
                          >
                            <SlidersHorizontal size={13} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
                            onClick={() => onEdit(product)}
                            title="Edit Equipment"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-rose-600"
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
                            title="Delete Equipment"
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {totalCount !== undefined && totalCount > 0 && onPageChange && (
        <TablePagination
          page={page || 1}
          totalPages={totalPages || 1}
          totalCount={totalCount}
          limit={limit || 10}
          onPageChange={onPageChange}
          entityName="equipment assets"
        />
      )}
    </div>
  );
};

export default ProductTable;
