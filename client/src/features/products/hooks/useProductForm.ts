import { useState, useEffect } from 'react';
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

  const getInitialState = (data?: Product | null): ProductFormData => ({
    name: data?.name || '',
    sku: data?.sku || '',
    description: data?.description || '',
    category: data?.category || 'UPS Systems',
    price: data?.price !== undefined ? data.price : 0,
    stockQuantity: data?.stockQuantity !== undefined ? data.stockQuantity : 0,
    status: data?.status || 'ACTIVE',

    brand: data?.brand || '',
    model: data?.model || '',
    subModel: data?.subModel || '',
    series: data?.series || '',
    warrantyDescription: data?.warrantyDescription || '',
    hsnSac: data?.hsnSac || '',
    gstRate: data?.gstRate !== undefined && data.gstRate !== null ? data.gstRate : null,
    unit: data?.unit || 'NOS',
    moq: data?.moq !== undefined && data.moq !== null ? data.moq : null,
    mrp: data?.mrp !== undefined && data.mrp !== null ? data.mrp : null,
    priceOnRequest: data?.priceOnRequest ?? false,

    minPrice: data?.minPrice !== undefined && data.minPrice !== null ? data.minPrice : null,
    maxPrice: data?.maxPrice !== undefined && data.maxPrice !== null ? data.maxPrice : null,

    dealerPrice: data?.dealerPrice !== undefined && data.dealerPrice !== null ? data.dealerPrice : null,
    partnerPrice: data?.partnerPrice !== undefined && data.partnerPrice !== null ? data.partnerPrice : null,
    dtp: data?.dtp !== undefined && data.dtp !== null ? data.dtp : null,
    basicPrice: data?.basicPrice !== undefined && data.basicPrice !== null ? data.basicPrice : null,
    gstPaidPrice: data?.gstPaidPrice !== undefined && data.gstPaidPrice !== null ? data.gstPaidPrice : null,
    recommendedPrice: data?.recommendedPrice !== undefined && data.recommendedPrice !== null ? data.recommendedPrice : null,

    capacityRating: data?.capacityRating || '',
    phase: data?.phase || '',
    technicalSpecifications: data?.technicalSpecifications || '',
    parentProductId: data?.parentProductId || null,
  });

  const [formData, setFormData] = useState<ProductFormData>(() => getInitialState(initialData));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(getInitialState(initialData));
    setErrors({});
    setGeneralError(null);
  }, [initialData]);

  const handleChange = (field: keyof ProductFormData, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // If toggling priceOnRequest to true and price is currently 0 or unset, default price to 0
      if (field === 'priceOnRequest' && value === true && !prev.price) {
        next.price = 0;
      }
      return next;
    });

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

    // Normalize empty strings to null for optional DB columns
    const normalizedData = {
      ...formData,
      brand: formData.brand?.trim() || null,
      model: formData.model?.trim() || null,
      subModel: formData.subModel?.trim() || null,
      series: formData.series?.trim() || null,
      warrantyDescription: formData.warrantyDescription?.trim() || null,
      hsnSac: formData.hsnSac?.trim() || null,
      capacityRating: formData.capacityRating?.trim() || null,
      phase: formData.phase?.trim() || null,
      description: formData.description?.trim() || null,
      technicalSpecifications: formData.technicalSpecifications?.trim() || null,
      parentProductId: formData.parentProductId || null,
    };

    const validation = productFormSchema.safeParse(normalizedData);
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
