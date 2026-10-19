import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWarrantyDates,
  isLeapYear,
  getDaysInMonth,
  parseCalendarDate,
  addMonthsToCalendarDate,
  subtractOneDayFromCalendarDate,
  addDaysToCalendarDate,
} from '../utils/warranty-date.util.js';
import { WarrantyCommissioningService } from '../services/warranty-commissioning.service.js';
import { CustomerEquipmentService } from '../services/customer-equipment.service.js';
import { WarrantyFollowUpService } from '../services/warranty-follow-up.service.js';
import { WarrantyReminderService } from '../services/warranty-reminder.service.js';
import { processWarrantyRemindersSchema } from '../validators/customer-equipment.validator.js';
import { db } from '../../../database/db.js';
import { AppError } from '../../../common/errors/AppError.js';

describe('Stage B2: Warranty Date Utility Tests', () => {
  it('1. Standard 12-month warranty: 2026-10-15 -> expiry 2027-10-14, AMC start 2027-10-15', () => {
    const result = calculateWarrantyDates({
      installationDate: '2026-10-15',
      durationValue: 12,
      durationUnit: 'MONTHS',
    });

    assert.equal(result.installationDateStr, '2026-10-15');
    assert.equal(result.warrantyEndDateStr, '2027-10-14');
    assert.equal(result.proposedAmcStartDateStr, '2027-10-15');
    assert.equal(result.warrantyCycle, 'WC-2027-10-14');
    assert.equal(result.warrantyStartDate.toISOString(), '2026-10-15T00:00:00.000Z');
    assert.equal(result.warrantyEndDate.toISOString(), '2027-10-14T23:59:59.999Z');
    assert.equal(result.proposedAmcStartDate.toISOString(), '2027-10-15T00:00:00.000Z');
  });

  it('2. Leap-year installation: 2024-02-29 + 1 YEARS -> expiry 2025-02-27, AMC start 2025-02-28', () => {
    const result = calculateWarrantyDates({
      installationDate: '2024-02-29',
      durationValue: 1,
      durationUnit: 'YEARS',
    });

    // 2024-02-29 + 1 year clamps to 2025-02-28 (non-leap year February has 28 days)
    // Expiry (-1 day) is 2025-02-27
    // Proposed AMC start is 2025-02-28
    assert.equal(result.installationDateStr, '2024-02-29');
    assert.equal(result.warrantyEndDateStr, '2025-02-27');
    assert.equal(result.proposedAmcStartDateStr, '2025-02-28');
    assert.equal(result.warrantyCycle, 'WC-2025-02-27');
  });

  it('3. Month-end addition without rollover: 2026-01-31 + 1 MONTHS -> expiry 2026-02-27, AMC start 2026-02-28', () => {
    const result = calculateWarrantyDates({
      installationDate: '2026-01-31',
      durationValue: 1,
      durationUnit: 'MONTHS',
    });

    // Jan 31 + 1 month = Feb 28, 2026.
    // Expiry (-1 day) = Feb 27, 2026.
    // AMC start = Feb 28, 2026.
    assert.equal(result.installationDateStr, '2026-01-31');
    assert.equal(result.warrantyEndDateStr, '2026-02-27');
    assert.equal(result.proposedAmcStartDateStr, '2026-02-28');
  });

  it('4. Multi-year duration: 2026-05-10 + 2 YEARS -> expiry 2028-05-09, AMC start 2028-05-10', () => {
    const result = calculateWarrantyDates({
      installationDate: '2026-05-10',
      durationValue: 2,
      durationUnit: 'YEARS',
    });

    assert.equal(result.installationDateStr, '2026-05-10');
    assert.equal(result.warrantyEndDateStr, '2028-05-09');
    assert.equal(result.proposedAmcStartDateStr, '2028-05-10');
    assert.equal(result.warrantyCycle, 'WC-2028-05-09');
  });

  it('5. First day of month: 2026-03-01 + 1 MONTHS -> expiry 2026-03-31, AMC start 2026-04-01', () => {
    const result = calculateWarrantyDates({
      installationDate: '2026-03-01',
      durationValue: 1,
      durationUnit: 'MONTHS',
    });

    // March 1 + 1 month = April 1. Minus 1 day = March 31.
    assert.equal(result.warrantyEndDateStr, '2026-03-31');
    assert.equal(result.proposedAmcStartDateStr, '2026-04-01');
  });

  it('6. Invalid or missing durations throw AppError badRequest', () => {
    assert.throws(
      () =>
        calculateWarrantyDates({
          installationDate: '2026-10-15',
          durationValue: 0,
          durationUnit: 'MONTHS',
        }),
      (err: any) => err.statusCode === 400
    );

    assert.throws(
      () =>
        calculateWarrantyDates({
          installationDate: '2026-10-15',
          durationValue: -5,
          durationUnit: 'MONTHS',
        }),
      (err: any) => err.statusCode === 400
    );

    assert.throws(
      () =>
        calculateWarrantyDates({
          installationDate: '2026-10-15',
          durationValue: 1.5,
          durationUnit: 'MONTHS',
        }),
      (err: any) => err.statusCode === 400
    );

    assert.throws(
      () =>
        calculateWarrantyDates({
          installationDate: '2026-10-15',
          durationValue: 12,
          durationUnit: 'WEEKS' as any,
        }),
      (err: any) => err.statusCode === 400
    );

    assert.throws(
      () =>
        calculateWarrantyDates({
          installationDate: 'invalid-date',
          durationValue: 12,
          durationUnit: 'MONTHS',
        }),
      (err: any) => err.statusCode === 400
    );
  });

  it('7. Leap year and calendar helper functions', () => {
    assert.equal(isLeapYear(2024), true);
    assert.equal(isLeapYear(2025), false);
    assert.equal(isLeapYear(2000), true);
    assert.equal(isLeapYear(1900), false);

    assert.equal(getDaysInMonth(2024, 2), 29);
    assert.equal(getDaysInMonth(2025, 2), 28);
    assert.equal(getDaysInMonth(2026, 4), 30);
    assert.equal(getDaysInMonth(2026, 12), 31);

    const parsed = parseCalendarDate('2026-07-22');
    assert.deepEqual(parsed, { year: 2026, month: 7, day: 22 });

    const added = addDaysToCalendarDate(2026, 1, 30, 2);
    assert.deepEqual(added, { year: 2026, month: 2, day: 1 });
  });
});

