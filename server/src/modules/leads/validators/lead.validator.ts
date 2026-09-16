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
    id: z.string().uuid(),
  }),
});

export const createLeadSchema = z.object({
  body: z.object({
    customerName: z.string().min(1, 'Customer name is required'),
    companyName: z.string().min(1, 'Company name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    productInterested: z.string().optional(),
    expectedValue: z.number().optional().default(0),
    assignedExecutive: z.string().optional().default('Nilesh Mehta'),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
    status: z.enum(['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Approved', 'Lost']).optional().default('New'),
    source: z.enum(['Web', 'Referral', 'Field Call', 'Exhibition', 'Direct']).optional().default('Web'),
  }),
});

export const updateLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: createLeadSchema.shape.body.partial(),
});

export const deleteLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
