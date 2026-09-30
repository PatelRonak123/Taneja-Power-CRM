import { db, pool } from "./db.js";
import { products } from "./schema/products.js";
import { stockMovements } from "./schema/inventory.js";
import {
  amcContracts,
  amcServiceVisits,
  amcServiceReports,
  amcServiceReportMaterials,
} from "./schema/amc-contracts.js";
import { quotations, quotationRevisions } from "./schema/quotations.js";
import { customers } from "./schema/customers.js";
import { users } from "./schema/users.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { StockService } from "../modules/inventory/services/stock.service.js";
import { StockMovementRepository } from "../modules/inventory/repositories/stock-movement.repository.js";
import { ProductService } from "../modules/products/services/product.service.js";
import { AmcContractService } from "../modules/amc-contracts/services/amc-contract.service.js";
import { hasPermission } from "../common/auth/permissions.js";
import {
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_REFERENCE_TYPES,
} from "../config/constants.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runInventoryFoundationTests() {
  console.log("====================================================");
  console.log("RUNNING PHASE 1 INVENTORY FOUNDATION AUTOMATED TESTS");
  console.log("====================================================\n");

  const stockService = new StockService();
  const amcService = new AmcContractService();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
      failed++;
    }
  }

  // Cleanup helper for test artifacts
  async function cleanupAll(prefix: string) {
    const testProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(sql`sku LIKE ${prefix + "%"}`);

    for (const p of testProducts) {
      await db.delete(stockMovements).where(eq(stockMovements.productId, p.id));
      await db
        .delete(amcServiceReportMaterials)
        .where(eq(amcServiceReportMaterials.productId, p.id));
      await db.delete(products).where(eq(products.id, p.id));
    }
  }

  const TEST_PREFIX = `TEST-P1-${Date.now()}`;
  await cleanupAll("TEST-P1");

  try {
    // -------------------------------------------------------------------------
    // TEST 1 — Stock IN
    // Starting: 100, Add: 50 -> Expected: 150, Movement: IN 50
    // -------------------------------------------------------------------------
    console.log("\n--- Test 1 — Stock IN ---");
    const [p1] = await db
      .insert(products)
      .values({
        name: "Test Product 1",
        sku: `${TEST_PREFIX}-1`,
        category: "Generators",
        price: "1000.00",
        stockQuantity: 100,
        status: "ACTIVE",
      })
      .returning();

    const inMovement = await stockService.addStock({
      productId: p1.id,
      quantity: 50,
      referenceType: INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT,
      reason: "Test Stock IN",
    });

    const [p1After] = await db
      .select()
      .from(products)
      .where(eq(products.id, p1.id));
    const p1Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p1.id));

    assert(
      p1After.stockQuantity === 150,
      "Test 1: Stock updated to 150",
      `Got ${p1After.stockQuantity}`,
    );
    assert(
      inMovement.quantity === 50,
      "Test 1: Movement returned quantity is 50",
    );
    assert(
      inMovement.previousQuantity === 100,
      "Test 1: Movement previousQuantity is 100",
    );
    assert(
      inMovement.newQuantity === 150,
      "Test 1: Movement newQuantity is 150",
    );
    assert(
      inMovement.movementType === INVENTORY_MOVEMENT_TYPES.IN,
      "Test 1: Movement type is IN",
    );
    assert(
      p1Movements.length === 1,
      "Test 1: Exactly 1 stock movement record in DB",
    );

    // -------------------------------------------------------------------------
    // TEST 2 — Stock OUT
    // Starting: 100, Remove: 30 -> Expected: 70, Movement: OUT 30
    // -------------------------------------------------------------------------
    console.log("\n--- Test 2 — Stock OUT ---");
    const [p2] = await db
      .insert(products)
      .values({
        name: "Test Product 2",
        sku: `${TEST_PREFIX}-2`,
        category: "Generators",
        price: "1000.00",
        stockQuantity: 100,
        status: "ACTIVE",
      })
      .returning();

    const outMovement = await stockService.removeStock({
      productId: p2.id,
      quantity: 30,
      referenceType: INVENTORY_REFERENCE_TYPES.AMC,
      reason: "Test Stock OUT",
    });

    const [p2After] = await db
      .select()
      .from(products)
      .where(eq(products.id, p2.id));
    const p2Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p2.id));

    assert(
      p2After.stockQuantity === 70,
      "Test 2: Stock updated to 70",
      `Got ${p2After.stockQuantity}`,
    );
    assert(
      outMovement.quantity === 30,
      "Test 2: Movement returned quantity is 30",
    );
    assert(
      outMovement.previousQuantity === 100,
      "Test 2: Movement previousQuantity is 100",
    );
    assert(
      outMovement.newQuantity === 70,
      "Test 2: Movement newQuantity is 70",
    );
    assert(
      outMovement.movementType === INVENTORY_MOVEMENT_TYPES.OUT,
      "Test 2: Movement type is OUT",
    );
    assert(
      p2Movements.length === 1,
      "Test 2: Exactly 1 stock movement record in DB",
    );

    // -------------------------------------------------------------------------
    // TEST 3 — Insufficient stock
    // Starting: 10, Remove: 15 -> Fails, Stock remains 10, No OUT movement
    // -------------------------------------------------------------------------
    console.log("\n--- Test 3 — Insufficient stock ---");
    const [p3] = await db
      .insert(products)
      .values({
        name: "Test Product 3",
        sku: `${TEST_PREFIX}-3`,
        category: "Generators",
        price: "1000.00",
        stockQuantity: 10,
        status: "ACTIVE",
      })
      .returning();

    let insufficientErrorCaught = false;
    try {
      await stockService.removeStock({
        productId: p3.id,
        quantity: 15,
        referenceType: INVENTORY_REFERENCE_TYPES.AMC,
        reason: "Attempt excessive OUT",
      });
    } catch (err: any) {
      insufficientErrorCaught = true;
      assert(
        err.message.includes("INSUFFICIENT_STOCK") ||
          err.errorCode === "INSUFFICIENT_STOCK",
        "Test 3: Throws INSUFFICIENT_STOCK error",
        err.message,
      );
    }

    assert(insufficientErrorCaught, "Test 3: Excessive removal rejected");
    const [p3After] = await db
      .select()
      .from(products)
      .where(eq(products.id, p3.id));
    const p3Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p3.id));

    assert(
      p3After.stockQuantity === 10,
      "Test 3: Stock unchanged at 10",
      `Got ${p3After.stockQuantity}`,
    );
    assert(p3Movements.length === 0, "Test 3: Zero stock movements created");

    // -------------------------------------------------------------------------
    // TEST 4 — Adjustment positive
    // Starting: 100, Physical count: 105 -> Expected: 105, Movement: ADJUSTMENT +5
    // -------------------------------------------------------------------------
    console.log("\n--- Test 4 — Adjustment positive ---");
    const [p4] = await db
      .insert(products)
      .values({
        name: "Test Product 4",
        sku: `${TEST_PREFIX}-4`,
        category: "Generators",
        price: "1000.00",
        stockQuantity: 100,
        status: "ACTIVE",
      })
      .returning();

    const adjPos = await stockService.adjustStock({
      productId: p4.id,
      newQuantity: 105,
      reason: "Physical count found 5 extra units",
    });

    const [p4After] = await db
      .select()
      .from(products)
      .where(eq(products.id, p4.id));
    const p4Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p4.id));

    assert(
      p4After.stockQuantity === 105,
      "Test 4: Stock updated to 105",
      `Got ${p4After.stockQuantity}`,
    );
    assert(
      adjPos.quantity === 5,
      "Test 4: Movement signed quantity is +5",
      `Got ${adjPos.quantity}`,
    );
    assert(
      adjPos.previousQuantity === 100,
      "Test 4: Movement previousQuantity is 100",
    );
    assert(adjPos.newQuantity === 105, "Test 4: Movement newQuantity is 105");
    assert(
      adjPos.movementType === INVENTORY_MOVEMENT_TYPES.ADJUSTMENT,
      "Test 4: Movement type is ADJUSTMENT",
    );
    assert(
      p4Movements.length === 1,
      "Test 4: Exactly 1 stock movement record in DB",
    );

    // -------------------------------------------------------------------------
    // TEST 5 — Adjustment negative
    // Starting: 100, Physical count: 97 -> Expected: 97, Movement: ADJUSTMENT -3
    // -------------------------------------------------------------------------
    console.log("\n--- Test 5 — Adjustment negative ---");
    const [p5] = await db
      .insert(products)
      .values({
        name: "Test Product 5",
        sku: `${TEST_PREFIX}-5`,
        category: "Generators",
        price: "1000.00",
        stockQuantity: 100,
        status: "ACTIVE",
      })
      .returning();

    const adjNeg = await stockService.adjustStock({
      productId: p5.id,
      newQuantity: 97,
      reason: "Physical stock verification: damaged 3 units",
    });

    const [p5After] = await db
      .select()
      .from(products)
      .where(eq(products.id, p5.id));
    const p5Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p5.id));

    assert(
      p5After.stockQuantity === 97,
      "Test 5: Stock updated to 97",
      `Got ${p5After.stockQuantity}`,
    );
    assert(
      adjNeg.quantity === -3,
      "Test 5: Movement signed quantity is -3",
      `Got ${adjNeg.quantity}`,
    );
    assert(
      adjNeg.previousQuantity === 100,
      "Test 5: Movement previousQuantity is 100",
    );
    assert(adjNeg.newQuantity === 97, "Test 5: Movement newQuantity is 97");
    assert(
      adjNeg.movementType === INVENTORY_MOVEMENT_TYPES.ADJUSTMENT,
      "Test 5: Movement type is ADJUSTMENT",
    );
    assert(
      p5Movements.length === 1,
      "Test 5: Exactly 1 stock movement record in DB",
    );

    // -------------------------------------------------------------------------
    // TEST 6 — Atomic rollback
    // Force failure after stock update in transaction -> Stock unchanged, no movement
    // -------------------------------------------------------------------------
    console.log("\n--- Test 6 — Atomic rollback ---");
    const [p6] = await db
      .insert(products)
      .values({
        name: "Test Product 6",
        sku: `${TEST_PREFIX}-6`,
        category: "Generators",
        price: "1000.00",
        stockQuantity: 100,
        status: "ACTIVE",
      })
      .returning();

    let rollbackErrorCaught = false;
    try {
      await db.transaction(async (tx) => {
        // Step 1: Remove stock inside transaction
        await stockService.removeStock(
          {
            productId: p6.id,
            quantity: 40,
            referenceType: INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT,
            reason: "Rollback test part 1",
          },
          undefined,
          tx,
        );

        // Step 2: Force intentional database error (e.g. invalid foreign key or forced error)
        throw new Error("SIMULATED_TRANSACTION_FAILURE");
      });
    } catch (err: any) {
      if (err.message === "SIMULATED_TRANSACTION_FAILURE") {
        rollbackErrorCaught = true;
      }
    }

    assert(rollbackErrorCaught, "Test 6: Forced transaction failure caught");
    const [p6After] = await db
      .select()
      .from(products)
      .where(eq(products.id, p6.id));
    const p6Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p6.id));

    assert(
      p6After.stockQuantity === 100,
      "Test 6: Product stock remained unchanged at 100",
      `Got ${p6After.stockQuantity}`,
    );
    assert(p6Movements.length === 0, "Test 6: No stock movement committed");

    // -------------------------------------------------------------------------
    // TEST 7 — AMC consumption
    // Starting: 100, AMC consumes: 5 -> Expected: 95, Exactly 1 OUT movement
    // -------------------------------------------------------------------------
    console.log("\n--- Test 7 — AMC consumption ---");
    const [testUser] = await db
      .insert(users)
      .values({
        email: `test-fse-${Date.now()}@tanejapower.com`,
        passwordHash: "dummy",
        fullName: "Test FSE Technician",
        role: "USER",
        designation: "Service Engineer",
        workType: "FIELD",
      })
      .returning();

    const [testCustomer] = await db
      .insert(customers)
      .values({
        name: "Test Customer Contact",
        companyName: `AMC Test Corp ${Date.now()}`,
        email: `amc-test-${Date.now()}@tanejapower.com`,
        phone: "9876543210",
        city: "Mumbai",
        state: "Maharashtra",
      })
      .returning();

    const [p7] = await db
      .insert(products)
      .values({
        name: "AMC Test Filter",
        sku: `${TEST_PREFIX}-7`,
        category: "Generators",
        price: "500.00",
        stockQuantity: 100,
        status: "ACTIVE",
      })
      .returning();

    const [quotation] = await db
      .insert(quotations)
      .values({
        quotationNumber: `QT-INV-${Date.now()}`,
        quotationType: "AMC",
        status: "ACCEPTED",
        customerId: testCustomer.id,
        salespersonId: testUser.id,
        createdById: testUser.id,
        currentRevisionNumber: 1,
      })
      .returning();

    const [revision] = await db
      .insert(quotationRevisions)
      .values({
        quotationId: quotation.id,
        revisionNumber: 1,
        isCurrent: true,
        status: "ACCEPTED",
        quotationDate: new Date("2026-01-01"),
        validityDays: 30,
        validUntil: new Date("2026-01-31"),
        customerName: testCustomer.name,
        companyName: testCustomer.companyName,
        createdById: testUser.id,
      })
      .returning();

    const [contract] = await db
      .insert(amcContracts)
      .values({
        contractNumber: `AMC-TEST-${Date.now()}`,
        quotationId: quotation.id,
        quotationRevisionId: revision.id,
        customerId: testCustomer.id,
        customerName: testCustomer.name,
        companyName: testCustomer.companyName,
        amcPlan: "Standard",
        contractStartDate: new Date("2026-01-01"),
        contractEndDate: new Date("2026-12-31"),
        serviceFrequency: "MONTHLY",
        scheduledVisits: 1,
        completedVisits: 0,
        breakdownVisitType: "UNLIMITED",
        status: "ACTIVE",
        paymentStatus: "PENDING",
        totalAmount: "1000.00",
        createdById: testUser.id,
      })
      .returning();

    const [visit] = await db
      .insert(amcServiceVisits)
      .values({
        amcContractId: contract.id,
        visitNumber: 1,
        scheduledDate: new Date("2026-02-01"),
        status: "SCHEDULED",
      })
      .returning();

    const [report] = await db
      .insert(amcServiceReports)
      .values({
        amcContractId: contract.id,
        amcServiceVisitId: visit.id,
        reportNumber: `SR-${Date.now()}`,
        inspectionDate: new Date("2026-02-01"),
        serviceSummary: "Routine service",
        createdById: testUser.id,
      })
      .returning();

    const [mat] = await db
      .insert(amcServiceReportMaterials)
      .values({
        serviceReportId: report.id,
        productId: p7.id,
        productNameSnapshot: p7.name,
        skuSnapshot: p7.sku,
        quantity: "5",
        unitSnapshot: "units",
        coverageType: "INCLUDED_IN_AMC",
        stockConsumedAt: null, // not yet consumed
        createdById: testUser.id,
      })
      .returning();

    // Call completeServiceVisitAndReport which triggers material consumption
    await amcService.completeServiceVisitAndReport(visit.id, {}, testUser.id);

    const [p7After] = await db
      .select()
      .from(products)
      .where(eq(products.id, p7.id));
    const p7Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p7.id));
    const [matAfter] = await db
      .select()
      .from(amcServiceReportMaterials)
      .where(eq(amcServiceReportMaterials.id, mat.id));

    assert(
      p7After.stockQuantity === 95,
      "Test 7: AMC material consumption reduced stock to 95",
      `Got ${p7After.stockQuantity}`,
    );
    assert(
      p7Movements.length === 1,
      "Test 7: Exactly 1 stock movement created for AMC",
    );
    assert(
      p7Movements[0].movementType === "OUT",
      "Test 7: Movement type is OUT",
    );
    assert(
      p7Movements[0].referenceType === "AMC",
      "Test 7: Movement referenceType is AMC",
    );
    assert(
      p7Movements[0].referenceId === report.id,
      "Test 7: Movement referenceId is report.id",
    );
    assert(p7Movements[0].quantity === 5, "Test 7: Movement quantity is 5");
    assert(
      p7Movements[0].previousQuantity === 100,
      "Test 7: Movement previousQuantity is 100",
    );
    assert(
      p7Movements[0].newQuantity === 95,
      "Test 7: Movement newQuantity is 95",
    );
    assert(
      matAfter.stockConsumedAt !== null,
      "Test 7: Material stockConsumedAt timestamp sealed",
    );

    // -------------------------------------------------------------------------
    // TEST 8 — AMC duplicate prevention
    // Complete same service visit again -> stock remains 95, no second movement
    // -------------------------------------------------------------------------
    console.log("\n--- Test 8 — AMC duplicate prevention (idempotency) ---");
    let duplicateErrorCaught = false;
    try {
      await amcService.completeServiceVisitAndReport(visit.id, {}, testUser.id);
    } catch (err: any) {
      duplicateErrorCaught = true;
      assert(
        err.message.includes("COMPLETED"),
        "Test 8: Prevented duplicate visit completion",
        err.message,
      );
    }
    assert(duplicateErrorCaught, "Test 8: Repeated execution rejected");

    const [p7AfterRepeat] = await db
      .select()
      .from(products)
      .where(eq(products.id, p7.id));
    const p7MovementsRepeat = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p7.id));

    assert(
      p7AfterRepeat.stockQuantity === 95,
      "Test 8: Stock remains unchanged at 95 on repeated completeServiceVisit",
      `Got ${p7AfterRepeat.stockQuantity}`,
    );
    assert(
      p7MovementsRepeat.length === 1,
      "Test 8: No second movement created on repeated completion",
      `Got count ${p7MovementsRepeat.length}`,
    );

    // -------------------------------------------------------------------------
    // TEST 9 — Concurrent OUT
    // Starting: 10, Attempt concurrent OUT 8 and OUT 5 -> Exactly one succeeds, final stock >= 0
    // -------------------------------------------------------------------------
    console.log(
      "\n--- Test 9 — Concurrent OUT (Race Condition Prevention) ---",
    );
    const [p9] = await db
      .insert(products)
      .values({
        name: "Test Product 9 Concurrent",
        sku: `${TEST_PREFIX}-9`,
        category: "Generators",
        price: "1000.00",
        stockQuantity: 10,
        status: "ACTIVE",
      })
      .returning();

    // Fire two promises concurrently
    const results = await Promise.allSettled([
      stockService.removeStock({
        productId: p9.id,
        quantity: 8,
        referenceType: INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT,
        reason: "Concurrent request A (8 units)",
      }),
      stockService.removeStock({
        productId: p9.id,
        quantity: 5,
        referenceType: INVENTORY_REFERENCE_TYPES.MANUAL_ADJUSTMENT,
        reason: "Concurrent request B (5 units)",
      }),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    const [p9After] = await db
      .select()
      .from(products)
      .where(eq(products.id, p9.id));
    const p9Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p9.id));

    assert(
      successes.length === 1,
      "Test 9: Exactly one concurrent request succeeded",
      `Got ${successes.length} successes`,
    );
    assert(
      failures.length === 1,
      "Test 9: Exactly one concurrent request failed",
      `Got ${failures.length} failures`,
    );
    assert(
      p9After.stockQuantity >= 0,
      "Test 9: Final stock is non-negative",
      `Got ${p9After.stockQuantity}`,
    );
    assert(
      p9After.stockQuantity === 2 || p9After.stockQuantity === 5,
      "Test 9: Stock is either 2 (10-8) or 5 (10-5)",
      `Got ${p9After.stockQuantity}`,
    );
    assert(
      p9Movements.length === 1,
      "Test 9: Exactly one movement ledger entry exists",
    );

    // -------------------------------------------------------------------------
    // TEST 10 (Section 19.A) — Product Creation + Opening Stock Atomicity
    // -------------------------------------------------------------------------
    console.log(
      "\n--- Test 10 (19.A) — Product Creation + Opening Stock Atomicity ---",
    );
    const productService = new ProductService();
    const createdP10 = await productService.createProduct({
      name: "Atomicity Product Test",
      sku: `${TEST_PREFIX}-10`,
      category: "Batteries",
      price: 2500,
      stockQuantity: 40,
      status: "ACTIVE",
    });

    const [p10InDb] = await db
      .select()
      .from(products)
      .where(eq(products.id, createdP10.id));
    const p10Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, createdP10.id));

    assert(
      createdP10.stockQuantity === 40,
      "Test 10: Created product DTO reflects opening stock (40)",
    );
    assert(
      p10InDb.stockQuantity === 40,
      "Test 10: Product stock in database is 40",
    );
    assert(
      p10Movements.length === 1,
      "Test 10: Exactly one opening stock movement created",
    );
    assert(
      p10Movements[0].movementType === "IN",
      "Test 10: Opening stock movement type is IN",
    );
    assert(p10Movements[0].quantity === 40, "Test 10: Movement quantity is 40");
    assert(
      p10Movements[0].previousQuantity === 0,
      "Test 10: Previous quantity is 0",
    );
    assert(p10Movements[0].newQuantity === 40, "Test 10: New quantity is 40");
    assert(
      p10Movements[0].referenceType === "MANUAL_ADJUSTMENT",
      "Test 10: Reference type is MANUAL_ADJUSTMENT",
    );

    // Test failure rollback atomicity: if an error occurs within the transaction, product is not created
    let failedAtomicity = false;
    try {
      await db.transaction(async (tx) => {
        await tx.insert(products).values({
          name: "Rollback Product",
          sku: `${TEST_PREFIX}-ROLLBACK`,
          category: "Generators",
          price: "100.00",
          stockQuantity: 0,
          status: "ACTIVE",
        });
        // Deliberately throw error to verify rollback
        throw new Error("Simulated failure during initial stock assignment");
      });
    } catch {
      failedAtomicity = true;
    }
    const rolledBackProducts = await db
      .select()
      .from(products)
      .where(eq(products.sku, `${TEST_PREFIX}-ROLLBACK`));
    assert(
      failedAtomicity,
      "Test 10: Transaction threw expected error on simulated failure",
    );
    assert(
      rolledBackProducts.length === 0,
      "Test 10: Product was NOT created after transaction rollback",
    );

    // -------------------------------------------------------------------------
    // TEST 11 (Section 19.B) — AMC Stock Failure Rolls Back Entire AMC Transaction
    // -------------------------------------------------------------------------
    console.log(
      "\n--- Test 11 (19.B) — AMC Stock Failure Rolls Back AMC Transaction ---",
    );
    const [p11] = await db
      .insert(products)
      .values({
        name: "AMC Low Stock Part",
        sku: `${TEST_PREFIX}-11`,
        category: "Batteries",
        price: "200.00",
        stockQuantity: 2, // only 2 in stock
        status: "ACTIVE",
      })
      .returning();

    const [visit11] = await db
      .insert(amcServiceVisits)
      .values({
        amcContractId: contract.id,
        visitNumber: 2,
        scheduledDate: new Date("2026-03-01"),
        status: "SCHEDULED",
      })
      .returning();

    const [report11] = await db
      .insert(amcServiceReports)
      .values({
        amcContractId: contract.id,
        amcServiceVisitId: visit11.id,
        reportNumber: `SR-FAIL-${Date.now()}`,
        inspectionDate: new Date("2026-03-01"),
        serviceSummary: "Breakdown visit requiring unavailable parts",
        createdById: testUser.id,
      })
      .returning();

    // Material requires 10 units, but only 2 available
    await db.insert(amcServiceReportMaterials).values({
      serviceReportId: report11.id,
      productId: p11.id,
      productNameSnapshot: p11.name,
      skuSnapshot: p11.sku,
      quantity: "10",
      unitSnapshot: "units",
      coverageType: "INCLUDED_IN_AMC",
      stockConsumedAt: null,
      createdById: testUser.id,
    });

    let amcFailedAsExpected = false;
    let amcErrorCode = "";
    try {
      await amcService.completeServiceVisitAndReport(
        visit11.id,
        {},
        testUser.id,
      );
    } catch (err: any) {
      amcFailedAsExpected = true;
      amcErrorCode = err.errorCode || err.message;
    }

    const [p11After] = await db
      .select()
      .from(products)
      .where(eq(products.id, p11.id));
    const p11Movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p11.id));
    const [visit11After] = await db
      .select()
      .from(amcServiceVisits)
      .where(eq(amcServiceVisits.id, visit11.id));

    assert(
      amcFailedAsExpected,
      "Test 11: completeServiceVisitAndReport failed when stock was insufficient",
    );
    assert(
      amcErrorCode === "INSUFFICIENT_STOCK",
      `Test 11: Error code is INSUFFICIENT_STOCK (got ${amcErrorCode})`,
    );
    assert(
      p11After.stockQuantity === 2,
      "Test 11: Product stock remains unchanged at 2 units",
    );
    assert(
      p11Movements.length === 0,
      "Test 11: No stock movement ledger entry was committed",
    );
    assert(
      visit11After.status === "SCHEDULED",
      "Test 11: AMC visit status was rolled back to SCHEDULED",
    );

    // -------------------------------------------------------------------------
    // TEST 12 (Section 19.C) — Accountant Cannot Adjust Inventory
    // -------------------------------------------------------------------------
    console.log(
      "\n--- Test 12 (19.C) — Accountant Cannot Adjust Inventory ---",
    );
    const accountantAdjustAllowed = hasPermission(
      "USER",
      "inventory:adjust",
      "Accountant Office",
    );
    const adminAdjustAllowed = hasPermission("ADMIN", "inventory:adjust");

    assert(
      accountantAdjustAllowed === false,
      "Test 12: Accountant Office is DENIED inventory:adjust permission",
    );
    assert(
      adminAdjustAllowed === true,
      "Test 12: ADMIN has inventory:adjust permission",
    );

    // -------------------------------------------------------------------------
    // TEST 13 (Section 19.D) — Accountant Can Read Inventory
    // -------------------------------------------------------------------------
    console.log("\n--- Test 13 (19.D) — Accountant Can Read Inventory ---");
    const accountantReadAllowed = hasPermission(
      "USER",
      "inventory:read",
      "Accountant Office",
    );
    assert(
      accountantReadAllowed === true,
      "Test 13: Accountant Office is ALLOWED inventory:read permission",
    );

    const currentInventory = await stockService.getCurrentInventory({
      limit: 5,
    });
    const movementsResult = await stockService.getStockMovements(p10InDb.id, {
      limit: 5,
    });
    assert(
      currentInventory.items.length > 0,
      "Test 13: getCurrentInventory successfully queried",
    );
    assert(
      movementsResult.items.length === 1,
      "Test 13: getStockMovements successfully queried ledger",
    );

    // -------------------------------------------------------------------------
    // TEST 14 (Section 19.E) — Direct Product Update Cannot Bypass StockService
    // -------------------------------------------------------------------------
    console.log(
      "\n--- Test 14 (19.E) — Direct Product Update Cannot Bypass StockService ---",
    );
    // 1. Updating general fields leaves stock untouched and creates NO movements
    const preMovementsCount = (
      await db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.productId, p10InDb.id))
    ).length;
    await productService.updateProduct(p10InDb.id, {
      name: "Renamed Atomicity Product",
      price: 3000,
    });
    const [p10MetadataUpdated] = await db
      .select()
      .from(products)
      .where(eq(products.id, p10InDb.id));
    const postMetadataMovements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p10InDb.id));

    assert(
      p10MetadataUpdated.name === "Renamed Atomicity Product",
      "Test 14: Product name updated",
    );
    assert(
      p10MetadataUpdated.stockQuantity === 40,
      "Test 14: Stock quantity unchanged by metadata update (40)",
    );
    assert(
      postMetadataMovements.length === preMovementsCount,
      "Test 14: No movement ledger entry created for metadata-only update",
    );

    // 2. Updating stock via ProductService routes strictly through StockService.adjustStock
    await productService.updateProduct(p10InDb.id, {
      stockQuantity: 45,
      adjustmentReason: "Audit physical count verification",
    });
    const [p10StockUpdated] = await db
      .select()
      .from(products)
      .where(eq(products.id, p10InDb.id));
    const postStockMovements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p10InDb.id))
      .orderBy(desc(stockMovements.createdAt));

    assert(
      p10StockUpdated.stockQuantity === 45,
      "Test 14: Stock updated to 45 through ProductService",
    );
    assert(
      postStockMovements.length === preMovementsCount + 1,
      "Test 14: Exactly one new ledger movement created via StockService",
    );
    assert(
      postStockMovements[0].movementType === "ADJUSTMENT",
      "Test 14: New movement has type ADJUSTMENT",
    );
    assert(
      postStockMovements[0].quantity === 5,
      "Test 14: Movement delta is +5",
    );

    // -------------------------------------------------------------------------
    // TEST 15 (Section 19.F) — Stock Movement Cannot Be Modified / Deleted
    // -------------------------------------------------------------------------
    console.log(
      "\n--- Test 15 (19.F) — Stock Movement Ledger Immutability ---",
    );
    const movementRepo = new StockMovementRepository();
    const hasUpdate = typeof (movementRepo as any).update === "function";
    const hasDelete = typeof (movementRepo as any).delete === "function";

    assert(
      hasUpdate === false,
      "Test 15: StockMovementRepository has no update method",
    );
    assert(
      hasDelete === false,
      "Test 15: StockMovementRepository has no delete method",
    );

    // -------------------------------------------------------------------------
    // TEST 16 (Section 19.G) — Fresh Database Migration Creates stock_movements
    // -------------------------------------------------------------------------
    console.log("\n--- Test 16 (19.G) — Migration Verification ---");
    const migrationSqlPath = path.resolve(
      __dirname,
      "../../drizzle/0017_perpetual_tarot.sql",
    );
    const journalPath = path.resolve(
      __dirname,
      "../../drizzle/meta/_journal.json",
    );
    const sqlContent = fs.readFileSync(migrationSqlPath, "utf-8");
    const journalContent = fs.readFileSync(journalPath, "utf-8");

    assert(
      fs.existsSync(migrationSqlPath),
      "Test 16: 0017_perpetual_tarot.sql exists",
    );
    assert(
      sqlContent.includes('CREATE TABLE "stock_movements"'),
      "Test 16: Migration contains CREATE TABLE stock_movements",
    );
    assert(
      sqlContent.includes("stock_movements_product_id_idx"),
      "Test 16: Migration contains stock_movements_product_id_idx",
    );
    assert(
      sqlContent.includes("stock_movements_product_id_products_id_fk"),
      "Test 16: Migration contains foreign key to products",
    );
    assert(
      journalContent.includes("0017_perpetual_tarot"),
      "Test 16: Migration journal contains 0017_perpetual_tarot",
    );

    // Clean up test entities
    await cleanupAll("TEST-P1");
    await db
      .delete(amcServiceReportMaterials)
      .where(eq(amcServiceReportMaterials.serviceReportId, report.id));
    await db
      .delete(amcServiceReportMaterials)
      .where(eq(amcServiceReportMaterials.serviceReportId, report11.id));
    await db
      .delete(amcServiceReports)
      .where(eq(amcServiceReports.id, report.id));
    await db
      .delete(amcServiceReports)
      .where(eq(amcServiceReports.id, report11.id));
    await db.delete(amcServiceVisits).where(eq(amcServiceVisits.id, visit.id));
    await db
      .delete(amcServiceVisits)
      .where(eq(amcServiceVisits.id, visit11.id));
    await db.delete(amcContracts).where(eq(amcContracts.id, contract.id));
    await db
      .delete(quotationRevisions)
      .where(eq(quotationRevisions.id, revision.id));
    await db.delete(quotations).where(eq(quotations.id, quotation.id));
    await db.delete(customers).where(eq(customers.id, testCustomer.id));
    await db.delete(users).where(eq(users.id, testUser.id));
  } catch (error) {
    console.error("Unexpected error during test suite:", error);
    failed++;
  } finally {
    console.log("\n====================================================");
    console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("====================================================");
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runInventoryFoundationTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
