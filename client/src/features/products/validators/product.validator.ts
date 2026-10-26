import { z } from 'zod';

export const productFormSchema = z.object({
  name: z.string().min(2, 'Equipment name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU / Model code must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  stockQuantity: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']),
});

export type ProductFormData = z.infer<typeof productFormSchema>;
