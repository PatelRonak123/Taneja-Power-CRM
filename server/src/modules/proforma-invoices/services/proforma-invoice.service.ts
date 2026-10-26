import { sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { ProformaInvoiceRepository } from '../repositories/proforma-invoice.repository.js';
import { InvoiceNumberService } from '../../invoices/services/invoice-number.service.js';
import { QuotationCalculationService } from '../../quotations/services/quotation-calculation.service.js';
import { emailService } from '../../../common/services/email.service.js';
import { SO_STATUSES } from '../../../config/constants.js';
import {
  CreateProformaInvoiceInput,
  UpdateProformaInvoiceInput,
  CancelProformaInvoiceInput,
  SendProformaInvoiceEmailInput,
  ListProformaInvoicesQuery,
  PROFORMA_INVOICE_STATUSES,
} from '../types/proforma-invoice.types.js';

export class ProformaInvoiceService {
  private repo = new ProformaInvoiceRepository();
  private numberService = new InvoiceNumberService();
  private calcService = new QuotationCalculationService();

  private round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private fmt(val: number): string {
    return val.toFixed(2);
  }

  /**
   * Create a Pro Forma Invoice from a confirmed Sales Order.
   *
   * INVARIANT: No inventory mutation. Does not create stock movements.
   * Only allows CONFIRMED or PARTIALLY_INVOICED Sales Orders.
   */
  async createFromSalesOrder(
    salesOrderId: string,
    input: CreateProformaInvoiceInput,
    userId: string
  ): Promise<any> {
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

      // Check Sales Order status - STRICT GATE
      const allowedSoStatuses = [SO_STATUSES.CONFIRMED, SO_STATUSES.PARTIALLY_INVOICED];
      if (!allowedSoStatuses.includes(so.status)) {
        const err: any = new Error(
          `Cannot generate Pro Forma Invoice for Sales Order in status "${so.status}". Only CONFIRMED or PARTIALLY_INVOICED orders can have a Pro Forma Invoice generated.`
        );
        err.statusCode = 400;
        err.errorCode = 'SO_NOT_CONFIRMED';
        throw err;
      }

      // 2. Fetch Sales Order Items
      const soItemRows = await tx.execute(sql`
        SELECT * FROM sales_order_items WHERE sales_order_id = ${salesOrderId} ORDER BY sort_order ASC
      `);
      const allSoItems: any[] = (soItemRows.rows || soItemRows) as any[];

      if (!allSoItems || allSoItems.length === 0) {
        const err: any = new Error('Sales Order has no line items');
        err.statusCode = 400;
        err.errorCode = 'SO_NO_ITEMS';
        throw err;
      }

      // 3. Resolve items to include
      const itemsToBuild: { soItem: any; quantity: number }[] = [];

      if (input.items && input.items.length > 0) {
        for (const reqItem of input.items) {
          const matchedSoItem = allSoItems.find((i: any) => i.id === reqItem.salesOrderItemId);
          if (!matchedSoItem) {
            const err: any = new Error(`Item ${reqItem.salesOrderItemId} does not belong to this Sales Order`);
            err.statusCode = 400;
            err.errorCode = 'ITEM_NOT_FOUND';
            throw err;
          }
          if (reqItem.quantity <= 0) {
            const err: any = new Error(`Quantity for item "${matchedSoItem.product_name_snapshot}" must be > 0`);
            err.statusCode = 400;
            err.errorCode = 'INVALID_QUANTITY';
            throw err;
          }
          itemsToBuild.push({
            soItem: matchedSoItem,
            quantity: reqItem.quantity,
          });
        }
      } else {
        // Include all items from Sales Order
        for (const item of allSoItems) {
          itemsToBuild.push({
            soItem: item,
            quantity: Number(item.quantity),
          });
        }
      }

      // 4. Generate sequential PI number
      const piDate = new Date();
      const piNumber = await this.numberService.generateProformaInvoiceNumber(piDate, tx);

      // 5. Fetch Customer details snapshot
      const custRows = await tx.execute(sql`
        SELECT * FROM customers WHERE id = ${so.customer_id}
      `);
      const cust: any = (custRows.rows || custRows)[0];

      // 6. Calculate GST & totals
      const isIntra = this.calcService.isIntraState(so.billing_state || cust?.billing_state);

      let subtotalNum = 0;
      let cgstTotalNum = 0;
      let sgstTotalNum = 0;
      let igstTotalNum = 0;

      const builtItems: any[] = [];

      for (let i = 0; i < itemsToBuild.length; i++) {
        const { soItem, quantity } = itemsToBuild[i];
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

      // Check existing advance payments recorded against this Sales Order if any
      const existingPayments = await tx.execute(sql`
        SELECT coalesce(sum(amount), 0) as total_paid
        FROM payments
        WHERE sales_order_id = ${salesOrderId}
      `);
      const alreadyPaidAgainstSo = Number((existingPayments.rows || existingPayments)[0]?.total_paid || 0);

      // 7. Insert Header
      const advanceRequested = input.advanceAmountRequested !== undefined
        ? this.fmt(Number(input.advanceAmountRequested))
        : this.fmt(totalAmountNum); // Default to full amount if not specified

      const headerData = {
        proformaInvoiceNumber: piNumber,
        salesOrderId,
        customerId: so.customer_id,
        proformaInvoiceDate: piDate,
        validityDate: input.validityDate ? new Date(input.validityDate) : null,
        status: PROFORMA_INVOICE_STATUSES.DRAFT,
        currency: 'INR',

        customerName: cust?.company_name || cust?.name || so.customer_name || 'Customer',
        legalName: cust?.company_name || null,
        gstin: cust?.gstin || null,
        pan: cust?.pan || null,
        customerEmail: cust?.email || null,
        customerPhone: cust?.phone || null,

        billingAddress: so.billing_address || cust?.billing_address || null,
        billingCity: so.billing_city || cust?.billing_city || null,
        billingState: so.billing_state || cust?.billing_state || null,
        billingPincode: so.billing_pincode || cust?.billing_pincode || null,
        billingStateCode: so.billing_state_code || null,

        shippingName: so.shipping_name || null,
        shippingAddress: so.shipping_address || null,
        shippingCity: so.shipping_city || null,
        shippingState: so.shipping_state || null,
        shippingPincode: so.shipping_pincode || null,
        shippingStateCode: so.shipping_state_code || null,

        paymentTerms: input.paymentTerms || so.payment_terms || null,
        deliveryTerms: input.deliveryTerms || so.delivery_terms || null,
        expectedDeliveryTimeline: input.expectedDeliveryTimeline || null,
        bankDetails: input.bankDetails || 'Bank: HDFC Bank Ltd • Branch: Alkapuri, Vadodara • A/C No: 50200012345678 • IFSC: HDFC0000123',
        notes: input.notes || null,

        subtotal: this.fmt(subtotalNum),
        discountAmount: '0.00',
        taxableAmount: this.fmt(subtotalNum),
        cgstAmount: this.fmt(cgstTotalNum),
        sgstAmount: this.fmt(sgstTotalNum),
        igstAmount: this.fmt(igstTotalNum),
        totalTax: this.fmt(totalTaxNum),
        roundOff: '0.00',
        totalAmount: this.fmt(totalAmountNum),

        advanceAmountRequested: advanceRequested,
        paidAmount: this.fmt(alreadyPaidAgainstSo),

        createdBy: userId,
      };

      return await this.repo.insertProformaInvoice(headerData, builtItems, tx);
    });
  }

  /**
   * Get Pro Forma Invoice by ID
   */
  async getById(id: string): Promise<any> {
    const pi = await this.repo.findById(id);
    if (!pi) {
      const err: any = new Error(`Pro Forma Invoice not found: ${id}`);
      err.statusCode = 404;
      err.errorCode = 'PI_NOT_FOUND';
      throw err;
    }
    return pi;
  }

  /**
   * List Pro Forma Invoices
   */
  async list(query: ListProformaInvoicesQuery): Promise<any> {
    return await this.repo.list(query);
  }

  /**
   * Update draft Pro Forma Invoice
   */
  async update(id: string, input: UpdateProformaInvoiceInput, _userId: string): Promise<any> {
    const pi = await this.getById(id);
    if (pi.status !== PROFORMA_INVOICE_STATUSES.DRAFT) {
      const err: any = new Error(
        `Cannot edit Pro Forma Invoice in status "${pi.status}". Only DRAFT proforma invoices can be modified.`
      );
      err.statusCode = 400;
      err.errorCode = 'PI_NOT_DRAFT';
      throw err;
    }

    const updates: any = {};
    if (input.validityDate !== undefined) updates.validityDate = input.validityDate ? new Date(input.validityDate) : null;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.paymentTerms !== undefined) updates.paymentTerms = input.paymentTerms;
    if (input.deliveryTerms !== undefined) updates.deliveryTerms = input.deliveryTerms;
    if (input.expectedDeliveryTimeline !== undefined) updates.expectedDeliveryTimeline = input.expectedDeliveryTimeline;
    if (input.bankDetails !== undefined) updates.bankDetails = input.bankDetails;
    if (input.advanceAmountRequested !== undefined) {
      updates.advanceAmountRequested = this.fmt(Number(input.advanceAmountRequested));
    }

    return await this.repo.update(id, updates);
  }

  /**
   * Issue a Pro Forma Invoice
   * Transition: DRAFT -> ISSUED
   * Snapshots issue timestamp and issuing user.
   */
  async issue(id: string, userId: string): Promise<any> {
    const pi = await this.getById(id);
    if (pi.status !== PROFORMA_INVOICE_STATUSES.DRAFT) {
      const err: any = new Error(
        `Cannot issue Pro Forma Invoice in status "${pi.status}". Only DRAFT proforma invoices can be issued.`
      );
      err.statusCode = 400;
      err.errorCode = 'PI_ALREADY_ISSUED';
      throw err;
    }

    return await this.repo.update(id, {
      status: PROFORMA_INVOICE_STATUSES.ISSUED,
      issuedBy: userId,
      issuedAt: new Date(),
    });
  }

  /**
   * Cancel an issued or draft Pro Forma Invoice.
   * Cancelling a PI does NOT cancel its originating Sales Order.
   */
  async cancel(id: string, input: CancelProformaInvoiceInput, userId: string): Promise<any> {
    const pi = await this.getById(id);
    if (pi.status === PROFORMA_INVOICE_STATUSES.CANCELLED) {
      const err: any = new Error('Pro Forma Invoice is already cancelled');
      err.statusCode = 400;
      err.errorCode = 'PI_ALREADY_CANCELLED';
      throw err;
    }

    return await this.repo.update(id, {
      status: PROFORMA_INVOICE_STATUSES.CANCELLED,
      cancelledBy: userId,
      cancelledAt: new Date(),
      cancellationReason: input.reason,
    });
  }

  /**
   * Send Pro Forma Invoice via Email to Customer
   */
  async sendEmail(id: string, input: SendProformaInvoiceEmailInput, _userId: string): Promise<{ delivered: boolean; messageId?: string }> {
    const pi = await this.getById(id);

    const recipient = input.to || pi.customerEmail || pi.customer?.email;
    if (!recipient) {
      const err: any = new Error(
        'No customer email address on file. Please provide an explicit recipient email.'
      );
      err.statusCode = 400;
      err.errorCode = 'NO_EMAIL_ON_FILE';
      throw err;
    }

    const emailRes = await emailService.sendProformaInvoiceEmail({
      to: recipient,
      subject: input.subject || `Pro Forma Invoice ${pi.proformaInvoiceNumber} - Taneja Power Systems`,
      proformaInvoiceNumber: pi.proformaInvoiceNumber,
      customerName: pi.customerName || pi.customer?.name || 'Valued Customer',
      salesOrderNumber: pi.salesOrder?.salesOrderNumber,
      totalAmount: Number(pi.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      advanceRequested: Number(pi.advanceAmountRequested) > 0 ? Number(pi.advanceAmountRequested).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : undefined,
      customMessage: input.customMessage,
    });

    return { delivered: true, messageId: emailRes.id };
  }
}