describe('Stage B2: Commissioning Service Unit Logic', () => {
  const mockUser = {
    userId: 'user-uuid-1234',
    email: 'service.office@tanejapower.com',
    role: 'USER',
    designation: 'Service Office',
  } as any;

  it('1. Throws 401 Unauthorized if auth user context is missing', async () => {
    const service = new WarrantyCommissioningService({} as any);

    await assert.rejects(
      async () => {
        await service.commissionEquipment(
          'eq-1',
          {
            installationDate: '2026-10-15',
            warrantyDurationValue: 12,
            warrantyDurationUnit: 'MONTHS',
          },
          undefined
        );
      },
      (err: any) => err.statusCode === 401
    );
  });

  it('2. Throws 404 NotFound if equipment record does not exist', async () => {
    const mockRepo = {
      findById: async () => null,
    } as any;
    const service = new WarrantyCommissioningService(mockRepo);

    await assert.rejects(
      async () => {
        await service.commissionEquipment(
          'non-existent-id',
          {
            installationDate: '2026-10-15',
            warrantyDurationValue: 12,
            warrantyDurationUnit: 'MONTHS',
          },
          mockUser
        );
      },
      (err: any) => err.statusCode === 404 && err.errorCode === 'EQUIPMENT_NOT_FOUND'
    );
  });

  it('3. Throws 409 Conflict if equipment is already commissioned with active warranty', async () => {
    const mockRepo = {
      findById: async () => ({
        id: 'eq-active',
        assetNumber: 'EQ-000001',
        warrantyStatus: 'ACTIVE',
        warrantyEndDate: new Date('2027-10-14'),
      }),
    } as any;
    const service = new WarrantyCommissioningService(mockRepo);

    await assert.rejects(
      async () => {
        await service.commissionEquipment(
          'eq-active',
          {
            installationDate: '2026-10-15',
            warrantyDurationValue: 12,
            warrantyDurationUnit: 'MONTHS',
          },
          mockUser
        );
      },
      (err: any) => err.statusCode === 409 && err.errorCode === 'ALREADY_COMMISSIONED'
    );
  });

  it('4. Throws 409 Conflict if equipment is already covered by AMC', async () => {
    const mockRepo = {
      findById: async () => ({
        id: 'eq-amc',
        assetNumber: 'EQ-000002',
        warrantyStatus: 'AMC_COVERED',
      }),
    } as any;
    const service = new WarrantyCommissioningService(mockRepo);

    await assert.rejects(
      async () => {
        await service.commissionEquipment(
          'eq-amc',
          {
            installationDate: '2026-10-15',
            warrantyDurationValue: 12,
            warrantyDurationUnit: 'MONTHS',
          },
          mockUser
        );
      },
      (err: any) => err.statusCode === 409 && err.errorCode === 'EQUIPMENT_AMC_COVERED'
    );
  });

  it('5. Throws 400 BadRequest if equipment warranty has already expired', async () => {
    const mockRepo = {
      findById: async () => ({
        id: 'eq-expired',
        assetNumber: 'EQ-000003',
        warrantyStatus: 'EXPIRED',
      }),
    } as any;
    const service = new WarrantyCommissioningService(mockRepo);

    await assert.rejects(
      async () => {
        await service.commissionEquipment(
          'eq-expired',
          {
            installationDate: '2026-10-15',
            warrantyDurationValue: 12,
            warrantyDurationUnit: 'MONTHS',
          },
          mockUser
        );
      },
      (err: any) => err.statusCode === 400 && err.errorCode === 'WARRANTY_ALREADY_EXPIRED'
    );
  });
});

