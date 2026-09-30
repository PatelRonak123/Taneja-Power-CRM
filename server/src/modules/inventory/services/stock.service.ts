import { eq, sql, and, ilike, count, desc, lte } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { products, ProductEntity } from '../../../database/schema/products.js';
import { StockMovementRepository } from '../repositories/stock-movement.repository.js';
import {
  StockInInput,
  StockOutInput,
  StockAdjustmentInput,
  StockMovementDto,
  InventoryItemDto,
} from '../dto/inventory.dto.js';
import { ListInventoryQuery, ListStockMovementsQuery } from '../validators/inventory.validator.js';
import { INVENTORY_MOVEMENT_TYPES, INVENTORY_REFERENCE_TYPES } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

export interface AuthUserContext {
  userId?: string;
  id?: string;
}

export class StockService {
  constructor(
    private readonly movementRepo: StockMovementRepository = new StockMovementRepository()
  ) {}

  private async executeTx<T>(externalTx: any | undefined, fn: (tx: any) => Promise<T>): Promise<T> {
    if (externalTx) {
      return fn(externalTx);
    }
    return db.transaction(async (tx) => {
      return fn(tx);
    });
  }

  /**
   * Atomically locks the product row with SELECT ... FOR UPDATE to avoid race conditions.
   */
  private async getLockedProduct(tx: any, productId: string): Promise<ProductEntity> {
    const result = await tx.execute(
      sql`SELECT id, name, sku, description, category, price, stock_quantity AS "stockQuantity", status, created_at AS "createdAt", updated_at AS "updatedAt"
          FROM products
          WHERE id = ${productId}
          FOR UPDATE`
    );

    const rows = result.rows || result;
    if (!rows || rows.length === 0) {
      throw AppError.notFound(`Product with ID "${productId}" was not found`, 'PRODUCT_NOT_FOUND');
    }

    return rows[0] as ProductEntity;
  }

  /**
   * Atomic Stock IN
   */
  async addStock(
    input: StockInInput,
    authUser?: AuthUserContext,
    externalTx?: any
  ): Promise<StockMovementDto> {
    if (!input.quantity || input.quantity <= 0) {
      throw AppError.badRequest('Quantity to add must be a positive integer greater than zero', undefined, 'INVALID_STOCK_QUANTITY');
    }

    return this.executeTx(externalTx, async (tx) => {
      const product = await this.getLockedProduct(tx, input.productId);
      const currentStock = Number(product.stockQuantity);
      const newStock = currentStock + input.quantity;

      // Update product stock snapshot
      await tx
        .update(products)
        .set({
          stockQuantity: newStock,
          updatedAt: new Date(),
        })
        .where(eq(products.id, input.productId));

      // Append immutable ledger entry
      const movement = await this.movementRepo.create(
        {
          productId: input.productId,
          movementType: INVENTORY_MOVEMENT_TYPES.IN,
          quantity: input.quantity,
          previousQuantity: currentStock,
          newQuantity: newStock,
          referenceType: input.referenceType || INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT,
          referenceId: input.referenceId || null,
          reason: input.reason || 'Stock received',
          createdBy: authUser?.userId || authUser?.id || null,
        },
        tx
      );

      return {
        id: movement.id,
        productId: movement.productId,
        productName: product.name,
        productSku: product.sku,
        movementType: movement.movementType as any,
        quantity: movement.quantity,
        previousQuantity: movement.previousQuantity,
        newQuantity: movement.newQuantity,
        referenceType: movement.referenceType as any,
        referenceId: movement.referenceId,
        reason: movement.reason,
        createdBy: movement.createdBy,
        createdAt: movement.createdAt.toISOString(),
      };
    });
  }

  /**
   * Atomic Stock OUT
   * Validates available stock and prevents negative inventory.
   */
  async removeStock(
    input: StockOutInput,
    authUser?: AuthUserContext,
    externalTx?: any
  ): Promise<StockMovementDto> {
    if (!input.quantity || input.quantity <= 0) {
      throw AppError.badRequest('Quantity to remove must be a positive integer greater than zero', undefined, 'INVALID_STOCK_QUANTITY');
    }

    return this.executeTx(externalTx, async (tx) => {
      const product = await this.getLockedProduct(tx, input.productId);
      const currentStock = Number(product.stockQuantity);

      if (currentStock < input.quantity) {
        throw AppError.badRequest(
          `INSUFFICIENT_STOCK: Available stock is ${currentStock}, but ${input.quantity} was requested`,
          { currentStock, requestedQuantity: input.quantity, productName: product.name },
          'INSUFFICIENT_STOCK'
        );
      }

      const newStock = currentStock - input.quantity;

      // Update product stock snapshot
      await tx
        .update(products)
        .set({
          stockQuantity: newStock,
          updatedAt: new Date(),
        })
        .where(eq(products.id, input.productId));

      // Append immutable ledger entry
      const movement = await this.movementRepo.create(
        {
          productId: input.productId,
          movementType: INVENTORY_MOVEMENT_TYPES.OUT,
          quantity: input.quantity,
          previousQuantity: currentStock,
          newQuantity: newStock,
          referenceType: input.referenceType || INVENTORY_REFERENCE_TYPES.AMC,
          referenceId: input.referenceId || null,
          reason: input.reason || 'Stock consumed',
          createdBy: authUser?.userId || authUser?.id || null,
        },
        tx
      );

      return {
        id: movement.id,
        productId: movement.productId,
        productName: product.name,
        productSku: product.sku,
        movementType: movement.movementType as any,
        quantity: movement.quantity,
        previousQuantity: movement.previousQuantity,
        newQuantity: movement.newQuantity,
        referenceType: movement.referenceType as any,
        referenceId: movement.referenceId,
        reason: movement.reason,
        createdBy: movement.createdBy,
        createdAt: movement.createdAt.toISOString(),
      };
    });
  }

