import { db, pool } from './db.js';
import { QuotationCalculationService } from '../modules/quotations/services/quotation-calculation.service.js';
import { QuotationNumberService } from '../modules/quotations/services/quotation-number.service.js';

const runGstAndConcurrencyTests = async () => {
  console.log('=== RUNNING FOCUSED GST CALCULATION & CONCURRENCY TESTS ===\n');

  const calcService = new QuotationCalculationService();
  const numberService = new QuotationNumberService();

  // ----------------------------------------------------
  // GST TEST A: 18% Same-State (Gujarat)
  // ----------------------------------------------------
  console.log('[GST TEST A] 18% Same-State (Intra-state: Gujarat)...');
  const resultA = calcService.calculateLineItem(
    {
      productName: 'Test Item A',
      quantity: 1,
      unitPrice: 10000,
      gstRate: 18,
    },
    'Gujarat'
  );

  console.log(`  Taxable: ₹${resultA.taxableAmount}`);
  console.log(`  CGST (${resultA.cgstRate}%): ₹${resultA.cgstAmount}`);
  console.log(`  SGST (${resultA.sgstRate}%): ₹${resultA.sgstAmount}`);
  console.log(`  IGST (${resultA.igstRate}%): ₹${resultA.igstAmount}`);
  console.log(`  Total Tax: ₹${resultA.totalTax}`);
  console.log(`  Line Total: ₹${resultA.lineTotal}`);

  if (
    resultA.taxableAmount !== '10000.00' ||
    resultA.cgstRate !== '9.00' ||
    resultA.cgstAmount !== '900.00' ||
    resultA.sgstRate !== '9.00' ||
    resultA.sgstAmount !== '900.00' ||
    resultA.igstAmount !== '0.00' ||
    resultA.totalTax !== '1800.00' ||
    resultA.lineTotal !== '11800.00'
  ) {
    throw new Error('GST Test A failed!');
  }
  console.log('✓ GST TEST A PASSED\n');

  // ----------------------------------------------------
  // GST TEST B: 18% Inter-State (Maharashtra)
  // ----------------------------------------------------
  console.log('[GST TEST B] 18% Inter-State (Maharashtra)...');
  const resultB = calcService.calculateLineItem(
    {
      productName: 'Test Item B',
      quantity: 1,
      unitPrice: 10000,
      gstRate: 18,
    },
    'Maharashtra'
  );

  console.log(`  Taxable: ₹${resultB.taxableAmount}`);
  console.log(`  CGST (${resultB.cgstRate}%): ₹${resultB.cgstAmount}`);
  console.log(`  SGST (${resultB.sgstRate}%): ₹${resultB.sgstAmount}`);
  console.log(`  IGST (${resultB.igstRate}%): ₹${resultB.igstAmount}`);
  console.log(`  Total Tax: ₹${resultB.totalTax}`);
  console.log(`  Line Total: ₹${resultB.lineTotal}`);

  if (
    resultB.taxableAmount !== '10000.00' ||
    resultB.cgstAmount !== '0.00' ||
    resultB.sgstAmount !== '0.00' ||
    resultB.igstRate !== '18.00' ||
    resultB.igstAmount !== '1800.00' ||
    resultB.totalTax !== '1800.00' ||
    resultB.lineTotal !== '11800.00'
  ) {
    throw new Error('GST Test B failed!');
  }
  console.log('✓ GST TEST B PASSED\n');

  // ----------------------------------------------------
  // GST TEST C: 12% Same-State (Gujarat)
  // ----------------------------------------------------
  console.log('[GST TEST C] 12% Same-State (Intra-state: Gujarat)...');
  const resultC = calcService.calculateLineItem(
    {
      productName: 'Test Item C',
      quantity: 1,
      unitPrice: 10000,
      gstRate: 12,
    },
    'Gujarat'
  );

  console.log(`  Taxable: ₹${resultC.taxableAmount}`);
  console.log(`  CGST (${resultC.cgstRate}%): ₹${resultC.cgstAmount}`);
  console.log(`  SGST (${resultC.sgstRate}%): ₹${resultC.sgstAmount}`);
  console.log(`  IGST (${resultC.igstRate}%): ₹${resultC.igstAmount}`);
  console.log(`  Total Tax: ₹${resultC.totalTax}`);
  console.log(`  Line Total: ₹${resultC.lineTotal}`);

  if (
    resultC.taxableAmount !== '10000.00' ||
    resultC.cgstRate !== '6.00' ||
    resultC.cgstAmount !== '600.00' ||
    resultC.sgstRate !== '6.00' ||
    resultC.sgstAmount !== '600.00' ||
    resultC.igstAmount !== '0.00' ||
    resultC.totalTax !== '1200.00' ||
    resultC.lineTotal !== '11200.00'
  ) {
    throw new Error('GST Test C failed!');
  }
  console.log('✓ GST TEST C PASSED\n');

  // ----------------------------------------------------
  // GST TEST D: 5% Inter-State (Rajasthan)
  // ----------------------------------------------------
  console.log('[GST TEST D] 5% Inter-State (Rajasthan)...');
  const resultD = calcService.calculateLineItem(
    {
      productName: 'Test Item D',
      quantity: 1,
      unitPrice: 10000,
      gstRate: 5,
    },
    'Rajasthan'
  );

  console.log(`  Taxable: ₹${resultD.taxableAmount}`);
  console.log(`  CGST (${resultD.cgstRate}%): ₹${resultD.cgstAmount}`);
  console.log(`  SGST (${resultD.sgstRate}%): ₹${resultD.sgstAmount}`);
  console.log(`  IGST (${resultD.igstRate}%): ₹${resultD.igstAmount}`);
  console.log(`  Total Tax: ₹${resultD.totalTax}`);
  console.log(`  Line Total: ₹${resultD.lineTotal}`);

  if (
    resultD.taxableAmount !== '10000.00' ||
    resultD.cgstAmount !== '0.00' ||
    resultD.sgstAmount !== '0.00' ||
    resultD.igstRate !== '5.00' ||
    resultD.igstAmount !== '500.00' ||
    resultD.totalTax !== '500.00' ||
    resultD.lineTotal !== '10500.00'
  ) {
    throw new Error('GST Test D failed!');
  }
  console.log('✓ GST TEST D PASSED\n');

  // ----------------------------------------------------
  // GST TEST E: 5% Same-State (Split: 2.5% CGST + 2.5% SGST)
  // ----------------------------------------------------
  console.log('[GST TEST E] 5% Same-State (Split: 2.5% CGST + 2.5% SGST)...');
  const resultE = calcService.calculateLineItem(
    {
      productName: 'Test Item E',
      quantity: 1,
      unitPrice: 10000,
      gstRate: 5,
    },
    'Gujarat'
  );

  console.log(`  Taxable: ₹${resultE.taxableAmount}`);
  console.log(`  CGST (${resultE.cgstRate}%): ₹${resultE.cgstAmount}`);
  console.log(`  SGST (${resultE.sgstRate}%): ₹${resultE.sgstAmount}`);
  console.log(`  Total Tax: ₹${resultE.totalTax}`);

  if (
    resultE.cgstRate !== '2.50' ||
    resultE.cgstAmount !== '250.00' ||
    resultE.sgstRate !== '2.50' ||
    resultE.sgstAmount !== '250.00' ||
    resultE.totalTax !== '500.00'
  ) {
    throw new Error('GST Test E failed!');
  }
  console.log('✓ GST TEST E PASSED\n');

  // ----------------------------------------------------
  // CONCURRENCY TEST: Concurrent Number Generation
  // ----------------------------------------------------
  console.log('[CONCURRENCY TEST] Spawning 10 concurrent quotation number requests...');
  const concurrentPromises = Array.from({ length: 10 }, (_, i) =>
    numberService.generateQuotationNumber('QT-TEST', new Date(), db)
  );

  const generatedNumbers = await Promise.all(concurrentPromises);
  console.log('  Generated Numbers:', generatedNumbers);

  const uniqueNumbers = new Set(generatedNumbers);
  console.log(`  Unique count: ${uniqueNumbers.size} out of ${generatedNumbers.length}`);

  if (uniqueNumbers.size !== generatedNumbers.length) {
    throw new Error('Concurrency collision detected! Generated duplicate quotation numbers.');
  }
  console.log('✓ CONCURRENCY TEST PASSED: 0 Collisions, All Numbers Unique!\n');

  console.log('====================================================');
  console.log('🎉 ALL FOCUSED GST & CONCURRENCY TESTS PASSED! 🎉');
  console.log('====================================================\n');
};

runGstAndConcurrencyTests()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Test failed:', err);
    await pool.end();
    process.exit(1);
  });
