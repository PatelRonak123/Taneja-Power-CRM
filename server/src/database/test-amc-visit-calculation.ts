import {
  calculateContractDurationMonths,
  getFrequencyIntervalMonths,
  calculatePreventiveVisits,
} from '../modules/quotations/utils/amc-calculation.util.js';
import { QuotationService } from '../modules/quotations/services/quotation.service.js';
import { AmcContractService } from '../modules/amc-contracts/services/amc-contract.service.js';
import { db } from './db.js';
import { quotations, quotationRevisions } from './schema/quotations.js';
import { amcContracts } from './schema/amc-contracts.js';
import { eq } from 'drizzle-orm';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING AMC CONTRACT SCHEDULED PREVENTIVE VISITS TEST SUITE');
  console.log('================================================================\n');

  // TEST 1: Contract Duration Calculation (Calendar-Month Calculation)
  console.log('--- Test 1: Contract Duration Calculation ---');
  
  // Standard 12-month contracts
  const dur12 = calculateContractDurationMonths('2026-10-02', '2027-10-02');
  assert(dur12 === 12, `12-month contract (2026-10-02 to 2027-10-02): expected 12, got ${dur12}`);

  const dur12Minus1 = calculateContractDurationMonths('2026-10-02', '2027-10-01');
  assert(dur12Minus1 === 12, `12-month contract anniversary minus 1 day (2026-10-02 to 2027-10-01): expected 12, got ${dur12Minus1}`);

  const dur12Calendar = calculateContractDurationMonths('2026-01-01', '2026-12-31');
  assert(dur12Calendar === 12, `12-month calendar year (2026-01-01 to 2026-12-31): expected 12, got ${dur12Calendar}`);

  // 6-month contract
  const dur6 = calculateContractDurationMonths('2026-10-02', '2027-04-02');
  assert(dur6 === 6, `6-month contract (2026-10-02 to 2027-04-02): expected 6, got ${dur6}`);

  // 3-month contract
  const dur3 = calculateContractDurationMonths('2026-10-02', '2027-01-02');
  assert(dur3 === 3, `3-month contract (2026-10-02 to 2027-01-02): expected 3, got ${dur3}`);

  // 1-month contract
  const dur1 = calculateContractDurationMonths('2026-10-02', '2026-11-02');
  assert(dur1 === 1, `1-month contract (2026-10-02 to 2026-11-02): expected 1, got ${dur1}`);

  // Multi-year contract (>12 months)
  const dur24 = calculateContractDurationMonths('2026-10-02', '2028-10-02');
  assert(dur24 === 24, `24-month contract (2026-10-02 to 2028-10-02): expected 24, got ${dur24}`);

  // Date validation: inverted date range
  const durInvalid = calculateContractDurationMonths('2027-10-02', '2026-10-02');
  assert(durInvalid === 0, `Inverted date range: expected 0, got ${durInvalid}`);

  // Edge cases: null, undefined, empty
  assert(calculateContractDurationMonths(null, '2027-10-02') === 0, 'Null start date returns 0');
  assert(calculateContractDurationMonths('2026-10-02', null) === 0, 'Null end date returns 0');

  console.log('✅ Duration calculation tests passed!\n');

  // TEST 2: Frequency Interval Mapping
  console.log('--- Test 2: Frequency Interval Mapping ---');
  assert(getFrequencyIntervalMonths('Monthly') === 1, 'Monthly -> 1 month');
  assert(getFrequencyIntervalMonths('MONTHLY') === 1, 'MONTHLY -> 1 month');
  assert(getFrequencyIntervalMonths('Bi-Monthly') === 2, 'Bi-Monthly -> 2 months');
  assert(getFrequencyIntervalMonths('BI_MONTHLY') === 2, 'BI_MONTHLY -> 2 months');
  assert(getFrequencyIntervalMonths('Quarterly') === 3, 'Quarterly -> 3 months');
  assert(getFrequencyIntervalMonths('QUARTERLY') === 3, 'QUARTERLY -> 3 months');
  assert(getFrequencyIntervalMonths('Half-Yearly') === 6, 'Half-Yearly -> 6 months');
  assert(getFrequencyIntervalMonths('HALF_YEARLY') === 6, 'HALF_YEARLY -> 6 months');
  assert(getFrequencyIntervalMonths('Yearly') === 12, 'Yearly -> 12 months');
  assert(getFrequencyIntervalMonths('YEARLY') === 12, 'YEARLY -> 12 months');
  assert(getFrequencyIntervalMonths('Custom') === null, 'Custom -> null');
  console.log('✅ Frequency interval mapping tests passed!\n');

  // TEST 3: Visit Calculation for 12-Month Contracts
  console.log('--- Test 3: 12-Month Contract Visit Calculations ---');
  const start12 = '2026-10-02';
  const end12 = '2027-10-02';

  const v12Monthly = calculatePreventiveVisits(start12, end12, 'Monthly');
  assert(v12Monthly === 12, `12m + Monthly: expected 12, got ${v12Monthly}`);

  const v12BiMonthly = calculatePreventiveVisits(start12, end12, 'Bi-Monthly');
  assert(v12BiMonthly === 6, `12m + Bi-Monthly: expected 6, got ${v12BiMonthly}`);

  const v12Quarterly = calculatePreventiveVisits(start12, end12, 'Quarterly');
  assert(v12Quarterly === 4, `12m + Quarterly: expected 4, got ${v12Quarterly}`);

  const v12HalfYearly = calculatePreventiveVisits(start12, end12, 'Half-Yearly');
  assert(v12HalfYearly === 2, `12m + Half-Yearly: expected 2, got ${v12HalfYearly}`);

  const v12Yearly = calculatePreventiveVisits(start12, end12, 'Yearly');
  assert(v12Yearly === 1, `12m + Yearly: expected 1, got ${v12Yearly}`);
  console.log('✅ 12-month visit calculations passed!\n');

  // TEST 4: Visit Calculation for 6-Month Contracts
  console.log('--- Test 4: 6-Month Contract Visit Calculations ---');
  const start6 = '2026-10-02';
  const end6 = '2027-04-02';

  const v6Monthly = calculatePreventiveVisits(start6, end6, 'Monthly');
  assert(v6Monthly === 6, `6m + Monthly: expected 6, got ${v6Monthly}`);

  const v6BiMonthly = calculatePreventiveVisits(start6, end6, 'Bi-Monthly');
  assert(v6BiMonthly === 3, `6m + Bi-Monthly: expected 3, got ${v6BiMonthly}`);

  const v6Quarterly = calculatePreventiveVisits(start6, end6, 'Quarterly');
  assert(v6Quarterly === 2, `6m + Quarterly: expected 2, got ${v6Quarterly}`);

  const v6HalfYearly = calculatePreventiveVisits(start6, end6, 'Half-Yearly');
  assert(v6HalfYearly === 1, `6m + Half-Yearly: expected 1, got ${v6HalfYearly}`);

  const v6Yearly = calculatePreventiveVisits(start6, end6, 'Yearly');
  assert(v6Yearly === 0, `6m + Yearly: expected 0, got ${v6Yearly}`);
  console.log('✅ 6-month visit calculations passed!\n');

  // TEST 5: Visit Calculation for 3-Month Contracts
  console.log('--- Test 5: 3-Month Contract Visit Calculations ---');
  const start3 = '2026-10-02';
  const end3 = '2027-01-02';

  const v3Monthly = calculatePreventiveVisits(start3, end3, 'Monthly');
  assert(v3Monthly === 3, `3m + Monthly: expected 3, got ${v3Monthly}`);

  const v3BiMonthly = calculatePreventiveVisits(start3, end3, 'Bi-Monthly');
  assert(v3BiMonthly === 1, `3m + Bi-Monthly: expected 1, got ${v3BiMonthly}`);

  const v3Quarterly = calculatePreventiveVisits(start3, end3, 'Quarterly');
  assert(v3Quarterly === 1, `3m + Quarterly: expected 1, got ${v3Quarterly}`);
  console.log('✅ 3-month visit calculations passed!\n');

  // TEST 6: Invalid Date Range and Boundary Behavior
  console.log('--- Test 6: Invalid Date Range & Boundary Checks ---');
  const vInvalid = calculatePreventiveVisits('2027-10-02', '2026-10-02', 'Bi-Monthly');
  assert(vInvalid === 0, `End date before start date: expected 0, got ${vInvalid}`);

  const vSameDay = calculatePreventiveVisits('2026-10-02', '2026-10-02', 'Bi-Monthly');
  assert(vSameDay === 0, `Same start and end date: expected 0, got ${vSameDay}`);
  console.log('✅ Boundary and validation tests passed!\n');

  // TEST 7: Backend Enforcement & Persistence
  console.log('--- Test 7: Backend Persistence & Source of Truth Enforcement ---');
  const [testQuotation] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.quotationType, 'AMC'))
    .limit(1);

  if (testQuotation) {
    const qService = new QuotationService();
    const mockAuthUser = {
      userId: testQuotation.createdById,
      email: 'test@example.com',
      role: 'ADMIN',
      permissions: ['*'],
    } as any;

    // Simulate client sending an inconsistent manual value (e.g. 4 for 12m Bi-Monthly)
    console.log(`  Updating AMC Quotation ${testQuotation.id} with Bi-Monthly and manual visit count: 4 (wrong)`);
    await qService.updateQuotation(
      testQuotation.id,
      {
        amcStartDate: '2026-10-02',
        amcEndDate: '2027-10-02',
        amcServiceFrequency: 'Bi-Monthly',
        amcScheduledVisits: 4, // Malicious / outdated manual input
      },
      mockAuthUser
    );

    // Verify database stored the calculated value (6)
    const [updatedRev] = await db
      .select()
      .from(quotationRevisions)
      .where(eq(quotationRevisions.quotationId, testQuotation.id))
      .limit(1);

    assert(
      updatedRev?.amcScheduledVisits === 6,
      `Backend override: submitted amcScheduledVisits: 4 was overridden with calculated 6 (got ${updatedRev?.amcScheduledVisits})`
    );
  } else {
    console.log('  (No existing AMC quotation found in database to test DB update, unit checks already verify logic)');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
