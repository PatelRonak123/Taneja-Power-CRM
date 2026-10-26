import { sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { salesOrders, salesOrderItems } from '../../../database/schema/sales-orders.js';
import { customers } from '../../../database/schema/customers.js';
import { amcContracts } from '../../../database/schema/amc-contracts.js';
import {
  salesInvoices,
  salesInvoiceItems,
  SalesInvoiceEntity,
  SalesInvoiceItemEntity,
} from '../../../database/schema/invoices.js';
import {
  SalesInvoiceRepository,
  ListSalesInvoicesQuery,
  SalesInvoiceWithDetails,
} from '../repositories/sales-invoice.repository.js';
import { InvoiceNumberService } from './invoice-number.service.js';
import { QuotationCalculationService } from '../../quotations/services/quotation-calculation.service.js';
import { SALES_INVOICE_STATUSES, SO_STATUSES } from '../../../config/constants.js';

export interface CreateSalesInvoiceItemInput {
  salesOrderItemId: string;
  quantity: number;
}

export interface CreateSalesInvoiceInput {
  invoiceDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  items?: CreateSalesInvoiceItemInput[];
}

export interface UpdateSalesInvoiceInput {
  dueDate?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
}

export class SalesInvoiceService {
  private repo = new SalesInvoiceRepository();
  private numberService = new InvoiceNumberService();
  private calcService = new QuotationCalculationService();

  /**
   * Helper to round monetary amounts to 2 decimal places.
   */
  private round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private fmt(val: number): string {
    return val.toFixed(2);
  }

  /**
   * Create a Sales Invoice from a confirmed Sales Order.
   * Atomic, row-locked, and enforces quantity bounds.
   *
   * INVARIANT: No inventory mutation.
   */
  async createFromSalesOrder(
    salesOrderId: string,
    input: CreateSalesInvoiceInput,
    userId: string
  ): Promise<SalesInvoiceWithDetails> {
    return await db.transaction(async (tx) => {
      // 1. Lock the Sales Order with FOR UPDATE
      const soRows = await tx.execute(sql`
        SELECT * FROM sales_orders WHERE id = ${salesOrderId} FOR UPDATE
      `);
      const so: any = (soRows.rows || soRows)[0];

      if (!so) {
        const err: any = new Error(`Sales Order not found: ${salesOrderId}`);
        err.statusCode = 404;
        err.errorCode = 'SO_NOT_FOUND';
        throw err;
      }

      // Check Sales Order status
      const allowedSoStatuses = [SO_STATUSES.CONFIRMED, SO_STATUSES.PARTIALLY_INVOICED];
      if (!allowedSoStatuses.includes(so.status)) {
        const err: any = new Error(
          `Cannot invoice Sales Order in status "${so.status}". Only CONFIRMED or PARTIALLY_INVOICED orders can be invoiced.`
        );
        err.statusCode = 400;
        err.errorCode = 'SO_NOT_CONFIRMED';
        throw err;
      }

      // 2. Lock Sales Order Items
      const soItemRows = await tx.execute(sql`
        SELECT * FROM sales_order_items WHERE sales_order_id = ${salesOrderId} ORDER BY sort_order ASC FOR UPDATE
      `);
      const allSoItems: any[] = (soItemRows.rows || soItemRows) as any[];

      if (!allSoItems || allSoItems.length === 0) {
        const err: any = new Error('Sales Order has no line items');
        err.statusCode = 400;
        err.errorCode = 'SO_NO_ITEMS';
        throw err;
      }

      // 3. Compute already invoiced quantities
      const invoicedMap = await this.repo.getInvoicedQuantitiesBySalesOrderId(salesOrderId, tx);

      // 4. Resolve items to invoice
      const invoiceItemsToBuild: {
        soItem: any;
        quantity: number;
      }[] = [];

      if (input.items && input.items.length > 0) {
        // Specific partial or selected items requested
        for (const reqItem of input.items) {
          const matchedSoItem = allSoItems.find((i: any) => i.id === reqItem.salesOrderItemId);
          if (!matchedSoItem) {
            const err: any = new Error(`Item ${reqItem.salesOrderItemId} does not belong to this Sales Order`);
            err.statusCode = 400;
            err.errorCode = 'ITEM_NOT_FOUND';
            throw err;
          }

          const alreadyInvoiced = invoicedMap.get(matchedSoItem.id) || 0;
          const totalOrderQty = Number(matchedSoItem.quantity);
          const remainingQty = this.round(Math.max(0, totalOrderQty - alreadyInvoiced));

          if (reqItem.quantity <= 0) {
            const err: any = new Error(`Quantity for item "${matchedSoItem.product_name_snapshot}" must be > 0`);
            err.statusCode = 400;
            err.errorCode = 'INVALID_QUANTITY';
            throw err;
          }

          if (reqItem.quantity > remainingQty) {
            const err: any = new Error(
              `Cannot invoice ${reqItem.quantity} for "${matchedSoItem.product_name_snapshot}". Remaining invoiceable quantity is ${remainingQty}.`
            );
            err.statusCode = 400;
            err.errorCode = 'EXCEEDS_REMAINING_QUANTITY';
            throw err;
          }

          invoiceItemsToBuild.push({
            soItem: matchedSoItem,
            quantity: reqItem.quantity,
          });
        }
      } else {
        // Invoice all remaining quantities across all items
        for (const item of allSoItems) {
          const alreadyInvoiced = invoicedMap.get(item.id) || 0;
          const totalOrderQty = Number(item.quantity);
          const remainingQty = this.round(Math.max(0, totalOrderQty - alreadyInvoiced));

          if (remainingQty > 0) {
            invoiceItemsToBuild.push({
              soItem: item,
              quantity: remainingQty,
            });
          }
        }
      }

      if (invoiceItemsToBuild.length === 0) {
        const err: any = new Error('Sales Order is already fully invoiced. No remaining quantities to invoice.');
        err.statusCode = 400;
        err.errorCode = 'ALREADY_FULLY_INVOICED';
        throw err;
      }

      // 5. Generate Collision-Free Sequential Invoice Number
      const invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : new Date();
      const invoiceNumber = await this.numberService.generateSalesInvoiceNumber(invoiceDate, tx);

      // 6. Fetch Customer Details for Snapshot
      const custRows = await tx.execute(sql`
        SELECT * FROM customers WHERE id = ${so.customer_id}
      `);
      const cust: any = (custRows.rows || custRows)[0];

      // 7. Calculate authoritative line item totals and GST breakdown
      const isIntra = this.calcService.isIntraState(so.billing_state || cust?.billingState);

      let subtotalNum = 0;
      let cgstTotalNum = 0;
      let sgstTotalNum = 0;
      let igstTotalNum = 0;

      const builtItems: any[] = [];

      for (let i = 0; i < invoiceItemsToBuild.length; i++) {
        const { soItem, quantity } = invoiceItemsToBuild[i];
        const unitPriceNum = Number(soItem.unit_price);
        const taxableAmountNum = this.round(quantity * unitPriceNum);
        const taxRateNum = Number(soItem.tax_rate) || 18.0;

        let cgstRate = 0;
        let cgstAmount = 0;
        let sgstRate = 0;
        let sgstAmount = 0;
        let igstRate = 0;
        let igstAmount = 0;

        if (isIntra) {
          cgstRate = this.round(taxRateNum / 2);
          sgstRate = this.round(taxRateNum / 2);
          cgstAmount = this.round(taxableAmountNum * (cgstRate / 100));
          sgstAmount = this.round(taxableAmountNum * (sgstRate / 100));
        } else {
          igstRate = this.round(taxRateNum);
          igstAmount = this.round(taxableAmountNum * (igstRate / 100));
        }

        const taxAmountNum = this.round(cgstAmount + sgstAmount + igstAmount);
        const lineTotalNum = this.round(taxableAmountNum + taxAmountNum);

        subtotalNum = this.round(subtotalNum + taxableAmountNum);
        cgstTotalNum = this.round(cgstTotalNum + cgstAmount);
        sgstTotalNum = this.round(sgstTotalNum + sgstAmount);
        igstTotalNum = this.round(igstTotalNum + igstAmount);

        builtItems.push({
          salesOrderItemId: soItem.id,
          productId: soItem.product_id,
          productNameSnapshot: soItem.product_name_snapshot,
          skuSnapshot: soItem.sku_snapshot,
          descriptionSnapshot: soItem.description_snapshot,
          hsnSacSnapshot: soItem.hsn_sac_snapshot,
          unitSnapshot: soItem.unit_snapshot || 'NOS',
          quantity: this.fmt(quantity),
          unitPrice: this.fmt(unitPriceNum),
          discountAmount: '0.00',
          taxableAmount: this.fmt(taxableAmountNum),
          taxRate: this.fmt(taxRateNum),
          cgstRate: this.fmt(cgstRate),
          sgstRate: this.fmt(sgstRate),
          igstRate: this.fmt(igstRate),
          cgstAmount: this.fmt(cgstAmount),
          sgstAmount: this.fmt(sgstAmount),
          igstAmount: this.fmt(igstAmount),
          taxAmount: this.fmt(taxAmountNum),
          lineTotal: this.fmt(lineTotalNum),
          sortOrder: i,
        });
      }

      const totalTaxNum = this.round(cgstTotalNum + sgstTotalNum + igstTotalNum);
      const totalAmountNum = this.round(subtotalNum + totalTaxNum);

      // Check if an active Pro Forma Invoice exists for this Sales Order
      const piRows = await tx.execute(sql`
        SELECT id, proforma_invoice_number, paid_amount 
        FROM proforma_invoices 
        WHERE sales_order_id = ${salesOrderId} AND status NOT IN ('CANCELLED')
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      const linkedPi: any = (piRows.rows || piRows)[0];

      // Reconcile advance payments recorded against this Sales Order (or its PI)
      const advanceRes = await tx.execute(sql`
        SELECT coalesce(sum(amount), 0) as total_advance
        FROM payments
        WHERE sales_order_id = ${salesOrderId} AND sales_invoice_id IS NULL
      `);
      const advancePaid = Number((advanceRes.rows || advanceRes)[0]?.total_advance || 0);

      // 8. Insert Invoice Master Record
      const newInvoice = await this.repo.insertInvoice(
        {
          invoiceNumber,
          salesOrderId,
          proformaInvoiceId: linkedPi ? linkedPi.id : null,
          customerId: so.customer_id,
          invoiceDate,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: advancePaid >= totalAmountNum ? SALES_INVOICE_STATUSES.PAID : advancePaid > 0 ? SALES_INVOICE_STATUSES.PARTIALLY_PAID : SALES_INVOICE_STATUSES.DRAFT,
          currency: 'INR',

          // Customer snapshot
          customerName: cust?.name || 'Valued Customer',
          legalName: cust?.legalName || null,
          gstin: cust?.gstin || null,
          pan: cust?.pan || null,
          customerEmail: cust?.email || null,
          customerPhone: cust?.phone || null,

          // Address snapshot from SO
          billingAddress: so.billing_address || null,
          billingCity: so.billing_city || null,
          billingState: so.billing_state || null,
          billingPincode: so.billing_pincode || null,
          billingStateCode: null,

          shippingName: so.shipping_name || null,
          shippingAddress: so.shipping_address || null,
          shippingCity: so.shipping_city || null,
          shippingState: so.shipping_state || null,
          shippingPincode: so.shipping_pincode || null,
          shippingStateCode: null,

          paymentTerms: input.paymentTerms || so.payment_terms || null,
          notes: input.notes || so.notes || null,

          // Authoritative Financials
          subtotal: this.fmt(subtotalNum),
          discountAmount: '0.00',
          taxableAmount: this.fmt(subtotalNum),
          cgstAmount: this.fmt(cgstTotalNum),
          sgstAmount: this.fmt(sgstTotalNum),
          igstAmount: this.fmt(igstTotalNum),
          totalTax: this.fmt(totalTaxNum),
          roundOff: '0.00',
          totalAmount: this.fmt(totalAmountNum),
          paidAmount: this.fmt(advancePaid),

          createdBy: userId,
        },
        tx
      );

      // If linked PI exists, associate this tax invoice
      if (linkedPi) {
        await tx.execute(sql`
          UPDATE proforma_invoices
          SET related_tax_invoice_id = ${newInvoice.id}, updated_at = now()
          WHERE id = ${linkedPi.id}
        `);
      }

      // Reconcile/link any existing advance payment records to this final Tax Invoice
      if (advancePaid > 0) {
        await tx.execute(sql`
          UPDATE payments
          SET sales_invoice_id = ${newInvoice.id}, updated_at = now()
          WHERE sales_order_id = ${salesOrderId} AND sales_invoice_id IS NULL
        `);
      }

      // 9. Insert Invoice Line Items
      const itemsToInsert = builtItems.map((item) => ({
        ...item,
        salesInvoiceId: newInvoice.id,
      }));
      await this.repo.insertItems(itemsToInsert, tx);

      // 10. Update Sales Order Status (PARTIALLY_INVOICED vs FULLY_INVOICED)
      // Check remaining quantities after this invoice
      let isFullyInvoiced = true;
      for (const item of allSoItems) {
        const prevInvoiced = invoicedMap.get(item.id) || 0;
        const currentInvoiced = builtItems.find((b) => b.salesOrderItemId === item.id);
        const thisQty = currentInvoiced ? Number(currentInvoiced.quantity) : 0;
        const totalAfterThis = prevInvoiced + thisQty;
        if (totalAfterThis < Number(item.quantity)) {
          isFullyInvoiced = false;
          break;
        }
      }

      const newSoStatus = isFullyInvoiced ? SO_STATUSES.FULLY_INVOICED : SO_STATUSES.PARTIALLY_INVOICED;
      await tx
        .update(salesOrders)
        .set({ status: newSoStatus, updatedAt: new Date() })
        .where(sql`id = ${salesOrderId}`);

      // 11. Log Activity
      await this.repo.logActivity(
        newInvoice.id,
        'CREATED',
        userId,
        `Sales invoice ${invoiceNumber} created from Sales Order ${so.sales_order_number}`,
        tx
      );

      // Return fully hydrated invoice
      const created = await this.repo.findById(newInvoice.id, tx);
      return created!;
    });
  }

  async getById(id: string): Promise<SalesInvoiceWithDetails> {
    const inv = await this.repo.findById(id);
    if (!inv) {
      const err: any = new Error(`Sales Invoice not found: ${id}`);
      err.statusCode = 404;
      err.errorCode = 'INVOICE_NOT_FOUND';
      throw err;
    }
    // Enrich with quotationType and linked AMC contract info
    if (inv.salesOrderId) {
      const enrichRows = await db.execute(sql`
        SELECT q.quotation_type, q.id as quotation_id, ac.id as amc_contract_id
        FROM sales_orders so
        LEFT JOIN quotations q ON q.id = so.quotation_id
        LEFT JOIN amc_contracts ac ON ac.quotation_id = q.id
        WHERE so.id = ${inv.salesOrderId}
        LIMIT 1
      `);
      const enrichRow = ((enrichRows.rows || enrichRows) as any[])[0];
      if (enrichRow) {
        (inv as any).quotationType = enrichRow.quotation_type || 'PRODUCT';
        (inv as any).linkedAmcContractId = enrichRow.amc_contract_id || null;
        (inv as any).quotationId = enrichRow.quotation_id || null;
      }
    }
    return inv;
  }

  async list(query: ListSalesInvoicesQuery): Promise<{ data: any[]; total: number }> {
    const result = await this.repo.find(query);
    // Enrich each invoice with quotationType and linkedAmcContractId
    if (result.data.length > 0) {
      const salesOrderIds = [...new Set(result.data.map((inv: any) => inv.salesOrderId).filter(Boolean))];
      if (salesOrderIds.length > 0) {
        const placeholders = salesOrderIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
        const enrichRows = await db.execute(sql.raw(
          `SELECT so.id as so_id, q.quotation_type, q.id as quotation_id, ac.id as amc_contract_id
           FROM sales_orders so
           LEFT JOIN quotations q ON q.id = so.quotation_id
           LEFT JOIN amc_contracts ac ON ac.quotation_id = q.id
           WHERE so.id IN (${salesOrderIds.map(id => `'${id}'`).join(', ')})`
        ));
        const enrichMap = new Map<string, any>();
        for (const row of ((enrichRows.rows || enrichRows) as any[])) {
          enrichMap.set(row.so_id, row);
        }
        for (const inv of result.data) {
          const enrichRow = enrichMap.get(inv.salesOrderId);
          if (enrichRow) {
            inv.quotationType = enrichRow.quotation_type || 'PRODUCT';
            inv.linkedAmcContractId = enrichRow.amc_contract_id || null;
            inv.quotationId = enrichRow.quotation_id || null;
          } else {
            inv.quotationType = 'PRODUCT';
            inv.linkedAmcContractId = null;
          }
        }
      }
    }
    return result;
  }

  async update(id: string, input: UpdateSalesInvoiceInput, userId: string): Promise<SalesInvoiceWithDetails> {
    const existing = await this.getById(id);
    if (existing.status !== SALES_INVOICE_STATUSES.DRAFT) {
      const err: any = new Error(`Only DRAFT invoices can be updated. Current status: "${existing.status}"`);
      err.statusCode = 400;
      err.errorCode = 'CANNOT_EDIT_NON_DRAFT';
      throw err;
    }

    await this.repo.updateStatus(id, SALES_INVOICE_STATUSES.DRAFT, {
      dueDate: input.dueDate ? new Date(input.dueDate) : existing.dueDate,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      paymentTerms: input.paymentTerms !== undefined ? input.paymentTerms : existing.paymentTerms,
    });

    await this.repo.logActivity(id, 'UPDATED', userId, 'Sales invoice draft details updated');
    return this.getById(id);
  }

  async submit(id: string, userId: string): Promise<SalesInvoiceWithDetails> {
    const existing = await this.getById(id);
    if (existing.status !== SALES_INVOICE_STATUSES.DRAFT) {
      const err: any = new Error(`Only DRAFT invoices can be submitted. Current status: "${existing.status}"`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_TRANSITION';
      throw err;
    }

    await this.repo.updateStatus(id, SALES_INVOICE_STATUSES.PENDING_ISSUE);
    await this.repo.logActivity(id, 'SUBMITTED', userId, 'Sales invoice submitted for formal issue');
    return this.getById(id);
  }

  async issue(id: string, userId: string): Promise<SalesInvoiceWithDetails> {
    const existing = await this.getById(id);
    const allowed = [SALES_INVOICE_STATUSES.DRAFT, SALES_INVOICE_STATUSES.PENDING_ISSUE];
    if (!allowed.includes(existing.status as any)) {
      const err: any = new Error(`Cannot issue invoice in status: "${existing.status}"`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_TRANSITION';
      throw err;
    }

    await this.repo.updateStatus(id, SALES_INVOICE_STATUSES.ISSUED, {
      issuedBy: userId,
      issuedAt: new Date(),
    });

    await this.repo.logActivity(id, 'ISSUED', userId, 'Sales invoice officially issued');
    return this.getById(id);
  }

  async cancel(id: string, cancellationReason: string, userId: string): Promise<SalesInvoiceWithDetails> {
    if (!cancellationReason || !cancellationReason.trim()) {
      const err: any = new Error('Cancellation reason is required');
      err.statusCode = 400;
      err.errorCode = 'REASON_REQUIRED';
      throw err;
    }

    return await db.transaction(async (tx) => {
      const existing = await this.repo.findById(id, tx);
      if (!existing) {
        const err: any = new Error(`Sales Invoice not found: ${id}`);
        err.statusCode = 404;
        err.errorCode = 'INVOICE_NOT_FOUND';
        throw err;
      }

      if (existing.status === SALES_INVOICE_STATUSES.CANCELLED) {
        const err: any = new Error('Sales invoice is already cancelled');
        err.statusCode = 400;
        err.errorCode = 'ALREADY_CANCELLED';
        throw err;
      }

      await this.repo.updateStatus(
        id,
        SALES_INVOICE_STATUSES.CANCELLED,
        {
          cancelledBy: userId,
          cancelledAt: new Date(),
          cancellationReason: cancellationReason.trim(),
        },
        tx
      );

      // Recalculate Sales Order status now that this invoice is cancelled
      const soId = existing.salesOrderId;
      const invoicedMap = await this.repo.getInvoicedQuantitiesBySalesOrderId(soId, tx);
      const soItemRows = await tx.execute(sql`
        SELECT * FROM sales_order_items WHERE sales_order_id = ${soId}
      `);
      const allSoItems: any[] = (soItemRows.rows || soItemRows) as any[];

      let anyInvoiced = false;
      let allInvoiced = true;

      for (const item of allSoItems) {
        const invoiced = invoicedMap.get(item.id) || 0;
        if (invoiced > 0) anyInvoiced = true;
        if (invoiced < Number(item.quantity)) allInvoiced = false;
      }

      let restoredSoStatus: string = SO_STATUSES.CONFIRMED;
      if (allInvoiced && allSoItems.length > 0) {
        restoredSoStatus = SO_STATUSES.FULLY_INVOICED;
      } else if (anyInvoiced) {
        restoredSoStatus = SO_STATUSES.PARTIALLY_INVOICED;
      }

      await tx
        .update(salesOrders)
        .set({ status: restoredSoStatus, updatedAt: new Date() })
        .where(sql`id = ${soId}`);

      await this.repo.logActivity(id, 'CANCELLED', userId, `Invoice cancelled: ${cancellationReason.trim()}`, tx);

      const updated = await this.repo.findById(id, tx);
      return updated!;
    });
  }

  async getActivityLogs(id: string): Promise<any[]> {
    return this.repo.getActivityLogs(id);
  }
}