describe('Stage B2: Follow-Up & Reminder Engine Unit Tests', () => {
  it('1. Window calculation: reference date 2026-10-15 produces 30-day target 2026-11-14', () => {
    const ref = parseCalendarDate('2026-10-15');
    const target = addDaysToCalendarDate(ref.year, ref.month, ref.day, 30);
    const targetStr = `${target.year}-${String(target.month).padStart(2, '0')}-${String(target.day).padStart(2, '0')}`;

    assert.equal(targetStr, '2026-11-14');
  });

  it('2. Month-crossing 30-day window: 2026-01-15 -> 2026-02-14', () => {
    const ref = parseCalendarDate('2026-01-15');
    const target = addDaysToCalendarDate(ref.year, ref.month, ref.day, 30);
    const targetStr = `${target.year}-${String(target.month).padStart(2, '0')}-${String(target.day).padStart(2, '0')}`;

    assert.equal(targetStr, '2026-02-14');
  });

  it('3. Leap-year February 30-day window: 2024-02-15 -> 2024-03-16 (Feb has 29 days)', () => {
    const ref = parseCalendarDate('2024-02-15');
    const target = addDaysToCalendarDate(ref.year, ref.month, ref.day, 30);
    const targetStr = `${target.year}-${String(target.month).padStart(2, '0')}-${String(target.day).padStart(2, '0')}`;

    // Feb 15 + 14 days = Feb 29. Feb 29 + 16 days = Mar 16.
    assert.equal(targetStr, '2024-03-16');
  });

  it('4. Year-crossing 30-day window: 2026-12-15 -> 2027-01-14', () => {
    const ref = parseCalendarDate('2026-12-15');
    const target = addDaysToCalendarDate(ref.year, ref.month, ref.day, 30);
    const targetStr = `${target.year}-${String(target.month).padStart(2, '0')}-${String(target.day).padStart(2, '0')}`;

    assert.equal(targetStr, '2027-01-14');
  });

  it('5. Warranty Cycle format stability', () => {
    const dates1 = calculateWarrantyDates({
      installationDate: '2026-10-15',
      durationValue: 12,
      durationUnit: 'MONTHS',
    });
    const dates2 = calculateWarrantyDates({
      installationDate: '2026-10-15',
      durationValue: 12,
      durationUnit: 'MONTHS',
    });

    assert.equal(dates1.warrantyCycle, 'WC-2027-10-14');
    assert.equal(dates2.warrantyCycle, 'WC-2027-10-14');
    // Stable across multiple calculations
    assert.equal(dates1.warrantyCycle, dates2.warrantyCycle);

    // Differentiates new warranty cycle (e.g. 24 months)
    const dates3 = calculateWarrantyDates({
      installationDate: '2026-10-15',
      durationValue: 24,
      durationUnit: 'MONTHS',
    });
    assert.equal(dates3.warrantyCycle, 'WC-2028-10-14');
    assert.notEqual(dates1.warrantyCycle, dates3.warrantyCycle);
  });
});

