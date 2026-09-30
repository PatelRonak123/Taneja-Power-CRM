import { sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { suppliers, purchaseOrders, purchaseOrderItems, goodsReceipts, goodsReceiptItems } from '../../../database/schema/procurement.js';
import {
  vendorInvoices,
  vendorInvoiceItems,
  VendorInvoiceEntity,
} from '../../../database/schema/invoices.js';
import {
  VendorInvoiceRepository,
  ListVendorInvoicesQuery,
  VendorInvoiceWithDetails,
} from '../repositories/vendor-invoice.repository.js';
import { VENDOR_INVOICE_STATUSES, PO_STATUSES } from '../../../config/constants.js';

export interface CreateVendorInvoiceItemInput {
  purchaseOrderItemId: string;
  goodsReceiptItemId?: string | null;
  invoicedQuantity: number;
  unitCost?: number;
  taxRate?: number;
}

export interface CreateVendorInvoiceInput {
  supplierId: string;
  purchaseOrderId: string;
  goodsReceiptId?: string | null;
  vendorInvoiceNumber: string;
  invoiceDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  items: CreateVendorInvoiceItemInput[];
}

export interface UpdateVendorInvoiceInput {
  dueDate?: string | null;
  notes?: string | null;
}

export class VendorInvoiceService {
  private repo = new VendorInvoiceRepository();

  private round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private fmt(val: number): string {
    return val.toFixed(2);
  }

  /**
   * Create Vendor Invoice (Supplier Bill).
   *
   * INVARIANT: No stock mutation. Stock IN was performed at GRN posting.
   */
  async create(input: CreateVendorInvoiceInput, userId: string): Promise<VendorInvoiceWithDetails> {
    return await db.transaction(async (tx) => {
      // 1. Verify Supplier
      const supRows = await tx.execute(sql`
        SELECT * FROM suppliers WHERE id = ${input.supplierId}
      `);
      const sup: any = (supRows.rows || supRows)[0];
      if (!sup) {
        const err: any = new Error(`Supplier not found: ${input.supplierId}`);
        err.statusCode = 404;
        err.errorCode = 'SUPPLIER_NOT_FOUND';
        throw err;
      }

      // 2. Verify Purchase Order
      const poRows = await tx.execute(sql`
        SELECT * FROM purchase_orders WHERE id = ${input.purchaseOrderId} FOR UPDATE
      `);
      const po: any = (poRows.rows || poRows)[0];
      if (!po) {
        const err: any = new Error(`Purchase Order not found: ${input.purchaseOrderId}`);
        err.statusCode = 404;
        err.errorCode = 'PO_NOT_FOUND';
        throw err;
      }

      if (po.supplier_id !== input.supplierId) {
        const err: any = new Error('Purchase Order does not belong to the specified supplier');
        err.statusCode = 400;
        err.errorCode = 'PO_SUPPLIER_MISMATCH';
        throw err;
      }

      // Check PO status: cannot invoice CANCELLED or DRAFT PO
      const unbillableStatuses: string[] = [PO_STATUSES.DRAFT, PO_STATUSES.PENDING_APPROVAL, PO_STATUSES.CANCELLED];
      if (unbillableStatuses.includes(po.status)) {
        const err: any = new Error(`Cannot invoice Purchase Order in status "${po.status}"`);
        err.statusCode = 400;
        err.errorCode = 'PO_NOT_BILLABLE';
        throw err;
      }

      // 3. Verify Supplier Invoice Number Uniqueness per Supplier
      const trimmedInvoiceNum = input.vendorInvoiceNumber.trim();
      const existingSameNumber = await this.repo.findBySupplierAndInvoiceNumber(
        input.supplierId,
        trimmedInvoiceNum,
        tx
      );
      if (existingSameNumber) {
        const err: any = new Error(
          `Invoice number "${trimmedInvoiceNum}" already exists for supplier "${sup.name}"`
        );
        err.statusCode = 409;
        err.errorCode = 'DUPLICATE_VENDOR_INVOICE';
        throw err;
      }

      // 4. Fetch PO items for pricing and received quantity checks
      const poItemRows = await tx.execute(sql`
        SELECT * FROM purchase_order_items WHERE purchase_order_id = ${input.purchaseOrderId} FOR UPDATE
      `);
      const allPoItems: any[] = (poItemRows.rows || poItemRows) as any[];

      // 5. Get already invoiced quantities for this PO
      const alreadyInvoicedMap = await this.repo.getInvoicedQuantitiesByPurchaseOrderId(input.purchaseOrderId, tx);

      // 6. Build and validate items
      let subtotalNum = 0;
      let taxTotalNum = 0;
      const builtItems: any[] = [];

      for (const itemInput of input.items) {
        const matchedPoItem = allPoItems.find((i: any) => i.id === itemInput.purchaseOrderItemId);
        if (!matchedPoItem) {
          const err: any = new Error(`PO item not found: ${itemInput.purchaseOrderItemId}`);
          err.statusCode = 400;
          err.errorCode = 'PO_ITEM_NOT_FOUND';
          throw err;
        }

        const orderedQty = Number(matchedPoItem.quantity);
        const receivedQty = Number(matchedPoItem.received_quantity || 0);
        const alreadyInvoiced = alreadyInvoicedMap.get(matchedPoItem.id) || 0;
        const remainingInvoiceable = Math.max(0, receivedQty - alreadyInvoiced);

        if (itemInput.invoicedQuantity <= 0) {
          const err: any = new Error(`Invoiced quantity for item must be > 0`);
          err.statusCode = 400;
          err.errorCode = 'INVALID_QUANTITY';
          throw err;
        }

        // Enforce rule: invoicedQuantity cannot exceed received quantity (or remaining received quantity)
        if (itemInput.invoicedQuantity > remainingInvoiceable) {
          const err: any = new Error(
            `Invoiced quantity (${itemInput.invoicedQuantity}) exceeds received/uninvoiced quantity (${remainingInvoiceable}) for product "${matchedPoItem.product_name_snapshot}"`
          );
          err.statusCode = 400;
          err.errorCode = 'EXCEEDS_RECEIVED_QUANTITY';
          throw err;
        }

        // Unit cost authoritative from PO item if not overridden
        const unitCostNum =
          itemInput.unitCost !== undefined && itemInput.unitCost >= 0
            ? Number(itemInput.unitCost)
            : Number(matchedPoItem.unit_cost);

        const taxRateNum =
          itemInput.taxRate !== undefined && itemInput.taxRate >= 0
            ? Number(itemInput.taxRate)
            : Number(matchedPoItem.tax_rate || 0);

        const lineSubtotalNum = this.round(itemInput.invoicedQuantity * unitCostNum);
        const taxAmountNum = this.round(lineSubtotalNum * (taxRateNum / 100));
        const lineTotalNum = this.round(lineSubtotalNum + taxAmountNum);

        subtotalNum = this.round(subtotalNum + lineSubtotalNum);
        taxTotalNum = this.round(taxTotalNum + taxAmountNum);

        builtItems.push({
          purchaseOrderItemId: matchedPoItem.id,
          goodsReceiptItemId: itemInput.goodsReceiptItemId || null,
          productId: matchedPoItem.product_id,
          skuSnapshot: matchedPoItem.sku_snapshot,
          productNameSnapshot: matchedPoItem.product_name_snapshot,
          descriptionSnapshot: matchedPoItem.description_snapshot || null,
          orderedQuantity: orderedQty,
          receivedQuantity: receivedQty,
          invoicedQuantity: itemInput.invoicedQuantity,
          unitCost: this.fmt(unitCostNum),
          taxRate: this.fmt(taxRateNum),
          taxAmount: this.fmt(taxAmountNum),
          lineTotal: this.fmt(lineTotalNum),
        });
      }

      const totalAmountNum = this.round(subtotalNum + taxTotalNum);
      const invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : new Date();

      // 7. Insert vendor invoice
      const newInvoice = await this.repo.insertInvoice(
        {
          vendorInvoiceNumber: trimmedInvoiceNum,
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId,
          goodsReceiptId: input.goodsReceiptId || null,
          invoiceDate,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: VENDOR_INVOICE_STATUSES.DRAFT,
          currency: 'INR',
          subtotal: this.fmt(subtotalNum),
          taxAmount: this.fmt(taxTotalNum),
          totalAmount: this.fmt(totalAmountNum),
          notes: input.notes || null,
          createdBy: userId,
        },
        tx
      );

      // 8. Insert vendor invoice items
      const itemsToInsert = builtItems.map((item) => ({
        ...item,
        vendorInvoiceId: newInvoice.id,
      }));
      await this.repo.insertItems(itemsToInsert, tx);

      // 9. Log activity
      await this.repo.logActivity(
        newInvoice.id,
        'CREATED',
        userId,
        `Vendor invoice ${trimmedInvoiceNum} created against PO ${po.po_number}`,
        tx
      );

      const created = await this.repo.findById(newInvoice.id, tx);
      return created!;
    });
  }

  async getById(id: string): Promise<VendorInvoiceWithDetails> {
    const inv = await this.repo.findById(id);
    if (!inv) {
      const err: any = new Error(`Vendor Invoice not found: ${id}`);
      err.statusCode = 404;
      err.errorCode = 'VENDOR_INVOICE_NOT_FOUND';
      throw err;
    }
    return inv;
  }

  async list(query: ListVendorInvoicesQuery): Promise<{ data: any[]; total: number }> {
    return this.repo.find(query);
  }

  async update(id: string, input: UpdateVendorInvoiceInput, userId: string): Promise<VendorInvoiceWithDetails> {
    const existing = await this.getById(id);
    if (existing.status !== VENDOR_INVOICE_STATUSES.DRAFT) {
      const err: any = new Error(`Only DRAFT vendor invoices can be updated. Current status: "${existing.status}"`);
      err.statusCode = 400;
      err.errorCode = 'CANNOT_EDIT_NON_DRAFT';
      throw err;
    }

    await this.repo.updateStatus(id, VENDOR_INVOICE_STATUSES.DRAFT, {
      dueDate: input.dueDate ? new Date(input.dueDate) : existing.dueDate,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    });

    await this.repo.logActivity(id, 'UPDATED', userId, 'Vendor invoice draft updated');
    return this.getById(id);
  }

  async submit(id: string, userId: string): Promise<VendorInvoiceWithDetails> {
    const existing = await this.getById(id);
    if (existing.status !== VENDOR_INVOICE_STATUSES.DRAFT) {
      const err: any = new Error(`Only DRAFT vendor invoices can be submitted. Current status: "${existing.status}"`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_TRANSITION';
      throw err;
    }

    await this.repo.updateStatus(id, VENDOR_INVOICE_STATUSES.PENDING_VERIFICATION);
    await this.repo.logActivity(id, 'SUBMITTED', userId, 'Vendor invoice submitted for verification');
    return this.getById(id);
  }

  async verify(id: string, userId: string): Promise<VendorInvoiceWithDetails> {
    const existing = await this.getById(id);
    const allowed = [VENDOR_INVOICE_STATUSES.DRAFT, VENDOR_INVOICE_STATUSES.PENDING_VERIFICATION];
    if (!allowed.includes(existing.status as any)) {
      const err: any = new Error(`Cannot verify invoice in status: "${existing.status}"`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_TRANSITION';
      throw err;
    }

    await this.repo.updateStatus(id, VENDOR_INVOICE_STATUSES.VERIFIED, {
      verifiedBy: userId,
      verifiedAt: new Date(),
    });

    await this.repo.logActivity(id, 'VERIFIED', userId, 'Vendor invoice verified against PO and goods receipt');
    return this.getById(id);
  }

  /**
   * Post vendor invoice.
   * INVARIANT: Does NOT touch stock.
   */
  async post(id: string, userId: string): Promise<VendorInvoiceWithDetails> {
    const existing = await this.getById(id);
    const allowed = [VENDOR_INVOICE_STATUSES.VERIFIED];
    if (!allowed.includes(existing.status as any)) {
      const err: any = new Error(
        `Cannot post vendor invoice in status: "${existing.status}". Must be VERIFIED first.`
      );
      err.statusCode = 400;
      err.errorCode = 'INVALID_TRANSITION';
      throw err;
    }

    await this.repo.updateStatus(id, VENDOR_INVOICE_STATUSES.POSTED, {
      postedBy: userId,
      postedAt: new Date(),
    });

    await this.repo.logActivity(id, 'POSTED', userId, 'Vendor invoice officially posted to accounts payable');
    return this.getById(id);
  }

  async cancel(id: string, cancellationReason: string, userId: string): Promise<VendorInvoiceWithDetails> {
    if (!cancellationReason || !cancellationReason.trim()) {
      const err: any = new Error('Cancellation reason is required');
      err.statusCode = 400;
      err.errorCode = 'REASON_REQUIRED';
      throw err;
    }

    const existing = await this.getById(id);
    if (existing.status === VENDOR_INVOICE_STATUSES.CANCELLED) {
      const err: any = new Error('Vendor invoice is already cancelled');
      err.statusCode = 400;
      err.errorCode = 'ALREADY_CANCELLED';
      throw err;
    }

    await this.repo.updateStatus(id, VENDOR_INVOICE_STATUSES.CANCELLED, {
      cancelledBy: userId,
      cancelledAt: new Date(),
      cancellationReason: cancellationReason.trim(),
    });

    await this.repo.logActivity(id, 'CANCELLED', userId, `Vendor invoice cancelled: ${cancellationReason.trim()}`);
    return this.getById(id);
  }

  async getActivityLogs(id: string): Promise<any[]> {
    return this.repo.getActivityLogs(id);
  }
}
