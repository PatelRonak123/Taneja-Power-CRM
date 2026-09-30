import { z } from 'zod';

// ─── Sales Invoice Validators ─────────────────────────────────────────────────

export const createSalesInvoiceFromSOSchema = z.object({
  params: z.object({
    salesOrderId: z.string().uuid('Invalid sales order ID'),
  }),
  body: z.object({
    invoiceDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    paymentTerms: z.string().trim().optional().nullable(),
    // Optional partial invoicing item list. If omitted or empty, all remaining quantities are invoiced.
    items: z
      .array(
        z.object({
          salesOrderItemId: z.string().uuid('Invalid sales order item ID'),
          quantity: z.number().positive('Quantity must be greater than 0'),
        })
      )
      .optional(),
  }),
});

export const updateSalesInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID'),
  }),
  body: z.object({
    dueDate: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    paymentTerms: z.string().trim().optional().nullable(),
  }),
});

export const getSalesInvoiceByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID'),
  }),
});

export const listSalesInvoicesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    customerId: z.string().uuid().optional(),
    salesOrderId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export const submitSalesInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID'),
  }),
});

export const issueSalesInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID'),
  }),
});

export const cancelSalesInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID'),
  }),
  body: z.object({
    cancellationReason: z.string().trim().min(3, 'Cancellation reason is required (minimum 3 characters)'),
  }),
});

// ─── Vendor Invoice Validators ────────────────────────────────────────────────

export const createVendorInvoiceSchema = z.object({
  body: z.object({
    supplierId: z.string().uuid('Invalid supplier ID'),
    purchaseOrderId: z.string().uuid('Invalid purchase order ID'),
    goodsReceiptId: z.string().uuid().optional().nullable(),
    vendorInvoiceNumber: z.string().trim().min(1, 'Vendor invoice number is required'),
    invoiceDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    items: z
      .array(
        z.object({
          purchaseOrderItemId: z.string().uuid('Invalid purchase order item ID'),
          goodsReceiptItemId: z.string().uuid().optional().nullable(),
          invoicedQuantity: z.number().int().positive('Invoiced quantity must be greater than 0'),
          unitCost: z.number().nonnegative('Unit cost must be non-negative').optional(),
          taxRate: z.number().min(0).max(100).optional(),
        })
      )
      .min(1, 'At least one invoice line item is required'),
  }),
});

export const updateVendorInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid vendor invoice ID'),
  }),
  body: z.object({
    dueDate: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  }),
});

export const getVendorInvoiceByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid vendor invoice ID'),
  }),
});

export const listVendorInvoicesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    purchaseOrderId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export const submitVendorInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid vendor invoice ID'),
  }),
});

export const verifyVendorInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid vendor invoice ID'),
  }),
});

export const postVendorInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid vendor invoice ID'),
  }),
});

export const cancelVendorInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid vendor invoice ID'),
  }),
  body: z.object({
    cancellationReason: z.string().trim().min(3, 'Cancellation reason is required (minimum 3 characters)'),
  }),
});