describe('Stage B2 Fix HIGH: Concurrent Commissioning Race & Atomic Status Check', () => {
  const mockUser1 = {
    userId: 'user-technician-1',
    email: 'tech1@tanejapower.com',
    role: 'USER',
  } as any;

  const mockUser2 = {
    userId: 'user-technician-2',
    email: 'tech2@tanejapower.com',
    role: 'USER',
  } as any;

  it('1. Competing commissioning requests: Only one succeeds, second is rejected with 409 Conflict', async () => {
    // Save original db.transaction
    const originalTx = (db as any).transaction;
    (db as any).transaction = async (cb: any) => cb({});

    try {
      let invocationCount = 0;
      const mockRepo = {
        findById: async () => ({
          id: 'eq-race-1',
          assetNumber: 'EQ-RACE-001',
          warrantyStatus: 'PENDING_ACTIVATION',
        }),
        commissionEquipment: async () => {
          invocationCount++;
          if (invocationCount === 1) {
            // First caller wins atomic UPDATE ... WHERE warrantyStatus = 'PENDING_ACTIVATION'
            return {
              id: 'eq-race-1',
              assetNumber: 'EQ-RACE-001',
              warrantyStatus: 'ACTIVE',
              commissionedById: mockUser1.userId,
              commissionedAt: new Date('2026-10-15T10:00:00Z'),
            };
          }
          // Second caller matches 0 rows because status is already ACTIVE
          return undefined;
        },
      } as any;

      const service = new WarrantyCommissioningService(mockRepo);

      const [winner, loser] = await Promise.allSettled([
        service.commissionEquipment(
          'eq-race-1',
          {
            installationDate: '2026-10-15',
            warrantyDurationValue: 12,
            warrantyDurationUnit: 'MONTHS',
          },
          mockUser1
        ),
        service.commissionEquipment(
          'eq-race-1',
          {
            installationDate: '2026-10-15',
            warrantyDurationValue: 12,
            warrantyDurationUnit: 'MONTHS',
          },
          mockUser2
        ),
      ]);

      // Exactly one succeeds
      assert.equal(winner.status, 'fulfilled');
      if (winner.status === 'fulfilled') {
        assert.equal(winner.value.warranty.status, 'ACTIVE');
        assert.equal(winner.value.warranty.commissionedById, mockUser1.userId);
      }

      // Exactly one fails with 409 Conflict and code ALREADY_COMMISSIONED
      assert.equal(loser.status, 'rejected');
      if (loser.status === 'rejected') {
        const error = loser.reason as AppError;
        assert.equal(error.statusCode, 409);
        assert.equal(error.errorCode, 'ALREADY_COMMISSIONED');
        assert.match(error.message, /could not be commissioned because it is no longer pending activation/i);
      }
    } finally {
      (db as any).transaction = originalTx;
    }
  });

  it('2. Rejects if equipment is already non-pending at the repository update point', async () => {
    const originalTx = (db as any).transaction;
    (db as any).transaction = async (cb: any) => cb({});

    try {
      const mockRepo = {
        findById: async () => ({
          id: 'eq-race-2',
          assetNumber: 'EQ-RACE-002',
          warrantyStatus: 'PENDING_ACTIVATION',
        }),
        commissionEquipment: async () => undefined, // 0 rows updated
      } as any;

      const service = new WarrantyCommissioningService(mockRepo);

      await assert.rejects(
        async () => {
          await service.commissionEquipment(
            'eq-race-2',
            {
              installationDate: '2026-10-15',
              warrantyDurationValue: 12,
              warrantyDurationUnit: 'MONTHS',
            },
            mockUser1
          );
        },
        (err: any) => err.statusCode === 409 && err.errorCode === 'ALREADY_COMMISSIONED'
      );
    } finally {
      (db as any).transaction = originalTx;
    }
  });
});

