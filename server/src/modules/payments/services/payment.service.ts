import { sql, eq, desc, and } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { payments } from '../../../database/schema/payments.js';
import { salesInvoices, invoiceActivityLogs } from '../../../database/schema/invoices.js';
import { amcContracts } from '../../../database/schema/amc-contracts.js';
import { customers } from '../../../database/schema/customers.js';
import { users } from '../../../database/schema/users.js';
import { SALES_INVOICE_STATUSES } from '../../../config/constants.js';

export interface RecordPaymentInput {
  customerId: string;
  salesInvoiceId?: string;
  amcContractId?: string;
  amount: number;
  paymentDate?: string;
  paymentMode: 'BANK_TRANSFER' | 'NEFT_RTGS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER';
  referenceNumber?: string;
  notes?: string;
}

export class PaymentService {
  private getFinancialYear(date: Date = new Date()): string {
    const month = date.getMonth();
    const fullYear = date.getFullYear();
    let startYear: number;
    let endYear: number;
    if (month >= 3) {
      startYear = fullYear;
      endYear = fullYear + 1;
    } else {
      startYear = fullYear - 1;
      endYear = fullYear;
    }
    const shortEndYear = endYear.toString().slice(-2);
    return `${startYear}-${shortEndYear}`;
  }

  public async generatePaymentNumber(date: Date = new Date(), tx: any = db): Promise<string> {
    const prefix = 'REC';
    const fy = this.getFinancialYear(date);

    const result = await tx.execute(sql`
      INSERT INTO invoice_sequences (id, prefix, financial_year, current_sequence, updated_at)
      VALUES (gen_random_uuid(), ${prefix}, ${fy}, 1, now())
      ON CONFLICT (prefix, financial_year)
      DO UPDATE SET current_sequence = invoice_sequences.current_sequence + 1, updated_at = now()
      RETURNING current_sequence;
    `);

    const currentSeq = Number(result.rows[0]?.current_sequence || 1);
    const paddedSeq = String(currentSeq).padStart(4, '0');
    return `${prefix}/${fy}/${paddedSeq}`;
  }

