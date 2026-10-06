import { sql, eq } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { DispatchRepository, DispatchFilter } from '../repositories/dispatch.repository.js';
import { DispatchNumberService } from './dispatch-number.service.js';
import { StockService } from '../../inventory/services/stock.service.js';
import { salesOrders, salesOrderItems } from '../../../database/schema/sales-orders.js';
import { quotations } from '../../../database/schema/quotations.js';
import { leads, leadActivityLogs } from '../../../database/schema/leads.js';
import { customers } from '../../../database/schema/customers.js';
import { products } from '../../../database/schema/products.js';
import { dispatches, dispatchItems, DispatchEntity } from '../../../database/schema/dispatch.js';
import { customerEquipment } from '../../../database/schema/customer-equipment.js';
import { CustomerEquipmentNumberService } from '../../customer-equipment/services/customer-equipment-number.service.js';
import {
  DISPATCH_STATUSES,
  SO_STATUSES,
  SO_DISPATCH_STATUSES,
  INVENTORY_REFERENCE_TYPES,
} from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

export interface CreateDispatchInput {
  salesOrderId: string;
  salesInvoiceId?: string;
  dispatchDate?: string | Date;
  vehicleNumber?: string;
  transporterName?: string;
  transporterContact?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
  items?: Array<{
    salesOrderItemId: string;
    salesInvoiceItemId?: string;
    dispatchQuantity: number;
  }>;
}

export interface UpdateDispatchInput {
  dispatchDate?: string | Date;
  vehicleNumber?: string;
  transporterName?: string;
  transporterContact?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
  items?: Array<{
    salesOrderItemId: string;
    salesInvoiceItemId?: string;
    dispatchQuantity: number;
  }>;
}

export class DispatchService {
  constructor(
    private readonly dispatchRepo: DispatchRepository = new DispatchRepository(),
    private readonly numberService: DispatchNumberService = new DispatchNumberService(),
    private readonly stockService: StockService = new StockService(),
    private readonly equipmentNumberService: CustomerEquipmentNumberService = new CustomerEquipmentNumberService()
  ) {}

  /**
   * List Dispatches with filters and pagination
   */
  async listDispatches(filter: DispatchFilter) {
    return this.dispatchRepo.findAll(filter);
  }

  /**
   * Get Dispatch by ID with detailed joins
   */
  async getDispatchById(id: string) {
    const dispatch = await this.dispatchRepo.findByIdWithDetails(id);
    if (!dispatch) {
      throw AppError.notFound(`Dispatch with ID "${id}" was not found`, 'DISPATCH_NOT_FOUND');
    }
    return dispatch;
  }

