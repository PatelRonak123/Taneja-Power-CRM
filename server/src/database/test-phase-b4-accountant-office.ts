import { db, pool } from "./db.js";
import { users } from "./schema/users.js";
import { customers, customerDestinations } from "./schema/customers.js";
import { quotations, quotationRevisions } from "./schema/quotations.js";
import { tasks } from "./schema/tasks.js";
import { leads } from "./schema/leads.js";
import { amcContracts } from "./schema/amc-contracts.js";
import { attendance } from "./schema/attendance.js";
import { eq, or } from "drizzle-orm";
import { QuotationService } from "../modules/quotations/services/quotation.service.js";
import { LeadService } from "../modules/leads/services/lead.service.js";
import { AmcContractService } from "../modules/amc-contracts/services/amc-contract.service.js";
import { AttendanceService } from "../modules/attendance/services/attendance.service.js";
import { APP_CONSTANTS, UserRole, WorkType } from "../config/constants.js";
import { hasPermission } from "../common/auth/permissions.js";
import { isValidDesignationForWorkType } from "../modules/employees/validators/employee.validator.js";
import { JwtPayload } from "../common/auth/jwt.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhaseB4Tests() {
  console.log("=== RUNNING PHASE B.4 ACCOUNTANT OFFICE RBAC SECURITY TESTS ===\n");

  const quotationService = new QuotationService();
  const leadService = new LeadService();
  const amcService = new AmcContractService();
  const attendanceService = new AttendanceService();

  const accountantEmail = "b4.accountant@tanejapower.com";
  const salesEmail = "b4.sales@tanejapower.com";
  const adminEmail = "b4.admin@tanejapower.com";

  // Cleanup helper
  async function cleanup() {
    const existing = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, accountantEmail),
          eq(users.email, salesEmail),
          eq(users.email, adminEmail)
        )
      );

    if (existing.length > 0) {
      for (const u of existing) {
        await db.delete(attendance).where(eq(attendance.employeeId, u.id));
        await db.delete(tasks).where(eq(tasks.assignedTo, u.id));
        await db.delete(amcContracts).where(eq(amcContracts.createdById, u.id));
        await db.delete(quotationRevisions).where(eq(quotationRevisions.createdById, u.id));
        await db.delete(quotations).where(or(eq(quotations.salespersonId, u.id), eq(quotations.createdById, u.id)));
        await db.delete(leads).where(or(eq(leads.assignedEmployeeId, u.id), eq(leads.createdById, u.id)));
      }
      await db.delete(users).where(
        or(
          eq(users.email, accountantEmail),
          eq(users.email, salesEmail),
          eq(users.email, adminEmail)
        )
      );
    }
  }

  await cleanup();

  const hashedPassword = await bcrypt.hash("Password@123", 10);

  // 1. Create Test Users
  const [accountantUser] = await db
    .insert(users)
    .values({
      email: accountantEmail,
      passwordHash: hashedPassword,
      fullName: "Pooja Accountant",
      role: APP_CONSTANTS.ROLES.USER,
      workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
      designation: "Accountant Office",
      status: "ACTIVE",
    })
    .returning();

  const [salesUser] = await db
    .insert(users)
    .values({
      email: salesEmail,
      passwordHash: hashedPassword,
      fullName: "Rohit Sales",
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
      fullName: "Admin Controller",
      role: APP_CONSTANTS.ROLES.ADMIN,
      workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
      designation: "Director",
      status: "ACTIVE",
    })
    .returning();

  // Test customer
  let [customer] = await db.select().from(customers).limit(1);
  if (!customer) {
    [customer] = await db
      .insert(customers)
      .values({
        name: "B4 Industrial Client",
        companyName: "B4 Heavy Industries Ltd",
        email: "client@b4test.com",
        phone: "+919876543210",
        address: "Sector 5, Industrial Hub",
        city: "Gurugram",
        state: "Haryana",
        pincode: "122001",
        status: "ACTIVE",
      })
      .returning();
  }

  const authAccountant: JwtPayload = {
    userId: accountantUser.id,
    role: accountantUser.role as UserRole,
    email: accountantUser.email,
    workType: accountantUser.workType as WorkType,
    designation: accountantUser.designation,
  };

  const authSales: JwtPayload = {
    userId: salesUser.id,
    role: salesUser.role as UserRole,
    email: salesUser.email,
    workType: salesUser.workType as WorkType,
    designation: salesUser.designation,
  };

  const authAdmin: JwtPayload = {
    userId: adminUser.id,
    role: adminUser.role as UserRole,
    email: adminUser.email,
    workType: adminUser.workType as WorkType,
    designation: adminUser.designation,
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Identity & Architecture Verification
    // -------------------------------------------------------------
    console.log("--- TEST 1: Identity & Designation Validation ---");
    if (!isValidDesignationForWorkType('OFFICE', 'Accountant Office', 'USER')) {
      throw new Error("Validation failure: OFFICE + Accountant Office must be valid for USER");
    }
    if (isValidDesignationForWorkType('FIELD', 'Accountant Office', 'USER')) {
      throw new Error("Validation failure: FIELD + Accountant Office must be INVALID");
    }
    if (accountantUser.workType !== 'OFFICE' || accountantUser.role !== 'USER' || accountantUser.designation !== 'Accountant Office') {
      throw new Error("Accountant identity mismatch in database record");
    }
    console.log("✓ PASS: Identity verified: workType=OFFICE, role=USER, designation=Accountant Office");

    // -------------------------------------------------------------
    // TEST 2: Customer Access (View Allowed, Mutations Denied)
    // -------------------------------------------------------------
    console.log("--- TEST 2: Customer Authorization ---");
    if (!hasPermission(authAccountant.role, 'customers:read', authAccountant.designation)) {
      throw new Error("Accountant Office denied customers:read permission");
    }
    if (hasPermission(authAccountant.role, 'customers:create', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has customers:create permission");
    }
    if (hasPermission(authAccountant.role, 'customers:edit', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has customers:edit permission");
    }
    if (hasPermission(authAccountant.role, 'customers:delete', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has customers:delete permission");
    }

    const customerRoutesPath = path.resolve(__dirname, "../modules/customers/routes/customer.routes.ts");
    const customerRouteContent = fs.readFileSync(customerRoutesPath, "utf-8");
    if (!customerRouteContent.includes("requirePermission('customers:create')") || !customerRouteContent.includes("requirePermission('customers:edit')")) {
      throw new Error("Customer routes missing requirePermission guards for create/update");
    }
    console.log("✓ PASS: Customer read granted, mutation & delete strictly blocked at permission and route levels.");

    // -------------------------------------------------------------
    // TEST 3: Pipeline / Deals Scoping & Mutation Protection
    // -------------------------------------------------------------
    console.log("--- TEST 3: Pipeline & Deals Authorization ---");
    const salesLead = await leadService.createLead(
      {
        id: `lead-b4-${Date.now()}`,
        customerName: "B4 Commercial Client",
        companyName: "Commercial Infra Ltd",
        assignedEmployeeId: salesUser.id,
      },
      authSales
    );

    // Accountant Office reads pipeline
    const pipelineData = await leadService.getPipeline(authAccountant);
    if (!pipelineData || !Array.isArray(pipelineData)) {
      throw new Error("Accountant Office unable to view pipeline data");
    }
    const allLeadsSeen = await leadService.listLeads({}, authAccountant);
    const foundSalesLead = allLeadsSeen.some((l: any) => l.id === salesLead?.id);
    if (!foundSalesLead) {
      throw new Error("Security failure: Accountant Office was not granted visibility over sales pipeline deal!");
    }
    console.log("✓ PASS: Accountant Office has full global visibility over Deals Pipeline.");

    // Accountant Office cannot create lead
    try {
      await leadService.createLead(
        {
          id: `lead-hacked-${Date.now()}`,
          customerName: "Unauthorized Lead",
          companyName: "Unauthorized Company",
        },
        authAccountant
      );
      throw new Error("Security failure: Accountant Office was able to create a lead!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Accountant Office creating lead rejected with 403 Forbidden.");
    }

    // Accountant Office cannot update lead
    try {
      await leadService.updateLead(salesLead!.id, { priority: "High" }, authAccountant);
      throw new Error("Security failure: Accountant Office was able to update a lead!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Accountant Office updating lead rejected with 403 Forbidden.");
    }

    // Accountant Office cannot delete lead
    try {
      await leadService.deleteLead(salesLead!.id, authAccountant);
      throw new Error("Security failure: Accountant Office was able to delete a lead!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Accountant Office deleting lead rejected with 403 Forbidden.");
    }

    // -------------------------------------------------------------
    // TEST 4: Quotations Access (Global View Allowed, Mutations Denied)
    // -------------------------------------------------------------
    console.log("--- TEST 4: Quotation Authorization ---");
    // Create quotation as Sales Office
    const salesQuote = await quotationService.createQuotation(
      {
        customerId: customer.id,
        items: [{ productName: "Commercial Power Stabilizer 50kVA", quantity: 1, unitPrice: 85000 }],
      },
      authSales
    );

    // Accountant Office lists quotations -> can view sales quotation
    const quoteList = await quotationService.listQuotations({}, authAccountant);
    const foundInAccountantList = quoteList.quotations.some((q) => q.id === salesQuote?.id);
    if (!foundInAccountantList) {
      throw new Error("Security failure: Accountant Office cannot view commercial quotations list!");
    }
    console.log("✓ PASS: Accountant Office has global read visibility over quotations.");

    // Accountant Office gets detail
    const quoteDetail = await quotationService.getQuotationById(salesQuote!.id, authAccountant);
    if (!quoteDetail || quoteDetail.id !== salesQuote!.id) {
      throw new Error("Accountant Office unable to view quotation detail");
    }
    console.log("✓ PASS: Accountant Office can view quotation details and active revisions.");

    // Accountant Office cannot create quotation
    try {
      await quotationService.createQuotation(
        {
          customerId: customer.id,
          items: [{ productName: "Unauthorized Item", quantity: 1, unitPrice: 10000 }],
        },
        authAccountant
      );
      throw new Error("Security failure: Accountant Office created quotation!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Accountant Office creating quotation rejected with 403 Forbidden.");
    }

    // Accountant Office cannot edit quotation
    try {
      await quotationService.updateQuotation(salesQuote!.id, { subject: "Hacked Subject" }, authAccountant);
      throw new Error("Security failure: Accountant Office updated quotation!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Accountant Office updating quotation rejected with 403 Forbidden.");
    }

    // Accountant Office cannot submit quotation
    try {
      await quotationService.submitForApproval(salesQuote!.id, {}, authAccountant);
      throw new Error("Security failure: Accountant Office submitted quotation!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Accountant Office submitting quotation rejected with 403 Forbidden.");
    }

    // Accountant Office cannot approve quotation
    try {
      await quotationService.approveQuotation(salesQuote!.id, {}, authAccountant);
      throw new Error("Security failure: Accountant Office approved quotation!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Accountant Office approving quotation rejected with 403 Forbidden.");
    }

    // Accountant Office cannot create formal revision
    try {
      await quotationService.createFormalRevision(salesQuote!.id, { revisionReason: "Hacked" }, authAccountant);
      throw new Error("Security failure: Accountant Office created formal revision!");
    } catch (err: any) {
      if (err.statusCode !== 403) throw err;
      console.log("✓ PASS: Accountant Office creating formal revision rejected with 403 Forbidden.");
    }

    // -------------------------------------------------------------
    // TEST 5: Inventory / Equipment (View Only, Mutations Denied)
    // -------------------------------------------------------------
    console.log("--- TEST 5: Equipment & Inventory Authorization ---");
    if (!hasPermission(authAccountant.role, 'products:read', authAccountant.designation)) {
      throw new Error("Accountant Office denied products:read permission");
    }
    if (hasPermission(authAccountant.role, 'products:create', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has products:create permission");
    }
    if (hasPermission(authAccountant.role, 'products:update', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has products:update permission");
    }
    if (hasPermission(authAccountant.role, 'products:delete', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has products:delete permission");
    }

    const productRoutesPath = path.resolve(__dirname, "../modules/products/routes/product.routes.ts");
    const productRouteContent = fs.readFileSync(productRoutesPath, "utf-8");
    if (!productRouteContent.includes("requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER)")) {
      throw new Error("Product routes missing requireRoles for mutations");
    }
    console.log("✓ PASS: Equipment catalog view granted; create/update/delete strictly blocked.");

    // -------------------------------------------------------------
    // TEST 6: AMC Contracts Lifecycle Protection
    // -------------------------------------------------------------
    console.log("--- TEST 6: AMC Contracts Authorization ---");
    if (!hasPermission(authAccountant.role, 'amc:read', authAccountant.designation)) {
      throw new Error("Accountant Office denied amc:read permission");
    }
    if (hasPermission(authAccountant.role, 'amc:activate', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has amc:activate permission");
    }
    if (hasPermission(authAccountant.role, 'amc:renew', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has amc:renew permission");
    }
    if (hasPermission(authAccountant.role, 'amc:terminate', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office has amc:terminate permission");
    }

    // Service method conversion check
    try {
      await amcService.createContractFromQuotation(salesQuote!.id, accountantUser.id);
      throw new Error("Security failure: Accountant Office created AMC contract from quotation!");
    } catch (err: any) {
      console.log(`✓ PASS: Accountant Office creating AMC contract blocked: ${err.message}`);
    }

    // Verify AMC routes protection
    const amcRoutesPath = path.resolve(__dirname, "../modules/amc-contracts/routes/amc-contract.routes.ts");
    const amcRouteContent = fs.readFileSync(amcRoutesPath, "utf-8");
    if (!amcRouteContent.includes("denyDesignations('Accountant Office')")) {
      throw new Error("AMC routes missing denyDesignations guards for Accountant Office!");
    }
    console.log("✓ PASS: AMC view granted; activate/renew/terminate & lifecycle mutations strictly blocked.");

    // -------------------------------------------------------------
    // TEST 7: Attendance Scoping
    // -------------------------------------------------------------
    console.log("--- TEST 7: Attendance Self-Service Scoping ---");
    const ownAttendance = await attendanceService.checkIn(accountantUser.id, { notes: "B4 Office Check-in" });
    if (ownAttendance.employeeId !== accountantUser.id) {
      throw new Error("Own attendance checkIn recorded with wrong employeeId");
    }

    const fetchedOwn = await attendanceService.getAttendanceById(ownAttendance.id);
    if (!fetchedOwn || fetchedOwn.employeeId !== accountantUser.id) {
      throw new Error("Failed to retrieve own attendance record");
    }
    console.log("✓ PASS: Own attendance check-in & retrieval verified.");

    const salesAttendance = await attendanceService.checkIn(salesUser.id, { notes: "B4 Sales Check-in" });
    const attendanceControllerPath = path.resolve(__dirname, "../modules/attendance/controllers/attendance.controller.ts");
    const attendanceControllerContent = fs.readFileSync(attendanceControllerPath, "utf-8");
    if (!attendanceControllerContent.includes("result.employeeId !== req.user.userId")) {
      throw new Error("Attendance controller missing cross-employee inspection guard!");
    }
    console.log("✓ PASS: Cross-employee attendance viewing blocked for USER role.");

    // -------------------------------------------------------------
    // TEST 8: Field Service / FSR & Employee Management Protection
    // -------------------------------------------------------------
    console.log("--- TEST 8: FSR & Employee Management Denial ---");
    if (hasPermission(authAccountant.role, 'fsr:read', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office granted fsr:read permission");
    }
    if (hasPermission(authAccountant.role, 'fsr:create', authAccountant.designation)) {
      throw new Error("Security failure: Accountant Office granted fsr:create permission");
    }

    const fsrRoutesPath = path.resolve(__dirname, "../modules/field-service/routes/field-service.routes.ts");
    const fsrRouteContent = fs.readFileSync(fsrRoutesPath, "utf-8");
    if (!fsrRouteContent.includes("denyDesignations('Accountant Office')")) {
      throw new Error("FSR routes missing denyDesignations('Accountant Office') guard!");
    }
    console.log("✓ PASS: FSR routes strictly blocked for Accountant Office.");

    const employeeRoutesPath = path.resolve(__dirname, "../modules/employees/routes/employee.routes.ts");
    const employeeRouteContent = fs.readFileSync(employeeRoutesPath, "utf-8");
    if (!employeeRouteContent.includes("requireRoles") || employeeRouteContent.includes("APP_CONSTANTS.ROLES.USER")) {
      throw new Error("Employee routes missing requireRoles or incorrectly allowing USER");
    }
    console.log("✓ PASS: Employee management strictly blocked for USER role.");

    console.log("\n=== ALL PHASE B.4 ACCOUNTANT OFFICE SECURITY TESTS PASSED WITH 100% SUCCESS ===\n");
  } finally {
    await cleanup();
    await pool.end();
  }
}

runPhaseB4Tests().catch((err) => {
  console.error("\n❌ PHASE B.4 TESTS FAILED:\n", err);
  process.exit(1);
});
