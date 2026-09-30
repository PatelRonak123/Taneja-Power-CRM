import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  PurchaseOrderRepository,
  PurchaseOrderWithDetails,
  ListPurchaseOrdersQuery,
} from '../repositories/purchase-order.repository.js';
import { SupplierRepository } from '../repositories/supplier.repository.js';
import { ProcurementNumberService } from './procurement-number.service.js';
import { products, ProductEntity } from '../../../database/schema/products.js';
import {
  PurchaseOrderEntity,
  NewPurchaseOrderEntity,
  NewPurchaseOrderItemEntity,
} from '../../../database/schema/procurement.js';
import { PO_STATUSES, SUPPLIER_STATUSES } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

export interface PoItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
  taxRate?: number;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  items: PoItemInput[];
}

export interface UpdatePurchaseOrderInput {
  supplierId?: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  items?: PoItemInput[];
}

export class PurchaseOrderService {
  constructor(
    private readonly poRepo: PurchaseOrderRepository = new PurchaseOrderRepository(),
    private readonly supplierRepo: SupplierRepository = new SupplierRepository(),
    private readonly numberService: ProcurementNumberService = new ProcurementNumberService()
  ) {}

  private round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private calculateItemsAndTotals(
    itemsInput: PoItemInput[],
    productMap: Map<string, ProductEntity>
  ): {
    calculatedItems: Array<Omit<NewPurchaseOrderItemEntity, 'purchaseOrderId'>>;
    subtotal: string;
    taxAmount: string;
    totalAmount: string;
  } {
    let subtotalNum = 0;
    let taxAmountNum = 0;

    const calculatedItems = itemsInput.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw AppError.notFound(`Product with ID "${item.productId}" was not found`, 'PRODUCT_NOT_FOUND');
      }

      if (item.quantity <= 0) {
        throw AppError.badRequest('Item quantity must be greater than 0', undefined, 'INVALID_QUANTITY');
      }

      if (item.unitCost < 0) {
        throw AppError.badRequest('Item unit cost cannot be negative', undefined, 'INVALID_UNIT_COST');
      }

      const taxRate = Math.max(0, item.taxRate || 0);
      const lineSubtotal = this.round(item.quantity * item.unitCost, 2);
      const lineTax = this.round(lineSubtotal * (taxRate / 100), 2);
      const lineTotal = this.round(lineSubtotal + lineTax, 2);

      subtotalNum += lineSubtotal;
      taxAmountNum += lineTax;

