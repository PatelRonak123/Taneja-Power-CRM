import { eq, ilike, and, or, sql, desc, count, inArray } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { products, ProductEntity, NewProductEntity } from '../../../database/schema/products.js';
import { ListProductsQuery } from '../validators/product.validator.js';

export type ProductWithParent = ProductEntity & {
  parentProduct?: {
    id: string;
    name: string;
    sku: string;
    brand: string | null;
    model: string | null;
  } | null;
};

export class ProductRepository {
  async findAll(params: ListProductsQuery): Promise<{ items: ProductWithParent[]; total: number }> {
    const { search, category, brand, status, priceOnRequest, page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.brand, `%${search}%`),
          ilike(products.model, `%${search}%`),
          ilike(products.subModel, `%${search}%`),
          ilike(products.series, `%${search}%`)
        )
      );
    }
    if (category) {
      conditions.push(ilike(products.category, `%${category}%`));
    }
    if (brand) {
      conditions.push(ilike(products.brand, `%${brand}%`));
    }
    if (status) {
      conditions.push(eq(products.status, status));
    }
    if (priceOnRequest !== undefined) {
      conditions.push(eq(products.priceOnRequest, priceOnRequest));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    const items = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    // Batch resolve parent products in 1 query to prevent N+1 queries
    const parentIds = Array.from(
      new Set(
        items
          .map((i) => i.parentProductId)
          .filter((id): id is string => Boolean(id))
      )
    );

    const parentMap = new Map<
      string,
      { id: string; name: string; sku: string; brand: string | null; model: string | null }
    >();

    if (parentIds.length > 0) {
      const parents = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          brand: products.brand,
          model: products.model,
        })
        .from(products)
        .where(inArray(products.id, parentIds));

      for (const p of parents) {
        parentMap.set(p.id, p);
      }
    }

    const enrichedItems: ProductWithParent[] = items.map((item) => ({
      ...item,
      parentProduct: item.parentProductId ? parentMap.get(item.parentProductId) || null : null,
    }));

    return { items: enrichedItems, total };
  }

  async findById(id: string, tx?: any): Promise<ProductWithParent | undefined> {
    const client = tx || db;
    const result = await client.select().from(products).where(eq(products.id, id)).limit(1);
    const product = result[0];
    if (!product) return undefined;

    let parentProduct = null;
    if (product.parentProductId) {
      const [parent] = await client
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          brand: products.brand,
          model: products.model,
        })
        .from(products)
        .where(eq(products.id, product.parentProductId))
        .limit(1);
      parentProduct = parent || null;
    }

    return { ...product, parentProduct };
  }

  async findBySku(sku: string): Promise<ProductEntity | undefined> {
    const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
    return result[0];
  }

  async create(data: NewProductEntity, tx?: any): Promise<ProductEntity> {
    const client = tx || db;
    const result = await client.insert(products).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewProductEntity>, tx?: any): Promise<ProductEntity | undefined> {
    const client = tx || db;
    const result = await client
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }
}
