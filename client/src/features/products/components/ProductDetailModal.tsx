import React from 'react';
import { Product } from '../types/product.types';
import { Modal } from '@/components/ui/Modal';
import { ProductStatusBadge } from './ProductStatusBadge';
import { ProductPrice } from './ProductPrice';
import { getCategoryIcon } from '../utils/categoryIcons';
import { formatDate } from '../utils/productFormatters';
import { useAuthStore } from '@/stores/authStore';
import {
  Tag,
  Cpu,
  Percent,
  GitFork,
  FileSpreadsheet,
  HelpCircle,
} from 'lucide-react';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { user } = useAuthStore();
  if (!product) return null;

  const role = (user?.role || '').toUpperCase();
  const designation = (user?.designation || '').toLowerCase();
  const canViewCommercial =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    role === 'SALES' ||
    role === 'ACCOUNTANT' ||
    designation.includes('sales') ||
    designation.includes('accountant');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Catalogue Master Details"
      maxWidth="lg"
    >
      <div className="space-y-6 text-xs text-slate-700 animate-in fade-in">
        {/* Header Hero Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
              {getCategoryIcon(product.category, 22)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">{product.name}</h3>
                <ProductStatusBadge status={product.status} size="xs" />
                {product.priceOnRequest && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <HelpCircle size={12} />
                    <span>Price on Request</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-slate-500 font-mono text-[11px] flex-wrap">
                <span>SKU: <strong>{product.sku}</strong></span>
                {product.brand && <span>Brand: <strong className="text-slate-700">{product.brand}</strong></span>}
                {product.model && <span>Model: <strong className="text-slate-700">{product.model}</strong></span>}
                {product.series && <span>Series: <strong className="text-slate-700">{product.series}</strong></span>}
              </div>
            </div>
          </div>

          <div className="shrink-0 md:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Standard Price</span>
            <div className="text-base font-bold text-slate-900">
              {product.priceOnRequest ? (
                <span className="text-amber-700 text-xs">On Request (₹0.00)</span>
              ) : (
                <ProductPrice price={product.price} />
              )}
            </div>
            {product.mrp && (
              <div className="text-[11px] text-slate-500 line-through">
                MRP: ₹{Number(product.mrp).toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Basic Identifiers & Hierarchy */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Tag size={14} className="text-blue-600" />
            <span>Master Identifiers & Relationships</span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 border border-slate-200 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Category</span>
              <p className="font-medium text-slate-800">{product.category}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Sub-Model</span>
              <p className="font-medium text-slate-800">{product.subModel || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Unit of Measure</span>
              <p className="font-medium text-slate-800">{product.unit || 'NOS'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Stock Reserve</span>
              <p className="font-medium text-slate-800">{product.stockQuantity} units</p>
            </div>
          </div>

          {/* Parent Product Hierarchy Card */}
          {product.parentProduct && (
            <div className="mt-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center gap-2.5">
              <GitFork size={16} className="text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                  Associated Parent UPS Equipment
                </span>
                <p className="text-xs font-semibold text-indigo-950">
                  {product.parentProduct.name} ({product.parentProduct.sku})
                  {product.parentProduct.model ? ` • Model: ${product.parentProduct.model}` : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Technical Specifications & Commercial Rules */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Cpu size={14} className="text-blue-600" />
            <span>Commercial & Technical Attributes</span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 border border-slate-200 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Capacity / Rating</span>
              <p className="font-medium text-slate-800">{product.capacityRating || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Phase</span>
              <p className="font-medium text-slate-800">{product.phase || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">HSN / SAC Code</span>
              <p className="font-mono font-medium text-slate-800">{product.hsnSac || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">GST Rate</span>
              <p className="font-medium text-slate-800">
                {product.gstRate !== null && product.gstRate !== undefined ? `${product.gstRate}%` : '—'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Min Order Qty (MOQ)</span>
              <p className="font-medium text-slate-800">{product.moq ? `${product.moq} ${product.unit || 'NOS'}` : '1'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Warranty Terms</span>
              <p className="font-medium text-slate-800">{product.warrantyDescription || 'Standard Warranty'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Price Range</span>
              <p className="font-medium text-slate-800">
                {product.minPrice && product.maxPrice
                  ? `₹${Number(product.minPrice).toLocaleString('en-IN')} – ₹${Number(product.maxPrice).toLocaleString('en-IN')}`
                  : 'Fixed Pricing'}
              </p>
            </div>
          </div>

          {product.technicalSpecifications && (
            <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                Technical Specifications
              </span>
              <p className="text-xs text-slate-700 whitespace-pre-line font-mono text-[11px]">
                {product.technicalSpecifications}
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Confidential Commercial Pricing Tiers (Role Restricted) */}
        {canViewCommercial && (
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Percent size={14} className="text-emerald-600" />
              <span>Internal Commercial Pricing Tiers (Confidential)</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-emerald-50/40 p-3.5 border border-emerald-200/80 rounded-xl">
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">Dealer Price</span>
                <p className="font-bold text-slate-900">
                  {product.dealerPrice ? `₹${Number(product.dealerPrice).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">Partner Price</span>
                <p className="font-bold text-slate-900">
                  {product.partnerPrice ? `₹${Number(product.partnerPrice).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">DTP (Dealer Transfer)</span>
                <p className="font-bold text-slate-900">
                  {product.dtp ? `₹${Number(product.dtp).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">Recommended Price</span>
                <p className="font-bold text-slate-900">
                  {product.recommendedPrice ? `₹${Number(product.recommendedPrice).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">Basic Price</span>
                <p className="font-medium text-slate-800">
                  {product.basicPrice ? `₹${Number(product.basicPrice).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">GST-Paid Price</span>
                <p className="font-medium text-slate-800">
                  {product.gstPaidPrice ? `₹${Number(product.gstPaidPrice).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">Min Price Bound</span>
                <p className="font-medium text-slate-800">
                  {product.minPrice ? `₹${Number(product.minPrice).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">Max Price Bound</span>
                <p className="font-medium text-slate-800">
                  {product.maxPrice ? `₹${Number(product.maxPrice).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Provenance & Audit Traceability */}
        {product.sourceSheet && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-slate-400" />
              <span>
                Source Provenance: Sheet <strong>{product.sourceSheet}</strong>, Row <strong>{product.sourceRowNumber}</strong>
              </span>
            </div>
            <span>Registered: {formatDate(product.createdAt)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
