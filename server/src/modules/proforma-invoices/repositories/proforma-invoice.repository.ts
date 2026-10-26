import { eq, desc, and, sql, or, gte, lte } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  proformaInvoices,
  proformaInvoiceItems,
  NewProformaInvoiceEntity,
  NewProformaInvoiceItemEntity,
} from '../../../database/schema/proforma-invoices.js';
import { salesOrders } from '../../../database/schema/sales-orders.js';
import { customers } from '../../../database/schema/customers.js';
import { users } from '../../../database/schema/users.js';
import { ListProformaInvoicesQuery } from '../types/proforma-invoice.types.js';

export class ProformaInvoiceRepository {
  /**
   * Insert a new Pro Forma Invoice master record and its line items inside a transaction
   */
  async insertProformaInvoice(
    header: NewProformaInvoiceEntity,
    items: Omit<NewProformaInvoiceItemEntity, 'proformaInvoiceId'>[],
    txClient: any = db
  ): Promise<any> {
    const [insertedHeader] = await txClient
      .insert(proformaInvoices)
      .values(header)
      .returning();

    if (items.length > 0) {
      const itemsToInsert = items.map((it) => ({
        ...it,
        proformaInvoiceId: insertedHeader.id,
      }));
      await txClient.insert(proformaInvoiceItems).values(itemsToInsert);
    }

    return this.findById(insertedHeader.id, txClient);
  }

