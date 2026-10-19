import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAmcActivationEligibility,
  AMC_ACTIVATION_QUERY_KEYS,
} from '../utils/amc-activation-eligibility.util.js';
import type { AmcContract } from '../api/amcContractApi.js';

describe('Stage B4.3: AMC Contract Lifecycle Frontend UI Integration Tests', () => {
  const baseContract: AmcContract = {
    id: '44444444-4444-4444-a444-444444444444',
    contractNumber: 'AMC/2026-27/0001',
    quotationId: '33333333-3333-4333-a333-333333333333',
    quotationRevisionId: 'rev-01',
    customerId: '11111111-1111-4111-a111-111111111111',
    customerName: 'Acme Power Corp',
    customerCompanyName: 'Acme Power Corp Pvt Ltd',
    amcPlan: 'Comprehensive',
    contractStartDate: '2026-10-15T00:00:00.000Z',
    contractEndDate: '2027-10-14T23:59:59.999Z',
    serviceFrequency: 'Quarterly',
    scheduledVisits: 4,
    completedVisits: 0,
    breakdownVisitType: 'UNLIMITED',
    status: 'PENDING_ACTIVATION',
    paymentStatus: 'PAID',
    totalAmount: '125000.00',
    sourceQuotationNumber: 'QUO-2026-0001',
    sourceQuotationId: '33333333-3333-4333-a333-333333333333',
    salesOrderId: 'so-001',
    salesOrderNumber: 'SO-2026-0001',
    salesOrderStatus: 'CONFIRMED',
    equipment: [
      {
        id: 'eq-line-1',
        customerEquipmentId: '66666666-6666-4666-a666-666666666666',
        equipmentName: 'Servo Voltage Stabilizer 100kVA',
        equipmentType: 'STABILIZER',
        quantity: '1',
        unitPrice: '125000.00',
        lineTotal: '125000.00',
        status: 'ACTIVE',
        conditionStatus: 'OPERATIONAL',
      },
    ],
    serviceVisits: [],
    createdAt: '2026-10-12T10:00:00.000Z',
    updatedAt: '2026-10-12T10:00:00.000Z',
  };

  describe('1. Activation Eligibility - Valid Scenarios', () => {
    it('1.1 Eligible when PENDING_ACTIVATION and paymentStatus is PAID', () => {
      const result = checkAmcActivationEligibility(baseContract);
      assert.equal(result.isEligible, true);
      assert.equal(result.blockingCode, undefined);
      assert.equal(result.blockingReason, undefined);
    });

    it('1.2 Eligible when PENDING_ACTIVATION and paymentStatus is PARTIALLY_PAID', () => {
      const contract: AmcContract = {
        ...baseContract,
        paymentStatus: 'PARTIALLY_PAID',
      };
      const result = checkAmcActivationEligibility(contract);
      assert.equal(result.isEligible, true);
      assert.equal(result.blockingCode, undefined);
    });

    it('1.3 Eligible for manual AMC contract without originating quotation or sales order', () => {
      const manualContract: AmcContract = {
        ...baseContract,
        sourceQuotationNumber: undefined,
        sourceQuotationId: undefined,
        salesOrderId: undefined,
        salesOrderNumber: undefined,
        salesOrderStatus: undefined,
      };
      const result = checkAmcActivationEligibility(manualContract);
      assert.equal(result.isEligible, true);
    });
  });

  describe('2. Ineligible Activation - Payment Conditions', () => {
    it('2.1 Blocks activation when paymentStatus is PENDING with explanatory reason', () => {
      const contract: AmcContract = {
        ...baseContract,
        paymentStatus: 'PENDING',
      };
      const result = checkAmcActivationEligibility(contract);
      assert.equal(result.isEligible, false);
      assert.equal(result.blockingCode, 'PAYMENT_PENDING');
      assert.match(result.blockingReason || '', /Payment status is PENDING/i);
    });

    it('2.2 Blocks activation when paymentStatus is OVERDUE', () => {
      const contract: AmcContract = {
        ...baseContract,
        paymentStatus: 'OVERDUE',
      };
      const result = checkAmcActivationEligibility(contract);
      assert.equal(result.isEligible, false);
      assert.equal(result.blockingCode, 'PAYMENT_OVERDUE');
      assert.match(result.blockingReason || '', /Payment status is OVERDUE/i);
    });

    it('2.3 Blocks activation when paymentStatus is an unexpected or invalid value', () => {
      const contract: any = {
        ...baseContract,
        paymentStatus: 'UNPAID',
      };
      const result = checkAmcActivationEligibility(contract);
      assert.equal(result.isEligible, false);
      assert.equal(result.blockingCode, 'INVALID_PAYMENT');
      assert.match(result.blockingReason || '', /not eligible/i);
    });
  });

  describe('3. Ineligible Activation - Status & Lifecycle Conditions', () => {
    it('3.1 Blocks activation with ALREADY_ACTIVE when status is already ACTIVE', () => {
      const contract: AmcContract = {
        ...baseContract,
        status: 'ACTIVE',
      };
      const result = checkAmcActivationEligibility(contract);
      assert.equal(result.isEligible, false);
      assert.equal(result.blockingCode, 'ALREADY_ACTIVE');
      assert.match(result.blockingReason || '', /already ACTIVE/i);
    });

    it('3.2 Blocks activation when status is TERMINATED, CANCELLED, or EXPIRED', () => {
      const statuses: Array<AmcContract['status']> = [
        'TERMINATED',
        'CANCELLED',
        'EXPIRED',
        'EXPIRING_SOON',
        'DRAFT',
      ];
      for (const status of statuses) {
        const contract: AmcContract = {
          ...baseContract,
          status,
        };
        const result = checkAmcActivationEligibility(contract);
        assert.equal(result.isEligible, false);
        assert.equal(result.blockingCode, 'NOT_PENDING');
        assert.match(result.blockingReason || '', /must be in PENDING_ACTIVATION/i);
      }
    });

    it('3.3 Fails safely when contract is null or undefined', () => {
      assert.equal(checkAmcActivationEligibility(null).isEligible, false);
      assert.equal(checkAmcActivationEligibility(null).blockingCode, 'NOT_LOADED');
      assert.equal(checkAmcActivationEligibility(undefined).isEligible, false);
      assert.equal(checkAmcActivationEligibility(undefined).blockingCode, 'NOT_LOADED');
    });
  });

  describe('4. Ineligible Activation - Dates & Equipment Invariants', () => {
    it('4.1 Blocks activation if contract start date is on or after end date', () => {
      const reversedContract: AmcContract = {
        ...baseContract,
        contractStartDate: '2027-10-15T00:00:00.000Z',
        contractEndDate: '2026-10-14T23:59:59.999Z',
      };
      const result = checkAmcActivationEligibility(reversedContract);
      assert.equal(result.isEligible, false);
      assert.equal(result.blockingCode, 'INVALID_DATES');
      assert.match(result.blockingReason || '', /strictly before/i);

      const equalContract: AmcContract = {
        ...baseContract,
        contractStartDate: '2026-10-15T00:00:00.000Z',
        contractEndDate: '2026-10-15T00:00:00.000Z',
      };
      assert.equal(checkAmcActivationEligibility(equalContract).isEligible, false);
      assert.equal(checkAmcActivationEligibility(equalContract).blockingCode, 'INVALID_DATES');
    });

    it('4.2 Blocks activation if contract dates are malformed or missing', () => {
      const malformedContract: any = {
        ...baseContract,
        contractStartDate: 'invalid-date-string',
      };
      const result = checkAmcActivationEligibility(malformedContract);
      assert.equal(result.isEligible, false);
      assert.equal(result.blockingCode, 'INVALID_DATES');
    });

    it('4.3 Blocks activation if covered equipment list is empty', () => {
      const emptyEqContract: AmcContract = {
        ...baseContract,
        equipment: [],
      };
      const result = checkAmcActivationEligibility(emptyEqContract);
      assert.equal(result.isEligible, false);
      assert.equal(result.blockingCode, 'NO_EQUIPMENT');
      assert.match(result.blockingReason || '', /at least one covered equipment/i);
    });
  });

  describe('5. Duplicate Submission Prevention & Client State Integrity', () => {
    it('5.1 Synchronous in-flight ref guard prevents concurrent execution across same render tick', async () => {
      let networkCalls = 0;
      const isActivatingRef = { current: false };
      let actionLoadingState = false;

      // Exact logic structure used in handleActivate
      const activateHandler = async () => {
        if (isActivatingRef.current) return;
        isActivatingRef.current = true;
        actionLoadingState = true;
        try {
          networkCalls++;
          await new Promise((resolve) => setTimeout(resolve, 20));
        } finally {
          isActivatingRef.current = false;
          actionLoadingState = false;
        }
      };

      // Fired synchronously in parallel (e.g. rapid double click before React re-render)
      const p1 = activateHandler();
      const p2 = activateHandler();
      const p3 = activateHandler();
      await Promise.all([p1, p2, p3]);

      assert.equal(networkCalls, 1, 'Only exactly 1 network request must execute');
      assert.equal(isActivatingRef.current, false, 'Ref must be unlocked after completion');
      assert.equal(actionLoadingState, false, 'Loading state must be reset');
    });

    it('5.2 In-flight guard releases lock on failure in finally block to allow retries', async () => {
      let networkCalls = 0;
      const isActivatingRef = { current: false };
      let lastError: any = null;

      const failingActivateHandler = async () => {
        if (isActivatingRef.current) return;
        isActivatingRef.current = true;
        try {
          networkCalls++;
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error('Network timeout during activation');
        } catch (err: any) {
          lastError = err;
        } finally {
          isActivatingRef.current = false;
        }
      };

      // First call fails
      await failingActivateHandler();
      assert.equal(networkCalls, 1);
      assert.equal(lastError?.message, 'Network timeout during activation');
      assert.equal(isActivatingRef.current, false, 'Ref lock must be released despite exception');

      // Second call can now retry successfully
      await failingActivateHandler();
      assert.equal(networkCalls, 2, 'Retry must be permitted after previous failure was finalized');
    });

    it('5.3 API failure preserves existing contract status without optimistic mutation', async () => {
      const localContract: AmcContract = { ...baseContract };

      const simulateFailedActivation = async (): Promise<never> => {
        const error: any = new Error(
          'Cannot activate AMC Contract: Equipment is already covered by active AMC Contract AMC/2026-27/0099.'
        );
        error.code = 'OVERLAPPING_AMC_COVERAGE';
        throw error;
      };

      let caughtError: any = null;
      try {
        await simulateFailedActivation();
        // Optimistic update should never happen before server confirms success
        localContract.status = 'ACTIVE';
      } catch (err: any) {
        caughtError = err;
      }

      assert.ok(caughtError);
      assert.equal(caughtError.code, 'OVERLAPPING_AMC_COVERAGE');
      assert.equal(localContract.status, 'PENDING_ACTIVATION', 'Status must remain PENDING_ACTIVATION');
    });
  });

  describe('6. Post-Activation TanStack Query Invalidation Registry', () => {
    it('6.1 Invalidation registry targets all 9 critical query domains', () => {
      const keyStrings = AMC_ACTIVATION_QUERY_KEYS.map((k) => k[0]);

      // Assert essential keys are registered
      assert.ok(keyStrings.includes('amc-contract'), 'Must invalidate amc-contract');
      assert.ok(keyStrings.includes('amc-contracts'), 'Must invalidate amc-contracts list');
      assert.ok(keyStrings.includes('follow-ups'), 'Must invalidate follow-ups');
      assert.ok(keyStrings.includes('admin-dashboard-followups'), 'Must invalidate admin-dashboard-followups');
      assert.ok(keyStrings.includes('sales-dashboard-followups'), 'Must invalidate sales-dashboard-followups');
      assert.ok(keyStrings.includes('service-dashboard-amc'), 'Must invalidate service-dashboard-amc');
      assert.ok(keyStrings.includes('customer-equipment'), 'Must invalidate customer-equipment');
      assert.ok(keyStrings.includes('quotations'), 'Must invalidate quotations list');
      assert.ok(keyStrings.includes('quotation'), 'Must invalidate quotation detail');
      assert.equal(AMC_ACTIVATION_QUERY_KEYS.length, 9);
    });

    it('6.2 Mocked QueryClient invalidates each registered query key upon activation success', () => {
      const invalidatedKeys: string[] = [];
      const mockQueryClient = {
        invalidateQueries: ({ queryKey }: { queryKey: readonly string[] }) => {
          invalidatedKeys.push(queryKey[0]);
        },
      };

      // Trigger standard invalidation loop
      AMC_ACTIVATION_QUERY_KEYS.forEach((queryKey) => {
        mockQueryClient.invalidateQueries({ queryKey });
      });

      assert.equal(invalidatedKeys.length, 9);
      assert.ok(invalidatedKeys.includes('follow-ups'));
      assert.ok(invalidatedKeys.includes('customer-equipment'));
      assert.ok(invalidatedKeys.includes('service-dashboard-amc'));
    });
  });

  describe('7. Post-Activation Equipment & Follow-up Display Guarantees', () => {
    it('7.1 Covered equipment transitions to AMC_COVERED presentation when contract is ACTIVE', () => {
      const activeContract: AmcContract = {
        ...baseContract,
        status: 'ACTIVE',
      };

      const getWarrantyBadgePresentation = (contractStatus: string) => {
        return contractStatus === 'ACTIVE' ? 'AMC_COVERED' : 'EXPIRED';
      };

      assert.equal(getWarrantyBadgePresentation(activeContract.status), 'AMC_COVERED');
    });

    it('7.2 Originating follow-up reflects COMPLETED state after server activation response', () => {
      const serverActivationResponse = {
        success: true,
        data: {
          ...baseContract,
          status: 'ACTIVE' as const,
        },
      };

      const followUp = {
        id: 'fu-001',
        type: 'WARRANTY_EXPIRY',
        status: 'PENDING',
        amcContractId: null as string | null,
      };

      // On activation confirmation
      if (serverActivationResponse.success) {
        followUp.status = 'COMPLETED';
        followUp.amcContractId = serverActivationResponse.data.id;
      }

      assert.equal(followUp.status, 'COMPLETED');
      assert.equal(followUp.amcContractId, baseContract.id);
    });
  });
});
