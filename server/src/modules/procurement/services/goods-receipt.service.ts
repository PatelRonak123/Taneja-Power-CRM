import { db } from '../../../database/db.js';
import {
  GoodsReceiptRepository,
  GoodsReceiptWithDetails,
  ListGoodsReceiptsQuery,
} from '../repositories/goods-receipt.repository.js';
import { PurchaseOrderRepository } from '../repositories/purchase-order.repository.js';
import { ProcurementNumberService } from './procurement-number.service.js';
import { StockService, AuthUserContext } from '../../inventory/services/stock.service.js';
import {
  GoodsReceiptEntity,
  NewGoodsReceiptEntity,
  NewGoodsReceiptItemEntity,
} from '../../../database/schema/procurement.js';
import { GRN_STATUSES, PO_STATUSES, INVENTORY_REFERENCE_TYPES } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

export interface GrnItemInput {
  purchaseOrderItemId: string;
  receivedQuantity: number;
}

export interface CreateGoodsReceiptInput {
  purchaseOrderId: string;
  receiptDate?: string;
  notes?: string | null;
  items: GrnItemInput[];
  autoPost?: boolean;
}

export class GoodsReceiptService {
  constructor(
    private readonly grnRepo: GoodsReceiptRepository = new GoodsReceiptRepository(),
    private readonly poRepo: PurchaseOrderRepository = new PurchaseOrderRepository(),
    private readonly stockService: StockService = new StockService(),
    private readonly numberService: ProcurementNumberService = new ProcurementNumberService()
  ) {}

  async createGoodsReceipt(
    input: CreateGoodsReceiptInput,
    authUser: AuthUserContext
  ): Promise<GoodsReceiptWithDetails> {
    const userId = authUser.userId || authUser.id;
    if (!userId) {
      throw AppError.unauthorized('User must be authenticated', 'UNAUTHENTICATED');
    }

    if (!input.items || input.items.length === 0) {
      throw AppError.badRequest('Goods receipt must have at least one item', undefined, 'EMPTY_GRN_ITEMS');
    }

    return db.transaction(async (tx) => {
      // 1. Lock and verify PO
      const po = await this.poRepo.lockPoForUpdate(input.purchaseOrderId, tx);
      if (po.status === PO_STATUSES.CANCELLED) {
        throw AppError.badRequest('Cannot receive goods against a CANCELLED purchase order', undefined, 'PO_CANCELLED');
      }
      if (po.status === PO_STATUSES.FULLY_RECEIVED) {
        throw AppError.badRequest('Purchase order is already FULLY_RECEIVED', undefined, 'PO_FULLY_RECEIVED');
      }
      if (po.status !== PO_STATUSES.APPROVED && po.status !== PO_STATUSES.PARTIALLY_RECEIVED) {
        throw AppError.badRequest(
          `Cannot create goods receipt for PO in "${po.status}" status. PO must be APPROVED or PARTIALLY_RECEIVED.`,
          undefined,
          'PO_NOT_APPROVED'
        );
      }

      // 2. Lock PO items
      const poItems = await this.poRepo.lockPoItemsForUpdate(po.id, tx);
      const poItemMap = new Map(poItems.map((item) => [item.id, item]));

      const grnItemsToCreate: Array<Omit<NewGoodsReceiptItemEntity, 'goodsReceiptId'>> = [];

      for (const itemInput of input.items) {
        const poItem = poItemMap.get(itemInput.purchaseOrderItemId);
        if (!poItem) {
          throw AppError.badRequest(
            `Purchase order item "${itemInput.purchaseOrderItemId}" does not belong to PO ${po.poNumber}`,
            undefined,
            'INVALID_PO_ITEM'
          );
        }

        if (itemInput.receivedQuantity <= 0) {
          throw AppError.badRequest('Received quantity must be greater than 0', undefined, 'INVALID_RECEIVED_QUANTITY');
        }

        const remainingQuantity = poItem.quantity - (poItem.receivedQuantity || 0);
        if (itemInput.receivedQuantity > remainingQuantity) {
          throw AppError.badRequest(
            `Over-receipt rejected for product "${poItem.productNameSnapshot}". Ordered: ${poItem.quantity}, Already Received: ${poItem.receivedQuantity}, Remaining: ${remainingQuantity}, Attempted: ${itemInput.receivedQuantity}`,
            undefined,
            'OVER_RECEIPT_REJECTED'
          );
        }

        grnItemsToCreate.push({
          purchaseOrderItemId: poItem.id,
          productId: poItem.productId,
          orderedQuantity: poItem.quantity,
          previouslyReceivedQuantity: poItem.receivedQuantity || 0,
          receivedQuantity: itemInput.receivedQuantity,
        });
      }

      const grnNumber = await this.numberService.generateNumber('GRN', new Date(), tx);

      const grnData: NewGoodsReceiptEntity = {
        grnNumber,
        purchaseOrderId: po.id,
        receiptDate: input.receiptDate ? new Date(input.receiptDate) : new Date(),
        status: GRN_STATUSES.DRAFT,
        notes: input.notes?.trim() || null,
        receivedBy: userId,
      };

      const createdGrn = await this.grnRepo.create(grnData, grnItemsToCreate, tx);

      if (input.autoPost) {
        return this.executePostGrn(createdGrn.id, authUser, tx);
      }

      return createdGrn;
    });
  }

