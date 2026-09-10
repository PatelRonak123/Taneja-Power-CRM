import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters'),
    sku: z.string().min(2, 'SKU must be at least 2 characters'),
    description: z.string().optional(),
    category: z.string().min(2, 'Category is required'),
    price: z.coerce.number().positive('Price must be greater than 0'),
    stockQuantity: z.coerce.number().int().min(0, 'Stock quantity cannot be negative').default(0),
    status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).default('ACTIVE'),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format'),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    sku: z.string().min(2).optional(),
    description: z.string().optional(),
    category: z.string().min(2).optional(),
    price: z.coerce.number().positive().optional(),
    stockQuantity: z.coerce.number().int().min(0).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).optional(),
  }),
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
    status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type ListProductsQuery = z.infer<typeof listProductsSchema>['query'];
