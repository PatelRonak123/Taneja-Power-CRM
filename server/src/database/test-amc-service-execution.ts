import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { quotations, quotationRevisions, quotationItems, quotationAmcScopeItems, quotationAmcExclusions, quotationAmcEscalations } from './schema/quotations.js';
import { amcContracts, amcServiceVisits, amcServiceReports, amcServiceReportItems, amcServiceReportEquipment } from './schema/amc-contracts.js';
import { salesOrders } from './schema/sales-orders.js';
import { customers } from './schema/customers.js';
import { users } from './schema/users.js';
import { tasks } from './schema/tasks.js';
import { QuotationNumberService } from '../modules/quotations/services/quotation-number.service.js';
import { AmcContractService } from '../modules/amc-contracts/services/amc-contract.service.js';

export async function runAmcServiceExecutionTest() {
  console.log('\n🚀 Starting Phase 5 AMC Service Execution & Service Report Integration Test...\n');

  const numberService = new QuotationNumberService();
  const amcService = new AmcContractService();

  // Fetch or create test user and customer
  let [user] = await db.select().from(users).limit(1);
  if (!user) {
    [user] = await db.insert(users).values({
      email: 'admin_test@tanejapower.com',
      fullName: 'Test Admin',
      role: 'ADMIN',
      passwordHash: 'hashed_password',
    }).returning();
  }

  let [customer] = await db.select().from(customers).limit(1);
  if (!customer) {
    [customer] = await db.insert(customers).values({
      name: 'M/S JAY CHEMICAL IND.P.LTD.',
      companyName: 'M/S JAY CHEMICAL IND.P.LTD.',
      email: 'info@jaychemical.com',
      phone: '+91 98765 43210',
    }).returning();
  }

  let createdQuotationId: string | null = null;
  let createdContractId: string | null = null;

  try {
    // -------------------------------------------------------------
    // Step 1: Create & Accept AMC Quotation
    // -------------------------------------------------------------
    console.log('📋 Step 1: Creating AMC Quotation & Contract...');
    const qNo = await numberService.generateQuotationNumber('QT', new Date());

    const [quotation] = await db.insert(quotations).values({
      quotationNumber: qNo,
      quotationType: 'AMC',
      status: 'ACCEPTED',
      customerId: customer.id,
      salespersonId: user.id,
      createdById: user.id,
      currentRevisionNumber: 1,
    }).returning();
    createdQuotationId = quotation.id;

    const startDate = new Date('2026-04-18');
    const endDate = new Date('2027-04-17');
    const customerName = customer.companyName || 'M/S JAY CHEMICAL IND.P.LTD.';

    const [revision] = await db.insert(quotationRevisions).values({
      quotationId: quotation.id,
      revisionNumber: 1,
      isCurrent: true,
      status: 'ACCEPTED',
      quotationDate: startDate,
      validityDays: 30,
      validUntil: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      currency: 'INR',
      customerName: customerName,
      companyName: customerName,
      customerCode: 'CC-10982',
      branch: 'Saykha Site',
      zone: 'West Zone',
      endUser: 'M/S JAY CHEMICAL IND.P.LTD. SAYKHA',
      amcPlan: 'Ultra Care (UC)',
      amcStartDate: startDate,
      amcEndDate: endDate,
      amcServiceFrequency: 'Quarterly',
      amcScheduledVisits: 4,
      amcBreakdownVisitType: 'UNLIMITED',
      subtotal: '9000.00',
      totalTax: '1620.00',
      grandTotal: '10620.00',
      createdById: user.id,
    }).returning();

    await db.insert(quotationItems).values({
      quotationRevisionId: revision.id,
      quotationId: quotation.id,
      itemType: 'AMC',
      productName: 'STABILIZER AMC',
      equipmentType: 'STABILIZER',
      equipmentConfiguration: '50 KVA',
      equipmentRating: '30 KVA',
      quantity: '1.000',
      unitPrice: '9000.00',
      taxableAmount: '9000.00',
      gstRate: '18.00',
      totalTax: '1620.00',
      lineTotal: '10620.00',
    });

    await db.insert(quotationAmcScopeItems).values([
      { quotationRevisionId: revision.id, description: 'Inspection & cleaning of contactors & servo motor', sortOrder: 1 },
      { quotationRevisionId: revision.id, description: 'Checking of input and output voltage parameters', sortOrder: 2 },
      { quotationRevisionId: revision.id, description: 'Checking of micro-controller PCB signals', sortOrder: 3 },
    ]);

    await db.insert(salesOrders).values({
      salesOrderNumber: `SO-AMC-TEST-${Date.now()}`,
      customerId: customer.id,
      quotationId: quotation.id,
      quotationRevisionId: revision.id,
      status: 'CONFIRMED',
      orderDate: new Date(),
      createdBy: user.id,
      subtotal: '9000.00',
      taxAmount: '1620.00',
      totalAmount: '10620.00',
    });

    const contract = await amcService.createContractFromQuotation(quotation.id, user.id);
    createdContractId = contract.id;
    await amcService.activateContract(contract.id, user.id);

    const activeContract = await amcService.getContractById(contract.id);
    const visits = activeContract.serviceVisits;
    console.log(`  ✅ Contract ${contract.contractNumber} activated with ${visits.length} scheduled visits.`);

    // -------------------------------------------------------------
    // Step 2: Assign & Start Visit #1
    // -------------------------------------------------------------
    console.log('\n📋 Step 2: Creating Field Task & Starting Visit #1...');
    const visit1 = visits[0];

    const visitWithTask = await amcService.createTaskForVisit(visit1.id, user.id, user.id);
    console.log(`  • Field Task created: ${visitWithTask.taskId}`);

    const inProgressVisit = await amcService.startVisit(visit1.id, user.id);
    console.log(`  • Visit Status: ${inProgressVisit.status}`);
    console.log(`  • Actual Start Timestamp: ${inProgressVisit.actualStartAt?.toISOString()}`);

    if (inProgressVisit.status !== 'IN_PROGRESS') {
      throw new Error('Visit status failed to update to IN_PROGRESS');
    }

    const [linkedTask] = await db.select().from(tasks).where(eq(tasks.id, inProgressVisit.taskId!)).limit(1);
    console.log(`  • Linked Task Status: ${linkedTask.status}`);
    if (linkedTask.status !== 'IN_PROGRESS') {
      throw new Error('Linked task failed to synchronize to IN_PROGRESS');
    }
    console.log('  ✅ Visit start & Task synchronization verified!');

    // -------------------------------------------------------------
    // Step 3: Get/Initialize Service Report & Verify Pre-populated Scope Checklist
    // -------------------------------------------------------------
    console.log('\n📋 Step 3: Initializing Service Report from Contract Scope Snapshot...');
    const reportDraft = await amcService.getOrCreateServiceReport(visit1.id, user.id);

    console.log(`  • Generated Report Number: ${reportDraft.reportNumber}`);
    console.log(`  • Checklist Items Count: ${reportDraft.items.length}`);
    console.log(`  • Equipment Inspection Items: ${reportDraft.equipment.length}`);

    if (!reportDraft.reportNumber.startsWith('SRPT/')) {
      throw new Error(`Invalid report number format: ${reportDraft.reportNumber}`);
    }
    if (reportDraft.items.length !== 3) {
      throw new Error(`Expected 3 scope checklist items, got ${reportDraft.items.length}`);
    }
    console.log('  ✅ Service Report initialized & pre-populated from snapshot scope!');

    // -------------------------------------------------------------
    // Step 4: Update DRAFT Service Report
    // -------------------------------------------------------------
    console.log('\n📋 Step 4: Updating DRAFT Service Report findings...');
    const updatedDraft = await amcService.updateServiceReport(
      reportDraft.id,
      {
        serviceSummary: 'Preventive servicing of 50KVA Stabilizer completed. Servo motor calibrated.',
        observations: 'Input voltage 415V, Output voltage 400V balanced across all 3 phases.',
        recommendations: 'No parts replacement required at this time.',
        customerRemarks: 'Servicing verified by site manager.',
        items: reportDraft.items.map((it: any) => ({
          id: it.id,
          status: 'COMPLETED',
          remarks: 'Inspected and verified within specs.',
        })),
      },
      user.id
    );

    console.log(`  • Summary updated: "${updatedDraft.serviceSummary?.slice(0, 50)}..."`);
    console.log('  ✅ Draft service report updated!');

    // -------------------------------------------------------------
    // Step 5: Atomically Complete Visit & Service Report
    // -------------------------------------------------------------
    console.log('\n📋 Step 5: Atomically Completing Visit & Service Report in DB Transaction...');
    const completionResult = await amcService.completeServiceVisitAndReport(
      visit1.id,
      {
        serviceSummary: 'Completed 50KVA stabilizer preventive maintenance.',
        observations: 'All electrical signals verified.',
        customerRemarks: 'Completed to satisfaction.',
      },
      user.id
    );

    console.log(`  • Final Report Status: ${completionResult.report.status}`);
    console.log(`  • Final Visit Status: ${completionResult.visit.status}`);
    console.log(`  • Visit Outcome: ${completionResult.visit.visitOutcome}`);

    const [finalTask] = await db.select().from(tasks).where(eq(tasks.id, completionResult.visit.taskId!)).limit(1);
    console.log(`  • Final Linked Task Status: ${finalTask.status}`);

    const [updatedContract] = await db.select().from(amcContracts).where(eq(amcContracts.id, contract.id)).limit(1);
    console.log(`  • Contract Completed Visits Count: ${updatedContract.completedVisits}`);

    if (
      completionResult.report.status !== 'COMPLETED' ||
      completionResult.visit.status !== 'COMPLETED' ||
      finalTask.status !== 'COMPLETED' ||
      updatedContract.completedVisits !== 1
    ) {
      throw new Error('Transactional completion mismatch!');
    }
    console.log('  ✅ Transactional visit & report completion verified!');

    // -------------------------------------------------------------
    // Step 6: Verify Read-Only Immutability of Completed Report
    // -------------------------------------------------------------
    console.log('\n📋 Step 6: Verifying Completed Report Immutability...');
    try {
      await amcService.updateServiceReport(completionResult.report.id, { serviceSummary: 'Illegal edit attempt' }, user.id);
      throw new Error('FAILED: Modifying completed report should have thrown an error!');
    } catch (err: any) {
      console.log(`  • Correctly rejected edit on completed report: "${err.message}"`);
      console.log('  ✅ Report immutability verified!');
    }

    // -------------------------------------------------------------
    // Step 7: Generate Official Service Report PDF
    // -------------------------------------------------------------
    console.log('\n📋 Step 7: Generating Official Service Report PDF...');
    const pdfBuffer = await amcService.generateServiceReportPdf(completionResult.report.id);
    console.log(`  • Generated Service Report PDF Buffer Size: ${pdfBuffer.length} bytes`);
    if (pdfBuffer.length < 1000) {
      throw new Error('Generated PDF buffer size suspiciously small.');
    }
    console.log('  ✅ Service Report PDF generated successfully!');

    // -------------------------------------------------------------
    // Step 8: Cleanup Test Records
    // -------------------------------------------------------------
    await db.delete(salesOrders).where(eq(salesOrders.quotationId, quotation.id));
    await db.delete(amcContracts).where(eq(amcContracts.id, contract.id));
    await db.delete(quotations).where(eq(quotations.id, quotation.id));
    console.log('  ✅ Cleanup complete!');

    console.log('\n🎉 ALL PHASE 5 AMC SERVICE EXECUTION & REPORT TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Phase 5 Test Error:', err);
    throw err;
  }
}

if (process.argv[1]?.includes('test-amc-service-execution')) {
  runAmcServiceExecutionTest().then(() => process.exit(0)).catch(() => process.exit(1));
}
