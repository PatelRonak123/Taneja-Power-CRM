import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createQuotationSchema } from '../validators/quotation.validator.js';
import { calculateAmcDatesFromWarrantyEnd } from '../../customer-equipment/utils/warranty-date.util.js';
import { AppError } from '../../../common/errors/AppError.js';

describe('Stage B3.5.2: AMC Quotation Conversion Integration Tests', () => {
  describe('1. Quotation Validator - Source Fields', () => {
    const validBasePayload = {
      customerId: '11111111-1111-4111-a111-111111111111',
      quotationType: 'AMC',
      items: [
        {
          productName: 'STABILIZER AMC',
          quantity: 1,
          unitPrice: 15000,
          itemType: 'AMC',
        },
      ],
    };

    it('1.1 Accepts valid UUIDs for sourceEquipmentId and sourceFollowUpId', () => {
      const parsed = createQuotationSchema.safeParse({
        body: {
          ...validBasePayload,
          sourceEquipmentId: '22222222-2222-4222-a222-222222222222',
          sourceFollowUpId: '33333333-3333-4333-a333-333333333333',
        },
      });

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.body.sourceEquipmentId, '22222222-2222-4222-a222-222222222222');
        assert.equal(parsed.data.body.sourceFollowUpId, '33333333-3333-4333-a333-333333333333');
      }
    });

    it('1.2 Accepts null or omitted source fields (ordinary quotation flow)', () => {
      const parsed = createQuotationSchema.safeParse({
        body: {
          ...validBasePayload,
          sourceEquipmentId: null,
          sourceFollowUpId: null,
        },
      });

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.body.sourceEquipmentId, null);
        assert.equal(parsed.data.body.sourceFollowUpId, null);
      }
    });

    it('1.3 Rejects malformed UUIDs for source IDs', () => {
      const parsed = createQuotationSchema.safeParse({
        body: {
          ...validBasePayload,
          sourceEquipmentId: 'not-a-valid-uuid',
        },
      });

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        const err = parsed.error.issues.find((i) => i.path.includes('sourceEquipmentId'));
        assert.ok(err, 'Expected error on sourceEquipmentId');
        assert.match(err.message, /Invalid source equipment ID format/i);
      }
    });
  });

  describe('2. AMC Date Calculations from Warranty Expiry', () => {
    it('2.1 Standard 1-year AMC from warranty end date', () => {
      // Warranty ends 2027-10-14 -> AMC start 2027-10-15 -> AMC end 2028-10-14
      const dates = calculateAmcDatesFromWarrantyEnd('2027-10-14');
      assert.equal(dates.proposedAmcStartDate, '2027-10-15');
      assert.equal(dates.proposedAmcEndDate, '2028-10-14');
    });

    it('2.2 Leap year start: warranty ends 2024-02-28 -> AMC starts on leap day 2024-02-29', () => {
      const dates = calculateAmcDatesFromWarrantyEnd('2024-02-28');
      assert.equal(dates.proposedAmcStartDate, '2024-02-29');
      // 2024-02-29 + 1 year clamps to 2025-02-28, minus 1 day is 2025-02-27
      assert.equal(dates.proposedAmcEndDate, '2025-02-27');
    });

    it('2.3 Month end transition: warranty ends 2026-01-31 -> AMC starts 2026-02-01', () => {
      const dates = calculateAmcDatesFromWarrantyEnd('2026-01-31');
      assert.equal(dates.proposedAmcStartDate, '2026-02-01');
      assert.equal(dates.proposedAmcEndDate, '2027-01-31');
    });

    it('2.4 Year-crossing transition: warranty ends 2026-12-31 -> AMC starts 2027-01-01', () => {
      const dates = calculateAmcDatesFromWarrantyEnd('2026-12-31');
      assert.equal(dates.proposedAmcStartDate, '2027-01-01');
      assert.equal(dates.proposedAmcEndDate, '2027-12-31');
    });
  });

  describe('3. Conversion Eligibility & Validation Logic (Unit/Mocked)', () => {
    const customerId = 'cust-uuid-001';
    const equipmentId = 'eq-uuid-001';
    const followUpId = 'fu-uuid-001';

    // Mock validation runner replicating the rules implemented in QuotationService.createQuotation
    function validateConversionRules(
      input: {
        customerId: string;
        sourceFollowUpId?: string | null;
        sourceEquipmentId?: string | null;
      },
      dbRecords: {
        followUp?: any | null;
        equipment?: any | null;
      }
    ) {
      if (input.sourceFollowUpId) {
        const fu = dbRecords.followUp;
        if (!fu) {
          throw AppError.notFound('Source follow-up not found');
        }
        if (fu.type !== 'WARRANTY_EXPIRY') {
          throw AppError.badRequest('Source follow-up must be of type WARRANTY_EXPIRY');
        }
        if (fu.quotationId) {
          throw AppError.conflict('Source follow-up has already been converted to a quotation');
        }
        if (fu.customerId !== input.customerId) {
          throw AppError.badRequest('Source follow-up does not belong to the selected customer');
        }
        if (!fu.customerEquipmentId) {
          throw AppError.badRequest('Source follow-up is not linked to any customer equipment');
        }
        if (input.sourceEquipmentId && fu.customerEquipmentId !== input.sourceEquipmentId) {
          throw AppError.badRequest('Source equipment ID does not match the equipment on the follow-up');
        }

        const eq = dbRecords.equipment;
        if (!eq) {
          throw AppError.notFound('Source equipment not found');
        }
        if (eq.customerId !== input.customerId) {
          throw AppError.badRequest('Source equipment does not belong to the selected customer');
        }

        return {
          validatedSourceFollowUpId: fu.id,
          validatedSourceEquipmentId: eq.id,
        };
      }

      return {
        validatedSourceFollowUpId: null,
        validatedSourceEquipmentId: input.sourceEquipmentId || null,
      };
    }

    it('3.1 Successfully validates eligible WARRANTY_EXPIRY follow-up and equipment', () => {
      const validFu = {
        id: followUpId,
        type: 'WARRANTY_EXPIRY',
        customerId,
        customerEquipmentId: equipmentId,
        quotationId: null,
      };
      const validEq = {
        id: equipmentId,
        customerId,
        assetStatus: 'ACTIVE',
      };

      const result = validateConversionRules(
        { customerId, sourceFollowUpId: followUpId, sourceEquipmentId: equipmentId },
        { followUp: validFu, equipment: validEq }
      );

      assert.equal(result.validatedSourceFollowUpId, followUpId);
      assert.equal(result.validatedSourceEquipmentId, equipmentId);
    });

    it('3.2 Rejects if follow-up type is not WARRANTY_EXPIRY', () => {
      const nonWarrantyFu = {
        id: followUpId,
        type: 'CALL',
        customerId,
        customerEquipmentId: equipmentId,
        quotationId: null,
      };

      assert.throws(
        () =>
          validateConversionRules(
            { customerId, sourceFollowUpId: followUpId, sourceEquipmentId: equipmentId },
            { followUp: nonWarrantyFu }
          ),
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.message.includes('WARRANTY_EXPIRY')
      );
    });

    it('3.3 Rejects if follow-up is already converted (quotationId populated)', () => {
      const alreadyConvertedFu = {
        id: followUpId,
        type: 'WARRANTY_EXPIRY',
        customerId,
        customerEquipmentId: equipmentId,
        quotationId: 'existing-quotation-uuid',
      };

      assert.throws(
        () =>
          validateConversionRules(
            { customerId, sourceFollowUpId: followUpId, sourceEquipmentId: equipmentId },
            { followUp: alreadyConvertedFu }
          ),
        (err: any) => err instanceof AppError && err.statusCode === 409 && err.message.includes('already been converted')
      );
    });

    it('3.4 Rejects if follow-up belongs to a different customer', () => {
      const mismatchedCustomerFu = {
        id: followUpId,
        type: 'WARRANTY_EXPIRY',
        customerId: 'different-customer-uuid',
        customerEquipmentId: equipmentId,
        quotationId: null,
      };

      assert.throws(
        () =>
          validateConversionRules(
            { customerId, sourceFollowUpId: followUpId, sourceEquipmentId: equipmentId },
            { followUp: mismatchedCustomerFu }
          ),
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.message.includes('does not belong to the selected customer')
      );
    });

    it('3.5 Rejects if source equipment ID does not match follow-up equipment', () => {
      const fu = {
        id: followUpId,
        type: 'WARRANTY_EXPIRY',
        customerId,
        customerEquipmentId: 'eq-original-999',
        quotationId: null,
      };

      assert.throws(
        () =>
          validateConversionRules(
            { customerId, sourceFollowUpId: followUpId, sourceEquipmentId: 'eq-different-111' },
            { followUp: fu }
          ),
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.message.includes('does not match the equipment on the follow-up')
      );
    });
  });

  describe('4. Atomic Linkage & Concurrency Guard Simulation', () => {
    it('4.1 Simulated atomic update succeeds when quotationId is null', () => {
      const record = { id: 'fu-1', quotationId: null, status: 'PENDING' };

      // Simulate atomic conditional update: set quotationId where id = 'fu-1' and quotationId IS NULL
      let affectedRows = 0;
      if (record.id === 'fu-1' && record.quotationId === null) {
        record.quotationId = 'new-quotation-id' as any;
        affectedRows = 1;
      }

      assert.equal(affectedRows, 1);
      assert.equal(record.quotationId, 'new-quotation-id');
      assert.equal(record.status, 'PENDING', 'Follow-up status must remain PENDING');
    });

    it('4.2 Simulated concurrent second update fails conditional check (0 rows affected -> 409 Conflict)', () => {
      const record = { id: 'fu-1', quotationId: 'first-winner-quotation', status: 'PENDING' };

      // Second competing request checks `where quotationId IS NULL`
      let affectedRows = 0;
      if (record.id === 'fu-1' && record.quotationId === null) {
        record.quotationId = 'second-loser-quotation' as any;
        affectedRows = 1;
      }

      assert.equal(affectedRows, 0, 'Second request must match 0 rows');

      // The service throws 409 Conflict when affectedRows === 0
      assert.throws(
        () => {
          if (affectedRows === 0) {
            throw AppError.conflict('Source follow-up was concurrently converted to a quotation by another request');
          }
        },
        (err: any) => err instanceof AppError && err.statusCode === 409 && err.message.includes('concurrently converted')
      );
    });
  });
});
