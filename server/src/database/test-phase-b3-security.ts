import { db, pool } from "./db.js";
import { users } from "./schema/users.js";
import { customers, customerDestinations } from "./schema/customers.js";
import { quotations } from "./schema/quotations.js";
import { tasks } from "./schema/tasks.js";
import { leads } from "./schema/leads.js";
import { eq, or } from "drizzle-orm";
import { QuotationService } from "../modules/quotations/services/quotation.service.js";
import { TaskService } from "../modules/tasks/services/task.service.js";
import { LeadService } from "../modules/leads/services/lead.service.js";
import { APP_CONSTANTS, UserRole } from "../config/constants.js";
import { hasPermission } from "../common/auth/permissions.js";
import { JwtPayload } from "../common/auth/jwt.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhaseB3Tests() {
  console.log("=== RUNNING PHASE B.3 AUDIT & HARDENING REGRESSION TESTS ===\n");

  const quotationService = new QuotationService();
  const taskService = new TaskService();
  const leadService = new LeadService();

  const userAEmail = "b3.sales.a@tanejapower.com";
  const userBEmail = "b3.sales.b@tanejapower.com";
  const adminEmail = "b3.admin@tanejapower.com";

  // Cleanup helper
  async function cleanup() {
    const existing = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, userAEmail),
          eq(users.email, userBEmail),
          eq(users.email, adminEmail)
        )
      );

    if (existing.length > 0) {
      for (const u of existing) {
        await db.delete(tasks).where(eq(tasks.assignedTo, u.id));
        await db.delete(quotations).where(or(eq(quotations.salespersonId, u.id), eq(quotations.createdById, u.id)));
        await db.delete(leads).where(or(eq(leads.assignedEmployeeId, u.id), eq(leads.createdById, u.id)));
      }
      await db.delete(users).where(
        or(
          eq(users.email, userAEmail),
          eq(users.email, userBEmail),
          eq(users.email, adminEmail)
        )
      );
    }
  }

  await cleanup();

  const hashedPassword = await bcrypt.hash("Password@123", 10);

  // 1. Create Test Users
  const [userA] = await db
    .insert(users)
    .values({
      email: userAEmail,
      passwordHash: hashedPassword,
      fullName: "Vikas Sales A",
      role: APP_CONSTANTS.ROLES.USER,
      workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
      designation: "Sales Office",
      status: "ACTIVE",
    })
    .returning();

  const [userB] = await db
    .insert(users)
    .values({
      email: userBEmail,
      passwordHash: hashedPassword,
      fullName: "Rahul Sales B",
      role: APP_CONSTANTS.ROLES.USER,
      workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
      designation: "Sales Office",
      status: "ACTIVE",
    })
    .returning();

  const [adminUser] = await db
    .insert(users)
    .values({
      email: adminEmail,
      passwordHash: hashedPassword,
      fullName: "Admin Supervisor",
      role: APP_CONSTANTS.ROLES.ADMIN,
      workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
      designation: "Director",
      status: "ACTIVE",
    })
    .returning();

  // Find or create test customer
  let [customer] = await db.select().from(customers).limit(1);
  if (!customer) {
    [customer] = await db
      .insert(customers)
      .values({
        name: "B3 Test Enterprise",
        companyName: "B3 Enterprise Pvt Ltd",
        email: "contact@b3test.com",
        phone: "+919876543210",
        address: "Phase B3 Test Complex",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380001",
        status: "ACTIVE",
      })
      .returning();
  }

  let [destination] = await db.select().from(customerDestinations).where(eq(customerDestinations.customerId, customer.id)).limit(1);
  if (!destination) {
    [destination] = await db
      .insert(customerDestinations)
      .values({
        customerId: customer.id,
        name: "Main Substation Yard",
        address: "Plot 10, Industrial Estate",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380001",
        status: "ACTIVE",
      })
      .returning();
  }

  const authUserA: JwtPayload = { userId: userA.id, role: userA.role as UserRole, email: userA.email };
  const authUserB: JwtPayload = { userId: userB.id, role: userB.role as UserRole, email: userB.email };
  const authAdmin: JwtPayload = { userId: adminUser.id, role: adminUser.role as UserRole, email: adminUser.email };

  try {
    // -------------------------------------------------------------
    // TEST 1: Quotation Creation & Ownership Scoping
    // -------------------------------------------------------------
    console.log("--- TEST 1: Quotation Creation & Ownership Scoping ---");
    const quoteA = await quotationService.createQuotation(
      {
        customerId: customer.id,
        items: [{ productName: "Industrial Stabilizer", quantity: 1, unitPrice: 50000 }],
      },
      authUserA
    );
    const quoteB = await quotationService.createQuotation(
      {
        customerId: customer.id,
        items: [{ productName: "High Voltage Transformer", quantity: 1, unitPrice: 120000 }],
      },
      authUserB
    );

    if (quoteA?.salespersonId !== userA.id) throw new Error("Quote A salespersonId not pinned to User A");
    if (quoteB?.salespersonId !== userB.id) throw new Error("Quote B salespersonId not pinned to User B");

    const listA = await quotationService.listQuotations({}, authUserA);
    const quoteBFoundInListA = listA.quotations.some((q) => q.id === quoteB?.id);
    if (quoteBFoundInListA) throw new Error("Security leak: User A listed User B's quotation!");
    console.log("✓ PASS: Quotations created and strictly scoped to creator.");

    // -------------------------------------------------------------
    // TEST 2: Quotation IDOR & Mutation Protection
    // -------------------------------------------------------------
    console.log("--- TEST 2: Quotation IDOR & Mutation Protection ---");
    // Detail
    try {
      await quotationService.getQuotationById(quoteB!.id, authUserA);
      throw new Error("Security failure: User A retrieved User B's quote detail!");
    } catch (err: any) {
      if (err.statusCode !== 404) throw err;
      console.log("✓ PASS: User A accessing User B's quote returned 404 (IDOR prevented).");
    }

    // Update
    try {
      await quotationService.updateQuotation(quoteB!.id, { subject: "Hacked" }, authUserA);
      throw new Error("Security failure: User A updated User B's quotation!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: User A updating User B's quote rejected with 403 Forbidden.");
    }

    // Submit
    try {
      await quotationService.submitForApproval(quoteB!.id, { comments: "Hacked" }, authUserA);
      throw new Error("Security failure: User A submitted User B's quotation!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: User A submitting User B's quote rejected with 403 Forbidden.");
    }

    // Revisions
    try {
      await quotationService.createFormalRevision(quoteB!.id, { revisionReason: "Hacked" }, authUserA);
      throw new Error("Security failure: User A created revision on User B's quotation!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: User A creating revision on User B's quote rejected with 403 Forbidden.");
    }

    // -------------------------------------------------------------
    // TEST 3: Task Isolation & Lifecycle Mutations
    // -------------------------------------------------------------
    console.log("--- TEST 3: Task Isolation & Lifecycle Mutations ---");
    const [taskB] = await db
      .insert(tasks)
      .values({
        title: "B3 Maintenance at Substation B",
        description: "Assigned to User B",
        assignedTo: userB.id,
        customerId: customer.id,
        destinationId: destination.id,
        status: "PENDING",
        priority: "MEDIUM",
        createdBy: adminUser.id,
      })
      .returning();

    // User A trying to start Task B
    try {
      await taskService.startTask(taskB.id, userA.id, userA.role);
      throw new Error("Security failure: User A started User B's assigned task!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: User A starting User B's task blocked with 403 Forbidden.");
    }

    // User A trying to complete Task B
    try {
      await taskService.completeTask(taskB.id, userA.id, userA.role);
      throw new Error("Security failure: User A completed User B's assigned task!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: User A completing User B's task blocked with 403 Forbidden.");
    }

    // -------------------------------------------------------------
    // TEST 4: Lead Scoping & Reassignment Resistance
    // -------------------------------------------------------------
    console.log("--- TEST 4: Lead Scoping & Reassignment Resistance ---");
    const leadA = await leadService.createLead(
      {
        id: `lead-${crypto.randomUUID()}`,
        customerName: "B3 Client For User A",
        companyName: "B3 Enterprise Client",
        assignedEmployeeId: userA.id,
      },
      authUserA
    );

    // Sales employee updating lead cannot reassign to another user
    const updatedLead = await leadService.updateLead(
      leadA!.id,
      {
        assignedEmployeeId: userB.id,
        priority: "High",
      },
      authUserA
    );
    if (updatedLead?.assignedEmployeeId === userB.id) {
      throw new Error("Security failure: Sales user was able to reassign lead!");
    }
    console.log("✓ PASS: Lead reassignment stripped for sales employee.");

    // Sales employee cannot delete lead
    const canSalesDeleteLead = hasPermission(userA.role as UserRole, "leads:delete");
    if (canSalesDeleteLead) {
      throw new Error("Security failure: USER role has leads:delete permission!");
    }
    console.log("✓ PASS: USER role lacks leads:delete permission (deletion protected).");

    // -------------------------------------------------------------
    // TEST 5: Route Protections Inspection (AMC, Product, Customer)
    // -------------------------------------------------------------
    console.log("--- TEST 5: Route Protections Inspection ---");
    const amcRoutesPath = path.resolve(__dirname, "../modules/amc-contracts/routes/amc-contract.routes.ts");
    const amcContent = fs.readFileSync(amcRoutesPath, "utf-8");

    if (!amcContent.includes("requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER)")) {
      throw new Error("AMC routes missing requireRoles for lifecycle actions!");
    }
    console.log("✓ PASS: AMC lifecycle routes require ADMIN or MANAGER.");

    const productRoutesPath = path.resolve(__dirname, "../modules/products/routes/product.routes.ts");
    const productContent = fs.readFileSync(productRoutesPath, "utf-8");

    if (!productContent.includes("requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER)")) {
      throw new Error("Product routes missing requireRoles for creation/updates!");
    }
    console.log("✓ PASS: Equipment / Product mutations require ADMIN or MANAGER.");

    console.log("\n=== ALL PHASE B.3 SECURITY & AUDIT TESTS PASSED WITH 100% SUCCESS ===\n");
  } finally {
    await cleanup();
    await pool.end();
  }
}

runPhaseB3Tests().catch((err) => {
  console.error("\n❌ PHASE B.3 TESTS FAILED:\n", err);
  process.exit(1);
});
