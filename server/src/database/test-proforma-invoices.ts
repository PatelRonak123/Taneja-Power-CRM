import { db, pool } from './db.js';
import { products } from './schema/products.js';
import { stockMovements } from './schema/inventory.js';
import { salesOrders, salesOrderItems } from './schema/sales-orders.js';
import { salesInvoices } from './schema/invoices.js';
import { quotations, quotationRevisions } from './schema/quotations.js';
import { proformaInvoices, proformaInvoiceItems } from './schema/proforma-invoices.js';
import { payments } from './schema/payments.js';
import { customers } from './schema/customers.js';
import { users } from './schema/users.js';
import { eq, sql } from 'drizzle-orm';
import { ProformaInvoiceService } from '../modules/proforma-invoices/services/proforma-invoice.service.js';
import { SalesInvoiceService } from '../modules/invoices/services/sales-invoice.service.js';
import { PaymentService } from '../modules/payments/services/payment.service.js';
import { InvoiceNumberService } from '../modules/invoices/services/invoice-number.service.js';
import { hasPermission } from '../common/auth/permissions.js';
import { SO_STATUSES, SALES_INVOICE_STATUSES } from '../config/constants.js';

const piService = new ProformaInvoiceService();
const siService = new SalesInvoiceService();
const paymentService = new PaymentService();
const numberService = new InvoiceNumberService();

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

