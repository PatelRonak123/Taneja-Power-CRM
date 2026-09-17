import { z } from 'zod';
import { APP_CONSTANTS } from '../../../config/constants.js';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Customer name must be at least 2 characters long'),
    companyName: z.string().max(255).optional().nullable(),
    phone: z.string().max(50, 'Phone number must not exceed 50 characters').optional().nullable(),
    email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pincode: z.string().max(20).optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z
      .enum([APP_CONSTANTS.STATUS.ACTIVE, APP_CONSTANTS.STATUS.INACTIVE], {
        errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
      })
      .default(APP_CONSTANTS.STATUS.ACTIVE),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
  body: z.object({
    name: z.string().min(2, 'Customer name must be at least 2 characters long').optional(),
    companyName: z.string().max(255).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pincode: z.string().max(20).optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z
      .enum([APP_CONSTANTS.STATUS.ACTIVE, APP_CONSTANTS.STATUS.INACTIVE], {
        errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
      })
      .optional(),
  }),
});

export const listCustomersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
  }),
});

export const getCustomerByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
});

export const deleteCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
});

// Destination Schemas
const coordinateValidator = (min: number, max: number, name: string) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (val === undefined || val === null || val === '') return true;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return !isNaN(num) && num >= min && num <= max;
      },
      { message: `${name} must be a number between ${min} and ${max}` }
    )
    .transform((val) => {
      if (val === undefined || val === null || val === '') return null;
      return typeof val === 'number' ? val.toString() : val;
    });

export const createDestinationSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID format'),
  }),
  body: z.object({
    name: z.string().min(2, 'Destination name must be at least 2 characters long'),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pincode: z.string().max(20).optional().nullable(),
    latitude: coordinateValidator(-90, 90, 'Latitude'),
    longitude: coordinateValidator(-180, 180, 'Longitude'),
    placeId: z.string().max(255).optional().nullable(),
    contactPerson: z.string().max(255).optional().nullable(),
    contactPhone: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z
      .enum([APP_CONSTANTS.STATUS.ACTIVE, APP_CONSTANTS.STATUS.INACTIVE], {
        errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
      })
      .default(APP_CONSTANTS.STATUS.ACTIVE),
  }),
});

export const updateDestinationSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID format'),
    destinationId: z.string().uuid('Invalid destination ID format'),
  }),
  body: z.object({
    name: z.string().min(2, 'Destination name must be at least 2 characters long').optional(),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pincode: z.string().max(20).optional().nullable(),
    latitude: coordinateValidator(-90, 90, 'Latitude'),
    longitude: coordinateValidator(-180, 180, 'Longitude'),
    placeId: z.string().max(255).optional().nullable(),
    contactPerson: z.string().max(255).optional().nullable(),
    contactPhone: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z
      .enum([APP_CONSTANTS.STATUS.ACTIVE, APP_CONSTANTS.STATUS.INACTIVE], {
        errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
      })
      .optional(),
  }),
});

export const destinationParamSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID format'),
    destinationId: z.string().uuid('Invalid destination ID format'),
  }),
});

export const destinationListSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID format'),
  }),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
export type ListCustomersQuery = z.infer<typeof listCustomersSchema>['query'];
export type CreateDestinationInput = z.infer<typeof createDestinationSchema>['body'];
export type UpdateDestinationInput = z.infer<typeof updateDestinationSchema>['body'];
