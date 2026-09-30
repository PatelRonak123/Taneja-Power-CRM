import { eq, ilike, or, and, count, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
  PurchaseOrderEntity,
  NewPurchaseOrderEntity,
  PurchaseOrderItemEntity,
  NewPurchaseOrderItemEntity,
  SupplierEntity,
} from '../../../database/schema/procurement.js';
import { users } from '../../../database/schema/users.js';

export interface ListPurchaseOrdersQuery {
  search?: string;
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseOrderWithDetails extends PurchaseOrderEntity {
  supplier: SupplierEntity;
  items: PurchaseOrderItemEntity[];
  createdByUser?: { id: string; name: string; email: string };
  approvedByUser?: { id: string; name: string; email: string } | null;
}

export class PurchaseOrderRepository {
  async findById(id: string, tx: any = db): Promise<PurchaseOrderWithDetails | null> {
    const po = await tx.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, id),
      with: {
        supplier: true,
        items: true,
        createdByUser: {
          columns: { id: true, fullName: true, email: true },
        },
        approvedByUser: {
          columns: { id: true, fullName: true, email: true },
        },
      },
    });

    return (po as PurchaseOrderWithDetails) || null;
  }

  async findByPoNumber(poNumber: string, tx: any = db): Promise<PurchaseOrderEntity | null> {
    const results = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, poNumber));
    return results[0] || null;
  }

  async find(query: ListPurchaseOrdersQuery, tx: any = db): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(purchaseOrders.status, query.status));
    }

    if (query.supplierId) {
      conditions.push(eq(purchaseOrders.supplierId, query.supplierId));
    }

    if (query.startDate) {
      conditions.push(gte(purchaseOrders.orderDate, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(purchaseOrders.orderDate, new Date(query.endDate)));
    }

    if (query.search && query.search.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(ilike(purchaseOrders.poNumber, searchPattern));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      tx.query.purchaseOrders.findMany({
        where: whereClause,
        orderBy: desc(purchaseOrders.createdAt),
        limit,
        offset,
        with: {
          supplier: true,
          items: true,
          createdByUser: {
            columns: { id: true, fullName: true, email: true },
          },
          approvedByUser: {
            columns: { id: true, fullName: true, email: true },
          },
        },
      }),
      tx
        .select({ total: count() })
        .from(purchaseOrders)
        .where(whereClause),
    ]);

    return {
      data,
      total: Number(totalResult[0]?.total || 0),
    };
  }

  async create(
    poData: NewPurchaseOrderEntity,
    itemsData: Array<Omit<NewPurchaseOrderItemEntity, 'purchaseOrderId'>>,
    tx: any = db
  ): Promise<PurchaseOrderWithDetails> {
    const [po] = await tx.insert(purchaseOrders).values(poData).returning();

    const itemsToInsert = itemsData.map((item) => ({
      ...item,
      purchaseOrderId: po.id,
    }));

    const insertedItems = await tx.insert(purchaseOrderItems).values(itemsToInsert).returning();

    return this.findById(po.id, tx) as Promise<PurchaseOrderWithDetails>;
  }

  async update(id: string, poData: Partial<NewPurchaseOrderEntity>, tx: any = db): Promise<PurchaseOrderEntity> {
    const [result] = await tx
      .update(purchaseOrders)
      .set({
        ...poData,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return result;
  }

  async updateItems(
    poId: string,
    itemsData: Array<Omit<NewPurchaseOrderItemEntity, 'purchaseOrderId'>>,
    tx: any = db
  ): Promise<PurchaseOrderItemEntity[]> {
    await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, poId));

    const itemsToInsert = itemsData.map((item) => ({
      ...item,
      purchaseOrderId: poId,
    }));

    return tx.insert(purchaseOrderItems).values(itemsToInsert).returning();
  }

  async updateItemReceivedQuantity(itemId: string, receivedQuantity: number, tx: any = db): Promise<void> {
    await tx
      .update(purchaseOrderItems)
      .set({
        receivedQuantity,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrderItems.id, itemId));
  }

  /**
   * Concurrency-safe lock for PO
   */
  async lockPoForUpdate(id: string, tx: any): Promise<PurchaseOrderEntity> {
    const result = await tx.execute(
      sql`SELECT id, po_number AS "poNumber", supplier_id AS "supplierId", order_date AS "orderDate",
                 expected_delivery_date AS "expectedDeliveryDate", status, subtotal, tax_amount AS "taxAmount",
                 total_amount AS "totalAmount", notes, terms_and_conditions AS "termsAndConditions",
                 created_by AS "createdBy", approved_by AS "approvedBy", approved_at AS "approvedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM purchase_orders
          WHERE id = ${id}
          FOR UPDATE`
    );

    const rows = result.rows || result;
    if (!rows || rows.length === 0) {
      throw new Error(`Purchase order ${id} not found for lock`);
    }

    return rows[0] as PurchaseOrderEntity;
  }

  /**
   * Concurrency-safe lock for PO items
   */
  async lockPoItemsForUpdate(poId: string, tx: any): Promise<PurchaseOrderItemEntity[]> {
    const result = await tx.execute(
      sql`SELECT id, purchase_order_id AS "purchaseOrderId", product_id AS "productId",
                 product_name_snapshot AS "productNameSnapshot", sku_snapshot AS "skuSnapshot",
                 quantity, unit_cost AS "unitCost", tax_rate AS "taxRate", tax_amount AS "taxAmount",
                 line_total AS "lineTotal", received_quantity AS "receivedQuantity",
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM purchase_order_items
          WHERE purchase_order_id = ${poId}
          ORDER BY id
          FOR UPDATE`
    );

    const rows = result.rows || result;
    return (rows || []) as PurchaseOrderItemEntity[];
  }
}