  /**
   * Get Dispatchable items, remaining dispatchable quantities, and physical stock for a Sales Order
   */
  async getDispatchableItems(salesOrderId: string) {
    const soRes = await db.execute(
      sql`SELECT so.*, c.name as customer_name, c.company_name as customer_company_name,
              q.quotation_type as quotation_type
          FROM sales_orders so
          LEFT JOIN customers c ON c.id = so.customer_id
          LEFT JOIN quotations q ON q.id = so.quotation_id
          WHERE so.id = ${salesOrderId}`
    );
    const soRows = soRes.rows || soRes;
    if (!soRows || soRows.length === 0) {
      throw AppError.notFound(`Sales Order "${salesOrderId}" not found`, 'SALES_ORDER_NOT_FOUND');
    }
    const so = soRows[0] as any;

    // AMC Sales Orders represent service contracts – physical dispatch is NOT allowed.
    if (so.quotation_type === 'AMC') {
      throw AppError.badRequest(
        'AMC Sales Orders cannot be dispatched because they represent service contracts, not physical product sales.',
        { quotationType: 'AMC' },
        'AMC_DISPATCH_NOT_ALLOWED'
      );
    }

    const itemsRes = await db.execute(
      sql`SELECT soi.*, COALESCE(p.stock_quantity, 0) as physical_stock
          FROM sales_order_items soi
          LEFT JOIN products p ON p.id = soi.product_id
          WHERE soi.sales_order_id = ${salesOrderId}
          ORDER BY soi.sort_order ASC`
    );
    const itemsRows = (itemsRes.rows || itemsRes) as any[];

    const items = [];
    for (const item of itemsRows) {
      const orderedQuantity = Number(item.quantity || 0);
      const previouslyDispatched = await this.dispatchRepo.getDispatchedQuantityForSoItem(item.id);
      const remainingDispatchable = Math.max(0, orderedQuantity - previouslyDispatched);
      const currentPhysicalStock = Number(item.physical_stock || 0);

      items.push({
        salesOrderItemId: item.id,
        productId: item.product_id,
        productName: item.product_name_snapshot,
        sku: item.sku_snapshot || null,
        description: item.description_snapshot || null,
        hsnSac: item.hsn_sac_snapshot || null,
        unit: item.unit_snapshot || 'NOS',
        orderedQuantity,
        previouslyDispatchedQuantity: previouslyDispatched,
        remainingDispatchableQuantity: remainingDispatchable,
        currentPhysicalStock,
      });
    }

    return {
      salesOrderId: so.id,
      orderNumber: so.sales_order_number,
      customerId: so.customer_id,
      customerName: so.customer_company_name || so.customer_name || 'Customer',
      shippingAddress: so.shipping_address || '',
      shippingCity: so.shipping_city || undefined,
      shippingState: so.shipping_state || undefined,
      shippingPincode: so.shipping_pincode || undefined,
      soStatus: so.status,
      dispatchStatus: so.dispatch_status,
      items,
    };
  }

