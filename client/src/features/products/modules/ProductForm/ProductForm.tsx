import React from 'react';
import { Product } from '../../types/product.types';
import { useProductForm } from '../../hooks/useProductForm';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
          {generalError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Equipment Name *"
          placeholder="e.g. Cummins Diesel Generator 500kVA"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
        />

        <Input
          label="SKU / Model Code *"
          placeholder="e.g. GEN-DSL-500K"
          value={formData.sku}
          onChange={(e) => handleChange('sku', e.target.value)}
          error={errors.sku}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Category *</label>
          <select
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            <option value="Generators">Generators</option>
            <option value="Inverters">Inverters</option>
            <option value="Batteries">Batteries</option>
            <option value="Switchgear">Switchgear</option>
            <option value="Solar Panels">Solar Panels</option>
          </select>
          {errors.category && <p className="text-xs text-rose-500">{errors.category}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Operational Status *</label>
          <select
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as any)}
          >
            <option value="ACTIVE">Operational / In Stock</option>
            <option value="INACTIVE">Maintenance / Inactive</option>
            <option value="OUT_OF_STOCK">Depleted / Out of Stock</option>
          </select>
          {errors.status && <p className="text-xs text-rose-500">{errors.status}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Unit Price ($ USD) *"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.price || ''}
          onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
          error={errors.price}
        />

        <Input
          label="Initial Inventory Quantity *"
          type="number"
          placeholder="0"
          value={formData.stockQuantity || ''}
          onChange={(e) => handleChange('stockQuantity', parseInt(e.target.value, 10) || 0)}
          error={errors.stockQuantity}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">Technical Description</label>
        <textarea
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          rows={3}
          placeholder="Detailed engineering specifications, warranty, ratings..."
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {product ? 'Save Changes' : 'Deploy Asset'}
        </Button>
      </div>
    </form>
  );
};
