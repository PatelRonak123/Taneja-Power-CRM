import type { AmcContract } from '../api/amcContractApi';

export type AmcActivationBlockingCode =
  | 'NOT_LOADED'
  | 'NOT_PENDING'
  | 'ALREADY_ACTIVE'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_OVERDUE'
  | 'INVALID_PAYMENT'
  | 'INVALID_DATES'
  | 'NO_EQUIPMENT';

export interface AmcActivationEligibilityResult {
  isEligible: boolean;
  blockingReason?: string;
  blockingCode?: AmcActivationBlockingCode;
}

/**
 * Standard TanStack Query keys to invalidate upon successful AMC contract activation.
 * Keeps AMC lists, detail views, service visits, customer equipment warranty statuses,
 * originating warranty-expiry follow-ups, and dashboard summaries in sync.
 */
export const AMC_ACTIVATION_QUERY_KEYS = [
  ['amc-contract'],
  ['amc-contracts'],
  ['follow-ups'],
  ['admin-dashboard-followups'],
  ['sales-dashboard-followups'],
  ['service-dashboard-amc'],
  ['customer-equipment'],
  ['quotations'],
  ['quotation'],
] as const;

/**
 * Pure utility function to evaluate whether an AMC Contract is eligible for activation
 * based on actual contract fields returned by the backend API.
 *
 * Eligibility requirements:
 * 1. Contract status must be PENDING_ACTIVATION.
 * 2. Payment status must be PAID or PARTIALLY_PAID.
 * 3. Contract dates must be valid ISO timestamps with contractStartDate < contractEndDate.
 * 4. At least one covered equipment item must be present on the contract.
 */
export function checkAmcActivationEligibility(
  contract: AmcContract | null | undefined
): AmcActivationEligibilityResult {
  if (!contract) {
    return {
      isEligible: false,
      blockingCode: 'NOT_LOADED',
      blockingReason: 'Contract data is not loaded.',
    };
  }

  // 1. Status Guard
  if (contract.status === 'ACTIVE') {
    return {
      isEligible: false,
      blockingCode: 'ALREADY_ACTIVE',
      blockingReason: `Contract ${contract.contractNumber} is already ACTIVE.`,
    };
  }

  if (contract.status !== 'PENDING_ACTIVATION') {
    return {
      isEligible: false,
      blockingCode: 'NOT_PENDING',
      blockingReason: `Cannot activate AMC Contract: Contract must be in PENDING_ACTIVATION status (Current: ${contract.status}).`,
    };
  }

  // 2. Commercial / Payment Status Guard
  if (contract.paymentStatus === 'PENDING') {
    return {
      isEligible: false,
      blockingCode: 'PAYMENT_PENDING',
      blockingReason:
        'Cannot activate AMC Contract: Payment status is PENDING. Payment must be PAID or PARTIALLY_PAID before activating.',
    };
  }

  if (contract.paymentStatus === 'OVERDUE') {
    return {
      isEligible: false,
      blockingCode: 'PAYMENT_OVERDUE',
      blockingReason:
        'Cannot activate AMC Contract: Payment status is OVERDUE. Payment must be settled before activating.',
    };
  }

  const allowedPaymentStatuses = ['PAID', 'PARTIALLY_PAID'];
  if (!allowedPaymentStatuses.includes(contract.paymentStatus)) {
    return {
      isEligible: false,
      blockingCode: 'INVALID_PAYMENT',
      blockingReason: `Cannot activate AMC Contract: Payment status "${contract.paymentStatus}" is not eligible. Payment must be PAID or PARTIALLY_PAID.`,
    };
  }

  // 3. Contract Dates Validation
  if (!contract.contractStartDate || !contract.contractEndDate) {
    return {
      isEligible: false,
      blockingCode: 'INVALID_DATES',
      blockingReason: 'Cannot activate AMC Contract: Contract start and end dates are required.',
    };
  }

  const startDate = new Date(contract.contractStartDate);
  const endDate = new Date(contract.contractEndDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return {
      isEligible: false,
      blockingCode: 'INVALID_DATES',
      blockingReason: 'Cannot activate AMC Contract: Contract start or end date is invalid.',
    };
  }

  if (startDate >= endDate) {
    return {
      isEligible: false,
      blockingCode: 'INVALID_DATES',
      blockingReason:
        'Cannot activate AMC Contract: Contract start date must be strictly before contract end date.',
    };
  }

  // 4. Covered Equipment Invariant
  if (!contract.equipment || contract.equipment.length === 0) {
    return {
      isEligible: false,
      blockingCode: 'NO_EQUIPMENT',
      blockingReason:
        'Cannot activate AMC Contract: Contract must have at least one covered equipment item.',
    };
  }

  return {
    isEligible: true,
  };
}