  async postGoodsReceipt(id: string, authUser: AuthUserContext): Promise<GoodsReceiptWithDetails> {
    return db.transaction(async (tx) => {
      return this.executePostGrn(id, authUser, tx);
    });
  }

  /**
   * Atomic internal method to post a GRN:
   * 1. Locks GRN, PO, and PO items
   * 2. Validates remaining quantities
   * 3. Increases inventory via StockService.addStock()
   * 4. Updates PO items received quantities
   * 5. Updates PO status
   * 6. Marks GRN as POSTED
   */
  private async executePostGrn(
    grnId: string,
    authUser: AuthUserContext,
    tx: any
  ): Promise<GoodsReceiptWithDetails> {
    const grn = await this.grnRepo.lockGrnForUpdate(grnId, tx);

    if (grn.status === GRN_STATUSES.POSTED) {
      throw AppError.conflict(
        `Goods receipt ${grn.grnNumber} is already POSTED. Reposting is not allowed.`,
        'GRN_ALREADY_POSTED'
      );
    }

    if (grn.status === GRN_STATUSES.CANCELLED) {
      throw AppError.badRequest(`Cannot post a CANCELLED goods receipt`, undefined, 'GRN_CANCELLED');
    }

    // Lock PO
    const po = await this.poRepo.lockPoForUpdate(grn.purchaseOrderId, tx);
    if (po.status === PO_STATUSES.CANCELLED) {
      throw AppError.badRequest('Cannot receive goods against a CANCELLED purchase order', undefined, 'PO_CANCELLED');
    }
    if (po.status === PO_STATUSES.FULLY_RECEIVED) {
      throw AppError.badRequest('Purchase order is already FULLY_RECEIVED', undefined, 'PO_FULLY_RECEIVED');
    }

    // Lock PO items
    const poItems = await this.poRepo.lockPoItemsForUpdate(po.id, tx);
    const poItemMap = new Map(poItems.map((item) => [item.id, item]));

    // Fetch GRN items
    const fullGrn = await this.grnRepo.findById(grn.id, tx);
    if (!fullGrn || !fullGrn.items || fullGrn.items.length === 0) {
      throw AppError.badRequest('Goods receipt has no items to post', undefined, 'EMPTY_GRN_ITEMS');
    }

    // Process each GRN item
    for (const item of fullGrn.items) {
      const poItem = poItemMap.get(item.purchaseOrderItemId);
      if (!poItem) {
        throw AppError.badRequest(
          `Associated PO item ${item.purchaseOrderItemId} not found on PO ${po.poNumber}`,
          undefined,
          'PO_ITEM_NOT_FOUND'
        );
      }

      const currentReceived = poItem.receivedQuantity || 0;
      const remaining = poItem.quantity - currentReceived;

      if (item.receivedQuantity > remaining) {
        throw AppError.badRequest(
          `Over-receipt rejected on posting. Item remaining: ${remaining}, Attempted: ${item.receivedQuantity}`,
          undefined,
          'OVER_RECEIPT_REJECTED'
        );
      }

      // 7. Call StockService.addStock() for every received product
      await this.stockService.addStock(
        {
          productId: item.productId,
          quantity: item.receivedQuantity,
          referenceType: INVENTORY_REFERENCE_TYPES.PURCHASE_RECEIPT,
          referenceId: grn.id,
          reason: `Received against GRN ${grn.grnNumber} for PO ${po.poNumber}`,
        },
        authUser,
        tx
      );

      // 8. Update PO item received quantity
      const newReceived = currentReceived + item.receivedQuantity;
      await this.poRepo.updateItemReceivedQuantity(poItem.id, newReceived, tx);
      poItem.receivedQuantity = newReceived;
    }

    // 9. Determine new PO status
    let allFullyReceived = true;
    for (const poItem of poItems) {
      if ((poItem.receivedQuantity || 0) < poItem.quantity) {
        allFullyReceived = false;
        break;
      }
    }

    const newPoStatus = allFullyReceived ? PO_STATUSES.FULLY_RECEIVED : PO_STATUSES.PARTIALLY_RECEIVED;
    await this.poRepo.update(po.id, { status: newPoStatus }, tx);

    // 10. Update GRN status to POSTED
    await this.grnRepo.update(grn.id, { status: GRN_STATUSES.POSTED }, tx);

    return this.grnRepo.findById(grn.id, tx) as Promise<GoodsReceiptWithDetails>;
  }

  async getGoodsReceiptById(id: string): Promise<GoodsReceiptWithDetails> {
    const grn = await this.grnRepo.findById(id);
    if (!grn) {
      throw AppError.notFound(`Goods receipt with ID "${id}" was not found`, 'GRN_NOT_FOUND');
    }
    return grn;
  }

  async listGoodsReceipts(query: ListGoodsReceiptsQuery): Promise<{ data: any[]; total: number }> {
    return this.grnRepo.find(query);
  }
}