  /**
   * Record a payment receipt against an invoice, AMC contract, or direct customer balance
   */
  public async recordPayment(input: RecordPaymentInput, userId: string): Promise<any> {
    if (!input.amount || Number(input.amount) <= 0) {
      const err: any = new Error('Payment amount must be greater than zero');
      err.statusCode = 400;
      throw err;
    }

    return await db.transaction(async (tx) => {
      const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
      const paymentNumber = await this.generatePaymentNumber(paymentDate, tx);
      const amountNum = Number(input.amount);

      let invoiceRecord: any = null;
      let amcRecord: any = null;

      // 1. If linked to a Sales Invoice
      if (input.salesInvoiceId) {
        const [foundInvoice] = await tx
          .select()
          .from(salesInvoices)
          .where(eq(salesInvoices.id, input.salesInvoiceId));

        if (!foundInvoice) {
          const err: any = new Error('Sales invoice not found');
          err.statusCode = 404;
          throw err;
        }

        invoiceRecord = foundInvoice;
        input.customerId = foundInvoice.customerId; // Ensure customer aligns

        const currentPaid = Number(foundInvoice.paidAmount || 0);
        const totalAmount = Number(foundInvoice.totalAmount);
        const newPaid = Number((currentPaid + amountNum).toFixed(2));

        const newStatus =
          newPaid >= totalAmount
            ? SALES_INVOICE_STATUSES.PAID
            : SALES_INVOICE_STATUSES.PARTIALLY_PAID;

        await tx
          .update(salesInvoices)
          .set({
            paidAmount: String(newPaid),
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(salesInvoices.id, input.salesInvoiceId));

        // Activity log
        await tx.insert(invoiceActivityLogs).values({
          invoiceType: 'SALES_INVOICE',
          invoiceId: input.salesInvoiceId,
          action: 'PAYMENT_RECEIVED',
          userId,
          details: `Payment of ₹${amountNum.toLocaleString('en-IN')} received (${paymentNumber}, Mode: ${input.paymentMode}${input.referenceNumber ? `, Ref: ${input.referenceNumber}` : ''}). Total paid: ₹${newPaid.toLocaleString('en-IN')}`,
        });

        // If invoice is linked to an AMC quotation or contract, check and update AMC contract
        const amcCheck = await tx.execute(sql`
          SELECT ac.id as amc_id, ac.total_amount
          FROM sales_invoices si
          JOIN sales_orders so ON so.id = si.sales_order_id
          JOIN quotations q ON q.id = so.quotation_id
          JOIN amc_contracts ac ON ac.quotation_id = q.id
          WHERE si.id = ${input.salesInvoiceId}
        `);
        const amcRow = (amcCheck.rows || amcCheck)[0] as any;
        if (amcRow && amcRow.amc_id) {
          input.amcContractId = amcRow.amc_id;
          const amcStatus = newPaid >= totalAmount ? 'PAID' : 'PARTIALLY_PAID';
          await tx
            .update(amcContracts)
            .set({ paymentStatus: amcStatus, updatedAt: new Date() })
            .where(eq(amcContracts.id, amcRow.amc_id));
        }
      }

      // 2. If directly linked to an AMC Contract (and not already handled above)
      if (input.amcContractId && !input.salesInvoiceId) {
        const [foundAmc] = await tx
          .select()
          .from(amcContracts)
          .where(eq(amcContracts.id, input.amcContractId));

        if (!foundAmc) {
          const err: any = new Error('AMC contract not found');
          err.statusCode = 404;
          throw err;
        }

        amcRecord = foundAmc;
        input.customerId = foundAmc.customerId;

        // Sum existing payments for this AMC contract
        const existingPayments = await tx
          .select({ sum: sql<string>`coalesce(sum(amount), 0)` })
          .from(payments)
          .where(eq(payments.amcContractId, input.amcContractId));

        const prevPaidTotal = Number(existingPayments[0]?.sum || 0);
        const newPaidTotal = prevPaidTotal + amountNum;
        const contractTotal = Number(foundAmc.totalAmount || 0);

        const newPaymentStatus =
          newPaidTotal >= contractTotal ? 'PAID' : 'PARTIALLY_PAID';

        await tx
          .update(amcContracts)
          .set({ paymentStatus: newPaymentStatus, updatedAt: new Date() })
          .where(eq(amcContracts.id, input.amcContractId));
      }

      // 3. Insert Payment Master Record
      const [inserted] = await tx
        .insert(payments)
        .values({
          paymentNumber,
          customerId: input.customerId,
          salesInvoiceId: input.salesInvoiceId || null,
          amcContractId: input.amcContractId || null,
          amount: String(amountNum),
          paymentDate,
          paymentMode: input.paymentMode || 'BANK_TRANSFER',
          referenceNumber: input.referenceNumber || null,
          notes: input.notes || null,
          recordedBy: userId,
        })
        .returning();

      return inserted;
    });
  }

  /**
   * List payments with filtering and pagination
   */
  public async listPayments(query: {
    customerId?: string;
    salesInvoiceId?: string;
    amcContractId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; totalAmountReceived: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(query.limit || 20, 200));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query.customerId) conditions.push(eq(payments.customerId, query.customerId));
    if (query.salesInvoiceId) conditions.push(eq(payments.salesInvoiceId, query.salesInvoiceId));
    if (query.amcContractId) conditions.push(eq(payments.amcContractId, query.amcContractId));
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        sql`(${payments.paymentNumber} ILIKE ${term} OR ${payments.referenceNumber} ILIKE ${term} OR ${customers.name} ILIKE ${term} OR ${customers.companyName} ILIKE ${term})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRes, sumRes] = await Promise.all([
      db
        .select({
          id: payments.id,
          paymentNumber: payments.paymentNumber,
          customerId: payments.customerId,
          customerName: customers.name,
          customerCompanyName: customers.companyName,
          salesInvoiceId: payments.salesInvoiceId,
          invoiceNumber: salesInvoices.invoiceNumber,
          amcContractId: payments.amcContractId,
          amcContractNumber: amcContracts.contractNumber,
          amount: payments.amount,
          paymentDate: payments.paymentDate,
          paymentMode: payments.paymentMode,
          referenceNumber: payments.referenceNumber,
          notes: payments.notes,
          recordedBy: payments.recordedBy,
          recordedByName: users.fullName,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .leftJoin(customers, eq(customers.id, payments.customerId))
        .leftJoin(salesInvoices, eq(salesInvoices.id, payments.salesInvoiceId))
        .leftJoin(amcContracts, eq(amcContracts.id, payments.amcContractId))
        .leftJoin(users, eq(users.id, payments.recordedBy))
        .where(whereClause)
        .orderBy(desc(payments.paymentDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .leftJoin(customers, eq(customers.id, payments.customerId))
        .where(whereClause),
      db
        .select({ sum: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .leftJoin(customers, eq(customers.id, payments.customerId))
        .where(whereClause),
    ]);

    return {
      data: rows,
      total: countRes[0]?.count || 0,
      totalAmountReceived: Number(sumRes[0]?.sum || 0),
    };
  }

  /**
   * Directly update AMC Contract payment status (e.g. manual override to PAID, PARTIALLY_PAID, PENDING)
   */
  public async updateAmcPaymentStatus(
    contractId: string,
    paymentStatus: string,
    userId: string,
    notes?: string
  ): Promise<any> {
    const validStatuses = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];
    if (!validStatuses.includes(paymentStatus)) {
      const err: any = new Error(`Invalid payment status: ${paymentStatus}. Allowed: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const [contract] = await db
      .select()
      .from(amcContracts)
      .where(eq(amcContracts.id, contractId));

    if (!contract) {
      const err: any = new Error('AMC contract not found');
      err.statusCode = 404;
      throw err;
    }

    const [updated] = await db
      .update(amcContracts)
      .set({
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(amcContracts.id, contractId))
      .returning();

    return updated;
  }

  /**
   * Receivables summary grouped by customer
   */
  public async getReceivablesSummary(): Promise<{
    summary: {
      totalInvoiced: number;
      totalReceived: number;
      totalOutstanding: number;
      customersCount: number;
    };
    customerReceivables: any[];
  }> {
    // 1. Invoices grouped by customer
    const invoiceTotals = await db.execute(sql`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.company_name as customer_company_name,
        c.phone as customer_phone,
        c.email as customer_email,
        COUNT(si.id)::int as total_invoices,
        COALESCE(SUM(si.total_amount), 0)::numeric as total_invoiced,
        COALESCE(SUM(si.paid_amount), 0)::numeric as total_invoice_paid,
        COUNT(CASE WHEN si.status NOT IN ('PAID', 'CANCELLED') THEN 1 END)::int as unpaid_invoices_count
      FROM customers c
      LEFT JOIN sales_invoices si ON si.customer_id = c.id AND si.status != 'CANCELLED'
      GROUP BY c.id, c.name, c.company_name, c.phone, c.email
      HAVING COALESCE(SUM(si.total_amount), 0) > 0 OR COUNT(si.id) > 0
    `);

    // 2. AMC Contracts grouped by customer
    const amcTotals = await db.execute(sql`
      SELECT 
        ac.customer_id,
        COUNT(ac.id)::int as total_amc_contracts,
        COALESCE(SUM(ac.total_amount), 0)::numeric as total_amc_amount,
        COUNT(CASE WHEN ac.payment_status = 'PAID' THEN 1 END)::int as paid_amc_count,
        COUNT(CASE WHEN ac.payment_status != 'PAID' THEN 1 END)::int as unpaid_amc_count
      FROM amc_contracts ac
      WHERE ac.status != 'TERMINATED'
      GROUP BY ac.customer_id
    `);

    const amcMap = new Map<string, any>();
    for (const row of ((amcTotals.rows || amcTotals) as any[])) {
      amcMap.set(row.customer_id, row);
    }

    let overallInvoiced = 0;
    let overallReceived = 0;

    const customerReceivables = ((invoiceTotals.rows || invoiceTotals) as any[]).map((row) => {
      const amcInfo = amcMap.get(row.customer_id);
      const invoiced = Number(row.total_invoiced || 0);
      const invoicePaid = Number(row.total_invoice_paid || 0);
      const outstanding = Math.max(0, invoiced - invoicePaid);

      overallInvoiced += invoiced;
      overallReceived += invoicePaid;

      return {
        customerId: row.customer_id,
        customerName: row.customer_name,
        companyName: row.customer_company_name,
        phone: row.customer_phone,
        email: row.customer_email,
        totalInvoiced: invoiced,
        totalPaid: invoicePaid,
        outstandingBalance: outstanding,
        totalInvoices: Number(row.total_invoices || 0),
        unpaidInvoicesCount: Number(row.unpaid_invoices_count || 0),
        amcContractsCount: amcInfo ? Number(amcInfo.total_amc_contracts || 0) : 0,
        unpaidAmcCount: amcInfo ? Number(amcInfo.unpaid_amc_count || 0) : 0,
        status: outstanding === 0 ? 'PAID' : (invoicePaid > 0 ? 'PARTIALLY_PAID' : 'PENDING'),
      };
    });

    customerReceivables.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

    return {
      summary: {
        totalInvoiced: Number(overallInvoiced.toFixed(2)),
        totalReceived: Number(overallReceived.toFixed(2)),
        totalOutstanding: Number(Math.max(0, overallInvoiced - overallReceived).toFixed(2)),
        customersCount: customerReceivables.length,
      },
      customerReceivables,
    };
  }
}
