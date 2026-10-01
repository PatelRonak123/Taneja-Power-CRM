import { eq, ilike, and, count, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  salesOrders,
  salesOrderItems,
  SalesOrderEntity,
  NewSalesOrderEntity,
  SalesOrderItemEntity,
  NewSalesOrderItemEntity,
} from '../../../database/schema/sales-orders.js';
import { customers } from '../../../database/schema/customers.js';
import { users } from '../../../database/schema/users.js';
import { quotations, quotationRevisions } from '../../../database/schema/quotations.js';

export interface ListSalesOrdersQuery {
  search?: string;
  status?: string;
  customerId?: string;
  quotationId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SalesOrderWithDetails extends SalesOrderEntity {
  customer?: { id: string; name: string; companyName: string | null; email: string | null; phone: string | null };
  quotation?: { id: string; quotationNumber: string; quotationType: string };
  quotationRevision?: { id: string; revisionNumber: number };
  items: (SalesOrderItemEntity & {
    product?: { id: string; name: string; sku: string | null; stockQuantity: number } | null;
    dispatchItems?: Array<{
      id: string;
      dispatchQuantity: string | number;
      dispatch?: { id: string; status: string } | null;
    }>;
  })[];
  createdByUser?: { id: string; fullName: string; email: string };
  confirmedByUser?: { id: string; fullName: string; email: string } | null;
  cancelledByUser?: { id: string; fullName: string; email: string } | null;
}

export class SalesOrderRepository {
  async findById(id: string, tx: any = db): Promise<SalesOrderWithDetails | null> {
    const so = await tx.query.salesOrders.findFirst({
      where: eq(salesOrders.id, id),
      with: {
        customer: { columns: { id: true, name: true, companyName: true, email: true, phone: true } },
        quotation: { columns: { id: true, quotationNumber: true, quotationType: true } },
        quotationRevision: { columns: { id: true, revisionNumber: true } },
        items: {
          orderBy: (items: any, { asc }: any) => [asc(items.sortOrder)],
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                sku: true,
                stockQuantity: true,
              },
            },
            dispatchItems: {
              columns: {
                id: true,
                dispatchQuantity: true,
              },
              with: {
                dispatch: {
                  columns: {
                    id: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        createdByUser: { columns: { id: true, fullName: true, email: true } },
        confirmedByUser: { columns: { id: true, fullName: true, email: true } },
        cancelledByUser: { columns: { id: true, fullName: true, email: true } },
      },
    });
    return (so as SalesOrderWithDetails) || null;
  }

  async find(query: ListSalesOrdersQuery, tx: any = db): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(query.limit || 10, 100));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (query.status) conditions.push(eq(salesOrders.status, query.status));
    if (query.customerId) conditions.push(eq(salesOrders.customerId, query.customerId));
    if (query.quotationId) conditions.push(eq(salesOrders.quotationId, query.quotationId));
    if (query.startDate) conditions.push(gte(salesOrders.orderDate, new Date(query.startDate)));
    if (query.endDate) conditions.push(lte(salesOrders.orderDate, new Date(query.endDate)));
    if (query.search?.trim()) {
      conditions.push(ilike(salesOrders.salesOrderNumber, `%${query.search.trim()}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      tx.query.salesOrders.findMany({
        where: whereClause,
        orderBy: desc(salesOrders.createdAt),
        limit,
        offset,
        with: {
          customer: { columns: { id: true, name: true, companyName: true } },
          quotation: { columns: { id: true, quotationNumber: true, quotationType: true } },
          items: {
            orderBy: (items: any, { asc }: any) => [asc(items.sortOrder)],
            with: {
              product: {
                columns: {
                  id: true,
                  name: true,
                  sku: true,
                  stockQuantity: true,
                },
              },
              dispatchItems: {
                columns: {
                  id: true,
                  dispatchQuantity: true,
                },
                with: {
                  dispatch: {
                    columns: {
                      id: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
          createdByUser: { columns: { id: true, fullName: true, email: true } },
          confirmedByUser: { columns: { id: true, fullName: true, email: true } },
          cancelledByUser: { columns: { id: true, fullName: true, email: true } },
        },
      }),
      tx.select({ total: count() }).from(salesOrders).where(whereClause),
    ]);

    return { data, total: Number(totalResult[0]?.total || 0) };
  }

  async create(
    soData: NewSalesOrderEntity,
    itemsData: Array<Omit<NewSalesOrderItemEntity, 'salesOrderId'>>,
    tx: any = db
  ): Promise<SalesOrderWithDetails> {
    const [so] = await tx.insert(salesOrders).values(soData).returning();

    const itemsToInsert = itemsData.map((item, idx) => ({
      ...item,
      salesOrderId: so.id,
      sortOrder: item.sortOrder ?? idx,
    }));

    await tx.insert(salesOrderItems).values(itemsToInsert).returning();

    return this.findById(so.id, tx) as Promise<SalesOrderWithDetails>;
  }

  async update(id: string, data: Partial<NewSalesOrderEntity>, tx: any = db): Promise<SalesOrderEntity> {
    const [result] = await tx
      .update(salesOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salesOrders.id, id))
      .returning();
    return result;
  }

  async replaceItems(
    soId: string,
    itemsData: Array<Omit<NewSalesOrderItemEntity, 'salesOrderId'>>,
    tx: any = db
  ): Promise<SalesOrderItemEntity[]> {
    await tx.delete(salesOrderItems).where(eq(salesOrderItems.salesOrderId, soId));
    const itemsToInsert = itemsData.map((item, idx) => ({
      ...item,
      salesOrderId: soId,
      sortOrder: item.sortOrder ?? idx,
    }));
    return tx.insert(salesOrderItems).values(itemsToInsert).returning();
  }

  /**
   * Row-level lock for concurrency-safe status transitions
   */
  async lockForUpdate(id: string, tx: any): Promise<SalesOrderEntity> {
    const result = await tx.execute(
      sql`SELECT id, sales_order_number AS "salesOrderNumber", customer_id AS "customerId",
                 quotation_id AS "quotationId", quotation_revision_id AS "quotationRevisionId",
                 customer_po_number AS "customerPoNumber", customer_po_date AS "customerPoDate",
                 order_date AS "orderDate", expected_delivery_date AS "expectedDeliveryDate",
                 billing_address AS "billingAddress", billing_city AS "billingCity",
                 billing_state AS "billingState", billing_pincode AS "billingPincode",
                 shipping_name AS "shippingName", shipping_address AS "shippingAddress",
                 shipping_city AS "shippingCity", shipping_state AS "shippingState",
                 shipping_pincode AS "shippingPincode",
                 payment_terms AS "paymentTerms", notes, subtotal, tax_amount AS "taxAmount",
                 total_amount AS "totalAmount", status,
                 created_by AS "createdBy", confirmed_by AS "confirmedBy", confirmed_at AS "confirmedAt",
                 cancelled_by AS "cancelledBy", cancelled_at AS "cancelledAt",
                 cancellation_reason AS "cancellationReason",
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM sales_orders
          WHERE id = ${id}
          FOR UPDATE`
    );

    const rows = result.rows || result;
    if (!rows || rows.length === 0) {
      throw new Error(`Sales order ${id} not found for lock`);
    }
    return rows[0] as SalesOrderEntity;
  }
}