  /**
   * Create a new Dispatch from an eligible Sales Order (and optional Invoice).
   *
   * INVARIANT: Starts in DRAFT. Does NOT alter inventory or write stock movements.
   */
  async createDispatch(input: CreateDispatchInput, authUser: { id: string; userId?: string }): Promise<DispatchEntity> {
    if (!input.salesOrderId) {
      throw AppError.badRequest('Sales Order ID is required to create a Dispatch', undefined, 'SALES_ORDER_REQUIRED');
    }

    return db.transaction(async (tx) => {
      // 1. Lock Sales Order row (join quotation to get quotationType)
      const soRes = await tx.execute(
        sql`SELECT so.*, q.quotation_type as quotation_type
            FROM sales_orders so
            LEFT JOIN quotations q ON q.id = so.quotation_id
            WHERE so.id = ${input.salesOrderId} FOR UPDATE OF so`
      );
      const soRows = soRes.rows || soRes;
      if (!soRows || soRows.length === 0) {
        throw AppError.notFound(`Sales Order "${input.salesOrderId}" not found`, 'SALES_ORDER_NOT_FOUND');
      }
      const so = soRows[0] as any;

      // AMC Sales Orders are service contracts – physical dispatch is NOT allowed.
      // This guard runs before all other checks to enforce the business rule at the backend level.
      if (so.quotation_type === 'AMC') {
        throw AppError.badRequest(
          'AMC Sales Orders cannot be dispatched because they represent service contracts, not physical product sales.',
          { quotationType: 'AMC', salesOrderId: input.salesOrderId },
          'AMC_DISPATCH_NOT_ALLOWED'
        );
      }

      // 2. Validate Sales Order eligibility
      const eligibleStatuses = [
        SO_STATUSES.CONFIRMED,
        SO_STATUSES.PARTIALLY_INVOICED,
        SO_STATUSES.FULLY_INVOICED,
        SO_STATUSES.PARTIALLY_DISPATCHED,
      ];

      if (!eligibleStatuses.includes(so.status)) {
        throw AppError.badRequest(
          `Cannot dispatch Sales Order with status "${so.status}". Order must be CONFIRMED or INVOICED.`,
          { currentStatus: so.status },
          'SALES_ORDER_NOT_DISPATCHABLE'
        );
      }

      // 3. Fetch Customer info for snapshot
      const custRes = await tx.execute(
        sql`SELECT * FROM customers WHERE id = ${so.customer_id}`
      );
      const custRows = custRes.rows || custRes;
      const cust = custRows && custRows.length > 0 ? (custRows[0] as any) : null;

      // 4. Fetch Sales Order Items with row lock
      const soItemsRes = await tx.execute(
        sql`SELECT * FROM sales_order_items WHERE sales_order_id = ${so.id} ORDER BY sort_order ASC FOR UPDATE`
      );
      const soItemRows = (soItemsRes.rows || soItemsRes) as any[];

      if (!soItemRows || soItemRows.length === 0) {
        throw AppError.badRequest('Sales Order has no line items to dispatch', undefined, 'NO_SO_ITEMS');
      }

      // 5. Determine dispatch items to create
      const itemsToCreate: any[] = [];
      let totalRequestedQuantity = 0;

      for (let i = 0; i < soItemRows.length; i++) {
        const soItem = soItemRows[i];
        const soQty = Number(soItem.quantity);

        // Calculate already dispatched quantity
        const alreadyDispatched = await this.dispatchRepo.getDispatchedQuantityForSoItem(soItem.id, tx);
        const remainingDispatchable = Math.max(0, soQty - alreadyDispatched);

        // Check if caller supplied explicit item quantities
        let reqQty = remainingDispatchable;
        let invoiceItemId: string | null = null;

        if (input.items && input.items.length > 0) {
          const match = input.items.find((it) => it.salesOrderItemId === soItem.id);
          if (match) {
            reqQty = Number(match.dispatchQuantity);
            invoiceItemId = match.salesInvoiceItemId || null;
          } else {
            reqQty = 0; // Skip if explicit items provided and this item wasn't included
          }
        }

        if (reqQty <= 0) {
          continue; // Nothing to dispatch for this line
        }

        if (reqQty > remainingDispatchable) {
          throw AppError.badRequest(
            `Requested dispatch quantity (${reqQty}) exceeds remaining dispatchable quantity (${remainingDispatchable}) for product "${soItem.product_name_snapshot}"`,
            {
              salesOrderItemId: soItem.id,
              orderedQuantity: soQty,
              alreadyDispatched,
              remainingDispatchable,
              requestedQuantity: reqQty,
            },
            'EXCESSIVE_DISPATCH_QUANTITY'
          );
        }

        totalRequestedQuantity += reqQty;

        itemsToCreate.push({
          salesOrderItemId: soItem.id,
          salesInvoiceItemId: invoiceItemId,
          productId: soItem.product_id,
          productNameSnapshot: soItem.product_name_snapshot,
          skuSnapshot: soItem.sku_snapshot,
          descriptionSnapshot: soItem.description_snapshot,
          hsnSacSnapshot: soItem.hsn_sac_snapshot,
          unitSnapshot: soItem.unit_snapshot || 'NOS',
          orderedQuantity: String(soQty),
          invoicedQuantity: '0',
          previouslyDispatchedQuantity: String(alreadyDispatched),
          dispatchQuantity: String(reqQty),
          sortOrder: i,
        });
      }

      if (itemsToCreate.length === 0 || totalRequestedQuantity <= 0) {
        throw AppError.badRequest(
          'No remaining dispatchable quantity available for this Sales Order',
          undefined,
          'ALL_ITEMS_ALREADY_DISPATCHED'
        );
      }

      // 6. Generate authoritative sequential Delivery Challan / Dispatch number
      const dispatchDate = input.dispatchDate ? new Date(input.dispatchDate) : new Date();
      const dispatchNumber = await this.numberService.generateDispatchNumber(dispatchDate, tx);

      // 7. Create Dispatch record
      const [dispatch] = await tx
        .insert(dispatches)
        .values({
          dispatchNumber,
          deliveryChallanNumber: dispatchNumber, // Unified identifier
          salesOrderId: so.id,
          customerId: so.customer_id,
          salesInvoiceId: input.salesInvoiceId || null,
          dispatchDate,
          status: DISPATCH_STATUSES.DRAFT,
          vehicleNumber: input.vehicleNumber || null,
          transporterName: input.transporterName || null,
          transporterContact: input.transporterContact || null,
          driverName: input.driverName || null,
          driverPhone: input.driverPhone || null,
          customerNameSnapshot: cust?.name || so.customer_name_snapshot || 'Customer',
          customerGstinSnapshot: cust?.gstin || null,
          shippingName: so.shipping_name || cust?.name || null,
          shippingAddress: so.shipping_address || cust?.address || null,
          shippingCity: so.shipping_city || cust?.city || null,
          shippingState: so.shipping_state || cust?.state || null,
          shippingPincode: so.shipping_pincode || cust?.pincode || null,
          notes: input.notes || null,
          createdById: authUser.userId || authUser.id,
        })
        .returning();

      // 8. Create Dispatch items
      const itemRowsToInsert = itemsToCreate.map((item) => ({
        ...item,
        dispatchId: dispatch.id,
      }));
      await tx.insert(dispatchItems).values(itemRowsToInsert);

      // 9. Append audit log
      await this.dispatchRepo.createActivityLog(
        {
          dispatchId: dispatch.id,
          action: 'CREATED',
          actorId: authUser.userId || authUser.id,
          notes: `Dispatch draft created with ${itemsToCreate.length} line item(s)`,
        },
        tx
      );

      return dispatch;
    });
  }