describe('Stage B4.4.4A: Protect installationDate on Commissioned Equipment (ACTIVE, EXPIRING_SOON, EXPIRED, AMC_COVERED)', () => {
  const mockUser = { id: 'user-mgr', userId: 'user-mgr', role: 'MANAGER' };

  it('1. Rejects installationDate change when warrantyStatus is ACTIVE and does not call repo.update', async () => {
    let updateCalled = false;
    const mockRepo = {
      findById: async (id: string) => ({
        id,
        assetNumber: 'EQ-ACT-001',
        warrantyStatus: 'ACTIVE',
      }),
      update: async (id: string, data: any) => {
        updateCalled = true;
        return { id, ...data };
      },
    } as any;

    const service = new CustomerEquipmentService(mockRepo);

    await assert.rejects(
      async () => {
        await service.updateEquipment(
          'eq-act-1',
          { installationDate: '2026-11-01' },
          mockUser
        );
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Cannot modify installation date directly on equipment with an active or expiring warranty/i);
        return true;
      }
    );
    assert.equal(updateCalled, false, 'Repository update must not be called when installationDate change is rejected on ACTIVE equipment');
  });

  it('2. Rejects installationDate change when warrantyStatus is EXPIRING_SOON and does not call repo.update', async () => {
    let updateCalled = false;
    const mockRepo = {
      findById: async (id: string) => ({
        id,
        assetNumber: 'EQ-EXP-001',
        warrantyStatus: 'EXPIRING_SOON',
      }),
      update: async (id: string, data: any) => {
        updateCalled = true;
        return { id, ...data };
      },
    } as any;

    const service = new CustomerEquipmentService(mockRepo);

    await assert.rejects(
      async () => {
        await service.updateEquipment(
          'eq-exp-1',
          { installationDate: '2026-11-01' },
          mockUser
        );
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Cannot modify installation date directly on equipment with an active or expiring warranty/i);
        return true;
      }
    );
    assert.equal(updateCalled, false, 'Repository update must not be called when installationDate change is rejected on EXPIRING_SOON equipment');
  });

  it('3. Rejects installationDate change when warrantyStatus is EXPIRED and does not call repo.update', async () => {
    let updateCalled = false;
    const mockRepo = {
      findById: async (id: string) => ({
        id,
        assetNumber: 'EQ-EXPD-001',
        warrantyStatus: 'EXPIRED',
      }),
      update: async (id: string, data: any) => {
        updateCalled = true;
        return { id, ...data };
      },
    } as any;

    const service = new CustomerEquipmentService(mockRepo);

    await assert.rejects(
      async () => {
        await service.updateEquipment(
          'eq-expd-1',
          { installationDate: '2026-11-01' },
          mockUser
        );
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Cannot modify installation date directly on equipment with an active or expiring warranty/i);
        return true;
      }
    );
    assert.equal(updateCalled, false, 'Repository update must not be called when installationDate change is rejected on EXPIRED equipment');
  });

  it('4. Rejects installationDate change when warrantyStatus is AMC_COVERED and does not call repo.update', async () => {
    let updateCalled = false;
    const mockRepo = {
      findById: async (id: string) => ({
        id,
        assetNumber: 'EQ-AMC-001',
        warrantyStatus: 'AMC_COVERED',
      }),
      update: async (id: string, data: any) => {
        updateCalled = true;
        return { id, ...data };
      },
    } as any;

    const service = new CustomerEquipmentService(mockRepo);

    await assert.rejects(
      async () => {
        await service.updateEquipment(
          'eq-amc-1',
          { installationDate: '2026-11-01' },
          mockUser
        );
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Cannot modify installation date directly on equipment with an active or expiring warranty/i);
        return true;
      }
    );
    assert.equal(updateCalled, false, 'Repository update must not be called when installationDate change is rejected on AMC_COVERED equipment');
  });

  it('5. Allows updating installationDate when warrantyStatus is PENDING_ACTIVATION and calls repo.update', async () => {
    let updatedPayload: any = null;
    const mockRepo = {
      findById: async (id: string) => ({
        id,
        assetNumber: 'EQ-PND-001',
        warrantyStatus: 'PENDING_ACTIVATION',
      }),
      update: async (id: string, data: any) => {
        updatedPayload = data;
        return { id, ...data };
      },
    } as any;

    const service = new CustomerEquipmentService(mockRepo);
    const result = await service.updateEquipment(
      'eq-pnd-1',
      { installationDate: '2026-10-20' },
      mockUser
    );

    assert.equal(result.id, 'eq-pnd-1');
    assert.equal(updatedPayload.installationDate, '2026-10-20');
  });

  it('6. Allows updating other fields when installationDate is omitted on commissioned equipment (AMC_COVERED)', async () => {
    let updatedPayload: any = null;
    const mockRepo = {
      findById: async (id: string) => ({
        id,
        assetNumber: 'EQ-AMC-002',
        warrantyStatus: 'AMC_COVERED',
      }),
      update: async (id: string, data: any) => {
        updatedPayload = data;
        return { id, ...data };
      },
    } as any;

    const service = new CustomerEquipmentService(mockRepo);
    const result = await service.updateEquipment(
      'eq-amc-2',
      { installationLocation: 'Plant 1, Substation', serialNumber: 'SN-AMC-777' },
      mockUser
    );

    assert.equal(result.id, 'eq-amc-2');
    assert.equal(updatedPayload.installationLocation, 'Plant 1, Substation');
    assert.equal(updatedPayload.serialNumber, 'SN-AMC-777');
  });

  it('7. Allows updating other fields when installationDate is omitted on EXPIRING_SOON equipment', async () => {
    let updatedPayload: any = null;
    const mockRepo = {
      findById: async (id: string) => ({
        id,
        assetNumber: 'EQ-EXP-002',
        warrantyStatus: 'EXPIRING_SOON',
      }),
      update: async (id: string, data: any) => {
        updatedPayload = data;
        return { id, ...data };
      },
    } as any;

    const service = new CustomerEquipmentService(mockRepo);
    const result = await service.updateEquipment(
      'eq-exp-2',
      { installationLocation: 'Building B, Floor 3', serialNumber: 'SN-EXP-999' },
      mockUser
    );

    assert.equal(result.id, 'eq-exp-2');
    assert.equal(updatedPayload.installationLocation, 'Building B, Floor 3');
    assert.equal(updatedPayload.serialNumber, 'SN-EXP-999');
  });
});