  /**
   * Atomic Stock Adjustment
   * Requires reason for auditability. Signed delta stored in ledger.
   */
  async adjustStock(
    input: StockAdjustmentInput,
    authUser?: AuthUserContext,
    externalTx?: any
  ): Promise<StockMovementDto> {
    if (!input.reason || input.reason.trim().length < 3) {
      throw AppError.badRequest('A valid reason (minimum 3 characters) is required for stock adjustment', undefined, 'INVALID_STOCK_ADJUSTMENT');
    }

    return this.executeTx(externalTx, async (tx) => {
      const product = await this.getLockedProduct(tx, input.productId);
      const currentStock = Number(product.stockQuantity);

      let delta: number;
      let newStock: number;

      if (input.newQuantity !== undefined) {
        newStock = input.newQuantity;
        delta = newStock - currentStock;
      } else if (input.quantity !== undefined) {
        delta = input.quantity;
        newStock = currentStock + delta;
      } else {
        throw AppError.badRequest('Either delta quantity or new target quantity must be specified', undefined, 'INVALID_STOCK_ADJUSTMENT');
      }

      if (newStock < 0) {
        throw AppError.badRequest(
          `INSUFFICIENT_STOCK: Adjustment would produce negative stock (${newStock})`,
          { currentStock, delta, newStock },
          'INSUFFICIENT_STOCK'
        );
      }

      if (delta === 0) {
        throw AppError.badRequest('Adjustment delta is zero. Physical stock already matches the recorded quantity.', undefined, 'INVALID_STOCK_ADJUSTMENT');
      }

      // Update product stock snapshot
      await tx
        .update(products)
        .set({
          stockQuantity: newStock,
          updatedAt: new Date(),
        })
        .where(eq(products.id, input.productId));

      // Append immutable ledger entry
      const movement = await this.movementRepo.create(
        {
          productId: input.productId,
          movementType: INVENTORY_MOVEMENT_TYPES.ADJUSTMENT,
          quantity: delta, // signed delta (e.g. +5 or -3)
          previousQuantity: currentStock,
          newQuantity: newStock,
          referenceType: INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT,
          referenceId: input.referenceId || null,
          reason: input.reason.trim(),
          createdBy: authUser?.userId || authUser?.id || null,
        },
        tx
      );

      return {
        id: movement.id,
        productId: movement.productId,
        productName: product.name,
        productSku: product.sku,
        movementType: movement.movementType as any,
        quantity: movement.quantity,
        previousQuantity: movement.previousQuantity,
        newQuantity: movement.newQuantity,
        referenceType: movement.referenceType as any,
        referenceId: movement.referenceId,
        reason: movement.reason,
        createdBy: movement.createdBy,
        createdAt: movement.createdAt.toISOString(),
      };
    });
  }

  /**
   * Query Current Inventory Status (Snapshot from products)
   */
  async getCurrentInventory(
    params?: any
  ): Promise<{ items: InventoryItemDto[]; total: number }> {
    const search = params?.search ? String(params.search) : undefined;
    const category = params?.category ? String(params.category) : undefined;
    const status = params?.status ? (params.status as any) : undefined;
    const lowStockOnly = params?.lowStockOnly === true || params?.lowStockOnly === 'true';
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(ilike(products.name, `%${search}%`));
    }
    if (category) {
      conditions.push(eq(products.category, category));
    }
    if (status) {
      conditions.push(eq(products.status, status));
    }
    if (lowStockOnly) {
      // Products with low stock (e.g. <= 10)
      conditions.push(lte(products.stockQuantity, 10));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    const rows = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.updatedAt))
      .limit(limit)
      .offset(offset);

    const items: InventoryItemDto[] = rows.map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      stockQuantity: p.stockQuantity,
      price: p.price,
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
    }));

    return { items, total };
  }

  /**
   * Query stock movement audit ledger for a specific product
   */
  async getStockMovements(
    productId: string,
    params?: any
  ): Promise<{ items: StockMovementDto[]; total: number }> {
    // Verify product exists
    const [product] = await db
      .select({ id: products.id, name: products.name, sku: products.sku })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      throw AppError.notFound(`Product with ID "${productId}" was not found`);
    }

    const movementType = params?.movementType ? String(params.movementType) : undefined;
    const referenceType = params?.referenceType ? String(params.referenceType) : undefined;
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const offset = (page - 1) * limit;

    const { items, total } = await this.movementRepo.findByProductId(
      productId,
      {
        movementType,
        referenceType,
        limit,
        offset,
      }
    );

    const dtos: StockMovementDto[] = items.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.productName,
      productSku: m.productSku,
      movementType: m.movementType,
      quantity: m.quantity,
      previousQuantity: m.previousQuantity,
      newQuantity: m.newQuantity,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      reason: m.reason,
      createdBy: m.createdBy,
      createdByName: m.createdByName,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    }));

    return { items: dtos, total };
  }
}