  /**
   * Find a Pro Forma Invoice by ID with line items and relations
   */
  async findById(id: string, txClient: any = db): Promise<any | null> {
    const [row] = await txClient
      .select({
        pi: proformaInvoices,
        customerName: customers.name,
        customerCompany: customers.companyName,
        customerPhone: customers.phone,
        customerEmail: customers.email,
        salesOrderNumber: salesOrders.salesOrderNumber,
        salesOrderStatus: salesOrders.status,
        customerPoNumber: salesOrders.customerPoNumber,
        customerPoDate: salesOrders.customerPoDate,
        createdByName: users.fullName,
      })
      .from(proformaInvoices)
      .leftJoin(customers, eq(customers.id, proformaInvoices.customerId))
      .leftJoin(salesOrders, eq(salesOrders.id, proformaInvoices.salesOrderId))
      .leftJoin(users, eq(users.id, proformaInvoices.createdBy))
      .where(eq(proformaInvoices.id, id));

    if (!row) return null;

    // Fetch line items
    const items = await txClient
      .select()
      .from(proformaInvoiceItems)
      .where(eq(proformaInvoiceItems.proformaInvoiceId, id))
      .orderBy(proformaInvoiceItems.sortOrder);

    // Fetch issuedBy user if present
    let issuedByName: string | null = null;
    if (row.pi.issuedBy) {
      const [issuedUser] = await txClient
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, row.pi.issuedBy));
      issuedByName = issuedUser?.fullName || null;
    }

    return {
      ...row.pi,
      customer: {
        id: row.pi.customerId,
        name: row.customerName,
        companyName: row.customerCompany,
        phone: row.customerPhone,
        email: row.customerEmail,
      },
      salesOrder: {
        id: row.pi.salesOrderId,
        salesOrderNumber: row.salesOrderNumber,
        status: row.salesOrderStatus,
        customerPoNumber: row.customerPoNumber,
        customerPoDate: row.customerPoDate,
      },
      createdByUser: {
        id: row.pi.createdBy,
        fullName: row.createdByName,
      },
      issuedByUser: row.pi.issuedBy
        ? {
            id: row.pi.issuedBy,
            fullName: issuedByName,
          }
        : null,
      items,
    };
  }

  /**
   * Find all Pro Forma Invoices linked to a specific Sales Order
   */
  async findBySalesOrderId(salesOrderId: string, txClient: any = db): Promise<any[]> {
    return txClient
      .select()
      .from(proformaInvoices)
      .where(eq(proformaInvoices.salesOrderId, salesOrderId))
      .orderBy(desc(proformaInvoices.createdAt));
  }

  /**
   * List Pro Forma Invoices with pagination, filters, and totals
   */
  async list(query: ListProformaInvoicesQuery, txClient: any = db): Promise<{
    data: any[];
    total: number;
    metrics: {
      totalAmount: number;
      totalAdvanceRequested: number;
      totalPaid: number;
      totalCount: number;
      issuedCount: number;
      paidCount: number;
    };
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(query.limit || 20, 100));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (query.status) {
      conditions.push(eq(proformaInvoices.status, query.status));
    }
    if (query.customerId) {
      conditions.push(eq(proformaInvoices.customerId, query.customerId));
    }
    if (query.salesOrderId) {
      conditions.push(eq(proformaInvoices.salesOrderId, query.salesOrderId));
    }
    if (query.fromDate) {
      conditions.push(gte(proformaInvoices.proformaInvoiceDate, new Date(query.fromDate)));
    }
    if (query.toDate) {
      conditions.push(lte(proformaInvoices.proformaInvoiceDate, new Date(query.toDate)));
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          sql`${proformaInvoices.proformaInvoiceNumber} ILIKE ${term}`,
          sql`${proformaInvoices.customerName} ILIKE ${term}`,
          sql`${customers.companyName} ILIKE ${term}`,
          sql`${salesOrders.salesOrderNumber} ILIKE ${term}`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRes, metricsRes] = await Promise.all([
      txClient
        .select({
          pi: proformaInvoices,
          customerName: customers.name,
          customerCompany: customers.companyName,
          salesOrderNumber: salesOrders.salesOrderNumber,
          createdByName: users.fullName,
        })
        .from(proformaInvoices)
        .leftJoin(customers, eq(customers.id, proformaInvoices.customerId))
        .leftJoin(salesOrders, eq(salesOrders.id, proformaInvoices.salesOrderId))
        .leftJoin(users, eq(users.id, proformaInvoices.createdBy))
        .where(whereClause)
        .orderBy(desc(proformaInvoices.proformaInvoiceDate))
        .limit(limit)
        .offset(offset),

      txClient
        .select({ count: sql<number>`count(*)::int` })
        .from(proformaInvoices)
        .leftJoin(customers, eq(customers.id, proformaInvoices.customerId))
        .leftJoin(salesOrders, eq(salesOrders.id, proformaInvoices.salesOrderId))
        .where(whereClause),

      txClient
        .select({
          totalAmount: sql<string>`coalesce(sum(${proformaInvoices.totalAmount}), 0)`,
          totalAdvanceRequested: sql<string>`coalesce(sum(${proformaInvoices.advanceAmountRequested}), 0)`,
          totalPaid: sql<string>`coalesce(sum(${proformaInvoices.paidAmount}), 0)`,
          totalCount: sql<number>`count(*)::int`,
          issuedCount: sql<number>`count(case when ${proformaInvoices.status} in ('ISSUED', 'PARTIALLY_PAID', 'PAID') then 1 end)::int`,
          paidCount: sql<number>`count(case when ${proformaInvoices.status} = 'PAID' then 1 end)::int`,
        })
        .from(proformaInvoices)
        .leftJoin(customers, eq(customers.id, proformaInvoices.customerId))
        .leftJoin(salesOrders, eq(salesOrders.id, proformaInvoices.salesOrderId))
        .where(whereClause),
    ]);

    const formattedData = rows.map((r: any) => ({
      ...r.pi,
      customer: {
        id: r.pi.customerId,
        name: r.customerName,
        companyName: r.customerCompany,
      },
      salesOrder: {
        id: r.pi.salesOrderId,
        salesOrderNumber: r.salesOrderNumber,
      },
      createdByUser: {
        id: r.pi.createdBy,
        fullName: r.createdByName,
      },
    }));

    const metricsRow = metricsRes[0];

    return {
      data: formattedData,
      total: countRes[0]?.count || 0,
      metrics: {
        totalAmount: Number(metricsRow?.totalAmount || 0),
        totalAdvanceRequested: Number(metricsRow?.totalAdvanceRequested || 0),
        totalPaid: Number(metricsRow?.totalPaid || 0),
        totalCount: metricsRow?.totalCount || 0,
        issuedCount: metricsRow?.issuedCount || 0,
        paidCount: metricsRow?.paidCount || 0,
      },
    };
  }

  /**
   * Update Pro Forma Invoice fields
   */
  async update(id: string, updates: Partial<NewProformaInvoiceEntity>, txClient: any = db): Promise<any> {
    await txClient
      .update(proformaInvoices)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(proformaInvoices.id, id));

    return this.findById(id, txClient);
  }
}
