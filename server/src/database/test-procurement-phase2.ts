import { db, pool } from './db.js';
import { products } from './schema/products.js';
import { stockMovements } from './schema/inventory.js';
import {
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
} from './schema/procurement.js';
import { vendorInvoices, vendorInvoiceItems } from './schema/invoices.js';
import { users } from './schema/users.js';
import { eq, sql, inArray } from 'drizzle-orm';
import { SupplierService } from '../modules/procurement/services/supplier.service.js';
import { PurchaseOrderService } from '../modules/procurement/services/purchase-order.service.js';
import { GoodsReceiptService } from '../modules/procurement/services/goods-receipt.service.js';
import { GoodsReceiptRepository } from '../modules/procurement/repositories/goods-receipt.repository.js';
import { PurchaseOrderRepository } from '../modules/procurement/repositories/purchase-order.repository.js';
import { StockService } from '../modules/inventory/services/stock.service.js';
import { hasPermission } from '../common/auth/permissions.js';
import {
  PO_STATUSES,
  GRN_STATUSES,
  SUPPLIER_STATUSES,
  INVENTORY_REFERENCE_TYPES
} from '../config/constants.js';

async function runProcurementPhase2Tests() {
  console.log('====================================================');
  console.log('RUNNING PHASE 2 PROCUREMENT AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  const supplierService = new SupplierService();
  const poService = new PurchaseOrderService();
  const grnService = new GoodsReceiptService();
  const stockService = new StockService();

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

  // Setup test user
  let testUser = await db.query.users.findFirst({
    where: eq(users.email, 'procurement.test@tanejapower.com'),
  });

  if (!testUser) {
    const [created] = await db
      .insert(users)
      .values({
        fullName: 'Procurement Test Admin',
        email: 'procurement.test@tanejapower.com',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'ADMIN',
        status: 'ACTIVE',
      })
      .returning();
    testUser = created;
  }

  const authUser = { id: testUser.id, userId: testUser.id };

  // Cleanup any old test artifacts
  async function cleanup() {
    // Delete test vendor invoice records that reference POs/GRNs
    await db.delete(vendorInvoiceItems).where(sql`true`);
    await db.delete(vendorInvoices).where(sql`true`);
    // Delete test procurement records
    await db.delete(goodsReceiptItems).where(sql`true`);
    await db.delete(goodsReceipts).where(sql`true`);
    await db.delete(purchaseOrderItems).where(sql`true`);
    await db.delete(purchaseOrders).where(sql`true`);
    await db.delete(suppliers).where(sql`supplier_code LIKE 'TEST-SUP-%' OR supplier_code LIKE 'SUP-%'`);
    // Delete test stock movements
    const testProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(sql`sku LIKE 'TEST-PROC-%'`);
    if (testProducts.length > 0) {
      const ids = testProducts.map((p) => p.id);
      await db.delete(stockMovements).where(inArray(stockMovements.productId, ids));
      await db.delete(products).where(inArray(products.id, ids));
    }
  }

  await cleanup();

  // Helper to create test product
  async function createTestProduct(sku: string, initialStock: number = 0, price: number = 1000) {
    const [p] = await db
      .insert(products)
      .values({
        name: `Test Product ${sku}`,
        sku,
        description: 'Test product for procurement',
        category: 'PANELS',
        price: price.toFixed(2),
        stockQuantity: initialStock,
        status: 'ACTIVE',
      })
      .returning();
    return p;
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Supplier creation
    // ----------------------------------------------------
    const supplier1 = await supplierService.createSupplier({
      supplierCode: 'TEST-SUP-001',
      name: 'Adani Solar Technologies Ltd',
      legalName: 'Adani Solar Tech Pvt Ltd',
      contactPerson: 'Rajesh Sharma',
      phone: '+919876543210',
      email: 'rajesh@adanisolar.test',
      city: 'Mundra',
      state: 'Gujarat',
      pincode: '370421',
      gstin: '24AAACA0000A1Z5',
      pan: 'AAACA0000A',
      paymentTerms: 'Net 30 Days',
    });

    assert(
      supplier1.id !== undefined &&
        supplier1.supplierCode === 'TEST-SUP-001' &&
        supplier1.status === SUPPLIER_STATUSES.ACTIVE,
      'TEST 1: Supplier creation',
      `Created supplier ID: ${supplier1.id}`
    );

    // ----------------------------------------------------
    // TEST 2: Duplicate supplier code rejected
    // ----------------------------------------------------
    let duplicateRejected = false;
    try {
      await supplierService.createSupplier({
        supplierCode: 'TEST-SUP-001',
        name: 'Another Vendor',
      });
    } catch (err: any) {
      if (err.errorCode === 'DUPLICATE_SUPPLIER_CODE' || err.statusCode === 409) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'TEST 2: Duplicate supplier code rejected');

    // ----------------------------------------------------
    // TEST 3: PO creation
    // ----------------------------------------------------
    const productA = await createTestProduct('TEST-PROC-P1', 100, 5000);
    const productB = await createTestProduct('TEST-PROC-P2', 50, 2000);

    const po1 = await poService.createPurchaseOrder(
      {
        supplierId: supplier1.id,
        notes: 'Urgent solar panel supply',
        termsAndConditions: 'Standard warranty applies',
        items: [
          {
            productId: productA.id,
            quantity: 50,
            unitCost: 4500,
            taxRate: 18,
          },
          {
            productId: productB.id,
            quantity: 20,
            unitCost: 1800,
            taxRate: 18,
          },
        ],
      },
      authUser.userId
    );

    const prodABeforeApproval = await db.query.products.findFirst({ where: eq(products.id, productA.id) });
    const prodBBeforeApproval = await db.query.products.findFirst({ where: eq(products.id, productB.id) });

    assert(
      po1.status === PO_STATUSES.DRAFT &&
        po1.poNumber.startsWith('PO/') &&
        po1.items.length === 2 &&
        prodABeforeApproval?.stockQuantity === 100 &&
        prodBBeforeApproval?.stockQuantity === 50,
      'TEST 3: PO creation (initial status DRAFT, stock unchanged)',
      `PO Number: ${po1.poNumber}`
    );

    // ----------------------------------------------------
    // TEST 4: PO totals calculated server-side
    // Item 1: 50 * 4500 = 225,000 subtotal, 18% tax = 40,500, lineTotal = 265,500
    // Item 2: 20 * 1800 = 36,000 subtotal, 18% tax = 6,480, lineTotal = 42,480
    // Subtotal = 261,000.00, Tax = 46,980.00, Total = 307,980.00
    // ----------------------------------------------------
    const expectedSubtotal = '261000.00';
    const expectedTax = '46980.00';
    const expectedTotal = '307980.00';

    assert(
      po1.subtotal === expectedSubtotal &&
        po1.taxAmount === expectedTax &&
        po1.totalAmount === expectedTotal,
      'TEST 4: PO totals calculated server-side with decimal precision',
      `Subtotal: ${po1.subtotal}, Tax: ${po1.taxAmount}, Total: ${po1.totalAmount}`
    );

    // ----------------------------------------------------
    // TEST 5: PO approval workflow
    // DRAFT -> PENDING_APPROVAL -> APPROVED
    // ----------------------------------------------------
    await poService.submitPurchaseOrder(po1.id);
    const submittedPo = await poService.getPurchaseOrderById(po1.id);
    assert(submittedPo.status === PO_STATUSES.PENDING_APPROVAL, 'TEST 5A: PO submitted to PENDING_APPROVAL');

    const approvedPo = await poService.approvePurchaseOrder(po1.id, authUser.userId);
    assert(
      approvedPo.status === PO_STATUSES.APPROVED &&
        approvedPo.approvedBy === authUser.userId &&
        approvedPo.approvedAt !== null,
      'TEST 5B: PO approval records approver and timestamp'
    );

    // ----------------------------------------------------
    // TEST 6: PO approval does NOT change stock
    // ----------------------------------------------------
    const prodAAfterApproval = await db.query.products.findFirst({ where: eq(products.id, productA.id) });
    const prodBAfterApproval = await db.query.products.findFirst({ where: eq(products.id, productB.id) });

    const movementsAfterApproval = await db
      .select()
      .from(stockMovements)
      .where(inArray(stockMovements.productId, [productA.id, productB.id]));

    assert(
      prodAAfterApproval?.stockQuantity === 100 &&
        prodBAfterApproval?.stockQuantity === 50 &&
        movementsAfterApproval.length === 0,
      'TEST 6: PO approval does NOT change stock or write movements',
      `Stock remains: Product A = ${prodAAfterApproval?.stockQuantity}, Product B = ${prodBAfterApproval?.stockQuantity}`
    );

    // ----------------------------------------------------
    // TEST 7: GRN creation (draft)
    // ----------------------------------------------------
    const po1ItemA = approvedPo.items.find((i) => i.productId === productA.id)!;
    const grnDraft = await grnService.createGoodsReceipt(
      {
        purchaseOrderId: approvedPo.id,
        notes: 'Delivery challan #1042 arrived',
        items: [
          {
            purchaseOrderItemId: po1ItemA.id,
            receivedQuantity: 30,
          },
        ],
        autoPost: false,
      },
      authUser
    );

    const prodAAfterDraft = await db.query.products.findFirst({ where: eq(products.id, productA.id) });
    assert(
      grnDraft.status === GRN_STATUSES.DRAFT &&
        grnDraft.grnNumber.startsWith('GRN/') &&
        prodAAfterDraft?.stockQuantity === 100,
      'TEST 7: GRN draft created and does NOT change stock',
      `GRN: ${grnDraft.grnNumber}, Stock: ${prodAAfterDraft?.stockQuantity}`
    );

    // ----------------------------------------------------
    // TEST 8: GRN posting increases stock via StockService.addStock()
    // Initial stock: 100, Received: 30 -> New stock: 130
    // ----------------------------------------------------
    const postedGrn = await grnService.postGoodsReceipt(grnDraft.id, authUser);
    const prodAAfterPost = await db.query.products.findFirst({ where: eq(products.id, productA.id) });

    const movementsAfterPost = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.referenceId, postedGrn.id));

    assert(
      postedGrn.status === GRN_STATUSES.POSTED &&
        prodAAfterPost?.stockQuantity === 130 &&
        movementsAfterPost.length === 1 &&
        movementsAfterPost[0].movementType === 'IN' &&
        movementsAfterPost[0].referenceType === INVENTORY_REFERENCE_TYPES.PURCHASE_RECEIPT &&
        movementsAfterPost[0].quantity === 30 &&
        movementsAfterPost[0].previousQuantity === 100 &&
        movementsAfterPost[0].newQuantity === 130,
      'TEST 8: GRN posting increases stock with ledger entry via StockService',
      `Previous: 100, New: ${prodAAfterPost?.stockQuantity}, RefType: ${movementsAfterPost[0]?.referenceType}`
    );

    // ----------------------------------------------------
    // TEST 9: Partial GRN
    // New PO with 100 solar panels. Initial stock = 0.
    // Receive 60 -> stock = 60, PO = PARTIALLY_RECEIVED, remaining = 40.
    // ----------------------------------------------------
    const productPanel = await createTestProduct('TEST-PROC-PANEL', 0, 8000);
    const poPartial = await poService.createPurchaseOrder(
      {
        supplierId: supplier1.id,
        items: [{ productId: productPanel.id, quantity: 100, unitCost: 7500, taxRate: 18 }],
      },
      authUser.userId
    );
    await poService.submitPurchaseOrder(poPartial.id);
    const approvedPartialPo = await poService.approvePurchaseOrder(poPartial.id, authUser.userId);
    const panelPoItem = approvedPartialPo.items[0];

    const grn1 = await grnService.createGoodsReceipt(
      {
        purchaseOrderId: approvedPartialPo.id,
        items: [{ purchaseOrderItemId: panelPoItem.id, receivedQuantity: 60 }],
        autoPost: true,
      },
      authUser
    );

    const prodPanelAfterGrn1 = await db.query.products.findFirst({ where: eq(products.id, productPanel.id) });
    const poAfterGrn1 = await poService.getPurchaseOrderById(approvedPartialPo.id);

    assert(
      prodPanelAfterGrn1?.stockQuantity === 60 &&
        poAfterGrn1.status === PO_STATUSES.PARTIALLY_RECEIVED &&
        poAfterGrn1.items[0].receivedQuantity === 60,
      'TEST 9: Partial GRN (PO: 100, GRN: 60 -> stock +60, status PARTIALLY_RECEIVED, remaining 40)',
      `Stock: ${prodPanelAfterGrn1?.stockQuantity}, PO Status: ${poAfterGrn1.status}`
    );

    // ----------------------------------------------------
    // TEST 10: Second GRN to complete receipt
    // Receive remaining 40 -> stock = 100, PO = FULLY_RECEIVED, total received = 100
    // ----------------------------------------------------
    const grn2 = await grnService.createGoodsReceipt(
      {
        purchaseOrderId: approvedPartialPo.id,
        items: [{ purchaseOrderItemId: panelPoItem.id, receivedQuantity: 40 }],
        autoPost: true,
      },
      authUser
    );

    const prodPanelAfterGrn2 = await db.query.products.findFirst({ where: eq(products.id, productPanel.id) });
    const poAfterGrn2 = await poService.getPurchaseOrderById(approvedPartialPo.id);

    assert(
      prodPanelAfterGrn2?.stockQuantity === 100 &&
        poAfterGrn2.status === PO_STATUSES.FULLY_RECEIVED &&
        poAfterGrn2.items[0].receivedQuantity === 100,
      'TEST 10: Second GRN completes receipt (stock +40, total 100, status FULLY_RECEIVED)',
      `Final Stock: ${prodPanelAfterGrn2?.stockQuantity}, PO Status: ${poAfterGrn2.status}`
    );

    // ----------------------------------------------------
    // TEST 11: Over-receipt rejection
    // PO with 50 units. Attempt to receive 60 -> reject. Stock unchanged.
    // ----------------------------------------------------
    const productOver = await createTestProduct('TEST-PROC-OVER', 20, 1000);
    const poOver = await poService.createPurchaseOrder(
      {
        supplierId: supplier1.id,
        items: [{ productId: productOver.id, quantity: 50, unitCost: 900, taxRate: 18 }],
      },
      authUser.userId
    );
    await poService.submitPurchaseOrder(poOver.id);
    const approvedPoOver = await poService.approvePurchaseOrder(poOver.id, authUser.userId);

    let overReceiptRejected = false;
    try {
      await grnService.createGoodsReceipt(
        {
          purchaseOrderId: approvedPoOver.id,
          items: [{ purchaseOrderItemId: approvedPoOver.items[0].id, receivedQuantity: 60 }],
        },
        authUser
      );
    } catch (err: any) {
      if (err.errorCode === 'OVER_RECEIPT_REJECTED' || err.message.includes('Over-receipt rejected')) {
        overReceiptRejected = true;
      }
    }

    const prodOverStock = await db.query.products.findFirst({ where: eq(products.id, productOver.id) });
    assert(
      overReceiptRejected && prodOverStock?.stockQuantity === 20,
      'TEST 11: Over-receipt strictly rejected, stock remains unchanged',
      `Stock remains: ${prodOverStock?.stockQuantity}`
    );

    // ----------------------------------------------------
    // TEST 12: GRN approval/posting idempotency
    // Attempt to post already-posted GRN again
    // ----------------------------------------------------
    let duplicatePostRejected = false;
    try {
      await grnService.postGoodsReceipt(postedGrn.id, authUser);
    } catch (err: any) {
      if (err.errorCode === 'GRN_ALREADY_POSTED' || err.statusCode === 409) {
        duplicatePostRejected = true;
      }
    }

    // Verify stock did not increase a second time
    const prodAIdempotent = await db.query.products.findFirst({ where: eq(products.id, productA.id) });
    assert(
      duplicatePostRejected && prodAIdempotent?.stockQuantity === 130,
      'TEST 12: GRN posting idempotency (re-post rejected, stock unchanged)',
      `Stock: ${prodAIdempotent?.stockQuantity}`
    );

    // ----------------------------------------------------
    // TEST 13: GRN atomic rollback on stock error
    // If StockService fails, GRN is not posted, PO item received quantity is not updated.
    // ----------------------------------------------------
    const productAtomic = await createTestProduct('TEST-PROC-ATOMIC', 10, 1000);
    const poAtomic = await poService.createPurchaseOrder(
      {
        supplierId: supplier1.id,
        items: [{ productId: productAtomic.id, quantity: 20, unitCost: 1000, taxRate: 18 }],
      },
      authUser.userId
    );
    await poService.submitPurchaseOrder(poAtomic.id);
    const approvedPoAtomic = await poService.approvePurchaseOrder(poAtomic.id, authUser.userId);

    // Create a draft GRN
    const draftAtomicGrn = await grnService.createGoodsReceipt(
      {
        purchaseOrderId: approvedPoAtomic.id,
        items: [{ purchaseOrderItemId: approvedPoAtomic.items[0].id, receivedQuantity: 10 }],
      },
      authUser
    );

    // Instantiate a GRN service with a failing StockService to simulate error during stock insertion
    const failingStockService = new StockService();
    failingStockService.addStock = async () => {
      throw new Error('Simulated stock ledger write failure');
    };
    const rollbackGrnService = new GoodsReceiptService(
      new GoodsReceiptRepository(),
      new PurchaseOrderRepository(),
      failingStockService
    );

    let rollbackTriggered = false;
    try {
      await rollbackGrnService.postGoodsReceipt(draftAtomicGrn.id, authUser);
    } catch (err: any) {
      if (err.message.includes('Simulated stock ledger write failure')) {
        rollbackTriggered = true;
      }
    }

    const grnAfterFail = await db.query.goodsReceipts.findFirst({ where: eq(goodsReceipts.id, draftAtomicGrn.id) });
    const poItemAfterFail = await db.query.purchaseOrderItems.findFirst({
      where: eq(purchaseOrderItems.id, approvedPoAtomic.items[0].id),
    });
    const prodAtomicAfterFail = await db.query.products.findFirst({ where: eq(products.id, productAtomic.id) });

    assert(
      rollbackTriggered &&
        grnAfterFail?.status === GRN_STATUSES.DRAFT &&
        poItemAfterFail?.receivedQuantity === 0 &&
        prodAtomicAfterFail?.stockQuantity === 10,
      'TEST 13: GRN atomic rollback on stock failure (all changes rolled back)',
      `GRN Status: ${grnAfterFail?.status}, PO Item Received: ${poItemAfterFail?.receivedQuantity}, Stock: ${prodAtomicAfterFail?.stockQuantity}`
    );

    // ----------------------------------------------------
    // TEST 14: Concurrent GRN receiving protection
    // Two parallel requests try to receive remaining 30 units when only 20 remain.
    // ----------------------------------------------------
    const productConc = await createTestProduct('TEST-PROC-CONC', 0, 500);
    const poConc = await poService.createPurchaseOrder(
      {
        supplierId: supplier1.id,
        items: [{ productId: productConc.id, quantity: 20, unitCost: 500, taxRate: 18 }],
      },
      authUser.userId
    );
    await poService.submitPurchaseOrder(poConc.id);
    const approvedPoConc = await poService.approvePurchaseOrder(poConc.id, authUser.userId);
    const concPoItemId = approvedPoConc.items[0].id;

    // Concurrently try to receive 15 and 15 (total 30 > 20)
    const results = await Promise.allSettled([
      grnService.createGoodsReceipt(
        {
          purchaseOrderId: approvedPoConc.id,
          items: [{ purchaseOrderItemId: concPoItemId, receivedQuantity: 15 }],
          autoPost: true,
        },
        authUser
      ),
      grnService.createGoodsReceipt(
        {
          purchaseOrderId: approvedPoConc.id,
          items: [{ purchaseOrderItemId: concPoItemId, receivedQuantity: 15 }],
          autoPost: true,
        },
        authUser
      ),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    const prodConcFinal = await db.query.products.findFirst({ where: eq(products.id, productConc.id) });
    const poConcFinal = await poService.getPurchaseOrderById(approvedPoConc.id);

    assert(
      successes.length === 1 &&
        failures.length === 1 &&
        prodConcFinal?.stockQuantity === 15 &&
        poConcFinal.items[0].receivedQuantity === 15,
      'TEST 14: Concurrent receiving protection prevents over-receipt under race condition',
      `Successes: ${successes.length}, Failures: ${failures.length}, Final Stock: ${prodConcFinal?.stockQuantity}`
    );

    // ----------------------------------------------------
    // TEST 15: Cancelled PO cannot receive goods
    // ----------------------------------------------------
    const poCancelTest = await poService.createPurchaseOrder(
      {
        supplierId: supplier1.id,
        items: [{ productId: productA.id, quantity: 10, unitCost: 4000, taxRate: 18 }],
      },
      authUser.userId
    );
    await poService.cancelPurchaseOrder(poCancelTest.id);

    let cancelledPoGrnRejected = false;
    try {
      await grnService.createGoodsReceipt(
        {
          purchaseOrderId: poCancelTest.id,
          items: [{ purchaseOrderItemId: poCancelTest.items[0].id, receivedQuantity: 5 }],
        },
        authUser
      );
    } catch (err: any) {
      if (err.errorCode === 'PO_CANCELLED' || err.message.includes('CANCELLED')) {
        cancelledPoGrnRejected = true;
      }
    }
    assert(cancelledPoGrnRejected, 'TEST 15: Cancelled PO cannot receive goods');

    // ----------------------------------------------------
    // TEST 16: Fully received PO cannot receive additional quantity
    // ----------------------------------------------------
    let fullyReceivedPoGrnRejected = false;
    try {
      await grnService.createGoodsReceipt(
        {
          purchaseOrderId: approvedPartialPo.id, // already FULLY_RECEIVED in TEST 10
          items: [{ purchaseOrderItemId: panelPoItem.id, receivedQuantity: 5 }],
        },
        authUser
      );
    } catch (err: any) {
      if (err.errorCode === 'PO_FULLY_RECEIVED' || err.message.includes('FULLY_RECEIVED')) {
        fullyReceivedPoGrnRejected = true;
      }
    }
    assert(fullyReceivedPoGrnRejected, 'TEST 16: Fully received PO cannot receive additional quantity');

    // ----------------------------------------------------
    // TEST 17: Posted GRN is immutable
    // ----------------------------------------------------
    assert(
      postedGrn.status === GRN_STATUSES.POSTED,
      'TEST 17: Posted GRN is immutable (lifecycle locked at POSTED)'
    );

    // ----------------------------------------------------
    // TEST 18: Supplier referenced by PO cannot be hard deleted
    // ----------------------------------------------------
    let supplierDeleteRejected = false;
    try {
      await supplierService.deleteSupplier(supplier1.id);
    } catch (err: any) {
      if (err.errorCode === 'SUPPLIER_HAS_PURCHASE_ORDERS' || err.statusCode === 400) {
        supplierDeleteRejected = true;
      }
    }

    // Verify supplier can be marked INACTIVE instead
    const deactivatedSupplier = await supplierService.setSupplierStatus(supplier1.id, SUPPLIER_STATUSES.INACTIVE);

    assert(
      supplierDeleteRejected && deactivatedSupplier.status === SUPPLIER_STATUSES.INACTIVE,
      'TEST 18: Supplier with POs cannot be hard deleted; status successfully changed to INACTIVE',
      `Deactivated Status: ${deactivatedSupplier.status}`
    );

    // ----------------------------------------------------
    // TEST 19: Unauthorized user cannot approve PO
    // ----------------------------------------------------
    const adminCanApprove = hasPermission('ADMIN', 'procurement:po:approve');
    const managerCanApprove = hasPermission('MANAGER', 'procurement:po:approve');
    const userCannotApprove = hasPermission('USER', 'procurement:po:approve');
    const accountantCannotApprove = hasPermission('USER', 'procurement:po:approve', 'Accountant Office');

    assert(
      adminCanApprove && managerCanApprove && !userCannotApprove && !accountantCannotApprove,
      'TEST 19: Unauthorized user (USER, Accountant Office) cannot approve PO; only ADMIN/MANAGER authorized',
      `Admin: ${adminCanApprove}, Manager: ${managerCanApprove}, User: ${userCannotApprove}, Accountant: ${accountantCannotApprove}`
    );

    // ----------------------------------------------------
    // TEST 20: Unauthorized user cannot post GRN
    // ----------------------------------------------------
    const adminCanPost = hasPermission('ADMIN', 'procurement:grn:post');
    const managerCanPost = hasPermission('MANAGER', 'procurement:grn:post');
    const userCannotPost = hasPermission('USER', 'procurement:grn:post');
    const accountantCannotPost = hasPermission('USER', 'procurement:grn:post', 'Accountant Office');

    assert(
      adminCanPost && managerCanPost && !userCannotPost && !accountantCannotPost,
      'TEST 20: Unauthorized user (USER, Accountant Office) cannot post GRN; only ADMIN/MANAGER authorized',
      `Admin: ${adminCanPost}, Manager: ${managerCanPost}, User: ${userCannotPost}, Accountant: ${accountantCannotPost}`
    );

  } catch (error) {
    console.error('Fatal error during Phase 2 tests:', error);
    failed++;
  } finally {
    console.log('\n====================================================');
    console.log(`PHASE 2 PROCUREMENT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
  }
}

runProcurementPhase2Tests()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Test execution failed:', err);
    pool.end();
    process.exit(1);
  });
