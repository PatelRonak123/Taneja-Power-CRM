import { QuotationPdfService } from '../modules/quotations/services/quotation-pdf.service.js';
import { db } from './db.js';
import { quotations, quotationRevisions } from './schema/quotations.js';
import { eq } from 'drizzle-orm';

async function runAmcPdfVerificationTest() {
  console.log('🚀 Starting Phase 3 AMC PDF Generation Verification Test...\n');

  // Sample AMC Quotation Data matching supplied Taneja AMC PDF reference
  const amcSampleData = {
    quotationNumber: 'QT/2026-27/0099',
    quotationType: 'AMC',
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    salesperson: {
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@tanejapower.com',
      phone: '+91 98765 00000',
    },
    customer: {
      name: 'M/S JAY CHEMICAL IND.P.LTD.',
      companyName: 'M/S JAY CHEMICAL IND.P.LTD.',
      phone: '+91 98250 12345',
      email: 'purchase@jaychemical.com',
      address: 'Plot No 12, Saykha GIDC',
      city: 'Saykha',
      state: 'Gujarat',
      pincode: '392140',
      taxNumber: '24AABCJ1234F1Z9',
    },
    revision: {
      revisionNumber: 1,
      status: 'APPROVED',
      quotationDate: new Date('2026-04-18').toISOString(),
      validityDays: 30,
      validUntil: new Date('2026-05-18').toISOString(),
      currency: 'INR',
      customerName: 'M/S JAY CHEMICAL IND.P.LTD.',
      companyName: 'M/S JAY CHEMICAL IND.P.LTD.',
      customerGstin: '24AABCJ1234F1Z9',
      billingAddress: 'Plot No 12, Saykha GIDC',
      billingCity: 'Saykha',
      billingState: 'Gujarat',
      billingPincode: '392140',
      subtotal: '9000.00',
      totalDiscount: '0.00',
      taxableAmount: '9000.00',
      cgstAmount: '810.00',
      sgstAmount: '810.00',
      igstAmount: '0.00',
      totalTax: '1620.00',
      freightCharges: '0.00',
      otherCharges: '0.00',
      roundOff: '0.00',
      grandTotal: '10620.00',
      amountInWords: 'Ten Thousand Six Hundred Twenty Rupees Only',
      subject: 'Comprehensive Annual Maintenance Contract offer for 50 KVA Stabilizer at your premises',
      amcPlan: 'Ultra Care (UC)',
      amcStartDate: new Date('2026-04-18').toISOString(),
      amcEndDate: new Date('2027-04-17').toISOString(),
      amcServiceFrequency: 'Quarterly',
      amcScheduledVisits: 4,
      amcBreakdownVisitType: 'UNLIMITED',
      endUser: 'Saykha Chemical Plant Site',
      customerCode: 'CC-JAY-01',
      branch: 'Bharuch Branch',
      zone: 'West Zone',
      specialClauses: 'Effective only after receiving full advance payment along with official Purchase Order.',
      amcPaymentTerms: '100% Advance along with Purchase Order.',
      items: [
        {
          productName: 'STABILIZER',
          equipmentType: 'Industrial Stabilizer',
          equipmentConfiguration: '50 KVA',
          equipmentRating: '30 KVA',
          quantity: '1',
          unit: 'NOS',
          unitPrice: '9000.00',
          discountPercent: '0.00',
          taxableAmount: '9000.00',
          gstRate: '18',
          cgstAmount: '810.00',
          sgstAmount: '810.00',
          totalTax: '1620.00',
          lineTotal: '10620.00',
          hsnSac: '998719',
        },
      ],
      amcScope: [
        { description: 'Servicing of Stabilizer', sortOrder: 1 },
        { description: 'Check Input & Output Voltage Variation', sortOrder: 2 },
        { description: 'Check Input Current & Output Current', sortOrder: 3 },
        { description: 'Auto & Manual Facility Check', sortOrder: 4 },
        { description: 'Check Motor Condition', sortOrder: 5 },
        { description: 'Check Cut Off Switch & Display', sortOrder: 6 },
      ],
      amcExclusions: [
        { description: 'Transformer', sortOrder: 1 },
        { description: 'MCCB', sortOrder: 2 },
        { description: 'Capacitor', sortOrder: 3 },
      ],
      amcEscalations: [
        { level: 'LEVEL_1', contactName: 'Service Desk', phone: '9876543210', email: 'support@tanejapower.com', sortOrder: 1 },
        { level: 'LEVEL_2', contactName: 'Area Manager', phone: '9876543211', email: 'manager@tanejapower.com', sortOrder: 2 },
      ],
    },
  };

  // TEST 1: Generate AMC PDF Buffer
  console.log('📋 Test 1: Generating AMC Quotation PDF (5-Page Layout)...');
  const amcPdfBuffer = await QuotationPdfService.generatePdf(amcSampleData as any);

  if (!amcPdfBuffer || amcPdfBuffer.length === 0) {
    throw new Error('FAILED: AMC PDF buffer is empty.');
  }
  console.log(`✅ AMC PDF Generated Successfully! Size: ${amcPdfBuffer.length} bytes.`);

  // TEST 2: Generate Non-AMC PRODUCT PDF for Regression Check
  console.log('\n📋 Test 2: Generating Non-AMC PRODUCT Quotation PDF (Regression Check)...');
  const productSampleData = {
    ...amcSampleData,
    quotationNumber: 'QT/2026-27/0100',
    quotationType: 'PRODUCT',
  };
  const productPdfBuffer = await QuotationPdfService.generatePdf(productSampleData as any);

  if (!productPdfBuffer || productPdfBuffer.length === 0) {
    throw new Error('FAILED: Product PDF buffer is empty.');
  }
  console.log(`✅ PRODUCT PDF Generated Successfully! Size: ${productPdfBuffer.length} bytes.`);

  console.log('\n🎉 ALL PHASE 3 AMC PDF GENERATION VERIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runAmcPdfVerificationTest().catch((err) => {
  console.error('❌ PDF Generation Test Failed:', err);
  process.exit(1);
});