async function assertThrows(
  fn: () => Promise<any>,
  testName: string,
  expectedCode?: string
): Promise<void> {
  try {
    await fn();
    console.error(`[FAIL] ${testName} -> Expected error was not thrown`);
    failed++;
  } catch (err: any) {
    if (expectedCode && err.errorCode !== expectedCode && !err.message?.includes(expectedCode)) {
      console.error(
        `[FAIL] ${testName} -> Error thrown, but code/msg "${err.errorCode || err.message}" != expected "${expectedCode}"`
      );
      failed++;
    } else {
      console.log(`[PASS] ${testName} (threw expected: ${expectedCode || err.message})`);
      passed++;
    }
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('   PRO FORMA INVOICE (PI) INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  // 1. Setup Test User, Customer, and Product
  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'ADMIN'))
    .limit(1);

  if (!adminUser) {
    throw new Error('Admin user required for test');
  }

  const [testCustomer] = await db
    .insert(customers)
    .values({
      name: 'PI Test Customer Ltd',
      companyName: 'PI Test Enterprise Ltd',
      email: 'pitest@example.com',
      phone: '+919876543210',
      address: '42 Industrial Park, Makarpura',
      city: 'Vadodara',
      state: 'Gujarat',
      pincode: '390010',
    })
    .returning();

  const [testProduct] = await db
    .insert(products)
    .values({
      name: 'Online UPS 20kVA Heavy Duty',
      sku: `UPS-TEST-${Date.now()}`,
      description: '20kVA 3-Phase Industrial UPS System',
      price: '150000.00',
      stockQuantity: 10,
      category: 'UPS_SYSTEM',
    })
    .returning();

  const initialStock = Number(testProduct.stockQuantity);
  const initialMovementsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockMovements)
    .where(eq(stockMovements.productId, testProduct.id));

  // Create an approved test quotation and revision
  const [testQuotation] = await db
    .insert(quotations)
    .values({
      quotationNumber: `QT-PI-TEST-${Date.now()}`,
      quotationType: 'PRODUCT',
      status: 'APPROVED',
      customerId: testCustomer.id,
      salespersonId: adminUser.id,
      createdById: adminUser.id,
      currentRevisionNumber: 1,
    })
    .returning();

  const [testRevision] = await db
    .insert(quotationRevisions)
    .values({
      quotationId: testQuotation.id,
      revisionNumber: 1,
      isCurrent: true,
      status: 'APPROVED',
      quotationDate: new Date(),
      validityDays: 30,
      validUntil: new Date(Date.now() + 30 * 86400000),
      currency: 'INR',
      customerName: testCustomer.name,
      companyName: testCustomer.companyName,
      billingAddress: testCustomer.address,
      billingCity: testCustomer.city,
      billingState: testCustomer.state,
      billingPincode: testCustomer.pincode,
      subtotal: '300000.00',
      totalDiscount: '0.00',
      taxableAmount: '300000.00',
      cgstAmount: '27000.00',
      sgstAmount: '27000.00',
      igstAmount: '0.00',
      totalTax: '54000.00',
      roundOff: '0.00',
      grandTotal: '354000.00',
      createdById: adminUser.id,
    })
    .returning();

  // ─── Scenario 1: Rejection on Unconfirmed Sales Order ─────────────────────
  console.log('\n--- Scenario 1: Sales Order Confirmation Gate Enforcement ---');

  const [draftSo] = await db
    .insert(salesOrders)
    .values({
      salesOrderNumber: `SO-DRAFT-${Date.now()}`,
      customerId: testCustomer.id,
      quotationId: testQuotation.id,
      quotationRevisionId: testRevision.id,
      status: SO_STATUSES.DRAFT,
      subtotal: '150000.00',
      taxAmount: '27000.00',
      totalAmount: '177000.00',
      createdBy: adminUser.id,
    })
    .returning();

  await db.insert(salesOrderItems).values({
    salesOrderId: draftSo.id,
    productId: testProduct.id,
    productNameSnapshot: testProduct.name,
    skuSnapshot: testProduct.sku,
    quantity: '1',
    unitPrice: '150000.00',
    taxRate: '18.00',
    taxAmount: '27000.00',
    lineTotal: '177000.00',
  });

  await assertThrows(
    () => piService.createFromSalesOrder(draftSo.id, {}, adminUser.id),
    'Cannot generate Pro Forma Invoice from DRAFT Sales Order',
    'SO_NOT_CONFIRMED'
  );

  // ─── Scenario 2: Generation from Confirmed Sales Order ────────────────────
  console.log('\n--- Scenario 2: Pro Forma Invoice Generation & Snapshotting ---');

  const [confirmedSo] = await db
    .insert(salesOrders)
    .values({
      salesOrderNumber: `SO-CONF-${Date.now()}`,
      customerId: testCustomer.id,
      quotationId: testQuotation.id,
      quotationRevisionId: testRevision.id,
      status: SO_STATUSES.CONFIRMED,
      subtotal: '300000.00',
      taxAmount: '54000.00',
      totalAmount: '354000.00',
      customerPoNumber: 'PO-CLIENT-9988',
      customerPoDate: new Date(),
      paymentTerms: '50% Advance with order, balance before dispatch',
      createdBy: adminUser.id,
    })
    .returning();

  const [soItem1] = await db
    .insert(salesOrderItems)
    .values({
      salesOrderId: confirmedSo.id,
      productId: testProduct.id,
      productNameSnapshot: testProduct.name,
      skuSnapshot: testProduct.sku,
      quantity: '2',
      unitPrice: '150000.00',
      taxRate: '18.00',
      taxAmount: '54000.00',
      lineTotal: '354000.00',
      sortOrder: 0,
    })
    .returning();

  const pi = await piService.createFromSalesOrder(
    confirmedSo.id,
    {
      advanceAmountRequested: 177000,
      paymentTerms: '50% Advance against Pro Forma Invoice',
      expectedDeliveryTimeline: '2-3 Weeks',
    },
    adminUser.id
  );

  assert(pi !== null, 'Pro Forma Invoice created successfully');
  assert(pi.status === 'DRAFT', 'Initial status is DRAFT');
  assert(pi.proformaInvoiceNumber.startsWith('PI/'), `PI numbering follows PI/YYYY-YY/XXXX format: ${pi.proformaInvoiceNumber}`);
  assert(Number(pi.totalAmount) === 354000, `Total commercial value matches: ${pi.totalAmount}`);
  assert(Number(pi.advanceAmountRequested) === 177000, `Advance requested matches: ${pi.advanceAmountRequested}`);
  assert(pi.items.length === 1, `Line items snapshotted: ${pi.items.length}`);
  assert(Number(pi.items[0].quantity) === 2, `Item quantity matches: ${pi.items[0].quantity}`);
  assert(Number(pi.items[0].cgstAmount) > 0 && Number(pi.items[0].sgstAmount) > 0, 'Intra-state GST splitting verified (CGST + SGST)');

  // ─── Scenario 3: Inventory Mutation Invariant Check ───────────────────────
  console.log('\n--- Scenario 3: Invariant: ZERO Stock Mutation on PI Operations ---');

  const [productCheck] = await db
    .select()
    .from(products)
    .where(eq(products.id, testProduct.id));

  const afterMovementsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockMovements)
    .where(eq(stockMovements.productId, testProduct.id));

  assert(
    Number(productCheck.stockQuantity) === initialStock,
    `Product stock unchanged (was ${initialStock}, is ${productCheck.stockQuantity})`
  );
  assert(
    afterMovementsCount[0].count === initialMovementsCount[0].count,
    'No stock movements written during Pro Forma Invoice creation'
  );

  // ─── Scenario 4: PI Issuance & Tax Invoice Independence ───────────────────
  console.log('\n--- Scenario 4: Pro Forma Invoice Issuance ---');

  const issuedPi = await piService.issue(pi.id, adminUser.id);
  assert(issuedPi.status === 'ISSUED', 'Status updated to ISSUED');
  assert(issuedPi.issuedBy === adminUser.id, 'issuedBy audit field recorded');
  assert(issuedPi.issuedAt !== null, 'issuedAt timestamp recorded');

  // Verify that Tax Invoices table has NOT been touched
  const linkedTaxInvoices = await db
    .select()
    .from(salesInvoices)
    .where(eq(salesInvoices.salesOrderId, confirmedSo.id));

  assert(
    linkedTaxInvoices.length === 0,
    'Issuing a Pro Forma Invoice does NOT automatically create a Tax Invoice'
  );

  // ─── Scenario 5: Payment Receipt Advance Integration ──────────────────────
  console.log('\n--- Scenario 5: Payment Receipt Advance Collection ---');

  // Record an advance payment of ₹1,00,000 against this PI / SO
  const paymentReceipt = await paymentService.recordPayment(
    {
      customerId: testCustomer.id,
      proformaInvoiceId: pi.id,
      salesOrderId: confirmedSo.id,
      amount: 100000,
      paymentMode: 'NEFT_RTGS',
      referenceNumber: 'UTR-TEST-12345678',
      notes: 'Initial 50% part advance against Pro Forma Invoice',
    },
    adminUser.id
  );

  assert(paymentReceipt !== null, 'Advance payment recorded successfully via Payment Receipts module');
  assert(paymentReceipt.paymentNumber.startsWith('REC/'), `Receipt number assigned: ${paymentReceipt.paymentNumber}`);
  assert(paymentReceipt.proformaInvoiceId === pi.id, 'Payment receipt references proformaInvoiceId');
  assert(paymentReceipt.salesOrderId === confirmedSo.id, 'Payment receipt references salesOrderId');

  // Check Pro Forma Invoice status and paidAmount update
  const piAfterPayment = await piService.getById(pi.id);
  assert(Number(piAfterPayment.paidAmount) === 100000, `PI paidAmount updated to ₹${piAfterPayment.paidAmount}`);
  assert(piAfterPayment.status === 'PARTIALLY_PAID', `PI status updated to PARTIALLY_PAID (was ${piAfterPayment.status})`);

  // Record remaining advance of ₹2,54,000 to cover total commercial amount
  await paymentService.recordPayment(
    {
      customerId: testCustomer.id,
      proformaInvoiceId: pi.id,
      salesOrderId: confirmedSo.id,
      amount: 254000,
      paymentMode: 'BANK_TRANSFER',
      referenceNumber: 'UTR-TEST-87654321',
      notes: 'Final balance payment against PI',
    },
    adminUser.id
  );

  const piFullyPaid = await piService.getById(pi.id);
  assert(Number(piFullyPaid.paidAmount) === 354000, `PI paidAmount reached full total ₹${piFullyPaid.paidAmount}`);
  assert(piFullyPaid.status === 'PAID', `PI status updated to PAID (was ${piFullyPaid.status})`);

  // ─── Scenario 6: Final Tax Invoice Link & Advance Reconciliation ──────────
  console.log('\n--- Scenario 6: Tax Invoice Link & Advance Reconciliation ---');

  const taxInvoice = await siService.createFromSalesOrder(
    confirmedSo.id,
    {
      notes: 'Final tax invoice referencing Pro Forma Invoice advance',
    },
    adminUser.id
  );

  assert(taxInvoice !== null, 'Tax Invoice created successfully from Sales Order');
  assert(taxInvoice.proformaInvoiceId === pi.id, `Tax Invoice linked to originating Pro Forma Invoice ID: ${taxInvoice.proformaInvoiceId}`);
  assert(Number(taxInvoice.paidAmount) === 354000, `Tax Invoice automatically credited advance receipts: ₹${taxInvoice.paidAmount}`);
  assert(taxInvoice.status === SALES_INVOICE_STATUSES.PAID, `Tax Invoice status reflects reconciled advances: ${taxInvoice.status}`);

  // Check that the PI recorded the related_tax_invoice_id
  const piWithTaxRef = await piService.getById(pi.id);
  assert(
    piWithTaxRef.relatedTaxInvoiceId === taxInvoice.id,
    `Pro Forma Invoice bidirectionally references Tax Invoice: ${piWithTaxRef.relatedTaxInvoiceId}`
  );

  // ─── Scenario 7: Sequential Numbering Uniqueness ──────────────────────────
  console.log('\n--- Scenario 7: Numbering Uniqueness & Atomicity ---');

  const [num1, num2, num3] = await Promise.all([
    numberService.generateProformaInvoiceNumber(),
    numberService.generateProformaInvoiceNumber(),
    numberService.generateProformaInvoiceNumber(),
  ]);

  const uniqueSet = new Set([num1, num2, num3]);
  assert(uniqueSet.size === 3, `Concurrent numbering generated distinct sequential values: ${[...uniqueSet].join(', ')}`);

  // ─── Scenario 8: Permissions & RBAC Checks ────────────────────────────────
  console.log('\n--- Scenario 8: Role-Based Access Control (RBAC) ---');

  assert(hasPermission('ADMIN' as any, 'proforma_invoice:create'), 'Admin can create Pro Forma Invoices');
  assert(hasPermission('ADMIN' as any, 'proforma_invoice:issue'), 'Admin can issue Pro Forma Invoices');
  assert(hasPermission('ADMIN' as any, 'proforma_invoice:cancel'), 'Admin can cancel Pro Forma Invoices');

  assert(hasPermission('USER' as any, 'proforma_invoice:create', 'Accountant Office'), 'Accountant Office can create Pro Forma Invoices');
  assert(hasPermission('USER' as any, 'proforma_invoice:issue', 'Accountant Office'), 'Accountant Office can issue Pro Forma Invoices');
  assert(!hasPermission('USER' as any, 'proforma_invoice:cancel', 'Accountant Office'), 'Accountant Office cannot cancel Pro Forma Invoices (Admin oversight)');

  assert(!hasPermission('USER' as any, 'proforma_invoice:create', 'Sales Office'), 'Sales Office cannot create Pro Forma Invoices');

  // ─── Scenario 9: Cancellation Isolation ───────────────────────────────────
  console.log('\n--- Scenario 9: Cancellation Isolation ---');

  const [cancelledPi] = await db
    .insert(proformaInvoices)
    .values({
      proformaInvoiceNumber: `PI-TEST-CANCEL-${Date.now()}`,
      salesOrderId: confirmedSo.id,
      customerId: testCustomer.id,
      customerName: testCustomer.name,
      status: 'DRAFT',
      subtotal: '10000.00',
      totalAmount: '11800.00',
      createdBy: adminUser.id,
    })
    .returning();

  await piService.cancel(cancelledPi.id, { reason: 'Order commercial terms revised' }, adminUser.id);
  const reloadedPi = await piService.getById(cancelledPi.id);
  assert(reloadedPi.status === 'CANCELLED', 'PI status updated to CANCELLED');
  assert(reloadedPi.cancellationReason === 'Order commercial terms revised', 'Cancellation reason saved');

  const [soAfterCancel] = await db
    .select()
    .from(salesOrders)
    .where(eq(salesOrders.id, confirmedSo.id));

  assert(
    soAfterCancel.status !== 'CANCELLED',
    `Cancelling a Pro Forma Invoice does NOT cancel its Sales Order (SO status is ${soAfterCancel.status})`
  );

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Test runner encountered unexpected error:', err);
    await pool.end();
    process.exit(1);
  });