  /**
   * Update Dispatch (DRAFT only)
   */
  async updateDispatch(
    id: string,
    input: UpdateDispatchInput,
    authUser: { id: string; userId?: string }
  ): Promise<DispatchEntity> {
    return db.transaction(async (tx) => {
      const dispatch = await this.dispatchRepo.findById(id, tx);
      if (!dispatch) {
        throw AppError.notFound(`Dispatch "${id}" not found`, 'DISPATCH_NOT_FOUND');
      }

      if (dispatch.status !== DISPATCH_STATUSES.DRAFT) {
        throw AppError.badRequest(
          `Cannot edit dispatch with status "${dispatch.status}". Only DRAFT dispatches can be edited.`,
          { currentStatus: dispatch.status },
          'DISPATCH_LOCKED'
        );
      }

      const updateData: any = {};
      if (input.dispatchDate) updateData.dispatchDate = new Date(input.dispatchDate);
      if (input.vehicleNumber !== undefined) updateData.vehicleNumber = input.vehicleNumber;
      if (input.transporterName !== undefined) updateData.transporterName = input.transporterName;
      if (input.transporterContact !== undefined) updateData.transporterContact = input.transporterContact;
      if (input.driverName !== undefined) updateData.driverName = input.driverName;
      if (input.driverPhone !== undefined) updateData.driverPhone = input.driverPhone;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const updated = await this.dispatchRepo.update(id, updateData, tx);

      // If items provided, re-validate and replace items
      if (input.items && input.items.length > 0) {
        const soItemIds = input.items.map((it) => it.salesOrderItemId);
        const soItemsRes = await tx.execute(
          sql`SELECT * FROM sales_order_items WHERE id = ANY(${soItemIds}) FOR UPDATE`
        );
        const soItemRows = (soItemsRes.rows || soItemsRes) as any[];

        await this.dispatchRepo.deleteItemsByDispatchId(id, tx);

        const newItems: any[] = [];
        for (let i = 0; i < input.items.length; i++) {
          const reqItem = input.items[i];
          const soItem = soItemRows.find((r) => r.id === reqItem.salesOrderItemId);
          if (!soItem) continue;

          const soQty = Number(soItem.quantity);
          const alreadyDispatched = await this.dispatchRepo.getDispatchedQuantityForSoItem(soItem.id, tx);
          const remainingDispatchable = Math.max(0, soQty - alreadyDispatched);

          if (reqItem.dispatchQuantity > remainingDispatchable) {
            throw AppError.badRequest(
              `Requested dispatch quantity (${reqItem.dispatchQuantity}) exceeds remaining dispatchable quantity (${remainingDispatchable})`,
              { salesOrderItemId: soItem.id, remainingDispatchable, requested: reqItem.dispatchQuantity },
              'EXCESSIVE_DISPATCH_QUANTITY'
            );
          }

          newItems.push({
            dispatchId: id,
            salesOrderItemId: soItem.id,
            salesInvoiceItemId: reqItem.salesInvoiceItemId || null,
            productId: soItem.product_id,
            productNameSnapshot: soItem.product_name_snapshot,
            skuSnapshot: soItem.sku_snapshot,
            descriptionSnapshot: soItem.description_snapshot,
            hsnSacSnapshot: soItem.hsn_sac_snapshot,
            unitSnapshot: soItem.unit_snapshot || 'NOS',
            orderedQuantity: String(soQty),
            invoicedQuantity: '0',
            previouslyDispatchedQuantity: String(alreadyDispatched),
            dispatchQuantity: String(reqItem.dispatchQuantity),
            sortOrder: i,
          });
        }

        if (newItems.length > 0) {
          await this.dispatchRepo.createItems(newItems, tx);
        }
      }

      await this.dispatchRepo.createActivityLog(
        {
          dispatchId: id,
          action: 'UPDATED',
          actorId: authUser.userId || authUser.id,
          notes: 'Dispatch details updated',
        },
        tx
      );

      return updated;
    });
  }

