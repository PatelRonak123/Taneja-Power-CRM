import { AppError } from '../../../common/errors/AppError.js';
import { JwtPayload } from '../../../common/auth/jwt.js';
import { CustomerEquipmentRepository } from '../repositories/customer-equipment.repository.js';
import { CommissionCustomerEquipmentInput } from '../validators/customer-equipment.validator.js';
import { calculateWarrantyDates } from '../utils/warranty-date.util.js';
import { db } from '../../../database/db.js';

export interface CommissioningResult {
  equipment: any;
  warranty: {
    status: string;
    installationDate: string;
    warrantyStartDate: string;
    warrantyEndDate: string;
    proposedAmcStartDate: string;
    warrantyDurationValue: number;
    warrantyDurationUnit: string;
    warrantyCycle: string;
    commissionedById: string;
    commissionedAt: Date | null;
  };
}

export class WarrantyCommissioningService {
  constructor(
    private readonly equipmentRepo: CustomerEquipmentRepository = new CustomerEquipmentRepository()
  ) {}

  /**
   * Commission equipment and activate its warranty.
   *
   * Business Rules:
   * 1. Commissioning is the ONLY event that activates warranty coverage.
   * 2. Equipment must exist.
   * 3. Prevents duplicate commissioning or silent overwrite of an already active warranty.
   * 4. Calculates warranty end date and proposed AMC start date deterministically.
   * 5. Sets commissionedById from authenticated user identity (never client-supplied user ID).
   * 6. Executes inside a database transaction.
   */
  async commissionEquipment(
    equipmentId: string,
    input: CommissionCustomerEquipmentInput,
    authUser?: JwtPayload
  ): Promise<CommissioningResult> {
    if (!authUser || !authUser.userId) {
      throw AppError.unauthorized('Authenticated user context is required to commission equipment.');
    }

    // 1. Verify equipment exists
    const existing = await this.equipmentRepo.findById(equipmentId);
    if (!existing) {
      throw AppError.notFound(`Customer Equipment with ID "${equipmentId}" was not found`, 'EQUIPMENT_NOT_FOUND');
    }

    // 2. Prevent accidental duplicate commissioning or silent replacement
    if (existing.warrantyStatus === 'ACTIVE') {
      throw AppError.conflict(
        `Equipment "${existing.assetNumber}" is already commissioned with an active warranty (Expires: ${existing.warrantyEndDate ? new Date(existing.warrantyEndDate).toISOString().slice(0, 10) : 'N/A'}). Recommissioning is not permitted.`,
        'ALREADY_COMMISSIONED'
      );
    }

    if (existing.warrantyStatus === 'AMC_COVERED') {
      throw AppError.conflict(
        `Equipment "${existing.assetNumber}" is currently covered by an active AMC contract.`,
        'EQUIPMENT_AMC_COVERED'
      );
    }

    if (existing.warrantyStatus === 'EXPIRED') {
      throw AppError.badRequest(
        `Equipment "${existing.assetNumber}" warranty has already expired.`,
        undefined,
        'WARRANTY_ALREADY_EXPIRED'
      );
    }

    // 3. Deterministically calculate warranty dates
    const dates = calculateWarrantyDates({
      installationDate: input.installationDate,
      durationValue: input.warrantyDurationValue,
      durationUnit: input.warrantyDurationUnit,
    });

    // 4. Persist in a database transaction
    const updated = await db.transaction(async (tx) => {
      const result = await this.equipmentRepo.commissionEquipment(
        equipmentId,
        {
          installationDate: dates.warrantyStartDate,
          warrantyStartDate: dates.warrantyStartDate,
          warrantyEndDate: dates.warrantyEndDate,
          warrantyDurationValue: input.warrantyDurationValue,
          warrantyDurationUnit: input.warrantyDurationUnit,
          warrantyStatus: 'ACTIVE',
          commissioningNotes: input.commissioningNotes || null,
          commissionedById: authUser.userId,
          commissionedAt: new Date(),
        },
        tx
      );

      if (!result) {
        throw AppError.conflict(
          `Equipment "${existing.assetNumber}" could not be commissioned because it is no longer pending activation (it may have been commissioned concurrently).`,
          'ALREADY_COMMISSIONED'
        );
      }

      return result;
    });

    return {
      equipment: updated,
      warranty: {
        status: 'ACTIVE',
        installationDate: dates.installationDateStr,
        warrantyStartDate: dates.installationDateStr,
        warrantyEndDate: dates.warrantyEndDateStr,
        proposedAmcStartDate: dates.proposedAmcStartDateStr,
        warrantyDurationValue: input.warrantyDurationValue,
        warrantyDurationUnit: input.warrantyDurationUnit,
        warrantyCycle: dates.warrantyCycle,
        commissionedById: authUser.userId,
        commissionedAt: updated.commissionedAt,
      },
    };
  }
}
