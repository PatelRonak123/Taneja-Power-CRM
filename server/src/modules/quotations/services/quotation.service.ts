import { eq, and } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  quotations,
  quotationRevisions,
  quotationItems,
  quotationApprovals,
  quotationActivityLogs,
} from '../../../database/schema/quotations.js';
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
} from '../validators/quotation.validator.js';
import { AppError } from '../../../common/errors/AppError.js';
import { JwtPayload } from '../../../common/auth/jwt.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class QuotationService {
  constructor(
    private readonly quotationRepo: QuotationRepository = new QuotationRepository(),
    private readonly calcService: QuotationCalculationService = new QuotationCalculationService(),
    private readonly numberService: QuotationNumberService = new QuotationNumberService()
  ) {}

  /**
   * Create a brand new quotation with Revision 1 and line items atomically
   */
  async createQuotation(input: CreateQuotationDto, authUser: JwtPayload) {
    if (!authUser?.userId) {
      throw AppError.unauthorized('User not authenticated');
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
          sortOrder: item.sortOrder,
          itemType: item.itemType || APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
        });
      }
    }

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
          revisionReason: 'Initial revision created',
          createdById: authUser.userId,
        })
        .returning();

      // C. Insert Line Items
      if (calculation.items.length > 0) {
        await tx.insert(quotationItems).values(
          calculation.items.map((item) => ({
            ...item,
            quotationRevisionId: newRevision.id,
            quotationId: newQuotation.id,
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

    // Only DRAFT and PENDING_APPROVAL quotations can be edited directly
    if (
      quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.DRAFT &&
      quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL
    ) {
      throw AppError.badRequest(
        `Quotations in "${quotation.status}" status cannot be edited directly. Please create a formal revision instead.`
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
            sortOrder: item.sortOrder,
            itemType: item.itemType || APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
          });
        }
      }
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
          updatedAt: new Date(),
        })
        .where(eq(quotationRevisions.id, currentRevision.id));

      // If items updated: delete old and insert new
      if (input.items && input.items.length > 0) {
        await tx.delete(quotationItems).where(eq(quotationItems.quotationRevisionId, currentRevision.id));

        await tx.insert(quotationItems).values(
          calculation.items.map((item) => ({
            ...item,
            quotationRevisionId: currentRevision.id,
            quotationId: quotation.id,
          }))
        );
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
            sortOrder: item.sortOrder,
            itemType: item.itemType || APP_CONSTANTS.QUOTATION_ITEM_TYPES.PRODUCT,
          });
        }
      }
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
          revisionReason: input.revisionReason,
          createdById: authUser.userId,
        })
        .returning();

      // 3. Insert items for new revision
      if (calculation.items.length > 0) {
        await tx.insert(quotationItems).values(
          calculation.items.map((item) => ({
            ...item,
            quotationRevisionId: newRev.id,
            quotationId: quotation.id,
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

    if (quotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.DRAFT) {
      throw AppError.badRequest(
        `Cannot submit quotation in status "${quotation.status}". Only DRAFT quotations can be submitted for approval.`
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
  async getQuotationById(id: string) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }
    return quotation;
  }

  /**
   * List quotations with pagination and filters
   */
  async listQuotations(options: QuotationFilterOptions) {
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
  async getRevisionHistory(id: string) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    return this.quotationRepo.findRevisionsList(id);
  }

  /**
   * Get specific revision and its line items
   */
  async getSpecificRevision(id: string, revisionNumber: number) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
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
  async getApprovalHistory(id: string) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    return this.quotationRepo.findApprovals(id);
  }

  /**
   * Get full activity log history for a quotation
   */
  async getActivityHistory(id: string) {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw AppError.notFound('Quotation not found');
    }

    return this.quotationRepo.findActivities(id);
  }

  /**
   * Generate authoritative PDF buffer for active quotation revision or specific historical revision
   */
  async generatePdf(id: string, revisionNumber?: number): Promise<{ buffer: Buffer; filename: string }> {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
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
}