describe('Stage B2 Fix LOW: Narrow Unique-Constraint Recovery in WarrantyFollowUpService', () => {
  const dummyEquipment = {
    id: 'eq-fu-001',
    customerId: 'cust-001',
    assetNumber: 'EQ-FU-001',
    productName: '100kVA Diesel Generator',
    serialNumber: 'SN-001',
  } as any;

  it('1. Recovers safely when target constraint follow_ups_equipment_warranty_cycle_unique_idx is caught and record exists on recheck', async () => {
    const originalSelect = (db as any).select;
    const originalInsert = (db as any).insert;

    const existingFollowUp = {
      id: 'fu-existing-1',
      followUpNumber: 'FU-WARR-001',
      type: 'WARRANTY_EXPIRY',
      warrantyCycle: 'WC-2027-10-14',
      status: 'PENDING',
    };

    let selectCallCount = 0;
    (db as any).select = () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount++;
            if (selectCallCount === 1) {
              return []; // First check finds nothing
            }
            return [existingFollowUp]; // Recheck finds the existing follow-up created concurrently
          },
        }),
      }),
    });

    (db as any).insert = () => ({
      values: () => ({
        returning: async () => {
          const err = new Error('duplicate key value violates unique constraint "follow_ups_equipment_warranty_cycle_unique_idx"');
          (err as any).code = '23505';
          (err as any).constraint = 'follow_ups_equipment_warranty_cycle_unique_idx';
          throw err;
        },
      }),
    });

    try {
      const mockFollowUpRepo = {
        generateFollowUpNumber: async () => 'FU-WARR-002',
      } as any;
      const service = new WarrantyFollowUpService(mockFollowUpRepo);

      const result = await service.createWarrantyExpiryFollowUp({
        equipment: dummyEquipment,
        warrantyEndDateStr: '2027-10-14',
        proposedAmcStartDateStr: '2027-10-15',
        warrantyCycle: 'WC-2027-10-14',
        actorUserId: 'user-sys',
      });

      assert.equal(result.created, false);
      assert.equal(result.reason, 'ALREADY_EXISTS');
      assert.equal(result.followUp.id, 'fu-existing-1');
    } finally {
      (db as any).select = originalSelect;
      (db as any).insert = originalInsert;
    }
  });

  it('2. Immediately rethrows unrelated unique-constraint violation (e.g. follow_ups_follow_up_number_key)', async () => {
    const originalSelect = (db as any).select;
    const originalInsert = (db as any).insert;

    (db as any).select = () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    });

    (db as any).insert = () => ({
      values: () => ({
        returning: async () => {
          const err = new Error('duplicate key value violates unique constraint "follow_ups_follow_up_number_key"');
          (err as any).code = '23505';
          (err as any).constraint = 'follow_ups_follow_up_number_key';
          throw err;
        },
      }),
    });

    try {
      const mockFollowUpRepo = {
        generateFollowUpNumber: async () => 'FU-WARR-002',
      } as any;
      const service = new WarrantyFollowUpService(mockFollowUpRepo);

      await assert.rejects(
        async () => {
          await service.createWarrantyExpiryFollowUp({
            equipment: dummyEquipment,
            warrantyEndDateStr: '2027-10-14',
            proposedAmcStartDateStr: '2027-10-15',
            warrantyCycle: 'WC-2027-10-14',
            actorUserId: 'user-sys',
          });
        },
        (err: any) => {
          assert.equal(err.code, '23505');
          assert.equal(err.constraint, 'follow_ups_follow_up_number_key');
          return true;
        }
      );
    } finally {
      (db as any).select = originalSelect;
      (db as any).insert = originalInsert;
    }
  });

  it('3. Rethrows constraint error if target constraint triggers but recheck finds no existing record', async () => {
    const originalSelect = (db as any).select;
    const originalInsert = (db as any).insert;

    (db as any).select = () => ({
      from: () => ({
        where: () => ({
          limit: async () => [], // Recheck also returns empty
        }),
      }),
    });

    (db as any).insert = () => ({
      values: () => ({
        returning: async () => {
          const err = new Error('unique constraint collision');
          (err as any).code = '23505';
          (err as any).constraint = 'follow_ups_equipment_warranty_cycle_unique_idx';
          throw err;
        },
      }),
    });

    try {
      const mockFollowUpRepo = {
        generateFollowUpNumber: async () => 'FU-WARR-002',
      } as any;
      const service = new WarrantyFollowUpService(mockFollowUpRepo);

      await assert.rejects(
        async () => {
          await service.createWarrantyExpiryFollowUp({
            equipment: dummyEquipment,
            warrantyEndDateStr: '2027-10-14',
            proposedAmcStartDateStr: '2027-10-15',
            warrantyCycle: 'WC-2027-10-14',
            actorUserId: 'user-sys',
          });
        },
        (err: any) => {
          assert.equal(err.code, '23505');
          assert.equal(err.constraint, 'follow_ups_equipment_warranty_cycle_unique_idx');
          return true;
        }
      );
    } finally {
      (db as any).select = originalSelect;
      (db as any).insert = originalInsert;
    }
  });
});

