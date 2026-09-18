import { db, pool } from "./db.js";
import { customers } from "./schema/customers.js";
import { products } from "./schema/products.js";
import { users } from "./schema/users.js";
import { QuotationService } from "../modules/quotations/services/quotation.service.js";
import { QuotationRepository } from "../modules/quotations/repositories/quotation.repository.js";
import { APP_CONSTANTS } from "../config/constants.js";
import { JwtPayload } from "../common/auth/jwt.js";

const runTest = async () => {
  console.log("=== STARTING QUOTATION MODULE PHASE 3 VERIFICATION TEST ===\n");

  const quotationService = new QuotationService();
  const quotationRepo = new QuotationRepository();

  // 1. Fetch or create a test user (Admin)
  let [adminUser] = await db.select().from(users).limit(1);
  if (!adminUser) {
    const [created] = await db
      .insert(users)
      .values({
        email: "admin.test@tanejapower.com",
        passwordHash: "dummyhash",
        fullName: "Admin Test User",
        role: APP_CONSTANTS.ROLES.ADMIN,
      })
      .returning();
    adminUser = created;
  }
  console.log(
    `✓ Using Admin User: ${adminUser.fullName} (${adminUser.id}) [Role: ${adminUser.role}]`,
  );

  const authUser: JwtPayload = {
    userId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role as any,
  };

  // 2. Fetch or create a test customer
  let [customer] = await db.select().from(customers).limit(1);
  if (!customer) {
    const [created] = await db
      .insert(customers)
      .values({
        name: "Test Industrial Corp",
        companyName: "Test Industrial Pvt Ltd",
        email: "contact@testcorp.com",
        phone: "+91 9876543210",
        address: "GIDC Industrial Area, Makarpura",
        city: "Vadodara",
        state: "Gujarat",
        pincode: "390010",
        status: "ACTIVE",
      })
      .returning();
    customer = created;
  }
  console.log(
    `✓ Using Customer: ${customer.companyName || customer.name} (${customer.id}) [State: ${customer.state}]`,
  );

  // 3. Fetch or create a test product
  let [product] = await db.select().from(products).limit(1);
  if (!product) {
    const [created] = await db
      .insert(products)
      .values({
        name: "11KV Transformer Bushing",
        sku: "TR-BSH-11KV",
        category: "High Voltage Equipment",
        price: "45000.00",
        stockQuantity: 10,
        status: "ACTIVE",
      })
      .returning();
    product = created;
  }
  console.log(
    `✓ Using Product: ${product.name} (SKU: ${product.sku}, Price: ₹${product.price})`,
  );

  // ----------------------------------------------------
  // TEST 1: CREATE DRAFT QUOTATION WITH LINE ITEMS
  // ----------------------------------------------------
  console.log(
    "\n[TEST 1] Creating Draft Quotation with Catalog Product + Custom Service Item...",
  );
  const createdQuotation = await quotationService.createQuotation(
    {
      quotationType: APP_CONSTANTS.QUOTATION_TYPES.PRODUCT,
      customerId: customer.id,
      subject: "Quotation for 11KV Transformer Bushing & On-Site Installation",
      paymentTerms: "50% Advance, 50% on Delivery",
      deliveryTerms: "Immediate dispatch within 5 days",
      warrantyTerms: "12 Months Comprehensive On-Site Warranty",
      notes: "Prices inclusive of standard packaging.",
      freightCharges: 1500,
      otherCharges: 500,
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: 2,
          unitPrice: 45000,
          discountPercent: 10, // 10% discount on 90,000 = 9,000 -> Taxable: 81,000
          gstRate: 18, // Gujarat intra-state: CGST 9% (7290), SGST 9% (7290) -> Line Total: 95,580
        },
        {
          productName: "On-Site Commissioning & Testing Service",
          itemType: APP_CONSTANTS.QUOTATION_ITEM_TYPES.SERVICE,
          quantity: 1,
          unitPrice: 10000,
          discountAmount: 1000, // Taxable: 9,000 -> CGST 9% (810), SGST 9% (810) -> Line Total: 10,620
          gstRate: 18,
          serviceDurationMonths: 1,
          serviceScope: "Full testing of insulation and high voltage withstand",
        },
      ],
    },
    authUser,
  );

  if (!createdQuotation)
    throw new Error("Quotation creation returned undefined");

  console.log(`✓ Quotation created successfully:`);
  console.log(`  - Quotation ID: ${createdQuotation.id}`);
  console.log(`  - Quotation Number: ${createdQuotation.quotationNumber}`);
  console.log(`  - Status: ${createdQuotation.status}`);
  console.log(
    `  - Current Revision: ${createdQuotation.currentRevisionNumber}`,
  );
  console.log(`  - Subtotal: ₹${createdQuotation.currentRevision?.subtotal}`);
  console.log(
    `  - Total Discount: ₹${createdQuotation.currentRevision?.totalDiscount}`,
  );
  console.log(
    `  - Taxable Amount: ₹${createdQuotation.currentRevision?.taxableAmount}`,
  );
  console.log(
    `  - CGST Amount: ₹${createdQuotation.currentRevision?.cgstAmount}`,
  );
  console.log(
    `  - SGST Amount: ₹${createdQuotation.currentRevision?.sgstAmount}`,
  );
  console.log(
    `  - IGST Amount: ₹${createdQuotation.currentRevision?.igstAmount}`,
  );
  console.log(`  - Total Tax: ₹${createdQuotation.currentRevision?.totalTax}`);
  console.log(
    `  - Freight: ₹${createdQuotation.currentRevision?.freightCharges}`,
  );
  console.log(
    `  - Other Charges: ₹${createdQuotation.currentRevision?.otherCharges}`,
  );
  console.log(`  - Round-off: ₹${createdQuotation.currentRevision?.roundOff}`);
  console.log(
    `  - Grand Total: ₹${createdQuotation.currentRevision?.grandTotal}`,
  );
  console.log(
    `  - Amount In Words: ${createdQuotation.currentRevision?.amountInWords}`,
  );
  console.log(
    `  - Customer Snapshot: ${createdQuotation.currentRevision?.customerName} (${createdQuotation.currentRevision?.companyName})`,
  );
  console.log(
    `  - Line Items Count: ${createdQuotation.currentRevision?.items.length}`,
  );

  // Assertions for Test 1
  if (createdQuotation.status !== APP_CONSTANTS.QUOTATION_STATUSES.DRAFT) {
    throw new Error(`Expected status DRAFT, got ${createdQuotation.status}`);
  }
  if (createdQuotation.currentRevisionNumber !== 1) {
    throw new Error(
      `Expected revision number 1, got ${createdQuotation.currentRevisionNumber}`,
    );
  }

  // ----------------------------------------------------
  // TEST 2: SUBMIT FOR APPROVAL
  // ----------------------------------------------------
  console.log("\n[TEST 2] Submitting Quotation for Approval...");
  const submittedQuotation = await quotationService.submitForApproval(
    createdQuotation.id,
    { comments: "High-value quote requiring operational manager review" },
    authUser,
  );

  console.log(
    `✓ Quotation status after submission: ${submittedQuotation?.status}`,
  );
  console.log(
    `✓ Current revision status: ${submittedQuotation?.currentRevision?.status}`,
  );
  console.log(`✓ Approvals logged: ${submittedQuotation?.approvals.length}`);
  console.log(
    `  - Latest Approval Action: ${submittedQuotation?.approvals[0]?.action} (Comments: "${submittedQuotation?.approvals[0]?.comments}")`,
  );

  if (
    submittedQuotation?.status !==
    APP_CONSTANTS.QUOTATION_STATUSES.PENDING_APPROVAL
  ) {
    throw new Error(
      `Expected status PENDING_APPROVAL, got ${submittedQuotation?.status}`,
    );
  }

  // ----------------------------------------------------
  // TEST 3: EDIT WHILE PENDING (WITHDRAWAL WORKFLOW)
  // ----------------------------------------------------
  console.log(
    "\n[TEST 3] Editing Quotation while in PENDING_APPROVAL (Verifying Auto-Withdrawal)...",
  );
  const editedQuotation = await quotationService.updateQuotation(
    createdQuotation.id,
    {
      notes: "Updated notes: Client requested special transport arrangement.",
      freightCharges: 2500, // Updated freight
    },
    authUser,
  );

  console.log(
    `✓ Quotation status after editing pending quote: ${editedQuotation?.status}`,
  );
  console.log(
    `✓ Current revision status: ${editedQuotation?.currentRevision?.status}`,
  );
  console.log(
    `✓ Approvals history count: ${editedQuotation?.approvals.length}`,
  );
  console.log(
    `  - Latest Approval Action: ${editedQuotation?.approvals[0]?.action} (Comments: "${editedQuotation?.approvals[0]?.comments}")`,
  );
  console.log(
    `  - Previous Approval Action: ${editedQuotation?.approvals[1]?.action}`,
  );
  console.log(
    `✓ Updated Grand Total: ₹${editedQuotation?.currentRevision?.grandTotal}`,
  );

  if (editedQuotation?.status !== APP_CONSTANTS.QUOTATION_STATUSES.DRAFT) {
    throw new Error(
      `Expected status to revert to DRAFT, got ${editedQuotation?.status}`,
    );
  }
  if (
    editedQuotation?.approvals[0]?.action !==
    APP_CONSTANTS.QUOTATION_APPROVAL_ACTIONS.WITHDRAWN
  ) {
    throw new Error(
      `Expected latest approval to be WITHDRAWN, got ${editedQuotation?.approvals[0]?.action}`,
    );
  }

  // ----------------------------------------------------
  // TEST 4: RE-SUBMIT AND APPROVE
  // ----------------------------------------------------
  console.log(
    "\n[TEST 4] Re-submitting and Approving Quotation (Admin Self-Approval)...",
  );
  await quotationService.submitForApproval(
    createdQuotation.id,
    { comments: "Re-submitting with updated freight" },
    authUser,
  );
  const approvedQuotation = await quotationService.approveQuotation(
    createdQuotation.id,
    { comments: "Approved by Operations Manager" },
    authUser,
  );

  console.log(
    `✓ Quotation status after approval: ${approvedQuotation?.status}`,
  );
  console.log(
    `✓ Current revision status: ${approvedQuotation?.currentRevision?.status}`,
  );
  console.log(
    `✓ Latest Approval Action: ${approvedQuotation?.approvals[0]?.action} (Reviewed by: ${approvedQuotation?.approvals[0]?.reviewedBy?.fullName})`,
  );

  if (approvedQuotation?.status !== APP_CONSTANTS.QUOTATION_STATUSES.APPROVED) {
    throw new Error(
      `Expected status APPROVED, got ${approvedQuotation?.status}`,
    );
  }

  // ----------------------------------------------------
  // TEST 5: CREATE FORMAL REVISION (REV 2)
  // ----------------------------------------------------
  console.log(
    "\n[TEST 5] Creating Formal Revision 2 from Approved Quotation...",
  );
  const rev2Quotation = await quotationService.createFormalRevision(
    createdQuotation.id,
    {
      revisionReason: "Client requested 15% discount on main bushing equipment",
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: 2,
          unitPrice: 45000,
          discountPercent: 15, // 15% discount
          gstRate: 18,
        },
        {
          productName: "On-Site Commissioning & Testing Service",
          itemType: APP_CONSTANTS.QUOTATION_ITEM_TYPES.SERVICE,
          quantity: 1,
          unitPrice: 10000,
          discountAmount: 1000,
          gstRate: 18,
        },
      ],
    },
    authUser,
  );

  console.log(`✓ Quotation after Revision 2 creation:`);
  console.log(
    `  - Master Revision Number: ${rev2Quotation?.currentRevisionNumber}`,
  );
  console.log(`  - Master Status: ${rev2Quotation?.status}`);
  console.log(
    `  - Revision 2 Grand Total: ₹${rev2Quotation?.currentRevision?.grandTotal}`,
  );
  console.log(
    `  - Revision 2 Status: ${rev2Quotation?.currentRevision?.status}`,
  );
  console.log(
    `  - Revision 2 Reason: "${rev2Quotation?.currentRevision?.revisionReason}"`,
  );

  // Verify Revision 1 remains historically preserved
  const rev1 = await quotationRepo.findRevisionByNumber(createdQuotation.id, 1);
  console.log(`\n✓ Checking Historical Revision 1 Integrity:`);
  console.log(`  - Rev 1 Revision Number: ${rev1?.revisionNumber}`);
  console.log(`  - Rev 1 isCurrent: ${rev1?.isCurrent}`);
  console.log(`  - Rev 1 Status: ${rev1?.status} (Preserved as APPROVED)`);
  console.log(`  - Rev 1 Grand Total: ₹${rev1?.grandTotal}`);
  console.log(`  - Rev 1 Items Count: ${rev1?.items.length}`);

  if (rev1?.isCurrent !== false) {
    throw new Error(
      `Expected Rev 1 isCurrent to be false, got ${rev1?.isCurrent}`,
    );
  }
  if (rev1?.status !== APP_CONSTANTS.QUOTATION_STATUSES.APPROVED) {
    throw new Error(
      `Expected Rev 1 status to remain APPROVED, got ${rev1?.status}`,
    );
  }
  if (rev2Quotation?.currentRevisionNumber !== 2) {
    throw new Error(
      `Expected currentRevisionNumber to be 2, got ${rev2Quotation?.currentRevisionNumber}`,
    );
  }

  // ----------------------------------------------------
  // TEST 6: AUDIT TRAIL, LISTING & FILTERS
  // ----------------------------------------------------
  console.log(
    "\n[TEST 6] Verifying Revisions List, Approval History, Activity Logs & Search Filters...",
  );
  const allRevisions = await quotationRepo.findRevisionsList(
    createdQuotation.id,
  );
  console.log(`✓ Total Revisions in DB: ${allRevisions.length}`);
  allRevisions.forEach((r) => {
    console.log(
      `  - Rev ${r.revisionNumber}: status=${r.status}, isCurrent=${r.isCurrent}, grandTotal=₹${r.grandTotal}`,
    );
  });

  const approvalHistory = await quotationRepo.findApprovals(
    createdQuotation.id,
  );
  console.log(`✓ Total Approval Events: ${approvalHistory.length}`);
  approvalHistory.forEach((a, i) => {
    console.log(
      `  ${i + 1}. Action: ${a.action}, RequestedBy: ${a.requestedBy?.fullName}, ReviewedBy: ${a.reviewedBy?.fullName || "N/A"}, Comments: "${a.comments}"`,
    );
  });

  const activityHistory = await quotationRepo.findActivities(
    createdQuotation.id,
  );
  console.log(`✓ Total Activity Logs: ${activityHistory.length}`);
  activityHistory.forEach((act, i) => {
    console.log(`  ${i + 1}. [${act.action}] ${act.title}: ${act.description}`);
  });

  const listResult = await quotationRepo.findAll({
    search: createdQuotation.quotationNumber,
    page: 1,
    limit: 10,
  });
  console.log(
    `✓ Search by Quotation Number "${createdQuotation.quotationNumber}" returned ${listResult.total} record(s).`,
  );

  console.log("\n========================================================");
  console.log("🎉 ALL PHASE 3 QUOTATION WORKFLOW TESTS PASSED CLEANLY! 🎉");
  console.log("========================================================\n");
};

runTest()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Test failed with error:", err);
    await pool.end();
    process.exit(1);
  });
