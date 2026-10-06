import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  quotations,
  quotationRevisions,
  quotationItems,
  quotationAmcScopeItems,
  quotationAmcExclusions,
  quotationAmcEscalations,
  quotationApprovals,
  quotationActivityLogs,
} from '../../../database/schema/quotations.js';
import { customerEquipment, quotationItemEquipment } from '../../../database/schema/customer-equipment.js';
import { leads, leadActivityLogs } from '../../../database/schema/leads.js';
import { customers, customerDestinations } from '../../../database/schema/customers.js';
import { products } from '../../../database/schema/products.js';
import { QuotationRepository, QuotationFilterOptions } from '../repositories/quotation.repository.js';
import { QuotationCalculationService, LineItemCalculationInput } from './quotation-calculation.service.js';
import { QuotationNumberService } from './quotation-number.service.js';
import { QuotationPdfService } from './quotation-pdf.service.js';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  CreateRevisionDto,
  SubmitQuotationDto,
  ApproveQuotationDto,
  RejectQuotationDto,
  CustomerAcceptQuotationDto,
  CustomerRejectQuotationDto,
  SendQuotationEmailDto,
} from '../validators/quotation.validator.js';
import { emailService } from '../../../common/services/email.service.js';
import { AppError } from '../../../common/errors/AppError.js';
import { JwtPayload } from '../../../common/auth/jwt.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { isSalesOfficeUser, isServiceOfficeUser } from '../../../common/middleware/auth.middleware.js';
import { calculatePreventiveVisits } from '../utils/amc-calculation.util.js';

export class QuotationService {
  constructor(
    private readonly quotationRepo: QuotationRepository = new QuotationRepository(),
    private readonly calcService: QuotationCalculationService = new QuotationCalculationService(),
    private readonly numberService: QuotationNumberService = new QuotationNumberService()
  ) {}

  /**
   * Validate that all selected customer equipment items belong to the quotation customer,
   * are ACTIVE, and are not duplicated across or within quotation items.
   */
  private async validateQuotationCustomerEquipment(
    customerId: string,
    items: { quantity: number; customerEquipmentIds?: string[]; customerEquipmentId?: string | null }[],
    txClient: any = db
  ): Promise<Map<string, string[]>> {
    const itemEquipmentMap = new Map<number, string[]>();
    const allEquipmentIds: string[] = [];

    items.forEach((item, idx) => {
      const ids: string[] = [];
      if (item.customerEquipmentIds && item.customerEquipmentIds.length > 0) {
        ids.push(...item.customerEquipmentIds);
      } else if (item.customerEquipmentId) {
        ids.push(item.customerEquipmentId);
      }

      if (ids.length > 0) {
        // Check for duplicates within this item
        const uniqueInLine = new Set(ids);
        if (uniqueInLine.size !== ids.length) {
          throw AppError.badRequest(`Duplicate customer equipment selected in quotation line #${idx + 1}`);
        }
        itemEquipmentMap.set(idx, ids);
        allEquipmentIds.push(...ids);
      }
    });

    if (allEquipmentIds.length === 0) {
      return new Map();
    }

    // Check cross-line duplicates
    const globalSet = new Set<string>();
    for (const eqId of allEquipmentIds) {
      if (globalSet.has(eqId)) {
        throw AppError.badRequest(`Customer equipment ID ${eqId} is selected multiple times across quotation lines`);
      }
      globalSet.add(eqId);
    }

    // Validate ownership and status in database
    const dbEquipment = await txClient
      .select()
      .from(customerEquipment)
      .where(inArray(customerEquipment.id, allEquipmentIds));

    const foundMap = new Map(dbEquipment.map((e: any) => [e.id, e]));

    for (const eqId of allEquipmentIds) {
      const eqRecord: any = foundMap.get(eqId);
      if (!eqRecord) {
        throw AppError.notFound(`Customer equipment with ID ${eqId} not found`);
      }
      if (eqRecord.customerId !== customerId) {
        throw AppError.badRequest(
          `Customer equipment ${eqRecord.assetNumber} does not belong to this customer`
        );
      }
      if (eqRecord.assetStatus !== 'ACTIVE') {
        throw AppError.badRequest(
          `Customer equipment ${eqRecord.assetNumber} is not ACTIVE (status: ${eqRecord.assetStatus})`
        );
      }
    }

    return itemEquipmentMap as any;
  }

  /**
   * Create a brand new quotation with Revision 1 and line items atomically
   */
  async createQuotation(input: CreateQuotationDto, authUser: JwtPayload) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    if (authUser.designation === 'Accountant Office') {
      throw AppError.forbidden('Accountant Office is not permitted to create quotations');
    }

    if (isSalesOfficeUser(authUser)) {
      const type = input.quotationType || APP_CONSTANTS.QUOTATION_TYPES.PRODUCT;
      if (
        type !== APP_CONSTANTS.QUOTATION_TYPES.PRODUCT &&
        type !== APP_CONSTANTS.QUOTATION_TYPES.TECHNICAL
      ) {
        throw AppError.forbidden(
          'Sales Office employees can only create Normal Product Supply and Technical Equipment quotations.'
        );
      }
    }

    if (isServiceOfficeUser(authUser)) {
      const type = input.quotationType;
      if (
        type !== APP_CONSTANTS.QUOTATION_TYPES.SERVICE &&
        type !== APP_CONSTANTS.QUOTATION_TYPES.AMC
      ) {
        throw AppError.forbidden(
          'Service Office employees can only create Service/Repair/Testing and AMC quotations.'
        );
      }
    }

    // 1. Authoritative customer validation & snapshot preparation
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (!customer) {
      throw AppError.notFound('Customer not found');
    }
    if (customer.status !== 'ACTIVE') {
      throw AppError.badRequest('Cannot create quotation for an inactive customer');
    }

    const isAdminOrManager =
      authUser.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser.role === APP_CONSTANTS.ROLES.MANAGER;

    if (!isAdminOrManager && isSalesOfficeUser(authUser)) {
      if (customer.createdById && customer.createdById !== authUser.userId) {
        throw AppError.forbidden('You can only create quotations for your own customers');
      }
    }

    // 2. Authoritative destination validation
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

    // 3. Line item & product validation
    const lineItemInputs: LineItemCalculationInput[] = [];
    for (const item of input.items) {
      if (item.productId) {
        const [prod] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (!prod) {
          throw AppError.notFound(`Product with ID ${item.productId} not found`);
        }
        if (prod.status === 'INACTIVE') {
          throw AppError.badRequest(`Product "${prod.name}" is currently inactive`);
        }

        lineItemInputs.push({
          productId: prod.id,
          productName: prod.name,
          productSku: prod.sku,
          description: item.description ?? prod.description,
          make: item.make ?? null,
          model: item.model ?? null,
          technicalSpecifications: item.technicalSpecifications ?? null,
          hsnSac: item.hsnSac ?? null,
          unit: item.unit ?? 'NOS',
          quantity: item.quantity,
          unitPrice: item.unitPrice !== undefined ? item.unitPrice : parseFloat(prod.price),
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          gstRate: item.gstRate,
          serviceDurationMonths: item.serviceDurationMonths,
          serviceVisitsIncluded: item.serviceVisitsIncluded,
          serviceScope: item.serviceScope,
          equipmentType: item.equipmentType || null,
          equipmentConfiguration: item.equipmentConfiguration || null,
          equipmentRating: item.equipmentRating || null,
          customerEquipmentIds: item.customerEquipmentIds,
          customerEquipmentId: item.customerEquipmentId,
          sortOrder: item.sortOrder,
          itemType: item.itemType || APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
        });
      } else {
        // Free-text/custom/service/AMC item
        lineItemInputs.push({
          productId: null,
          productName: item.productName,
          productSku: item.productSku ?? null,
          description: item.description ?? null,
          make: item.make ?? null,
          model: item.model ?? null,
          technicalSpecifications: item.technicalSpecifications ?? null,
          hsnSac: item.hsnSac ?? null,
          unit: item.unit ?? 'NOS',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          gstRate: item.gstRate,
          serviceDurationMonths: item.serviceDurationMonths,
          serviceVisitsIncluded: item.serviceVisitsIncluded,
          serviceScope: item.serviceScope,
          equipmentType: item.equipmentType || null,
          equipmentConfiguration: item.equipmentConfiguration || null,
          equipmentRating: item.equipmentRating || null,
          customerEquipmentIds: item.customerEquipmentIds,
          customerEquipmentId: item.customerEquipmentId,
          sortOrder: item.sortOrder,
          itemType: item.itemType || APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
        });
      }
    }

    // Validate customer equipment provenance, status, and isolation
    await this.validateQuotationCustomerEquipment(customer.id, input.items);