      return {
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku || null,
        quantity: item.quantity,
        unitCost: item.unitCost.toFixed(2),
        taxRate: taxRate.toFixed(2),
        taxAmount: lineTax.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        receivedQuantity: 0,
      };
    });

    const totalAmountNum = this.round(subtotalNum + taxAmountNum, 2);

    return {
      calculatedItems,
      subtotal: subtotalNum.toFixed(2),
      taxAmount: taxAmountNum.toFixed(2),
      totalAmount: totalAmountNum.toFixed(2),
    };
  }

  async createPurchaseOrder(
    input: CreatePurchaseOrderInput,
    userId: string
  ): Promise<PurchaseOrderWithDetails> {
    const supplier = await this.supplierRepo.findById(input.supplierId);
    if (!supplier) {
      throw AppError.notFound(`Supplier with ID "${input.supplierId}" was not found`, 'SUPPLIER_NOT_FOUND');
    }

    if (supplier.status !== SUPPLIER_STATUSES.ACTIVE) {
      throw AppError.badRequest('Cannot create purchase order for an INACTIVE supplier', undefined, 'INACTIVE_SUPPLIER');
    }

    if (!input.items || input.items.length === 0) {
      throw AppError.badRequest('Purchase order must contain at least one item', undefined, 'EMPTY_PO_ITEMS');
    }

    const productIds = input.items.map((i) => i.productId);
    const fetchedProducts = await db.select().from(products).where(inArray(products.id, productIds));
    const productMap = new Map<string, ProductEntity>(fetchedProducts.map((p) => [p.id, p]));

    for (const p of fetchedProducts) {
      if (p.status !== 'ACTIVE') {
        throw AppError.badRequest(`Product "${p.name}" is inactive and cannot be ordered`, undefined, 'INACTIVE_PRODUCT');
      }
    }

    const { calculatedItems, subtotal, taxAmount, totalAmount } = this.calculateItemsAndTotals(
      input.items,
      productMap
    );

    const poNumber = await this.numberService.generateNumber('PO');

    const poData: NewPurchaseOrderEntity = {
      poNumber,
      supplierId: input.supplierId,
      orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
      expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
      status: PO_STATUSES.DRAFT,
      subtotal,
      taxAmount,
      totalAmount,
      notes: input.notes?.trim() || null,
      termsAndConditions: input.termsAndConditions?.trim() || null,
      createdBy: userId,
    };

    return db.transaction(async (tx) => {
      return this.poRepo.create(poData, calculatedItems, tx);
    });
  }

  async updatePurchaseOrder(
    id: string,
    input: UpdatePurchaseOrderInput
  ): Promise<PurchaseOrderWithDetails> {
    const po = await this.getPurchaseOrderById(id);

    if (po.status !== PO_STATUSES.DRAFT) {
      throw AppError.badRequest(
        `Purchase order in "${po.status}" status cannot be edited. Only DRAFT purchase orders can be edited.`,
        undefined,
        'PO_NOT_EDITABLE'
      );
    }

    let subtotal = po.subtotal;
    let taxAmount = po.taxAmount;
    let totalAmount = po.totalAmount;
    let calculatedItems: Array<Omit<NewPurchaseOrderItemEntity, 'purchaseOrderId'>> | undefined;

    if (input.items && input.items.length > 0) {
      const productIds = input.items.map((i) => i.productId);
      const fetchedProducts = await db.select().from(products).where(inArray(products.id, productIds));
      const productMap = new Map<string, ProductEntity>(fetchedProducts.map((p) => [p.id, p]));

      const calculated = this.calculateItemsAndTotals(input.items, productMap);
      calculatedItems = calculated.calculatedItems;
      subtotal = calculated.subtotal;
      taxAmount = calculated.taxAmount;
      totalAmount = calculated.totalAmount;
    }

    if (input.supplierId && input.supplierId !== po.supplierId) {
      const supplier = await this.supplierRepo.findById(input.supplierId);
      if (!supplier || supplier.status !== SUPPLIER_STATUSES.ACTIVE) {
        throw AppError.badRequest('Invalid or inactive supplier', undefined, 'INVALID_SUPPLIER');
      }
    }

    return db.transaction(async (tx) => {
      if (calculatedItems) {
        await this.poRepo.updateItems(id, calculatedItems, tx);
      }

      await this.poRepo.update(
        id,
        {
          ...(input.supplierId ? { supplierId: input.supplierId } : {}),
          ...(input.orderDate ? { orderDate: new Date(input.orderDate) } : {}),
          ...(input.expectedDeliveryDate !== undefined
            ? { expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
          ...(input.termsAndConditions !== undefined
            ? { termsAndConditions: input.termsAndConditions?.trim() || null }
            : {}),
          subtotal,
          taxAmount,
          totalAmount,
        },
        tx
      );

      return this.poRepo.findById(id, tx) as Promise<PurchaseOrderWithDetails>;
    });
  }

  async submitPurchaseOrder(id: string): Promise<PurchaseOrderWithDetails> {
    const po = await this.getPurchaseOrderById(id);

    if (po.status !== PO_STATUSES.DRAFT) {
      throw AppError.badRequest(
        `Only DRAFT purchase orders can be submitted for approval. Current status: ${po.status}`,
        undefined,
        'INVALID_STATUS_TRANSITION'
      );
    }

    await this.poRepo.update(id, { status: PO_STATUSES.PENDING_APPROVAL });
    return this.getPurchaseOrderById(id);
  }

  async approvePurchaseOrder(id: string, approvedByUserId: string): Promise<PurchaseOrderWithDetails> {
    const po = await this.getPurchaseOrderById(id);

    if (po.status !== PO_STATUSES.PENDING_APPROVAL) {
      throw AppError.badRequest(
        `Only PENDING_APPROVAL purchase orders can be approved. Current status: ${po.status}`,
        undefined,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Approval records approver and approval time, but NEVER changes inventory!
    await this.poRepo.update(id, {
      status: PO_STATUSES.APPROVED,
      approvedBy: approvedByUserId,
      approvedAt: new Date(),
    });

    return this.getPurchaseOrderById(id);
  }

  async cancelPurchaseOrder(id: string): Promise<PurchaseOrderWithDetails> {
    const po = await this.getPurchaseOrderById(id);

    if (po.status === PO_STATUSES.CANCELLED) {
      throw AppError.badRequest('Purchase order is already cancelled', undefined, 'ALREADY_CANCELLED');
    }

    if (po.status === PO_STATUSES.FULLY_RECEIVED) {
      throw AppError.badRequest('Cannot cancel a fully received purchase order', undefined, 'CANNOT_CANCEL_RECEIVED');
    }

    // Check if any item has received quantity
    const totalReceived = po.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    if (totalReceived > 0) {
      throw AppError.badRequest(
        'Cannot cancel purchase order with already received quantities',
        undefined,
        'CANNOT_CANCEL_WITH_RECEIPTS'
      );
    }

    await this.poRepo.update(id, { status: PO_STATUSES.CANCELLED });
    return this.getPurchaseOrderById(id);
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrderWithDetails> {
    const po = await this.poRepo.findById(id);
    if (!po) {
      throw AppError.notFound(`Purchase order with ID "${id}" was not found`, 'PO_NOT_FOUND');
    }
    return po;
  }

  async listPurchaseOrders(query: ListPurchaseOrdersQuery): Promise<{ data: any[]; total: number }> {
    return this.poRepo.find(query);
  }
}
