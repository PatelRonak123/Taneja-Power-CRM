import { z } from 'zod';

const catalogueAttributesSchema = {
  brand: z.string().min(1).max(100).optional().nullable(),
  model: z.string().min(1).max(150).optional().nullable(),
  subModel: z.string().min(1).max(100).optional().nullable(),
  series: z.string().min(1).max(100).optional().nullable(),
  warrantyDescription: z.string().min(1).max(100).optional().nullable(),
  hsnSac: z.string().min(1).max(50).optional().nullable(),
  gstRate: z.coerce.number().min(0).max(100).optional().nullable(),
  unit: z.string().min(1).max(50).optional(),
  moq: z.coerce.number().int().min(1).optional().nullable(),
  mrp: z.coerce.number().min(0).optional().nullable(),
  minPrice: z.coerce.number().min(0).optional().nullable(),
  maxPrice: z.coerce.number().min(0).optional().nullable(),
  priceOnRequest: z.boolean().optional(),
  capacityRating: z.string().min(1).max(100).optional().nullable(),
  phase: z.string().min(1).max(50).optional().nullable(),
  technicalSpecifications: z.string().optional().nullable(),
  parentProductId: z.string().uuid('Invalid parent product ID format').optional().nullable(),

  // Commercial / confidential tiers
  dealerPrice: z.coerce.number().min(0).optional().nullable(),
  partnerPrice: z.coerce.number().min(0).optional().nullable(),
  dtp: z.coerce.number().min(0).optional().nullable(),
  basicPrice: z.coerce.number().min(0).optional().nullable(),
  gstPaidPrice: z.coerce.number().min(0).optional().nullable(),
  recommendedPrice: z.coerce.number().min(0).optional().nullable(),

  // Source traceability
  sourceSheet: z.string().max(100).optional().nullable(),
  sourceRowNumber: z.coerce.number().int().positive().optional().nullable(),
};

export const createProductSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, 'Product name must be at least 2 characters'),
      sku: z.string().min(2, 'SKU must be at least 2 characters'),
      description: z.string().optional().nullable(),
      category: z.string().min(2, 'Category is required'),
      price: z.coerce.number().min(0, 'Price cannot be negative'),
      stockQuantity: z.coerce.number().int().min(0, 'Stock quantity cannot be negative').default(0),
      status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).default('ACTIVE'),
      ...catalogueAttributesSchema,
    })
    .refine(
      (data) => {
        // If priceOnRequest is false or undefined, standard product price must be > 0
        if (!data.priceOnRequest && data.price <= 0) {
          return false;
        }
        return true;
      },
      {
        message: 'Price must be greater than 0 unless priceOnRequest is true',
        path: ['price'],
      }
    )
    .refine(
      (data) => {
        // If both minPrice and maxPrice exist, minPrice <= maxPrice
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
        message: 'minPrice cannot exceed maxPrice',
        path: ['minPrice'],
      }
    ),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format'),
  }),
  body: z
    .object({
      name: z.string().min(2).optional(),
      sku: z.string().min(2).optional(),
      description: z.string().optional().nullable(),
      category: z.string().min(2).optional(),
      price: z.coerce.number().min(0).optional(),
      stockQuantity: z.coerce.number().int().min(0).optional(),
      adjustmentReason: z.string().min(3).optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).optional(),
      ...catalogueAttributesSchema,
    })
    .refine(
      (data) => {
        // If the patch explicitly declares priceOnRequest: false, price cannot be <= 0
        if (data.priceOnRequest === false && data.price !== undefined && data.price <= 0) {
          return false;
        }
        return true;
      },
      {
        message: 'Price must be greater than 0 when priceOnRequest is false',
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
        message: 'minPrice cannot exceed maxPrice',
        path: ['minPrice'],
      }
    ),
});

export const getProductByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format'),
  }),
});

export const listProductsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).optional(),
    priceOnRequest: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(500).default(10),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type ListProductsQuery = z.infer<typeof listProductsSchema>['query'];

export const importExcelProductSchema = z.object({
  body: z.object({
    fileData: z.string().min(1, 'Excel file data is required (base64)'),
    fileName: z.string().optional(),
    mode: z.enum(['upsert', 'skip_existing', 'fail_on_existing']).optional().default('upsert'),
    dryRun: z.boolean().optional().default(false),
  }),
});

export const seedExcelProductSchema = z.object({
  body: z
    .object({
      filePath: z.string().optional(),
      mode: z.enum(['upsert', 'skip_existing', 'fail_on_existing']).optional().default('upsert'),
      dryRun: z.boolean().optional().default(false),
    })
    .optional()
    .default({ mode: 'upsert', dryRun: false }),
});

export type ImportExcelProductInput = z.infer<typeof importExcelProductSchema>['body'];
export type SeedExcelProductInput = z.infer<typeof seedExcelProductSchema>['body'];

