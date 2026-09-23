import { db, pool } from "./db.js";
import { users } from "./schema/users.js";
import { customers } from "./schema/customers.js";
import { quotations, quotationRevisions } from "./schema/quotations.js";
import { amcContracts } from "./schema/amc-contracts.js";
import { eq } from "drizzle-orm";
import { AmcContractService } from "../modules/amc-contracts/services/amc-contract.service.js";
import { APP_CONSTANTS } from "../config/constants.js";
import bcrypt from "bcryptjs";


async function runServiceOfficeTests() {
  console.log("=== RUNNING SERVICE OFFICE HARDENING & AMC UPDATE TESTS ===\n");

  const amcService = new AmcContractService();
  const serviceUserEmail = "service.office.test@tanejapower.com";

  // Cleanup helper
  async function cleanup() {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, serviceUserEmail));

    if (existing.length > 0) {
      for (const u of existing) {
        // Delete any linked AMC contracts
        await db.delete(amcContracts).where(eq(amcContracts.createdById, u.id));
        // Delete any linked quotations
        await db.delete(quotations).where(eq(quotations.salespersonId, u.id));
        // Delete user
        await db.delete(users).where(eq(users.id, u.id));
      }
    }
  }

  try {
    await cleanup();

    // 1. Create a Service Office user
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const [serviceUser] = await db
      .insert(users)
      .values({
        email: serviceUserEmail,
        passwordHash,
        fullName: "Vikas Service Office",
        role: "USER",
        workType: "OFFICE",
        designation: "Service Office",
        phone: "+91 99999 88881",
        status: "ACTIVE",
      })
      .returning();

    console.log(`Created Service Office User: ${serviceUser.fullName} (role: ${serviceUser.role}, workType: ${serviceUser.workType}, designation: ${serviceUser.designation})`);

    // 2. Create customer and quotation to generate an AMC Contract
    const [testCustomer] = await db
      .insert(customers)
      .values({
        name: "Test Solar Client",
        companyName: "Solar Grid Ltd",
        email: `solar.${Date.now()}@example.com`,
        phone: "9876543210",
        address: "123 Energy Park",
        city: "Gurugram",
        state: "Haryana",
        pincode: "122001",
        status: "ACTIVE",
      })
      .returning();

    const quotationService = new (await import("../modules/quotations/services/quotation.service.js")).QuotationService();
    const testQuotation = await quotationService.createQuotation(
      {
        customerId: testCustomer.id,
        quotationType: APP_CONSTANTS.QUOTATION_TYPES.AMC,
        subject: "AMC for Test Solar Client",
        amcPlan: "Ultra Care (UC)",
        amcStartDate: "2026-04-01",
        amcEndDate: "2027-03-31",
        amcServiceFrequency: "Quarterly",
        amcScheduledVisits: 4,
        amcBreakdownVisitType: "UNLIMITED",
        items: [
          {
            productName: "Solar Inverter Maintenance",
            quantity: 1,
            unitPrice: 100000,
            unit: "YR",
          },
        ],
      },
      {
        userId: serviceUser.id,
        email: serviceUser.email,
        role: serviceUser.role as any,
      }
    );

    if (!testQuotation) {
      throw new Error("Failed to create test quotation.");
    }

    // Update status to APPROVED to allow conversion to AMC Contract
    await db
      .update(quotations)
      .set({ status: "APPROVED" })
      .where(eq(quotations.id, testQuotation.id));

    // 3. Convert quotation to AMC Contract
    console.log("\n--- TEST 1: Create AMC Contract from Quotation ---");
    const contract = await amcService.createContractFromQuotation(testQuotation.id, serviceUser.id);
    console.log(`✓ PASS: AMC Contract created successfully: ${contract.contractNumber} (Status: ${contract.status})`);

    if (contract.amcPlan !== "Ultra Care (UC)") {
      throw new Error(`Expected AMC Plan Ultra Care (UC), got ${contract.amcPlan}`);
    }

    // 4. Test Update AMC Contract Details
    console.log("\n--- TEST 2: Update AMC Contract Operational Details ---");
    const updatedContract = await amcService.updateContract(
      contract.id,
      {
        endUser: "Vikas Unit 2 Plant",
        branch: "Gurugram Hub",
        zone: "North Zone",
        serviceFrequency: "Bi-Monthly",
        scheduledVisits: 6,
        breakdownVisitType: "4 PER YEAR",
        specialClauses: "Guaranteed 4-hour response time for critical inverter alarms.",
        amcPaymentTerms: "50% upfront, remaining 50% after 6 months.",
      },
      serviceUser.id
    );

    console.log(`✓ PASS: AMC Contract updated successfully.`);
    if (updatedContract.endUser !== "Vikas Unit 2 Plant") {
      throw new Error(`Expected endUser 'Vikas Unit 2 Plant', got ${updatedContract.endUser}`);
    }
    if (updatedContract.serviceFrequency !== "Bi-Monthly") {
      throw new Error(`Expected serviceFrequency 'Bi-Monthly', got ${updatedContract.serviceFrequency}`);
    }
    if (updatedContract.scheduledVisits !== 6) {
      throw new Error(`Expected scheduledVisits 6, got ${updatedContract.scheduledVisits}`);
    }
    if (updatedContract.specialClauses !== "Guaranteed 4-hour response time for critical inverter alarms.") {
      throw new Error(`Expected specialClauses match, got ${updatedContract.specialClauses}`);
    }

    // 5. Test Designation Validation for Service Office
    console.log("\n--- TEST 3: WorkType & Designation Consistency ---");
    const validOfficeDesignations = APP_CONSTANTS.DESIGNATIONS.OFFICE as readonly string[];
    if (!validOfficeDesignations.includes("Service Office")) {
      throw new Error("Service Office must be a valid OFFICE designation in APP_CONSTANTS.");
    }
    console.log("✓ PASS: 'Service Office' is an approved OFFICE designation.");

    // Cleanup
    await db.delete(amcContracts).where(eq(amcContracts.id, contract.id));
    await db.delete(quotationRevisions).where(eq(quotationRevisions.quotationId, testQuotation.id));
    await db.delete(quotations).where(eq(quotations.id, testQuotation.id));
    await db.delete(customers).where(eq(customers.id, testCustomer.id));
    await db.delete(users).where(eq(users.id, serviceUser.id));

    console.log("\n=== ALL SERVICE OFFICE HARDENING TESTS PASSED WITH 100% SUCCESS ===\n");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runServiceOfficeTests();