  /**
   * Submit Dispatch (DRAFT -> PENDING_DISPATCH)
   *
   * INVARIANT: No stock mutation occurs!
   */
  async submitDispatch(id: string, authUser: { id: string; userId?: string }): Promise<DispatchEntity> {
    return db.transaction(async (tx) => {
      const dispatch = await this.dispatchRepo.findById(id, tx);
      if (!dispatch) {
        throw AppError.notFound(`Dispatch "${id}" not found`, 'DISPATCH_NOT_FOUND');
      }

      if (dispatch.status !== DISPATCH_STATUSES.DRAFT) {
        throw AppError.badRequest(
          `Cannot submit dispatch with status "${dispatch.status}". Only DRAFT dispatches can be submitted.`,
          { currentStatus: dispatch.status },
          'INVALID_STATUS_TRANSITION'
        );
      }

      const updated = await this.dispatchRepo.update(
        id,
        { status: DISPATCH_STATUSES.PENDING_DISPATCH },
        tx
      );

      await this.dispatchRepo.createActivityLog(
        {
          dispatchId: id,
          action: 'SUBMITTED',
          actorId: authUser.userId || authUser.id,
          notes: 'Dispatch submitted for authorization & Stock OUT',
        },
        tx
      );

      return updated;
    });
  }

