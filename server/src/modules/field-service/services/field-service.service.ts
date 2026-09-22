import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  fieldServiceReports,
  fieldServiceSiteObservations,
  fieldServiceBatteryBanks,
  fieldServiceBatteryReadings,
  fieldServiceParts,
  fieldServiceAttachments,
  fieldServiceActivityLogs,
} from '../../../database/schema/field-service.js';
import { customers, customerDestinations } from '../../../database/schema/customers.js';
import { users } from '../../../database/schema/users.js';
import { products } from '../../../database/schema/products.js';
import { FieldServiceRepository, FsrFilterOptions } from '../repositories/field-service.repository.js';
import { FsrNumberService } from './fsr-number.service.js';
import { FsrPdfService } from './fsr-pdf.service.js';
import {
  CreateFsrDto,
  UpdateFsrDto,
  AssignFseDto,
  SiteObservationDto,
  BatteryBankDto,
  BatteryReadingDto,
  PartReplacementDto,
  CustomerSignOffDto,
  FseSignOffDto,
  AttachmentUploadDto,
} from '../validators/field-service.validator.js';
import { AppError } from '../../../common/errors/AppError.js';
import { JwtPayload } from '../../../common/auth/jwt.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.resolve(__dirname, '../../../../uploads/fsr');

export class FieldServiceService {
  constructor(
    private readonly repo: FieldServiceRepository = new FieldServiceRepository(),
    private readonly numberService: FsrNumberService = new FsrNumberService()
  ) {}

  /**
   * Helper: Ensure local upload directories exist
   */
  private async ensureUploadDir(subfolder: string): Promise<string> {
    const dir = path.join(UPLOADS_ROOT, subfolder);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  /**
   * Helper: Save base64 data to local file if applicable
   */
  private async saveBase64File(base64Data: string, subfolder: string, filenamePrefix: string): Promise<string> {
    const dir = await this.ensureUploadDir(subfolder);
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    let buffer: Buffer;
    let extension = 'png';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('jpeg') || mime.includes('jpg')) extension = 'jpg';
      else if (mime.includes('pdf')) extension = 'pdf';
      else if (mime.includes('svg')) extension = 'svg';
      else if (mime.includes('png')) extension = 'png';
      buffer = Buffer.from(matches[2], 'base64');
    } else if (base64Data.startsWith('data:image/svg+xml')) {
      extension = 'svg';
      const commaIdx = base64Data.indexOf(',');
      const rawContent = commaIdx !== -1 ? base64Data.slice(commaIdx + 1) : base64Data;
      buffer = Buffer.from(decodeURIComponent(rawContent), 'utf-8');
    } else if (!base64Data.startsWith('http') && !base64Data.startsWith('/')) {
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      return base64Data; // Already a URL or relative path
    }

    const filename = `${filenamePrefix}-${Date.now()}.${extension}`;
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);

    return `/uploads/fsr/${subfolder}/${filename}`;
  }

  /**
   * 1. Create a brand new Field Service Report (FSR)
   */
  async createFsr(input: CreateFsrDto, authUser: JwtPayload) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    // Authoritative check on creator
    if (authUser.role === APP_CONSTANTS.ROLES.USER) {
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, authUser.userId))
        .limit(1);

      const designation = (currentUser?.designation || '').toLowerCase();
      const salesKeywords = ['sales', 'representative', 'executive', 'business dev', 'account manager', 'account exec', 'bd'];
      const engineeringKeywords = ['engineer', 'tech', 'service', 'fse', 'electrician', 'technician'];
      const isEngineer = engineeringKeywords.some((k) => designation.includes(k));
      const isSales = !isEngineer && salesKeywords.some((k) => designation.includes(k));

      if (isSales) {
        throw AppError.forbidden('Sales representatives cannot create Field Service Reports');
      }

      if (input.serviceEngineerId && input.serviceEngineerId !== authUser.userId) {
        throw AppError.forbidden('Field Service Engineers can only create reports assigned to themselves');
      }
    }

    // 1. Authoritative Customer Validation & Snapshot
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (!customer) {
      throw AppError.notFound('Customer not found');
    }
    if (customer.status !== 'ACTIVE') {
      throw AppError.badRequest('Cannot create an FSR for an inactive customer');
    }

    // 2. Authoritative Destination Validation
    let destination = null;
    if (input.destinationId) {
      const [dest] = await db
        .select()
        .from(customerDestinations)
        .where(eq(customerDestinations.id, input.destinationId))
        .limit(1);

      if (!dest) {
        throw AppError.notFound('Destination site not found');
      }
      if (dest.customerId !== customer.id) {
        throw AppError.badRequest('Selected destination site does not belong to this customer');
      }
      destination = dest;
    }

    // 3. Authoritative Service Engineer Validation
    const [serviceEngineer] = await db
      .select()
      .from(users)
      .where(eq(users.id, input.serviceEngineerId))
      .limit(1);

    if (!serviceEngineer) {
      throw AppError.notFound('Service Engineer not found');
    }
    if (serviceEngineer.status !== 'ACTIVE') {
      throw AppError.badRequest('Selected Service Engineer is inactive');
    }

    // 4. Product Validation (Optional)
    let product = null;
    if (input.productId) {
      const [prod] = await db
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!prod) {
        throw AppError.notFound('Product not found in catalog');
      }
      product = prod;
    }

    // 5. Atomic Transaction: Master, Children & Activity Log
    const createdFsrId = await db.transaction(async (tx) => {
      const visitDate = new Date(input.visitDate);
      const fsrNumber = await this.numberService.generateFsrNumber('FSR', visitDate, tx);

      // Customer Snapshot: fallback to destination address if primary address is blank
      const snapshotAddress = customer.address || (destination ? destination.address : null);

      // A. Insert Master FSR Record
      const [newFsr] = await tx
        .insert(fieldServiceReports)
        .values({
          fsrNumber,
          customerId: customer.id,
          destinationId: destination?.id || null,
          productId: product?.id || null,
          serviceEngineerId: serviceEngineer.id,
          createdById: authUser.userId,
          updatedById: authUser.userId,
          visitDate,
          problemReported: input.problemReported || null,
          reasonForVisit: input.reasonForVisit || null,
          callType: input.callType,
          status: input.status || APP_CONSTANTS.FSR_STATUSES.DRAFT,
          warrantyStatus: input.warrantyStatus || APP_CONSTANTS.FSR_WARRANTY_STATUSES.UNDER_WARRANTY,
          billingStatus: input.billingStatus || APP_CONSTANTS.FSR_BILLING_STATUSES.FREE_SERVICE,

          // Equipment Snapshot
          productModel: input.productModel || product?.name || null,
          productMake: input.productMake || null,
          productSerialNumber: input.productSerialNumber || null,
          equipmentStatus: input.equipmentStatus || 'WORKING',

          // Customer Snapshot
          customerName: customer.name,
          companyName: customer.companyName || null,
          customerPhone: customer.phone || null,
          customerEmail: customer.email || null,
          customerAddress: snapshotAddress,

          // Financials & Standby
          charges: String(input.charges || '0.00'),
          chargesRemarks: input.chargesRemarks || null,
          standbyDetails: input.standbyDetails || null,

          // Feedback
          fseFeedback: input.fseFeedback || null,
          customerFeedback: input.customerFeedback || null,

          // Sign-offs
          customerContactName: input.customerContactName || null,
          customerSignature: input.customerSignature || null,
          customerStamp: input.customerStamp || null,
          customerSignedAt: input.customerSignedAt ? new Date(input.customerSignedAt) : null,
          fseName: input.fseName || serviceEngineer.fullName,
          fseNumber: input.fseNumber || serviceEngineer.phone || null,
          fseSignature: input.fseSignature || null,
          fseSignatureDate: input.fseSignatureDate ? new Date(input.fseSignatureDate) : null,
        })
        .returning({ id: fieldServiceReports.id });

      // B. Insert Site Observation if provided
      if (input.siteObservation) {
        await tx.insert(fieldServiceSiteObservations).values({
          fsrId: newFsr.id,
          inputOnMains: input.siteObservation.inputOnMains || null,
          inputVoltageLN: input.siteObservation.inputVoltageLN ? String(input.siteObservation.inputVoltageLN) : null,
          inputVoltageLL: input.siteObservation.inputVoltageLL ? String(input.siteObservation.inputVoltageLL) : null,
          outputVoltageLN: input.siteObservation.outputVoltageLN ? String(input.siteObservation.outputVoltageLN) : null,
          outputVoltageLL: input.siteObservation.outputVoltageLL ? String(input.siteObservation.outputVoltageLL) : null,
          vac: input.siteObservation.vac ? String(input.siteObservation.vac) : null,
          frequency: input.siteObservation.frequency ? String(input.siteObservation.frequency) : null,
          dcVoltage: input.siteObservation.dcVoltage ? String(input.siteObservation.dcVoltage) : null,
          outputLoadPercent: input.siteObservation.outputLoadPercent ? String(input.siteObservation.outputLoadPercent) : null,
          inputFrequency: input.siteObservation.inputFrequency ? String(input.siteObservation.inputFrequency) : null,
          outputFrequency: input.siteObservation.outputFrequency ? String(input.siteObservation.outputFrequency) : null,
          environmentCondition: input.siteObservation.environmentCondition || null,
          environmentRemarks: input.siteObservation.environmentRemarks || null,
          upsLocation: input.siteObservation.upsLocation || null,
          otherLocationSpecification: input.siteObservation.otherLocationSpecification || null,
          observationsNotes: input.siteObservation.observationsNotes || null,
        });
      }

      // C. Insert Battery Banks & Readings if provided
      if (input.batteryBanks && input.batteryBanks.length > 0) {
        for (const bank of input.batteryBanks) {
          const [newBank] = await tx
            .insert(fieldServiceBatteryBanks)
            .values({
              fsrId: newFsr.id,
              bankNumber: bank.bankNumber || 1,
              bankDescription: bank.bankDescription || null,
              make: bank.make || null,
              ah: bank.ah || null,
              quantity: bank.quantity || 20,
              frontIndication: bank.frontIndication || null,
              voltage: bank.voltage ? String(bank.voltage) : null,
              chargingCurrent: bank.chargingCurrent ? String(bank.chargingCurrent) : null,
              dischargingCurrent: bank.dischargingCurrent ? String(bank.dischargingCurrent) : null,
              remarks: bank.remarks || null,
            })
            .returning({ id: fieldServiceBatteryBanks.id });

          if (bank.readings && bank.readings.length > 0) {
            for (const reading of bank.readings) {
              await tx.insert(fieldServiceBatteryReadings).values({
                fsrId: newFsr.id,
                batteryBankId: newBank.id,
                batteryNumber: reading.batteryNumber,
                chargingVoltage: reading.chargingVoltage !== undefined && reading.chargingVoltage !== null ? String(reading.chargingVoltage) : null,
                dischargingVoltage: reading.dischargingVoltage !== undefined && reading.dischargingVoltage !== null ? String(reading.dischargingVoltage) : null,
                internalResistance: reading.internalResistance !== undefined && reading.internalResistance !== null ? String(reading.internalResistance) : null,
                remarks: reading.remarks || null,
              });
            }
          }
        }
      }

      // D. Insert Part Replacement Items if provided
      if (input.parts && input.parts.length > 0) {
        for (const part of input.parts) {
          await tx.insert(fieldServiceParts).values({
            fsrId: newFsr.id,
            productId: part.productId || null,
            partName: part.partName,
            partNumber: part.partNumber || null,
            quantity: String(part.quantity || '1.00'),
            replacementDetails: part.replacementDetails || null,
            oldPartStatus: part.oldPartStatus || null,
            remarks: part.remarks || null,
          });
        }
      }

      // E. Insert Activity Log
      await tx.insert(fieldServiceActivityLogs).values({
        fsrId: newFsr.id,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.CREATED,
        title: 'FSR Created',
        description: `Field Service Report ${fsrNumber} created for ${customer.name} (Call Type: ${input.callType})`,
      });

      return newFsr.id;
    });

    return await this.repo.findById(createdFsrId);
  }

  /**
   * Helper: Authoritative Row-Level Read Access Check
   */
  async assertFsrReadAccess(details: any, authUser: JwtPayload, actionDescription = 'view'): Promise<void> {
    if (authUser.role === APP_CONSTANTS.ROLES.ADMIN || authUser.role === APP_CONSTANTS.ROLES.MANAGER) {
      return;
    }

    if (details.fsr.serviceEngineerId === authUser.userId) {
      return;
    }

    // Check if user is a salesperson allowed to read completed/closed FSRs
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1);

    const designation = (currentUser?.designation || '').toLowerCase();
    const isExcluded =
      designation.includes('accountant') ||
      designation.includes('accounting') ||
      designation.includes('finance') ||
      designation.includes('hr') ||
      designation.includes('admin');

    const engineeringKeywords = ['engineer', 'tech', 'service', 'fse', 'electrician', 'technician'];
    const salesKeywords = ['sales', 'representative', 'executive', 'business dev', 'account manager', 'account exec', 'bd'];

    const isEngineer = engineeringKeywords.some((k) => designation.includes(k));
    const isSales = !isExcluded && !isEngineer && salesKeywords.some((k) => designation.includes(k));
    const isCompletedOrClosed =
      details.fsr.status === APP_CONSTANTS.FSR_STATUSES.COMPLETED ||
      details.fsr.status === APP_CONSTANTS.FSR_STATUSES.CLOSED;

    if (!isSales || !isCompletedOrClosed) {
      throw AppError.forbidden(`You are not authorized to ${actionDescription} this Field Service Report`);
    }
  }

  /**
   * 2. List FSRs with pagination, search, and filters
   */
  async listFsrs(options: FsrFilterOptions, authUser: JwtPayload) {
    const queryOptions: FsrFilterOptions = { ...options };

    // Support assignedEngineerId as alias to serviceEngineerId
    if (options.assignedEngineerId && !queryOptions.serviceEngineerId) {
      queryOptions.serviceEngineerId = options.assignedEngineerId;
    }

    // Normalize callType if long form was sent
    if (queryOptions.callType) {
      const ct = queryOptions.callType.toUpperCase();
      if (ct === 'BREAKDOWN') queryOptions.callType = APP_CONSTANTS.FSR_CALL_TYPES.BD;
      else if (ct === 'PREVENTIVE_MAINTENANCE') queryOptions.callType = APP_CONSTANTS.FSR_CALL_TYPES.PM;
      else if (['SITE_SURVEY', 'BATTERY_REPLACEMENT', 'OTHER'].includes(ct)) {
        queryOptions.callType = APP_CONSTANTS.FSR_CALL_TYPES.COURTESY;
      }
    }

    if (authUser.role === APP_CONSTANTS.ROLES.USER) {
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, authUser.userId))
        .limit(1);

      const designation = (currentUser?.designation || '').toLowerCase();
      const engineeringKeywords = ['engineer', 'tech', 'service', 'fse', 'electrician', 'technician'];
      const isEngineer = engineeringKeywords.some((k) => designation.includes(k));

      // Field Service Engineers are strictly scoped to their assigned visits
      if (isEngineer) {
        queryOptions.allowedServiceEngineerId = authUser.userId;
      }
    }

    return await this.repo.findAll(queryOptions);
  }

  /**
   * 3. Get single FSR full details
   */
  async getFsrById(id: string, authUser?: JwtPayload) {
    const details = await this.repo.findById(id);
    if (!details) {
      throw AppError.notFound(`Field Service Report with ID ${id} not found`);
    }
    if (authUser) {
      await this.assertFsrReadAccess(details, authUser, 'view');
    }
    return details;
  }

  /**
   * 4. Update FSR Master & Details
   */
  async updateFsr(id: string, input: UpdateFsrDto, authUser: JwtPayload) {
    const existing = await this.getFsrById(id);

    // Authorization: ADMIN/MANAGER or Assigned FSE
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You are not authorized to edit an FSR assigned to another engineer');
    }

    // Status check
    if (existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.CLOSED) {
      throw AppError.badRequest('Cannot modify a CLOSED Field Service Report');
    }
    if (existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.CANCELLED) {
      throw AppError.badRequest('Cannot modify a CANCELLED Field Service Report');
    }

    // Service Engineer reassignment check: Only Admin/Manager can change serviceEngineerId
    let targetEngineerId = existing.fsr.serviceEngineerId;
    if (input.serviceEngineerId && input.serviceEngineerId !== existing.fsr.serviceEngineerId) {
      if (authUser.role === APP_CONSTANTS.ROLES.USER) {
        throw AppError.forbidden('Only Administrators or Managers can reassign the Service Engineer');
      }
      const [engineer] = await db.select().from(users).where(eq(users.id, input.serviceEngineerId)).limit(1);
      if (!engineer || engineer.status !== 'ACTIVE') {
        throw AppError.badRequest('Target Service Engineer not found or inactive');
      }
      targetEngineerId = engineer.id;
    }

    await db.transaction(async (tx) => {
      // 1. Update Master
      await tx
        .update(fieldServiceReports)
        .set({
          destinationId: input.destinationId !== undefined ? input.destinationId : existing.fsr.destinationId,
          productId: input.productId !== undefined ? input.productId : existing.fsr.productId,
          serviceEngineerId: targetEngineerId,
          updatedById: authUser.userId,
          visitDate: input.visitDate ? new Date(input.visitDate) : existing.fsr.visitDate,
          problemReported: input.problemReported !== undefined ? input.problemReported : existing.fsr.problemReported,
          reasonForVisit: input.reasonForVisit !== undefined ? input.reasonForVisit : existing.fsr.reasonForVisit,
          callType: (() => {
            if (!input.callType) return existing.fsr.callType;
            const ct = input.callType.toUpperCase();
            if (ct === 'BREAKDOWN') return APP_CONSTANTS.FSR_CALL_TYPES.BD;
            if (ct === 'PREVENTIVE_MAINTENANCE') return APP_CONSTANTS.FSR_CALL_TYPES.PM;
            if (['SITE_SURVEY', 'BATTERY_REPLACEMENT', 'OTHER'].includes(ct)) {
              return APP_CONSTANTS.FSR_CALL_TYPES.COURTESY;
            }
            return input.callType as any;
          })(),
          status: input.status || existing.fsr.status,
          warrantyStatus: input.warrantyStatus || existing.fsr.warrantyStatus,
          billingStatus: input.billingStatus || existing.fsr.billingStatus,
          productModel: input.productModel !== undefined ? input.productModel : existing.fsr.productModel,
          productMake: input.productMake !== undefined ? input.productMake : existing.fsr.productMake,
          productSerialNumber: input.productSerialNumber !== undefined ? input.productSerialNumber : existing.fsr.productSerialNumber,
          equipmentStatus: input.equipmentStatus || existing.fsr.equipmentStatus,
          charges: input.charges !== undefined ? String(input.charges) : existing.fsr.charges,
          chargesRemarks: input.chargesRemarks !== undefined ? input.chargesRemarks : existing.fsr.chargesRemarks,
          standbyDetails: input.standbyDetails !== undefined ? input.standbyDetails : existing.fsr.standbyDetails,
          fseFeedback: input.fseFeedback !== undefined ? input.fseFeedback : existing.fsr.fseFeedback,
          customerFeedback: input.customerFeedback !== undefined ? input.customerFeedback : existing.fsr.customerFeedback,
          customerContactName: input.customerContactName !== undefined ? input.customerContactName : existing.fsr.customerContactName,
          customerSignature: input.customerSignature !== undefined ? input.customerSignature : existing.fsr.customerSignature,
          customerStamp: input.customerStamp !== undefined ? input.customerStamp : existing.fsr.customerStamp,
          customerSignedAt: input.customerSignedAt ? new Date(input.customerSignedAt) : existing.fsr.customerSignedAt,
          fseName: input.fseName !== undefined ? input.fseName : existing.fsr.fseName,
          fseNumber: input.fseNumber !== undefined ? input.fseNumber : existing.fsr.fseNumber,
          fseSignature: input.fseSignature !== undefined ? input.fseSignature : existing.fsr.fseSignature,
          fseSignatureDate: input.fseSignatureDate ? new Date(input.fseSignatureDate) : existing.fsr.fseSignatureDate,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceReports.id, id));

      // 2. Upsert Site Observation if provided
      if (input.siteObservation !== undefined) {
        await tx.delete(fieldServiceSiteObservations).where(eq(fieldServiceSiteObservations.fsrId, id));
        if (input.siteObservation) {
          await tx.insert(fieldServiceSiteObservations).values({
            fsrId: id,
            inputOnMains: input.siteObservation.inputOnMains || null,
            inputVoltageLN: input.siteObservation.inputVoltageLN ? String(input.siteObservation.inputVoltageLN) : null,
            inputVoltageLL: input.siteObservation.inputVoltageLL ? String(input.siteObservation.inputVoltageLL) : null,
            outputVoltageLN: input.siteObservation.outputVoltageLN ? String(input.siteObservation.outputVoltageLN) : null,
            outputVoltageLL: input.siteObservation.outputVoltageLL ? String(input.siteObservation.outputVoltageLL) : null,
            vac: input.siteObservation.vac ? String(input.siteObservation.vac) : null,
            frequency: input.siteObservation.frequency ? String(input.siteObservation.frequency) : null,
            dcVoltage: input.siteObservation.dcVoltage ? String(input.siteObservation.dcVoltage) : null,
            outputLoadPercent: input.siteObservation.outputLoadPercent ? String(input.siteObservation.outputLoadPercent) : null,
            inputFrequency: input.siteObservation.inputFrequency ? String(input.siteObservation.inputFrequency) : null,
            outputFrequency: input.siteObservation.outputFrequency ? String(input.siteObservation.outputFrequency) : null,
            environmentCondition: input.siteObservation.environmentCondition || null,
            environmentRemarks: input.siteObservation.environmentRemarks || null,
            upsLocation: input.siteObservation.upsLocation || null,
            otherLocationSpecification: input.siteObservation.otherLocationSpecification || null,
            observationsNotes: input.siteObservation.observationsNotes || null,
          });
        }
      }

      // 3. Log Activity
      await tx.insert(fieldServiceActivityLogs).values({
        fsrId: id,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'FSR Updated',
        description: `Field Service Report ${existing.fsr.fsrNumber} updated by user`,
      });
    });

    return await this.getFsrById(id);
  }

  /**
   * 5. Assign or Reassign Service Engineer (FSE)
   */
  async assignFse(id: string, input: AssignFseDto, authUser: JwtPayload) {
    if (authUser.role === APP_CONSTANTS.ROLES.USER) {
      throw AppError.forbidden('Only Administrators or Managers can assign/reassign the Service Engineer');
    }

    const existing = await this.getFsrById(id);

    const [newEngineer] = await db
      .select()
      .from(users)
      .where(eq(users.id, input.serviceEngineerId))
      .limit(1);

    if (!newEngineer) {
      throw AppError.notFound('Target Service Engineer user not found');
    }
    if (newEngineer.status !== 'ACTIVE') {
      throw AppError.badRequest('Target Service Engineer user is inactive');
    }

    const previousEngineer = existing.serviceEngineer;

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceReports)
        .set({
          serviceEngineerId: newEngineer.id,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceReports.id, id));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId: id,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.FSE_ASSIGNED,
        title: 'Service Engineer Assigned',
        description: `FSE reassigned from ${previousEngineer.fullName} to ${newEngineer.fullName}${
          input.remarks ? ` (Remarks: ${input.remarks})` : ''
        }`,
        metadata: JSON.stringify({
          previousEngineerId: previousEngineer.id,
          previousEngineerName: previousEngineer.fullName,
          newEngineerId: newEngineer.id,
          newEngineerName: newEngineer.fullName,
        }),
      });
    });

    return await this.getFsrById(id);
  }

  /**
   * 6. Start FSR / Transition from DRAFT to IN_PROGRESS
   */
  async startFsr(id: string, authUser: JwtPayload) {
    const existing = await this.getFsrById(id);

    // Authorization
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only start an FSR assigned to you');
    }

    if (existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.IN_PROGRESS) {
      return existing; // Idempotent
    }

    if (existing.fsr.status !== APP_CONSTANTS.FSR_STATUSES.DRAFT) {
      throw AppError.badRequest(`Cannot start FSR in current status: ${existing.fsr.status}`);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceReports)
        .set({
          status: APP_CONSTANTS.FSR_STATUSES.IN_PROGRESS,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceReports.id, id));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId: id,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.STARTED,
        title: 'FSR In Progress',
        description: `Site visit started by ${existing.serviceEngineer.fullName || 'Service Engineer'}`,
      });
    });

    return await this.getFsrById(id);
  }

  /**
   * 7. Upsert Site Observation Data
   */
  async updateSiteObservation(id: string, input: SiteObservationDto, authUser: JwtPayload) {
    const existing = await this.getFsrById(id);

    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only update site observations for your assigned FSR');
    }

    if (
      existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.CLOSED ||
      existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.CANCELLED
    ) {
      throw AppError.badRequest(`Cannot update observations on a ${existing.fsr.status} FSR`);
    }

    await db.transaction(async (tx) => {
      await tx.delete(fieldServiceSiteObservations).where(eq(fieldServiceSiteObservations.fsrId, id));

      await tx.insert(fieldServiceSiteObservations).values({
        fsrId: id,
        inputOnMains: input.inputOnMains || null,
        inputVoltageLN: input.inputVoltageLN ? String(input.inputVoltageLN) : null,
        inputVoltageLL: input.inputVoltageLL ? String(input.inputVoltageLL) : null,
        outputVoltageLN: input.outputVoltageLN ? String(input.outputVoltageLN) : null,
        outputVoltageLL: input.outputVoltageLL ? String(input.outputVoltageLL) : null,
        vac: input.vac ? String(input.vac) : null,
        frequency: input.frequency ? String(input.frequency) : null,
        dcVoltage: input.dcVoltage ? String(input.dcVoltage) : null,
        outputLoadPercent: input.outputLoadPercent ? String(input.outputLoadPercent) : null,
        inputFrequency: input.inputFrequency ? String(input.inputFrequency) : null,
        outputFrequency: input.outputFrequency ? String(input.outputFrequency) : null,
        environmentCondition: input.environmentCondition || null,
        environmentRemarks: input.environmentRemarks || null,
        upsLocation: input.upsLocation || null,
        otherLocationSpecification: input.otherLocationSpecification || null,
        observationsNotes: input.observationsNotes || null,
      });

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId: id,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Site Observations Recorded',
        description: 'Electrical and room environmental observations updated',
      });
    });

    const [updated] = await db
      .select()
      .from(fieldServiceSiteObservations)
      .where(eq(fieldServiceSiteObservations.fsrId, id))
      .limit(1);

    return updated;
  }

  /**
   * 8. Battery Bank Management
   */
  async addBatteryBank(fsrId: string, input: BatteryBankDto, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);

    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only add battery banks for your assigned FSR');
    }

    const createdBank = await db.transaction(async (tx) => {
      const [bank] = await tx
        .insert(fieldServiceBatteryBanks)
        .values({
          fsrId,
          bankNumber: input.bankNumber || 1,
          bankDescription: input.bankDescription || null,
          make: input.make || null,
          ah: input.ah || null,
          quantity: input.quantity || 20,
          frontIndication: input.frontIndication || null,
          voltage: input.voltage ? String(input.voltage) : null,
          chargingCurrent: input.chargingCurrent ? String(input.chargingCurrent) : null,
          dischargingCurrent: input.dischargingCurrent ? String(input.dischargingCurrent) : null,
          remarks: input.remarks || null,
        })
        .returning();

      if (input.readings && input.readings.length > 0) {
        for (const reading of input.readings) {
          await tx.insert(fieldServiceBatteryReadings).values({
            fsrId,
            batteryBankId: bank.id,
            batteryNumber: reading.batteryNumber,
            chargingVoltage: reading.chargingVoltage !== undefined && reading.chargingVoltage !== null ? String(reading.chargingVoltage) : null,
            dischargingVoltage: reading.dischargingVoltage !== undefined && reading.dischargingVoltage !== null ? String(reading.dischargingVoltage) : null,
            internalResistance: reading.internalResistance !== undefined && reading.internalResistance !== null ? String(reading.internalResistance) : null,
            remarks: reading.remarks || null,
          });
        }
      }

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Battery Bank Added',
        description: `Battery Bank #${bank.bankNumber} added (${bank.make || 'Standard'} ${bank.ah || ''})`,
      });

      return bank;
    });

    return await this.repo.findBatteryBankById(fsrId, createdBank.id);
  }

  async updateBatteryBank(fsrId: string, bankId: string, input: Partial<BatteryBankDto>, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only update battery banks for your assigned FSR');
    }

    const bank = await this.repo.findBatteryBankById(fsrId, bankId);
    if (!bank) {
      throw AppError.notFound('Battery Bank not found');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceBatteryBanks)
        .set({
          bankNumber: input.bankNumber !== undefined ? input.bankNumber : bank.bankNumber,
          bankDescription: input.bankDescription !== undefined ? input.bankDescription : bank.bankDescription,
          make: input.make !== undefined ? input.make : bank.make,
          ah: input.ah !== undefined ? input.ah : bank.ah,
          quantity: input.quantity !== undefined ? input.quantity : bank.quantity,
          frontIndication: input.frontIndication !== undefined ? input.frontIndication : bank.frontIndication,
          voltage: input.voltage !== undefined ? (input.voltage ? String(input.voltage) : null) : bank.voltage,
          chargingCurrent: input.chargingCurrent !== undefined ? (input.chargingCurrent ? String(input.chargingCurrent) : null) : bank.chargingCurrent,
          dischargingCurrent: input.dischargingCurrent !== undefined ? (input.dischargingCurrent ? String(input.dischargingCurrent) : null) : bank.dischargingCurrent,
          remarks: input.remarks !== undefined ? input.remarks : bank.remarks,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceBatteryBanks.id, bankId));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Battery Bank Updated',
        description: `Battery Bank #${bank.bankNumber} details updated`,
      });
    });

    return await this.repo.findBatteryBankById(fsrId, bankId);
  }

  async deleteBatteryBank(fsrId: string, bankId: string, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only delete battery banks for your assigned FSR');
    }

    const bank = await this.repo.findBatteryBankById(fsrId, bankId);
    if (!bank) {
      throw AppError.notFound('Battery Bank not found');
    }

    await db.transaction(async (tx) => {
      await tx.delete(fieldServiceBatteryBanks).where(eq(fieldServiceBatteryBanks.id, bankId));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Battery Bank Deleted',
        description: `Battery Bank #${bank.bankNumber} removed`,
      });
    });

    return { success: true, message: 'Battery bank deleted successfully' };
  }

  /**
   * 9. Battery Readings Management
   */
  async addBatteryReadings(
    fsrId: string,
    bankId: string,
    readingsInput: BatteryReadingDto | { readings: BatteryReadingDto[] },
    authUser: JwtPayload
  ) {
    const existing = await this.getFsrById(fsrId);
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only record battery readings for your assigned FSR');
    }

    const bank = await this.repo.findBatteryBankById(fsrId, bankId);
    if (!bank) {
      throw AppError.notFound('Battery Bank not found');
    }

    const readingsList: BatteryReadingDto[] =
      'readings' in readingsInput && Array.isArray(readingsInput.readings)
        ? readingsInput.readings
        : [readingsInput as BatteryReadingDto];

    // Check for duplicate battery numbers inside the bank
    for (const r of readingsList) {
      const existingReading = await this.repo.findBatteryReadingByNumber(bankId, r.batteryNumber);
      if (existingReading) {
        throw AppError.conflict(
          `Battery #${r.batteryNumber} reading already exists in Bank #${bank.bankNumber}. Update the existing reading instead.`
        );
      }
    }

    await db.transaction(async (tx) => {
      for (const r of readingsList) {
        await tx.insert(fieldServiceBatteryReadings).values({
          fsrId,
          batteryBankId: bankId,
          batteryNumber: r.batteryNumber,
          chargingVoltage: r.chargingVoltage !== undefined && r.chargingVoltage !== null ? String(r.chargingVoltage) : null,
          dischargingVoltage: r.dischargingVoltage !== undefined && r.dischargingVoltage !== null ? String(r.dischargingVoltage) : null,
          internalResistance: r.internalResistance !== undefined && r.internalResistance !== null ? String(r.internalResistance) : null,
          remarks: r.remarks || null,
        });
      }

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Battery Readings Recorded',
        description: `Recorded ${readingsList.length} battery reading(s) for Bank #${bank.bankNumber}`,
      });
    });

    return await this.repo.findBatteryBankById(fsrId, bankId);
  }

  async updateBatteryReading(
    fsrId: string,
    bankId: string,
    readingId: string,
    input: Partial<BatteryReadingDto>,
    authUser: JwtPayload
  ) {
    const existing = await this.getFsrById(fsrId);
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only update battery readings for your assigned FSR');
    }

    const reading = await this.repo.findBatteryReadingById(fsrId, bankId, readingId);
    if (!reading) {
      throw AppError.notFound('Battery Reading not found');
    }

    if (input.batteryNumber && input.batteryNumber !== reading.batteryNumber) {
      const duplicate = await this.repo.findBatteryReadingByNumber(bankId, input.batteryNumber);
      if (duplicate && duplicate.id !== readingId) {
        throw AppError.conflict(`Battery #${input.batteryNumber} already exists in this bank`);
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceBatteryReadings)
        .set({
          batteryNumber: input.batteryNumber !== undefined ? input.batteryNumber : reading.batteryNumber,
          chargingVoltage: input.chargingVoltage !== undefined ? (input.chargingVoltage ? String(input.chargingVoltage) : null) : reading.chargingVoltage,
          dischargingVoltage: input.dischargingVoltage !== undefined ? (input.dischargingVoltage ? String(input.dischargingVoltage) : null) : reading.dischargingVoltage,
          internalResistance: input.internalResistance !== undefined ? (input.internalResistance ? String(input.internalResistance) : null) : reading.internalResistance,
          remarks: input.remarks !== undefined ? input.remarks : reading.remarks,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceBatteryReadings.id, readingId));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Battery Reading Updated',
        description: `Updated reading for Battery #${input.batteryNumber || reading.batteryNumber}`,
      });
    });

    return await this.repo.findBatteryReadingById(fsrId, bankId, readingId);
  }

  async deleteBatteryReading(fsrId: string, bankId: string, readingId: string, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only delete battery readings for your assigned FSR');
    }

    const reading = await this.repo.findBatteryReadingById(fsrId, bankId, readingId);
    if (!reading) {
      throw AppError.notFound('Battery Reading not found');
    }

    await db.transaction(async (tx) => {
      await tx.delete(fieldServiceBatteryReadings).where(eq(fieldServiceBatteryReadings.id, readingId));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Battery Reading Deleted',
        description: `Removed reading for Battery #${reading.batteryNumber}`,
      });
    });

    return { success: true, message: 'Battery reading deleted successfully' };
  }

  /**
   * 10. Parts Replacement Management
   */
  async addPart(fsrId: string, input: PartReplacementDto, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only add replaced parts for your assigned FSR');
    }

    if (input.productId) {
      const [prod] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
      if (!prod) throw AppError.notFound('Linked product not found in catalog');
    }

    const createdPart = await db.transaction(async (tx) => {
      const [part] = await tx
        .insert(fieldServiceParts)
        .values({
          fsrId,
          productId: input.productId || null,
          partName: input.partName,
          partNumber: input.partNumber || null,
          quantity: String(input.quantity || '1.00'),
          replacementDetails: input.replacementDetails || null,
          oldPartStatus: input.oldPartStatus || null,
          remarks: input.remarks || null,
        })
        .returning();

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Replaced Part Added',
        description: `Added replacement part: ${part.partName} (Qty: ${part.quantity})`,
      });

      return part;
    });

    return await this.repo.findPartById(fsrId, createdPart.id);
  }

  async updatePart(fsrId: string, partId: string, input: Partial<PartReplacementDto>, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only update replaced parts for your assigned FSR');
    }

    const part = await this.repo.findPartById(fsrId, partId);
    if (!part) {
      throw AppError.notFound('Part replacement record not found');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceParts)
        .set({
          productId: input.productId !== undefined ? input.productId : part.productId,
          partName: input.partName || part.partName,
          partNumber: input.partNumber !== undefined ? input.partNumber : part.partNumber,
          quantity: input.quantity !== undefined ? String(input.quantity) : part.quantity,
          replacementDetails: input.replacementDetails !== undefined ? input.replacementDetails : part.replacementDetails,
          oldPartStatus: input.oldPartStatus !== undefined ? input.oldPartStatus : part.oldPartStatus,
          remarks: input.remarks !== undefined ? input.remarks : part.remarks,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceParts.id, partId));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Replaced Part Updated',
        description: `Updated replacement part: ${input.partName || part.partName}`,
      });
    });

    return await this.repo.findPartById(fsrId, partId);
  }

  async deletePart(fsrId: string, partId: string, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only delete replaced parts for your assigned FSR');
    }

    const part = await this.repo.findPartById(fsrId, partId);
    if (!part) {
      throw AppError.notFound('Part replacement record not found');
    }

    await db.transaction(async (tx) => {
      await tx.delete(fieldServiceParts).where(eq(fieldServiceParts.id, partId));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Replaced Part Removed',
        description: `Removed replacement part: ${part.partName}`,
      });
    });

    return { success: true, message: 'Replaced part deleted successfully' };
  }

  /**
   * 11. Customer Sign-Off
   */
  async customerSignOff(fsrId: string, input: CustomerSignOffDto, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only capture customer sign-off for your assigned FSR');
    }

    // Save signature file locally if provided as base64
    let signaturePath = input.customerSignature;
    if (signaturePath && signaturePath.startsWith('data:')) {
      signaturePath = await this.saveBase64File(signaturePath, 'signatures', `cust-sig-${fsrId}`);
    }

    let stampPath = input.customerStamp;
    if (stampPath && stampPath.startsWith('data:')) {
      stampPath = await this.saveBase64File(stampPath, 'signatures', `cust-stamp-${fsrId}`);
    }

    const signedAt = input.customerSignedAt ? new Date(input.customerSignedAt) : new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceReports)
        .set({
          customerContactName: input.customerContactName,
          customerSignature: signaturePath,
          customerStamp: stampPath || null,
          customerSignedAt: signedAt,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceReports.id, fsrId));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.CUSTOMER_SIGNED,
        title: 'Customer Sign-Off Captured',
        description: `Customer sign-off executed by ${input.customerContactName}`,
      });
    });

    return await this.getFsrById(fsrId);
  }

  /**
   * 12. FSE Sign-Off
   */
  async fseSignOff(fsrId: string, input: FseSignOffDto, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);

    // Only assigned engineer or ADMIN/MANAGER can execute FSE sign-off
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only sign an FSR assigned to you');
    }

    let signaturePath = input.fseSignature;
    if (signaturePath && signaturePath.startsWith('data:')) {
      signaturePath = await this.saveBase64File(signaturePath, 'signatures', `fse-sig-${fsrId}`);
    }

    const fseName = input.fseName || existing.serviceEngineer.fullName;
    const fseNumber = input.fseNumber || existing.serviceEngineer.phone || null;
    const signedDate = input.fseSignatureDate ? new Date(input.fseSignatureDate) : new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceReports)
        .set({
          fseName,
          fseNumber,
          fseSignature: signaturePath,
          fseSignatureDate: signedDate,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceReports.id, fsrId));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.FSE_SIGNED,
        title: 'Service Engineer Sign-Off Completed',
        description: `Report signed off by Service Engineer ${fseName}`,
      });
    });

    return await this.getFsrById(fsrId);
  }

  /**
   * 13. Complete FSR
   */
  async completeFsr(id: string, authUser: JwtPayload) {
    const existing = await this.getFsrById(id);

    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only complete your assigned FSR');
    }

    if (existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.COMPLETED) {
      return existing; // Idempotent
    }
    if (existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.CLOSED) {
      throw AppError.badRequest('FSR is already CLOSED');
    }
    if (existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.CANCELLED) {
      throw AppError.badRequest('Cannot complete a CANCELLED FSR');
    }

    // Minimum Required Information Validation
    if (!existing.fsr.customerName) {
      throw AppError.badRequest('FSR customer details are missing');
    }
    if (!existing.fsr.visitDate) {
      throw AppError.badRequest('FSR visit date is missing');
    }
    if (!existing.fsr.callType) {
      throw AppError.badRequest('FSR call type is missing');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceReports)
        .set({
          status: APP_CONSTANTS.FSR_STATUSES.COMPLETED,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceReports.id, id));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId: id,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.COMPLETED,
        title: 'FSR Completed',
        description: `Field service visit marked COMPLETED by ${existing.serviceEngineer.fullName || 'Engineer'}`,
      });
    });

    return await this.getFsrById(id);
  }

  /**
   * 14. Close FSR (Admin & Manager only)
   */
  async closeFsr(id: string, authUser: JwtPayload) {
    if (authUser.role === APP_CONSTANTS.ROLES.USER) {
      throw AppError.forbidden('Only Administrators or Managers can close an FSR');
    }

    const existing = await this.getFsrById(id);

    if (existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.CLOSED) {
      return existing;
    }
    if (existing.fsr.status !== APP_CONSTANTS.FSR_STATUSES.COMPLETED) {
      throw AppError.badRequest(
        `Only COMPLETED FSRs can be closed. Current status is ${existing.fsr.status}`
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceReports)
        .set({
          status: APP_CONSTANTS.FSR_STATUSES.CLOSED,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceReports.id, id));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId: id,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.CLOSED,
        title: 'FSR Formally Closed',
        description: `Report reviewed and closed by ${authUser.role}`,
      });
    });

    return await this.getFsrById(id);
  }

  /**
   * 15. Cancel FSR (Admin & Manager only)
   */
  async cancelFsr(id: string, reason: string, authUser: JwtPayload) {
    if (authUser.role === APP_CONSTANTS.ROLES.USER) {
      throw AppError.forbidden('Only Administrators or Managers can cancel an FSR');
    }

    const existing = await this.getFsrById(id);

    if (existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.CLOSED) {
      throw AppError.badRequest('Cannot cancel an already CLOSED FSR');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(fieldServiceReports)
        .set({
          status: APP_CONSTANTS.FSR_STATUSES.CANCELLED,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(fieldServiceReports.id, id));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId: id,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.CANCELLED,
        title: 'FSR Cancelled',
        description: `Field Service Report cancelled: ${reason}`,
      });
    });

    return await this.getFsrById(id);
  }

  /**
   * 16. Delete FSR (Admin only, or Manager for DRAFT)
   */
  async deleteFsr(id: string, authUser: JwtPayload) {
    const existing = await this.getFsrById(id);

    if (authUser.role === APP_CONSTANTS.ROLES.USER) {
      throw AppError.forbidden('You do not have permission to delete FSR records');
    }
    if (authUser.role === APP_CONSTANTS.ROLES.MANAGER && existing.fsr.status !== APP_CONSTANTS.FSR_STATUSES.DRAFT) {
      throw AppError.forbidden('Managers can only delete DRAFT FSRs. Admin privilege required.');
    }

    await db.delete(fieldServiceReports).where(eq(fieldServiceReports.id, id));
    return { success: true, message: `Field Service Report ${existing.fsr.fsrNumber} deleted successfully` };
  }

  /**
   * 17. Attachments Upload & Deletion
   */
  async uploadAttachment(fsrId: string, input: AttachmentUploadDto, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);

    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only upload attachments for your assigned FSR');
    }

    if (existing.fsr.status === APP_CONSTANTS.FSR_STATUSES.CLOSED) {
      throw AppError.badRequest('Cannot add attachments to a CLOSED FSR');
    }

    // Save File
    const filePath = await this.saveBase64File(
      input.fileData,
      'attachments',
      `fsr-${fsrId}-${input.category.toLowerCase()}`
    );
    const storedFileName = path.basename(filePath);

    const [attachment] = await db.transaction(async (tx) => {
      const [att] = await tx
        .insert(fieldServiceAttachments)
        .values({
          fsrId,
          category: input.category,
          fileName: input.fileName,
          storedFileName,
          filePath,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          storageProvider: 'LOCAL',
          uploadedById: authUser.userId,
        })
        .returning();

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Attachment Uploaded',
        description: `Uploaded ${input.category}: ${input.fileName}`,
      });

      return [att];
    });

    return attachment;
  }

  async deleteAttachment(fsrId: string, attachmentId: string, authUser: JwtPayload) {
    const existing = await this.getFsrById(fsrId);
    const attachment = await this.repo.findAttachmentById(fsrId, attachmentId);

    if (!attachment) {
      throw AppError.notFound('Attachment not found');
    }

    // Only Uploader, Assigned Engineer, Manager, or Admin can delete
    if (
      authUser.role === APP_CONSTANTS.ROLES.USER &&
      attachment.uploadedById !== authUser.userId &&
      existing.fsr.serviceEngineerId !== authUser.userId
    ) {
      throw AppError.forbidden('You do not have permission to delete this attachment');
    }

    await db.transaction(async (tx) => {
      await tx.delete(fieldServiceAttachments).where(eq(fieldServiceAttachments.id, attachmentId));

      await tx.insert(fieldServiceActivityLogs).values({
        fsrId,
        userId: authUser.userId,
        action: APP_CONSTANTS.FSR_ACTIVITY_ACTIONS.UPDATED,
        title: 'Attachment Deleted',
        description: `Removed attachment: ${attachment.fileName}`,
      });
    });

    // Clean up file if on disk
    try {
      const fullPath = path.join(UPLOADS_ROOT, 'attachments', attachment.storedFileName);
      await fs.unlink(fullPath);
    } catch {
      // Best effort cleanup
    }

    return { success: true, message: 'Attachment deleted successfully' };
  }

  /**
   * 18. Activity Log Stream
   */
  async getActivityLogs(fsrId: string, authUser?: JwtPayload) {
    await this.getFsrById(fsrId, authUser); // Verifies existence & authorization
    return await this.repo.findActivityLogs(fsrId);
  }

  /**
   * 19. Generate Official FSR PDF Buffer
   */
  async generatePdf(id: string, authUser: JwtPayload): Promise<{ buffer: Buffer; filename: string }> {
    const details = await this.getFsrById(id);
    await this.assertFsrReadAccess(details, authUser, 'download');

    const buffer = await FsrPdfService.generatePdf(details);
    const safeFsrNumber = details.fsr.fsrNumber.replace(/[\/\\:]/g, '-');
    const filename = `FSR_${safeFsrNumber}.pdf`;

    return { buffer, filename };
  }
}
