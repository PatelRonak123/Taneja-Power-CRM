import { db } from '../../../database/db.js';
import { followUps, FollowUpEntity, NewFollowUpEntity } from '../../../database/schema/follow-ups.js';
import { users } from '../../../database/schema/users.js';
import { customers } from '../../../database/schema/customers.js';
import { leads } from '../../../database/schema/leads.js';
import { quotations } from '../../../database/schema/quotations.js';
import { amcContracts } from '../../../database/schema/amc-contracts.js';
import { eq, and, or, desc, sql, ilike, gte, lte, lt, gt } from 'drizzle-orm';
import { aliasedTable } from 'drizzle-orm';

const assignedUser = aliasedTable(users, 'assigned_user');
const createdByUser = aliasedTable(users, 'created_by_user');
const completedByUser = aliasedTable(users, 'completed_by_user');
const dealRecord = aliasedTable(leads, 'deal_record');

export interface FollowUpFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tab?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
  type?: string;
  priority?: string;
  assignedTo?: string;
  createdBy?: string;
  customerId?: string;
  leadId?: string;
  dealId?: string;
  quotationId?: string;
  amcContractId?: string;
  startDate?: string;
  endDate?: string;
  // Scoping options for RBAC
  scopedAssignedTo?: string;
  scopedLeadIds?: string[];
  scopedQuotationIds?: string[];
  scopedCustomerIds?: string[];
}

export interface FollowUpWithRelations extends FollowUpEntity {
  assignedEmployee?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    designation: string | null;
    workType: string;
  } | null;
  creator?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  completer?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  customer?: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  lead?: {
    id: string;
    leadCode: string;
    customerName: string;
    companyName: string;
    status: string;
  } | null;
  deal?: {
    id: string;
    leadCode: string;
    customerName: string;
    companyName: string;
    status: string;
    expectedValue: string | null;
  } | null;
  quotation?: {
    id: string;
    quotationNumber: string;
    status: string;
    quotationType: string;
  } | null;
  amcContract?: {
    id: string;
    contractNumber: string;
    status: string;
    amcPlan: string;
  } | null;
}