  /**
   * Confirm Dispatch / Execute Physical Stock OUT (PENDING_DISPATCH -> DISPATCHED)
   *
   * CRITICAL INVARIANTS:
   * 1. This is the ONLY operation that executes Stock OUT.
   * 2. Stock OUT is performed exclusively through StockService.removeStock().
   * 3. Row locks product and sales_order_item rows.
   * 4. Idempotent at business level: re-dispatching is rejected.
   * 5. If ANY line fails (e.g. INSUFFICIENT_STOCK), transaction rolls back completely.
   */
  async confirmDispatch(id: string, authUser: { id: string; userId?: string }): Promise<DispatchEntity> {
    return db.transaction(async (tx) => {
      // 1. Lock dispatch row
      const dispatchRes = await tx.execute(
        sql`SELECT * FROM dispatches WHERE id = ${id} FOR UPDATE`
      );
      const dispatchRows = dispatchRes.rows || dispatchRes;
      if (!dispatchRows || dispatchRows.length === 0) {
        throw AppError.notFound(`Dispatch "${id}" not found`, 'DISPATCH_NOT_FOUND');
      }
      const dispatch = dispatchRows[0] as any;

      // 2. Idempotency & Status Checks
      if (dispatch.status === DISPATCH_STATUSES.DISPATCHED) {
        throw AppError.conflict(
          'DISPATCH_ALREADY_COMPLETED: This dispatch has already been confirmed and goods have already been deducted from inventory.',
          'DISPATCH_ALREADY_COMPLETED'
        );
      }

      if (dispatch.status === DISPATCH_STATUSES.CANCELLED) {
        throw AppError.badRequest(
          'CANNOT_DISPATCH_CANCELLED: Cannot dispatch a cancelled dispatch record.',
          undefined,
          'CANNOT_DISPATCH_CANCELLED'
        );
      }

      // Must be PENDING_DISPATCH or DRAFT
      if (
        dispatch.status !== DISPATCH_STATUSES.PENDING_DISPATCH &&
        dispatch.status !== DISPATCH_STATUSES.DRAFT
      ) {
        throw AppError.badRequest(
          `Cannot confirm dispatch in status "${dispatch.status}".`,
          { currentStatus: dispatch.status },
          'INVALID_STATUS_TRANSITION'
        );
      }

      // 3. Lock Sales Order row
      const soRes = await tx.execute(
        sql`SELECT * FROM sales_orders WHERE id = ${dispatch.sales_order_id} FOR UPDATE`
      );
      const soRows = soRes.rows || soRes;
      const salesOrder = soRows[0] as any;

      // 4. Fetch dispatch items
      const items = await this.dispatchRepo.getItemsByDispatchId(id, tx);
      if (!items || items.length === 0) {
        throw AppError.badRequest('Dispatch has no items to dispatch', undefined, 'NO_DISPATCH_ITEMS');
      }

      // 5. Process each item: validate and execute StockService.removeStock()
      for (const item of items) {
        const qtyToDeduct = Number(item.dispatchQuantity);
        if (qtyToDeduct <= 0) continue;

        // Lock Sales Order Item
        const soItemRes = await tx.execute(
          sql`SELECT * FROM sales_order_items WHERE id = ${item.salesOrderItemId} FOR UPDATE`
        );
        const soItemRows = (soItemRes.rows || soItemRes) as any[];
        if (!soItemRows || soItemRows.length === 0) {
          throw AppError.notFound(`Sales Order item "${item.salesOrderItemId}" not found`, 'SO_ITEM_NOT_FOUND');
        }
        const soItem = soItemRows[0];
        const soQty = Number(soItem.quantity);

        // Validate that this dispatch will not exceed total SO quantity
        const alreadyDispatched = await this.dispatchRepo.getDispatchedQuantityForSoItem(soItem.id, tx);
        const remainingQuantity = soQty - alreadyDispatched;

        if (qtyToDeduct > remainingQuantity) {
          throw AppError.badRequest(
            `Cannot dispatch ${qtyToDeduct} units of "${item.productNameSnapshot}". Remaining dispatchable quantity on Sales Order is ${remainingQuantity}.`,
            {
              productId: item.productId,
              requestedQuantity: qtyToDeduct,
              remainingQuantity,
              alreadyDispatched,
              orderedQuantity: soQty,
            },
            'EXCESSIVE_DISPATCH_QUANTITY'
          );
        }

        // Lock product row and execute physical stock OUT via StockService
        // StockService.removeStock will verify physical available stock >= qtyToDeduct,
        // throw INSUFFICIENT_STOCK if negative, update products.stockQuantity, and append ledger movement.
        await this.stockService.removeStock(
          {
            productId: item.productId,
            quantity: qtyToDeduct,
            referenceType: INVENTORY_REFERENCE_TYPES.SALES_DISPATCH,
            referenceId: dispatch.id,
            reason: `Dispatch ${dispatch.dispatch_number} for Sales Order ${salesOrder.sales_order_number}`,
          },
          authUser,
          tx
        );
      }

      // 6. Update Sales Order dispatch status
      // Calculate total ordered vs total dispatched across all SO items
      const allSoItemsRes = await tx.execute(
        sql`SELECT id, quantity FROM sales_order_items WHERE sales_order_id = ${salesOrder.id}`
      );
      const allSoItems = (allSoItemsRes.rows || allSoItemsRes) as any[];

      let allFullyDispatched = true;
      let anyDispatched = false;

      for (const soi of allSoItems) {
        const totalDisp =
          (await this.dispatchRepo.getDispatchedQuantityForSoItem(soi.id, tx)) +
          // Add current dispatch's quantity for this item
          (items
            .filter((it) => it.salesOrderItemId === soi.id)
            .reduce((sum, it) => sum + Number(it.dispatchQuantity), 0));

        if (totalDisp > 0) anyDispatched = true;
        if (totalDisp < Number(soi.quantity)) allFullyDispatched = false;
      }

      const nextDispatchStatus = allFullyDispatched
        ? SO_DISPATCH_STATUSES.FULLY_DISPATCHED
        : anyDispatched
        ? SO_DISPATCH_STATUSES.PARTIALLY_DISPATCHED
        : SO_DISPATCH_STATUSES.NOT_DISPATCHED;

      await tx
        .update(salesOrders)
        .set({
          dispatchStatus: nextDispatchStatus,
          updatedAt: new Date(),
        })
        .where(eq(salesOrders.id, salesOrder.id));

      // 7. Mark dispatch as DISPATCHED
      const [updatedDispatch] = await tx
        .update(dispatches)
        .set({
          status: DISPATCH_STATUSES.DISPATCHED,
          dispatchedById: authUser.userId || authUser.id,
          dispatchedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dispatches.id, id))
        .returning();

      // 7b. Create Customer Equipment records for all physically dispatched units
      // Invariant: One customer_equipment record per physical unit (qty=5 -> 5 records)
      // Transactional: Inside the same db.transaction (rolls back stock deduction on failure)
      let destinationId: string | null = null;
      if (salesOrder.quotation_id) {
        const quoRes = await tx.execute(
          sql`SELECT destination_id FROM quotations WHERE id = ${salesOrder.quotation_id}`
        );
        const quoRows = (quoRes.rows || quoRes) as any[];
        if (quoRows.length > 0 && quoRows[0].destination_id) {
          destinationId = quoRows[0].destination_id;
        }
      }

      for (const item of items) {
        const qty = Number(item.dispatchQuantity);
        if (qty <= 0) continue;
        const count = Math.round(qty);

        // Fetch current maximum unit_index for this SO item to support partial deliveries (e.g. 1..4 then 5..10)
        const unitIndexRes = await tx.execute(
          sql`SELECT COALESCE(MAX(unit_index), 0) as max_unit_index FROM customer_equipment WHERE sales_order_item_id = ${item.salesOrderItemId}`
        );
        const unitIndexRows = (unitIndexRes.rows || unitIndexRes) as any[];
        const currentMax = Number(unitIndexRows[0]?.max_unit_index || 0);
        const startUnitIndex = currentMax + 1;

        // Fetch SO item quantity to ensure we never exceed original ordered quantity
        const soItemRes = await tx.execute(
          sql`SELECT quantity FROM sales_order_items WHERE id = ${item.salesOrderItemId}`
        );
        const soItemRows = (soItemRes.rows || soItemRes) as any[];
        const maxAllowed = Number(soItemRows[0]?.quantity || count);

        if (startUnitIndex + count - 1 > maxAllowed) {
          throw AppError.badRequest(
            `Cannot create ${count} equipment units. Existing units (${currentMax}) + requested (${count}) exceeds ordered quantity (${maxAllowed}).`,
            { salesOrderItemId: item.salesOrderItemId, currentMax, requested: count, maxAllowed },
            'EXCESSIVE_EQUIPMENT_QUANTITY'
          );
        }

        // Generate count sequential asset numbers atomically
        const assetNumbers = await this.equipmentNumberService.generateAssetNumbers(
          count,
          updatedDispatch.dispatchedAt || new Date(),
          tx
        );

        const equipmentToInsert = [];
        for (let i = 0; i < count; i++) {
          equipmentToInsert.push({
            assetNumber: assetNumbers[i],
            customerId: dispatch.customer_id,
            productId: item.productId,
            salesOrderId: dispatch.sales_order_id,
            salesOrderItemId: item.salesOrderItemId,
            salesInvoiceId: dispatch.sales_invoice_id || null,
            salesInvoiceItemId: item.salesInvoiceItemId || null,
            deliveryId: dispatch.id,
            deliveryItemId: item.id,
            unitIndex: startUnitIndex + i,
            serialNumber: null,
            productName: item.productNameSnapshot,
            sku: item.skuSnapshot || null,
            model: null,
            make: null,
            capacityRating: null,
            hsnSac: item.hsnSacSnapshot || null,
            destinationId: destinationId,
            installationLocation: null,
            installationNotes: null,
            installationDate: null,
            deliveryDate: updatedDispatch.dispatchedAt || new Date(),
            warrantyStartDate: null,
            warrantyEndDate: null,
            warrantyTermsSnapshot: null,
            conditionStatus: 'OPERATIONAL',
            assetStatus: 'ACTIVE',
            createdById: authUser.userId || authUser.id,
            updatedById: authUser.userId || authUser.id,
          });
        }

        if (equipmentToInsert.length > 0) {
          await tx.insert(customerEquipment).values(equipmentToInsert);
        }
      }

      // 8. Log audit trail
      await this.dispatchRepo.createActivityLog(
        {
          dispatchId: id,
          action: 'DISPATCHED',
          actorId: authUser.userId || authUser.id,
          notes: `Stock OUT completed. Dispatched against SO ${salesOrder.sales_order_number}. Dispatch status is now ${nextDispatchStatus}.`,
        },
        tx
      );

      // 9. Synchronize Deals Pipeline stage to 'Dispatched'
      if (salesOrder.customer_id) {
        try {
          const matchedLeads = await tx
            .select({ id: leads.id })
            .from(leads)
            .where(eq(leads.linkedClientId, salesOrder.customer_id));

          for (const ld of matchedLeads) {
            await tx
              .update(leads)
              .set({ status: 'Dispatched', updatedAt: new Date() })
              .where(eq(leads.id, ld.id));

            await tx.insert(leadActivityLogs).values({
              id: `act-${ld.id}-${Date.now()}`,
              leadId: ld.id,
              title: `Inventory stock outward recorded against SO ${salesOrder.sales_order_number} — pipeline moved to Dispatched`,
              date: new Date().toISOString().split('T')[0],
              type: 'System',
            });
          }
        } catch {
          // Non-blocking
        }
      }

      return updatedDispatch;
    });
  }

