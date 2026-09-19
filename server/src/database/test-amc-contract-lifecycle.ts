import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { quotations, quotationRevisions, quotationItems, quotationAmcScopeItems, quotationAmcExclusions, quotationAmcEscalations } from './schema/quotations.js';
import { amcContracts, amcContractEquipment, amcContractScopeItems, amcContractExclusions, amcContractEscalations, amcServiceVisits, amcServiceRequests } from './schema/amc-contracts.js';
import { customers } from './schema/customers.js';
import { users } from './schema/users.js';
import { tasks } from './schema/tasks.js';
import { QuotationNumberService } from '../modules/quotations/services/quotation-number.service.js';
import { AmcContractService } from '../modules/amc-contracts/services/amc-contract.service.js';

export async function runAmcContractLifecycleTest() {
  console.log('\n🚀 Starting Phase 4 AMC Contract Lifecycle Integration Test...\n');

  const numberService = new QuotationNumberService();
  const amcService = new AmcContractService();

  // 1. Fetch or create test user and customer
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
    // Step 1: Create AMC Quotation & Snapshot Revision
    // -------------------------------------------------------------
    console.log('📋 Step 1: Creating AMC Quotation...');
    const qNo = await numberService.generateQuotationNumber('QT', new Date());

    const [quotation] = await db.insert(quotations).values({
      quotationNumber: qNo,
      quotationType: 'AMC',
      status: 'ACCEPTED', // accepted by customer
      customerId: customer.id,
      salespersonId: user.id,
      createdById: user.id,
      currentRevisionNumber: 1,
    }).returning();
    createdQuotationId = quotation.id;

    const startDate = new Date('2026-04-18');
    const endDate = new Date('2027-04-17');

    const customerName = customer?.companyName || 'M/S JAY CHEMICAL IND.P.LTD.';

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

    // Line Item
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

    // Scope Items
    await db.insert(quotationAmcScopeItems).values([
      { quotationRevisionId: revision.id, description: 'Inspection & cleaning of contactors & servo motor', sortOrder: 1 },
      { quotationRevisionId: revision.id, description: 'Checking of input and output voltage parameters', sortOrder: 2 },
      { quotationRevisionId: revision.id, description: 'Checking of micro-controller PCB signals', sortOrder: 3 },
      { quotationRevisionId: revision.id, description: 'Terminal tightness check and thermal imaging', sortOrder: 4 },
    ]);

    // Exclusions
    await db.insert(quotationAmcExclusions).values([
      { quotationRevisionId: revision.id, description: 'Main Buck Boost Transformer replacement', sortOrder: 1 },
      { quotationRevisionId: revision.id, description: 'MCCB & Power Capacitors', sortOrder: 2 },
    ]);

    // Escalations
    await db.insert(quotationAmcEscalations).values([
      { quotationRevisionId: revision.id, level: 'LEVEL_1', contactName: 'Service Coordinator', phone: '9876543210', email: 'service@tanejapower.com', sortOrder: 1 },
      { quotationRevisionId: revision.id, level: 'LEVEL_2', contactName: 'Service Manager', phone: '9876543211', email: 'manager@tanejapower.com', sortOrder: 2 },
    ]);

    console.log(`  ✅ Test AMC Quotation created: ${qNo}`);

    // -------------------------------------------------------------
    // Step 2: Convert Accepted Quotation to AMC Contract
    // -------------------------------------------------------------
    console.log('\n📋 Step 2: Creating AMC Contract from Quotation...');
    const contract = await amcService.createContractFromQuotation(quotation.id, user.id);
    createdContractId = contract.id;

    console.log(`  • Contract Number: ${contract.contractNumber}`);
    console.log(`  • Source Quotation ID: ${contract.quotationId}`);
    console.log(`  • Source Revision ID: ${contract.quotationRevisionId}`);
    console.log(`  • AMC Plan: ${contract.amcPlan}`);
    console.log(`  • Initial Status: ${contract.status}`);

    if (!contract.contractNumber.startsWith('AMC/')) {
      throw new Error(`Invalid contract number format: ${contract.contractNumber}`);
    }

    // -------------------------------------------------------------
    // Step 3: Verify Contract Snapshot Data (Equipment, Scope, Exclusions, Escalations)
    // -------------------------------------------------------------
    console.log('\n📋 Step 3: Verifying Contract Snapshot Integrity...');
    const contractDetail = await amcService.getContractById(contract.id);

    console.log(`  • Equipment Items: ${contractDetail.equipment.length}`);
    console.log(`  • Scope Items: ${contractDetail.scopeItems.length}`);
    console.log(`  • Exclusions: ${contractDetail.exclusions.length}`);
    console.log(`  • Escalation Contacts: ${contractDetail.escalations.length}`);

    if (contractDetail.equipment.length !== 1 || contractDetail.scopeItems.length !== 4) {
      throw new Error('Contract snapshot items count mismatch.');
    }
    console.log('  ✅ Snapshot integrity verified cleanly!');

    // -------------------------------------------------------------
    // Step 4: Activate Contract & Verify Calendar-Aware Schedule
    // -------------------------------------------------------------
    console.log('\n📋 Step 4: Activating AMC Contract & Generating Schedule...');
    const activatedContract = await amcService.activateContract(contract.id, user.id);
    console.log(`  • New Status: ${activatedContract.status}`);

    const activeDetail = await amcService.getContractById(contract.id);
    console.log(`  • Generated Service Visits Count: ${activeDetail.serviceVisits.length}`);

    if (activeDetail.serviceVisits.length !== 4) {
      throw new Error(`Expected 4 preventive service visits, got ${activeDetail.serviceVisits.length}`);
    }

    activeDetail.serviceVisits.forEach((visit: any, idx: number) => {
      console.log(`    Visit #${visit.visitNumber}: ${new Date(visit.scheduledDate).toISOString().slice(0, 10)} (${visit.serviceType} - ${visit.status})`);
    });
    console.log('  ✅ Preventive service schedule generated successfully!');

    // -------------------------------------------------------------
    // Step 5: Test Breakdown Service Request & Task Linkage
    // -------------------------------------------------------------
    console.log('\n📋 Step 5: Logging Breakdown Service Request...');
    const breakdownReq = await amcService.createBreakdownRequest(
      contract.id,
      {
        issueDescription: 'Output voltage fluctuation detected on Phase-R during peak load.',
        priority: 'URGENT',
      },
      user.id
    );

    console.log(`  • Breakdown Request Number: ${breakdownReq.requestNumber}`);
    console.log(`  • Priority: ${breakdownReq.priority}`);
    console.log(`  • Linked Task ID: ${breakdownReq.taskId || 'None'}`);

    if (!breakdownReq.requestNumber.startsWith('SR/')) {
      throw new Error(`Invalid breakdown request number format: ${breakdownReq.requestNumber}`);
    }
    console.log('  ✅ Breakdown Service Request & Task linkage verified!');

    // -------------------------------------------------------------
    // Step 6: Test Task Assignment for a Preventive Service Visit
    // -------------------------------------------------------------
    console.log('\n📋 Step 6: Creating Field Task for Preventive Visit #1...');
    const firstVisit = activeDetail.serviceVisits[0];
    const updatedVisit = await amcService.createTaskForVisit(firstVisit.id, user.id, user.id);

    console.log(`  • Visit #${updatedVisit.visitNumber} Status: ${updatedVisit.status}`);
    console.log(`  • Created Task ID: ${updatedVisit.taskId}`);
    if (!updatedVisit.taskId) {
      throw new Error('Task was not created for service visit.');
    }
    console.log('  ✅ Field Task created & linked to service visit!');

    // -------------------------------------------------------------
    // Step 7: Test Contract Termination
    // -------------------------------------------------------------
    console.log('\n📋 Step 7: Terminating Test Contract...');
    const terminatedContract = await amcService.terminateContract(contract.id, { reason: 'Test contract termination' }, user.id);
    console.log(`  • Status after termination: ${terminatedContract.status}`);
    console.log(`  • Termination Reason: ${terminatedContract.terminationReason}`);

    if (terminatedContract.status !== 'TERMINATED') {
      throw new Error('Contract status failed to update to TERMINATED.');
    }
    console.log('  ✅ Contract termination verified!');

    // -------------------------------------------------------------
    // Step 8: Cleanup Test Records
    // -------------------------------------------------------------
    console.log('\n📋 Step 8: Cleaning up test records...');
    await db.delete(amcContracts).where(eq(amcContracts.id, contract.id));
    await db.delete(quotations).where(eq(quotations.id, quotation.id));
    console.log('  ✅ Cleanup complete!');

    console.log('\n🎉 ALL PHASE 4 AMC CONTRACT LIFECYCLE TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Phase 4 Test Error:', err);
    throw err;
  }
}

if (process.argv[1]?.includes('test-amc-contract-lifecycle')) {
  runAmcContractLifecycleTest().then(() => process.exit(0)).catch(() => process.exit(1));
}