export class FollowUpRepository {
  /**
   * Safely generate sequential follow-up number: FU-000001, FU-000002...
   */
  async generateFollowUpNumber(): Promise<string> {
    const [latest] = await db
      .select({ followUpNumber: followUps.followUpNumber })
      .from(followUps)
      .orderBy(desc(followUps.createdAt))
      .limit(1);

    let nextNumber = 1;
    if (latest && latest.followUpNumber) {
      const match = latest.followUpNumber.match(/FU-(\d+)/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const formatted = `FU-${String(nextNumber).padStart(6, '0')}`;
    // Check collision just in case
    const [existing] = await db
      .select({ id: followUps.id })
      .from(followUps)
      .where(eq(followUps.followUpNumber, formatted))
      .limit(1);

    if (existing) {
      const randomFallback = `FU-${Date.now().toString().slice(-6)}`;
      return randomFallback;
    }

    return formatted;
  }

  /**
   * Find single follow-up by ID with full relations
   */
  async findById(id: string): Promise<FollowUpWithRelations | null> {
    const rows = await db
      .select({
        followUp: followUps,
        assignedUser: {
          id: assignedUser.id,
          fullName: assignedUser.fullName,
          email: assignedUser.email,
          phone: assignedUser.phone,
          designation: assignedUser.designation,
          workType: assignedUser.workType,
        },
        createdByUser: {
          id: createdByUser.id,
          fullName: createdByUser.fullName,
          email: createdByUser.email,
        },
        completedByUser: {
          id: completedByUser.id,
          fullName: completedByUser.fullName,
          email: completedByUser.email,
        },
        customer: {
          id: customers.id,
          name: customers.name,
          companyName: customers.companyName,
          phone: customers.phone,
          email: customers.email,
        },
        lead: {
          id: leads.id,
          leadCode: leads.leadCode,
          customerName: leads.customerName,
          companyName: leads.companyName,
          status: leads.status,
        },
        deal: {
          id: dealRecord.id,
          leadCode: dealRecord.leadCode,
          customerName: dealRecord.customerName,
          companyName: dealRecord.companyName,
          status: dealRecord.status,
          expectedValue: dealRecord.expectedValue,
        },
        quotation: {
          id: quotations.id,
          quotationNumber: quotations.quotationNumber,
          status: quotations.status,
          quotationType: quotations.quotationType,
        },
        amcContract: {
          id: amcContracts.id,
          contractNumber: amcContracts.contractNumber,
          status: amcContracts.status,
          amcPlan: amcContracts.amcPlan,
        },
      })
      .from(followUps)
      .leftJoin(assignedUser, eq(followUps.assignedTo, assignedUser.id))
      .leftJoin(createdByUser, eq(followUps.createdBy, createdByUser.id))
      .leftJoin(completedByUser, eq(followUps.completedBy, completedByUser.id))
      .leftJoin(customers, eq(followUps.customerId, customers.id))
      .leftJoin(leads, eq(followUps.leadId, leads.id))
      .leftJoin(dealRecord, eq(followUps.dealId, dealRecord.id))
      .leftJoin(quotations, eq(followUps.quotationId, quotations.id))
      .leftJoin(amcContracts, eq(followUps.amcContractId, amcContracts.id))
      .where(eq(followUps.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      ...row.followUp,
      assignedEmployee: row.assignedUser?.id ? row.assignedUser : null,
      creator: row.createdByUser?.id ? row.createdByUser : null,
      completer: row.completedByUser?.id ? row.completedByUser : null,
      customer: row.customer?.id ? row.customer : null,
      lead: row.lead?.id ? row.lead : null,
      deal: row.deal?.id ? row.deal : null,
      quotation: row.quotation?.id ? row.quotation : null,
      amcContract: row.amcContract?.id ? row.amcContract : null,
    };
  }

  /**
   * Find all follow-ups matching filters, pagination, and RBAC scoping
   */
  async findAll(options: FollowUpFilterOptions) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    const conditions: any[] = [];

    // Basic entity filters
    if (options.customerId) {
      conditions.push(eq(followUps.customerId, options.customerId));
    }
    if (options.leadId) {
      conditions.push(eq(followUps.leadId, options.leadId));
    }
    if (options.dealId) {
      conditions.push(eq(followUps.dealId, options.dealId));
    }
    if (options.quotationId) {
      conditions.push(eq(followUps.quotationId, options.quotationId));
    }
    if (options.amcContractId) {
      conditions.push(eq(followUps.amcContractId, options.amcContractId));
    }
    if (options.type && options.type !== 'ALL') {
      conditions.push(eq(followUps.type, options.type));
    }
    if (options.priority && options.priority !== 'ALL') {
      conditions.push(eq(followUps.priority, options.priority));
    }
    if (options.assignedTo && options.assignedTo !== 'ALL') {
      conditions.push(eq(followUps.assignedTo, options.assignedTo));
    }
    if (options.createdBy) {
      conditions.push(eq(followUps.createdBy, options.createdBy));
    }

    // Date range
    if (options.startDate) {
      conditions.push(gte(followUps.scheduledDate, options.startDate));
    }
    if (options.endDate) {
      conditions.push(lte(followUps.scheduledDate, options.endDate));
    }

    // Status or Tab filtering
    const effectiveTab = options.tab || (options.status?.toLowerCase() as any);
    if (effectiveTab === 'today') {
      conditions.push(
        and(
          eq(followUps.status, 'PENDING'),
          eq(followUps.scheduledDate, todayDateStr)
        )
      );
    } else if (effectiveTab === 'upcoming') {
      conditions.push(
        and(
          eq(followUps.status, 'PENDING'),
          gt(followUps.scheduledDate, todayDateStr)
        )
      );
    } else if (effectiveTab === 'overdue') {
      conditions.push(
        and(
          eq(followUps.status, 'PENDING'),
          lt(followUps.scheduledDate, todayDateStr)
        )
      );
    } else if (effectiveTab === 'completed') {
      conditions.push(eq(followUps.status, 'COMPLETED'));
    } else if (options.status && options.status !== 'ALL') {
      if (options.status === 'OVERDUE') {
        conditions.push(
          and(
            eq(followUps.status, 'PENDING'),
            lt(followUps.scheduledDate, todayDateStr)
          )
        );
      } else {
        conditions.push(eq(followUps.status, options.status));
      }
    }

    // Search query: follow-up number, title, notes, customer name, lead customerName
    if (options.search && options.search.trim().length > 0) {
      const q = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(followUps.followUpNumber, q),
          ilike(followUps.title, q),
          ilike(followUps.description, q),
          ilike(customers.name, q),
          ilike(customers.companyName, q),
          ilike(leads.customerName, q),
          ilike(leads.companyName, q),
          ilike(quotations.quotationNumber, q),
          ilike(amcContracts.contractNumber, q)
        )
      );
    }

    // RBAC Scoping (For non-admin/management sales/service reps)
    if (options.scopedAssignedTo) {
      const orClauses: any[] = [
        eq(followUps.assignedTo, options.scopedAssignedTo),
        eq(followUps.createdBy, options.scopedAssignedTo),
      ];
      if (options.scopedLeadIds && options.scopedLeadIds.length > 0) {
        orClauses.push(
          sql`${followUps.leadId} IN ${options.scopedLeadIds}`,
          sql`${followUps.dealId} IN ${options.scopedLeadIds}`
        );
      }
      if (options.scopedQuotationIds && options.scopedQuotationIds.length > 0) {
        orClauses.push(sql`${followUps.quotationId} IN ${options.scopedQuotationIds}`);
      }
      conditions.push(or(...orClauses));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const [countResult] = await db
      .select({ count: sql<number>`count(distinct ${followUps.id})::int` })
      .from(followUps)
      .leftJoin(customers, eq(followUps.customerId, customers.id))
      .leftJoin(leads, eq(followUps.leadId, leads.id))
      .leftJoin(quotations, eq(followUps.quotationId, quotations.id))
      .leftJoin(amcContracts, eq(followUps.amcContractId, amcContracts.id))
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Data query with relations
    const rows = await db
      .select({
        followUp: followUps,
        assignedUser: {
          id: assignedUser.id,
          fullName: assignedUser.fullName,
          email: assignedUser.email,
          phone: assignedUser.phone,
          designation: assignedUser.designation,
          workType: assignedUser.workType,
        },
        createdByUser: {
          id: createdByUser.id,
          fullName: createdByUser.fullName,
          email: createdByUser.email,
        },
        completedByUser: {
          id: completedByUser.id,
          fullName: completedByUser.fullName,
          email: completedByUser.email,
        },
        customer: {
          id: customers.id,
          name: customers.name,
          companyName: customers.companyName,
          phone: customers.phone,
          email: customers.email,
        },
        lead: {
          id: leads.id,
          leadCode: leads.leadCode,
          customerName: leads.customerName,
          companyName: leads.companyName,
          status: leads.status,
        },
        deal: {
          id: dealRecord.id,
          leadCode: dealRecord.leadCode,
          customerName: dealRecord.customerName,
          companyName: dealRecord.companyName,
          status: dealRecord.status,
          expectedValue: dealRecord.expectedValue,
        },
        quotation: {
          id: quotations.id,
          quotationNumber: quotations.quotationNumber,
          status: quotations.status,
          quotationType: quotations.quotationType,
        },
        amcContract: {
          id: amcContracts.id,
          contractNumber: amcContracts.contractNumber,
          status: amcContracts.status,
          amcPlan: amcContracts.amcPlan,
        },
      })
      .from(followUps)
      .leftJoin(assignedUser, eq(followUps.assignedTo, assignedUser.id))
      .leftJoin(createdByUser, eq(followUps.createdBy, createdByUser.id))
      .leftJoin(completedByUser, eq(followUps.completedBy, completedByUser.id))
      .leftJoin(customers, eq(followUps.customerId, customers.id))
      .leftJoin(leads, eq(followUps.leadId, leads.id))
      .leftJoin(dealRecord, eq(followUps.dealId, dealRecord.id))
      .leftJoin(quotations, eq(followUps.quotationId, quotations.id))
      .leftJoin(amcContracts, eq(followUps.amcContractId, amcContracts.id))
      .where(whereClause)
      .orderBy(
        sql`CASE WHEN ${followUps.status} = 'PENDING' AND ${followUps.scheduledDate} < ${todayDateStr} THEN 0
                 WHEN ${followUps.status} = 'PENDING' AND ${followUps.scheduledDate} = ${todayDateStr} THEN 1
                 WHEN ${followUps.status} = 'PENDING' THEN 2
                 ELSE 3 END ASC`,
        desc(followUps.scheduledDate),
        desc(followUps.scheduledTime),
        desc(followUps.createdAt)
      )
      .limit(limit)
      .offset(offset);

    const data: FollowUpWithRelations[] = rows.map((row) => ({
      ...row.followUp,
      assignedEmployee: row.assignedUser?.id ? row.assignedUser : null,
      creator: row.createdByUser?.id ? row.createdByUser : null,
      completer: row.completedByUser?.id ? row.completedByUser : null,
      customer: row.customer?.id ? row.customer : null,
      lead: row.lead?.id ? row.lead : null,
      deal: row.deal?.id ? row.deal : null,
      quotation: row.quotation?.id ? row.quotation : null,
      amcContract: row.amcContract?.id ? row.amcContract : null,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get metrics/counts for dashboard widgets
   */
  async getMetrics(scopedAssignedTo?: string) {
    const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    const baseConditions: any[] = [];
    if (scopedAssignedTo) {
      baseConditions.push(
        or(
          eq(followUps.assignedTo, scopedAssignedTo),
          eq(followUps.createdBy, scopedAssignedTo)
        )
      );
    }

    const whereBase = baseConditions.length > 0 ? and(...baseConditions) : undefined;

    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        today: sql<number>`count(*) filter (where ${followUps.status} = 'PENDING' and ${followUps.scheduledDate} = ${todayDateStr})::int`,
        overdue: sql<number>`count(*) filter (where ${followUps.status} = 'PENDING' and ${followUps.scheduledDate} < ${todayDateStr})::int`,
        upcoming: sql<number>`count(*) filter (where ${followUps.status} = 'PENDING' and ${followUps.scheduledDate} > ${todayDateStr})::int`,
        completedToday: sql<number>`count(*) filter (where ${followUps.status} = 'COMPLETED' and to_char(${followUps.completedAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') = ${todayDateStr})::int`,
        totalCompleted: sql<number>`count(*) filter (where ${followUps.status} = 'COMPLETED')::int`,
        totalCancelled: sql<number>`count(*) filter (where ${followUps.status} = 'CANCELLED')::int`,
        pendingTotal: sql<number>`count(*) filter (where ${followUps.status} = 'PENDING')::int`,
      })
      .from(followUps)
      .where(whereBase);

    return {
      total: counts?.total ?? 0,
      today: counts?.today ?? 0,
      overdue: counts?.overdue ?? 0,
      upcoming: counts?.upcoming ?? 0,
      completedToday: counts?.completedToday ?? 0,
      totalCompleted: counts?.totalCompleted ?? 0,
      totalCancelled: counts?.totalCancelled ?? 0,
      pendingTotal: counts?.pendingTotal ?? 0,
    };
  }

  /**
   * Insert new follow up
   */
  async create(data: NewFollowUpEntity): Promise<FollowUpEntity> {
    const [inserted] = await db.insert(followUps).values(data).returning();
    return inserted;
  }

  /**
   * Update follow up record
   */
  async update(id: string, updates: Partial<NewFollowUpEntity>): Promise<FollowUpEntity | null> {
    const [updated] = await db
      .update(followUps)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, id))
      .returning();
    return updated || null;
  }

  /**
   * Delete follow up record
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(followUps).where(eq(followUps.id, id)).returning();
    return result.length > 0;
  }
}
