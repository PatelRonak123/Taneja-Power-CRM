import { eq, and, desc, count, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { stockMovements, StockMovementEntity, NewStockMovementEntity } from '../../../database/schema/inventory.js';
import { products } from '../../../database/schema/products.js';
import { users } from '../../../database/schema/users.js';

export interface FindMovementsOptions {
  productId?: string;
  movementType?: string;
  referenceType?: string;
  limit?: number;
  offset?: number;
}

export class StockMovementRepository {
  async create(data: NewStockMovementEntity, tx?: any): Promise<StockMovementEntity> {
    const executor = tx || db;
    const [result] = await executor.insert(stockMovements).values(data).returning();
    return result;
  }

  async findByProductId(
    productId: string,
    options: FindMovementsOptions,
    tx?: any
  ): Promise<{ items: any[]; total: number }> {
    const executor = tx || db;
    const { movementType, referenceType, limit = 20, offset = 0 } = options;

    const conditions = [eq(stockMovements.productId, productId)];

    if (movementType) {
      conditions.push(eq(stockMovements.movementType, movementType as any));
    }
    if (referenceType) {
      conditions.push(eq(stockMovements.referenceType, referenceType as any));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await executor
      .select({ count: count() })
      .from(stockMovements)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    const items = await executor
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        productSku: products.sku,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        previousQuantity: stockMovements.previousQuantity,
        newQuantity: stockMovements.newQuantity,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        reason: stockMovements.reason,
        createdBy: stockMovements.createdBy,
        createdByName: users.fullName,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(users, eq(stockMovements.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, total };
  }

  async findAll(options: FindMovementsOptions, tx?: any): Promise<{ items: any[]; total: number }> {
    const executor = tx || db;
    const { productId, movementType, referenceType, limit = 20, offset = 0 } = options;

    const conditions = [];

    if (productId) {
      conditions.push(eq(stockMovements.productId, productId));
    }
    if (movementType) {
      conditions.push(eq(stockMovements.movementType, movementType as any));
    }
    if (referenceType) {
      conditions.push(eq(stockMovements.referenceType, referenceType as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await executor
      .select({ count: count() })
      .from(stockMovements)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    const items = await executor
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        productSku: products.sku,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        previousQuantity: stockMovements.previousQuantity,
        newQuantity: stockMovements.newQuantity,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        reason: stockMovements.reason,
        createdBy: stockMovements.createdBy,
        createdByName: users.fullName,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(users, eq(stockMovements.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, total };
  }
}