    // 4. Financial Calculations
    const quotationDate = input.quotationDate ? new Date(input.quotationDate) : new Date();
    const validityDays = input.validityDays || 30;
    const validUntil = new Date(quotationDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const taxState = destination?.state || customer.state || 'Gujarat';
    const calculation = this.calcService.calculateRevisionTotals(
      lineItemInputs,
      taxState,
      input.freightCharges || 0,
      input.otherCharges || 0,
      input.roundOff
    );

    // 5. Atomic Multi-Table Transaction
    const quotationId = await db.transaction(async (tx) => {
      // Generate unique concurrency-safe quotation number
      const quotationNumber = await this.numberService.generateQuotationNumber('QT', quotationDate, tx);

      // A. Insert Quotations Master
      const [newQuotation] = await tx
        .insert(quotations)
        .values({
          quotationNumber,
          quotationType: input.quotationType || APP_CONSTANTS.QUOTATION_TYPES.PRODUCT,
          status: APP_CONSTANTS.QUOTATION_STATUSES.DRAFT,
          customerId: customer.id,
          destinationId: destination?.id || null,
          salespersonId: authUser.userId,
          createdById: authUser.userId,
          currentRevisionNumber: 1,
        })
        .returning();

      // B. Insert Quotation Revision 1
      const [newRevision] = await tx
        .insert(quotationRevisions)
        .values({
          quotationId: newQuotation.id,
          revisionNumber: 1,
          isCurrent: true,
          status: APP_CONSTANTS.QUOTATION_STATUSES.DRAFT,
          quotationDate,
          validityDays,
          validUntil,
          currency: input.currency || 'INR',

          // Customer snapshot
          customerName: customer.name,
          companyName: customer.companyName,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          customerGstin: null,
          customerPan: null,

          // Billing snapshot
          billingAddress: customer.address,
          billingCity: customer.city,
          billingState: customer.state,
          billingPincode: customer.pincode,
          billingStateCode: null,

          // Shipping snapshot
          shippingName: destination?.name || customer.companyName || customer.name,
          shippingAddress: destination?.address || customer.address,
          shippingCity: destination?.city || customer.city,
          shippingState: destination?.state || customer.state,
          shippingPincode: destination?.pincode || customer.pincode,
          shippingStateCode: null,

          // Financial totals
          subtotal: calculation.subtotal,
          totalDiscount: calculation.totalDiscount,
          taxableAmount: calculation.taxableAmount,
          cgstAmount: calculation.cgstAmount,
          sgstAmount: calculation.sgstAmount,
          igstAmount: calculation.igstAmount,
          totalTax: calculation.totalTax,
          freightCharges: calculation.freightCharges,
          otherCharges: calculation.otherCharges,
          roundOff: calculation.roundOff,
          grandTotal: calculation.grandTotal,
          amountInWords: calculation.amountInWords,

          // Terms and content
          subject: input.subject || null,
          termsAndConditions: input.termsAndConditions || null,
          paymentTerms: input.paymentTerms || null,
          deliveryTerms: input.deliveryTerms || null,
          warrantyTerms: input.warrantyTerms || null,
          notes: input.notes || null,
          internalRemarks: input.internalRemarks || null,

          // AMC Contract Snapshot Metadata
          amcPlan: input.amcPlan || null,
          amcStartDate: input.amcStartDate ? new Date(input.amcStartDate) : null,
          amcEndDate: input.amcEndDate ? new Date(input.amcEndDate) : null,
          amcServiceFrequency: input.amcServiceFrequency || null,
          amcScheduledVisits:
            input.amcStartDate && input.amcEndDate && input.amcServiceFrequency
              ? calculatePreventiveVisits(input.amcStartDate, input.amcEndDate, input.amcServiceFrequency)
              : (input.amcScheduledVisits !== undefined ? input.amcScheduledVisits : null),
          amcBreakdownVisitType: input.amcBreakdownVisitType || null,
          endUser: input.endUser || null,
          customerCode: input.customerCode || null,
          branch: input.branch || null,
          zone: input.zone || null,
          specialClauses: input.specialClauses || null,
          amcPaymentTerms: input.amcPaymentTerms || null,

          revisionReason: 'Initial revision created',
          createdById: authUser.userId,
        })
        .returning();

      // C. Insert Line Items
      if (calculation.items.length > 0) {
        const insertedItems = await tx.insert(quotationItems).values(
          calculation.items.map((item) => {
            const { customerEquipmentIds, customerEquipmentId, ...dbItem } = item;
            return {
              ...dbItem,
              quotationRevisionId: newRevision.id,
              quotationId: newQuotation.id,
            };
          })
        ).returning();

        // C0. Link Customer Equipment in junction table quotation_item_equipment
        const equipmentJunctionRows: { quotationItemId: string; customerEquipmentId: string }[] = [];
        insertedItems.forEach((dbItem, idx) => {
          const calcItem = calculation.items[idx];
          const eqIds: string[] = [];
          if (calcItem.customerEquipmentIds && calcItem.customerEquipmentIds.length > 0) {
            eqIds.push(...calcItem.customerEquipmentIds);
          } else if (calcItem.customerEquipmentId) {
            eqIds.push(calcItem.customerEquipmentId);
          }
          for (const eqId of eqIds) {
            equipmentJunctionRows.push({
              quotationItemId: dbItem.id,
              customerEquipmentId: eqId,
            });
          }
        });

        if (equipmentJunctionRows.length > 0) {
          await tx.insert(quotationItemEquipment).values(equipmentJunctionRows);
        }
      }

      // C1. Insert AMC Scope Items
      if (input.amcScope && input.amcScope.length > 0) {
        await tx.insert(quotationAmcScopeItems).values(
          input.amcScope.map((s, idx) => ({
            quotationRevisionId: newRevision.id,
            description: s.description,
            sortOrder: s.sortOrder !== undefined ? s.sortOrder : idx,
          }))
        );
      }

      // C2. Insert AMC Exclusions
      if (input.amcExclusions && input.amcExclusions.length > 0) {
        await tx.insert(quotationAmcExclusions).values(
          input.amcExclusions.map((e, idx) => ({
            quotationRevisionId: newRevision.id,
            description: e.description,
            sortOrder: e.sortOrder !== undefined ? e.sortOrder : idx,
          }))
        );
      }

      // C3. Insert AMC Escalations
      if (input.amcEscalations && input.amcEscalations.length > 0) {
        await tx.insert(quotationAmcEscalations).values(
          input.amcEscalations.map((esc, idx) => ({
            quotationRevisionId: newRevision.id,
            level: esc.level,
            contactName: esc.contactName || null,
            phone: esc.phone || null,
            email: esc.email || null,
            sortOrder: esc.sortOrder !== undefined ? esc.sortOrder : idx,
          }))
        );
      }

      // D. Insert Activity Log
      await tx.insert(quotationActivityLogs).values({
        quotationId: newQuotation.id,
        quotationRevisionId: newRevision.id,
        userId: authUser.userId,
        action: 'CREATED',
        title: 'Quotation Created',
        description: `Quotation ${newQuotation.quotationNumber} (Revision 1) created as Draft.`,
        metadata: JSON.stringify({ grandTotal: calculation.grandTotal }),
      });

      return newQuotation.id;
    });

    return this.quotationRepo.findById(quotationId);
  }

  /**
   * Update a draft or pending quotation.
   * Business rule: Updating a Pending quotation automatically withdraws its approval submission.
   */
  async updateQuotation(id: string, input: UpdateQuotationDto, authUser: JwtPayload) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    if (authUser.designation === 'Accountant Office') {
      throw AppError.forbidden('Accountant Office is not permitted to update quotations');
    }

    const isAdminOrManager =
      authUser.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      !isAdminOrManager &&
      quotation.createdById !== authUser.userId &&
      quotation.salespersonId !== authUser.userId
    ) {
      throw AppError.forbidden('You are not authorized to update this quotation');
    }

    if (isSalesOfficeUser(authUser)) {
      const targetType = input.quotationType || quotation.quotationType;
      if (
        targetType !== APP_CONSTANTS.QUOTATION_TYPES.PRODUCT &&
        targetType !== APP_CONSTANTS.QUOTATION_TYPES.TECHNICAL
      ) {
        throw AppError.forbidden(
          'Sales Office employees can only manage Normal Product Supply and Technical Equipment quotations.'
        );
      }
    }

    if (isServiceOfficeUser(authUser)) {
      const targetType = input.quotationType || quotation.quotationType;
      if (
        targetType !== APP_CONSTANTS.QUOTATION_TYPES.SERVICE &&
        targetType !== APP_CONSTANTS.QUOTATION_TYPES.AMC
      ) {
        throw AppError.forbidden(
          'Service Office employees can only manage Service/Repair/Testing and AMC quotations.'
        );
      }
    }

    // Allow updating quotation details directly
    if (
      quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.DRAFT &&
      quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL &&
      quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.REJECTED &&
      quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.APPROVED
    ) {
      throw AppError.badRequest(
        `Quotations in "${quotation.status}" status cannot be edited directly.`
      );
    }

    const currentRevision = quotation.currentRevision;
    if (!currentRevision) {
      throw AppError.internal('Active quotation revision not found');
    }

    // Validate destination if updated
    let destination = quotation.destination;
    if (input.destinationId !== undefined) {
      if (input.destinationId === null) {
        destination = null;
      } else {
        const [dest] = await db
          .select()
          .from(customerDestinations)
          .where(eq(customerDestinations.id, input.destinationId))
          .limit(1);

        if (!dest) {
          throw AppError.notFound('Destination site not found');
        }
        if (dest.customerId !== quotation.customerId) {
          throw AppError.badRequest('Selected destination does not belong to this customer');
        }
        destination = dest;
      }
    }

    // Prepare line item inputs
    let lineItemInputs: LineItemCalculationInput[] = [];
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        if (item.productId) {
          const [prod] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          if (!prod) {
            throw AppError.notFound(`Product with ID ${item.productId} not found`);
          }

          lineItemInputs.push({
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku,
            description: item.description ?? prod.description,
            make: item.make ?? null,
            model: item.model ?? null,
            technicalSpecifications: item.technicalSpecifications ?? null,
            hsnSac: item.hsnSac ?? null,
            unit: item.unit ?? 'NOS',
            quantity: item.quantity,
            unitPrice: item.unitPrice !== undefined ? item.unitPrice : parseFloat(prod.price),
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            gstRate: item.gstRate,
            serviceDurationMonths: item.serviceDurationMonths,
            serviceVisitsIncluded: item.serviceVisitsIncluded,
            serviceScope: item.serviceScope,
            equipmentType: item.equipmentType || null,
            equipmentConfiguration: item.equipmentConfiguration || null,
            equipmentRating: item.equipmentRating || null,
            customerEquipmentIds: item.customerEquipmentIds,
            customerEquipmentId: item.customerEquipmentId,
            sortOrder: item.sortOrder,
            itemType: item.itemType || APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
          });
        } else {
          lineItemInputs.push({
            productId: null,
            productName: item.productName,
            productSku: item.productSku ?? null,
            description: item.description ?? null,
            make: item.make ?? null,
            model: item.model ?? null,
            technicalSpecifications: item.technicalSpecifications ?? null,
            hsnSac: item.hsnSac ?? null,
            unit: item.unit ?? 'NOS',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            gstRate: item.gstRate,
            serviceDurationMonths: item.serviceDurationMonths,
            serviceVisitsIncluded: item.serviceVisitsIncluded,
            serviceScope: item.serviceScope,
            equipmentType: item.equipmentType || null,
            equipmentConfiguration: item.equipmentConfiguration || null,
            equipmentRating: item.equipmentRating || null,
            customerEquipmentIds: item.customerEquipmentIds,
            customerEquipmentId: item.customerEquipmentId,
            sortOrder: item.sortOrder,
            itemType: item.itemType || APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
          });
        }
      }
      await this.validateQuotationCustomerEquipment(quotation.customerId, input.items);
    } else {
      // Retain existing items
      lineItemInputs = currentRevision.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        description: item.description,
        make: item.make,
        model: item.model,
        technicalSpecifications: item.technicalSpecifications,
        hsnSac: item.hsnSac,
        unit: item.unit,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        discountPercent: parseFloat(item.discountPercent),
        discountAmount: parseFloat(item.discountAmount),
        gstRate: parseFloat(item.gstRate),
        serviceDurationMonths: item.serviceDurationMonths,
        serviceVisitsIncluded: item.serviceVisitsIncluded,
        serviceScope: item.serviceScope,
        equipmentType: item.equipmentType,
        equipmentConfiguration: item.equipmentConfiguration,
        equipmentRating: item.equipmentRating,
        customerEquipmentIds: (item as any).customerEquipmentIds,
        customerEquipmentId: (item as any).customerEquipmentId,
        sortOrder: item.sortOrder,
        itemType: item.itemType,
      }));
    }

    const quotationDate = input.quotationDate
      ? new Date(input.quotationDate)
      : currentRevision.quotationDate;
    const validityDays = input.validityDays !== undefined ? input.validityDays : currentRevision.validityDays;
    const validUntil = new Date(quotationDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const taxState = destination?.state || quotation.customer?.state || 'Gujarat';
    const freightCharges =
      input.freightCharges !== undefined ? input.freightCharges : parseFloat(currentRevision.freightCharges);
    const otherCharges =
      input.otherCharges !== undefined ? input.otherCharges : parseFloat(currentRevision.otherCharges);
    const roundOff = input.roundOff !== undefined ? input.roundOff : parseFloat(currentRevision.roundOff);

    const calculation = this.calcService.calculateRevisionTotals(
      lineItemInputs,
      taxState,
      freightCharges,
      otherCharges,
      roundOff
    );

    const wasPending = quotation.status === APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL;

    await db.transaction(async (tx) => {
      // If quotation was pending approval, record withdrawal
      if (wasPending) {
        await tx.insert(quotationApprovals).values({
          quotationId: quotation.id,
          quotationRevisionId: currentRevision.id,
          requestedById: authUser.userId,
          action: APP_CONSTANTS.QUOTATION_APPROVAL_ACTIONS.WITHDRAWN,
          comments: 'Approval submission automatically withdrawn due to draft edits.',
        });

        await tx.insert(quotationActivityLogs).values({
          quotationId: quotation.id,
          quotationRevisionId: currentRevision.id,
          userId: authUser.userId,
          action: 'WITHDRAWN',
          title: 'Approval Submission Withdrawn',
          description: 'Submission was automatically withdrawn because the quotation was modified.',
        });
      }

      // Update Quotation Master
      await tx
        .update(quotations)
        .set({
          quotationType: input.quotationType || quotation.quotationType,
          destinationId: destination ? destination.id : null,
          status: APP_CONSTANTS.QUOTATION_STATUSES.DRAFT,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id));

      // AMC Contract Calculations
      const resolvedAmcStartDate =
        input.amcStartDate !== undefined
          ? input.amcStartDate
            ? new Date(input.amcStartDate)
            : null
          : currentRevision.amcStartDate;
      const resolvedAmcEndDate =
        input.amcEndDate !== undefined
          ? input.amcEndDate
            ? new Date(input.amcEndDate)
            : null
          : currentRevision.amcEndDate;
      const resolvedAmcServiceFrequency =
        input.amcServiceFrequency !== undefined
          ? input.amcServiceFrequency
          : currentRevision.amcServiceFrequency;
      const resolvedAmcScheduledVisits =
        resolvedAmcStartDate && resolvedAmcEndDate && resolvedAmcServiceFrequency
          ? calculatePreventiveVisits(resolvedAmcStartDate, resolvedAmcEndDate, resolvedAmcServiceFrequency)
          : input.amcScheduledVisits !== undefined
          ? input.amcScheduledVisits
          : currentRevision.amcScheduledVisits;

      // Update Revision
      await tx
        .update(quotationRevisions)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.DRAFT,
          quotationDate,
          validityDays,
          validUntil,
          currency: input.currency || currentRevision.currency,
          subtotal: calculation.subtotal,
          totalDiscount: calculation.totalDiscount,
          taxableAmount: calculation.taxableAmount,
          cgstAmount: calculation.cgstAmount,
          sgstAmount: calculation.sgstAmount,
          igstAmount: calculation.igstAmount,
          totalTax: calculation.totalTax,
          freightCharges: calculation.freightCharges,
          otherCharges: calculation.otherCharges,
          roundOff: calculation.roundOff,
          grandTotal: calculation.grandTotal,
          amountInWords: calculation.amountInWords,
          subject: input.subject !== undefined ? input.subject : currentRevision.subject,
          termsAndConditions:
            input.termsAndConditions !== undefined
              ? input.termsAndConditions
              : currentRevision.termsAndConditions,
          paymentTerms:
            input.paymentTerms !== undefined ? input.paymentTerms : currentRevision.paymentTerms,
          deliveryTerms:
            input.deliveryTerms !== undefined ? input.deliveryTerms : currentRevision.deliveryTerms,
          warrantyTerms:
            input.warrantyTerms !== undefined ? input.warrantyTerms : currentRevision.warrantyTerms,
          notes: input.notes !== undefined ? input.notes : currentRevision.notes,
          internalRemarks:
            input.internalRemarks !== undefined
              ? input.internalRemarks
              : currentRevision.internalRemarks,

          // AMC Contract Snapshot Metadata
          amcPlan: input.amcPlan !== undefined ? input.amcPlan : currentRevision.amcPlan,
          amcStartDate: resolvedAmcStartDate,
          amcEndDate: resolvedAmcEndDate,
          amcServiceFrequency: resolvedAmcServiceFrequency,
          amcScheduledVisits: resolvedAmcScheduledVisits,
          amcBreakdownVisitType: input.amcBreakdownVisitType !== undefined ? input.amcBreakdownVisitType : currentRevision.amcBreakdownVisitType,
          endUser: input.endUser !== undefined ? input.endUser : currentRevision.endUser,
          customerCode: input.customerCode !== undefined ? input.customerCode : currentRevision.customerCode,
          branch: input.branch !== undefined ? input.branch : currentRevision.branch,
          zone: input.zone !== undefined ? input.zone : currentRevision.zone,
          specialClauses: input.specialClauses !== undefined ? input.specialClauses : currentRevision.specialClauses,
          amcPaymentTerms: input.amcPaymentTerms !== undefined ? input.amcPaymentTerms : currentRevision.amcPaymentTerms,

          updatedAt: new Date(),
        })
        .where(eq(quotationRevisions.id, currentRevision.id));

      // If items updated: delete old and insert new
      if (input.items && input.items.length > 0) {
        await tx.delete(quotationItems).where(eq(quotationItems.quotationRevisionId, currentRevision.id));

        const insertedItems = await tx.insert(quotationItems).values(
          calculation.items.map((item) => {
            const { customerEquipmentIds, customerEquipmentId, ...dbItem } = item;
            return {
              ...dbItem,
              quotationRevisionId: currentRevision.id,
              quotationId: quotation.id,
            };
          })
        ).returning();

        // Populate quotation_item_equipment junction records
        const equipmentJunctionRows: { quotationItemId: string; customerEquipmentId: string }[] = [];
        insertedItems.forEach((dbItem, idx) => {
          const calcItem = calculation.items[idx];
          const eqIds: string[] = [];
          if (calcItem.customerEquipmentIds && calcItem.customerEquipmentIds.length > 0) {
            eqIds.push(...calcItem.customerEquipmentIds);
          } else if (calcItem.customerEquipmentId) {
            eqIds.push(calcItem.customerEquipmentId);
          }
          for (const eqId of eqIds) {
            equipmentJunctionRows.push({
              quotationItemId: dbItem.id,
              customerEquipmentId: eqId,
            });
          }
        });

        if (equipmentJunctionRows.length > 0) {
          await tx.insert(quotationItemEquipment).values(equipmentJunctionRows);
        }
      }

      // Update AMC Scope Items if provided
      if (input.amcScope !== undefined) {
        await tx.delete(quotationAmcScopeItems).where(eq(quotationAmcScopeItems.quotationRevisionId, currentRevision.id));
        if (input.amcScope && input.amcScope.length > 0) {
          await tx.insert(quotationAmcScopeItems).values(
            input.amcScope.map((s, idx) => ({
              quotationRevisionId: currentRevision.id,
              description: s.description,
              sortOrder: s.sortOrder !== undefined ? s.sortOrder : idx,
            }))
          );
        }
      }

      // Update AMC Exclusions if provided
      if (input.amcExclusions !== undefined) {
        await tx.delete(quotationAmcExclusions).where(eq(quotationAmcExclusions.quotationRevisionId, currentRevision.id));
        if (input.amcExclusions && input.amcExclusions.length > 0) {
          await tx.insert(quotationAmcExclusions).values(
            input.amcExclusions.map((e, idx) => ({
              quotationRevisionId: currentRevision.id,
              description: e.description,
              sortOrder: e.sortOrder !== undefined ? e.sortOrder : idx,
            }))
          );
        }
      }

      // Update AMC Escalations if provided
      if (input.amcEscalations !== undefined) {
        await tx.delete(quotationAmcEscalations).where(eq(quotationAmcEscalations.quotationRevisionId, currentRevision.id));
        if (input.amcEscalations && input.amcEscalations.length > 0) {
          await tx.insert(quotationAmcEscalations).values(
            input.amcEscalations.map((esc, idx) => ({
              quotationRevisionId: currentRevision.id,
              level: esc.level,
              contactName: esc.contactName || null,
              phone: esc.phone || null,
              email: esc.email || null,
              sortOrder: esc.sortOrder !== undefined ? esc.sortOrder : idx,
            }))
          );
        }
      }

      // Log update activity
      await tx.insert(quotationActivityLogs).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        userId: authUser.userId,
        action: 'UPDATED',
        title: 'Quotation Updated',
        description: wasPending
          ? 'Quotation modified and reverted to Draft (submission withdrawn).'
          : 'Draft quotation details and financials updated.',
      });
    });

    return this.quotationRepo.findById(id);
  }

  /**
   * Create a formal revision (Rev N+1) preserving all historical revisions intact
   */
  async createFormalRevision(id: string, input: CreateRevisionDto, authUser: JwtPayload) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    if (authUser.designation === 'Accountant Office') {
      throw AppError.forbidden('Accountant Office is not permitted to create quotation revisions');
    }

    const isAdminOrManager =
      authUser.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      !isAdminOrManager &&
      quotation.createdById !== authUser.userId &&
      quotation.salespersonId !== authUser.userId
    ) {
      throw AppError.forbidden('You are not authorized to create revisions for this quotation');
    }

    const currentRevision = quotation.currentRevision;
    if (!currentRevision) {
      throw AppError.internal('Active quotation revision not found');
    }

    const nextRevisionNumber = quotation.currentRevisionNumber + 1;

    // Prepare line items (either modified items or copy from current revision)
    let lineItemInputs: LineItemCalculationInput[] = [];
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        if (item.productId) {
          const [prod] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          if (!prod) {
            throw AppError.notFound(`Product with ID ${item.productId} not found`);
          }

          lineItemInputs.push({
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku,
            description: item.description ?? prod.description,
            make: item.make ?? null,
            model: item.model ?? null,
            technicalSpecifications: item.technicalSpecifications ?? null,
            hsnSac: item.hsnSac ?? null,
            unit: item.unit ?? 'NOS',
            quantity: item.quantity,
            unitPrice: item.unitPrice !== undefined ? item.unitPrice : parseFloat(prod.price),
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            gstRate: item.gstRate,
            serviceDurationMonths: item.serviceDurationMonths,
            serviceVisitsIncluded: item.serviceVisitsIncluded,
            serviceScope: item.serviceScope,
            equipmentType: item.equipmentType || null,
            equipmentConfiguration: item.equipmentConfiguration || null,
            equipmentRating: item.equipmentRating || null,
            customerEquipmentIds: item.customerEquipmentIds,
            customerEquipmentId: item.customerEquipmentId,
            sortOrder: item.sortOrder,
            itemType: item.itemType || APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
          });
        } else {
          lineItemInputs.push({
            productId: null,
            productName: item.productName,
            productSku: item.productSku ?? null,
            description: item.description ?? null,
            make: item.make ?? null,
            model: item.model ?? null,
            technicalSpecifications: item.technicalSpecifications ?? null,
            hsnSac: item.hsnSac ?? null,
            unit: item.unit ?? 'NOS',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            gstRate: item.gstRate,
            serviceDurationMonths: item.serviceDurationMonths,
            serviceVisitsIncluded: item.serviceVisitsIncluded,
            serviceScope: item.serviceScope,
            equipmentType: item.equipmentType || null,
            equipmentConfiguration: item.equipmentConfiguration || null,
            equipmentRating: item.equipmentRating || null,
            customerEquipmentIds: item.customerEquipmentIds,
            customerEquipmentId: item.customerEquipmentId,
            sortOrder: item.sortOrder,
            itemType: item.itemType || APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
          });
        }
      }
      await this.validateQuotationCustomerEquipment(quotation.customerId, input.items);
    } else {
      lineItemInputs = currentRevision.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        description: item.description,
        make: item.make,
        model: item.model,
        technicalSpecifications: item.technicalSpecifications,
        hsnSac: item.hsnSac,
        unit: item.unit,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        discountPercent: parseFloat(item.discountPercent),
        discountAmount: parseFloat(item.discountAmount),
        gstRate: parseFloat(item.gstRate),
        serviceDurationMonths: item.serviceDurationMonths,
        serviceVisitsIncluded: item.serviceVisitsIncluded,
        serviceScope: item.serviceScope,
        equipmentType: item.equipmentType,
        equipmentConfiguration: item.equipmentConfiguration,
        equipmentRating: item.equipmentRating,
        customerEquipmentIds: item.customerEquipmentIds,
        customerEquipmentId: (item as any).customerEquipmentId,
        sortOrder: item.sortOrder,
        itemType: item.itemType,
      }));
    }

    const quotationDate = input.quotationDate ? new Date(input.quotationDate) : new Date();
    const validityDays = input.validityDays || currentRevision.validityDays || 30;
    const validUntil = new Date(quotationDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const taxState = quotation.destination?.state || quotation.customer?.state || 'Gujarat';
    const freightCharges =
      input.freightCharges !== undefined ? input.freightCharges : parseFloat(currentRevision.freightCharges);
    const otherCharges =
      input.otherCharges !== undefined ? input.otherCharges : parseFloat(currentRevision.otherCharges);
    const roundOff = input.roundOff !== undefined ? input.roundOff : parseFloat(currentRevision.roundOff);

    const calculation = this.calcService.calculateRevisionTotals(
      lineItemInputs,
      taxState,
      freightCharges,
      otherCharges,
      roundOff
    );

    await db.transaction(async (tx) => {
      // 1. Mark existing revisions as not current
      await tx
        .update(quotationRevisions)
        .set({ isCurrent: false })
        .where(eq(quotationRevisions.quotationId, quotation.id));

      // AMC Contract Calculations
      const resolvedAmcStartDate =
        input.amcStartDate !== undefined
          ? input.amcStartDate
            ? new Date(input.amcStartDate)
            : null
          : currentRevision.amcStartDate;
      const resolvedAmcEndDate =
        input.amcEndDate !== undefined
          ? input.amcEndDate
            ? new Date(input.amcEndDate)
            : null
          : currentRevision.amcEndDate;
      const resolvedAmcServiceFrequency =
        input.amcServiceFrequency !== undefined
          ? input.amcServiceFrequency
          : currentRevision.amcServiceFrequency;
      const resolvedAmcScheduledVisits =
        resolvedAmcStartDate && resolvedAmcEndDate && resolvedAmcServiceFrequency
          ? calculatePreventiveVisits(resolvedAmcStartDate, resolvedAmcEndDate, resolvedAmcServiceFrequency)
          : input.amcScheduledVisits !== undefined
          ? input.amcScheduledVisits
          : currentRevision.amcScheduledVisits;

      // 2. Insert new revision
      const [newRev] = await tx
        .insert(quotationRevisions)
        .values({
          quotationId: quotation.id,
          revisionNumber: nextRevisionNumber,
          isCurrent: true,
          status: APP_CONSTANTS.QUOTATION_STATUSES.DRAFT,
          quotationDate,
          validityDays,
          validUntil,
          currency: currentRevision.currency,

          // Customer and address snapshots preserved
          customerName: currentRevision.customerName,
          companyName: currentRevision.companyName,
          customerEmail: currentRevision.customerEmail,
          customerPhone: currentRevision.customerPhone,
          customerGstin: currentRevision.customerGstin,
          customerPan: currentRevision.customerPan,
          billingAddress: currentRevision.billingAddress,
          billingCity: currentRevision.billingCity,
          billingState: currentRevision.billingState,
          billingPincode: currentRevision.billingPincode,
          billingStateCode: currentRevision.billingStateCode,
          shippingName: currentRevision.shippingName,
          shippingAddress: currentRevision.shippingAddress,
          shippingCity: currentRevision.shippingCity,
          shippingState: currentRevision.shippingState,
          shippingPincode: currentRevision.shippingPincode,
          shippingStateCode: currentRevision.shippingStateCode,

          // Financial totals
          subtotal: calculation.subtotal,
          totalDiscount: calculation.totalDiscount,
          taxableAmount: calculation.taxableAmount,
          cgstAmount: calculation.cgstAmount,
          sgstAmount: calculation.sgstAmount,
          igstAmount: calculation.igstAmount,
          totalTax: calculation.totalTax,
          freightCharges: calculation.freightCharges,
          otherCharges: calculation.otherCharges,
          roundOff: calculation.roundOff,
          grandTotal: calculation.grandTotal,
          amountInWords: calculation.amountInWords,

          // Terms
          subject: input.subject !== undefined ? input.subject : currentRevision.subject,
          termsAndConditions:
            input.termsAndConditions !== undefined
              ? input.termsAndConditions
              : currentRevision.termsAndConditions,
          paymentTerms:
            input.paymentTerms !== undefined ? input.paymentTerms : currentRevision.paymentTerms,
          deliveryTerms:
            input.deliveryTerms !== undefined ? input.deliveryTerms : currentRevision.deliveryTerms,
          warrantyTerms:
            input.warrantyTerms !== undefined ? input.warrantyTerms : currentRevision.warrantyTerms,
          notes: input.notes !== undefined ? input.notes : currentRevision.notes,
          internalRemarks:
            input.internalRemarks !== undefined
              ? input.internalRemarks
              : currentRevision.internalRemarks,

          // AMC Contract Snapshot Metadata (copied from input or prior revision)
          amcPlan: input.amcPlan !== undefined ? input.amcPlan : currentRevision.amcPlan,
          amcStartDate: resolvedAmcStartDate,
          amcEndDate: resolvedAmcEndDate,
          amcServiceFrequency: resolvedAmcServiceFrequency,
          amcScheduledVisits: resolvedAmcScheduledVisits,
          amcBreakdownVisitType: input.amcBreakdownVisitType !== undefined ? input.amcBreakdownVisitType : currentRevision.amcBreakdownVisitType,
          endUser: input.endUser !== undefined ? input.endUser : currentRevision.endUser,
          customerCode: input.customerCode !== undefined ? input.customerCode : currentRevision.customerCode,
          branch: input.branch !== undefined ? input.branch : currentRevision.branch,
          zone: input.zone !== undefined ? input.zone : currentRevision.zone,
          specialClauses: input.specialClauses !== undefined ? input.specialClauses : currentRevision.specialClauses,
          amcPaymentTerms: input.amcPaymentTerms !== undefined ? input.amcPaymentTerms : currentRevision.amcPaymentTerms,

          revisionReason: input.revisionReason,
          createdById: authUser.userId,
        })
        .returning();

      // 3. Insert items for new revision
      if (calculation.items.length > 0) {
        const insertedItems = await tx.insert(quotationItems).values(
          calculation.items.map((item) => {
            const { customerEquipmentIds, customerEquipmentId, ...dbItem } = item;
            return {
              ...dbItem,
              quotationRevisionId: newRev.id,
              quotationId: quotation.id,
            };
          })
        ).returning();

        // Populate quotation_item_equipment junction records
        const equipmentJunctionRows: { quotationItemId: string; customerEquipmentId: string }[] = [];
        insertedItems.forEach((dbItem, idx) => {
          const calcItem = calculation.items[idx];
          const eqIds: string[] = [];
          if (calcItem.customerEquipmentIds && calcItem.customerEquipmentIds.length > 0) {
            eqIds.push(...calcItem.customerEquipmentIds);
          } else if (calcItem.customerEquipmentId) {
            eqIds.push(calcItem.customerEquipmentId);
          }
          for (const eqId of eqIds) {
            equipmentJunctionRows.push({
              quotationItemId: dbItem.id,
              customerEquipmentId: eqId,
            });
          }
        });

        if (equipmentJunctionRows.length > 0) {
          await tx.insert(quotationItemEquipment).values(equipmentJunctionRows);
        }
      }

      // 3a. AMC Scope Items: Copy from input if provided, else copy from prior revision
      if (input.amcScope !== undefined && input.amcScope !== null) {
        if (input.amcScope.length > 0) {
          await tx.insert(quotationAmcScopeItems).values(
            input.amcScope.map((s, idx) => ({
              quotationRevisionId: newRev.id,
              description: s.description,
              sortOrder: s.sortOrder !== undefined ? s.sortOrder : idx,
            }))
          );
        }
      } else if (currentRevision.amcScope && currentRevision.amcScope.length > 0) {
        await tx.insert(quotationAmcScopeItems).values(
          currentRevision.amcScope.map((s) => ({
            quotationRevisionId: newRev.id,
            description: s.description,
            sortOrder: s.sortOrder,
          }))
        );
      }

      // 3b. AMC Exclusions: Copy from input if provided, else copy from prior revision
      if (input.amcExclusions !== undefined && input.amcExclusions !== null) {
        if (input.amcExclusions.length > 0) {
          await tx.insert(quotationAmcExclusions).values(
            input.amcExclusions.map((e, idx) => ({
              quotationRevisionId: newRev.id,
              description: e.description,
              sortOrder: e.sortOrder !== undefined ? e.sortOrder : idx,
            }))
          );
        }
      } else if (currentRevision.amcExclusions && currentRevision.amcExclusions.length > 0) {
        await tx.insert(quotationAmcExclusions).values(
          currentRevision.amcExclusions.map((e) => ({
            quotationRevisionId: newRev.id,
            description: e.description,
            sortOrder: e.sortOrder,
          }))
        );
      }

      // 3c. AMC Escalations: Copy from input if provided, else copy from prior revision
      if (input.amcEscalations !== undefined && input.amcEscalations !== null) {
        if (input.amcEscalations.length > 0) {
          await tx.insert(quotationAmcEscalations).values(
            input.amcEscalations.map((esc, idx) => ({
              quotationRevisionId: newRev.id,
              level: esc.level,
              contactName: esc.contactName || null,
              phone: esc.phone || null,
              email: esc.email || null,
              sortOrder: esc.sortOrder !== undefined ? esc.sortOrder : idx,
            }))
          );
        }
      } else if (currentRevision.amcEscalations && currentRevision.amcEscalations.length > 0) {
        await tx.insert(quotationAmcEscalations).values(
          currentRevision.amcEscalations.map((esc) => ({
            quotationRevisionId: newRev.id,
            level: esc.level,
            contactName: esc.contactName,
            phone: esc.phone,
            email: esc.email,
            sortOrder: esc.sortOrder,
          }))
        );
      }

      // 4. Update Quotation Master
      await tx
        .update(quotations)
        .set({
          currentRevisionNumber: nextRevisionNumber,
          status: APP_CONSTANTS.QUOTATION_STATUSES.DRAFT,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, quotation.id));

      // 5. Log revision creation
      await tx.insert(quotationActivityLogs).values({
        quotationId: quotation.id,
        quotationRevisionId: newRev.id,
        userId: authUser.userId,
        action: 'REVISED',
        title: `Revision ${nextRevisionNumber} Created`,
        description: `Created new formal Revision ${nextRevisionNumber}. Reason: ${input.revisionReason}`,
        metadata: JSON.stringify({ revisionNumber: nextRevisionNumber, grandTotal: calculation.grandTotal }),
      });
    });

    return this.quotationRepo.findById(id);
  }

  /**
   * Submit draft quotation for management approval
   */
  async submitForApproval(id: string, input: SubmitQuotationDto = {}, authUser: JwtPayload) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    if (authUser.designation === 'Accountant Office') {
      throw AppError.forbidden('Accountant Office is not permitted to submit quotations for approval');
    }

    const isAdminOrManager =
      authUser.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      !isAdminOrManager &&
      quotation.createdById !== authUser.userId &&
      quotation.salespersonId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only submit your own quotations for approval');
    }

    if (
      quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.DRAFT &&
      quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.REJECTED
    ) {
      throw AppError.badRequest(
        `Cannot submit quotation in status "${quotation.status}". Only DRAFT or REJECTED quotations can be submitted for approval.`
      );
    }

    const currentRevision = quotation.currentRevision;
    if (!currentRevision || !currentRevision.items || currentRevision.items.length === 0) {
      throw AppError.badRequest('Cannot submit a quotation without line items.');
    }

    const grandTotal = parseFloat(currentRevision.grandTotal);
    if (isNaN(grandTotal) || grandTotal <= 0) {
      throw AppError.badRequest('Quotation grand total must be greater than zero to submit for approval.');
    }

    await db.transaction(async (tx) => {
      // 1. Update Master status
      await tx
        .update(quotations)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id));

      // 2. Update active Revision status
      await tx
        .update(quotationRevisions)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL,
          updatedAt: new Date(),
        })
        .where(eq(quotationRevisions.id, currentRevision.id));

      // 3. Record approval request
      await tx.insert(quotationApprovals).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        requestedById: authUser.userId,
        action: APP_CONSTANTS.QUOTATION_APPROVAL_ACTIONS.SUBMITTED,
        comments: input?.comments || 'Submitted for management review',
      });

      // 4. Record activity log
      await tx.insert(quotationActivityLogs).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        userId: authUser.userId,
        action: 'SUBMITTED',
        title: 'Submitted for Approval',
        description: input?.comments || `Revision ${currentRevision.revisionNumber} submitted for management approval.`,
      });
    });

    return this.quotationRepo.findById(id);
  }

  /**
   * Approve a pending quotation (Admin or Manager required, self-approval allowed)
   */
  async approveQuotation(id: string, input: ApproveQuotationDto = {}, authUser: JwtPayload) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    if (
      authUser.role !== APP_CONSTANTS.ROLES.ADMIN &&
      authUser.role !== APP_CONSTANTS.ROLES.MANAGER
    ) {
      throw AppError.forbidden('Only Administrators and Managers are authorized to approve quotations.');
    }

    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    if (quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL) {
      throw AppError.badRequest(
        `Cannot approve quotation in "${quotation.status}" status. Quotation must be in PENDING_APPROVAL status.`
      );
    }

    const currentRevision = quotation.currentRevision;
    if (!currentRevision) {
      throw AppError.internal('Active quotation revision not found');
    }

    await db.transaction(async (tx) => {
      // 1. Update Master status
      await tx
        .update(quotations)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.APPROVED,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id));

      // 2. Update active Revision status
      await tx
        .update(quotationRevisions)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.APPROVED,
          updatedAt: new Date(),
        })
        .where(eq(quotationRevisions.id, currentRevision.id));

      // 3. Record approval record
      await tx.insert(quotationApprovals).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        requestedById: quotation.salespersonId,
        reviewedById: authUser.userId,
        action: APP_CONSTANTS.QUOTATION_APPROVAL_ACTIONS.APPROVED,
        comments: input?.comments || 'Quotation approved by management.',
      });

      // 4. Record activity log
      await tx.insert(quotationActivityLogs).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        userId: authUser.userId,
        action: 'APPROVED',
        title: 'Quotation Approved',
        description: input?.comments || `Revision ${currentRevision.revisionNumber} approved by ${authUser.email}.`,
      });
    });

    return this.quotationRepo.findById(id);
  }

  /**
   * Reject a pending quotation (Admin or Manager required)
   */
  async rejectQuotation(id: string, input: RejectQuotationDto, authUser: JwtPayload) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    if (
      authUser.role !== APP_CONSTANTS.ROLES.ADMIN &&
      authUser.role !== APP_CONSTANTS.ROLES.MANAGER
    ) {
      throw AppError.forbidden('Only Administrators and Managers are authorized to reject quotations.');
    }

    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    if (quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL) {
      throw AppError.badRequest(
        `Cannot reject quotation in "${quotation.status}" status. Quotation must be in PENDING_APPROVAL status.`
      );
    }

    const currentRevision = quotation.currentRevision;
    if (!currentRevision) {
      throw AppError.internal('Active quotation revision not found');
    }

    await db.transaction(async (tx) => {
      // 1. Update Master status
      await tx
        .update(quotations)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.REJECTED,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id));

      // 2. Update active Revision status
      await tx
        .update(quotationRevisions)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.REJECTED,
          updatedAt: new Date(),
        })
        .where(eq(quotationRevisions.id, currentRevision.id));

      // 3. Record rejection record
      await tx.insert(quotationApprovals).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        requestedById: quotation.salespersonId,
        reviewedById: authUser.userId,
        action: APP_CONSTANTS.QUOTATION_APPROVAL_ACTIONS.REJECTED,
        comments: input.rejectionReason,
      });

      // 4. Record activity log
      await tx.insert(quotationActivityLogs).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        userId: authUser.userId,
        action: 'REJECTED',
        title: 'Quotation Rejected',
        description: `Rejected by management. Reason: ${input.rejectionReason}`,
      });
    });

    return this.quotationRepo.findById(id);
  }

  /**
   * Withdraw a pending approval submission back to Draft
   */
  async withdrawSubmission(id: string, input: { reason?: string } = {}, authUser: JwtPayload) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    if (authUser.designation === 'Accountant Office') {
      throw AppError.forbidden('Accountant Office is not permitted to withdraw quotations');
    }

    const isAdminOrManager =
      authUser.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      !isAdminOrManager &&
      quotation.createdById !== authUser.userId &&
      quotation.salespersonId !== authUser.userId
    ) {
      throw AppError.forbidden('You can only withdraw your own quotations');
    }

    if (quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL) {
      throw AppError.badRequest(
        `Cannot withdraw quotation in "${quotation.status}" status. Only PENDING_APPROVAL quotations can be withdrawn.`
      );
    }

    const currentRevision = quotation.currentRevision;
    if (!currentRevision) {
      throw AppError.internal('Active quotation revision not found');
    }

    await db.transaction(async (tx) => {
      // 1. Revert Master status to DRAFT
      await tx
        .update(quotations)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.DRAFT,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id));

      // 2. Revert active Revision status to DRAFT
      await tx
        .update(quotationRevisions)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.DRAFT,
          updatedAt: new Date(),
        })
        .where(eq(quotationRevisions.id, currentRevision.id));

      // 3. Record withdrawal approval record
      await tx.insert(quotationApprovals).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        requestedById: authUser.userId,
        action: APP_CONSTANTS.QUOTATION_APPROVAL_ACTIONS.WITHDRAWN,
        comments: input.reason || 'Submission withdrawn by user.',
      });

      // 4. Record activity log
      await tx.insert(quotationActivityLogs).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        userId: authUser.userId,
        action: 'WITHDRAWN',
        title: 'Approval Submission Withdrawn',
        description: input.reason || 'Approval submission withdrawn and reverted to Draft.',
      });
    });

    return this.quotationRepo.findById(id);
  }

  /**
   * Get single quotation with full details
   */
  async getQuotationById(id: string, authUser?: JwtPayload) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    const isAdminOrManager =
      authUser?.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser?.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      authUser &&
      !isAdminOrManager &&
      authUser.designation !== 'Accountant Office'
    ) {
      if (
        quotation.createdById !== authUser.userId &&
        quotation.salespersonId !== authUser.userId
      ) {
        throw AppError.notFound('Quotation not found');
      }

      if (
        isSalesOfficeUser(authUser) &&
        quotation.quotationType !== APP_CONSTANTS.QUOTATION_TYPES.PRODUCT &&
        quotation.quotationType !== APP_CONSTANTS.QUOTATION_TYPES.TECHNICAL
      ) {
        throw AppError.notFound('Quotation not found');
      }

      if (
        isServiceOfficeUser(authUser) &&
        quotation.quotationType !== APP_CONSTANTS.QUOTATION_TYPES.SERVICE &&
        quotation.quotationType !== APP_CONSTANTS.QUOTATION_TYPES.AMC
      ) {
        throw AppError.notFound('Quotation not found');
      }
    }
    return quotation;
  }

  /**
   * List quotations with pagination and filters
   */
  async listQuotations(options: QuotationFilterOptions, authUser?: JwtPayload) {
    const isAdminOrManager =
      authUser?.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser?.role === APP_CONSTANTS.ROLES.MANAGER;

    // If the authenticated user is not Admin/Manager (except Accountant Office),
    // strictly scope to only quotations they created and their allowed categories
    if (
      authUser &&
      !isAdminOrManager &&
      authUser.designation !== 'Accountant Office'
    ) {
      options.createdById = authUser.userId;
      options.salespersonId = undefined; // clear out any parameter override

      if (isSalesOfficeUser(authUser)) {
        options.allowedTypes = [
          APP_CONSTANTS.QUOTATION_TYPES.PRODUCT,
          APP_CONSTANTS.QUOTATION_TYPES.TECHNICAL,
        ];
      } else if (isServiceOfficeUser(authUser)) {
        options.allowedTypes = [
          APP_CONSTANTS.QUOTATION_TYPES.SERVICE,
          APP_CONSTANTS.QUOTATION_TYPES.AMC,
        ];
      }
    }

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;

    const { data, total } = await this.quotationRepo.findAll({
      ...options,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      quotations: data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get full revision history for a quotation
   */
  async getRevisionHistory(id: string, authUser?: JwtPayload) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }
    const isAdminOrManager =
      authUser?.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser?.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      authUser &&
      !isAdminOrManager &&
      authUser.designation !== 'Accountant Office' &&
      quotation.createdById !== authUser.userId &&
      quotation.salespersonId !== authUser.userId
    ) {
      throw AppError.notFound('Quotation not found');
    }

    return this.quotationRepo.findRevisionsList(id);
  }

  /**
   * Get specific revision and its line items
   */
  async getSpecificRevision(id: string, revisionNumber: number, authUser?: JwtPayload) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }
    const isAdminOrManager =
      authUser?.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser?.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      authUser &&
      !isAdminOrManager &&
      authUser.designation !== 'Accountant Office' &&
      quotation.createdById !== authUser.userId &&
      quotation.salespersonId !== authUser.userId
    ) {
      throw AppError.notFound('Quotation not found');
    }

    const revision = await this.quotationRepo.findRevisionByNumber(id, revisionNumber);
    if (!revision) {
      throw AppError.notFound(`Revision ${revisionNumber} not found for this quotation`);
    }

    return revision;
  }

  /**
   * Get full approval audit trail for a quotation
   */
  async getApprovalHistory(id: string, authUser?: JwtPayload) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }
    const isAdminOrManager =
      authUser?.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser?.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      authUser &&
      !isAdminOrManager &&
      authUser.designation !== 'Accountant Office' &&
      quotation.createdById !== authUser.userId &&
      quotation.salespersonId !== authUser.userId
    ) {
      throw AppError.notFound('Quotation not found');
    }

    return this.quotationRepo.findApprovals(id);
  }

  /**
   * Get full activity log history for a quotation
   */
  async getActivityHistory(id: string, authUser?: JwtPayload) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }
    const isAdminOrManager =
      authUser?.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser?.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      authUser &&
      !isAdminOrManager &&
      authUser.designation !== 'Accountant Office' &&
      quotation.createdById !== authUser.userId &&
      quotation.salespersonId !== authUser.userId
    ) {
      throw AppError.notFound('Quotation not found');
    }

    return this.quotationRepo.findActivities(id);
  }

  /**
   * Generate authoritative PDF buffer for active quotation revision or specific historical revision
   */
  async generatePdf(id: string, revisionNumber?: number, authUser?: JwtPayload): Promise<{ buffer: Buffer; filename: string }> {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }
    const isAdminOrManager =
      authUser?.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser?.role === APP_CONSTANTS.ROLES.MANAGER;

    if (
      authUser &&
      !isAdminOrManager &&
      authUser.designation !== 'Accountant Office' &&
      quotation.createdById !== authUser.userId &&
      quotation.salespersonId !== authUser.userId
    ) {
      throw AppError.notFound('Quotation not found');
    }

    let revision: any;
    if (revisionNumber !== undefined) {
      revision = await this.quotationRepo.findRevisionByNumber(id, revisionNumber);
      if (!revision) {
        throw AppError.notFound(`Revision ${revisionNumber} not found for this quotation`);
      }
    } else {
      revision = quotation.currentRevision;
      if (!revision) {
        throw AppError.internal('Active quotation revision not found');
      }
    }

    const pdfBuffer = await QuotationPdfService.generatePdf({
      quotationNumber: quotation.quotationNumber,
      quotationType: quotation.quotationType,
      status: quotation.status,
      createdAt: quotation.createdAt ? quotation.createdAt.toISOString() : new Date().toISOString(),
      salesperson: quotation.salesperson,
      createdByUser: quotation.createdByUser,
      customer: quotation.customer,
      destination: quotation.destination,
      revision: {
        ...revision,
        quotationDate: revision.quotationDate ? revision.quotationDate.toISOString() : new Date().toISOString(),
        validUntil: revision.validUntil ? revision.validUntil.toISOString() : new Date().toISOString(),
      },
      approvals: quotation.approvals?.map((a: any) => ({
        ...a,
        actionAt: a.actionAt ? a.actionAt.toISOString() : new Date().toISOString(),
      })),
    });

    const safeQuotationNum = quotation.quotationNumber.replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `Quotation_${safeQuotationNum}_Rev${revision.revisionNumber}.pdf`;

    return { buffer: pdfBuffer, filename };
  }

  /**
   * Send quotation PDF attachment via Resend email to the customer
   */
  async sendQuotationEmailToCustomer(
    id: string,
    options?: SendQuotationEmailDto,
    authUser?: JwtPayload
  ) {
    if (authUser?.designation === 'Accountant Office') {
      throw AppError.forbidden('Accountant Office is not permitted to dispatch quotation emails');
    }

    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    // Verify quotation approval status (must be approved by admin or in an approved flow state)
    const allowedStatuses = [
      APP_CONSTANTS.QUOTATION_STATUSES.APPROVED,
      APP_CONSTANTS.QUOTATION_STATUSES.SENT,
      APP_CONSTANTS.QUOTATION_STATUSES.ACCEPTED,
      'FOLLOW_UP',
    ];

    if (!allowedStatuses.includes(quotation.status)) {
      throw AppError.badRequest(
        `Quotation must be approved by admin before sending to customer. Current status is ${quotation.status}.`
      );
    }

    const currentRevision = quotation.currentRevision;
    if (!currentRevision) {
      throw AppError.notFound('Active quotation revision details not found');
    }

    // Determine target recipient email address (from customer record or input override)
    const targetEmail =
      options?.customEmail?.trim() ||
      quotation.customer?.email?.trim() ||
      currentRevision.customerEmail?.trim();

    if (!targetEmail) {
      throw AppError.badRequest(
        'Customer email address is not defined on customer record. Please specify a valid target email address.'
      );
    }

    // Generate authoritative PDF buffer
    const { buffer: pdfBuffer, filename } = await this.generatePdf(id);

    // Format currency total
    const formattedTotal = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currentRevision.currency || 'INR',
      maximumFractionDigits: 2,
    }).format(Number(currentRevision.grandTotal) || 0);

    const formattedValidUntil = currentRevision.validUntil
      ? new Date(currentRevision.validUntil).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : undefined;

    const customerName = quotation.customer?.name || currentRevision.customerName || 'Valued Customer';

    // Dispatch email via Resend
    const resendResult = await emailService.sendQuotationEmail({
      to: targetEmail,
      subject: options?.customSubject,
      quotationNumber: quotation.quotationNumber,
      customerName,
      grandTotal: formattedTotal,
      validUntil: formattedValidUntil,
      pdfBuffer,
      filename,
      customMessage: options?.customNotes,
    });

    // If quotation status was APPROVED, update status to SENT
    if (quotation.status === APP_CONSTANTS.QUOTATION_STATUSES.APPROVED) {
      await db
        .update(quotations)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.SENT,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, quotation.id));

      await db
        .update(quotationRevisions)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.SENT,
          updatedAt: new Date(),
        })
        .where(eq(quotationRevisions.id, currentRevision.id));
    }

    // Record activity log
    await db.insert(quotationActivityLogs).values({
      quotationId: quotation.id,
      quotationRevisionId: currentRevision.id,
      userId: authUser?.userId || quotation.createdById,
      action: 'EMAIL_SENT',
      title: 'Quotation PDF Emailed to Customer',
      description: `Quotation PDF Rev ${currentRevision.revisionNumber} sent to ${targetEmail} via Resend. (Msg ID: ${resendResult.id})`,
    });

    // Synchronize Deals Pipeline stage to 'Quotation Sent' if linked lead/deal exists
    if (quotation.customerId) {
      try {
        const matchedLeads = await db
          .select({ id: leads.id, status: leads.status })
          .from(leads)
          .where(eq(leads.linkedClientId, quotation.customerId));

        for (const ld of matchedLeads) {
          const currentStage = (ld.status || '').toUpperCase();
          const advancedStages = ['ORDER CONFIRMED', 'READY FOR DISPATCH', 'DISPATCHED', 'INSTALLATION', 'COMPLETED', 'WON'];
          if (!advancedStages.some((s) => currentStage.includes(s))) {
            await db
              .update(leads)
              .set({ status: 'Quotation Sent', updatedAt: new Date() })
              .where(eq(leads.id, ld.id));

            await db.insert(leadActivityLogs).values({
              id: `act-${ld.id}-${Date.now()}`,
              leadId: ld.id,
              title: `Quotation ${quotation.quotationNumber} sent successfully to customer — pipeline moved to Quotation Sent`,
              date: new Date().toISOString().split('T')[0],
              type: 'System',
            });
          }
        }
      } catch {
        // Non-blocking log
      }
    }

    return {
      message: `Quotation PDF successfully emailed to ${targetEmail}`,
      emailId: resendResult.id,
      recipientEmail: targetEmail,
    };
  }

  /**
   * Record Customer Acceptance on an internally approved quotation.
   * State transition: APPROVED | SENT | FOLLOW_UP -> ACCEPTED
   */
  async customerAcceptQuotation(
    id: string,
    input: CustomerAcceptQuotationDto = {},
    authUser: JwtPayload
  ) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    // Strictly enforce: Internal approval must have occurred
    const allowedStatuses: string[] = [
      APP_CONSTANTS.QUOTATION_STATUSES.APPROVED,
      APP_CONSTANTS.QUOTATION_STATUSES.SENT,
      APP_CONSTANTS.QUOTATION_STATUSES.FOLLOW_UP,
    ];

    if (!allowedStatuses.includes(quotation.status)) {
      if (
        quotation.status === APP_CONSTANTS.QUOTATION_STATUSES.DRAFT ||
        quotation.status === APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL
      ) {
        throw AppError.badRequest(
          `Cannot record customer acceptance: Quotation is in "${quotation.status}" status. It must be internally approved and sent to client first.`
        );
      }
      if (quotation.status === APP_CONSTANTS.QUOTATION_STATUSES.ACCEPTED) {
        throw AppError.badRequest('Quotation has already been marked as accepted by the customer.');
      }
      throw AppError.badRequest(
        `Cannot record customer acceptance for quotation in "${quotation.status}" status.`
      );
    }

    const currentRevision = quotation.currentRevision;
    if (!currentRevision) {
      throw AppError.internal('Active quotation revision not found');
    }

    await db.transaction(async (tx) => {
      // 1. Update quotation master status
      await tx
        .update(quotations)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.ACCEPTED,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id));

      // 2. Update active revision status
      await tx
        .update(quotationRevisions)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.ACCEPTED,
          updatedAt: new Date(),
        })
        .where(eq(quotationRevisions.id, currentRevision.id));

      // 3. Record in activity logs
      const logDescription = [
        `Customer accepted quotation Rev ${currentRevision.revisionNumber}.`,
        input?.customerPoNumber ? `Customer PO: ${input.customerPoNumber}.` : null,
        input?.notes ? `Notes: ${input.notes}` : null,
        `(Recorded by ${authUser.email})`,
      ]
        .filter(Boolean)
        .join(' ');

      await tx.insert(quotationActivityLogs).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        userId: authUser.userId,
        action: 'ACCEPTED',
        title: 'Customer Accepted Quotation',
        description: logDescription,
        metadata: JSON.stringify({
          customerPoNumber: input?.customerPoNumber || null,
          notes: input?.notes || null,
          acceptedAt: new Date().toISOString(),
          recordedBy: authUser.email,
        }),
      });
    });

    // Synchronize Deals Pipeline stage to 'Won' or 'Quotation Accepted' if linked lead/deal exists
    if (quotation.customerId) {
      try {
        const matchedLeads = await db
          .select({ id: leads.id, status: leads.status })
          .from(leads)
          .where(eq(leads.linkedClientId, quotation.customerId));

        for (const ld of matchedLeads) {
          const currentStage = (ld.status || '').toUpperCase();
          const advancedStages = ['ORDER CONFIRMED', 'READY FOR DISPATCH', 'DISPATCHED', 'INSTALLATION', 'COMPLETED', 'WON'];
          if (!advancedStages.some((s) => currentStage.includes(s))) {
            await db
              .update(leads)
              .set({ status: 'Quotation Accepted', updatedAt: new Date() })
              .where(eq(leads.id, ld.id));

            await db.insert(leadActivityLogs).values({
              id: `act-${ld.id}-${Date.now()}`,
              leadId: ld.id,
              title: `Quotation ${quotation.quotationNumber} accepted by customer — pipeline moved to Quotation Accepted`,
              date: new Date().toISOString().split('T')[0],
              type: 'System',
            });
          }
        }
      } catch {
        // Non-blocking
      }
    }

    return this.quotationRepo.findById(id);
  }

  /**
   * Record Customer Rejection on an internally approved quotation.
   * State transition: APPROVED | SENT | FOLLOW_UP -> REJECTED_BY_CUSTOMER
   */
  async customerRejectQuotation(
    id: string,
    input: CustomerRejectQuotationDto,
    authUser: JwtPayload
  ) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    const allowedStatuses: string[] = [
      APP_CONSTANTS.QUOTATION_STATUSES.APPROVED,
      APP_CONSTANTS.QUOTATION_STATUSES.SENT,
      APP_CONSTANTS.QUOTATION_STATUSES.FOLLOW_UP,
    ];

    if (!allowedStatuses.includes(quotation.status)) {
      throw AppError.badRequest(
        `Cannot record customer rejection for quotation in "${quotation.status}" status.`
      );
    }

    const currentRevision = quotation.currentRevision;
    if (!currentRevision) {
      throw AppError.internal('Active quotation revision not found');
    }

    await db.transaction(async (tx) => {
      // 1. Update quotation master status
      await tx
        .update(quotations)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.REJECTED_BY_CUSTOMER,
          updatedById: authUser.userId,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id));

      // 2. Update active revision status
      await tx
        .update(quotationRevisions)
        .set({
          status: APP_CONSTANTS.QUOTATION_STATUSES.REJECTED_BY_CUSTOMER,
          updatedAt: new Date(),
        })
        .where(eq(quotationRevisions.id, currentRevision.id));

      // 3. Record in activity logs
      await tx.insert(quotationActivityLogs).values({
        quotationId: quotation.id,
        quotationRevisionId: currentRevision.id,
        userId: authUser.userId,
        action: 'CUSTOMER_REJECTED',
        title: 'Customer Rejected Quotation',
        description: `Customer rejected quotation Rev ${currentRevision.revisionNumber}. Reason: ${input.rejectionReason} (Recorded by ${authUser.email})`,
        metadata: JSON.stringify({
          rejectionReason: input.rejectionReason,
          rejectedAt: new Date().toISOString(),
          recordedBy: authUser.email,
        }),
      });
    });

    return this.quotationRepo.findById(id);
  }
}

