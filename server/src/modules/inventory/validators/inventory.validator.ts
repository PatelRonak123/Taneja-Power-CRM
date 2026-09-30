import { z } from 'zod';
import { INVENTORY_MOVEMENT_TYPES, INVENTORY_REFERENCE_TYPES } from '../../../config/constants.js';

export const stockAdjustmentSchema = z.object({
  body: z
    .object({
      productId: z.string().uuid('Invalid product ID format'),
      quantity: z.coerce.number().int().optional(),
      newQuantity: z.coerce.number().int().min(0, 'Physical count cannot be negative').optional(),
      reason: z.string().min(3, 'Reason/remarks must be at least 3 characters'),
      referenceId: z.string().optional(),
    })
    .refine((data) => data.quantity !== undefined || data.newQuantity !== undefined, {
      message: 'Either adjustment quantity or new target physical count must be provided',
      path: ['quantity'],
    }),
});

export const stockInSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
    referenceType: z
      .enum([INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT])
      .default(INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT),
    referenceId: z.string().optional(),
    reason: z.string().min(3, 'Reason must be at least 3 characters'),
  }),
});

export const stockOutSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
    referenceType: z.enum([
      INVENTORY_REFERENCE_TYPES.AMC,
      INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT,
    ]),
    referenceId: z.string().optional(),
    reason: z.string().min(3, 'Reason must be at least 3 characters'),
  }),
});

export const listInventorySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).optional(),
    lowStockOnly: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const listStockMovementsSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID format'),
  }),
  query: z.object({
    movementType: z.enum([
      INVENTORY_MOVEMENT_TYPES.IN,
      INVENTORY_MOVEMENT_TYPES.OUT,
      INVENTORY_MOVEMENT_TYPES.ADJUSTMENT,
    ]).optional(),
    referenceType: z.enum([
      INVENTORY_REFERENCE_TYPES.AMC,
      INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT,
      INVENTORY_REFERENCE_TYPES.PURCHASE_RECEIPT,
      INVENTORY_REFERENCE_TYPES.DISPATCH,
    ]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export type StockAdjustmentInputSchema = z.infer<typeof stockAdjustmentSchema>['body'];
export type StockInInputSchema = z.infer<typeof stockInSchema>['body'];
export type StockOutInputSchema = z.infer<typeof stockOutSchema>['body'];
export type ListInventoryQuery = z.infer<typeof listInventorySchema>['query'];
export type ListStockMovementsQuery = z.infer<typeof listStockMovementsSchema>['query'];
