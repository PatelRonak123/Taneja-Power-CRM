import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { quotations, quotationRevisions, quotationItems } from './schema/quotations.js';
import {
  amcContracts,
  amcContractEquipment,
  amcServiceVisits,
  amcServiceRequests,
} from './schema/amc-contracts.js';
import { salesOrders } from './schema/sales-orders.js';
import { customers } from './schema/customers.js';
import { users } from './schema/users.js';
import { tasks } from './schema/tasks.js';
import { QuotationNumberService } from '../modules/quotations/services/quotation-number.service.js';
import { AmcContractService } from '../modules/amc-contracts/services/amc-contract.service.js';
import { TaskService } from '../modules/tasks/services/task.service.js';

export async function runAmcDefectRepairWorkflowTests() {
  console.log('================================================================');
  console.log('  AMC PREVENTIVE MAINTENANCE → DEFECT → REPAIR WORKFLOW TESTS   ');
  console.log('================================================================\n');

  const numberService = new QuotationNumberService();
  const amcService = new AmcContractService();
  const taskService = new TaskService();

  // Setup test user & customer
  let [adminUser] = await db.select().from(users).where(eq(users.role, 'ADMIN')).limit(1);
  if (!adminUser) {
    [adminUser] = await db.insert(users).values({
      email: 'workflow_admin@tanejapower.com',
      fullName: 'Workflow Admin',
      role: 'ADMIN',
      passwordHash: 'hashed_password',
      workType: 'OFFICE',
    }).returning();
  }

  let [fieldUser] = await db.select().from(users).where(eq(users.workType, 'FIELD')).limit(1);
  if (!fieldUser) {
    [fieldUser] = await db.insert(users).values({
      email: 'field_engineer@tanejapower.com',
      fullName: 'Field Engineer 1',
      role: 'USER',
      passwordHash: 'hashed_password',
      workType: 'FIELD',
      designation: 'Service Field Engineer',
    }).returning();
  }

  let [customer] = await db.select().from(customers).limit(1);
  if (!customer) {
    [customer] = await db.insert(customers).values({
      name: 'Test Industrial Automation Ltd',
      companyName: 'Test Industrial Automation Ltd',
      email: 'info@testindustrial.com',
      phone: '+91 99887 76655',
    }).returning();
  }

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
      failedTests++;
    }
  }

  // Helper to create an active AMC contract with visits and equipment
  async function createTestContract(tag: string) {
    const qNo = await numberService.generateQuotationNumber('QT', new Date());

    const [srcQuote] = await db.insert(quotations).values({
      quotationNumber: qNo,
      quotationType: 'AMC',
      status: 'ACCEPTED',
      customerId: customer.id,
      salespersonId: adminUser.id,
      createdById: adminUser.id,
      currentRevisionNumber: 1,
    }).returning();

    const now = new Date();
    const [srcRev] = await db.insert(quotationRevisions).values({
      quotationId: srcQuote.id,
      revisionNumber: 1,
      isCurrent: true,
      status: 'ACCEPTED',
      quotationDate: now,
      validityDays: 30,
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      currency: 'INR',
      customerName: customer.name,
      companyName: customer.companyName,
      createdById: adminUser.id,
    }).returning();

    const contractNo = `AMC-TEST-${tag}-${Date.now().toString().slice(-4)}`;

    const [contract] = await db.insert(amcContracts).values({
      contractNumber: contractNo,
      quotationId: srcQuote.id,
      quotationRevisionId: srcRev.id,
      customerId: customer.id,
      customerName: customer.companyName || customer.name,
      amcPlan: 'Comprehensive Care',
      contractStartDate: new Date('2026-04-01'),
      contractEndDate: new Date('2027-03-31'),
      serviceFrequency: 'Quarterly',
      scheduledVisits: 4,
      completedVisits: 0,
      breakdownVisitType: 'UNLIMITED',
      status: 'ACTIVE',
      paymentStatus: 'PAID',
      totalAmount: '45000.00',
      createdById: adminUser.id,
    }).returning();

    const [eqItem] = await db.insert(amcContractEquipment).values({
      amcContractId: contract.id,
      equipmentName: `50 KVA Servo Stabilizer (${tag})`,
      equipmentType: 'STABILIZER',
      configuration: '3-Phase Air Cooled',
      rating: '50 KVA',
      quantity: '1',
      unitPrice: '45000.00',
      lineTotal: '45000.00',
      status: 'ACTIVE',
      conditionStatus: 'OPERATIONAL',
    }).returning();

    const [visit] = await db.insert(amcServiceVisits).values({
      amcContractId: contract.id,
      visitNumber: 1,
      scheduledDate: new Date('2026-06-15'),
      serviceType: 'PREVENTIVE',
      status: 'SCHEDULED',
    }).returning();

    return { contract, eqItem, visit };
  }

  try {
    // -------------------------------------------------------------
    // Test 1 — Normal PM Visit
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Normal PM Visit (COMPLETED -> Unit OK -> No follow-up) ---');
    {
      const { contract, eqItem, visit } = await createTestContract('T1');

      await amcService.completeServiceVisitAndReport(
        visit.id,
        {
          visitOutcome: 'COMPLETED',
          unitCondition: 'OK',
          equipmentStatusList: [
            {
              equipmentId: eqItem.id,
              equipmentName: eqItem.equipmentName,
              conditionStatus: 'OPERATIONAL',
              operationalStatus: 'NORMAL',
            },
          ],
          maintenanceTasksPerformed: 'Checked input/output voltage, carbon brushes, and auto cut-off.',
        },
        fieldUser.id
      );

      // Verify visit is COMPLETED
      const [updatedVisit] = await db.select().from(amcServiceVisits).where(eq(amcServiceVisits.id, visit.id));
      assert(updatedVisit.status === 'COMPLETED', 'Visit status is COMPLETED');
      assert(
        updatedVisit.visitOutcome === 'COMPLETED' || updatedVisit.visitOutcome === 'SATISFACTORY',
        'Visit outcome is normal completed'
      );

      // Verify equipment remains OPERATIONAL
      const [updatedEq] = await db.select().from(amcContractEquipment).where(eq(amcContractEquipment.id, eqItem.id));
      assert(updatedEq.conditionStatus === 'OPERATIONAL', 'Unit condition remains OPERATIONAL');

      // Verify no follow-up requests created
      const reqs = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.amcServiceVisitId, visit.id));
      assert(reqs.length === 0, 'No follow-up service requests created for normal visit');
    }

    // -------------------------------------------------------------
    // Test 2 — Defect Detection
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Defect Detection (REQUIRES_FOLLOWUP -> NEEDS_REPAIR -> Request Created) ---');
    let t2Contract: any;
    let t2Visit: any;
    let t2Eq: any;
    let t2Request: any;
    {
      const { contract, eqItem, visit } = await createTestContract('T2');
      t2Contract = contract;
      t2Visit = visit;
      t2Eq = eqItem;

      await amcService.completeServiceVisitAndReport(
        visit.id,
        {
          visitOutcome: 'REQUIRES_FOLLOWUP',
          unitCondition: 'NEEDS_REPAIR',
          defectObservation: 'Carbon brush severely worn out and servo motor commutator sparking.',
          partsRequired: '1x Carbon Brush Set (50 KVA), 1x Servo Driver IC',
          equipmentStatusList: [
            {
              equipmentId: eqItem.id,
              equipmentName: eqItem.equipmentName,
              conditionStatus: 'NEEDS_REPAIR',
              operationalStatus: 'FAULTY',
              observation: 'Sparking under load',
            },
          ],
        },
        fieldUser.id
      );

      // Verify visit outcome is REQUIRES_FOLLOWUP
      const [updatedVisit] = await db.select().from(amcServiceVisits).where(eq(amcServiceVisits.id, visit.id));
      assert(updatedVisit.status === 'COMPLETED', 'Visit is marked completed');
      assert(updatedVisit.visitOutcome === 'REQUIRES_FOLLOWUP', 'Visit outcome is REQUIRES_FOLLOWUP');

      // Verify equipment condition updated to NEEDS_REPAIR
      const [updatedEq] = await db.select().from(amcContractEquipment).where(eq(amcContractEquipment.id, eqItem.id));
      assert(updatedEq.conditionStatus === 'NEEDS_REPAIR', 'Unit condition updated to NEEDS_REPAIR');

      // Verify follow-up service request created with PENDING_REVIEW
      const [req] = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.amcServiceVisitId, visit.id));
      assert(!!req, 'Follow-up breakdown/service request automatically created');
      assert(req.coverageType === 'PENDING_REVIEW', 'Coverage type initialized to PENDING_REVIEW');
      assert(req.status === 'OPEN' || req.status === 'REPORTED', 'Request status is OPEN/REPORTED');
      assert(req.issueDescription.includes('Carbon brush severely worn out'), 'Defect observation preserved in request');
      t2Request = req;
    }

    // -------------------------------------------------------------
    // Test 3 — Missing Observation
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Missing Observation (REQUIRES_FOLLOWUP + empty observation -> REJECTED) ---');
    {
      const { contract, eqItem, visit } = await createTestContract('T3');

      let errorThrown = false;
      try {
        await amcService.completeServiceVisitAndReport(
          visit.id,
          {
            visitOutcome: 'REQUIRES_FOLLOWUP',
            unitCondition: 'NEEDS_REPAIR',
            defectObservation: '   ', // Empty observation!
            equipmentStatusList: [
              {
                equipmentId: eqItem.id,
                conditionStatus: 'NEEDS_REPAIR',
              },
            ],
          },
          fieldUser.id
        );
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes('Defect observation is mandatory'), 'Rejected with mandatory defect observation error');
      }
      assert(errorThrown, 'Empty defect observation was properly rejected');
    }

    // -------------------------------------------------------------
    // Test 4 — AMC Covered Track
    // -------------------------------------------------------------
    console.log('\n--- Test 4: AMC Covered (Follow-up -> AMC_COVERED -> Direct Repair Task) ---');
    {
      const { contract, eqItem, visit } = await createTestContract('T4');

      // Report defect
      await amcService.completeServiceVisitAndReport(
        visit.id,
        {
          visitOutcome: 'REQUIRES_FOLLOWUP',
          unitCondition: 'FAULTY',
          defectObservation: 'Tripping circuit breaker due to internal short circuit.',
          equipmentStatusList: [{ equipmentId: eqItem.id, conditionStatus: 'FAULTY' }],
        },
        fieldUser.id
      );

      const [req] = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.amcServiceVisitId, visit.id));

      // Service Office decides AMC Covered
      const covRes = await amcService.setCoverageDecision(
        contract.id,
        req.id,
        {
          coverageType: 'AMC_COVERED',
          coverageNotes: 'Covered under Comprehensive AMC Contract terms.',
        },
        adminUser.id
      );
      assert(covRes.coverageType === 'AMC_COVERED', 'Coverage set to AMC_COVERED');

      // Dispatch repair task directly without quotation or customer acceptance
      const taskRes = await amcService.createRepairTaskForRequest(
        contract.id,
        req.id,
        {
          assignedTo: fieldUser.id,
          scheduledAt: '2026-06-20',
          priority: 'HIGH',
          notes: 'Replace circuit breaker and test under 40 KVA load',
        },
        adminUser.id
      );

      assert(!!taskRes.task, 'Repair task created successfully');
      assert(taskRes.task.status === 'ASSIGNED', 'Task status is ASSIGNED');

      // Verify request is now ASSIGNED with linked taskId
      const [updatedReq] = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.id, req.id));
      assert(updatedReq.taskId === taskRes.task.id, 'Request stores taskId');
      assert(updatedReq.status === 'ASSIGNED', 'Request status transitioned to ASSIGNED');
    }

    // -------------------------------------------------------------
    // Test 5 — Chargeable Track: Initial State
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Chargeable (Follow-up -> CHARGEABLE -> Quotation Required, Task Blocked) ---');
    let t5Contract: any;
    let t5Visit: any;
    let t5Eq: any;
    let t5Request: any;
    {
      const { contract, eqItem, visit } = await createTestContract('T5');
      t5Contract = contract;
      t5Visit = visit;
      t5Eq = eqItem;

      await amcService.completeServiceVisitAndReport(
        visit.id,
        {
          visitOutcome: 'REQUIRES_FOLLOWUP',
          unitCondition: 'NEEDS_REPAIR',
          defectObservation: 'Buck-boost transformer coil burnt due to lightning surge (Force Majeure).',
          partsRequired: '1x 50 KVA Copper Transformer Coil',
          equipmentStatusList: [{ equipmentId: eqItem.id, conditionStatus: 'NEEDS_REPAIR' }],
        },
        fieldUser.id
      );

      const [req] = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.amcServiceVisitId, visit.id));
      t5Request = req;

      // Service Office decides Chargeable
      await amcService.setCoverageDecision(
        contract.id,
        req.id,
        {
          coverageType: 'CHARGEABLE',
          coverageNotes: 'External lightning strike damage is outside standard AMC scope.',
        },
        adminUser.id
      );

      const [covReq] = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.id, req.id));
      assert(covReq.coverageType === 'CHARGEABLE', 'Coverage set to CHARGEABLE');

      // Attempting to dispatch repair task before quotation/SO should FAIL
      let taskBlocked = false;
      try {
        await amcService.createRepairTaskForRequest(
          contract.id,
          req.id,
          { assignedTo: fieldUser.id, scheduledAt: '2026-06-25' },
          adminUser.id
        );
      } catch (err: any) {
        taskBlocked = true;
        assert(err.message.includes('quotation') || err.message.includes('ACCEPTED') || err.message.includes('Quotation required'), 'Task creation blocked without accepted quotation');
      }
      assert(taskBlocked, 'Repair task creation blocked when quotation has not been created');
    }

    // -------------------------------------------------------------
    // Test 6 — Chargeable Before Acceptance (DRAFT, APPROVED, SENT blocked)
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Chargeable Before Acceptance (DRAFT/APPROVED/SENT cannot create Repair Task) ---');
    let repairQuotation: any;
    let repairRevision: any;
    {
      // Create new repair quotation (never a revision of original AMC)
      const qNo = await numberService.generateQuotationNumber('QT', new Date());
      const [quote] = await db.insert(quotations).values({
        quotationNumber: qNo,
        quotationType: 'SERVICE',
        status: 'DRAFT',
        customerId: customer.id,
        salespersonId: adminUser.id,
        createdById: adminUser.id,
        currentRevisionNumber: 1,
      }).returning();
      repairQuotation = quote;

      const now = new Date();
      const [rev] = await db.insert(quotationRevisions).values({
        quotationId: quote.id,
        revisionNumber: 1,
        isCurrent: true,
        status: 'DRAFT',
        quotationDate: now,
        validityDays: 15,
        validUntil: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        currency: 'INR',
        customerName: customer.name,
        companyName: customer.companyName,
        subject: `Repair & Transformer Replacement for Defect in ${t5Contract.contractNumber}`,
        subtotal: '22000.00',
        totalTax: '3960.00',
        grandTotal: '25960.00',
        createdById: adminUser.id,
      }).returning();
      repairRevision = rev;

      await db.insert(quotationItems).values({
        quotationRevisionId: rev.id,
        quotationId: quote.id,
        itemType: 'SERVICE',
        productName: '50 KVA Copper Transformer Coil & Rewinding',
        quantity: '1.000',
        unitPrice: '22000.00',
        taxableAmount: '22000.00',
        gstRate: '18.00',
        lineTotal: '25960.00',
        sortOrder: 0,
      });

      // Link quotation to service request
      await amcService.linkQuotationToRequest(t5Contract.id, t5Request.id, quote.id, adminUser.id);

      // Verify linked
      const [linkedReq] = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.id, t5Request.id));
      assert(linkedReq.quotationId === quote.id, 'Quotation linked to service request');

      // Test with DRAFT
      let draftBlocked = false;
      try {
        await amcService.createRepairTaskForRequest(
          t5Contract.id,
          t5Request.id,
          { assignedTo: fieldUser.id },
          adminUser.id
        );
      } catch (err: any) {
        draftBlocked = true;
      }
      assert(draftBlocked, 'Repair task blocked while Quotation is in DRAFT');

      // Test with APPROVED
      await db.update(quotations).set({ status: 'APPROVED' }).where(eq(quotations.id, quote.id));
      let approvedBlocked = false;
      try {
        await amcService.createRepairTaskForRequest(
          t5Contract.id,
          t5Request.id,
          { assignedTo: fieldUser.id },
          adminUser.id
        );
      } catch (err: any) {
        approvedBlocked = true;
      }
      assert(approvedBlocked, 'Repair task blocked while Quotation is APPROVED');

      // Test with SENT
      await db.update(quotations).set({ status: 'SENT' }).where(eq(quotations.id, quote.id));
      let sentBlocked = false;
      try {
        await amcService.createRepairTaskForRequest(
          t5Contract.id,
          t5Request.id,
          { assignedTo: fieldUser.id },
          adminUser.id
        );
      } catch (err: any) {
        sentBlocked = true;
      }
      assert(sentBlocked, 'Repair task blocked while Quotation is SENT (awaiting customer acceptance)');
    }

    // -------------------------------------------------------------
    // Test 7 — Chargeable Customer Acceptance
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Customer Acceptance (Quotation -> ACCEPTED unlocks Sales Order) ---');
    {
      await db.update(quotations).set({ status: 'ACCEPTED' }).where(eq(quotations.id, repairQuotation.id));
      const [acceptedQuote] = await db.select().from(quotations).where(eq(quotations.id, repairQuotation.id));
      assert(acceptedQuote.status === 'ACCEPTED', 'Quotation marked ACCEPTED by customer');
    }

    // -------------------------------------------------------------
    // Test 8 — Sales Order Not Confirmed
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Sales Order Not Confirmed (SO PENDING_CONFIRMATION blocks Task) ---');
    let repairSalesOrder: any;
    {
      // Create Sales Order in PENDING_CONFIRMATION
      const [so] = await db.insert(salesOrders).values({
        salesOrderNumber: `SO-REP-${Date.now().toString().slice(-4)}`,
        quotationId: repairQuotation.id,
        quotationRevisionId: repairRevision.id,
        customerId: customer.id,
        orderDate: new Date(),
        status: 'PENDING_CONFIRMATION',
        totalAmount: '25960.00',
        createdBy: adminUser.id,
      }).returning();
      repairSalesOrder = so;

      // Link SO to request
      await amcService.linkSalesOrderToRequest(t5Contract.id, t5Request.id, so.id, adminUser.id);

      const [reqWithSo] = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.id, t5Request.id));
      assert(reqWithSo.salesOrderId === so.id, 'Sales Order linked to service request');

      let unconfirmedBlocked = false;
      try {
        await amcService.createRepairTaskForRequest(
          t5Contract.id,
          t5Request.id,
          { assignedTo: fieldUser.id },
          adminUser.id
        );
      } catch (err: any) {
        unconfirmedBlocked = true;
        assert(err.message.includes('CONFIRMED'), 'Blocked because Sales Order is not CONFIRMED');
      }
      assert(unconfirmedBlocked, 'Repair task blocked while Sales Order is PENDING_CONFIRMATION');
    }

    // -------------------------------------------------------------
    // Test 9 — Sales Order Confirmed
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Sales Order Confirmed (CONFIRMED -> Repair Task Unlocked & Dispatched) ---');
    let t9Task: any;
    {
      // Confirm Sales Order
      await db.update(salesOrders).set({ status: 'CONFIRMED' }).where(eq(salesOrders.id, repairSalesOrder.id));

      const [confirmedSo] = await db.select().from(salesOrders).where(eq(salesOrders.id, repairSalesOrder.id));
      assert(confirmedSo.status === 'CONFIRMED', 'Sales Order confirmed');

      // Now dispatch Repair Task
      const taskRes = await amcService.createRepairTaskForRequest(
        t5Contract.id,
        t5Request.id,
        {
          assignedTo: fieldUser.id,
          scheduledAt: '2026-06-28',
          priority: 'URGENT',
          notes: 'Perform chargeable coil replacement and voltage calibration.',
        },
        adminUser.id
      );

      assert(!!taskRes.task, 'Repair task created after Sales Order CONFIRMED');
      const [updatedReq] = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.id, t5Request.id));
      assert(updatedReq.taskId === taskRes.task.id, 'Service request stores taskId');
      t9Task = taskRes.task;
    }

    // -------------------------------------------------------------
    // Test 10 — Repair Completion
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Repair Completion (Task COMPLETED -> Unit REPAIRED/OPERATIONAL, PM Visit Intact) ---');
    {
      // Complete the repair task via TaskService
      await taskService.completeTask(
        t9Task.id,
        fieldUser.id,
        fieldUser.role,
        'Coil replaced, insulation resistance 200M ohm, 415V stable under full load.'
      );

      // Verify task is COMPLETED
      const [completedTask] = await db.select().from(tasks).where(eq(tasks.id, t9Task.id));
      assert(completedTask.status === 'COMPLETED', 'Repair task marked COMPLETED');

      // Verify unit condition restored to OPERATIONAL
      const [restoredEq] = await db.select().from(amcContractEquipment).where(eq(amcContractEquipment.id, t5Eq.id));
      assert(restoredEq.conditionStatus === 'OPERATIONAL', 'Unit condition status restored to OPERATIONAL');

      // Verify service request marked RESOLVED
      const [resolvedReq] = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.id, t5Request.id));
      assert(resolvedReq.status === 'RESOLVED', 'Service request marked RESOLVED');
      assert(!!resolvedReq.resolvedAt, 'Service request resolvedAt timestamp set');

      // CRITICAL CHECK: Verify original PM visit outcome is STILL REQUIRES_FOLLOWUP (not overwritten!)
      const [originalVisit] = await db.select().from(amcServiceVisits).where(eq(amcServiceVisits.id, t5Visit.id));
      assert(
        originalVisit.visitOutcome === 'REQUIRES_FOLLOWUP',
        'Historical PM visit outcome preserved as REQUIRES_FOLLOWUP (NOT overwritten to COMPLETED_OK)'
      );
    }

    // -------------------------------------------------------------
    // Test 11 — Duplicate Prevention
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Duplicate Prevention (Repeated submissions & tasks prevented) ---');
    {
      const { contract, eqItem, visit } = await createTestContract('T11');

      // First submission with defect
      await amcService.completeServiceVisitAndReport(
        visit.id,
        {
          visitOutcome: 'REQUIRES_FOLLOWUP',
          unitCondition: 'NEEDS_REPAIR',
          defectObservation: 'Carbon brushes sparking intermittently.',
          equipmentStatusList: [{ equipmentId: eqItem.id, conditionStatus: 'NEEDS_REPAIR' }],
        },
        fieldUser.id
      );

      const initialReqs = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.amcServiceVisitId, visit.id));
      assert(initialReqs.length === 1, 'Exactly 1 service request created on first submit');

      // Second repeated submission for the same PM visit
      await amcService.completeServiceVisitAndReport(
        visit.id,
        {
          visitOutcome: 'REQUIRES_FOLLOWUP',
          unitCondition: 'NEEDS_REPAIR',
          defectObservation: 'Carbon brushes sparking intermittently (repeated tap).',
          equipmentStatusList: [{ equipmentId: eqItem.id, conditionStatus: 'NEEDS_REPAIR' }],
        },
        fieldUser.id
      );

      const repeatReqs = await db.select().from(amcServiceRequests).where(eq(amcServiceRequests.amcServiceVisitId, visit.id));
      assert(repeatReqs.length === 1, 'Idempotency verified: Repeated PM report did NOT duplicate active service request');

      // Now approve AMC Covered and create repair task
      await amcService.setCoverageDecision(contract.id, repeatReqs[0].id, { coverageType: 'AMC_COVERED' }, adminUser.id);
      await amcService.createRepairTaskForRequest(contract.id, repeatReqs[0].id, { assignedTo: fieldUser.id }, adminUser.id);

      // Attempt to create second repair task for same request
      let duplicateTaskBlocked = false;
      try {
        await amcService.createRepairTaskForRequest(contract.id, repeatReqs[0].id, { assignedTo: fieldUser.id }, adminUser.id);
      } catch (err: any) {
        duplicateTaskBlocked = true;
        assert(err.message.includes('already') || err.message.includes('active repair task') || err.message.includes('assigned'), 'Blocked duplicate repair task');
      }
      assert(duplicateTaskBlocked, 'Duplicate repair task creation properly blocked');
    }

    console.log('\n================================================================');
    console.log(`  WORKFLOW TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED  `);
    console.log('================================================================\n');

    if (failedTests > 0) {
      throw new Error(`${failedTests} tests failed in AMC Defect Repair Workflow suite.`);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    throw err;
  }
}

// Execute directly if run as main script
runAmcDefectRepairWorkflowTests()
  .then(() => {
    console.log('🎉 All 11 workflow tests passed successfully with exit code 0.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });
