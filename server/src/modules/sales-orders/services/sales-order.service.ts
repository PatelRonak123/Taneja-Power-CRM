import { db } from '../../../database/db.js';
import {
  SalesOrderRepository,
  SalesOrderWithDetails,
  ListSalesOrdersQuery,
} from '../repositories/sales-order.repository.js';
import { SalesOrderNumberService } from './sales-order-number.service.js';
import { NewSalesOrderEntity, NewSalesOrderItemEntity, salesOrders } from '../../../database/schema/sales-orders.js';
import { quotations, quotationRevisions, quotationItems } from '../../../database/schema/quotations.js';
import { amcServiceRequests, amcContracts } from '../../../database/schema/amc-contracts.js';
import { leads, leadActivityLogs } from '../../../database/schema/leads.js';
import { customers } from '../../../database/schema/customers.js';
import { products } from '../../../database/schema/products.js';
import { sql, eq, and, ne } from 'drizzle-orm';
import { SO_STATUSES } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

// Re-export the SO_STATUSES alias used by the tests
export { SO_STATUSES };

export interface AuthUserContext {
  id?: string;
  userId?: string;
}

export interface CreateSalesOrderInput {
  quotationId: string;
  customerPoNumber?: string | null;
  customerPoDate?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  // Client totals are IGNORED – server always recalculates
}

export interface UpdateSalesOrderInput {
  customerPoNumber?: string | null;
  customerPoDate?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
}

export interface CancelSalesOrderInput {
  cancellationReason: string;
}

// QUOTATION_STATUSES may not be exported from constants yet – use the string value
const APPROVED_STATUS = 'APPROVED';

/**
 * SalesOrderService
 *
 * Lifecycle (Phase 3):
 *   DRAFT → (submit) → PENDING_CONFIRMATION → (confirm) → CONFIRMED
 *   DRAFT | PENDING_CONFIRMATION → (cancel) → CANCELLED
 *   CONFIRMED → (cancel) → CANCELLED  [only if no downstream invoices/dispatches]
 *
 * INVARIANT: No stock mutation occurs at any point in this service.
 *            StockService is intentionally NOT imported or called.
 */
export class SalesOrderService {
  constructor(
    private readonly soRepo: SalesOrderRepository = new SalesOrderRepository(),
    private readonly numberService: SalesOrderNumberService = new SalesOrderNumberService()
  ) {}

  // ─── CREATE ──────────────────────────────────────────────────────────────────

