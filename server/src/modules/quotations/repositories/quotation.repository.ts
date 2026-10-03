import { eq, ilike, or, and, count, desc, gte, lte, aliasedTable, inArray } from 'drizzle-orm';
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
  quotationAttachments,
  QuotationEntity,
  QuotationRevisionEntity,
  QuotationItemEntity,
  QuotationAmcScopeItemEntity,
  QuotationAmcExclusionEntity,
  QuotationAmcEscalationEntity,
  QuotationApprovalEntity,
  QuotationActivityLogEntity,
  QuotationAttachmentEntity,
} from '../../../database/schema/quotations.js';
import { customers, customerDestinations } from '../../../database/schema/customers.js';
import { users } from '../../../database/schema/users.js';
import { products } from '../../../database/schema/products.js';
import { salesOrders } from '../../../database/schema/sales-orders.js';
import { amcContracts } from '../../../database/schema/amc-contracts.js';

export interface QuotationFilterOptions {
  search?: string;
  status?: string | string[];
  statuses?: string[];
  quotationType?: string;
  allowedTypes?: string[];
  customerId?: string;
  salespersonId?: string;
  createdById?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface QuotationListItem {
  id: string;
  quotationNumber: string;
  quotationType: string;
  status: string;
  currentRevisionNumber: number;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  destination: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  salesperson: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  currentRevision?: {
    id: string;
    revisionNumber: number;
    grandTotal: string;
    taxableAmount: string;
    totalTax: string;
    currency: string;
    quotationDate: Date;
    validUntil: Date;
  } | null;
}

export type FullQuotationRevision = QuotationRevisionEntity & {
  items: QuotationItemEntity[];
  amcScope?: QuotationAmcScopeItemEntity[];
  amcExclusions?: QuotationAmcExclusionEntity[];
  amcEscalations?: QuotationAmcEscalationEntity[];
};

export interface QuotationDetailedView extends QuotationEntity {
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  } | null;
  destination: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  } | null;
  salesperson: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  currentRevision: FullQuotationRevision | null;
  approvals: (QuotationApprovalEntity & {
    requestedBy: { id: string; fullName: string; email: string } | null;
    reviewedBy: { id: string; fullName: string; email: string } | null;
  })[];
  activityLogs: (QuotationActivityLogEntity & {
    user: { id: string; fullName: string; email: string } | null;
  })[];
  attachments: QuotationAttachmentEntity[];
  linkedSalesOrder?: {
    id: string;
    salesOrderNumber: string;
    status: string;
    orderDate: Date;
    customerPoNumber: string | null;
  } | null;
  linkedAmcContract?: {
    id: string;
    contractNumber: string;
    status: string;
    startDate: Date;
    endDate: Date;
  } | null;
}

const salespersons = aliasedTable(users, 'salespersons');
const createdByUsers = aliasedTable(users, 'created_by_users');
const requestedByUsers = aliasedTable(users, 'requested_by_users');
const reviewedByUsers = aliasedTable(users, 'reviewed_by_users');
const activityUsers = aliasedTable(users, 'activity_users');

export class QuotationRepository {
  /**
   * Helper to load all details attached to a revision (items, amcScope, amcExclusions, amcEscalations)
   */
  public async loadRevisionDetails(revisionRecord: QuotationRevisionEntity): Promise<FullQuotationRevision> {
    const itemRows = await db
      .select({
        item: quotationItems,
        stockQuantity: products.stockQuantity,
      })
      .from(quotationItems)
      .leftJoin(products, eq(quotationItems.productId, products.id))
      .where(eq(quotationItems.quotationRevisionId, revisionRecord.id))
      .orderBy(quotationItems.sortOrder, quotationItems.createdAt);

    const items = itemRows.map(({ item, stockQuantity }) => ({
      ...item,
      stockQuantity: stockQuantity ?? 0,
    }));

    const amcScope = await db
      .select()
      .from(quotationAmcScopeItems)
      .where(eq(quotationAmcScopeItems.quotationRevisionId, revisionRecord.id))
      .orderBy(quotationAmcScopeItems.sortOrder, quotationAmcScopeItems.createdAt);

    const amcExclusions = await db
      .select()
      .from(quotationAmcExclusions)
      .where(eq(quotationAmcExclusions.quotationRevisionId, revisionRecord.id))
      .orderBy(quotationAmcExclusions.sortOrder, quotationAmcExclusions.createdAt);

    const amcEscalations = await db
      .select()
      .from(quotationAmcEscalations)
      .where(eq(quotationAmcEscalations.quotationRevisionId, revisionRecord.id))
      .orderBy(quotationAmcEscalations.sortOrder, quotationAmcEscalations.createdAt);

    return {
      ...revisionRecord,
      items,
      amcScope,
      amcExclusions,
      amcEscalations,
    };
  }