describe('Stage B2 Fix MEDIUM: Bounded Reminder Scans & Concurrency Guard', () => {
  it('1. Rejects overlapping scan with 409 Conflict when scan is already in progress', async () => {
    WarrantyReminderService.resetScanLock();

    const originalSelect = (db as any).select;
    (db as any).select = () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => new Promise((resolve) => setTimeout(() => resolve([]), 50)),
          }),
        }),
      }),
    });

    try {
      const service = new WarrantyReminderService();

      // Launch first scan
      const firstRun = service.processWarrantyExpiryReminders({ referenceDate: '2026-10-15' });

      // Immediate second scan while first is in progress
      await assert.rejects(
        async () => {
          await service.processWarrantyExpiryReminders({ referenceDate: '2026-10-15' });
        },
        (err: any) => {
          assert.equal(err.statusCode, 409);
          assert.equal(err.errorCode, 'SCAN_IN_PROGRESS');
          assert.match(err.message, /Warranty reminder scan is already in progress/i);
          return true;
        }
      );

      // Await first run completion
      await firstRun;

      // Lock is released after first run completes
      assert.equal(WarrantyReminderService.isLocked(), false);
    } finally {
      (db as any).select = originalSelect;
      WarrantyReminderService.resetScanLock();
    }
  });

  it('2. Releases lock even if an unexpected error occurs during scan execution', async () => {
    WarrantyReminderService.resetScanLock();

    const originalSelect = (db as any).select;
    (db as any).select = () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => {
              throw new Error('Database connection dropped');
            },
          }),
        }),
      }),
    });

    try {
      const service = new WarrantyReminderService();

      await assert.rejects(
        async () => {
          await service.processWarrantyExpiryReminders({ referenceDate: '2026-10-15' });
        },
        (err: any) => err.message === 'Database connection dropped'
      );

      // Lock must be released in finally block
      assert.equal(WarrantyReminderService.isLocked(), false);
    } finally {
      (db as any).select = originalSelect;
      WarrantyReminderService.resetScanLock();
    }
  });

  it('3. Validates and clamps reminder run options schema', () => {
    const valid = processWarrantyRemindersSchema.parse({
      batchSize: 50,
      limit: 200,
      referenceDate: '2026-10-15',
    });
    assert.equal(valid.batchSize, 50);
    assert.equal(valid.limit, 200);
    assert.equal(valid.referenceDate, '2026-10-15');

    // Empty object accepts defaults
    const empty = processWarrantyRemindersSchema.parse({});
    assert.equal(empty.batchSize, undefined);
    assert.equal(empty.limit, undefined);

    // Rejects batchSize > 500
    assert.throws(
      () => processWarrantyRemindersSchema.parse({ batchSize: 1000 }),
      (err: any) => err.issues.length > 0
    );

    // Rejects negative limit
    assert.throws(
      () => processWarrantyRemindersSchema.parse({ limit: -10 }),
      (err: any) => err.issues.length > 0
    );
  });
});