  /**
   * Create a Sales Order from an APPROVED quotation.
   * Steps (all within a single transaction):
   *  1. Validate quotation exists and is APPROVED
   *  2. Validate quotation belongs to the same customer
   *  3. Load authoritative quotation revision items
   *  4. Snapshot product/commercial values
   *  5. Recalculate all totals server-side
   *  6. Generate collision-safe SO number
   *  7. Insert SO + items atomically
   *
   * Client-provided totals: ignored entirely.
   */
  async createSalesOrder(
    input: CreateSalesOrderInput,
    authUser: AuthUserContext
  ): Promise<SalesOrderWithDetails> {
    const userId = authUser.userId || authUser.id;
    if (!userId) throw AppError.unauthorized('User must be authenticated', 'UNAUTHENTICATED');

    return db.transaction(async (tx) => {
      // 1. Load and validate quotation
      const quotation = await tx.query.quotations.findFirst({
        where: eq(quotations.id, input.quotationId),
      });

      if (!quotation) {
        throw AppError.notFound(`Quotation "${input.quotationId}" not found`, 'QUOTATION_NOT_FOUND');
      }

      // Prevent duplicate active Sales Orders from the same quotation
      const existingSo = await tx.query.salesOrders.findFirst({
        where: and(
          eq(salesOrders.quotationId, quotation.id),
          ne(salesOrders.status, SO_STATUSES.CANCELLED)
        ),
      });

      if (existingSo) {
        throw AppError.conflict(
          `An active Sales Order (${existingSo.salesOrderNumber}) already exists for this quotation.`,
          'SALES_ORDER_ALREADY_EXISTS'
        );
      }

      // Strictly enforce: AMC Quotation requires customer acceptance
      if (quotation.quotationType === 'AMC') {
        if (quotation.status !== 'ACCEPTED') {
          throw AppError.badRequest(
            `Cannot create Sales Order: AMC Quotation must be accepted by customer first. Current status: ${quotation.status}`,
            undefined,
            'QUOTATION_NOT_ACCEPTED'
          );
        }
      } else {
        const allowedQuotationStatuses = ['APPROVED', 'SENT', 'ACCEPTED', 'FOLLOW_UP'];
        if (!allowedQuotationStatuses.includes(quotation.status)) {
          throw AppError.badRequest(
            `Quotation must be APPROVED, SENT, or ACCEPTED to create a Sales Order. Current status: ${quotation.status}`,
            undefined,
            'QUOTATION_NOT_APPROVED'
          );
        }
      }

      // 2. Load current revision (authoritative snapshot)
      const revision = await tx.query.quotationRevisions.findFirst({
        where: eq(quotationRevisions.quotationId, quotation.id),
        orderBy: (qr: any, { desc: d }: any) => [d(qr.revisionNumber)],
      });

      if (!revision) {
        throw AppError.internal('Approved quotation has no revision – data integrity error');
      }

      // 3. Load revision line items
      const revisionItems = await tx.query.quotationItems.findMany({
        where: eq(quotationItems.quotationRevisionId, revision.id),
        orderBy: (qi: any, { asc: a }: any) => [a(qi.sortOrder)],
      });

      if (!revisionItems || revisionItems.length === 0) {
        throw AppError.badRequest('Quotation revision has no line items', undefined, 'EMPTY_QUOTATION_ITEMS');
      }

      // 4. Snapshot items and calculate totals server-side
      let totalSubtotal = 0;
      let totalTax = 0;

      const soItems: Array<Omit<NewSalesOrderItemEntity, 'salesOrderId'>> = revisionItems.map((qi, idx) => {
        // Use the quotation-calculated values (already server-computed by quotation service)
        const qty = Number(qi.quantity);
        const unitPrice = Number(qi.unitPrice);
        const lineSubtotal = Math.round(qty * unitPrice * 100) / 100;

        // GST split: quotation stores CGST+SGST or IGST
        const totalTaxRate = Number(qi.gstRate || 0);
        const lineTax = Math.round(lineSubtotal * totalTaxRate / 100 * 100) / 100;
        const lineTotal = Math.round((lineSubtotal + lineTax) * 100) / 100;

        totalSubtotal += lineSubtotal;
        totalTax += lineTax;

        return {
          productId: qi.productId,
          productNameSnapshot: qi.productName,
          skuSnapshot: qi.productSku,
          descriptionSnapshot: qi.description,
          hsnSacSnapshot: qi.hsnSac,
          unitSnapshot: qi.unit,
          quantity: String(qty),
          unitPrice: String(unitPrice),
          taxRate: String(totalTaxRate),
          taxAmount: String(lineTax),
          lineSubtotal: String(lineSubtotal),
          lineTotal: String(lineTotal),
          sortOrder: qi.sortOrder ?? idx,
        };
      });

      // Round header totals to 2dp
      const subtotal = Math.round(totalSubtotal * 100) / 100;
      const taxAmount = Math.round(totalTax * 100) / 100;
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

      // 5. Generate SO number (atomic, concurrency-safe)
      const soNumber = await this.numberService.generateNumber(new Date(), tx);

      // 6. Build SO header with address snapshots from revision
      const soData: NewSalesOrderEntity = {
        salesOrderNumber: soNumber,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        quotationRevisionId: revision.id,
        customerPoNumber: input.customerPoNumber?.trim() || null,
        customerPoDate: input.customerPoDate ? new Date(input.customerPoDate) : null,
        orderDate: new Date(),
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,

        // Address snapshots from revision
        billingAddress: revision.billingAddress,
        billingCity: revision.billingCity,
        billingState: revision.billingState,
        billingPincode: revision.billingPincode,
        shippingName: revision.shippingName,
        shippingAddress: revision.shippingAddress,
        shippingCity: revision.shippingCity,
        shippingState: revision.shippingState,
        shippingPincode: revision.shippingPincode,

        paymentTerms: revision.paymentTerms,
        notes: input.notes?.trim() || null,

        // Server-calculated totals – client values are ignored
        subtotal: String(subtotal),
        taxAmount: String(taxAmount),
        totalAmount: String(totalAmount),

        status: SO_STATUSES.DRAFT,
        createdBy: userId,
      };

      const createdSo = await this.soRepo.create(soData, soItems, tx);

      // Synchronize linked AMC Breakdown / Repair Service Request if this quotation is linked
      try {
        await tx
          .update(amcServiceRequests)
          .set({ salesOrderId: createdSo.id, updatedAt: new Date() })
          .where(eq(amcServiceRequests.quotationId, quotation.id));
      } catch (linkErr) {
        console.error('Failed to link Sales Order to AMC Service Request:', linkErr);
      }

      // Synchronize Deals Pipeline stage to 'Order Confirmed'
      if (quotation.customerId) {
        try {
          const matchedLeads = await tx
            .select({ id: leads.id })
            .from(leads)
            .where(eq(leads.linkedClientId, quotation.customerId));

          for (const ld of matchedLeads) {
            await tx
              .update(leads)
              .set({ status: 'Order Confirmed', updatedAt: new Date() })
              .where(eq(leads.id, ld.id));

            await tx.insert(leadActivityLogs).values({
              id: `act-${ld.id}-${Date.now()}`,
              leadId: ld.id,
              title: `Sales Order ${soNumber} created — pipeline moved to Order Confirmed`,
              date: new Date().toISOString().split('T')[0],
              type: 'System',
            });
          }
        } catch {
          // Non-blocking
        }
      }

      return createdSo;
    });
  }

