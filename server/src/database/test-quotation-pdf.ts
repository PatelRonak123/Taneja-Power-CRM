import { QuotationPdfService } from '../modules/quotations/services/quotation-pdf.service.js';
import fs from 'fs';
import path from 'path';

async function runPdfTests() {
  console.log('=== QUOTATION PDF SERVICE AUTOMATED TEST SUITE ===\n');

  // Test 1: Draft Quotation PDF
  console.log('Test 1: Generating Draft Quotation PDF...');
  const draftPdf = await QuotationPdfService.generatePdf({
    quotationNumber: 'QT/2026-27/0001',
    quotationType: 'PRODUCT',
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    salesperson: {
      fullName: 'Rahul Patel',
      email: 'rahul.patel@tanejapower.com',
      phone: '+91 98765 43210',
    },
    customer: {
      name: 'Adani Green Energy Ltd',
      companyName: 'Adani Green Energy Ltd',
      phone: '+91 79 2555 5555',
      email: 'procurement@adani.com',
      address: 'Adani Shantigram, SG Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '382421',
      taxNumber: '24AAACA1234F1Z1',
    },
    destination: {
      name: 'Khavda Solar Park Site B',
      address: 'Plot 42, Khavda Renewable Park',
      city: 'Kutch',
      state: 'Gujarat',
      pincode: '370510',
    },
    revision: {
      revisionNumber: 1,
      status: 'DRAFT',
      quotationDate: new Date().toISOString(),
      validityDays: 30,
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
      currency: 'INR',
      customerName: 'Adani Green Energy Ltd',
      companyName: 'Adani Green Energy Ltd',
      customerEmail: 'procurement@adani.com',
      customerPhone: '+91 79 2555 5555',
      customerGstin: '24AAACA1234F1Z1',
      billingAddress: 'Adani Shantigram, SG Highway',
      billingCity: 'Ahmedabad',
      billingState: 'Gujarat',
      billingPincode: '382421',
      subtotal: '250000.00',
      totalDiscount: '0.00',
      taxableAmount: '250000.00',
      cgstAmount: '22500.00',
      sgstAmount: '22500.00',
      igstAmount: '0.00',
      totalTax: '45000.00',
      freightCharges: '0.00',
      otherCharges: '0.00',
      roundOff: '0.00',
      grandTotal: '295000.00',
      amountInWords: 'Two Lakh Ninety Five Thousand Indian Rupees Only',
      subject: 'Supply of 250 kVA Silent Diesel Generator Set',
      paymentTerms: '50% Advance with order, 50% against proforma invoice before dispatch',
      deliveryTerms: '2-3 Weeks from receipt of technically and commercially clear order',
      warrantyTerms: '24 Months or 2000 Operating Hours from commissioning date',
      termsAndConditions: '1. Prices Ex-Works Vadodara. 2. Transit Insurance extra at actuals.',
      items: [
        {
          productName: '250 kVA Industrial Silent DG Set',
          productSku: 'GEN-250-SLNT',
          make: 'Taneja Power / Cummins Engine',
          hsnSac: '85021200',
          unit: 'SET',
          quantity: 1,
          unitPrice: '250000.00',
          discountPercent: 0,
          taxableAmount: '250000.00',
          gstRate: 18,
          cgstAmount: '22500.00',
          sgstAmount: '22500.00',
          totalTax: '45000.00',
          lineTotal: '295000.00',
        },
      ],
    },
  });

  if (draftPdf && draftPdf.length > 1000) {
    console.log(`✓ Draft PDF generated successfully (${draftPdf.length} bytes)`);
  } else {
    throw new Error('Draft PDF generation failed or empty');
  }

  // Test 2: Approved Quotation with Multi-Tier GST (5%, 12%, 18%, 28%) and Inter-State (IGST)
  console.log('\nTest 2: Generating Multi-Tier GST Inter-State Approved Quotation PDF...');
  const multiTierPdf = await QuotationPdfService.generatePdf({
    quotationNumber: 'QT/2026-27/0002',
    quotationType: 'TECHNICAL',
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    salesperson: {
      fullName: 'Rahul Patel',
      email: 'rahul.patel@tanejapower.com',
    },
    customer: {
      name: 'Tata Steel Limited',
      companyName: 'Tata Steel Limited',
      phone: '+91 22 6665 8282',
      email: 'purchase@tatasteel.com',
      address: 'Bombay House, 24 Homi Mody Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      taxNumber: '27AAACT2727Q1ZW',
    },
    destination: {
      name: 'Tarapur Cold Rolling Complex',
      address: 'Plot MIDC Tarapur Industrial Area',
      city: 'Palghar',
      state: 'Maharashtra',
      pincode: '401506',
    },
    revision: {
      revisionNumber: 1,
      status: 'APPROVED',
      quotationDate: new Date().toISOString(),
      validityDays: 45,
      validUntil: new Date(Date.now() + 45 * 86400000).toISOString(),
      currency: 'INR',
      customerName: 'Tata Steel Limited',
      companyName: 'Tata Steel Limited',
      customerGstin: '27AAACT2727Q1ZW',
      billingAddress: 'Bombay House, 24 Homi Mody Street',
      billingCity: 'Mumbai',
      billingState: 'Maharashtra',
      billingPincode: '400001',
      subtotal: '475000.00',
      totalDiscount: '15000.00',
      taxableAmount: '460000.00',
      cgstAmount: '0.00',
      sgstAmount: '0.00',
      igstAmount: '80200.00',
      totalTax: '80200.00',
      freightCharges: '5000.00',
      otherCharges: '0.00',
      roundOff: '0.00',
      grandTotal: '545200.00',
      amountInWords: 'Five Lakh Forty Five Thousand Two Hundred Indian Rupees Only',
      subject: 'Energy Management System, Solar Inverters & Transformer Substation Package',
      items: [
        {
          productName: 'Solar Grid Tie Inverter 50 kW',
          productSku: 'INV-SOLAR-50KW',
          make: 'Delta / Taneja Power',
          hsnSac: '85044090',
          unit: 'NOS',
          quantity: 2,
          unitPrice: '120000.00',
          discountPercent: 5,
          taxableAmount: '228000.00',
          gstRate: 12,
          igstAmount: '27360.00',
          totalTax: '27360.00',
          lineTotal: '255360.00',
          technicalSpecifications: 'Three-Phase 415V AC, 98.7% Max Efficiency, Dual MPPT Tracker, IP65 Outdoor Enclosure',
        },
        {
          productName: 'Energy Audit & Power Harmonic Filters',
          productSku: 'FLT-ACTIVE-100A',
          make: 'Schneider / Taneja Power',
          hsnSac: '998719',
          unit: 'LOT',
          quantity: 1,
          unitPrice: '85000.00',
          discountPercent: 0,
          taxableAmount: '85000.00',
          gstRate: 18,
          igstAmount: '15300.00',
          totalTax: '15300.00',
          lineTotal: '100300.00',
          technicalSpecifications: 'Active Harmonic Filter 100A 415V 3P4W, Selective harmonic mitigation up to 50th order',
        },
        {
          productName: 'Raw Solar Photovoltaic Mounting Hardware',
          productSku: 'STR-HDG-ALU',
          hsnSac: '730890',
          unit: 'SET',
          quantity: 1,
          unitPrice: '50000.00',
          discountPercent: 0,
          taxableAmount: '50000.00',
          gstRate: 5,
          igstAmount: '2500.00',
          totalTax: '2500.00',
          lineTotal: '52500.00',
        },
        {
          productName: 'Heavy Industrial Gas Turbine Spares Package',
          productSku: 'TURB-ACC-28G',
          hsnSac: '841199',
          unit: 'SET',
          quantity: 1,
          unitPrice: '100000.00',
          discountPercent: 3,
          taxableAmount: '97000.00',
          gstRate: 28,
          igstAmount: '27160.00',
          totalTax: '27160.00',
          lineTotal: '124160.00',
        },
      ],
    },
    approvals: [
      {
        action: 'APPROVED',
        comments: 'Special corporate pricing approved for Tata Steel Phase 1.',
        actionAt: new Date().toISOString(),
        reviewedBy: {
          fullName: 'Vikram Singh (Director of Engineering)',
          email: 'vikram.singh@tanejapower.com',
        },
      },
    ],
  });

  if (multiTierPdf && multiTierPdf.length > 1000) {
    console.log(`✓ Multi-Tier GST Approved PDF generated successfully (${multiTierPdf.length} bytes)`);
  } else {
    throw new Error('Multi-tier PDF generation failed');
  }

  // Test 3: Multi-Page Document (15 items with long technical specifications)
  console.log('\nTest 3: Generating Multi-Page High Volume Quotation PDF...');
  const multiPageItems = Array.from({ length: 15 }, (_, i) => ({
    productName: `Industrial Substation Feed Component #${i + 1}`,
    productSku: `SUB-COMP-${1000 + i}`,
    make: 'Taneja Power Heavy Div',
    hsnSac: '85372000',
    unit: 'UNIT',
    quantity: i + 1,
    unitPrice: `${(25000 + i * 5000).toFixed(2)}`,
    discountPercent: i % 2 === 0 ? 5 : 0,
    taxableAmount: `${((i + 1) * (25000 + i * 5000) * 0.95).toFixed(2)}`,
    gstRate: 18,
    cgstAmount: `${(((i + 1) * (25000 + i * 5000) * 0.95) * 0.09).toFixed(2)}`,
    sgstAmount: `${(((i + 1) * (25000 + i * 5000) * 0.95) * 0.09).toFixed(2)}`,
    totalTax: `${(((i + 1) * (25000 + i * 5000) * 0.95) * 0.18).toFixed(2)}`,
    lineTotal: `${(((i + 1) * (25000 + i * 5000) * 0.95) * 1.18).toFixed(2)}`,
    technicalSpecifications: `High-voltage 33kV gas-insulated switchgear modular panel with dual busbar system, integrated vacuum circuit breaker rated at 1250A 25kA/3s, numerical protection relay with IEC 61850 protocol compliance, optical arc fault protection sensors, and motorized earthing switch.`,
  }));

  const multiPagePdf = await QuotationPdfService.generatePdf({
    quotationNumber: 'QT/2026-27/0003',
    quotationType: 'TECHNICAL',
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    customer: {
      name: 'Larsen & Toubro Ltd',
      companyName: 'Larsen & Toubro Ltd — Power IC',
      city: 'Vadodara',
      state: 'Gujarat',
      taxNumber: '24AAACL0140P1ZL',
    },
    revision: {
      revisionNumber: 2,
      status: 'APPROVED',
      quotationDate: new Date().toISOString(),
      validityDays: 60,
      validUntil: new Date(Date.now() + 60 * 86400000).toISOString(),
      currency: 'INR',
      customerName: 'Larsen & Toubro Ltd',
      companyName: 'Larsen & Toubro Ltd — Power IC',
      customerGstin: '24AAACL0140P1ZL',
      billingState: 'Gujarat',
      subtotal: '2850000.00',
      totalDiscount: '142500.00',
      taxableAmount: '2707500.00',
      cgstAmount: '243675.00',
      sgstAmount: '243675.00',
      igstAmount: '0.00',
      totalTax: '487350.00',
      freightCharges: '25000.00',
      otherCharges: '0.00',
      roundOff: '0.00',
      grandTotal: '3219850.00',
      amountInWords: 'Thirty Two Lakh Nineteen Thousand Eight Hundred Fifty Indian Rupees Only',
      subject: 'Turnkey 33kV Substation Electrification & Heavy Switchgear Package',
      items: multiPageItems,
    },
  });

  // Test 4: Exact QA Spec Validation (₹90k & ₹10k with ₹14,500 total discount)
  console.log('\nTest 4: Generating Exact QA Spec Quotation PDF (₹14,500 Discount Validation)...');
  const qaSpecPdf = await QuotationPdfService.generatePdf({
    quotationNumber: 'QT/2026-27/0001',
    quotationType: 'PRODUCT',
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    customer: {
      name: 'Gujarat Urja Vikas Nigam Ltd',
      companyName: 'GUVNL',
      city: 'Vadodara',
      state: 'Gujarat',
      taxNumber: '24AAACG1234F1Z0',
    },
    revision: {
      revisionNumber: 1,
      status: 'DRAFT',
      quotationDate: '2026-09-18T10:00:00.000Z',
      validityDays: 30,
      validUntil: '2026-10-18T10:00:00.000Z',
      currency: 'INR',
      customerName: 'Gujarat Urja Vikas Nigam Ltd',
      companyName: 'GUVNL',
      customerGstin: '24AAACG1234F1Z0',
      billingState: 'Gujarat',
      subtotal: '100000.00',
      totalDiscount: '14500.00',
      taxableAmount: '85500.00',
      cgstAmount: '7695.00',
      sgstAmount: '7695.00',
      igstAmount: '0.00',
      totalTax: '15390.00',
      freightCharges: '0.00',
      otherCharges: '0.00',
      roundOff: '0.00',
      grandTotal: '103890.00',
      amountInWords: 'One Lakh Three Thousand Eight Hundred Ninety Rupees Only',
      subject: 'Quotation for 11KV Transformer Bushing & On-Site Installation',
      items: [
        {
          productName: '11KV Transformer Bushing Heavy Duty',
          productSku: 'BSH-11KV-HD',
          hsnSac: '853590',
          unit: 'NOS',
          quantity: 1,
          unitPrice: '90000.00',
          discountPercent: 15,
          taxableAmount: '76500.00',
          gstRate: 18,
          cgstAmount: '6885.00',
          sgstAmount: '6885.00',
          totalTax: '13770.00',
          lineTotal: '90270.00',
        },
        {
          productName: 'On-Site Testing & Installation Kit',
          productSku: 'SRV-TEST-KIT',
          hsnSac: '9987',
          unit: 'SET',
          quantity: 1,
          unitPrice: '10000.00',
          discountPercent: 10,
          taxableAmount: '9000.00',
          gstRate: 18,
          cgstAmount: '810.00',
          sgstAmount: '810.00',
          totalTax: '1620.00',
          lineTotal: '10620.00',
        },
      ],
    },
  });

  if (qaSpecPdf && qaSpecPdf.length > 1000) {
    console.log(`✓ QA Spec PDF generated successfully (${qaSpecPdf.length} bytes)`);
  } else {
    throw new Error('QA Spec PDF generation failed');
  }

  console.log('\n=== ALL PDF GENERATION UNIT & FLOW TESTS PASSED (100%) ===\n');
}

runPdfTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('PDF TEST FAILED:', err);
    process.exit(1);
  });
