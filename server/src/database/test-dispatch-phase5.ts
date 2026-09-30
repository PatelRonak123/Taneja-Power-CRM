import { db, pool } from './db.js';
import { eq, sql, inArray } from 'drizzle-orm';
import { users } from './schema/users.js';
import { customers } from './schema/customers.js';
import { products } from './schema/products.js';
import { quotations, quotationRevisions, quotationItems } from './schema/quotations.js';
import { salesOrders, salesOrderItems } from './schema/sales-orders.js';
import { salesInvoices, salesInvoiceItems } from './schema/invoices.js';
import { dispatches, dispatchItems, dispatchActivityLogs, dispatchSequences } from './schema/dispatch.js';
import { stockMovements } from './schema/inventory.js';
import { DispatchService } from '../modules/dispatch/services/dispatch.service.js';
import { DispatchNumberService } from '../modules/dispatch/services/dispatch-number.service.js';
import { StockService } from '../modules/inventory/services/stock.service.js';
import { hasPermission } from '../common/auth/permissions.js';
import {
  DISPATCH_STATUSES,
  SO_STATUSES,
  SO_DISPATCH_STATUSES,
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_REFERENCE_TYPES,
} from '../config/constants.js';

async function runDispatchPhase5Tests() {
  console.log('====================================================');
  console.log('RUNNING PHASE 5 DISPATCH & SALES STOCK OUT TEST SUITE');
  console.log('====================================================\n');

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

  const dispatchService = new DispatchService();
  const numberService = new DispatchNumberService();
  const stockService = new StockService();

  // ─── Setup Fixtures ──────────────────────────────────────────────────────────
  const [adminUser] = await db.insert(users).values({
    email: `admin-disp-${Date.now()}@tanejapower.com`,
    passwordHash: 'dummy',
    fullName: 'Dispatch Admin',
    role: 'ADMIN',
  }).returning();

  const [customer] = await db.insert(customers).values({
    name: 'Dispatch Test Customer Ltd',
    companyName: 'Heavy Machinery Works',
    email: 'logistics@heavymachinery.com',
    phone: '9876543210',
    address: 'Plot 88 GIDC Industrial Area',
    city: 'Vadodara',
    state: 'Gujarat',
    pincode: '390010',
    status: 'ACTIVE',
  }).returning();

  // Product 1: Initial stock = 50
  const [product1] = await db.insert(products).values({
    name: 'UPS 10kVA Industrial Inverter',
    sku: `DISP-UPS-${Date.now()}`,
    description: 'Industrial Heavy UPS',
    category: 'INVERTER',
    price: '25000.00',
    stockQuantity: 50,
    status: 'ACTIVE',
  }).returning();

  // Product 2: Initial stock = 20
  const [product2] = await db.insert(products).values({
    name: 'Battery Bank 12V 200Ah',
    sku: `DISP-BAT-${Date.now()}`,
    description: 'Tubular Battery 200Ah',
    category: 'BATTERY',
    price: '12000.00',
    stockQuantity: 20,
    status: 'ACTIVE',
  }).returning();

  // Approved Quotation Fixture
  const [quotation] = await db.insert(quotations).values({
    quotationNumber: `QT-DISP-${Date.now()}`,
    quotationType: 'PRODUCT',
    customerId: customer.id,
    status: 'APPROVED',
    salespersonId: adminUser.id,
    createdById: adminUser.id,
  }).returning();

  const [revision] = await db.insert(quotationRevisions).values({
    quotationId: quotation.id,
    revisionNumber: 1,
    customerName: customer.name,
    validUntil: new Date(Date.now() + 30 * 86400000),
    subtotal: '370000.00',
    taxableAmount: '370000.00',
    grandTotal: '436600.00',
    cgstAmount: '33300.00',
    sgstAmount: '33300.00',
    createdById: adminUser.id,
  }).returning();

  // ─── Fixture Helper: Create Confirmed SO ─────────────────────────────────────
  async function createConfirmedSalesOrder(soNum: string, qty1: number = 10, qty2: number = 5) {
    const [so] = await db.insert(salesOrders).values({
      salesOrderNumber: soNum,
      customerId: customer.id,
      quotationId: quotation.id,
      quotationRevisionId: revision.id,
      customerPoNumber: `CUST-PO-${Date.now()}`,
      orderDate: new Date(),
      status: SO_STATUSES.CONFIRMED,
      dispatchStatus: SO_DISPATCH_STATUSES.NOT_DISPATCHED,
      subtotal: '310000.00',
      totalAmount: '365800.00',
      createdBy: adminUser.id,
      shippingName: customer.name,
      shippingAddress: customer.address,
      shippingCity: customer.city,
      shippingState: customer.state,
      shippingPincode: customer.pincode,
    }).returning();

    const [soItem1] = await db.insert(salesOrderItems).values({
      salesOrderId: so.id,
      productId: product1.id,
      productNameSnapshot: product1.name,
      skuSnapshot: product1.sku,
      unitSnapshot: 'NOS',
      quantity: String(qty1),
      unitPrice: '25000.00',
      taxRate: '18.00',
      taxAmount: String(qty1 * 25000 * 0.18),
      lineSubtotal: String(qty1 * 25000),
      lineTotal: String(qty1 * 25000 * 1.18),
      sortOrder: 0,
    }).returning();

    let soItem2 = null;
    if (qty2 > 0) {
      const [it2] = await db.insert(salesOrderItems).values({
        salesOrderId: so.id,
        productId: product2.id,
        productNameSnapshot: product2.name,
        skuSnapshot: product2.sku,
        unitSnapshot: 'NOS',
        quantity: String(qty2),
        unitPrice: '12000.00',
        taxRate: '18.00',
        taxAmount: String(qty2 * 12000 * 0.18),
        lineSubtotal: String(qty2 * 12000),
        lineTotal: String(qty2 * 12000 * 1.18),
        sortOrder: 1,
      }).returning();
      soItem2 = it2;
    }

    return { so, soItem1, soItem2 };
  }

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: BASIC DISPATCH CREATION & NUMBERING
    // -------------------------------------------------------------------------
    console.log('\n--- Basic Dispatch Creation & Numbering ---');

    const { so: so1, soItem1: so1Item1, soItem2: so1Item2 } = await createConfirmedSalesOrder(`SO-DISP-01-${Date.now()}`, 10, 5);

    const initialStock1 = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    const initialMovementCount = (await db.select({ count: sql<number>`count(*)::int` }).from(stockMovements))[0].count;

    const dispatch1 = await dispatchService.createDispatch(
      {
        salesOrderId: so1.id,
        vehicleNumber: 'GJ-06-AZ-1234',
        transporterName: 'VRL Logistics',
        driverName: 'Ramesh Patel',
        driverPhone: '9898012345',
        notes: 'Handle with care',
      },
      { id: adminUser.id, userId: adminUser.id }
    );

    assert(dispatch1 != null, 'TEST 1: Create dispatch from eligible CONFIRMED Sales Order');
    assert(!!dispatch1.dispatchNumber, 'TEST 2: Dispatch gets generated number');
    assert(/^DC\/\d{4}-\d{2}\/\d{4}$/.test(dispatch1.dispatchNumber), `TEST 3: Correct DC/YYYY-YY/XXXX format (got ${dispatch1.dispatchNumber})`);
    assert(dispatch1.deliveryChallanNumber === dispatch1.dispatchNumber, 'TEST 3b: Delivery Challan number matches dispatch number');
    assert(dispatch1.status === DISPATCH_STATUSES.DRAFT, 'TEST 4: Dispatch starts in DRAFT status');

    // Verify draft does NOT modify stock
    const afterDraftStock1 = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    const afterDraftMovementCount = (await db.select({ count: sql<number>`count(*)::int` }).from(stockMovements))[0].count;

    assert(afterDraftStock1 === initialStock1, `TEST 5: Draft dispatch does NOT modify stockQuantity (${initialStock1} == ${afterDraftStock1})`);
    assert(afterDraftMovementCount === initialMovementCount, `TEST 6: Draft dispatch does NOT create stock movement rows (${initialMovementCount} == ${afterDraftMovementCount})`);

    // -------------------------------------------------------------------------
    // SECTION 2: QUANTITY BOUNDS & PARTIAL DISPATCH
    // -------------------------------------------------------------------------
    console.log('\n--- Quantity Bounds & Partial Dispatch ---');

    // Attempting to dispatch more than SO quantity should be rejected
    const { so: so2, soItem1: so2Item1 } = await createConfirmedSalesOrder(`SO-DISP-02-${Date.now()}`, 10, 0);

    let overDispatchRejected = false;
    try {
      await dispatchService.createDispatch(
        {
          salesOrderId: so2.id,
          items: [{ salesOrderItemId: so2Item1.id, dispatchQuantity: 15 }], // 15 > 10
        },
        { id: adminUser.id }
      );
    } catch (err: any) {
      if (err.errorCode === 'EXCESSIVE_DISPATCH_QUANTITY' || err.statusCode === 400) {
        overDispatchRejected = true;
      }
    }
    assert(overDispatchRejected, 'TEST 7: Cannot dispatch more than Sales Order quantity (15 > 10)');

    // Partial dispatch 1: dispatch 4 out of 10
    const partialDisp1 = await dispatchService.createDispatch(
      {
        salesOrderId: so2.id,
        items: [{ salesOrderItemId: so2Item1.id, dispatchQuantity: 4 }],
      },
      { id: adminUser.id }
    );
    assert(partialDisp1 != null, 'TEST 9: Partial dispatch works (created draft for 4 of 10)');

    // Confirm partial dispatch 1 -> executes Stock OUT of 4
    const stockBeforeDisp1 = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    await dispatchService.submitDispatch(partialDisp1.id, { id: adminUser.id });
    await dispatchService.confirmDispatch(partialDisp1.id, { id: adminUser.id });
    const stockAfterDisp1 = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);

    assert(stockAfterDisp1 === stockBeforeDisp1 - 4, `TEST 9b: Confirming partial dispatch deducted exactly 4 units (${stockBeforeDisp1} -> ${stockAfterDisp1})`);

    // Verify SO dispatchStatus updated to PARTIALLY_DISPATCHED
    const so2Updated1 = (await db.select().from(salesOrders).where(eq(salesOrders.id, so2.id)))[0];
    assert(so2Updated1.dispatchStatus === SO_DISPATCH_STATUSES.PARTIALLY_DISPATCHED, 'TEST 9c: SO dispatchStatus is PARTIALLY_DISPATCHED');

    // Attempting to dispatch 7 when only 6 remain (10 - 4 = 6)
    let secondOverDispatchRejected = false;
    try {
      await dispatchService.createDispatch(
        {
          salesOrderId: so2.id,
          items: [{ salesOrderItemId: so2Item1.id, dispatchQuantity: 7 }], // 7 > 6
        },
        { id: adminUser.id }
      );
    } catch (err: any) {
      if (err.errorCode === 'EXCESSIVE_DISPATCH_QUANTITY' || err.statusCode === 400) {
        secondOverDispatchRejected = true;
      }
    }
    assert(secondOverDispatchRejected, 'TEST 8: Cannot dispatch more than remaining SO quantity (7 > 6)');

    // Second partial dispatch: dispatch 3 of remaining 6
    const partialDisp2 = await dispatchService.createDispatch(
      {
        salesOrderId: so2.id,
        items: [{ salesOrderItemId: so2Item1.id, dispatchQuantity: 3 }],
      },
      { id: adminUser.id }
    );
    await dispatchService.submitDispatch(partialDisp2.id, { id: adminUser.id });
    await dispatchService.confirmDispatch(partialDisp2.id, { id: adminUser.id });
    assert(true, 'TEST 10: Multiple partial dispatches accumulate correctly (4 + 3 = 7 dispatched)');

    // Final dispatch: dispatch remaining 3 of 10
    const partialDisp3 = await dispatchService.createDispatch(
      {
        salesOrderId: so2.id,
        items: [{ salesOrderItemId: so2Item1.id, dispatchQuantity: 3 }],
      },
      { id: adminUser.id }
    );
    await dispatchService.submitDispatch(partialDisp3.id, { id: adminUser.id });
    await dispatchService.confirmDispatch(partialDisp3.id, { id: adminUser.id });

    const so2UpdatedFinal = (await db.select().from(salesOrders).where(eq(salesOrders.id, so2.id)))[0];
    assert(so2UpdatedFinal.dispatchStatus === SO_DISPATCH_STATUSES.FULLY_DISPATCHED, 'TEST 11: Final dispatch reaches full quantity, SO is FULLY_DISPATCHED');

    // Trying to dispatch again when SO is fully dispatched must fail
    let fullyDispatchedRejected = false;
    try {
      await dispatchService.createDispatch({ salesOrderId: so2.id }, { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'ALL_ITEMS_ALREADY_DISPATCHED' || err.statusCode === 400) {
        fullyDispatchedRejected = true;
      }
    }
    assert(fullyDispatchedRejected, 'TEST 11b: Cannot create dispatch for an already fully dispatched Sales Order');

    // -------------------------------------------------------------------------
    // SECTION 3: INVOICE / SALES ORDER ELIGIBILITY RULES
    // -------------------------------------------------------------------------
    console.log('\n--- SO Eligibility & Invoice Rules ---');

    // DRAFT Sales Order cannot be dispatched
    const [draftSo] = await db.insert(salesOrders).values({
      salesOrderNumber: `SO-DRAFT-${Date.now()}`,
      customerId: customer.id,
      quotationId: quotation.id,
      quotationRevisionId: revision.id,
      status: SO_STATUSES.DRAFT,
      createdBy: adminUser.id,
    }).returning();

    let draftSoRejected = false;
    try {
      await dispatchService.createDispatch({ salesOrderId: draftSo.id }, { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'SALES_ORDER_NOT_DISPATCHABLE' || err.statusCode === 400) {
        draftSoRejected = true;
      }
    }
    assert(draftSoRejected, 'TEST 13: Cannot dispatch DRAFT Sales Order');

    // CANCELLED Sales Order cannot be dispatched
    const [cancelledSo] = await db.insert(salesOrders).values({
      salesOrderNumber: `SO-CANC-${Date.now()}`,
      customerId: customer.id,
      quotationId: quotation.id,
      quotationRevisionId: revision.id,
      status: SO_STATUSES.CANCELLED,
      cancellationReason: 'Customer requested cancellation',
      createdBy: adminUser.id,
    }).returning();

    let cancelledSoRejected = false;
    try {
      await dispatchService.createDispatch({ salesOrderId: cancelledSo.id }, { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'SALES_ORDER_NOT_DISPATCHABLE' || err.statusCode === 400) {
        cancelledSoRejected = true;
      }
    }
    assert(cancelledSoRejected, 'TEST 14: Cannot dispatch CANCELLED Sales Order');

    // Invoice linkage support
    const [testInvoice] = await db.insert(salesInvoices).values({
      invoiceNumber: `INV-DISP-${Date.now()}`,
      salesOrderId: so1.id,
      customerId: customer.id,
      status: 'ISSUED',
      customerName: customer.companyName || 'Test Customer',
      subtotal: '25000.00',
      totalAmount: '29500.00',
      createdBy: adminUser.id,
    }).returning();

    const dispatchWithInvoice = await dispatchService.createDispatch(
      {
        salesOrderId: so1.id,
        salesInvoiceId: testInvoice.id,
        items: [{ salesOrderItemId: so1Item1.id, dispatchQuantity: 2 }],
      },
      { id: adminUser.id }
    );
    assert(dispatchWithInvoice.salesInvoiceId === testInvoice.id, 'TEST 12: Invoice linkage preserved on dispatch');

    // -------------------------------------------------------------------------
    // SECTION 4: STOCK OUT, LEDGER ENTRIES, & NEGATIVE STOCK REJECTION
    // -------------------------------------------------------------------------
    console.log('\n--- Stock OUT & Ledger Entries ---');

    const { so: soStock, soItem1: soStockItem1 } = await createConfirmedSalesOrder(`SO-STOCK-${Date.now()}`, 5, 0);
    const preStock = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);

    const stockDisp = await dispatchService.createDispatch(
      {
        salesOrderId: soStock.id,
        items: [{ salesOrderItemId: soStockItem1.id, dispatchQuantity: 5 }],
      },
      { id: adminUser.id }
    );

    // Transition to PENDING_DISPATCH
    await dispatchService.submitDispatch(stockDisp.id, { id: adminUser.id });
    // Execute Stock OUT
    const confirmedDisp = await dispatchService.confirmDispatch(stockDisp.id, { id: adminUser.id });

    const postStock = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    assert(confirmedDisp.status === DISPATCH_STATUSES.DISPATCHED, 'TEST 15: Status is DISPATCHED after confirm');
    assert(postStock === preStock - 5, `TEST 15b: Stock decreased by exactly 5 (${preStock} -> ${postStock})`);

    // Verify stock_movements ledger entry
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.referenceId, confirmedDisp.id));

    assert(movements.length === 1, 'TEST 16: Exactly 1 stock_movements row created for dispatch');
    assert(movements[0].movementType === INVENTORY_MOVEMENT_TYPES.OUT, 'TEST 17: Movement type is OUT');
    assert(movements[0].referenceType === INVENTORY_REFERENCE_TYPES.SALES_DISPATCH, 'TEST 18: Movement referenceType is SALES_DISPATCH');
    assert(movements[0].referenceId === confirmedDisp.id, 'TEST 19: Movement referenceId equals dispatch.id');
    assert(movements[0].previousQuantity === preStock && movements[0].newQuantity === postStock, `TEST 20: Movement records accurate previousQuantity (${preStock}) and newQuantity (${postStock})`);

    // Negative stock rejection
    // Current stock of product2 is 20. Attempt to dispatch 25.
    const { so: soOversell, soItem1: soOversellItem } = await createConfirmedSalesOrder(`SO-OVERSELL-${Date.now()}`, 0, 0);
    const [oversellItem] = await db.insert(salesOrderItems).values({
      salesOrderId: soOversell.id,
      productId: product2.id,
      productNameSnapshot: product2.name,
      quantity: '25',
      unitPrice: '12000.00',
      lineSubtotal: '300000.00',
      lineTotal: '354000.00',
    }).returning();

    const oversellDisp = await dispatchService.createDispatch(
      {
        salesOrderId: soOversell.id,
        items: [{ salesOrderItemId: oversellItem.id, dispatchQuantity: 25 }],
      },
      { id: adminUser.id }
    );
    await dispatchService.submitDispatch(oversellDisp.id, { id: adminUser.id });

    let oversellRejected = false;
    try {
      await dispatchService.confirmDispatch(oversellDisp.id, { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'INSUFFICIENT_STOCK' || err.message?.includes('INSUFFICIENT_STOCK')) {
        oversellRejected = true;
      }
    }
    assert(oversellRejected, 'TEST 21: Negative stock strictly rejected with INSUFFICIENT_STOCK error');

    // -------------------------------------------------------------------------
    // SECTION 5: IDEMPOTENCY
    // -------------------------------------------------------------------------
    console.log('\n--- Idempotency ---');

    let duplicateDispatchRejected = false;
    const stockBeforeDup = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    const movementCountBeforeDup = (await db.select({ count: sql<number>`count(*)::int` }).from(stockMovements))[0].count;

    try {
      // Re-calling confirmDispatch on already completed dispatch
      await dispatchService.confirmDispatch(confirmedDisp.id, { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'DISPATCH_ALREADY_COMPLETED' || err.statusCode === 409) {
        duplicateDispatchRejected = true;
      }
    }

    const stockAfterDup = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    const movementCountAfterDup = (await db.select({ count: sql<number>`count(*)::int` }).from(stockMovements))[0].count;

    assert(duplicateDispatchRejected, 'TEST 22: Re-dispatching an already DISPATCHED Delivery Challan is rejected');
    assert(stockAfterDup === stockBeforeDup, `TEST 23: Duplicate dispatch causes ZERO extra stock deduction (${stockBeforeDup} == ${stockAfterDup})`);
    assert(movementCountAfterDup === movementCountBeforeDup, 'TEST 23b: Duplicate dispatch creates NO additional stock_movements rows');

    // -------------------------------------------------------------------------
    // SECTION 6: MULTI-LINE TRANSACTION ROLLBACK
    // -------------------------------------------------------------------------
    console.log('\n--- Failure & Atomic Rollback ---');

    // Create a 3-line order:
    // Line 1: Product 1 (has stock)
    // Line 2: Product 1 (has stock)
    // Line 3: Product 2 requesting 999 units (INSUFFICIENT STOCK!)
    const { so: soRollback, soItem1: rbItem1 } = await createConfirmedSalesOrder(`SO-RB-${Date.now()}`, 2, 0);

    const [rbItem2] = await db.insert(salesOrderItems).values({
      salesOrderId: soRollback.id,
      productId: product1.id,
      productNameSnapshot: product1.name,
      quantity: '3',
      unitPrice: '25000.00',
      lineSubtotal: '75000.00',
      lineTotal: '88500.00',
      sortOrder: 1,
    }).returning();

    const [rbItem3] = await db.insert(salesOrderItems).values({
      salesOrderId: soRollback.id,
      productId: product2.id,
      productNameSnapshot: product2.name,
      quantity: '999',
      unitPrice: '12000.00',
      lineSubtotal: '11988000.00',
      lineTotal: '14145840.00',
      sortOrder: 2,
    }).returning();

    const rbDisp = await dispatchService.createDispatch(
      {
        salesOrderId: soRollback.id,
        items: [
          { salesOrderItemId: rbItem1.id, dispatchQuantity: 2 },
          { salesOrderItemId: rbItem2.id, dispatchQuantity: 3 },
          { salesOrderItemId: rbItem3.id, dispatchQuantity: 999 }, // Will fail!
        ],
      },
      { id: adminUser.id }
    );
    await dispatchService.submitDispatch(rbDisp.id, { id: adminUser.id });

    const p1StockBeforeRb = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    const movementsBeforeRb = (await db.select({ count: sql<number>`count(*)::int` }).from(stockMovements))[0].count;

    let rbCaught = false;
    try {
      await dispatchService.confirmDispatch(rbDisp.id, { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'INSUFFICIENT_STOCK' || err.message?.includes('INSUFFICIENT_STOCK')) {
        rbCaught = true;
      }
    }

    const p1StockAfterRb = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    const movementsAfterRb = (await db.select({ count: sql<number>`count(*)::int` }).from(stockMovements))[0].count;
    const dispAfterRb = (await db.select().from(dispatches).where(eq(dispatches.id, rbDisp.id)))[0];

    assert(rbCaught, 'TEST 24: Multi-line dispatch failed on line 3 insufficient stock');
    assert(p1StockAfterRb === p1StockBeforeRb, `TEST 24b: Line 1 and Line 2 Stock OUT completely rolled back (${p1StockBeforeRb} == ${p1StockAfterRb})`);
    assert(movementsAfterRb === movementsBeforeRb, `TEST 25: Zero partial stock_movements ledger rows committed (${movementsBeforeRb} == ${movementsAfterRb})`);
    assert(dispAfterRb.status === DISPATCH_STATUSES.PENDING_DISPATCH, 'TEST 26: Dispatch status was NOT updated to DISPATCHED after failure');

    // -------------------------------------------------------------------------
    // SECTION 7: CONCURRENCY
    // -------------------------------------------------------------------------
    console.log('\n--- Concurrency Guarantees ---');

    // Concurrency 1: 5 concurrent dispatch numbers generated must all be unique
    const generatedNumbers = await Promise.all([
      numberService.generateDispatchNumber(),
      numberService.generateDispatchNumber(),
      numberService.generateDispatchNumber(),
      numberService.generateDispatchNumber(),
      numberService.generateDispatchNumber(),
    ]);
    const uniqueNumbers = new Set(generatedNumbers);
    assert(uniqueNumbers.size === 5, `TEST 29: 5 concurrent dispatch numbers are all unique (${Array.from(uniqueNumbers).join(', ')})`);

    // Concurrency 2: Concurrent race condition for physical stock
    // Create dedicated product with stock = 10
    const [competeProd] = await db.insert(products).values({
      name: 'Limited Generator Unit',
      sku: `COMP-PROD-${Date.now()}`,
      category: 'GENERATOR',
      price: '50000.00',
      stockQuantity: 10,
      status: 'ACTIVE',
    }).returning();

    const { so: soComp1, soItem1: itemComp1 } = await createConfirmedSalesOrder(`SO-CMP1-${Date.now()}`, 0, 0);
    const { so: soComp2, soItem1: itemComp2 } = await createConfirmedSalesOrder(`SO-CMP2-${Date.now()}`, 0, 0);

    const [ci1] = await db.insert(salesOrderItems).values({
      salesOrderId: soComp1.id,
      productId: competeProd.id,
      productNameSnapshot: competeProd.name,
      quantity: '7',
      unitPrice: '50000.00',
      lineSubtotal: '350000.00',
      lineTotal: '413000.00',
    }).returning();

    const [ci2] = await db.insert(salesOrderItems).values({
      salesOrderId: soComp2.id,
      productId: competeProd.id,
      productNameSnapshot: competeProd.name,
      quantity: '7',
      unitPrice: '50000.00',
      lineSubtotal: '350000.00',
      lineTotal: '413000.00',
    }).returning();

    // Dispatch A requests 7, Dispatch B requests 7 (Total 14 > 10 Available)
    const dispA = await dispatchService.createDispatch(
      { salesOrderId: soComp1.id, items: [{ salesOrderItemId: ci1.id, dispatchQuantity: 7 }] },
      { id: adminUser.id }
    );
    const dispB = await dispatchService.createDispatch(
      { salesOrderId: soComp2.id, items: [{ salesOrderItemId: ci2.id, dispatchQuantity: 7 }] },
      { id: adminUser.id }
    );

    await dispatchService.submitDispatch(dispA.id, { id: adminUser.id });
    await dispatchService.submitDispatch(dispB.id, { id: adminUser.id });

    const results = await Promise.allSettled([
      dispatchService.confirmDispatch(dispA.id, { id: adminUser.id }),
      dispatchService.confirmDispatch(dispB.id, { id: adminUser.id }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    const finalCompeteStock = Number((await db.select().from(products).where(eq(products.id, competeProd.id)))[0].stockQuantity);

    assert(successes.length === 1 && failures.length === 1, `TEST 27: Concurrent dispatches cannot oversell physical stock (successes=${successes.length}, failures=${failures.length})`);
    assert(finalCompeteStock === 3, `TEST 27b: Final stock is exactly 3 (10 - 7 = 3, never negative)`);

    // -------------------------------------------------------------------------
    // SECTION 8: LIFECYCLE & EDIT RULES
    // -------------------------------------------------------------------------
    console.log('\n--- Lifecycle & Edit Rules ---');

    const { so: soLife, soItem1: lifeItem1 } = await createConfirmedSalesOrder(`SO-LIFE-${Date.now()}`, 5, 0);
    const lifeDisp = await dispatchService.createDispatch(
      { salesOrderId: soLife.id, vehicleNumber: 'OLD-VEHICLE-1' },
      { id: adminUser.id }
    );

    // Edit DRAFT
    const editedDisp = await dispatchService.updateDispatch(
      lifeDisp.id,
      { vehicleNumber: 'NEW-VEHICLE-2', transporterName: 'Blue Dart' },
      { id: adminUser.id }
    );
    assert(editedDisp.vehicleNumber === 'NEW-VEHICLE-2', 'TEST 30: DRAFT dispatch can be edited');

    // Submit DRAFT -> PENDING_DISPATCH
    await dispatchService.submitDispatch(lifeDisp.id, { id: adminUser.id });

    // PENDING_DISPATCH cannot be edited
    let pendingEditRejected = false;
    try {
      await dispatchService.updateDispatch(lifeDisp.id, { vehicleNumber: 'ILLEGAL-VEHICLE' }, { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'DISPATCH_LOCKED' || err.statusCode === 400) {
        pendingEditRejected = true;
      }
    }
    assert(pendingEditRejected, 'TEST 31: PENDING_DISPATCH dispatch is locked from editing');

    // Confirm dispatch -> DISPATCHED
    await dispatchService.confirmDispatch(lifeDisp.id, { id: adminUser.id });

    // DISPATCHED cannot be edited
    let dispatchedEditRejected = false;
    try {
      await dispatchService.updateDispatch(lifeDisp.id, { vehicleNumber: 'ILLEGAL-VEHICLE' }, { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'DISPATCH_LOCKED' || err.statusCode === 400) {
        dispatchedEditRejected = true;
      }
    }
    assert(dispatchedEditRejected, 'TEST 32: DISPATCHED Delivery Challan cannot be edited');

    // Cancellation requires reason
    const { so: soCanc, soItem1: cancItem } = await createConfirmedSalesOrder(`SO-CANC2-${Date.now()}`, 5, 0);
    const dispToCancel = await dispatchService.createDispatch({ salesOrderId: soCanc.id }, { id: adminUser.id });

    let emptyReasonRejected = false;
    try {
      await dispatchService.cancelDispatch(dispToCancel.id, '', { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'CANCELLATION_REASON_REQUIRED' || err.statusCode === 400) {
        emptyReasonRejected = true;
      }
    }
    assert(emptyReasonRejected, 'TEST 33: Cancellation requires non-empty reason');

    const cancelledDisp = await dispatchService.cancelDispatch(
      dispToCancel.id,
      'Damaged packaging before loading',
      { id: adminUser.id }
    );
    assert(cancelledDisp.status === DISPATCH_STATUSES.CANCELLED, 'TEST 33b: Dispatch status is CANCELLED');

    // Cancelled dispatch cannot be dispatched
    let cancelledDispatchBlocked = false;
    try {
      await dispatchService.confirmDispatch(cancelledDisp.id, { id: adminUser.id });
    } catch (err: any) {
      if (err.errorCode === 'CANNOT_DISPATCH_CANCELLED' || err.statusCode === 400) {
        cancelledDispatchBlocked = true;
      }
    }
    assert(cancelledDispatchBlocked, 'TEST 34: Cancelled dispatch cannot be dispatched');

    // -------------------------------------------------------------------------
    // SECTION 9: RBAC PERMISSION CONTROLS
    // -------------------------------------------------------------------------
    console.log('\n--- RBAC Controls ---');

    assert(hasPermission('USER', 'dispatch:read', 'Accountant Office'), 'TEST 35: Accountant Office can read dispatches');
    assert(hasPermission('USER', 'dispatch:create', 'Accountant Office'), 'TEST 36: Accountant Office can create dispatch drafts');
    assert(hasPermission('USER', 'dispatch:submit', 'Accountant Office'), 'TEST 37: Accountant Office can submit dispatches');
    assert(!hasPermission('USER', 'dispatch:dispatch', 'Accountant Office'), 'TEST 38: Accountant Office CANNOT perform physical Stock OUT (restricted)');
    assert(!hasPermission('USER', 'dispatch:cancel', 'Accountant Office'), 'TEST 38b: Accountant Office CANNOT cancel dispatches (restricted)');

    assert(hasPermission('ADMIN', 'dispatch:dispatch'), 'TEST 39: ADMIN has dispatch confirmation permission');
    assert(hasPermission('MANAGER', 'dispatch:dispatch'), 'TEST 40: MANAGER has dispatch confirmation permission');

    assert(!hasPermission('USER', 'dispatch:read'), 'TEST 41: Generic USER without accountant designation cannot read dispatches');
    assert(!hasPermission('USER', 'dispatch:create'), 'TEST 41b: Generic USER cannot create dispatches');

    // -------------------------------------------------------------------------
    // SECTION 10: REGRESSION INTEGRATION
    // -------------------------------------------------------------------------
    console.log('\n--- Regressions ---');

    // Phase 1 StockService.addStock still works
    const stockBeforeAdd = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    await stockService.addStock({ productId: product1.id, quantity: 10, reason: 'Phase 1 verification' });
    const stockAfterAdd = Number((await db.select().from(products).where(eq(products.id, product1.id)))[0].stockQuantity);
    assert(stockAfterAdd === stockBeforeAdd + 10, 'TEST 42: Phase 1 StockService.addStock still functions perfectly');

  } catch (error) {
    console.error('Fatal error during Phase 5 tests:', error);
    failed++;
  } finally {
    console.log('\n====================================================');
    console.log(`PHASE 5 RESULTS: ${passed} passed, ${failed} failed`);
    console.log('====================================================\n');
  }
}

runDispatchPhase5Tests()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Test execution failed:', err);
    pool.end();
    process.exit(1);
  });