  /**
   * Find paginated quotations with filters and joined active revision totals
   */
  async findAll(
    options: QuotationFilterOptions = {}
  ): Promise<{ data: QuotationListItem[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    const statusParam =
      options.statuses && options.statuses.length > 0
        ? options.statuses
        : typeof options.status === 'string' && options.status.trim() !== '' && options.status.trim() !== 'ALL'
          ? options.status.split(',').map((s) => s.trim()).filter(Boolean)
          : Array.isArray(options.status)
            ? (options.status as string[]).map((s) => String(s).trim()).filter(Boolean)
            : [];

    const validStatuses = statusParam.filter((s) => s !== 'ALL');
    if (validStatuses.length === 1) {
      conditions.push(eq(quotations.status, validStatuses[0]));
    } else if (validStatuses.length > 1) {
      conditions.push(inArray(quotations.status, validStatuses));
    }

    if (options.quotationType && options.quotationType.trim() !== '' && options.quotationType.trim() !== 'ALL') {
      conditions.push(eq(quotations.quotationType, options.quotationType.trim()));
    }

    if (options.allowedTypes && options.allowedTypes.length > 0) {
      conditions.push(inArray(quotations.quotationType, options.allowedTypes));
    }

    if (options.customerId && options.customerId.trim() !== '') {
      conditions.push(eq(quotations.customerId, options.customerId.trim()));
    }

    if (options.createdById && options.createdById.trim() !== '') {
      conditions.push(
        or(
          eq(quotations.createdById, options.createdById.trim()),
          eq(quotations.salespersonId, options.createdById.trim())
        )
      );
    } else if (options.salespersonId && options.salespersonId.trim() !== '') {
      conditions.push(eq(quotations.salespersonId, options.salespersonId.trim()));
    }

    if (options.startDate && options.startDate.trim() !== '') {
      const startStr = options.startDate.trim();
      const start = new Date(startStr.includes('T') ? startStr : `${startStr}T00:00:00.000Z`);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(quotations.createdAt, start));
      }
    }

    if (options.endDate && options.endDate.trim() !== '') {
      const endStr = options.endDate.trim();
      const end = new Date(endStr.includes('T') ? endStr : `${endStr}T23:59:59.999Z`);
      if (!isNaN(end.getTime())) {
        conditions.push(lte(quotations.createdAt, end));
      }
    }

