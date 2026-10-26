import { z } from 'zod';
import { PROFORMA_INVOICE_STATUSES } from '../types/proforma-invoice.types.js';

export const createProformaInvoiceSchema = z.object({
  validityDate: z.string().optional().nullable().transform((val) => (val && val.trim() ? val : null)),
  notes: z.string().max(2000).optional().nullable(),
  paymentTerms: z.string().max(1000).optional().nullable(),
  deliveryTerms: z.string().max(1000).optional().nullable(),
  expectedDeliveryTimeline: z.string().max(100).optional().nullable(),
  bankDetails: z.string().max(1000).optional().nullable(),
  advanceAmountRequested: z.number().min(0).optional(),
  items: z
    .array(
      z.object({
        salesOrderItemId: z.string().uuid(),
        quantity: z.number().positive('Quantity must be greater than zero'),
      })
    )
    .optional(),
});

export const updateProformaInvoiceSchema = z.object({
  validityDate: z.string().optional().nullable().transform((val) => (val && val.trim() ? val : null)),
  notes: z.string().max(2000).optional().nullable(),
  paymentTerms: z.string().max(1000).optional().nullable(),
  deliveryTerms: z.string().max(1000).optional().nullable(),
  expectedDeliveryTimeline: z.string().max(100).optional().nullable(),
  bankDetails: z.string().max(1000).optional().nullable(),
  advanceAmountRequested: z.number().min(0).optional(),
});

export const cancelProformaInvoiceSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters').max(500),
});

export const sendProformaEmailSchema = z.object({
  to: z.string().email('Valid recipient email is required').optional(),
  subject: z.string().max(255).optional(),
  customMessage: z.string().max(2000).optional(),
});

export const listProformaInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(PROFORMA_INVOICE_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
  salesOrderId: z.string().uuid().optional(),
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
