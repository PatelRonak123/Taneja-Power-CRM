import { z } from 'zod';

export const listCustomerEquipmentQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  conditionStatus: z.enum(['OPERATIONAL', 'NEEDS_REPAIR', 'FAULTY', 'REPAIRED']).optional(),
  assetStatus: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  serialNumber: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['assetNumber', 'deliveryDate', 'createdAt', 'productName']).default('deliveryDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateCustomerEquipmentSchema = z.object({
  destinationId: z.string().uuid().nullable().optional(),
  installationLocation: z.string().max(500).nullable().optional(),
  installationNotes: z.string().max(2000).nullable().optional(),
  installationDate: z.string().datetime({ offset: true }).or(z.string().date()).nullable().optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  conditionStatus: z.enum(['OPERATIONAL', 'NEEDS_REPAIR', 'FAULTY', 'REPAIRED']).optional(),
  assetStatus: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const manualCreateCustomerEquipmentSchema = z.object({
  customerId: z.string().uuid({ message: 'Valid customer ID is required' }),
  productId: z.string().uuid({ message: 'Valid product ID is required' }),
  serialNumber: z.string().max(100).optional().nullable(),
  productName: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  make: z.string().max(100).optional().nullable(),
  capacityRating: z.string().max(100).optional().nullable(),
  hsnSac: z.string().max(50).optional().nullable(),
  destinationId: z.string().uuid().optional().nullable(),
  installationLocation: z.string().max(500).optional().nullable(),
  installationNotes: z.string().max(2000).optional().nullable(),
  installationDate: z.string().datetime({ offset: true }).or(z.string().date()).optional().nullable(),
  deliveryDate: z.string().datetime({ offset: true }).or(z.string().date()).default(() => new Date().toISOString()),
  conditionStatus: z.enum(['OPERATIONAL', 'NEEDS_REPAIR', 'FAULTY', 'REPAIRED']).default('OPERATIONAL'),
  assetStatus: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  legacyReason: z.string().min(5, 'Reason for manual legacy asset creation is required'),
});

export type ListCustomerEquipmentQuery = z.infer<typeof listCustomerEquipmentQuerySchema>;
export type UpdateCustomerEquipmentInput = z.infer<typeof updateCustomerEquipmentSchema>;
export type ManualCreateCustomerEquipmentInput = z.infer<typeof manualCreateCustomerEquipmentSchema>;
