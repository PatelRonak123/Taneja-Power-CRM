import { z } from 'zod';
import { APP_CONSTANTS } from '../../../config/constants.js';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
    role: z.string().optional(),
    workType: z.enum([APP_CONSTANTS.WORK_TYPES.OFFICE, APP_CONSTANTS.WORK_TYPES.FIELD]).optional().default(APP_CONSTANTS.WORK_TYPES.OFFICE),
    phone: z.string().optional(),
    designation: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(4, 'OTP code must be exactly 4 digits'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(4, 'OTP code must be exactly 4 digits'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