  /**
   * Cancel Dispatch
   *
   * RULES:
   * - Cannot cancel an already DISPATCHED record (stock has already left).
   * - Requires mandatory non-empty cancellation reason.
   */
  async cancelDispatch(
    id: string,
    reason: string,
    authUser: { id: string; userId?: string }
  ): Promise<DispatchEntity> {
    if (!reason || !reason.trim()) {
      throw AppError.badRequest('Cancellation reason is required', undefined, 'CANCELLATION_REASON_REQUIRED');
    }

    return db.transaction(async (tx) => {
      const dispatch = await this.dispatchRepo.findById(id, tx);
      if (!dispatch) {
        throw AppError.notFound(`Dispatch "${id}" not found`, 'DISPATCH_NOT_FOUND');
      }

      if (dispatch.status === DISPATCH_STATUSES.DISPATCHED) {
        throw AppError.badRequest(
          'CANNOT_CANCEL_DISPATCHED: A dispatched Delivery Challan cannot be cancelled because inventory has already been deducted. A formal Sales Return workflow must be used.',
          undefined,
          'CANNOT_CANCEL_DISPATCHED'
        );
      }

      if (dispatch.status === DISPATCH_STATUSES.CANCELLED) {
        throw AppError.badRequest('Dispatch is already cancelled', undefined, 'ALREADY_CANCELLED');
      }

      const updated = await this.dispatchRepo.update(
        id,
        {
          status: DISPATCH_STATUSES.CANCELLED,
          cancelledById: authUser.userId || authUser.id,
          cancelledAt: new Date(),
          cancellationReason: reason.trim(),
        },
        tx
      );

      await this.dispatchRepo.createActivityLog(
        {
          dispatchId: id,
          action: 'CANCELLED',
          actorId: authUser.userId || authUser.id,
          notes: `Cancelled. Reason: ${reason.trim()}`,
        },
        tx
      );

      return updated;
    });
  }
}
