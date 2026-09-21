import 'dotenv/config';
import { db } from './db.js';
import { QuotationService } from '../modules/quotations/services/quotation.service.js';
import { customers } from './schema/customers.js';
import { users } from './schema/users.js';
import { quotations } from './schema/quotations.js';
import { eq } from 'drizzle-orm';

async function runAmcVerification() {
  console.log('🚀 Starting Phase 1 AMC Backend & Snapshot Verification Test...');

  // 1. Fetch active test customer & user
  const [testCustomer] = await db.select().from(customers).where(eq(customers.status, 'ACTIVE')).limit(1);
  const [testUser] = await db.select().from(users).limit(1);

  if (!testCustomer || !testUser) {
    console.error('❌ Prerequisite failed: Active customer or user not found in DB.');
    process.exit(1);
  }

  const authUser = {
    userId: testUser.id,
    email: testUser.email,
    role: testUser.role || ('ADMIN' as any),
  };

  const quotationService = new QuotationService();

  console.log(`\n📋 Step 1: Creating AMC Quotation (Ultra Care UC)...`);
  const createdAmc = await quotationService.createQuotation(
    {
      quotationType: 'AMC',
      customerId: testCustomer.id,
      quotationDate: '2026-04-01',
      validityDays: 30,
      currency: 'INR',
      subject: 'Ultra Care AMC for 50 KVA Stabilizer',
      amcPlan: 'Ultra Care (UC)',
      amcStartDate: '2026-04-01T00:00:00.000Z',
      amcEndDate: '2027-03-31T23:59:59.000Z',
      amcServiceFrequency: 'Quarterly',
      amcScheduledVisits: 4,
      amcBreakdownVisitType: 'UNLIMITED',
      endUser: 'Taneja Industrial Plant',
      customerCode: 'CC-9988',
      branch: 'Vadodara Central',
      zone: 'West Zone',
      specialClauses: '100% advance payment required at start of quarter.',
      amcPaymentTerms: 'Quarterly in advance.',
      items: [
        {
          itemType: 'AMC',
          productName: 'STABILIZER AMC',
          equipmentType: 'STABILIZER',
          equipmentConfiguration: '50 KVA',
          equipmentRating: '30 KVA',
          hsnSac: '998719',
          unit: 'NOS',
          quantity: 1,
          unitPrice: 9000,
          discountPercent: 0,
          gstRate: 18,
          sortOrder: 0,
        },
      ],
      amcScope: [
        { description: 'Servicing of Stabilizer', sortOrder: 0 },
        { description: 'Check Input & Output Voltage Variation', sortOrder: 1 },
        { description: 'Check Input Current & Output Current', sortOrder: 2 },
        { description: 'Auto & Manual Facility Check', sortOrder: 3 },
        { description: 'Check Motor Condition', sortOrder: 4 },
        { description: 'Check Cut Off Switch & Display', sortOrder: 5 },
      ],
      amcExclusions: [
        { description: 'Transformer', sortOrder: 0 },
        { description: 'MCCB', sortOrder: 1 },
        { description: 'Capacitor', sortOrder: 2 },
      ],
      amcEscalations: [
        { level: 'LEVEL_1', contactName: 'Rajesh Sharma', phone: '+91 98765 43210', email: 'rajesh@tanejapower.com', sortOrder: 0 },
        { level: 'LEVEL_2', contactName: 'Suresh Patel', phone: '+91 98765 43211', email: 'suresh@tanejapower.com', sortOrder: 1 },
        { level: 'LEVEL_3', contactName: 'VP Operations', phone: '+91 98765 43212', email: 'vp@tanejapower.com', sortOrder: 2 },
      ],
    },
    authUser
  );

  console.log(`✅ AMC Quotation Created! ID: ${createdAmc?.id}, Quotation No: ${createdAmc?.quotationNumber}`);

  // 2. Fetch and verify retrieved details
  console.log(`\n📋 Step 2: Retrieving created AMC Quotation details...`);
  const fetchedAmc = await quotationService.getQuotationById(createdAmc!.id);
  const rev1 = fetchedAmc.currentRevision;

  console.log(`  • Quotation Type: ${fetchedAmc.quotationType}`);
  console.log(`  • AMC Plan: ${rev1?.amcPlan}`);
  console.log(`  • Service Frequency: ${rev1?.amcServiceFrequency}`);
  console.log(`  • Scheduled Visits: ${rev1?.amcScheduledVisits}`);
  console.log(`  • Breakdown Visits: ${rev1?.amcBreakdownVisitType}`);
  console.log(`  • Equipment: ${rev1?.items[0]?.productName} (${rev1?.items[0]?.equipmentType}, Config: ${rev1?.items[0]?.equipmentConfiguration}, Rating: ${rev1?.items[0]?.equipmentRating})`);
  console.log(`  • Scope Items Count: ${rev1?.amcScope?.length}`);
  console.log(`  • Exclusions Count: ${rev1?.amcExclusions?.length}`);
  console.log(`  • Escalations Count: ${rev1?.amcEscalations?.length}`);
  console.log(`  • Grand Total: ₹${rev1?.grandTotal}`);

  if (rev1?.amcScope?.length !== 6 || rev1?.amcExclusions?.length !== 3 || rev1?.amcEscalations?.length !== 3) {
    console.error('❌ Verification failed: AMC scope/exclusions/escalations count mismatch!');
    process.exit(1);
  }

  // 3. Update Draft AMC Quotation
  console.log(`\n📋 Step 3: Updating Draft AMC Quotation...`);
  await quotationService.updateQuotation(
    createdAmc!.id,
    {
      specialClauses: 'Updated special clause: Annual payment in advance.',
      amcScope: [
        { description: 'Servicing of Stabilizer', sortOrder: 0 },
        { description: 'Check Input & Output Voltage Variation', sortOrder: 1 },
        { description: 'Check Input Current & Output Current', sortOrder: 2 },
        { description: 'Auto & Manual Facility Check', sortOrder: 3 },
        { description: 'Check Motor Condition', sortOrder: 4 },
        { description: 'Check Cut Off Switch & Display', sortOrder: 5 },
        { description: 'Thermal Imaging Inspection of Terminals', sortOrder: 6 },
      ],
    },
    authUser
  );

  const updatedAmc = await quotationService.getQuotationById(createdAmc!.id);
  console.log(`✅ Draft updated! Scope items now: ${updatedAmc.currentRevision?.amcScope?.length}`);

  // 4. Create Revision 2 (Rev N+1)
  console.log(`\n📋 Step 4: Creating Revision 2 (Rev N+1)...`);
  await quotationService.createFormalRevision(
    createdAmc!.id,
    {
      revisionReason: 'Client requested thermal imaging inclusion and 5% discount.',
      items: [
        {
          itemType: 'AMC',
          productName: 'STABILIZER AMC',
          equipmentType: 'STABILIZER',
          equipmentConfiguration: '50 KVA',
          equipmentRating: '30 KVA',
          hsnSac: '998719',
          unit: 'NOS',
          quantity: 1,
          unitPrice: 9000,
          discountPercent: 5,
          gstRate: 18,
          sortOrder: 0,
        },
      ],
    },
    authUser
  );

  // 5. Verify Rev 1 vs Rev 2 Snapshot Integrity
  console.log(`\n📋 Step 5: Verifying Immutable Snapshot Integrity between Rev 1 and Rev 2...`);
  const rev1Fetched = await quotationService.getSpecificRevision(createdAmc!.id, 1);
  const rev2Fetched = await quotationService.getSpecificRevision(createdAmc!.id, 2);

  console.log(`  • Rev 1 Number: ${rev1Fetched?.revisionNumber}, Discount: ${rev1Fetched?.items[0]?.discountPercent}%, Grand Total: ₹${rev1Fetched?.grandTotal}`);
  console.log(`  • Rev 2 Number: ${rev2Fetched?.revisionNumber}, Discount: ${rev2Fetched?.items[0]?.discountPercent}%, Grand Total: ₹${rev2Fetched?.grandTotal}`);

  if (rev1Fetched?.items[0]?.discountPercent !== '0.00' || rev2Fetched?.items[0]?.discountPercent !== '5.00') {
    console.error('❌ Verification failed: Historical Rev 1 was mutated when Rev 2 was created!');
    process.exit(1);
  }

  if (rev2Fetched?.amcPlan !== 'Ultra Care (UC)' || rev2Fetched?.amcScope?.length !== 7) {
    console.error('❌ Verification failed: Rev 2 did not inherit AMC plan or scope items snapshot!');
    process.exit(1);
  }

  console.log(`✅ Snapshot Integrity Verified! Rev 1 remains frozen while Rev 2 holds new snapshot.`);

  // 6. Test PRODUCT, SERVICE, and TECHNICAL Quotation Backward Compatibility
  console.log(`\n📋 Step 6: Testing Backward Compatibility with PRODUCT, SERVICE, and TECHNICAL Quotations...`);
  const prodQuotation = await quotationService.createQuotation(
    {
      quotationType: 'PRODUCT',
      customerId: testCustomer.id,
      items: [{ productName: 'Diesel Generator 100kVA', unit: 'NOS', quantity: 1, unitPrice: 450000, gstRate: 18 }],
    },
    authUser
  );
  console.log(`  • PRODUCT Quotation Created: ${prodQuotation?.quotationNumber}`);

  const serviceQuotation = await quotationService.createQuotation(
    {
      quotationType: 'SERVICE',
      customerId: testCustomer.id,
      items: [{ productName: 'Transformer Oil Testing', unit: 'LOT', quantity: 1, unitPrice: 25000, gstRate: 18, serviceDurationMonths: 1 }],
    },
    authUser
  );
  console.log(`  • SERVICE Quotation Created: ${serviceQuotation?.quotationNumber}`);

  const techQuotation = await quotationService.createQuotation(
    {
      quotationType: 'TECHNICAL',
      customerId: testCustomer.id,
      items: [{ productName: '11KV Switchgear Panel', technicalSpecifications: 'IP55 Outdoor VCB Panel', unit: 'SET', quantity: 1, unitPrice: 850000, gstRate: 18 }],
    },
    authUser
  );
  console.log(`  • TECHNICAL Quotation Created: ${techQuotation?.quotationNumber}`);

  // 7. Cleanup Test Records
  console.log(`\n📋 Step 7: Cleaning up test quotation records...`);
  const testIds = [createdAmc!.id, prodQuotation!.id, serviceQuotation!.id, techQuotation!.id];
  for (const tid of testIds) {
    await db.delete(quotations).where(eq(quotations.id, tid));
  }
  console.log(`✅ Cleanup complete!`);

  console.log(`\n🎉 ALL PHASE 1 AMC BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  process.exit(0);
}

runAmcVerification().catch((err) => {
  console.error('❌ Verification script error:', err);
  process.exit(1);
});
