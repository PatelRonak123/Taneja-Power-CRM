import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  vendorInvoices,
  vendorInvoiceItems,
  invoiceActivityLogs,
  VendorInvoiceEntity,
  NewVendorInvoiceEntity,
  VendorInvoiceItemEntity,
  NewVendorInvoiceItemEntity,
} from '../../../database/schema/invoices.js';
import { suppliers, purchaseOrders, goodsReceipts } from '../../../database/schema/procurement.js';

export interface ListVendorInvoicesQuery {
  search?: string;
  status?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  page?: number;
  limit?: number;
}

export interface VendorInvoiceWithDetails extends VendorInvoiceEntity {
  supplier?: { id: string; name: string; supplierCode: string; gstin: string | null };
  purchaseOrder?: { id: string; poNumber: string; status: string; totalAmount: string };
  goodsReceipt?: { id: string; grnNumber: string; status: string } | null;
  items: VendorInvoiceItemEntity[];
  createdByUser?: { id: string; fullName: string; email: string };
  verifiedByUser?: { id: string; fullName: string; email: string } | null;
  postedByUser?: { id: string; fullName: string; email: string } | null;
  cancelledByUser?: { id: string; fullName: string; email: string } | null;
}

export class VendorInvoiceRepository {
  async findById(id: string, tx: any = db): Promise<VendorInvoiceWithDetails | null> {
    const inv = await tx.query.vendorInvoices.findFirst({
      where: eq(vendorInvoices.id, id),
      with: {
        supplier: { columns: { id: true, name: true, supplierCode: true, gstin: true } },
        purchaseOrder: { columns: { id: true, poNumber: true, status: true, totalAmount: true } },
        goodsReceipt: { columns: { id: true, grnNumber: true, status: true } },
        items: true,
        createdByUser: { columns: { id: true, fullName: true, email: true } },
        verifiedByUser: { columns: { id: true, fullName: true, email: true } },
        postedByUser: { columns: { id: true, fullName: true, email: true } },
        cancelledByUser: { columns: { id: true, fullName: true, email: true } },
      },
    });
    return (inv as VendorInvoiceWithDetails) || null;
  }

  async findBySupplierAndInvoiceNumber(
    supplierId: string,
    vendorInvoiceNumber: string,
    tx: any = db
  ): Promise<VendorInvoiceEntity | null> {
    const inv = await tx.query.vendorInvoices.findFirst({
      where: and(
        eq(vendorInvoices.supplierId, supplierId),
        eq(vendorInvoices.vendorInvoiceNumber, vendorInvoiceNumber)
      ),
    });
    return inv || null;
  }

  async find(query: ListVendorInvoicesQuery, tx: any = db): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(query.limit || 10, 100));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query.status) conditions.push(eq(vendorInvoices.status, query.status));
    if (query.supplierId) conditions.push(eq(vendorInvoices.supplierId, query.supplierId));
    if (query.purchaseOrderId) conditions.push(eq(vendorInvoices.purchaseOrderId, query.purchaseOrderId));
    if (query.search?.trim()) {
      conditions.push(
        sql`${vendorInvoices.vendorInvoiceNumber} ILIKE ${`%${query.search.trim()}%`}`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      tx.query.vendorInvoices.findMany({
        where: whereClause,
        orderBy: desc(vendorInvoices.createdAt),
        limit,
        offset,
        with: {
          supplier: { columns: { id: true, name: true, supplierCode: true } },
          purchaseOrder: { columns: { id: true, poNumber: true } },
          goodsReceipt: { columns: { id: true, grnNumber: true } },
          items: true,
          createdByUser: { columns: { id: true, fullName: true } },
        },
      }),
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(vendorInvoices)
        .where(whereClause),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  }

  /**
   * Get already invoiced quantities for PO items (excluding CANCELLED and REJECTED invoices).
   */
  async getInvoicedQuantitiesByPurchaseOrderId(poId: string, tx: any = db): Promise<Map<string, number>> {
    const rows = await tx.execute(sql`
      SELECT
        vii.purchase_order_item_id,
        COALESCE(SUM(vii.invoiced_quantity), 0) AS total_invoiced
      FROM vendor_invoice_items vii
      JOIN vendor_invoices vi ON vi.id = vii.vendor_invoice_id
      WHERE vi.purchase_order_id = ${poId}
        AND vi.status NOT IN ('CANCELLED', 'REJECTED')
      GROUP BY vii.purchase_order_item_id
    `);

    const result = new Map<string, number>();
    for (const row of rows.rows || rows) {
      result.set(row.purchase_order_item_id, Number(row.total_invoiced || 0));
    }
    return result;
  }

  async insertInvoice(data: NewVendorInvoiceEntity, tx: any = db): Promise<VendorInvoiceEntity> {
    const [inv] = await tx.insert(vendorInvoices).values(data).returning();
    return inv;
  }

  async insertItems(items: NewVendorInvoiceItemEntity[], tx: any = db): Promise<VendorInvoiceItemEntity[]> {
    if (items.length === 0) return [];
    return tx.insert(vendorInvoiceItems).values(items).returning();
  }

  async updateStatus(
    id: string,
    status: string,
    extraFields: Partial<NewVendorInvoiceEntity> = {},
    tx: any = db
  ): Promise<VendorInvoiceEntity | null> {
    const [updated] = await tx
      .update(vendorInvoices)
      .set({ status, updatedAt: new Date(), ...extraFields })
      .where(eq(vendorInvoices.id, id))
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
      invoiceType: 'VENDOR_INVOICE',
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
