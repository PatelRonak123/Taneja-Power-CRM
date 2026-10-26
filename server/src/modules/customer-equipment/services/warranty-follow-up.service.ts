import { db } from '../../../database/db.js';
import { followUps, FollowUpEntity } from '../../../database/schema/follow-ups.js';
import { CustomerEquipmentEntity } from '../../../database/schema/customer-equipment.js';
import { FollowUpRepository } from '../../follow-ups/repositories/follow-up.repository.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../common/logger/logger.js';

export interface CreateWarrantyExpiryFollowUpOptions {
  equipment: CustomerEquipmentEntity & { customerName?: string };
  warrantyEndDateStr: string;
  proposedAmcStartDateStr: string;
  warrantyCycle: string;
  actorUserId: string;
  scheduledDate?: string;
  contactMethod?: 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'IN_PERSON' | 'SITE_VISIT';
}

export interface WarrantyFollowUpResult {
  created: boolean;
  followUp: FollowUpEntity;
  reason?: 'ALREADY_EXISTS' | 'CREATED';
}

export class WarrantyFollowUpService {
  constructor(
    private readonly followUpRepo: FollowUpRepository = new FollowUpRepository()
  ) {}

  /**
   * Idempotently creates a Service Office warranty expiry follow-up record for an installed asset.
   *
   * Business Rules:
   * 1. Uses existing follow_ups table with type WARRANTY_EXPIRY.
   * 2. Binds customerEquipmentId and warrantyCycle.
   * 3. Idempotent: If a follow-up already exists for the same equipment, warranty cycle, and type, returns existing.
   * 4. Concurrency safe: Handles PostgreSQL unique constraint (23505) gracefully.
   * 5. Does NOT create an AMC contract or send unapproved communications.
   */
  async createWarrantyExpiryFollowUp(
    options: CreateWarrantyExpiryFollowUpOptions
  ): Promise<WarrantyFollowUpResult> {
    const {
      equipment,
      warrantyEndDateStr,
      proposedAmcStartDateStr,
      warrantyCycle,
      actorUserId,
      scheduledDate,
      contactMethod = 'PHONE',
    } = options;

    // 1. Query for existing follow-up for this equipment, cycle, and type
    const [existing] = await db
      .select()
      .from(followUps)
      .where(
        and(
          eq(followUps.customerEquipmentId, equipment.id),
          eq(followUps.warrantyCycle, warrantyCycle),
          eq(followUps.type, 'WARRANTY_EXPIRY')
        )
      )
      .limit(1);

    if (existing) {
      return {
        created: false,
        followUp: existing,
        reason: 'ALREADY_EXISTS',
      };
    }

    // 2. Prepare follow-up metadata
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const followUpDate = scheduledDate || todayStr;
    const followUpNumber = await this.followUpRepo.generateFollowUpNumber();

    const title = `Warranty Expiry Follow-Up - ${equipment.assetNumber}`;
    const description = [
      `Asset Number: ${equipment.assetNumber}`,
      `Product: ${equipment.productName}`,
      equipment.serialNumber ? `Serial Number: ${equipment.serialNumber}` : null,
      `Warranty End Date: ${warrantyEndDateStr}`,
      `Proposed AMC Start Date: ${proposedAmcStartDateStr}`,
      `Warranty Cycle: ${warrantyCycle}`,
      `Service Office action: Contact customer for AMC transition prior to warranty expiration.`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const [newFollowUp] = await db
        .insert(followUps)
        .values({
          followUpNumber,
          title,
          description,
          type: 'WARRANTY_EXPIRY',
          status: 'PENDING',
          priority: 'MEDIUM',
          scheduledDate: followUpDate,
          scheduledTime: '10:00',
          customerId: equipment.customerId,
          customerEquipmentId: equipment.id,
          warrantyCycle,
          contactMethod,
          createdBy: actorUserId,
        })
        .returning();

      return {
        created: true,
        followUp: newFollowUp,
        reason: 'CREATED',
      };
    } catch (err: any) {
      // Handle PostgreSQL unique constraint violation (code 23505) specifically on follow_ups_equipment_warranty_cycle_unique_idx
      const errorCode = err?.code || err?.cause?.code;
      const constraintName = err?.constraint || err?.cause?.constraint;

      if (errorCode === '23505' && constraintName === 'follow_ups_equipment_warranty_cycle_unique_idx') {
        logger.info(
          `Concurrent insert caught for warranty follow-up on equipment ${equipment.id} cycle ${warrantyCycle}. Fetching existing record.`
        );
        const [rechecked] = await db
          .select()
          .from(followUps)
          .where(
            and(
              eq(followUps.customerEquipmentId, equipment.id),
              eq(followUps.warrantyCycle, warrantyCycle),
              eq(followUps.type, 'WARRANTY_EXPIRY')
            )
          )
          .limit(1);

        if (rechecked) {
          return {
            created: false,
            followUp: rechecked,
            reason: 'ALREADY_EXISTS',
          };
        }
      }
      throw err;
    }
  }
}
