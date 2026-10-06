import { eq, and, sql, desc, inArray, gte, lte, or, ilike } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  dispatches,
  dispatchItems,
  dispatchActivityLogs,
  DispatchEntity,
  NewDispatchEntity,
  DispatchItemEntity,
  NewDispatchItemEntity,
  NewDispatchActivityLogEntity,
} from '../../../database/schema/dispatch.js';
import { salesOrders } from '../../../database/schema/sales-orders.js';
import { customers } from '../../../database/schema/customers.js';
import { users } from '../../../database/schema/users.js';

export interface DispatchFilter {
  search?: string;
  status?: string;
  salesOrderId?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class DispatchRepository {
  async findById(id: string, txClient: any = db): Promise<DispatchEntity | null> {
    const result = await txClient
      .select()
      .from(dispatches)
      .where(eq(dispatches.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findByIdWithDetails(id: string, txClient: any = db) {
    const dispatch = await txClient.query.dispatches.findFirst({
      where: eq(dispatches.id, id),
      with: {
        items: {
          orderBy: [dispatchItems.sortOrder],
        },
        salesOrder: {
          columns: {
            id: true,
            salesOrderNumber: true,
            customerPoNumber: true,
            status: true,
            dispatchStatus: true,
          },
        },
        customer: {
          columns: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
        salesInvoice: {
          columns: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
          },
        },
        createdByUser: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        dispatchedByUser: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        cancelledByUser: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        activityLogs: {
          orderBy: [desc(dispatchActivityLogs.createdAt)],
          with: {
            actor: {
              columns: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (dispatch) {
      const equipmentRes = await txClient.execute(
        sql`SELECT id, asset_number, product_name, sku, serial_number, unit_index, condition_status, asset_status, delivery_date
            FROM customer_equipment
            WHERE delivery_id = ${id}
            ORDER BY unit_index ASC`
      );
      (dispatch as any).customerEquipment = equipmentRes.rows || equipmentRes;
    }

    return dispatch || null;
  }

  async findAll(filter: DispatchFilter = {}, txClient: any = db) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filter.search) {
      const s = `%${filter.search}%`;
      conditions.push(
        or(
          ilike(dispatches.dispatchNumber, s),
          ilike(dispatches.deliveryChallanNumber, s),
          ilike(dispatches.customerNameSnapshot, s),
          ilike(dispatches.vehicleNumber, s)
        )
      );
    }

    if (filter.status) {
      conditions.push(eq(dispatches.status, filter.status));
    }

    if (filter.salesOrderId) {
      conditions.push(eq(dispatches.salesOrderId, filter.salesOrderId));
    }

    if (filter.customerId) {
      conditions.push(eq(dispatches.customerId, filter.customerId));
    }

    if (filter.startDate) {
      conditions.push(gte(dispatches.dispatchDate, filter.startDate));
    }

    if (filter.endDate) {
      conditions.push(lte(dispatches.dispatchDate, filter.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await txClient
      .select({ total: sql<number>`count(*)::int` })
      .from(dispatches)
      .where(whereClause);

    const data = await txClient.query.dispatches.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(dispatches.createdAt)],
      with: {
        salesOrder: {
          columns: {
            id: true,
            salesOrderNumber: true,
            customerPoNumber: true,
          },
        },
        customer: {
          columns: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        salesInvoice: {
          columns: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
    });

    return {
      data,
      meta: {
        total: countResult?.total || 0,
        page,
        limit,
        totalPages: Math.ceil((countResult?.total || 0) / limit),
      },
    };
  }

  async create(data: NewDispatchEntity, txClient: any = db): Promise<DispatchEntity> {
    const [created] = await txClient
      .insert(dispatches)
      .values(data)
      .returning();
    return created;
  }

  async update(id: string, data: Partial<NewDispatchEntity>, txClient: any = db): Promise<DispatchEntity> {
    const [updated] = await txClient
      .update(dispatches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dispatches.id, id))
      .returning();
    return updated;
  }

  async createItems(items: NewDispatchItemEntity[], txClient: any = db): Promise<DispatchItemEntity[]> {
    if (items.length === 0) return [];
    return txClient.insert(dispatchItems).values(items).returning();
  }

  async getItemsByDispatchId(dispatchId: string, txClient: any = db): Promise<DispatchItemEntity[]> {
    return txClient
      .select()
      .from(dispatchItems)
      .where(eq(dispatchItems.dispatchId, dispatchId))
      .orderBy(dispatchItems.sortOrder);
  }

  async deleteItemsByDispatchId(dispatchId: string, txClient: any = db): Promise<void> {
    await txClient.delete(dispatchItems).where(eq(dispatchItems.dispatchId, dispatchId));
  }

  /**
   * Calculates the total dispatched quantity for a Sales Order item across DISPATCHED records.
   */
  async getDispatchedQuantityForSoItem(salesOrderItemId: string, txClient: any = db): Promise<number> {
    const result = await txClient.execute(sql`
      SELECT COALESCE(SUM(di.dispatch_quantity), 0) AS total_dispatched
      FROM dispatch_items di
      JOIN dispatches d ON d.id = di.dispatch_id
      WHERE di.sales_order_item_id = ${salesOrderItemId}
        AND d.status = 'DISPATCHED'
    `);

    return Number(result.rows[0]?.total_dispatched || 0);
  }

  /**
   * Calculates the total invoiced quantity for a Sales Order item across ISSUED/PAID sales invoices.
   */
  async getInvoicedQuantityForSoItem(salesOrderItemId: string, txClient: any = db): Promise<number> {
    const result = await txClient.execute(sql`
      SELECT COALESCE(SUM(sii.quantity), 0) AS total_invoiced
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON si.id = sii.sales_invoice_id
      WHERE sii.sales_order_item_id = ${salesOrderItemId}
        AND si.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID')
    `);

    return Number(result.rows[0]?.total_invoiced || 0);
  }

  async createActivityLog(log: NewDispatchActivityLogEntity, txClient: any = db): Promise<void> {
    await txClient.insert(dispatchActivityLogs).values(log);
  }
}
