import { z } from 'zod';

export const createSalesOrderSchema = z.object({
  body: z.object({
    quotationId: z.string().uuid('Invalid quotation ID'),
    customerPoNumber: z.string().trim().max(100).optional().nullable(),
    customerPoDate: z.string().optional().nullable(),
    expectedDeliveryDate: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    // Client totals are explicitly rejected / ignored by the service
  }),
});

export const updateSalesOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid sales order ID'),
  }),
  body: z.object({
    customerPoNumber: z.string().trim().max(100).optional().nullable(),
    customerPoDate: z.string().optional().nullable(),
    expectedDeliveryDate: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  }),
});

export const getSalesOrderByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid sales order ID'),
  }),
});

export const listSalesOrdersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    customerId: z.string().uuid().optional(),
    quotationId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export const submitSalesOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid sales order ID'),
  }),
});

export const confirmSalesOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid sales order ID'),
  }),
});

export const cancelSalesOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid sales order ID'),
  }),
  body: z.object({
    cancellationReason: z
      .string()
      .trim()
      .min(3, 'Cancellation reason must be at least 3 characters')
      .max(1000, 'Cancellation reason is too long'),
  }),
});
