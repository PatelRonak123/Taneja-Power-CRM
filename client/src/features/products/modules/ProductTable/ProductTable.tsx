import React from 'react';
import { Product } from '../../types/product.types';
import { ProductStatusBadge } from '../../components/ProductStatusBadge';
import { ProductPrice } from '../../components/ProductPrice';
import { formatDate } from '../../utils/productFormatters';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { Pencil, Trash2, Package, Plus, SlidersHorizontal, History, Eye, GitFork, HelpCircle } from 'lucide-react';
import { confirmModal } from '@/utils/confirmModal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmptyState,
} from '../../../../components/ui/table';
import { Button } from '@/components/ui/Button';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (product: Product) => void;
  onDeployFirst?: () => void;
  onAdjustStock?: (product: Product) => void;
  onViewHistory?: (product: Product) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDelete,
  onViewDetails,
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
              <TableHead className="min-w-64">Equipment & Identifiers</TableHead>
              <TableHead className="min-w-32">Category</TableHead>
              <TableHead className="min-w-30">Brand / Model</TableHead>
              <TableHead className="min-w-28">SKU Code</TableHead>
              <TableHead align="right" className="min-w-32">Commercial Price</TableHead>
              <TableHead align="right" className="min-w-28">Stock Reserve</TableHead>
              <TableHead className="min-w-32">Status</TableHead>
              <TableHead className="min-w-24">Registered</TableHead>
              <TableHead align="right" className="min-w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableEmptyState
                colSpan={9}
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
                    {/* Equipment & Identifiers */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                          {getCategoryIcon(product.category, 16)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <button
                            type="button"
                            onClick={() => onViewDetails && onViewDetails(product)}
                            className="text-[13px] font-semibold text-slate-900 hover:text-blue-600 truncate text-left cursor-pointer transition-colors"
                          >
                            {product.name}
                          </button>
                          {product.parentProduct ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded w-fit mt-0.5">
                              <GitFork size={11} />
                              <span>Parent UPS: {product.parentProduct.name}</span>
                            </span>
                          ) : product.capacityRating ? (
                            <span className="text-[11px] text-slate-500 line-clamp-1 max-w-xs font-normal">
                              Rating: {product.capacityRating} {product.phase ? `(${product.phase})` : ''}
                            </span>
                          ) : product.description ? (
                            <span className="text-xs text-slate-500 line-clamp-1 max-w-xs font-normal" title={product.description}>
                              {product.description}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        <span>{getCategoryIcon(product.category, 13)}</span>
                        <span>{product.category}</span>
                      </span>
                    </TableCell>

                    {/* Brand / Model */}
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {product.brand || '—'}
                        </span>
                        {product.model && (
                          <span className="text-[11px] text-slate-500 truncate" title={product.model}>
                            {product.model}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* SKU */}
                    <TableCell>
                      <code className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {product.sku}
                      </code>
                    </TableCell>

                    {/* Price / Price on Request */}
                    <TableCell align="right" numeric className="tabular-nums">
                      {product.priceOnRequest ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <HelpCircle size={11} />
                            <span>On Request</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">₹0.00 Base</span>
                        </div>
                      ) : product.minPrice && product.maxPrice ? (
                        <div className="inline-flex flex-col items-end">
                          <ProductPrice price={product.price} />
                          <span className="text-[10px] text-slate-500 font-mono">
                            ₹{Number(product.minPrice).toLocaleString('en-IN')} - ₹{Number(product.maxPrice).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ) : (
                        <ProductPrice price={product.price} />
                      )}
                    </TableCell>

                    {/* Stock Reserve */}
                    <TableCell align="right" numeric>
                      <div className="inline-flex items-center justify-end gap-1.5 tabular-nums">
                        <span className="text-xs font-semibold text-slate-800 tabular-nums">{product.stockQuantity} units</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${stockStatus} shrink-0`} />
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ProductStatusBadge status={product.status} size="xs" />
                      </div>
                    </TableCell>

                    {/* Registered Date */}
                    <TableCell className="text-xs text-slate-500 font-normal tabular-nums whitespace-nowrap">
                      {formatDate(product.createdAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onViewDetails && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-blue-600"
                            onClick={() => onViewDetails(product)}
                            title="View Full Specifications"
                            aria-label={`View details for ${product.name}`}
                          >
                            <Eye size={13} />
                          </button>
                        )}
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
    </div>
  );
};

export default ProductTable;
