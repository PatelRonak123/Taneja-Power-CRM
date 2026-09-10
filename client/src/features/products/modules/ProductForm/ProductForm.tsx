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
    <form onSubmit={handleSubmit} className="product-form">
      {generalError && <div className="form-error-banner">{generalError}</div>}

      <div className="form-grid">
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

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label">Category *</label>
          <select
            className="select-control"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            <option value="Generators">Generators</option>
            <option value="Inverters">Inverters</option>
            <option value="Batteries">Batteries</option>
            <option value="Switchgear">Switchgear</option>
            <option value="Solar Panels">Solar Panels</option>
          </select>
          {errors.category && <p className="input-error">{errors.category}</p>}
        </div>

        <div className="input-group">
          <label className="input-label">Operational Status *</label>
          <select
            className="select-control"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as any)}
          >
            <option value="ACTIVE">Operational / In Stock</option>
            <option value="INACTIVE">Maintenance / Inactive</option>
            <option value="OUT_OF_STOCK">Depleted / Out of Stock</option>
          </select>
          {errors.status && <p className="input-error">{errors.status}</p>}
        </div>
      </div>

      <div className="form-grid">
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

      <div className="input-group">
        <label className="input-label">Technical Description</label>
        <textarea
          className="textarea-control"
          rows={3}
          placeholder="Detailed engineering specifications, warranty, ratings..."
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className="form-actions">
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
