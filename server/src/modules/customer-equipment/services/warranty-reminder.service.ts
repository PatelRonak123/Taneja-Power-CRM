import { db } from '../../../database/db.js';
import { customerEquipment } from '../../../database/schema/customer-equipment.js';
import { amcContractEquipment, amcContracts } from '../../../database/schema/amc-contracts.js';
import { WarrantyFollowUpService } from './warranty-follow-up.service.js';
import {
  parseCalendarDate,
  formatCalendarDate,
  addDaysToCalendarDate,
} from '../utils/warranty-date.util.js';
import { eq, and, gte, lte, inArray, isNotNull, or, gt, asc } from 'drizzle-orm';
import { logger } from '../../../common/logger/logger.js';
import { AppError } from '../../../common/errors/AppError.js';

export interface ReminderRunOptions {
  actorUserId?: string;
  referenceDate?: string | Date; // Defaults to current date (Asia/Kolkata)
  batchSize?: number; // Bounded batch chunk size (default 100, max 500)
  limit?: number; // Optional safety cap on total records processed in this invocation
}

export interface ReminderRunSummary {
  scannedCount: number;
  generatedCount: number;
  skippedCount: number;
  alreadyCoveredCount: number;
  details: Array<{
    equipmentId: string;
    assetNumber: string;
    warrantyEndDate: string;
    status: 'CREATED' | 'SKIPPED_ALREADY_EXISTS' | 'SKIPPED_AMC_COVERED';
    followUpId?: string;
  }>;
}

export class WarrantyReminderService {
  private static isScanInProgress = false;

  constructor(
    private readonly followUpService: WarrantyFollowUpService = new WarrantyFollowUpService()
  ) {}

  /**
   * Helper to inspect the in-process scan lock status (useful for observability and testing).
   */
  public static isLocked(): boolean {
    return WarrantyReminderService.isScanInProgress;
  }

  /**
   * Helper to manually reset the in-process scan lock (useful for testing).
   */
  public static resetScanLock(): void {
    WarrantyReminderService.isScanInProgress = false;
  }

