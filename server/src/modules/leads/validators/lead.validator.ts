import { z } from 'zod';

export const listLeadsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignee: z.string().optional(),
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  }),
});

export const getLeadByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const createLeadSchema = z.object({
  body: z.object({
    id: z.string().optional(),
    leadCode: z.string().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
    companyName: z.string().min(1, 'Company name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    productInterested: z.string().optional(),
    expectedValue: z.number().optional().default(0),
    assignedExecutive: z.string().optional().default('Nilesh Mehta'),
    assignedEmployeeId: z.string().optional().nullable(),
    createdBy: z.string().optional().nullable(),
    createdById: z.string().optional().nullable(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
    status: z.string().optional().default('New'),
    source: z.enum(['Web', 'Referral', 'Field Call', 'Exhibition', 'Direct']).optional().default('Web'),
    linkedClientId: z.string().optional().nullable(),
  }),
});

export const updateLeadSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: createLeadSchema.shape.body.partial().extend({
    linkedClientId: z.string().optional().nullable(),
  }),
});

export const deleteLeadSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const createLeadDestinationSchema = z.object({
  params: z.object({
    leadId: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(2, 'Destination name must be at least 2 characters long'),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pincode: z.string().max(20).optional().nullable(),
    latitude: z.union([z.number(), z.string()]).optional().nullable(),
    longitude: z.union([z.number(), z.string()]).optional().nullable(),
    placeId: z.string().max(255).optional().nullable(),
    contactPerson: z.string().max(255).optional().nullable(),
    contactPhone: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  }),
});

export const updateLeadDestinationSchema = z.object({
  params: z.object({
    leadId: z.string().min(1),
    destinationId: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(2, 'Destination name must be at least 2 characters long').optional(),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pincode: z.string().max(20).optional().nullable(),
    latitude: z.union([z.number(), z.string()]).optional().nullable(),
    longitude: z.union([z.number(), z.string()]).optional().nullable(),
    placeId: z.string().max(255).optional().nullable(),
    contactPerson: z.string().max(255).optional().nullable(),
    contactPhone: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const leadDestinationParamSchema = z.object({
  params: z.object({
    leadId: z.string().min(1),
    destinationId: z.string().optional(),
  }),
});

