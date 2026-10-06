import { z } from 'zod';
import { SUPPLIER_STATUSES, PO_STATUSES, GRN_STATUSES } from '../../../config/constants.js';

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const createSupplierSchema = z.object({
  body: z.object({
    supplierCode: z.string().trim().min(2).max(50).optional().nullable().or(z.literal('')),
    name: z.string().trim().min(2, 'Supplier name must be at least 2 characters'),
    legalName: z.string().trim().max(255).optional().nullable(),
    contactPerson: z.string().trim().max(255).optional().nullable(),
    phone: z.string().trim().max(50).optional().nullable(),
    email: z.string().trim().email('Invalid email address').optional().nullable().or(z.literal('')),
    address: z.string().trim().optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    pincode: z.string().trim().max(20).optional().nullable(),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(gstinRegex, 'Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)')
      .optional()
      .nullable()
      .or(z.literal('')),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(panRegex, 'Invalid PAN format (e.g. ABCDE1234F)')
      .optional()
      .nullable()
      .or(z.literal('')),
    paymentTerms: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    status: z
      .enum([SUPPLIER_STATUSES.ACTIVE, SUPPLIER_STATUSES.INACTIVE], {
        errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
      })
      .default(SUPPLIER_STATUSES.ACTIVE),
  }),
});

export const updateSupplierSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid supplier ID'),
  }),
  body: z.object({
    supplierCode: z.string().trim().min(2).max(50).optional(),
    name: z.string().trim().min(2, 'Supplier name must be at least 2 characters').optional(),
    legalName: z.string().trim().max(255).optional().nullable(),
    contactPerson: z.string().trim().max(255).optional().nullable(),
    phone: z.string().trim().max(50).optional().nullable(),
    email: z.string().trim().email('Invalid email address').optional().nullable().or(z.literal('')),
    address: z.string().trim().optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    pincode: z.string().trim().max(20).optional().nullable(),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(gstinRegex, 'Invalid GSTIN format')
      .optional()
      .nullable()
      .or(z.literal('')),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(panRegex, 'Invalid PAN format')
      .optional()
      .nullable()
      .or(z.literal('')),
    paymentTerms: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    status: z
      .enum([SUPPLIER_STATUSES.ACTIVE, SUPPLIER_STATUSES.INACTIVE], {
        errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
      })
      .optional(),
  }),
});

export const listSuppliersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
  }),
});

export const getSupplierByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid supplier ID'),
  }),
});

const poItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer greater than 0'),
  unitCost: z.coerce.number().min(0, 'Unit cost cannot be negative'),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').default(0),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: z.string().uuid('Invalid supplier ID'),
    orderDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    termsAndConditions: z.string().trim().optional().nullable(),
    items: z.array(poItemSchema).min(1, 'Purchase order must have at least one item'),
  }),
});

export const updatePurchaseOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid purchase order ID'),
  }),
  body: z.object({
    supplierId: z.string().uuid('Invalid supplier ID').optional(),
    orderDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    termsAndConditions: z.string().trim().optional().nullable(),
    items: z.array(poItemSchema).min(1, 'Purchase order must have at least one item').optional(),
  }),
});

export const listPurchaseOrdersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
  }),
});

export const getPurchaseOrderByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid purchase order ID'),
  }),
});

const grnItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid('Invalid purchase order item ID'),
  receivedQuantity: z.coerce.number().int().positive('Received quantity must be greater than 0'),
});

export const createGoodsReceiptSchema = z.object({
  body: z.object({
    purchaseOrderId: z.string().uuid('Invalid purchase order ID'),
    receiptDate: z.string().optional(),
    notes: z.string().trim().optional().nullable(),
    items: z.array(grnItemSchema).min(1, 'Goods receipt must have at least one item'),
    autoPost: z.boolean().optional().default(false),
  }),
});

export const postGoodsReceiptSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid goods receipt ID'),
  }),
});

export const listGoodsReceiptsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    purchaseOrderId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
  }),
});

export const getGoodsReceiptByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid goods receipt ID'),
  }),
});
