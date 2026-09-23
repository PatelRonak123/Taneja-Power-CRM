import { db, pool } from "./db.js";
import { users } from "./schema/users.js";
import { customers } from "./schema/customers.js";
import { quotations } from "./schema/quotations.js";
import { eq, or } from "drizzle-orm";
import { QuotationService } from "../modules/quotations/services/quotation.service.js";
import { QuotationRepository } from "../modules/quotations/repositories/quotation.repository.js";
import { APP_CONSTANTS } from "../config/constants.js";
import { JwtPayload } from "../common/auth/jwt.js";
import bcrypt from "bcryptjs";

async function runPhaseB2SecurityTests() {
  console.log("=== RUNNING PHASE B.2 SECURITY & AUTHORIZATION TESTS ===\n");

  const quotationService = new QuotationService();
  const quotationRepo = new QuotationRepository();

  // Test emails
  const userAEmail = "b2.user.a@tanejapower.com";
  const userBEmail = "b2.user.b@tanejapower.com";
  const adminEmail = "b2.admin@tanejapower.com";
  const managerEmail = "b2.manager@tanejapower.com";

  // 1. Cleanup from prior runs
  const existingUsers = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.email, userAEmail),
        eq(users.email, userBEmail),
        eq(users.email, adminEmail),
        eq(users.email, managerEmail),
      ),
    );
  if (existingUsers.length > 0) {
    for (const u of existingUsers) {
      await db
        .delete(quotations)
        .where(
          or(
            eq(quotations.salespersonId, u.id),
            eq(quotations.createdById, u.id),
          ),
        );
    }
    await db
      .delete(users)
      .where(
        or(
          eq(users.email, userAEmail),
          eq(users.email, userBEmail),
          eq(users.email, adminEmail),
          eq(users.email, managerEmail),
        ),
      );
  }

  const hashedPassword = await bcrypt.hash("Password@123", 10);

  // 2. Setup Test Users
  const [userA] = await db
    .insert(users)
    .values({
      fullName: "Salesperson Alpha",
      email: userAEmail,
      passwordHash: hashedPassword,
      role: APP_CONSTANTS.ROLES.USER,
      workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
      designation: "Sales Office",
      phone: "+91 99999 00001",
      status: APP_CONSTANTS.STATUS.ACTIVE,
    })
    .returning();

  const [userB] = await db
    .insert(users)
    .values({
      fullName: "Salesperson Beta",
      email: userBEmail,
      passwordHash: hashedPassword,
      role: APP_CONSTANTS.ROLES.USER,
      workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
      designation: "Sales Office",
      phone: "+91 99999 00002",
      status: APP_CONSTANTS.STATUS.ACTIVE,
    })
    .returning();

  const [adminUser] = await db
    .insert(users)
    .values({
      fullName: "Admin Test",
      email: adminEmail,
      passwordHash: hashedPassword,
      role: APP_CONSTANTS.ROLES.ADMIN,
      workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
      designation: "Head of Operations",
      phone: "+91 99999 00003",
      status: APP_CONSTANTS.STATUS.ACTIVE,
    })
    .returning();

  const [managerUser] = await db
    .insert(users)
    .values({
      fullName: "Manager Test",
      email: managerEmail,
      passwordHash: hashedPassword,
      role: APP_CONSTANTS.ROLES.MANAGER,
      workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
      designation: "Head of Operations",
      phone: "+91 99999 00004",
      status: APP_CONSTANTS.STATUS.ACTIVE,
    })
    .returning();

  // Ensure an active customer exists
  let [testCustomer] = await db.select().from(customers).limit(1);
  if (!testCustomer) {
    [testCustomer] = await db
      .insert(customers)
      .values({
        name: "Phase B2 Test Customer",
        companyName: "Acme Test Corp",
        phone: "+91 98888 77777",
        email: "acme.test@example.com",
        status: "ACTIVE",
      })
      .returning();
  }

  const authUserA: JwtPayload = {
    userId: userA.id,
    email: userA.email,
    role: userA.role as any,
  };
  const authUserB: JwtPayload = {
    userId: userB.id,
    email: userB.email,
    role: userB.role as any,
  };
  const authAdmin: JwtPayload = {
    userId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role as any,
  };
  const authManager: JwtPayload = {
    userId: managerUser.id,
    email: managerUser.email,
    role: managerUser.role as any,
  };

  // 3. Create Quotation for User A and Quotation for User B
  const quoteA = await quotationService.createQuotation(
    {
      customerId: testCustomer.id,
      quotationType: APP_CONSTANTS.QUOTATION_TYPES.PRODUCT,
      subject: "Quotation for Salesperson A",
      items: [
        {
          productName: "10kVA Industrial Inverter",
          quantity: 1,
          unitPrice: 50000,
          unit: "NOS",
        },
      ],
    },
    authUserA,
  );

  const quoteB = await quotationService.createQuotation(
    {
      customerId: testCustomer.id,
      quotationType: APP_CONSTANTS.QUOTATION_TYPES.PRODUCT,
      subject: "Quotation for Salesperson B",
      items: [
        {
          productName: "20kVA Heavy Duty UPS",
          quantity: 2,
          unitPrice: 100000,
          unit: "NOS",
        },
      ],
    },
    authUserB,
  );

  if (!quoteA || !quoteB) {
    throw new Error('Failed to create test quotations');
  }

  console.log(
    `Created Quotation A (${quoteA.quotationNumber}) for User A (${userA.id})`,
  );
  console.log(
    `Created Quotation B (${quoteB.quotationNumber}) for User B (${userB.id})\n`,
  );

  // ==========================================
  // TEST SUITE 1: QUOTATION SCOPING & ISOLATION
  // ==========================================
  console.log("--- TEST 1: Quotation List Scoping for USER Role ---");
  const userAList = await quotationService.listQuotations({}, authUserA);
  const foundOtherInAList = userAList.quotations.some(
    (q) => q.salesperson?.id !== userA.id,
  );
  if (foundOtherInAList) {
    throw new Error(
      "FAIL: User A was able to list quotations belonging to another salesperson!",
    );
  }
  const foundAQuote = userAList.quotations.some((q) => q.id === quoteA.id);
  if (!foundAQuote) {
    throw new Error("FAIL: User A could not find own quotation in list!");
  }
  console.log(
    `✓ PASS: User A only sees their own quotations (${userAList.quotations.length} records, 0 cross-user leaks).`,
  );

  // Verify ADMIN / MANAGER sees all
  console.log("--- TEST 2: Admin & Manager Unrestricted Quotation Scope ---");
  const adminList = await quotationService.listQuotations({}, authAdmin);
  const adminHasA = adminList.quotations.some((q) => q.id === quoteA.id);
  const adminHasB = adminList.quotations.some((q) => q.id === quoteB.id);
  if (!adminHasA || !adminHasB) {
    throw new Error("FAIL: Admin scope was improperly restricted!");
  }
  console.log(`✓ PASS: Admin sees management scope across all salespersons.`);

  const managerList = await quotationService.listQuotations({}, authManager);
  const managerHasA = managerList.quotations.some((q) => q.id === quoteA.id);
  const managerHasB = managerList.quotations.some((q) => q.id === quoteB.id);
  if (!managerHasA || !managerHasB) {
    throw new Error("FAIL: Manager scope was improperly restricted!");
  }
  console.log(`✓ PASS: Manager sees management scope across all salespersons.`);

  // Test 3: Detail View Protection
  console.log(
    "--- TEST 3: Quotation Detail Authorization (IDOR Protection) ---",
  );
  // User A views own quote -> Success
  const detailA = await quotationService.getQuotationById(quoteA.id, authUserA);
  if (!detailA || detailA.id !== quoteA.id) {
    throw new Error("FAIL: User A could not retrieve own quotation detail.");
  }
  console.log("✓ PASS: User A retrieved own quotation details.");

  // User A views User B's quote -> 404 Not Found (Zero-leakage security)
  let userAViewBFailed = false;
  try {
    await quotationService.getQuotationById(quoteB.id, authUserA);
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.message === "Quotation not found") {
      userAViewBFailed = true;
    }
  }
  if (!userAViewBFailed) {
    throw new Error(
      "FAIL: User A was able to access User B's quotation detail or did not receive 404!",
    );
  }
  console.log(
    "✓ PASS: User A accessing User B's quotation returns 404 Not Found (resource isolation).",
  );

  // Test 4: Update Authorization
  console.log("--- TEST 4: Quotation Update Authorization ---");
  // User A updates own quote -> Allowed
  const updatedA = await quotationService.updateQuotation(
    quoteA.id,
    { subject: "Updated Subject by A" },
    authUserA,
  );
  if (updatedA?.currentRevision?.subject !== "Updated Subject by A") {
    throw new Error("FAIL: User A was unable to update own quotation.");
  }
  console.log("✓ PASS: User A updated own quotation.");

  // User A updates User B's quote -> 403 Forbidden
  let userAUpdateBForbidden = false;
  try {
    await quotationService.updateQuotation(
      quoteB.id,
      { subject: "Malicious Update by A" },
      authUserA,
    );
  } catch (err: any) {
    if (err?.statusCode === 403) {
      userAUpdateBForbidden = true;
    }
  }
  if (!userAUpdateBForbidden) {
    throw new Error(
      "FAIL: User A was able to update User B's quotation without 403 Forbidden!",
    );
  }
  console.log(
    "✓ PASS: User A updating User B's quotation is blocked with 403 Forbidden.",
  );

  // Test 5: Submit Authorization
  console.log("--- TEST 5: Quotation Submit Authorization ---");
  // User A submits User B's quote -> 403 Forbidden
  let userASubmitBForbidden = false;
  try {
    await quotationService.submitForApproval(
      quoteB.id,
      { comments: "Malicious submit" },
      authUserA,
    );
  } catch (err: any) {
    if (err?.statusCode === 403) {
      userASubmitBForbidden = true;
    }
  }
  if (!userASubmitBForbidden) {
    throw new Error(
      "FAIL: User A was able to submit User B's quotation without 403 Forbidden!",
    );
  }
  console.log(
    "✓ PASS: User A submitting User B's quotation is blocked with 403 Forbidden.",
  );

  // User A submits own quote -> Allowed
  const submittedA = await quotationService.submitForApproval(
    quoteA.id,
    { comments: "Ready for review" },
    authUserA,
  );
  if (
    submittedA?.status !== APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL
  ) {
    throw new Error("FAIL: User A could not submit own quotation.");
  }
  console.log("✓ PASS: User A submitted own quotation for approval.");

  // Test 6: Formal Revision Authorization
  console.log("--- TEST 6: Quotation Revision Authorization ---");
  // User A creates revision on User B's quote -> 403 Forbidden
  let userAReviseBForbidden = false;
  try {
    await quotationService.createFormalRevision(
      quoteB.id,
      { revisionReason: "Unauthorized revision" },
      authUserA,
    );
  } catch (err: any) {
    if (err?.statusCode === 403) {
      userAReviseBForbidden = true;
    }
  }
  if (!userAReviseBForbidden) {
    throw new Error(
      "FAIL: User A was able to create revision on User B's quotation!",
    );
  }
  console.log(
    "✓ PASS: User A creating revision on User B's quotation is blocked with 403 Forbidden.",
  );

  // Test 7: Quotation Approval Authority (Preserved for ADMIN/MANAGER, forbidden for USER)
  console.log("--- TEST 7: Quotation Approval / Rejection Authority ---");
  let userApprovalForbidden = false;
  try {
    await quotationService.approveQuotation(
      quoteA.id,
      { comments: "Self approval" },
      authUserA,
    );
  } catch (err: any) {
    if (err?.statusCode === 403) {
      userApprovalForbidden = true;
    }
  }
  if (!userApprovalForbidden) {
    throw new Error("FAIL: Normal USER was able to approve a quotation!");
  }
  console.log(
    "✓ PASS: Normal USER approval attempt strictly blocked with 403 Forbidden.",
  );

  // Admin approves quotation -> Success
  const approvedA = await quotationService.approveQuotation(
    quoteA.id,
    { comments: "Approved by Administrator" },
    authAdmin,
  );
  if (approvedA?.status !== APP_CONSTANTS.QUOTATION_STATUSES.APPROVED) {
    throw new Error("FAIL: Admin was unable to approve quotation.");
  }
  console.log("✓ PASS: Administrator successfully approved quotation.");

  // ==========================================
  // TEST SUITE 2: AMC CONTRACT LIFECYCLE ROLES
  // ==========================================
  console.log("\n--- TEST 8: AMC Lifecycle Route Role Middleware ---");
  // Check amc-contract.routes.ts definitions
  const amcRoutesFile = (await import("fs"))
    .readFileSync(
      "src/modules/amc-contracts/routes/amc-contract.routes.ts",
      "utf-8",
    )
    .replace(/\r\n/g, "\n");
  const activateHasRoleCheck = amcRoutesFile.includes(
    "router.post(\n  '/:id/activate',\n  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER)",
  );
  const terminateHasRoleCheck = amcRoutesFile.includes(
    "router.post(\n  '/:id/terminate',\n  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER)",
  );
  const renewHasRoleCheck = amcRoutesFile.includes(
    "router.post(\n  '/:id/renew',\n  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER)",
  );

  if (!activateHasRoleCheck || !terminateHasRoleCheck || !renewHasRoleCheck) {
    throw new Error(
      "FAIL: AMC Contract routes are missing requireRoles(ADMIN, MANAGER) guards!",
    );
  }
  console.log(
    "✓ PASS: AMC activate, terminate, and renew endpoints are strictly protected by requireRoles(ADMIN, MANAGER).",
  );

  // ==========================================
  // CLEANUP
  // ==========================================
  // Clean up created test data
  await db
    .delete(quotations)
    .where(or(eq(quotations.id, quoteA.id), eq(quotations.id, quoteB.id)));
  await db
    .delete(users)
    .where(
      or(
        eq(users.email, userAEmail),
        eq(users.email, userBEmail),
        eq(users.email, adminEmail),
        eq(users.email, managerEmail),
      ),
    );

  console.log(
    "\n=== ALL PHASE B.2 SECURITY TESTS PASSED WITH 100% SUCCESS ===",
  );
}

runPhaseB2SecurityTests()
  .catch((err) => {
    console.error("Security test failed:", err);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
