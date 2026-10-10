import React, { useState, useEffect } from 'react';
import { Product } from '../../types/product.types';
import { useProductForm } from '../../hooks/useProductForm';
import { productService } from '../../services/productService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import {
  Tag,
  DollarSign,
  Cpu,
  GitFork,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuthStore();
  const role = (user?.role || '').toUpperCase();
  const designation = (user?.designation || '').toLowerCase();
  const canViewCommercial =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    role === 'SALES' ||
    role === 'ACCOUNTANT' ||
    designation.includes('sales') ||
    designation.includes('accountant');

  const {
    formData,
    errors,
    generalError,
    isSubmitting,
    handleChange,
    handleSubmit,
  } = useProductForm({
    initialData: product,
    onSuccess,
  });

  // Candidate parent products for hierarchy selection
  const [parentCandidates, setParentCandidates] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchParents = async () => {
      try {
        // Fetch candidates (especially UPS systems and standalone items)
        const res = await productService.getProducts({ limit: 300 });
        if (isMounted && res.data) {
          // Filter out current product if editing to prevent self-parenting
          const filtered = res.data.filter((p) => !product || p.id !== product.id);
          setParentCandidates(filtered);
        }
      } catch (err) {
        console.error('Failed to load parent product candidates', err);
      }
    };

    fetchParents();
    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  const categories = [
    'UPS Systems',
    'Stabilizers',
    'Batteries',
    'Transformers',
    'Solar Panels',
    'Solar Inverters',
    'Generators',
    'Switchgear',
    'Inverters',
  ];

  const units = ['NOS', 'SET', 'MTR', 'KG', 'LOT', 'YR', 'HR'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2">
      {generalError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* SECTION 1: BASIC DETAILS */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Tag size={15} className="text-blue-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            1. Basic Equipment Identifiers
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Equipment Name *"
            placeholder="e.g. Liebert GXT-MT+ 1kVA Online UPS"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
          />

          <Input
            label="SKU Code / Model Identity *"
            placeholder="e.g. VER-GXT-1KVA-2X"
            value={formData.sku}
            onChange={(e) => handleChange('sku', e.target.value)}
            error={errors.sku}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
            <select
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category}</p>}
          </div>

          <Input
            label="Brand / Make"
            placeholder="e.g. Vertiv, Taneja Power, Hitachi"
            value={formData.brand || ''}
            onChange={(e) => handleChange('brand', e.target.value)}
            error={errors.brand}
          />

          <Input
            label="Model Number / Code"
            placeholder="e.g. GXT MT+ 1kVA"
            value={formData.model || ''}
            onChange={(e) => handleChange('model', e.target.value)}
            error={errors.model}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Input
            label="Sub-Model"
            placeholder="e.g. Standard / Long Backup"
            value={formData.subModel || ''}
            onChange={(e) => handleChange('subModel', e.target.value)}
            error={errors.subModel}
          />

          <Input
            label="Series"
            placeholder="e.g. Liebert GXT, Microtek E2"
            value={formData.series || ''}
            onChange={(e) => handleChange('series', e.target.value)}
            error={errors.series}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Unit of Measure</label>
            <select
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              value={formData.unit || 'NOS'}
              onChange={(e) => handleChange('unit', e.target.value)}
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Operational Status *</label>
            <select
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as any)}
            >
              <option value="ACTIVE">ACTIVE (Operational / Available)</option>
              <option value="INACTIVE">INACTIVE (Unpriced / Maintenance / Hidden)</option>
              <option value="OUT_OF_STOCK">OUT OF STOCK (Depleted Reserve)</option>
            </select>
            {errors.status && <p className="text-xs text-rose-500 mt-1">{errors.status}</p>}
          </div>

          {product ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Stock Reserve (Audit Locked)
              </label>
              <div className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{product.stockQuantity} units</span>
                <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Adjust via Inventory
                </span>
              </div>
            </div>
          ) : (
            <Input
              label="Opening Stock Reserve"
              type="number"
              placeholder="0"
              value={formData.stockQuantity !== undefined ? formData.stockQuantity : ''}
              onChange={(e) => handleChange('stockQuantity', parseInt(e.target.value, 10) || 0)}
              error={errors.stockQuantity}
            />
          )}
        </div>
      </div>

      {/* SECTION 2: PRICING TIERS */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <DollarSign size={15} className="text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Commercial Pricing & Terms
            </h4>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            <input
              type="checkbox"
              checked={formData.priceOnRequest || false}
              onChange={(e) => handleChange('priceOnRequest', e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>Price on Request (PoR)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Input
            label={formData.priceOnRequest ? "Base Price (₹0.00 for PoR)" : "Standard Catalogue Price (₹) *"}
            type="number"
            step="0.01"
            placeholder="0.00"
            disabled={formData.priceOnRequest}
            value={formData.price !== undefined ? formData.price : ''}
            onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
            error={errors.price}
          />

          <Input
            label="Maximum Retail Price (MRP ₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.mrp !== null && formData.mrp !== undefined ? formData.mrp : ''}
            onChange={(e) => handleChange('mrp', e.target.value === '' ? null : parseFloat(e.target.value))}
            error={errors.mrp}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Min Price (₹)"
              type="number"
              step="0.01"
              placeholder="Min"
              value={formData.minPrice !== null && formData.minPrice !== undefined ? formData.minPrice : ''}
              onChange={(e) => handleChange('minPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
              error={errors.minPrice}
            />
            <Input
              label="Max Price (₹)"
              type="number"
              step="0.01"
              placeholder="Max"
              value={formData.maxPrice !== null && formData.maxPrice !== undefined ? formData.maxPrice : ''}
              onChange={(e) => handleChange('maxPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
              error={errors.maxPrice}
            />
          </div>
        </div>

        {/* Confidential Internal Pricing Tiers for Sales/Accountant/Manager/Admin */}
        {canViewCommercial && (
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
              Internal Commercial Tiers (Confidential)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Dealer Price (₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.dealerPrice !== null && formData.dealerPrice !== undefined ? formData.dealerPrice : ''}
                onChange={(e) => handleChange('dealerPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
              />
              <Input
                label="Partner Price (₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.partnerPrice !== null && formData.partnerPrice !== undefined ? formData.partnerPrice : ''}
                onChange={(e) => handleChange('partnerPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
              />
              <Input
                label="DTP (Dealer Transfer Price ₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.dtp !== null && formData.dtp !== undefined ? formData.dtp : ''}
                onChange={(e) => handleChange('dtp', e.target.value === '' ? null : parseFloat(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Basic Price (₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.basicPrice !== null && formData.basicPrice !== undefined ? formData.basicPrice : ''}
                onChange={(e) => handleChange('basicPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
              />
              <Input
                label="GST-Paid Price (₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.gstPaidPrice !== null && formData.gstPaidPrice !== undefined ? formData.gstPaidPrice : ''}
                onChange={(e) => handleChange('gstPaidPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
              />
              <Input
                label="Recommended Price (₹)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.recommendedPrice !== null && formData.recommendedPrice !== undefined ? formData.recommendedPrice : ''}
                onChange={(e) => handleChange('recommendedPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: COMMERCIAL & TECHNICAL DETAILS */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Cpu size={15} className="text-blue-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            3. Commercial & Technical Specifications
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <Input
            label="HSN / SAC Code"
            placeholder="e.g. 85044090"
            value={formData.hsnSac || ''}
            onChange={(e) => handleChange('hsnSac', e.target.value)}
            error={errors.hsnSac}
          />

          <Input
            label="GST Rate (%)"
            type="number"
            step="0.01"
            placeholder="18"
            value={formData.gstRate !== null && formData.gstRate !== undefined ? formData.gstRate : ''}
            onChange={(e) => handleChange('gstRate', e.target.value === '' ? null : parseFloat(e.target.value))}
            error={errors.gstRate}
          />

          <Input
            label="Min Order Qty (MOQ)"
            type="number"
            placeholder="1"
            value={formData.moq !== null && formData.moq !== undefined ? formData.moq : ''}
            onChange={(e) => handleChange('moq', e.target.value === '' ? null : parseInt(e.target.value, 10))}
            error={errors.moq}
          />

          <Input
            label="Warranty Terms"
            placeholder="e.g. 24 Months On-site"
            value={formData.warrantyDescription || ''}
            onChange={(e) => handleChange('warrantyDescription', e.target.value)}
            error={errors.warrantyDescription}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Capacity Rating"
            placeholder="e.g. 10kVA / 9kW, 150Ah"
            value={formData.capacityRating || ''}
            onChange={(e) => handleChange('capacityRating', e.target.value)}
            error={errors.capacityRating}
          />

          <Input
            label="Electrical Phase"
            placeholder="e.g. 1-Phase In / 1-Phase Out, 3-Phase"
            value={formData.phase || ''}
            onChange={(e) => handleChange('phase', e.target.value)}
            error={errors.phase}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Detailed Technical Specifications</label>
          <textarea
            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors font-mono text-xs"
            rows={3}
            placeholder="Input PF, Battery Bus V, THDi, Dimensions, Cooling..."
            value={formData.technicalSpecifications || ''}
            onChange={(e) => handleChange('technicalSpecifications', e.target.value)}
          />
        </div>
      </div>

      {/* SECTION 4: HIERARCHY & PROVENANCE */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <GitFork size={15} className="text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            4. Hierarchy & Catalogue Relationships
          </h4>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Parent Equipment Link (e.g. Host UPS for Isolation Transformers)
          </label>
          <select
            className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            value={formData.parentProductId || ''}
            onChange={(e) => handleChange('parentProductId', e.target.value || null)}
          >
            <option value="">-- No Parent (Independent Master Product) --</option>
            {parentCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) {p.brand ? `[${p.brand}]` : ''}
              </option>
            ))}
          </select>
          {errors.parentProductId && <p className="text-xs text-rose-500 mt-1">{errors.parentProductId}</p>}
        </div>

        {product?.sourceSheet && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-500">
            <FileSpreadsheet size={15} className="text-slate-400 shrink-0" />
            <span>
              Source Provenance: Sheet <strong>{product.sourceSheet}</strong>, Row <strong>{product.sourceRowNumber}</strong> (Audit Protected)
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 sticky bottom-0 bg-white py-2">
        <Button type="button" variant="outline" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
          {product ? 'Save Changes' : 'Deploy Power Asset'}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