    if (options.search && options.search.trim() !== '') {
      const searchPattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(quotations.quotationNumber, searchPattern),
          ilike(customers.name, searchPattern),
          ilike(customers.companyName, searchPattern),
          ilike(salespersons.fullName, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const [countResult] = await db
      .select({ value: count() })
      .from(quotations)
      .leftJoin(customers, eq(quotations.customerId, customers.id))
      .leftJoin(salespersons, eq(quotations.salespersonId, salespersons.id))
      .where(whereClause);

    const total = Number(countResult?.value || 0);

    // List query
    const rows = await db
      .select({
        quotation: quotations,
        customer: {
          id: customers.id,
          name: customers.name,
          companyName: customers.companyName,
          phone: customers.phone,
          email: customers.email,
        },
        destination: {
          id: customerDestinations.id,
          name: customerDestinations.name,
          city: customerDestinations.city,
          state: customerDestinations.state,
        },
        salesperson: {
          id: salespersons.id,
          fullName: salespersons.fullName,
          email: salespersons.email,
        },
        createdByUser: {
          id: createdByUsers.id,
          fullName: createdByUsers.fullName,
          email: createdByUsers.email,
        },
        currentRevision: {
          id: quotationRevisions.id,
          revisionNumber: quotationRevisions.revisionNumber,
          grandTotal: quotationRevisions.grandTotal,
          taxableAmount: quotationRevisions.taxableAmount,
          totalTax: quotationRevisions.totalTax,
          currency: quotationRevisions.currency,
          quotationDate: quotationRevisions.quotationDate,
          validUntil: quotationRevisions.validUntil,
        },
      })
      .from(quotations)
      .leftJoin(customers, eq(quotations.customerId, customers.id))
      .leftJoin(customerDestinations, eq(quotations.destinationId, customerDestinations.id))
      .leftJoin(salespersons, eq(quotations.salespersonId, salespersons.id))
      .leftJoin(createdByUsers, eq(quotations.createdById, createdByUsers.id))
      .leftJoin(
        quotationRevisions,
        and(
          eq(quotations.id, quotationRevisions.quotationId),
          eq(quotationRevisions.isCurrent, true)
        )
      )
      .where(whereClause)
      .orderBy(desc(quotations.createdAt))
      .limit(limit)
      .offset(offset);

    const data: QuotationListItem[] = rows.map((r) => ({
      id: r.quotation.id,
      quotationNumber: r.quotation.quotationNumber,
      quotationType: r.quotation.quotationType,
      status: r.quotation.status,
      currentRevisionNumber: r.quotation.currentRevisionNumber,
      createdAt: r.quotation.createdAt,
      updatedAt: r.quotation.updatedAt,
      customer: r.customer?.id ? r.customer : null,
      destination: r.destination?.id ? r.destination : null,
      salesperson: r.salesperson?.id ? r.salesperson : null,
      createdByUser: r.createdByUser?.id ? r.createdByUser : null,
      currentRevision: r.currentRevision?.id ? r.currentRevision : null,
    }));

    return { data, total };
  }

  /**
   * Find full quotation details with active revision, items, approvals, and activity history
   */
  async findById(id: string): Promise<QuotationDetailedView | undefined> {
    const rows = await db
      .select({
        quotation: quotations,
        customer: {
          id: customers.id,
          name: customers.name,
          companyName: customers.companyName,
          phone: customers.phone,
          email: customers.email,
          address: customers.address,
          city: customers.city,
          state: customers.state,
          pincode: customers.pincode,
        },
        destination: {
          id: customerDestinations.id,
          name: customerDestinations.name,
          address: customerDestinations.address,
          city: customerDestinations.city,
          state: customerDestinations.state,
          pincode: customerDestinations.pincode,
        },
        salesperson: {
          id: salespersons.id,
          fullName: salespersons.fullName,
          email: salespersons.email,
          phone: salespersons.phone,
        },
        createdByUser: {
          id: createdByUsers.id,
          fullName: createdByUsers.fullName,
          email: createdByUsers.email,
        },
      })
      .from(quotations)
      .leftJoin(customers, eq(quotations.customerId, customers.id))
      .leftJoin(customerDestinations, eq(quotations.destinationId, customerDestinations.id))
      .leftJoin(salespersons, eq(quotations.salespersonId, salespersons.id))
      .leftJoin(createdByUsers, eq(quotations.createdById, createdByUsers.id))
      .where(eq(quotations.id, id))
      .limit(1);

    if (!rows[0]) return undefined;

    const base = rows[0];

    // Fetch current revision
    const [currentRevisionRecord] = await db
      .select()
      .from(quotationRevisions)
      .where(
        and(
          eq(quotationRevisions.quotationId, id),
          eq(quotationRevisions.isCurrent, true)
        )
      )
      .limit(1);

    let currentRevisionWithDetails: FullQuotationRevision | null = null;
    if (currentRevisionRecord) {
      currentRevisionWithDetails = await this.loadRevisionDetails(currentRevisionRecord);
    }

    // Fetch approvals
    const approvalRows = await db
      .select({
        approval: quotationApprovals,
        requestedBy: {
          id: requestedByUsers.id,
          fullName: requestedByUsers.fullName,
          email: requestedByUsers.email,
        },
        reviewedBy: {
          id: reviewedByUsers.id,
          fullName: reviewedByUsers.fullName,
          email: reviewedByUsers.email,
        },
      })
      .from(quotationApprovals)
      .leftJoin(requestedByUsers, eq(quotationApprovals.requestedById, requestedByUsers.id))
      .leftJoin(reviewedByUsers, eq(quotationApprovals.reviewedById, reviewedByUsers.id))
      .where(eq(quotationApprovals.quotationId, id))
      .orderBy(desc(quotationApprovals.actionAt));

    const approvals = approvalRows.map((a) => ({
      ...a.approval,
      requestedBy: a.requestedBy?.id ? a.requestedBy : null,
      reviewedBy: a.reviewedBy?.id ? a.reviewedBy : null,
    }));

    // Fetch activity logs
    const activityRows = await db
      .select({
        log: quotationActivityLogs,
        user: {
          id: activityUsers.id,
          fullName: activityUsers.fullName,
          email: activityUsers.email,
        },
      })
      .from(quotationActivityLogs)
      .leftJoin(activityUsers, eq(quotationActivityLogs.userId, activityUsers.id))
      .where(eq(quotationActivityLogs.quotationId, id))
      .orderBy(desc(quotationActivityLogs.createdAt));

    const activityLogs = activityRows.map((a) => ({
      ...a.log,
      user: a.user?.id ? a.user : null,
    }));

    // Fetch attachments
    const attachments = await db
      .select()
      .from(quotationAttachments)
      .where(eq(quotationAttachments.quotationId, id))
      .orderBy(desc(quotationAttachments.createdAt));

    // Fetch linked sales order if any
    const [linkedSo] = await db
      .select({
        id: salesOrders.id,
        salesOrderNumber: salesOrders.salesOrderNumber,
        status: salesOrders.status,
        orderDate: salesOrders.orderDate,
        customerPoNumber: salesOrders.customerPoNumber,
      })
      .from(salesOrders)
      .where(eq(salesOrders.quotationId, id))
      .orderBy(desc(salesOrders.createdAt))
      .limit(1);

    // Fetch linked AMC contract if any
    const [linkedAmc] = await db
      .select({
        id: amcContracts.id,
        contractNumber: amcContracts.contractNumber,
        status: amcContracts.status,
        startDate: amcContracts.contractStartDate,
        endDate: amcContracts.contractEndDate,
      })
      .from(amcContracts)
      .where(eq(amcContracts.quotationId, id))
      .orderBy(desc(amcContracts.createdAt))
      .limit(1);

    return {
      ...base.quotation,
      customer: base.customer?.id ? base.customer : null,
      destination: base.destination?.id ? base.destination : null,
      salesperson: base.salesperson?.id ? base.salesperson : null,
      createdByUser: base.createdByUser?.id ? base.createdByUser : null,
      currentRevision: currentRevisionWithDetails,
      approvals,
      activityLogs,
      attachments,
      linkedSalesOrder: linkedSo?.id ? linkedSo : null,
      linkedAmcContract: linkedAmc?.id ? linkedAmc : null,
    };
  }

  /**
   * Find a specific historical revision by revision number with items
   */
  async findRevisionByNumber(
    quotationId: string,
    revisionNumber: number
  ): Promise<FullQuotationRevision | undefined> {
    const [rev] = await db
      .select()
      .from(quotationRevisions)
      .where(
        and(
          eq(quotationRevisions.quotationId, quotationId),
          eq(quotationRevisions.revisionNumber, revisionNumber)
        )
      )
      .limit(1);

    if (!rev) return undefined;

    return this.loadRevisionDetails(rev);
  }

  /**
   * List all revisions for a quotation
   */
  async findRevisionsList(quotationId: string): Promise<QuotationRevisionEntity[]> {
    return db
      .select()
      .from(quotationRevisions)
      .where(eq(quotationRevisions.quotationId, quotationId))
      .orderBy(desc(quotationRevisions.revisionNumber));
  }

  /**
   * Find approval history for a quotation
   */
  async findApprovals(quotationId: string) {
    const rows = await db
      .select({
        approval: quotationApprovals,
        requestedBy: {
          id: requestedByUsers.id,
          fullName: requestedByUsers.fullName,
          email: requestedByUsers.email,
        },
        reviewedBy: {
          id: reviewedByUsers.id,
          fullName: reviewedByUsers.fullName,
          email: reviewedByUsers.email,
        },
      })
      .from(quotationApprovals)
      .leftJoin(requestedByUsers, eq(quotationApprovals.requestedById, requestedByUsers.id))
      .leftJoin(reviewedByUsers, eq(quotationApprovals.reviewedById, reviewedByUsers.id))
      .where(eq(quotationApprovals.quotationId, quotationId))
      .orderBy(desc(quotationApprovals.actionAt));

    return rows.map((a) => ({
      ...a.approval,
      requestedBy: a.requestedBy?.id ? a.requestedBy : null,
      reviewedBy: a.reviewedBy?.id ? a.reviewedBy : null,
    }));
  }

  /**
   * Find activity log history for a quotation
   */
  async findActivities(quotationId: string) {
    const rows = await db
      .select({
        log: quotationActivityLogs,
        user: {
          id: activityUsers.id,
          fullName: activityUsers.fullName,
          email: activityUsers.email,
        },
      })
      .from(quotationActivityLogs)
      .leftJoin(activityUsers, eq(quotationActivityLogs.userId, activityUsers.id))
      .where(eq(quotationActivityLogs.quotationId, quotationId))
      .orderBy(desc(quotationActivityLogs.createdAt));

    return rows.map((a) => ({
      ...a.log,
      user: a.user?.id ? a.user : null,
    }));
  }
}
