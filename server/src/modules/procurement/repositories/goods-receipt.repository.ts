import { eq, ilike, or, and, count, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  goodsReceipts,
  goodsReceiptItems,
  purchaseOrders,
  GoodsReceiptEntity,
  NewGoodsReceiptEntity,
  GoodsReceiptItemEntity,
  NewGoodsReceiptItemEntity,
} from '../../../database/schema/procurement.js';


export interface ListGoodsReceiptsQuery {
  search?: string;
  status?: string;
  purchaseOrderId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface GoodsReceiptWithDetails extends GoodsReceiptEntity {
  purchaseOrder: any;
  items: Array<GoodsReceiptItemEntity & { product?: any; purchaseOrderItem?: any }>;
  receivedByUser?: { id: string; name: string; email: string };
}

export class GoodsReceiptRepository {
  async findById(id: string, tx: any = db): Promise<GoodsReceiptWithDetails | null> {
    const grn = await tx.query.goodsReceipts.findFirst({
      where: eq(goodsReceipts.id, id),
      with: {
        purchaseOrder: {
          with: {
            supplier: true,
          },
        },
        items: {
          with: {
            product: true,
            purchaseOrderItem: true,
          },
        },
        receivedByUser: {
          columns: { id: true, fullName: true, email: true },
        },
      },
    });

    return (grn as GoodsReceiptWithDetails) || null;
  }

  async findByGrnNumber(grnNumber: string, tx: any = db): Promise<GoodsReceiptEntity | null> {
    const results = await tx.select().from(goodsReceipts).where(eq(goodsReceipts.grnNumber, grnNumber));
    return results[0] || null;
  }

  async find(query: ListGoodsReceiptsQuery, tx: any = db): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(goodsReceipts.status, query.status));
    }

    if (query.purchaseOrderId) {
      conditions.push(eq(goodsReceipts.purchaseOrderId, query.purchaseOrderId));
    }

    if (query.startDate) {
      conditions.push(gte(goodsReceipts.receiptDate, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(goodsReceipts.receiptDate, new Date(query.endDate)));
    }

    if (query.search && query.search.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(ilike(goodsReceipts.grnNumber, searchPattern));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      tx.query.goodsReceipts.findMany({
        where: whereClause,
        orderBy: desc(goodsReceipts.createdAt),
        limit,
        offset,
        with: {
          purchaseOrder: {
            with: {
              supplier: true,
            },
          },
          items: {
            with: {
              product: true,
              purchaseOrderItem: true,
            },
          },
          receivedByUser: {
            columns: { id: true, fullName: true, email: true },
          },
        },
      }),
      tx
        .select({ total: count() })
        .from(goodsReceipts)
        .where(whereClause),
    ]);

    return {
      data,
      total: Number(totalResult[0]?.total || 0),
    };
  }

  async create(
    grnData: NewGoodsReceiptEntity,
    itemsData: Array<Omit<NewGoodsReceiptItemEntity, 'goodsReceiptId'>>,
    tx: any = db
  ): Promise<GoodsReceiptWithDetails> {
    const [grn] = await tx.insert(goodsReceipts).values(grnData).returning();

    const itemsToInsert = itemsData.map((item) => ({
      ...item,
      goodsReceiptId: grn.id,
    }));

    await tx.insert(goodsReceiptItems).values(itemsToInsert).returning();

    return this.findById(grn.id, tx) as Promise<GoodsReceiptWithDetails>;
  }

  async update(id: string, grnData: Partial<NewGoodsReceiptEntity>, tx: any = db): Promise<GoodsReceiptEntity> {
    const [result] = await tx
      .update(goodsReceipts)
      .set({
        ...grnData,
        updatedAt: new Date(),
      })
      .where(eq(goodsReceipts.id, id))
      .returning();
    return result;
  }

  /**
   * Concurrency-safe lock for GRN
   */
  async lockGrnForUpdate(id: string, tx: any): Promise<GoodsReceiptEntity> {
    const result = await tx.execute(
      sql`SELECT id, grn_number AS "grnNumber", purchase_order_id AS "purchaseOrderId",
                 receipt_date AS "receiptDate", status, notes, received_by AS "receivedBy",
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM goods_receipts
          WHERE id = ${id}
          FOR UPDATE`
    );

    const rows = result.rows || result;
    if (!rows || rows.length === 0) {
      throw new Error(`Goods receipt ${id} not found for lock`);
    }

    return rows[0] as GoodsReceiptEntity;
  }
}
