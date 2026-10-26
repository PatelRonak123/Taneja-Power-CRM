import { z } from 'zod';

export const productFormSchema = z
  .object({
    name: z.string().min(2, 'Equipment name must be at least 2 characters'),
    sku: z.string().min(2, 'SKU / Model code must be at least 2 characters'),
    description: z.string().optional().nullable(),
    category: z.string().min(1, 'Category is required'),
    price: z.coerce.number().min(0, 'Price cannot be negative'),
    stockQuantity: z.coerce.number().int().min(0, 'Quantity cannot be negative').default(0),
    status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).default('ACTIVE'),

    // Catalogue Master Fields
    brand: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    subModel: z.string().optional().nullable(),
    series: z.string().optional().nullable(),
    warrantyDescription: z.string().optional().nullable(),
    hsnSac: z.string().optional().nullable(),
    gstRate: z.coerce.number().min(0, 'GST rate must be >= 0%').max(100, 'GST rate must be <= 100%').optional().nullable(),
    unit: z.string().optional().default('NOS'),
    moq: z.coerce.number().int().min(1, 'MOQ must be at least 1').optional().nullable(),
    mrp: z.coerce.number().min(0, 'MRP cannot be negative').optional().nullable(),
    priceOnRequest: z.boolean().default(false),

    // Price Bounds
    minPrice: z.coerce.number().min(0, 'Minimum price cannot be negative').optional().nullable(),
    maxPrice: z.coerce.number().min(0, 'Maximum price cannot be negative').optional().nullable(),

    // Commercial confidential tiers
    dealerPrice: z.coerce.number().min(0).optional().nullable(),
    partnerPrice: z.coerce.number().min(0).optional().nullable(),
    dtp: z.coerce.number().min(0).optional().nullable(),
    basicPrice: z.coerce.number().min(0).optional().nullable(),
    gstPaidPrice: z.coerce.number().min(0).optional().nullable(),
    recommendedPrice: z.coerce.number().min(0).optional().nullable(),

    // Technical Specifications
    capacityRating: z.string().optional().nullable(),
    phase: z.string().optional().nullable(),
    technicalSpecifications: z.string().optional().nullable(),

    // Hierarchy
    parentProductId: z.string().uuid('Invalid parent product UUID').optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.priceOnRequest && data.price <= 0) {
        return false;
      }
      return true;
    },
    {
      message: 'Price must be greater than 0 unless Price on Request is enabled',
      path: ['price'],
    }
  )
  .refine(
    (data) => {
      if (
        data.minPrice !== undefined &&
        data.minPrice !== null &&
        data.maxPrice !== undefined &&
        data.maxPrice !== null
      ) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    {
      message: 'Minimum price cannot exceed maximum price',
      path: ['minPrice'],
    }
  );

export type ProductFormData = z.infer<typeof productFormSchema>;
