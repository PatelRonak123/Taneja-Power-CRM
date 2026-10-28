import { eq, ilike, and, or, sql, desc, count } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { products, ProductEntity, NewProductEntity } from '../../../database/schema/products.js';
import { ListProductsQuery } from '../validators/product.validator.js';

export class ProductRepository {
  async findAll(params: ListProductsQuery): Promise<{ items: ProductEntity[]; total: number }> {
    const { search, category, status, page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(or(ilike(products.name, `%${search}%`), ilike(products.sku, `%${search}%`)));
    }
    if (category) {
      conditions.push(eq(products.category, category));
    }
    if (status) {
      conditions.push(eq(products.status, status));
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

    return { items, total };
  }

  async findById(id: string): Promise<ProductEntity | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
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
