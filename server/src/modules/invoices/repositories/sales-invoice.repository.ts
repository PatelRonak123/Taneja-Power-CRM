import { eq, ilike, and, desc, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  salesInvoices,
  salesInvoiceItems,
  invoiceActivityLogs,
  SalesInvoiceEntity,
  NewSalesInvoiceEntity,
  SalesInvoiceItemEntity,
  NewSalesInvoiceItemEntity,
} from '../../../database/schema/invoices.js';
import { salesOrders, salesOrderItems } from '../../../database/schema/sales-orders.js';

export interface ListSalesInvoicesQuery {
  search?: string;
  status?: string;
  customerId?: string;
  salesOrderId?: string;
  page?: number;
  limit?: number;
}

export interface SalesInvoiceWithDetails extends SalesInvoiceEntity {
  salesOrder?: { id: string; salesOrderNumber: string; status: string };
  customer?: { id: string; name: string; companyName: string | null; email: string | null; phone: string | null };
  items: SalesInvoiceItemEntity[];
  createdByUser?: { id: string; fullName: string; email: string };
  issuedByUser?: { id: string; fullName: string; email: string } | null;
  cancelledByUser?: { id: string; fullName: string; email: string } | null;
}

export class SalesInvoiceRepository {
  async findById(id: string, tx: any = db): Promise<SalesInvoiceWithDetails | null> {
    const inv = await tx.query.salesInvoices.findFirst({
      where: eq(salesInvoices.id, id),
      with: {
        salesOrder: { columns: { id: true, salesOrderNumber: true, status: true } },
        customer: { columns: { id: true, name: true, companyName: true, email: true, phone: true } },
        items: { orderBy: (items: any, { asc }: any) => [asc(items.sortOrder)] },
        createdByUser: { columns: { id: true, fullName: true, email: true } },
        issuedByUser: { columns: { id: true, fullName: true, email: true } },
        cancelledByUser: { columns: { id: true, fullName: true, email: true } },
      },
    });
    return (inv as SalesInvoiceWithDetails) || null;
  }

  async find(query: ListSalesInvoicesQuery, tx: any = db): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(query.limit || 10, 500));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query.status) conditions.push(eq(salesInvoices.status, query.status));
    if (query.customerId) conditions.push(eq(salesInvoices.customerId, query.customerId));
    if (query.salesOrderId) conditions.push(eq(salesInvoices.salesOrderId, query.salesOrderId));
    if (query.search?.trim()) {
      conditions.push(
        sql`(${salesInvoices.invoiceNumber} ILIKE ${`%${query.search.trim()}%`} OR ${salesInvoices.customerName} ILIKE ${`%${query.search.trim()}%`})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      tx.query.salesInvoices.findMany({
        where: whereClause,
        orderBy: desc(salesInvoices.createdAt),
        limit,
        offset,
        with: {
          salesOrder: { columns: { id: true, salesOrderNumber: true } },
          customer: { columns: { id: true, name: true, companyName: true } },
          items: true,
          createdByUser: { columns: { id: true, fullName: true } },
        },
      }),
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(salesInvoices)
        .where(whereClause),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  }

  /**
   * Calculate already invoiced quantities for each item in a Sales Order (excluding CANCELLED invoices).
   * Returns a map of salesOrderItemId -> total invoiced quantity.
   */
  async getInvoicedQuantitiesBySalesOrderId(salesOrderId: string, tx: any = db): Promise<Map<string, number>> {
    const rows = await tx.execute(sql`
      SELECT
        sii.sales_order_item_id,
        COALESCE(SUM(sii.quantity), 0) AS total_invoiced
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON si.id = sii.sales_invoice_id
      WHERE si.sales_order_id = ${salesOrderId}
        AND si.status != 'CANCELLED'
      GROUP BY sii.sales_order_item_id
    `);

    const result = new Map<string, number>();
    for (const row of rows.rows || rows) {
      result.set(row.sales_order_item_id, Number(row.total_invoiced || 0));
    }
    return result;
  }

  async insertInvoice(data: NewSalesInvoiceEntity, tx: any = db): Promise<SalesInvoiceEntity> {
    const [inv] = await tx.insert(salesInvoices).values(data).returning();
    return inv;
  }

  async insertItems(items: NewSalesInvoiceItemEntity[], tx: any = db): Promise<SalesInvoiceItemEntity[]> {
    if (items.length === 0) return [];
    return tx.insert(salesInvoiceItems).values(items).returning();
  }

  async updateStatus(
    id: string,
    status: string,
    extraFields: Partial<NewSalesInvoiceEntity> = {},
    tx: any = db
  ): Promise<SalesInvoiceEntity | null> {
    const [updated] = await tx
      .update(salesInvoices)
      .set({ status, updatedAt: new Date(), ...extraFields })
      .where(eq(salesInvoices.id, id))
      .returning();
    return updated || null;
  }

  async logActivity(
    invoiceId: string,
    action: string,
    userId: string,
    details?: string,
    tx: any = db
  ): Promise<void> {
    await tx.insert(invoiceActivityLogs).values({
      invoiceType: 'SALES_INVOICE',
      invoiceId,
      action,
      userId,
      details,
    });
  }

  async getActivityLogs(invoiceId: string, tx: any = db): Promise<any[]> {
    return tx.query.invoiceActivityLogs.findMany({
      where: eq(invoiceActivityLogs.invoiceId, invoiceId),
      orderBy: desc(invoiceActivityLogs.createdAt),
      with: {
        user: { columns: { id: true, fullName: true, email: true } },
      },
    });
  }
}
