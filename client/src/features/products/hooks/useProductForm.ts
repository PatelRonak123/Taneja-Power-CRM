import { useState } from 'react';
import { productFormSchema, ProductFormData } from '../validators/product.validator';
import { useProducts } from './useProducts';
import { Product } from '../types/product.types';
import { toast } from '../../../utils/toast';

interface UseProductFormProps {
  initialData?: Product | null;
  onSuccess: () => void;
}

export const useProductForm = ({ initialData, onSuccess }: UseProductFormProps) => {
  const { createProduct, updateProduct, isCreating, isUpdating } = useProducts();

  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    category: initialData?.category || 'Generators',
    price: initialData?.price || 0,
    stockQuantity: initialData?.stockQuantity || 0,
    status: initialData?.status || 'ACTIVE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleChange = (field: keyof ProductFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const validation = productFormSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      if (initialData?.id) {
        await updateProduct({ id: initialData.id, payload: validation.data });
        toast.success('Equipment asset updated successfully');
      } else {
        await createProduct(validation.data);
        toast.success('Equipment asset created successfully');
      }
      onSuccess();
    } catch (err: any) {
      const msg = err.message || 'Failed to save product';
      setGeneralError(msg);
      toast.error('Failed to save product', msg);
    }
  };

  return {
    formData,
    errors,
    generalError,
    isSubmitting: isCreating || isUpdating,
    handleChange,
    handleSubmit,
  };
};
