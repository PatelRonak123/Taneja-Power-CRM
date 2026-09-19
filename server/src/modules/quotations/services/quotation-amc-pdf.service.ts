import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { CompanyProfileConfig, PdfQuotationData, DEFAULT_COMPANY_CONFIG } from './quotation-pdf.service.js';

const formatCurrency = (val: string | number | undefined) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export class QuotationAmcPdfService {
  /**
   * Generates a dedicated multi-page AMC Quotation PDF document matching Taneja Power AMC reference format
   */
  public static async generatePdf(
    data: PdfQuotationData,
    companyConfig: CompanyProfileConfig = DEFAULT_COMPANY_CONFIG
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36, // 0.5 inch margins
          bufferPages: true,
          info: {
            Title: `AMC Quotation ${data.quotationNumber} Rev ${data.revision.revisionNumber}`,
            Author: 'Taneja Power CRM',
            Subject: data.revision.subject || 'Comprehensive Annual Maintenance Contract Offer',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', (err) => reject(err));

        // Render Page 1: AMC Offer Letter
        this.renderPage1OfferLetter(doc, data, companyConfig);

        // Render Page 2: AMC Commercial Schedule
        doc.addPage();
        this.renderPage2CommercialSchedule(doc, data, companyConfig);

        // Render Page 3: General Rules Part 1
        doc.addPage();
        this.renderPage3GeneralRulesPart1(doc, data, companyConfig);

        // Render Page 4: General Rules Part 2
        doc.addPage();
        this.renderPage4GeneralRulesPart2(doc, data, companyConfig);

        // Render Page 5: Terms & Conditions, Exclusions & Scope of Work
        doc.addPage();
        this.renderPage5TermsAndScope(doc, data, companyConfig);

        // Add dynamic footers (Page X of Y) across all pages
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.page.margins.bottom = 0;
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#64748b')
            .text(
              `Taneja Power — AMC Proposal ${data.quotationNumber} (Rev ${data.revision.revisionNumber}) • Page ${i + 1} of ${range.count}`,
              36,
              doc.page.height - 22,
              { align: 'center', width: doc.page.width - 72, lineBreak: false }
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Helper to draw top corporate header
   */
  private static renderHeader(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig,
    pageTitle: string
  ) {
    const startY = 36;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 72;

    const logoCandidates = [
      path.resolve(process.cwd(), '../client/public/logo.png'),
      path.resolve(process.cwd(), 'client/public/logo.png'),
      path.resolve(process.cwd(), 'public/logo.png'),
    ];

    let logoPath: string | null = null;
    for (const p of logoCandidates) {
      if (fs.existsSync(p)) {
        logoPath = p;
        break;
      }
    }

    if (logoPath) {
      try {
        doc.image(logoPath, 36, startY, { fit: [130, 32] });
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#64748b')
          .text(company.division, 36, startY + 36)
          .text(`${company.addressLine1}, ${company.addressLine2}`, 36, startY + 46)
          .text(`GSTIN: ${company.gstin} • Email: ${company.email} • Phone: ${company.phone}`, 36, startY + 56);
      } catch {
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor('#0f172a')
          .text(company.name, 36, startY)
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#64748b')
          .text(company.division, 36, startY + 16)
          .text(`${company.addressLine1}, ${company.addressLine2}`, 36, startY + 26)
          .text(`GSTIN: ${company.gstin} • Email: ${company.email} • Phone: ${company.phone}`, 36, startY + 36);
      }
    } else {
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#0f172a')
        .text(company.name, 36, startY)
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text(company.division, 36, startY + 16)
        .text(`${company.addressLine1}, ${company.addressLine2}`, 36, startY + 26)
        .text(`GSTIN: ${company.gstin} • Email: ${company.email} • Phone: ${company.phone}`, 36, startY + 36);
    }

    const rightColX = pageWidth - 230;

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#1e40af')
      .text(pageTitle, rightColX - 10, startY, { align: 'right', width: 204 })
      .moveDown(0.2);

    const metaBoxY = startY + 20;
    doc
      .roundedRect(rightColX - 10, metaBoxY, 204, 52, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('Ref No:', rightColX, metaBoxY + 5)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(data.quotationNumber, rightColX + 50, metaBoxY + 5, { align: 'right', width: 136 })

      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('Revision:', rightColX, metaBoxY + 18)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#1e40af')
      .text(`Rev ${data.revision.revisionNumber}`, rightColX + 50, metaBoxY + 18, { align: 'right', width: 136 })

      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('Date:', rightColX, metaBoxY + 31)
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#0f172a')
      .text(formatDate(data.revision.quotationDate || data.createdAt), rightColX + 50, metaBoxY + 31, { align: 'right', width: 136 });

    const sepY = startY + 80;
    doc
      .strokeColor('#1e40af')
      .lineWidth(1)
      .moveTo(36, sepY)
      .lineTo(36 + contentWidth, sepY)
      .stroke();

    doc.y = sepY + 10;
  }

  /**
   * PAGE 1 — AMC OFFER LETTER
   */
  private static renderPage1OfferLetter(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    this.renderHeader(doc, data, company, 'ANNUAL MAINTENANCE OFFER');

    const rev = data.revision as any;
    const customerName = rev.companyName || rev.customerName || data.customer?.companyName || data.customer?.name || 'Valued Customer';
    const address = [rev.billingAddress, rev.billingCity, rev.billingState, rev.billingPincode].filter(Boolean).join(', ') || 'Address on record';
    const firstItem = rev.items && rev.items.length > 0 ? rev.items[0] : null;
    const equipTitle = firstItem ? `${firstItem.equipmentConfiguration || ''} ${firstItem.productName || 'Equipment'}`.trim() : 'Equipment';

    // Date & Recipient Block
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#0f172a')
      .text(`To,`, 36, doc.y)
      .text(customerName, 36, doc.y + 2)
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#334155')
      .text(address, 36, doc.y + 2)
      .moveDown(1.5);

    // Subject
    const defaultSubject = `Offer for Comprehensive Annual Maintenance Contract (AMC) for ${equipTitle} at your premises.`;
    const subjectText = rev.subject || defaultSubject;

    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#1e40af')
      .text(`Sub: ${subjectText}`, 36, doc.y)
      .moveDown(1);

    // Salutation & Intro
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#1e293b')
      .text(`Dear Sir/Madam,`, 36, doc.y)
      .moveDown(0.5)
      .text(
        `We express our sincere gratitude for your continued patronship and interest in Taneja Power Systems. With reference to your inquiry, we take pleasure in submitting our formal proposal for the Annual Maintenance Contract (AMC) tailored to support your electrical infrastructure and maintain peak operational efficiency.`
      )
      .moveDown(0.8)
      .text(
        `At Taneja Power, our primary goal is to ensure continuous power reliability and minimize unscheduled equipment downtime. Our technical service team consists of trained service engineers equipped with calibrated testing instruments to perform rigorous preventive maintenance routines and guarantee rapid emergency response.`
      )
      .moveDown(1.2);

    // Benefits Section Box
    const benefitsBoxY = doc.y;
    doc
      .roundedRect(36, benefitsBoxY, doc.page.width - 72, 135, 6)
      .fillAndStroke('#f0f9ff', '#bae6fd');

    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#0369a1')
      .text('Key Benefits of Taneja Power Annual Maintenance Contract:', 48, benefitsBoxY + 10);

    const benefits = [
      'Minimal Chance of Unscheduled Business & Operational Interruption',
      'Prolonged Equipment Service Life & Preserved Asset Value',
      'Fixed Known Annual Maintenance Budget without Unexpected Outlay',
      'Optimized Energy Consumption & Improved Electrical Efficiency',
      'Top Priority Emergency Response & On-site Breakdown Entitlement',
      'Scheduled Preventive Maintenance Visits Conducted at Convenient Work Windows',
    ];

    let bulletY = benefitsBoxY + 28;
    benefits.forEach((benefit) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0284c7')
        .text('✓', 50, bulletY)
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#0f172a')
        .text(benefit, 65, bulletY, { width: doc.page.width - 120 });
      bulletY += 16;
    });

    doc.y = benefitsBoxY + 150;

    // Closing Statement
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#1e293b')
      .text(
        `We trust our proposal meets your exact operational requirements. Should you require any further technical clarifications or adjustments, please do not hesitate to contact our service team.`
      )
      .moveDown(0.8)
      .text(`Thanking you and assuring you of our best service at all times.`)
      .moveDown(1.5);

    // Signatory
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#334155')
      .text('Sincerely Yours,')
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#0f172a')
      .text(`For ${company.name}`)
      .moveDown(2.5)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('Authorized Signatory')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text('Industrial Energy & AMC Service Division');
  }

  /**
   * PAGE 2 — AMC COMMERCIAL SCHEDULE
   */
  private static renderPage2CommercialSchedule(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    this.renderHeader(doc, data, company, 'COMMERCIAL SCHEDULE');

    const rev = data.revision as any;
    const contentWidth = doc.page.width - 72;

    // TOP METADATA GRID: CC, Branch, Zone, Plan, End User
    const gridY = doc.y;
    doc
      .roundedRect(36, gridY, contentWidth, 70, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('CUSTOMER / CC:', 44, gridY + 6)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(rev.companyName || rev.customerName || '—', 130, gridY + 6)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('CUSTOMER CODE:', 340, gridY + 6)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(rev.customerCode || '—', 430, gridY + 6)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('END USER FACILITY:', 44, gridY + 20)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(rev.endUser || rev.companyName || '—', 130, gridY + 20)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('BRANCH / ZONE:', 340, gridY + 20)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`${rev.branch || 'Main'} ${rev.zone ? `(${rev.zone})` : ''}`, 430, gridY + 20)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('AMC PLAN / TYPE:', 44, gridY + 34)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#1e40af')
      .text(rev.amcPlan || 'Ultra Care (UC)', 130, gridY + 34)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('AMC PERIOD:', 340, gridY + 34)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`${formatDate(rev.amcStartDate)} to ${formatDate(rev.amcEndDate)}`, 430, gridY + 34)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('PREVENTIVE VISITS:', 44, gridY + 48)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`${rev.amcServiceFrequency || 'Quarterly'} (${rev.amcScheduledVisits ?? 4} Visits/Year)`, 130, gridY + 48)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('BREAKDOWN VISITS:', 340, gridY + 48)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#047857')
      .text(rev.amcBreakdownVisitType || 'UNLIMITED', 430, gridY + 48);

    doc.y = gridY + 80;

    // COVERED EQUIPMENT TABLE
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#0f172a')
      .text('COVERED EQUIPMENT & PRICING SCHEDULE:', 36, doc.y)
      .moveDown(0.4);

    const tableY = doc.y;
    const colX = [36, 60, 190, 260, 330, 380, 460, contentWidth + 36];
    const colW = [24, 130, 70, 70, 50, 80, 62];

    // Table Header
    doc
      .rect(36, tableY, contentWidth, 20)
      .fill('#1e293b');

    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#ffffff')
      .text('SR', colX[0] + 4, tableY + 6, { width: colW[0] - 4, align: 'center' })
      .text('EQUIPMENT / ITEM', colX[1] + 4, tableY + 6, { width: colW[1] - 4 })
      .text('CONFIGURATION', colX[2] + 4, tableY + 6, { width: colW[2] - 4 })
      .text('RATING', colX[3] + 4, tableY + 6, { width: colW[3] - 4 })
      .text('QTY', colX[4] + 4, tableY + 6, { width: colW[4] - 4, align: 'right' })
      .text('AMC AMOUNT/UNIT', colX[5] + 4, tableY + 6, { width: colW[5] - 4, align: 'right' })
      .text('TOTAL (RS.)', colX[6] + 4, tableY + 6, { width: colW[6] - 4, align: 'right' });

    let rowY = tableY + 20;
    const items = rev.items || [];

    items.forEach((item: any, idx: number) => {
      const isEven = idx % 2 === 0;
      doc
        .rect(36, rowY, contentWidth, 20)
        .fill(isEven ? '#ffffff' : '#f8fafc');

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(String(idx + 1), colX[0] + 4, rowY + 6, { width: colW[0] - 4, align: 'center' })
        .font('Helvetica-Bold')
        .text(item.productName || 'STABILIZER', colX[1] + 4, rowY + 6, { width: colW[1] - 4 })
        .font('Helvetica')
        .text(item.equipmentConfiguration || 'Standard', colX[2] + 4, rowY + 6, { width: colW[2] - 4 })
        .text(item.equipmentRating || 'Standard', colX[3] + 4, rowY + 6, { width: colW[3] - 4 })
        .text(`${item.quantity} ${item.unit || ''}`, colX[4] + 4, rowY + 6, { width: colW[4] - 4, align: 'right' })
        .text(formatCurrency(item.unitPrice), colX[5] + 4, rowY + 6, { width: colW[5] - 4, align: 'right' })
        .font('Helvetica-Bold')
        .text(formatCurrency(item.lineTotal), colX[6] + 4, rowY + 6, { width: colW[6] - 4, align: 'right' });

      rowY += 20;
    });

    // Outer table border
    doc
      .rect(36, tableY, contentWidth, rowY - tableY)
      .stroke('#cbd5e1');

    doc.y = rowY + 12;

    // HSN, GST & COMMERCIAL TOTALS
    const totalsY = doc.y;
    const halfWidth = (contentWidth - 12) / 2;
    const isIntraState = Number(rev.cgstAmount || 0) > 0 || Number(rev.sgstAmount || 0) > 0;
    const hsnCode = items.length > 0 && items[0].hsnSac ? items[0].hsnSac : '998719';
    const gstRateText = items.length > 0 && items[0].gstRate ? `${items[0].gstRate}%` : '18%';

    // Left Totals Box: Tax & Words
    doc
      .roundedRect(36, totalsY, halfWidth, 75, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('HSN / SAC CODE:', 44, totalsY + 6)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(hsnCode, 130, totalsY + 6)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('GST TAX RATE:', 44, totalsY + 20)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`${gstRateText} Extra on Basic Price`, 130, totalsY + 20)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('AMOUNT IN WORDS:', 44, totalsY + 36)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#1e40af')
      .text(`"${rev.amountInWords || 'Rupees Only'}"`, 44, totalsY + 48, { width: halfWidth - 16 });

    // Right Totals Box: Calculation Breakdown
    const rightBoxX = 36 + halfWidth + 12;
    doc
      .roundedRect(rightBoxX, totalsY, halfWidth, 75, 4)
      .fillAndStroke('#ffffff', '#cbd5e1');

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#475569')
      .text('CAMC Basic Amount:', rightBoxX + 10, totalsY + 6)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(`₹ ${formatCurrency(rev.taxableAmount || rev.subtotal)}`, rightBoxX + 110, totalsY + 6, { align: 'right', width: halfWidth - 120 });

    if (isIntraState) {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text('CGST:', rightBoxX + 10, totalsY + 20)
        .text(`₹ ${formatCurrency(rev.cgstAmount)}`, rightBoxX + 110, totalsY + 20, { align: 'right', width: halfWidth - 120 })
        .text('SGST:', rightBoxX + 10, totalsY + 32)
        .text(`₹ ${formatCurrency(rev.sgstAmount)}`, rightBoxX + 110, totalsY + 32, { align: 'right', width: halfWidth - 120 });
    } else {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text('IGST (Inter-State):', rightBoxX + 10, totalsY + 24)
        .text(`₹ ${formatCurrency(rev.igstAmount)}`, rightBoxX + 110, totalsY + 24, { align: 'right', width: halfWidth - 120 });
    }

    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.5)
      .moveTo(rightBoxX + 8, totalsY + 50)
      .lineTo(rightBoxX + halfWidth - 8, totalsY + 50)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#0f172a')
      .text('GRAND TOTAL:', rightBoxX + 10, totalsY + 56)
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1e40af')
      .text(`₹ ${formatCurrency(rev.grandTotal)}`, rightBoxX + 110, totalsY + 56, { align: 'right', width: halfWidth - 120 });

    doc.y = totalsY + 86;

    // SPECIAL CLAUSES & PAYMENT TERMS
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text('SPECIAL AMC CLAUSES & PAYMENT TERMS:', 36, doc.y)
      .moveDown(0.3);

    const clausesY = doc.y;
    doc
      .roundedRect(36, clausesY, contentWidth, 42, 4)
      .fillAndStroke('#fffbeb', '#fde68a');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#b45309')
      .text('PAYMENT TERMS: ', 44, clausesY + 6)
      .font('Helvetica')
      .fillColor('#78350f')
      .text(rev.amcPaymentTerms || '100% Advance along with Purchase Order.', 120, clausesY + 6)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#b45309')
      .text('SPECIAL CLAUSE: ', 44, clausesY + 20)
      .font('Helvetica')
      .fillColor('#78350f')
      .text(
        rev.specialClauses ||
          'Effective only after receiving full advance payment along with official Purchase Order. Expiry date shall not be extended on account of delayed payment.',
        120,
        clausesY + 20,
        { width: contentWidth - 130 }
      );

    doc.y = clausesY + 48;

    // MALFUNCTION / ESCALATION MATRIX
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text('MALFUNCTION REPORTING ESCALATION MATRIX:', 36, doc.y)
      .moveDown(0.3);

    const escY = doc.y;
    const escColW = contentWidth / 3;
    const escalations = rev.amcEscalations || [];
    const getEsc = (lvl: string) => escalations.find((e: any) => e.level === lvl) || {};

    ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].forEach((lvl, idx) => {
      const x = 36 + idx * escColW;
      const escData = getEsc(lvl);
      doc
        .roundedRect(x + 2, escY, escColW - 4, 38, 3)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#1e40af')
        .text(lvl.replace('_', ' '), x + 8, escY + 4)
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(escData.contactName || '—', x + 8, escY + 15)
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(`${escData.phone || ''} ${escData.email ? `• ${escData.email}` : ''}`, x + 8, escY + 26, { width: escColW - 16 });
    });

    doc.y = escY + 46;

    // SIGNATURE AREA
    const sigY = doc.y + 6;
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.5)
      .moveTo(36, sigY)
      .lineTo(36 + contentWidth, sigY)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text("CUSTOMER'S ACCEPTANCE SIGNATURE & STAMP", 36, sigY + 8)
      .text(`FOR ${company.name.toUpperCase()}`, 36, sigY + 8, { align: 'right', width: contentWidth })

      .font('Helvetica')
      .fontSize(7)
      .fillColor('#94a3b8')
      .text('(Sign & return duplicate copy as acceptance)', 36, sigY + 36)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#0f172a')
      .text('AUTHORIZED SIGNATORY', 36, sigY + 36, { align: 'right', width: contentWidth });
  }

  /**
   * PAGE 3 — GENERAL RULES FOR SERVICE CONTRACTS (PART 1)
   */
  private static renderPage3GeneralRulesPart1(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    this.renderHeader(doc, data, company, 'GENERAL RULES — ANNEXURE 1');

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1e40af')
      .text('GENERAL RULES FOR SERVICE CONTRACTS (ANNEXURE - 1)', 36, doc.y, { align: 'center' })
      .moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('1.0 VALIDITY OF CONTRACT')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#334155')
      .text(
        '1.1 The Annual Maintenance Contract (AMC) is valid for a period of one (1) year commencing from the agreed start date specified in the Commercial Schedule.'
      )
      .text(
        '1.2 Renewal of the contract shall be by mutual written agreement at least thirty (30) days prior to the expiration date, subject to revised pricing terms if applicable.'
      )
      .text(
        '1.3 Either party may terminate this agreement upon thirty (30) days written notice in the event of material breach of terms by the other party, subject to a 15-day cure period.'
      )
      .moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('2.0 SPARES, MATERIALS & REPLACEMENT')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#334155')
      .text(
        '2.1 Defective component parts replaced during service operations shall become the property of Taneja Power Systems unless specifically excluded under comprehensive plan terms.'
      )
      .text(
        '2.2 Taneja Power reserves sole technical right to determine whether a component part requires repair or total unit replacement.'
      )
      .text(
        '2.3 Replacement parts furnished shall be genuine OEM parts or equivalent specification components meeting original equipment engineering tolerances.'
      )
      .text(
        '2.4 Standard consumables (such as cleaning solvents, insulation tapes, minor fasteners) are included; major capital components (transformers, MCCBs, capacitors) are subject to contract exclusion boundaries.'
      )
      .moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('2.2.4 TOOLS, INSTRUMENTS & MANPOWER')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#334155')
      .text(
        '2.2.4.1 Taneja Power service personnel shall bring calibrated electrical testing instruments, vacuum blowers, and diagnostic equipment necessary to perform preventive routine checkups.'
      )
      .text(
        '2.2.4.2 The customer shall provide necessary unskilled manual assistance (lifting, panel door opening access) where heavy equipment handling is required at the installation site.'
      )
      .moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('3.0 OBLIGATIONS & RIGHTS OF THE PARTIES')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#334155')
      .text(
        '3.1 The customer shall ensure that equipment is operated strictly within rated electrical parameters (voltage variation, current limits, ambient temperature thresholds).'
      )
      .text(
        '3.2 The customer agrees to maintain an on-site Service & Maintenance Log Book, recording daily voltage/current readings and noting any abnormal equipment performance.'
      )
      .text(
        '3.3 The customer shall maintain adequate cleanliness, ventilation, and dust-free environmental conditions around the covered equipment installation area.'
      )
      .text(
        '3.4 The customer shall notify Taneja Power service desk immediately upon noticing any malfunction or abnormal sound/temperature rise.'
      )
      .text(
        '3.5 Equipment damage caused by external short circuits, phase reversal, lightning strikes, flooding, or unapproved third-party tamper shall void service coverage for that specific breakdown.'
      );
  }

  /**
   * PAGE 4 — GENERAL RULES FOR SERVICE CONTRACTS (PART 2)
   */
  private static renderPage4GeneralRulesPart2(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    this.renderHeader(doc, data, company, 'TERMS & LEGAL CONDITIONS');

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1e40af')
      .text('GENERAL RULES FOR SERVICE CONTRACTS — PART 2', 36, doc.y, { align: 'center' })
      .moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('4.0 GROUNDS FOR DISCHARGE FROM LIABILITY (FORCE MAJEURE)')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#334155')
      .text(
        '4.1 Taneja Power Systems shall not be held liable for failure or delay in performing service obligations resulting from acts of God, war, civil commotion, strikes, lockouts, government restrictions, severe flooding, or circumstances beyond reasonable control.'
      )
      .moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('5.0 PRICE & TAXATION')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#334155')
      .text(
        '5.1 The quoted AMC price is based on economic rates at the time of quotation. Statutory levies, GST, or government taxes introduced post-quotation shall be charged extra at applicable rates.'
      )
      .moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('6.0 PAYMENT TERMS & ADVANCE CONDITIONS')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#334155')
      .text(
        '6.1 Annual Maintenance Contract fees are payable 100% in advance along with the official Purchase Order unless a quarterly payment schedule has been explicitly executed in writing.'
      )
      .text(
        '6.2 Delay in advance payment beyond fifteen (15) days from quotation agreement shall entitle Taneja Power to withhold service visits without extending contract expiry.'
      )
      .moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('7.0 GENERAL PROVISIONS & CONFIDENTIALITY')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#334155')
      .text(
        '7.1 This contract establishes a Principal-to-Principal business relationship. Neither party is authorized to bind the other in external commercial obligations.'
      )
      .text(
        '7.2 Technical specifications, single-line diagrams, and operational data shared during service visits shall remain strictly confidential between Taneja Power and the customer.'
      )
      .moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('10.0 DISPUTES & GOVERNING JURISDICTION')
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#334155')
      .text(
        '10.1 Any dispute, controversy, or claim arising out of or relating to this Annual Maintenance Contract shall be resolved amicably through mutual executive consultation.'
      )
      .text(
        '10.2 Failing amicable settlement within thirty (30) days, disputes shall be referred to sole arbitration in accordance with the Arbitration and Conciliation Act, 1996 of India.'
      )
      .text(
        '10.3 The seat and venue of arbitration shall be Vadodara, Gujarat, and courts at Vadodara shall exercise exclusive legal jurisdiction.'
      );
  }

  /**
   * PAGE 5 — TERMS & CONDITIONS, EXCLUSIONS & SCOPE OF WORK
   */
  private static renderPage5TermsAndScope(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    this.renderHeader(doc, data, company, 'SCOPE OF WORK & EXCLUSIONS');

    const rev = data.revision as any;
    const contentWidth = doc.page.width - 72;

    // SCOPE OF WORK SECTION
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1e40af')
      .text('PREVENTIVE MAINTENANCE SCOPE OF WORK', 36, doc.y)
      .moveDown(0.4);

    const scopeItems = rev.amcScope && rev.amcScope.length > 0
      ? rev.amcScope
      : [
          { description: 'Servicing of Stabilizer & Cleaning of Control Cards' },
          { description: 'Check Input & Output Voltage Variation & Calibration' },
          { description: 'Check Input Current & Output Current Balance' },
          { description: 'Auto & Manual Facility Operation Check' },
          { description: 'Check Servo Motor Condition & Gearbox Lubrication' },
          { description: 'Check Cut Off Switch, Relay Trip & Digital Display' },
        ];

    const scopeY = doc.y;
    doc
      .roundedRect(36, scopeY, contentWidth, scopeItems.length * 16 + 12, 4)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    let curY = scopeY + 8;
    scopeItems.forEach((s: any, idx: number) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#1e40af')
        .text(`${idx + 1}.`, 46, curY)
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#0f172a')
        .text(s.description, 64, curY, { width: contentWidth - 40 });
      curY += 16;
    });

    doc.y = scopeY + scopeItems.length * 16 + 22;

    // EXCLUSIONS SECTION
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#b91c1c')
      .text('EXCLUDED EQUIPMENT & SERVICE BOUNDARIES', 36, doc.y)
      .moveDown(0.4);

    const exclusionItems = rev.amcExclusions && rev.amcExclusions.length > 0
      ? rev.amcExclusions
      : [
          { description: 'Transformer' },
          { description: 'MCCB / Circuit Breakers' },
          { description: 'Capacitor Banks' },
        ];

    const exY = doc.y;
    doc
      .roundedRect(36, exY, contentWidth, exclusionItems.length * 16 + 12, 4)
      .fillAndStroke('#fef2f2', '#fca5a5');

    let curExY = exY + 8;
    exclusionItems.forEach((e: any, idx: number) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#dc2626')
        .text('✕', 46, curExY)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#991b1b')
        .text(`${e.description} ARE STRICTLY EXCLUDED FROM THIS MAINTENANCE CONTRACT`, 64, curExY, { width: contentWidth - 40 });
      curExY += 16;
    });

    doc.y = exY + exclusionItems.length * 16 + 24;

    // ADDITIONAL CONTRACTUAL TERMS SUMMARY
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#0f172a')
      .text('STANDARD AMC SERVICE CONDITIONS:', 36, doc.y)
      .moveDown(0.3);

    const conditions = [
      'Services are conducted during standard business working hours (9:30 AM to 6:30 PM, Monday through Saturday).',
      'After-hours emergency breakdown calls are attended based on engineering team availability.',
      'Third-party overhauls or modifications executed without Taneja Power authorization terminate warranty obligations.',
      'Consequential financial damages or indirect production losses resulting from power equipment trips are disclaimed.',
    ];

    conditions.forEach((cond) => {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#334155')
        .text(`• ${cond}`, 42, doc.y, { width: contentWidth - 10 })
        .moveDown(0.3);
    });

    doc.moveDown(1);

    // SIGNATURE & FOOTER
    const endSigY = doc.y;
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.5)
      .moveTo(36, endSigY)
      .lineTo(36 + contentWidth, endSigY)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`FOR ${company.name.toUpperCase()}`, 36, endSigY + 10, { align: 'right', width: contentWidth })
      .moveDown(2)
      .text('AUTHORIZED SIGNATORY — AMC DIVISION', 36, doc.y, { align: 'right', width: contentWidth });
  }
}