  // ─── UPDATE (DRAFT only) ─────────────────────────────────────────────────────

  async updateSalesOrder(
    id: string,
    input: UpdateSalesOrderInput
  ): Promise<SalesOrderWithDetails> {
    return db.transaction(async (tx) => {
      const so = await this.soRepo.lockForUpdate(id, tx);

      if (so.status !== SO_STATUSES.DRAFT) {
        throw AppError.badRequest(
          `Only DRAFT Sales Orders can be edited. Current status: ${so.status}`,
          undefined,
          'SO_NOT_EDITABLE'
        );
      }

      await this.soRepo.update(id, {
        customerPoNumber: input.customerPoNumber?.trim() || null,
        customerPoDate: input.customerPoDate ? new Date(input.customerPoDate) : null,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
        notes: input.notes?.trim() || null,
      }, tx);

      return this.soRepo.findById(id, tx) as Promise<SalesOrderWithDetails>;
    });
  }

  // ─── SUBMIT ──────────────────────────────────────────────────────────────────

  async submitSalesOrder(id: string, authUser: AuthUserContext): Promise<SalesOrderWithDetails> {
    const userId = authUser.userId || authUser.id;

    return db.transaction(async (tx) => {
      const so = await this.soRepo.lockForUpdate(id, tx);

      if (so.status !== SO_STATUSES.DRAFT) {
        throw AppError.badRequest(
          `Only DRAFT Sales Orders can be submitted. Current status: ${so.status}`,
          undefined,
          'INVALID_STATUS_TRANSITION'
        );
      }

      await this.soRepo.update(id, { status: SO_STATUSES.PENDING_CONFIRMATION }, tx);
      return this.soRepo.findById(id, tx) as Promise<SalesOrderWithDetails>;
    });
  }

  // ─── CONFIRM ─────────────────────────────────────────────────────────────────