  /**
   * Scans equipment warranties and generates 30-day pre-expiry follow-ups for the Service Office.
   *
   * Architectural & Concurrency Guarantees:
   * 1. In-process concurrency guard: Uses a static `isScanInProgress` lock to prevent overlapping
   *    reminder scans within the same Node.js process. If a scan is already running, throws
   *    `AppError.conflict('Warranty reminder scan is already in progress.', 'SCAN_IN_PROGRESS')`.
   *    NOTE ON MULTI-INSTANCE LIMITATION: This in-process lock only coordinates executions within a single
   *    Node.js runtime. In multi-instance or clustered environments, cross-process concurrency is safely
   *    guaranteed by PostgreSQL database-level unique constraints
   *    (`follow_ups_equipment_warranty_cycle_unique_idx`) and deterministic query semantics.
   * 2. Bounded batching via cursor: Queries equipment in bounded deterministic chunks using composite cursor
   *    pagination ordered by `warrantyEndDate ASC, id ASC` up to `batchSize` (default 100, max 500) per chunk.
   *    This avoids loading unbounded equipment tables into memory while ensuring no records are skipped or
   *    repeated across batch boundaries.
   * 3. Idempotent & non-destructive: Equipment already covered by active AMC (via `warrantyStatus === 'AMC_COVERED'`
   *    or active contract in `amc_contracts`) is excluded and never overwritten.
   * 4. Missed-run recovery: Scans the full window `[Today, Today + 30 Calendar Days]` to capture
   *    any warranties expiring soon even if the reminder engine was offline on earlier days.
   */
  async processWarrantyExpiryReminders(options: ReminderRunOptions = {}): Promise<ReminderRunSummary> {
    if (WarrantyReminderService.isScanInProgress) {
      throw AppError.conflict(
        'Warranty reminder scan is already in progress. Please wait for the current run to complete.',
        'SCAN_IN_PROGRESS'
      );
    }

    WarrantyReminderService.isScanInProgress = true;

    try {
      const { actorUserId = '00000000-0000-0000-0000-000000000000', referenceDate } = options;

      // 1. Calculate calendar boundaries (Today and Today + 30 Days)
      const refParsed = referenceDate
        ? parseCalendarDate(referenceDate)
        : parseCalendarDate(
            new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
          );

      const targetDateParsed = addDaysToCalendarDate(refParsed.year, refParsed.month, refParsed.day, 30);

      const refDateStr = formatCalendarDate(refParsed.year, refParsed.month, refParsed.day);
      const targetDateStr = formatCalendarDate(
        targetDateParsed.year,
        targetDateParsed.month,
        targetDateParsed.day
      );

      const windowStart = new Date(Date.UTC(refParsed.year, refParsed.month - 1, refParsed.day, 0, 0, 0, 0));
      const windowEnd = new Date(
        Date.UTC(targetDateParsed.year, targetDateParsed.month - 1, targetDateParsed.day, 23, 59, 59, 999)
      );

      logger.info(
        `Running warranty expiry reminder scan for window [${refDateStr} to ${targetDateStr}]`
      );

      const summary: ReminderRunSummary = {
        scannedCount: 0,
        generatedCount: 0,
        skippedCount: 0,
        alreadyCoveredCount: 0,
        details: [],
      };

      const batchSize = Math.max(1, Math.min(options.batchSize || 100, 500));
      const maxRecords = options.limit;

      let cursor: { warrantyEndDate: Date; id: string } | null = null;
      let hasMore = true;

      // 2. Deterministic cursor-based batch loop
      while (hasMore) {
        if (maxRecords !== undefined && summary.scannedCount >= maxRecords) {
          break;
        }

        const currentLimit = maxRecords !== undefined
          ? Math.min(batchSize, maxRecords - summary.scannedCount)
          : batchSize;

        const conditions: any[] = [
          inArray(customerEquipment.warrantyStatus, ['ACTIVE', 'EXPIRING_SOON']),
          isNotNull(customerEquipment.warrantyEndDate),
          gte(customerEquipment.warrantyEndDate, windowStart),
          lte(customerEquipment.warrantyEndDate, windowEnd),
        ];

        if (cursor) {
          conditions.push(
            or(
              gt(customerEquipment.warrantyEndDate, cursor.warrantyEndDate),
              and(
                eq(customerEquipment.warrantyEndDate, cursor.warrantyEndDate),
                gt(customerEquipment.id, cursor.id)
              )
            )!
          );
        }

        const batch = await db
          .select()
          .from(customerEquipment)
          .where(and(...conditions))
          .orderBy(asc(customerEquipment.warrantyEndDate), asc(customerEquipment.id))
          .limit(currentLimit);

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        summary.scannedCount += batch.length;

        // Update cursor to last record in current batch
        const lastItem = batch[batch.length - 1];
        cursor = {
          warrantyEndDate: lastItem.warrantyEndDate!,
          id: lastItem.id,
        };

        // 3. Batch check for existing active AMC coverage for this batch of equipment
        const batchIds = batch.map((e) => e.id);
        const activeAmcRows = await db
          .select({ equipmentId: amcContractEquipment.customerEquipmentId })
          .from(amcContractEquipment)
          .innerJoin(amcContracts, eq(amcContracts.id, amcContractEquipment.amcContractId))
          .where(
            and(
              inArray(amcContractEquipment.customerEquipmentId, batchIds),
              eq(amcContracts.status, 'ACTIVE')
            )
          );

        const activeAmcEquipmentSet = new Set(
          activeAmcRows.map((r) => r.equipmentId).filter(Boolean) as string[]
        );

        // 4. Process each eligible equipment record in current batch
        for (const eqRecord of batch) {
          const endYear = eqRecord.warrantyEndDate!.getUTCFullYear();
          const endMonth = eqRecord.warrantyEndDate!.getUTCMonth() + 1;
          const endDay = eqRecord.warrantyEndDate!.getUTCDate();
          const warrantyEndDateStr = formatCalendarDate(endYear, endMonth, endDay);

          // Proposed AMC start date = Day after warranty expiry
          const amcStartParsed = addDaysToCalendarDate(endYear, endMonth, endDay, 1);
          const proposedAmcStartDateStr = formatCalendarDate(
            amcStartParsed.year,
            amcStartParsed.month,
            amcStartParsed.day
          );

          const warrantyCycle = `WC-${warrantyEndDateStr}`;

          // Check active AMC
          if (activeAmcEquipmentSet.has(eqRecord.id) || eqRecord.warrantyStatus === 'AMC_COVERED') {
            summary.alreadyCoveredCount += 1;
            summary.details.push({
              equipmentId: eqRecord.id,
              assetNumber: eqRecord.assetNumber,
              warrantyEndDate: warrantyEndDateStr,
              status: 'SKIPPED_AMC_COVERED',
            });
            continue;
          }

          // Create follow-up idempotently
          const result = await this.followUpService.createWarrantyExpiryFollowUp({
            equipment: eqRecord,
            warrantyEndDateStr,
            proposedAmcStartDateStr,
            warrantyCycle,
            actorUserId,
          });

          if (result.created) {
            summary.generatedCount += 1;

            // Transition status from ACTIVE to EXPIRING_SOON if needed
            if (eqRecord.warrantyStatus === 'ACTIVE') {
              await db
                .update(customerEquipment)
                .set({ warrantyStatus: 'EXPIRING_SOON', updatedAt: new Date() })
                .where(eq(customerEquipment.id, eqRecord.id));
            }

            summary.details.push({
              equipmentId: eqRecord.id,
              assetNumber: eqRecord.assetNumber,
              warrantyEndDate: warrantyEndDateStr,
              status: 'CREATED',
              followUpId: result.followUp.id,
            });
          } else {
            summary.skippedCount += 1;
            summary.details.push({
              equipmentId: eqRecord.id,
              assetNumber: eqRecord.assetNumber,
              warrantyEndDate: warrantyEndDateStr,
              status: 'SKIPPED_ALREADY_EXISTS',
              followUpId: result.followUp.id,
            });
          }
        }

        if (batch.length < currentLimit) {
          hasMore = false;
          break;
        }
      }

      return summary;
    } finally {
      WarrantyReminderService.isScanInProgress = false;
    }
  }
}
