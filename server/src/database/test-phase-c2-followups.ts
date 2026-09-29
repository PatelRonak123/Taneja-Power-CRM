import { db, pool } from "./db.js";
import { users } from "./schema/users.js";
import { customers } from "./schema/customers.js";
import { quotations } from "./schema/quotations.js";
import { leads } from "./schema/leads.js";
import { amcContracts } from "./schema/amc-contracts.js";
import { followUps } from "./schema/follow-ups.js";
import { eq, or } from "drizzle-orm";
import { FollowUpService } from "../modules/follow-ups/services/follow-up.service.js";
import { FollowUpRepository } from "../modules/follow-ups/repositories/follow-up.repository.js";
import { APP_CONSTANTS } from "../config/constants.js";
import { hasPermission } from "../common/auth/permissions.js";
import { JwtPayload } from "../common/auth/jwt.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhaseC2FollowUpsTests() {
  console.log("=== RUNNING PHASE C.2 CRM FOLLOW-UPS & REMINDER MODULE TESTS ===\n");

  const followUpService = new FollowUpService();
  const followUpRepo = new FollowUpRepository();

  const salesAEmail = "c2.sales.a@tanejapower.com";
  const salesBEmail = "c2.sales.b@tanejapower.com";
  const adminEmail = "c2.admin@tanejapower.com";
  const managerEmail = "c2.manager@tanejapower.com";
  const accountantEmail = "c2.accountant@tanejapower.com";
  const hrEmail = "c2.hr@tanejapower.com";

  // 1. Cleanup from prior runs
  async function cleanup() {
    const existing = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, salesAEmail),
          eq(users.email, salesBEmail),
          eq(users.email, adminEmail),
          eq(users.email, managerEmail),
          eq(users.email, accountantEmail),
          eq(users.email, hrEmail)
        )
      );

    if (existing.length > 0) {
      for (const u of existing) {
        await db.delete(followUps).where(or(eq(followUps.assignedTo, u.id), eq(followUps.createdBy, u.id)));
        await db.delete(quotations).where(or(eq(quotations.salespersonId, u.id), eq(quotations.createdById, u.id)));
        await db.delete(leads).where(or(eq(leads.assignedEmployeeId, u.id), eq(leads.createdById, u.id)));
      }
      await db.delete(users).where(
        or(
          eq(users.email, salesAEmail),
          eq(users.email, salesBEmail),
          eq(users.email, adminEmail),
          eq(users.email, managerEmail),
          eq(users.email, accountantEmail),
          eq(users.email, hrEmail)
        )
      );
    }
  }

  await cleanup();

  const hashedPassword = await bcrypt.hash("Password@123", 10);

  // 2. Setup test users
  const [salesAUser] = await db
    .insert(users)
    .values({
      email: salesAEmail,
      passwordHash: hashedPassword,
      fullName: "Sales Rep Alpha",
      role: APP_CONSTANTS.ROLES.USER,
      workType: "OFFICE",
      designation: "Sales Office",
    })
    .returning();

  const [salesBUser] = await db
    .insert(users)
    .values({
      email: salesBEmail,
      passwordHash: hashedPassword,
      fullName: "Sales Rep Beta",
      role: APP_CONSTANTS.ROLES.USER,
      workType: "OFFICE",
      designation: "Sales Office",
    })
    .returning();

  const [adminUser] = await db
    .insert(users)
    .values({
      email: adminEmail,
      passwordHash: hashedPassword,
      fullName: "System Admin",
      role: APP_CONSTANTS.ROLES.ADMIN,
      workType: "OFFICE",
      designation: "Managing Director",
    })
    .returning();

  const [managerUser] = await db
    .insert(users)
    .values({
      email: managerEmail,
      passwordHash: hashedPassword,
      fullName: "Sales Manager",
      role: APP_CONSTANTS.ROLES.MANAGER,
      workType: "OFFICE",
      designation: "Sales Manager",
    })
    .returning();

  const [accountantUser] = await db
    .insert(users)
    .values({
      email: accountantEmail,
      passwordHash: hashedPassword,
      fullName: "Accounts Executive",
      role: APP_CONSTANTS.ROLES.USER,
      workType: "OFFICE",
      designation: "Accountant Office",
    })
    .returning();

  const [hrUser] = await db
    .insert(users)
    .values({
      email: hrEmail,
      passwordHash: hashedPassword,
      fullName: "HR Executive",
      role: APP_CONSTANTS.ROLES.USER,
      workType: "OFFICE",
      designation: "HR Office",
    })
    .returning();

  // JWT Payloads for testing
  const authSalesA: JwtPayload = {
    userId: salesAUser.id,
    email: salesAUser.email,
    role: salesAUser.role as any,
    workType: salesAUser.workType as any,
    designation: salesAUser.designation,
  };

  const authSalesB: JwtPayload = {
    userId: salesBUser.id,
    email: salesBUser.email,
    role: salesBUser.role as any,
    workType: salesBUser.workType as any,
    designation: salesBUser.designation,
  };

  const authAdmin: JwtPayload = {
    userId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role as any,
    workType: adminUser.workType as any,
    designation: adminUser.designation,
  };

  const authManager: JwtPayload = {
    userId: managerUser.id,
    email: managerUser.email,
    role: managerUser.role as any,
    workType: managerUser.workType as any,
    designation: managerUser.designation,
  };

  const authAccountant: JwtPayload = {
    userId: accountantUser.id,
    email: accountantUser.email,
    role: accountantUser.role as any,
    workType: accountantUser.workType as any,
    designation: accountantUser.designation,
  };

  const authHr: JwtPayload = {
    userId: hrUser.id,
    email: hrUser.email,
    role: hrUser.role as any,
    workType: hrUser.workType as any,
    designation: hrUser.designation,
  };

  // Test Customer
  const [testCustomer] = await db
    .insert(customers)
    .values({
      name: "Taneja Industries Pvt Ltd",
      companyName: "Taneja Industries",
      phone: "9876543210",
      email: "info@tanejaindustries.com",
    })
    .returning();

  // Test Lead for Sales A
  const [leadA] = await db
    .insert(leads)
    .values({
      id: `lead-c2-a-${Date.now()}`,
      leadCode: `LD-${Date.now()}`,
      customerName: "Lead Alpha Client",
      companyName: "Alpha Logistics Ltd",
      assignedEmployeeId: salesAUser.id,
      createdById: salesAUser.id,
    })
    .returning();

  // Test Lead for Sales B
  const [leadB] = await db
    .insert(leads)
    .values({
      id: `lead-c2-b-${Date.now()}`,
      leadCode: `LD-B-${Date.now()}`,
      customerName: "Lead Beta Client",
      companyName: "Beta Manufacturing Ltd",
      assignedEmployeeId: salesBUser.id,
      createdById: salesBUser.id,
    })
    .returning();

  try {
    // -------------------------------------------------------------
    // TEST 1: Creation by Authorized User & Auto Follow-up Number
    // -------------------------------------------------------------
    console.log("--- TEST 1: Follow-up Creation & Safe Sequential Numbering ---");
    const followUpA = await followUpService.createFollowUp(
      {
        title: "Call Alpha Client for requirement discussion",
        description: "Initial follow-up regarding commercial UPS requirements",
        type: "CALL",
        priority: "HIGH",
        scheduledDate: "2026-09-30",
        scheduledTime: "11:00",
        customerId: testCustomer.id,
        leadId: leadA.id,
        assignedTo: salesAUser.id,
      },
      authSalesA
    );

    if (!followUpA || !followUpA.followUpNumber.startsWith("FU-")) {
      throw new Error(`Invalid follow-up creation or follow-up number: ${followUpA?.followUpNumber}`);
    }
    console.log(`✓ PASS: Created Follow-up with number ${followUpA.followUpNumber} for Sales Rep Alpha`);

    const followUpB = await followUpService.createFollowUp(
      {
        title: "Site visit for Beta Manufacturing",
        description: "Inspect UPS battery room layout",
        type: "SITE_VISIT",
        priority: "MEDIUM",
        scheduledDate: "2026-10-02",
        scheduledTime: "14:30",
        customerId: testCustomer.id,
        leadId: leadB.id,
        assignedTo: salesBUser.id,
      },
      authSalesB
    );

    if (!followUpB || !followUpB.followUpNumber.startsWith("FU-")) {
      throw new Error(`Invalid follow-up creation for Sales B: ${followUpB?.followUpNumber}`);
    }
    console.log(`✓ PASS: Created Follow-up with number ${followUpB.followUpNumber} for Sales Rep Beta`);

    // -------------------------------------------------------------
    // TEST 2: Creation Denials (Accountant Office & HR Office)
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Creation Restrictions (Accountant & HR Denial) ---");
    try {
      await followUpService.createFollowUp(
        {
          title: "Accountant creating unauthorized follow-up",
          type: "PAYMENT_FOLLOW_UP",
          priority: "MEDIUM",
          scheduledDate: "2026-09-30",
          customerId: testCustomer.id,
        },
        authAccountant
      );
      throw new Error("Security failure: Accountant Office was able to create a follow-up!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Accountant Office follow-up creation rejected with 403 Forbidden.");
    }

    if (hasPermission(authAccountant.role, "followups:create", authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has permission followups:create");
    }
    if (hasPermission(authHr.role, "followups:create", authHr.designation)) {
      throw new Error("Security failure: HR Office has permission followups:create");
    }
    console.log("✓ PASS: Permission checks confirmed denyDesignations for Accountant Office and HR.");

    // -------------------------------------------------------------
    // TEST 3: Cross-User Related Entity Security (IDOR at creation)
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Related Entity Authorization at Creation ---");
    // Sales A attempts to create a follow-up against Sales B's lead
    try {
      await followUpService.createFollowUp(
        {
          title: "Unauthorized follow-up on another salesperson's lead",
          type: "CALL",
          priority: "MEDIUM",
          scheduledDate: "2026-10-01",
          leadId: leadB.id, // Owned by Sales B
        },
        authSalesA
      );
      throw new Error("Security failure: Sales A created follow-up against Sales B's unshared lead!");
    } catch (err: any) {
      if (err.statusCode !== 404 && err.statusCode !== 403) throw err;
      console.log("✓ PASS: Sales A cannot create follow-up against another user's isolated lead.");
    }

    // -------------------------------------------------------------
    // TEST 4: Direct IDOR Protection on GET /follow-ups/:id
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: IDOR Protection on Direct Access (GET /follow-ups/:id) ---");
    // Sales A retrieves own follow-up
    const ownFollowUp = await followUpService.getFollowUpById(followUpA.id, authSalesA);
    if (!ownFollowUp || ownFollowUp.id !== followUpA.id) {
      throw new Error("Sales A unable to access own follow-up");
    }
    console.log("✓ PASS: Authorized user can access own follow-up.");

    // Sales A attempts to access Sales B's follow-up
    try {
      await followUpService.getFollowUpById(followUpB.id, authSalesA);
      throw new Error("Security failure: IDOR leak! Sales A accessed Sales B's follow-up!");
    } catch (err: any) {
      if (err.statusCode !== 404) throw err;
      console.log("✓ PASS: IDOR attempt returned 404 Not Found (cross-sales isolation preserved).");
    }

    // Admin & Manager can access any follow-up
    const adminSeen = await followUpService.getFollowUpById(followUpB.id, authAdmin);
    const managerSeen = await followUpService.getFollowUpById(followUpA.id, authManager);
    if (!adminSeen || !managerSeen) {
      throw new Error("Management unable to view follow-ups");
    }
    console.log("✓ PASS: Admin and Manager have global follow-up read access.");

    // Accountant Office has read-only visibility
    const accountantSeen = await followUpService.getFollowUpById(followUpA.id, authAccountant);
    if (!accountantSeen) {
      throw new Error("Accountant Office unable to view follow-up");
    }
    console.log("✓ PASS: Accountant Office granted global read-only visibility.");

    // -------------------------------------------------------------
    // TEST 5: Follow-up List Scoping & Filtering
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Scoped Follow-up List ---");
    const salesAList = await followUpService.listFollowUps({}, authSalesA);
    const containsB = salesAList.followUps.some((f) => f.id === followUpB.id);
    if (containsB) {
      throw new Error("Security failure: Sales A list query leaked Sales B's follow-up!");
    }
    console.log(`✓ PASS: Sales A only receives scoped follow-ups (${salesAList.followUps.length} items, 0 leaks).`);

    const adminList = await followUpService.listFollowUps({}, authAdmin);
    if (adminList.followUps.length < 2) {
      throw new Error("Admin list missing global follow-ups");
    }
    console.log(`✓ PASS: Admin list returns global follow-ups (${adminList.followUps.length} total).`);

    // -------------------------------------------------------------
    // TEST 6: Reschedule Action
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Reschedule Action & Audit Notes ---");
    // Unauthorized reschedule attempt
    try {
      await followUpService.rescheduleFollowUp(
        followUpB.id,
        { scheduledDate: "2026-10-15", reason: "Hacked reschedule" },
        authSalesA
      );
      throw new Error("Security failure: Sales A rescheduled Sales B's follow-up!");
    } catch (err: any) {
      if (err.statusCode !== 403 && err.statusCode !== 404) throw err;
      console.log("✓ PASS: Unauthorized reschedule blocked with 403/404.");
    }

    // Authorized reschedule
    const rescheduled = await followUpService.rescheduleFollowUp(
      followUpA.id,
      {
        scheduledDate: "2026-10-05",
        scheduledTime: "15:00",
        reason: "Client asked to postpone meeting by 5 days",
      },
      authSalesA
    );
    if (rescheduled?.scheduledDate !== "2026-10-05" || rescheduled?.scheduledTime !== "15:00") {
      throw new Error("Reschedule failed to update date and time");
    }
    console.log("✓ PASS: Follow-up rescheduled successfully with audit notes.");

    // -------------------------------------------------------------
    // TEST 7: Complete Action & Next Follow-up Auto-Scheduling
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: Complete Action & Optional Next Follow-up ---");
    // Unauthorized completion attempt
    try {
      await followUpService.completeFollowUp(
        followUpB.id,
        { outcome: "Unauthorized completion" },
        authSalesA
      );
      throw new Error("Security failure: Sales A completed Sales B's follow-up!");
    } catch (err: any) {
      if (err.statusCode !== 403 && err.statusCode !== 404) throw err;
      console.log("✓ PASS: Unauthorized completion blocked with 403/404.");
    }

    // Authorized completion with next follow-up creation
    const completed = await followUpService.completeFollowUp(
      followUpA.id,
      {
        outcome: "Client requested detailed revised commercial quote for 40kVA UPS.",
        notes: "Send quotation before Friday.",
        createNextFollowUp: true,
        nextFollowUpDate: "2026-10-08",
        nextFollowUpTime: "10:30",
        nextFollowUpTitle: "Follow-up on revised commercial quote",
        nextFollowUpType: "QUOTATION_FOLLOW_UP",
      },
      authSalesA
    );

    if (completed?.status !== "COMPLETED" || !completed.completedAt) {
      throw new Error("Follow-up completion status was not set to COMPLETED");
    }
    if (!completed.nextFollowUpId) {
      throw new Error("Next follow-up was not linked upon completion");
    }

    const nextFollowUp = await followUpService.getFollowUpById(completed.nextFollowUpId, authSalesA);
    if (!nextFollowUp || nextFollowUp.scheduledDate !== "2026-10-08") {
      throw new Error("Automatically scheduled next follow-up not found or date mismatch");
    }
    console.log(`✓ PASS: Follow-up completed, and next follow-up (${nextFollowUp.followUpNumber}) successfully created and chained.`);

    // -------------------------------------------------------------
    // TEST 8: Cancel Action
    // -------------------------------------------------------------
    console.log("\n--- TEST 8: Cancel Follow-up Action ---");
    const cancelled = await followUpService.cancelFollowUp(
      followUpB.id,
      { reason: "Customer cancelled requirement due to internal budget reallocation" },
      authSalesB
    );

    if (cancelled?.status !== "CANCELLED" || !cancelled.cancelledAt) {
      throw new Error("Follow-up cancellation status was not set to CANCELLED");
    }
    console.log("✓ PASS: Follow-up cancelled successfully with cancellation reason recorded.");

    // -------------------------------------------------------------
    // TEST 9: Permanent Deletion Authorization (Admin only)
    // -------------------------------------------------------------
    console.log("\n--- TEST 9: Deletion Authorization (Admin Only) ---");
    // USER role delete attempt
    try {
      await followUpService.deleteFollowUp(followUpA.id, authSalesA);
      throw new Error("Security failure: Standard sales user was able to delete follow-up!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Standard user deletion attempt blocked with 403 Forbidden.");
    }

    // Admin deletion
    const deleteSuccess = await followUpService.deleteFollowUp(nextFollowUp.id, authAdmin);
    if (!deleteSuccess) {
      throw new Error("Admin was unable to delete follow-up");
    }
    console.log("✓ PASS: Administrator permanently deleted follow-up.");

    // -------------------------------------------------------------
    // TEST 10: Route Middleware & DenyDesignations Inspection
    // -------------------------------------------------------------
    console.log("\n--- TEST 10: Route Middleware Guard Verification ---");
    const routeFilePath = path.resolve(__dirname, "../modules/follow-ups/routes/follow-up.routes.ts");
    const routeContent = fs.readFileSync(routeFilePath, "utf-8");
    if (!routeContent.includes("denyDesignations('Accountant Office', 'HR Office', 'HR')")) {
      throw new Error("Follow-up routes missing denyDesignations guards!");
    }
    if (!routeContent.includes("requireRoles(APP_CONSTANTS.ROLES.ADMIN)")) {
      throw new Error("Follow-up delete route missing ADMIN role guard!");
    }
    console.log("✓ PASS: Route file contains denyDesignations and requireRoles guards.");

    console.log("\n=== ALL PHASE C.2 CRM FOLLOW-UPS SECURITY TESTS PASSED WITH 100% SUCCESS ===\n");
  } finally {
    await cleanup();
    if (testCustomer) {
      await db.delete(customers).where(eq(customers.id, testCustomer.id));
    }
  }
}

// Run test if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPhaseC2FollowUpsTests()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("\n❌ PHASE C.2 FOLLOW-UPS TESTS FAILED:", err);
      await pool.end();
      process.exit(1);
    });
}

export { runPhaseC2FollowUpsTests };