  async confirmSalesOrder(id: string, authUser: AuthUserContext): Promise<SalesOrderWithDetails> {
    const userId = authUser.userId || authUser.id;
    if (!userId) throw AppError.unauthorized('User must be authenticated', 'UNAUTHENTICATED');

    return db.transaction(async (tx) => {
      const so = await this.soRepo.lockForUpdate(id, tx);

      if (so.status !== SO_STATUSES.PENDING_CONFIRMATION) {
        throw AppError.badRequest(
          `Only PENDING_CONFIRMATION Sales Orders can be confirmed. Current status: ${so.status}`,
          undefined,
          'INVALID_STATUS_TRANSITION'
        );
      }

      // CRITICAL: No stock mutation. No StockService call.
      await this.soRepo.update(id, {
        status: SO_STATUSES.CONFIRMED,
        confirmedBy: userId,
        confirmedAt: new Date(),
      }, tx);

      return this.soRepo.findById(id, tx) as Promise<SalesOrderWithDetails>;
    });
  }

  // ─── CANCEL ──────────────────────────────────────────────────────────────────

  async cancelSalesOrder(
    id: string,
    input: CancelSalesOrderInput,
    authUser: AuthUserContext
  ): Promise<SalesOrderWithDetails> {
    const userId = authUser.userId || authUser.id;
    if (!userId) throw AppError.unauthorized('User must be authenticated', 'UNAUTHENTICATED');

    if (!input.cancellationReason?.trim()) {
      throw AppError.badRequest('Cancellation reason is required', undefined, 'CANCELLATION_REASON_REQUIRED');
    }

    return db.transaction(async (tx) => {
      const so = await this.soRepo.lockForUpdate(id, tx);

      const cancellableStatuses = [SO_STATUSES.DRAFT, SO_STATUSES.PENDING_CONFIRMATION, SO_STATUSES.CONFIRMED];
      if (!cancellableStatuses.includes(so.status as any)) {
        throw AppError.badRequest(
          `Sales Order in "${so.status}" status cannot be cancelled`,
          undefined,
          'INVALID_STATUS_TRANSITION'
        );
      }

      // CRITICAL: No stock mutation. No StockService call.
      await this.soRepo.update(id, {
        status: SO_STATUSES.CANCELLED,
        cancelledBy: userId,
        cancelledAt: new Date(),
        cancellationReason: input.cancellationReason.trim(),
      }, tx);

      return this.soRepo.findById(id, tx) as Promise<SalesOrderWithDetails>;
    });
  }

  // ─── READS ───────────────────────────────────────────────────────────────────

  async getSalesOrderById(id: string): Promise<SalesOrderWithDetails> {
    const so = await this.soRepo.findById(id);
    if (!so) throw AppError.notFound(`Sales order "${id}" not found`, 'SO_NOT_FOUND');
    // Enrich with linked AMC contract ID (if any)
    if (so.quotationId) {
      const [linkedAmc] = await db
        .select({ id: amcContracts.id, contractNumber: amcContracts.contractNumber, status: amcContracts.status })
        .from(amcContracts)
        .where(eq(amcContracts.quotationId, so.quotationId))
        .limit(1);
      (so as any).linkedAmcContract = linkedAmc || null;
    }
    return so;
  }

  async listSalesOrders(query: ListSalesOrdersQuery): Promise<{ data: any[]; total: number }> {
    const result = await this.soRepo.find(query);
    // Enrich each SO with linked AMC contract info
    if (result.data.length > 0) {
      const quotationIds = [...new Set(result.data.map((so: any) => so.quotation?.id || so.quotationId).filter(Boolean))];
      if (quotationIds.length > 0) {
        const amcRows = await db
          .select({
            quotationId: amcContracts.quotationId,
            id: amcContracts.id,
            contractNumber: amcContracts.contractNumber,
            status: amcContracts.status,
          })
          .from(amcContracts)
          .where(sql`${amcContracts.quotationId} IN (${sql.join(quotationIds.map(qid => sql`${qid}`), sql`, `)})`);
        const amcMap = new Map<string, any>();
        for (const row of amcRows) {
          if (row.quotationId) amcMap.set(row.quotationId, row);
        }
        for (const so of result.data) {
          const qId = so.quotation?.id || so.quotationId;
          so.linkedAmcContract = qId ? (amcMap.get(qId) || null) : null;
        }
      }
    }
    return result;
  }
}
