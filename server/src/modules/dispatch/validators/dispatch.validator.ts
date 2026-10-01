import { z } from 'zod';

export const createDispatchSchema = z.object({
  body: z.object({
    salesOrderId: z.string().uuid('Invalid Sales Order ID'),
    salesInvoiceId: z.string().uuid('Invalid Sales Invoice ID').optional().nullable(),
    dispatchDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    vehicleNumber: z.string().max(50).optional().nullable(),
    transporterName: z.string().max(255).optional().nullable(),
    transporterContact: z.string().max(100).optional().nullable(),
    driverName: z.string().max(255).optional().nullable(),
    driverPhone: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z
      .array(
        z.object({
          salesOrderItemId: z.string().uuid('Invalid Sales Order Item ID'),
          salesInvoiceItemId: z.string().uuid('Invalid Sales Invoice Item ID').optional().nullable(),
          dispatchQuantity: z.number().positive('Dispatch quantity must be greater than zero'),
        })
      )
      .optional(),
  }),
});

export const updateDispatchSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Dispatch ID'),
  }),
  body: z.object({
    dispatchDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    vehicleNumber: z.string().max(50).optional().nullable(),
    transporterName: z.string().max(255).optional().nullable(),
    transporterContact: z.string().max(100).optional().nullable(),
    driverName: z.string().max(255).optional().nullable(),
    driverPhone: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z
      .array(
        z.object({
          salesOrderItemId: z.string().uuid('Invalid Sales Order Item ID'),
          salesInvoiceItemId: z.string().uuid('Invalid Sales Invoice Item ID').optional().nullable(),
          dispatchQuantity: z.number().positive('Dispatch quantity must be greater than zero'),
        })
      )
      .optional(),
  }),
});

export const getDispatchByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Dispatch ID'),
  }),
});

export const getDispatchableItemsSchema = z.object({
  params: z.object({
    salesOrderId: z.string().uuid('Invalid Sales Order ID'),
  }),
});

export const submitDispatchSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Dispatch ID'),
  }),
});

export const confirmDispatchSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Dispatch ID'),
  }),
});

export const cancelDispatchSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Dispatch ID'),
  }),
  body: z.object({
    cancellationReason: z.string().min(1, 'Cancellation reason is required'),
  }),
});

export const listDispatchesQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    salesOrderId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
