import { eq, ilike, or, and, count, desc, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  suppliers,
  SupplierEntity,
  NewSupplierEntity,
  purchaseOrders,
} from '../../../database/schema/procurement.js';

export interface ListSuppliersQuery {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class SupplierRepository {
  async findById(id: string, tx: any = db): Promise<SupplierEntity | null> {
    const results = await tx.select().from(suppliers).where(eq(suppliers.id, id));
    return results[0] || null;
  }

  async findByCode(code: string, tx: any = db): Promise<SupplierEntity | null> {
    const results = await tx.select().from(suppliers).where(eq(suppliers.supplierCode, code));
    return results[0] || null;
  }

  async find(query: ListSuppliersQuery, tx: any = db): Promise<{ data: SupplierEntity[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(suppliers.status, query.status));
    }

    if (query.search && query.search.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(suppliers.name, searchPattern),
          ilike(suppliers.supplierCode, searchPattern),
          ilike(suppliers.phone, searchPattern),
          ilike(suppliers.email, searchPattern),
          ilike(suppliers.gstin, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      tx
        .select()
        .from(suppliers)
        .where(whereClause)
        .orderBy(desc(suppliers.createdAt))
        .limit(limit)
        .offset(offset),
      tx
        .select({ total: count() })
        .from(suppliers)
        .where(whereClause),
    ]);

    return {
      data,
      total: Number(totalResult[0]?.total || 0),
    };
  }

  async create(data: NewSupplierEntity, tx: any = db): Promise<SupplierEntity> {
    const [result] = await tx.insert(suppliers).values(data).returning();
    return result;
  }

  async update(id: string, data: Partial<NewSupplierEntity>, tx: any = db): Promise<SupplierEntity> {
    const [result] = await tx
      .update(suppliers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id))
      .returning();
    return result;
  }

  async hasPurchaseOrders(supplierId: string, tx: any = db): Promise<boolean> {
    const [res] = await tx
      .select({ count: count() })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.supplierId, supplierId));
    return Number(res?.count || 0) > 0;
  }

  async delete(id: string, tx: any = db): Promise<void> {
    await tx.delete(suppliers).where(eq(suppliers.id, id));
  }
}
