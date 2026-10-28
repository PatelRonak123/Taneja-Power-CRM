import { eq, ilike, or, and, count, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  suppliers,
  supplierProducts,
  SupplierEntity,
  NewSupplierEntity,
  purchaseOrders,
} from '../../../database/schema/procurement.js';
import { products } from '../../../database/schema/products.js';

export interface SupplierProductInfo {
  id: string;
  name: string;
  sku: string;
  category?: string;
  price?: string;
  gstRate?: string | null;
}

export type SupplierWithProducts = SupplierEntity & {
  productIds: string[];
  products: SupplierProductInfo[];
};

export interface ListSuppliersQuery {
  search?: string;
  status?: string;
  productId?: string;
  page?: number;
  limit?: number;
}

export class SupplierRepository {
  private async attachProductsToSuppliers(
    supplierList: SupplierEntity[],
    tx: any = db
  ): Promise<SupplierWithProducts[]> {
    if (supplierList.length === 0) return [];

    const supplierIds = supplierList.map((s) => s.id);
    const links = await tx
      .select({
        supplierId: supplierProducts.supplierId,
        productId: products.id,
        productName: products.name,
        sku: products.sku,
        category: products.category,
        price: products.price,
        gstRate: products.gstRate,
      })
      .from(supplierProducts)
      .innerJoin(products, eq(supplierProducts.productId, products.id))
      .where(inArray(supplierProducts.supplierId, supplierIds));

    const productMap = new Map<string, SupplierProductInfo[]>();
    for (const link of links) {
      if (!productMap.has(link.supplierId)) {
        productMap.set(link.supplierId, []);
      }
      productMap.get(link.supplierId)!.push({
        id: link.productId,
        name: link.productName,
        sku: link.sku,
        category: link.category,
        price: link.price,
        gstRate: link.gstRate,
      });
    }

    return supplierList.map((s) => {
      const prods = productMap.get(s.id) || [];
      return {
        ...s,
        products: prods,
        productIds: prods.map((p) => p.id),
      };
    });
  }

  async findById(id: string, tx: any = db): Promise<SupplierWithProducts | null> {
    const results = await tx.select().from(suppliers).where(eq(suppliers.id, id));
    if (!results[0]) return null;
    const [withProducts] = await this.attachProductsToSuppliers([results[0]], tx);
    return withProducts || null;
  }

  async findByCode(code: string, tx: any = db): Promise<SupplierWithProducts | null> {
    const results = await tx.select().from(suppliers).where(eq(suppliers.supplierCode, code));
    if (!results[0]) return null;
    const [withProducts] = await this.attachProductsToSuppliers([results[0]], tx);
    return withProducts || null;
  }

  async find(
    query: ListSuppliersQuery,
    tx: any = db
  ): Promise<{ data: SupplierWithProducts[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(suppliers.status, query.status));
    }

    if (query.productId) {
      const supplierIdsWithProduct = tx
        .select({ supplierId: supplierProducts.supplierId })
        .from(supplierProducts)
        .where(eq(supplierProducts.productId, query.productId));
      conditions.push(inArray(suppliers.id, supplierIdsWithProduct));
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

    const enriched = await this.attachProductsToSuppliers(data, tx);

    return {
      data: enriched,
      total: Number(totalResult[0]?.total || 0),
    };
  }

  async create(
    data: NewSupplierEntity,
    productIds?: string[],
    tx: any = db
  ): Promise<SupplierWithProducts> {
    const [result] = await tx.insert(suppliers).values(data).returning();

    if (productIds && productIds.length > 0) {
      const uniqueIds = Array.from(new Set(productIds));
      await tx.insert(supplierProducts).values(
        uniqueIds.map((pId) => ({
          supplierId: result.id,
          productId: pId,
        }))
      );
    }

    const [withProducts] = await this.attachProductsToSuppliers([result], tx);
    return withProducts;
  }

  async update(
    id: string,
    data: Partial<NewSupplierEntity>,
    productIds?: string[],
    tx: any = db
  ): Promise<SupplierWithProducts> {
    const [result] = await tx
      .update(suppliers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id))
      .returning();

    if (productIds !== undefined) {
      await tx.delete(supplierProducts).where(eq(supplierProducts.supplierId, id));
      if (productIds.length > 0) {
        const uniqueIds = Array.from(new Set(productIds));
        await tx.insert(supplierProducts).values(
          uniqueIds.map((pId) => ({
            supplierId: id,
            productId: pId,
          }))
        );
      }
    }

    const [withProducts] = await this.attachProductsToSuppliers([result], tx);
    return withProducts;
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
