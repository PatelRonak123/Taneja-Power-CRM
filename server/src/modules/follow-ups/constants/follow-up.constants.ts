export const FOLLOW_UP_TYPE = {
  CALL: 'CALL',
  MEETING: 'MEETING',
  EMAIL: 'EMAIL',
  SITE_VISIT: 'SITE_VISIT',
  QUOTATION_FOLLOW_UP: 'QUOTATION_FOLLOW_UP',
  PAYMENT_FOLLOW_UP: 'PAYMENT_FOLLOW_UP',
  AMC_RENEWAL: 'AMC_RENEWAL',
  AMC_EXPIRY: 'AMC_EXPIRY',
  CUSTOMER_VISIT: 'CUSTOMER_VISIT',
  WARRANTY_EXPIRY: 'WARRANTY_EXPIRY',
  OTHER: 'OTHER',
} as const;

export type FollowUpType = (typeof FOLLOW_UP_TYPE)[keyof typeof FOLLOW_UP_TYPE];

export const FOLLOW_UP_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  OVERDUE: 'OVERDUE', // Filter / virtual status
} as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUS)[keyof typeof FOLLOW_UP_STATUS];

export const FOLLOW_UP_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type FollowUpPriority = (typeof FOLLOW_UP_PRIORITY)[keyof typeof FOLLOW_UP_PRIORITY];
