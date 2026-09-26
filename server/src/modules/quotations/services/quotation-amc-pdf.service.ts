import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { CompanyProfileConfig, PdfQuotationData, DEFAULT_COMPANY_CONFIG } from './quotation-pdf.service.js';

const formatCurrency = (val: string | number | undefined) => {
  const num = Number(val) || 0;
  return (
    'Rs. ' +
    new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  );
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
   * Helper to draw crisp vector checkmark without relying on missing font glyphs
   */
  private static drawCheckmark(doc: PDFKit.PDFDocument, x: number, y: number, color = '#0284c7', size = 8) {
    doc.save();
    doc.strokeColor(color).lineWidth(1.2).lineCap('round').lineJoin('round');
    doc
      .moveTo(x, y + size * 0.5)
      .lineTo(x + size * 0.35, y + size * 0.85)
      .lineTo(x + size * 0.9, y + size * 0.15)
      .stroke();
    doc.restore();
  }

  /**
   * Helper to draw crisp vector crossmark (X) without font encoding issues
   */
  private static drawCrossmark(doc: PDFKit.PDFDocument, x: number, y: number, color = '#dc2626', size = 7) {
    doc.save();
    doc.strokeColor(color).lineWidth(1.2).lineCap('round');
    doc.moveTo(x, y).lineTo(x + size, y + size).stroke();
    doc.moveTo(x + size, y).lineTo(x, y + size).stroke();
    doc.restore();
  }

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

        // Render Page 2: AMC Commercial Schedule & Pricing
        doc.addPage();
        this.renderPage2CommercialSchedule(doc, data, companyConfig);

        // Render Page 3: General Rules for Service Contracts (Annexure - 1)
        doc.addPage();
        this.renderPage3GeneralRules(doc, data, companyConfig);

        // Render Page 4: Scope of Work, Exclusions & SLA Schedule (Annexure - 2)
        doc.addPage();
        this.renderPage4ScopeAndSla(doc, data, companyConfig);

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
      .fontSize(10.5)
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
   * PAGE 1 — AMC OFFER & COVER LETTER (Fills full page elegantly)
   */
  private static renderPage1OfferLetter(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    this.renderHeader(doc, data, company, 'ANNUAL MAINTENANCE OFFER');

    const rev = data.revision as any;
    const contentWidth = doc.page.width - 72;
    const customerName = rev.companyName || rev.customerName || data.customer?.companyName || data.customer?.name || 'Valued Customer';
    const address = [rev.billingAddress, rev.billingCity, rev.billingState, rev.billingPincode].filter(Boolean).join(', ') || 'Address on record';
    const firstItem = rev.items && rev.items.length > 0 ? rev.items[0] : null;
    const equipTitle = firstItem ? `${firstItem.equipmentConfiguration || ''} ${firstItem.productName || 'Equipment'}`.trim() : 'Equipment';

    // 1. Recipient Card (y = 126, height = 58)
    const recipY = 126;
    doc
      .roundedRect(36, recipY, contentWidth, 58, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('PROPOSAL SUBMITTED TO:', 46, recipY + 6)
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#0f172a')
      .text(customerName, 46, recipY + 18)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#475569')
      .text(address, 46, recipY + 32, { width: 290 })

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('END USER FACILITY:', 350, recipY + 6)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text(rev.endUser || customerName, 350, recipY + 18, { width: 170 })
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#1e40af')
      .text(`AMC Plan: ${rev.amcPlan || 'Ultra Care (UC)'}`, 350, recipY + 32);

    // 2. Subject Banner (y = 192, height = 30)
    const subjY = 192;
    const defaultSubject = `Comprehensive Annual Maintenance Contract (AMC) Offer for ${equipTitle} at your premises.`;
    const subjectText = rev.subject || defaultSubject;

    doc
      .roundedRect(36, subjY, contentWidth, 30, 4)
      .fillAndStroke('#eff6ff', '#bfdbfe');

    // Blue accent bar on the left
    doc
      .rect(36, subjY, 4, 30)
      .fill('#1e40af');

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#1e40af')
      .text(`SUB: ${subjectText}`, 48, subjY + 9, { width: contentWidth - 24, lineBreak: false });

    // 3. Salutation & Executive Body Text (y = 230)
    let bodyY = 230;
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('Dear Sir/Madam,', 36, bodyY);

    bodyY += 14;
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#1e293b')
      .text(
        'We express our sincere gratitude for your continued patronship and interest in Taneja Power Systems. With reference to your inquiry and our technical discussion, we take immense pleasure in submitting our formal commercial proposal for the Annual Maintenance Contract (AMC) tailored to support your mission-critical electrical power conditioning infrastructure.',
        36,
        bodyY,
        { width: contentWidth, lineGap: 2.5 }
      );

    bodyY += 38;
    doc
      .text(
        'At Taneja Power Systems, our primary goal is to ensure continuous power reliability, minimize unscheduled downtime, and prolong asset longevity. Our engineering wing is staffed with factory-trained certified service engineers equipped with calibrated testing instruments to perform rigorous preventive maintenance routines and ensure prompt emergency breakdown response.',
        36,
        bodyY,
        { width: contentWidth, lineGap: 2.5 }
      );

    // 4. Key Benefits Card (y = 315, height = 175)
    const benefitsBoxY = 315;
    doc
      .roundedRect(36, benefitsBoxY, contentWidth, 175, 6)
      .fillAndStroke('#f0f9ff', '#bae6fd');

    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#0369a1')
      .text('Key Advantages of Taneja Power Annual Maintenance Contract:', 48, benefitsBoxY + 12);

    const benefits = [
      { title: 'Zero Unscheduled Downtime:', desc: 'Top-priority emergency breakdown response within committed SLA turnaround.' },
      { title: 'Asset Life Prolongation:', desc: 'Multi-point preventive health checks, servo calibration, and component testing.' },
      { title: 'Predictable Annual Budget:', desc: 'Fixed maintenance outlay with zero unexpected or out-of-pocket repair costs.' },
      { title: 'Optimized Energy Efficiency:', desc: 'Precision voltage calibration and thermal inspection for minimal power losses.' },
      { title: 'Factory Certified Engineers:', desc: 'Skilled technicians deploying calibrated diagnostic and electrical testing gear.' },
      { title: '100% Genuine OEM Spares:', desc: 'Priority supply of authentic specification-matched replacement components.' },
    ];

    let bRowY = benefitsBoxY + 32;
    benefits.forEach((item) => {
      this.drawCheckmark(doc, 50, bRowY + 1, '#0284c7', 8);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#0f172a')
        .text(item.title + ' ', 66, bRowY, { continued: true, width: contentWidth - 75 })
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#334155')
        .text(item.desc);
      bRowY += 22;
    });

    // 5. Service Highlights 3-Card Grid (y = 505, height = 54)
    const cardY = 505;
    const cardW = (contentWidth - 16) / 3;
    const highlights = [
      { title: '24x7 HELPDESK', sub: 'Priority Emergency Logging' },
      { title: 'OEM QUALITY', sub: 'Genuine Replacement Spares' },
      { title: 'CERTIFIED AUDIT', sub: 'Preventive Health Report' },
    ];

    highlights.forEach((h, idx) => {
      const cx = 36 + idx * (cardW + 8);
      doc
        .roundedRect(cx, cardY, cardW, 54, 4)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#1e40af')
        .text(h.title, cx + 8, cardY + 12, { width: cardW - 16, align: 'center' })
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#475569')
        .text(h.sub, cx + 8, cardY + 28, { width: cardW - 16, align: 'center' });
    });

    // 6. Closing Statements (y = 574)
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#1e293b')
      .text(
        'We trust our proposal meets your exact operational and technical requirements. Should you require any further technical clarifications or commercial adjustments, please feel free to reach our AMC service coordination desk.',
        36,
        574,
        { width: contentWidth, lineGap: 3 }
      )
      .text(
        'Thanking you and assuring you of our highest standard of service at all times.',
        36,
        612
      );

    // 7. Formal Signatory Block (Anchored at y = 655 to 765)
    const sigY = 655;
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.5)
      .moveTo(36, sigY)
      .lineTo(36 + contentWidth, sigY)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#475569')
      .text('Sincerely Yours,', 36, sigY + 10)
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#0f172a')
      .text(`FOR ${company.name.toUpperCase()}`, 36, sigY + 23)
      .moveDown(3)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('AUTHORIZED SIGNATORY', 36, sigY + 68)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text('Industrial Energy & AMC Service Division • Contact: 099988 38762', 36, sigY + 80);

    // Customer acknowledgment placeholder on right side of signatory
    const rightSigX = doc.page.width - 240;
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#64748b')
      .text("CLIENT'S ACKNOWLEDGMENT & STAMP", rightSigX, sigY + 10, { width: 200, align: 'right' })
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#94a3b8')
      .text('(Sign & return duplicate copy as acceptance)', rightSigX, sigY + 68, { width: 200, align: 'right' });
  }

  /**
   * PAGE 2 — AMC COMMERCIAL SCHEDULE & PRICING (Fills full page)
   */
  private static renderPage2CommercialSchedule(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    this.renderHeader(doc, data, company, 'COMMERCIAL SCHEDULE');

    const rev = data.revision as any;
    const contentWidth = doc.page.width - 72;

    // 1. TOP METADATA GRID: CC, Branch, Zone, Plan, End User (y = 126, height = 80)
    const gridY = 126;
    doc
      .roundedRect(36, gridY, contentWidth, 80, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('CUSTOMER / CC:', 44, gridY + 8)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(rev.companyName || rev.customerName || '—', 130, gridY + 8, { width: 190 })

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('CUSTOMER CODE:', 340, gridY + 8)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(rev.customerCode || '—', 430, gridY + 8)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('END USER FACILITY:', 44, gridY + 24)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(rev.endUser || rev.companyName || '—', 130, gridY + 24, { width: 190 })

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('BRANCH / ZONE:', 340, gridY + 24)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`${rev.branch || 'Main'} ${rev.zone ? `(${rev.zone})` : ''}`, 430, gridY + 24)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('AMC PLAN / TYPE:', 44, gridY + 40)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#1e40af')
      .text(rev.amcPlan || 'Ultra Care (UC)', 130, gridY + 40)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('AMC PERIOD:', 340, gridY + 40)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`${formatDate(rev.amcStartDate)} to ${formatDate(rev.amcEndDate)}`, 430, gridY + 40)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('PREVENTIVE VISITS:', 44, gridY + 56)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`${rev.amcServiceFrequency || 'Quarterly'} (${rev.amcScheduledVisits ?? 4} Visits/Year)`, 130, gridY + 56)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('BREAKDOWN VISITS:', 340, gridY + 56)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#047857')
      .text(rev.amcBreakdownVisitType || 'UNLIMITED ON-DEMAND', 430, gridY + 56);

    // 2. COVERED EQUIPMENT TABLE (y = 216)
    const tableHeaderY = 216;
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#0f172a')
      .text('COVERED EQUIPMENT & PRICING SCHEDULE:', 36, tableHeaderY);

    const tableY = tableHeaderY + 16;
    const colX = [36, 60, 190, 265, 335, 385, 465, contentWidth + 36];
    const colW = [24, 130, 75, 70, 50, 80, 58];

    // Table Header
    doc
      .rect(36, tableY, contentWidth, 22)
      .fill('#1e293b');

    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#ffffff')
      .text('SR', colX[0] + 4, tableY + 7, { width: colW[0] - 4, align: 'center' })
      .text('EQUIPMENT / ITEM', colX[1] + 4, tableY + 7, { width: colW[1] - 4 })
      .text('CONFIGURATION', colX[2] + 4, tableY + 7, { width: colW[2] - 4 })
      .text('RATING', colX[3] + 4, tableY + 7, { width: colW[3] - 4 })
      .text('QTY', colX[4] + 4, tableY + 7, { width: colW[4] - 4, align: 'right' })
      .text('AMC RATE/UNIT', colX[5] + 4, tableY + 7, { width: colW[5] - 4, align: 'right' })
      .text('TOTAL (RS.)', colX[6] + 4, tableY + 7, { width: colW[6] - 4, align: 'right' });

    let rowY = tableY + 22;
    const items = rev.items || [];

    items.forEach((item: any, idx: number) => {
      const isEven = idx % 2 === 0;
      const rowHeight = 24;
      doc
        .rect(36, rowY, contentWidth, rowHeight)
        .fill(isEven ? '#ffffff' : '#f8fafc');

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(String(idx + 1), colX[0] + 4, rowY + 7, { width: colW[0] - 4, align: 'center' })
        .font('Helvetica-Bold')
        .text(item.productName || 'STABILIZER', colX[1] + 4, rowY + 7, { width: colW[1] - 4 })
        .font('Helvetica')
        .text(item.equipmentConfiguration || 'Standard', colX[2] + 4, rowY + 7, { width: colW[2] - 4 })
        .text(item.equipmentRating || 'Standard', colX[3] + 4, rowY + 7, { width: colW[3] - 4 })
        .text(`${item.quantity} ${item.unit || 'NOS'}`, colX[4] + 4, rowY + 7, { width: colW[4] - 4, align: 'right' })
        .text(formatCurrency(item.unitPrice), colX[5] + 4, rowY + 7, { width: colW[5] - 4, align: 'right' })
        .font('Helvetica-Bold')
        .text(formatCurrency(item.lineTotal), colX[6] + 4, rowY + 7, { width: colW[6] - 4, align: 'right' });

      rowY += rowHeight;
    });

    // Outer table border
    doc
      .rect(36, tableY, contentWidth, rowY - tableY)
      .stroke('#cbd5e1');

    // 3. HSN, GST & COMMERCIAL TOTALS
    const totalsY = rowY + 12;
    const halfWidth = (contentWidth - 12) / 2;
    const isIntraState = Number(rev.cgstAmount || 0) > 0 || Number(rev.sgstAmount || 0) > 0;
    const hsnCode = items.length > 0 && items[0].hsnSac ? items[0].hsnSac : '998719';
    const gstRateText = items.length > 0 && items[0].gstRate ? `${items[0].gstRate}%` : '18%';

    // Left Totals Box: Tax & Words
    doc
      .roundedRect(36, totalsY, halfWidth, 80, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('HSN / SAC CODE:', 44, totalsY + 8)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(hsnCode, 130, totalsY + 8)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('GST TAX RATE:', 44, totalsY + 23)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`${gstRateText} Extra on Basic Price`, 130, totalsY + 23)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('AMOUNT IN WORDS:', 44, totalsY + 40)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#1e40af')
      .text(`"${rev.amountInWords || 'Rupees Only'}"`, 44, totalsY + 53, { width: halfWidth - 16 });

    // Right Totals Box: Financial Calculation
    const rightBoxX = 36 + halfWidth + 12;
    doc
      .roundedRect(rightBoxX, totalsY, halfWidth, 80, 4)
      .fillAndStroke('#ffffff', '#cbd5e1');

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#475569')
      .text('CAMC Basic Amount:', rightBoxX + 10, totalsY + 7)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(formatCurrency(rev.taxableAmount || rev.subtotal), rightBoxX + 110, totalsY + 7, { align: 'right', width: halfWidth - 120 });

    if (isIntraState) {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text('CGST (9%):', rightBoxX + 10, totalsY + 21)
        .text(formatCurrency(rev.cgstAmount), rightBoxX + 110, totalsY + 21, { align: 'right', width: halfWidth - 120 })
        .text('SGST (9%):', rightBoxX + 10, totalsY + 34)
        .text(formatCurrency(rev.sgstAmount), rightBoxX + 110, totalsY + 34, { align: 'right', width: halfWidth - 120 });
    } else {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text('IGST (18% Inter-State):', rightBoxX + 10, totalsY + 26)
        .text(formatCurrency(rev.igstAmount), rightBoxX + 110, totalsY + 26, { align: 'right', width: halfWidth - 120 });
    }

    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.5)
      .moveTo(rightBoxX + 8, totalsY + 52)
      .lineTo(rightBoxX + halfWidth - 8, totalsY + 52)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('GRAND TOTAL:', rightBoxX + 10, totalsY + 58)
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#1e40af')
      .text(formatCurrency(rev.grandTotal), rightBoxX + 110, totalsY + 58, { align: 'right', width: halfWidth - 120 });

    // 4. OPERATIONAL ENTITLEMENTS SNAPSHOT (y = totalsY + 92, height = 48)
    const entY = totalsY + 92;
    const entColW = (contentWidth - 16) / 3;
    const entitlements = [
      { title: 'PREVENTIVE ROUTINES', desc: `${rev.amcScheduledVisits ?? 4} Scheduled Visits / Year` },
      { title: 'BREAKDOWN VISITS', desc: rev.amcBreakdownVisitType || 'Unlimited Emergency Breakdown Visits' },
      { title: 'SERVICE TIMINGS', desc: 'Mon - Sat: 9:30 AM to 6:30 PM' },
    ];

    entitlements.forEach((e, idx) => {
      const ex = 36 + idx * (entColW + 8);
      doc
        .roundedRect(ex, entY, entColW, 46, 3)
        .fillAndStroke('#f0fdf4', '#bbf7d0');

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#166534')
        .text(e.title, ex + 6, entY + 9, { width: entColW - 12, align: 'center' })
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#14532d')
        .text(e.desc, ex + 6, entY + 24, { width: entColW - 12, align: 'center' });
    });

    // 5. SPECIAL CLAUSES & PAYMENT TERMS (y = entY + 56, height = 48)
    const clausesY = entY + 56;
    doc
      .roundedRect(36, clausesY, contentWidth, 48, 4)
      .fillAndStroke('#fffbeb', '#fde68a');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#b45309')
      .text('PAYMENT TERMS: ', 44, clausesY + 7)
      .font('Helvetica')
      .fillColor('#78350f')
      .text(rev.amcPaymentTerms || '100% Advance along with official Purchase Order.', 125, clausesY + 7)

      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#b45309')
      .text('SPECIAL CLAUSE: ', 44, clausesY + 22)
      .font('Helvetica')
      .fillColor('#78350f')
      .text(
        rev.specialClauses ||
          'Effective strictly upon receipt of 100% advance payment along with official Purchase Order. Expiry date shall not be extended on account of delayed advance payment.',
        125,
        clausesY + 22,
        { width: contentWidth - 135 }
      );

    // 6. MALFUNCTION / ESCALATION MATRIX (y = clausesY + 56, height = 58)
    const escY = clausesY + 56;
    const escColW = contentWidth / 3;
    const escalations = rev.amcEscalations || [];
    const getEsc = (lvl: string) => escalations.find((e: any) => e.level === lvl) || {};

    const escConfigs = [
      { key: 'LEVEL_1', title: 'LEVEL 1: SERVICE DESK', tat: 'Turnaround: < 2 Hours' },
      { key: 'LEVEL_2', title: 'LEVEL 2: AREA MANAGER', tat: 'Turnaround: < 4 Hours' },
      { key: 'LEVEL_3', title: 'LEVEL 3: HEAD OF OPS', tat: 'Turnaround: < 12 Hours' },
    ];

    escConfigs.forEach((cfg, idx) => {
      const x = 36 + idx * escColW;
      const escData = getEsc(cfg.key);
      doc
        .roundedRect(x + 2, escY, escColW - 4, 52, 3)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#1e40af')
        .text(cfg.title, x + 8, escY + 6, { width: escColW - 16 })
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#0284c7')
        .text(cfg.tat, x + 8, escY + 17, { width: escColW - 16 })

        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(escData.contactName || 'Taneja Power Support Desk', x + 8, escY + 28, { width: escColW - 16 })
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#475569')
        .text(`${escData.phone || '099988 38762'} • ${escData.email || 'support@tanejapower.com'}`, x + 8, escY + 39, { width: escColW - 16 });
    });

    // 7. SERVICE PROTOCOL ASSURANCE CALLOUT (y = escY + 60, height = 36)
    const protoY = escY + 60;
    doc
      .roundedRect(36, protoY, contentWidth, 32, 3)
      .fillAndStroke('#f0f9ff', '#bae6fd');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#0369a1')
      .text('OPERATIONAL PROTOCOL ASSURANCE:', 44, protoY + 6)
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#0c4a6e')
      .text(
        'All preventive maintenance visits are conducted using calibrated electrical diagnostic equipment. Priority breakdown visits are attended within committed SLA with genuine OEM spares.',
        44,
        protoY + 17,
        { width: contentWidth - 16 }
      );

    // 8. DUAL SIGNATURE BOXES (Anchored at y = 645 to 765)
    const sigY = 645;
    const boxW = (contentWidth - 16) / 2;

    // Customer Box
    doc
      .roundedRect(36, sigY, boxW, 115, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#1e40af')
      .text("CUSTOMER'S ACCEPTANCE SIGNATURE & STAMP", 46, sigY + 10)
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text('(Sign & return duplicate copy as contract acceptance)', 46, sigY + 22)
      .text('Signature: _________________________________', 46, sigY + 55)
      .text('Authorized Name: __________________________', 46, sigY + 75)
      .text('Designation & Seal: ________________________', 46, sigY + 95);

    // Company Box
    const rightSigX = 36 + boxW + 16;
    doc
      .roundedRect(rightSigX, sigY, boxW, 115, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#1e40af')
      .text(`FOR ${company.name.toUpperCase()}`, rightSigX + 10, sigY + 10, { width: boxW - 20, align: 'right' })
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text('Industrial Heavy Engineering & Power Division', rightSigX + 10, sigY + 22, { width: boxW - 20, align: 'right' })
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text('AUTHORIZED SIGNATORY — AMC DIVISION', rightSigX + 10, sigY + 75, { width: boxW - 20, align: 'right' })
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text(`Location: ${company.addressLine2 || 'Vadodara, Gujarat'} • Date: ${formatDate(rev.quotationDate || data.createdAt)}`, rightSigX + 10, sigY + 95, { width: boxW - 20, align: 'right' });
  }

  /**
   * PAGE 3 — GENERAL RULES FOR SERVICE CONTRACTS (ANNEXURE - 1)
   * Consolidates all 10 clauses (1.0 to 10.0) to fill Page 3 cleanly and completely
   */
  private static renderPage3GeneralRules(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    this.renderHeader(doc, data, company, 'GENERAL RULES — ANNEXURE 1');

    const contentWidth = doc.page.width - 72;

    // Title banner
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#1e40af')
      .text('GENERAL RULES FOR SERVICE CONTRACTS (ANNEXURE - 1)', 36, 126, { align: 'center', width: contentWidth })
      .moveDown(0.3);

    let curY = 142;

    const renderClause = (num: string, title: string, subclauses: string[]) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(`${num} ${title}`, 36, curY);

      curY += 9.5;

      subclauses.forEach((sub) => {
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#334155')
          .text(sub, 36, curY, { width: contentWidth, lineGap: 1.0 });
        curY = doc.y + 1.5;
      });

      curY += 2.5; // spacing between sections
    };

    renderClause('1.0', 'VALIDITY OF CONTRACT', [
      '1.1 The Annual Maintenance Contract (AMC) is valid for one (1) full year commencing from the agreed start date specified in the Commercial Schedule.',
      '1.2 Renewal of the contract shall be by mutual written agreement at least thirty (30) days prior to the expiration date, subject to revised pricing terms if applicable.',
      '1.3 Either party may terminate this AMC by providing a minimum of thirty (30) days\' prior written notice. In case of material breach, the affected party shall provide written notice to the defaulting party and reasonable opportunity to remedy such breach before termination.',
    ]);

    renderClause('2.0', 'SPARES, MATERIALS & REPLACEMENT', [
      '2.1 Defective component parts replaced during service operations shall become the property of Taneja Power Systems unless specifically excluded under comprehensive plan terms.',
      '2.2 Taneja Power reserves sole technical right to determine whether a component part requires on-site repair or unit replacement.',
      '2.3 Replacement parts furnished shall be genuine OEM parts or equivalent specification components meeting original equipment engineering tolerances.',
      '2.4 Standard consumables (cleaning solvents, insulation tapes, minor fasteners) are included; major capital components (transformers, MCCBs, capacitors) are excluded.',
    ]);

    renderClause('3.0', 'TOOLS, INSTRUMENTS & MANPOWER', [
      '3.1 Taneja Power service personnel shall bring calibrated electrical testing instruments, vacuum blowers, and diagnostic equipment necessary to perform preventive routine checkups.',
      '3.2 The customer shall provide necessary unskilled manual assistance (lifting, panel door opening access) where heavy equipment handling is required at the installation site.',
    ]);

    renderClause('4.0', 'OBLIGATIONS & RIGHTS OF THE PARTIES', [
      '4.1 Customer shall ensure that equipment is operated strictly within rated electrical parameters (voltage variation, current limits, ambient temperature thresholds).',
      '4.2 Customer agrees to maintain an on-site Service & Maintenance Log Book, recording daily voltage/current readings and noting abnormal equipment performance.',
      '4.3 Customer shall maintain adequate cleanliness, ventilation, and dust-free environmental conditions around covered equipment installation areas.',
      '4.4 Customer shall notify Taneja Power service desk immediately upon noticing any malfunction or abnormal sound/temperature rise.',
      '4.5 Environmental Damage: Damage to the covered equipment or its ancillaries arising from environmental conditions, including excessive dust, moisture, flooding, unsuitable temperature or other adverse site conditions, shall not be covered under this AMC.',
      '4.6 Customer Access & Cooperation: The customer shall make the covered equipment available to Taneja Power service personnel for scheduled maintenance and breakdown service and shall provide necessary access, operational cooperation and assistance required to perform the maintenance work.',
      '4.7 Equipment Modification: Any relocation, modification, alteration or extension of the covered equipment or installation without prior written approval from Taneja Power may result in modification of the AMC terms or exclusion of the affected equipment from service coverage.',
    ]);

    renderClause('5.0', 'GROUNDS FOR DISCHARGE FROM LIABILITY (FORCE MAJEURE)', [
      '5.1 Taneja Power Systems shall not be held liable for failure or delay in performing service obligations resulting from acts of God, war, civil commotion, strikes, lockouts, government restrictions, severe flooding, or circumstances beyond reasonable control.',
    ]);

    renderClause('6.0', 'PRICE & TAXATION', [
      '6.1 The quoted AMC price is based on economic rates at quotation date. All applicable statutory levies, government duties, taxes or charges imposed or revised by any competent authority during the validity or execution of the AMC shall be borne by the customer and charged additionally wherever applicable.',
    ]);

    renderClause('7.0', 'PAYMENT TERMS & ADVANCE CONDITIONS', [
      '7.1 Annual Maintenance Contract fees are payable 100% in advance along with the official Purchase Order unless a quarterly payment schedule has been explicitly executed in writing.',
      '7.2 Delay in advance payment beyond fifteen (15) days from quotation agreement shall entitle Taneja Power to withhold service visits without extending contract expiry.',
    ]);

    renderClause('8.0', 'GENERAL PROVISIONS, COMPLIANCE & NOTICES', [
      '8.1 This contract establishes a Principal-to-Principal business relationship. Neither party is authorized to bind the other in external commercial obligations.',
      '8.2 Technical specifications, single-line diagrams, and operational data shared during service visits shall remain strictly confidential between Taneja Power and the customer.',
      '8.3 Insurance: Taneja Power\'s insurance responsibility shall be limited to its own materials and personnel deployed at the customer\'s site for execution of AMC services. The customer shall remain responsible for insurance of its equipment, premises and other property.',
      '8.4 Compliance: Taneja Power shall comply with applicable laws, rules, regulations and statutory requirements relating to the services performed under this AMC.',
      '8.5 Notices: Any formal notice or communication under this AMC shall be made in writing and delivered to the respective party at its registered or officially communicated address, email address or other officially designated communication channel.',
    ]);

    renderClause('9.0', 'LIMITATION OF LIABILITY', [
      '9.1 In no event shall Taneja Power be liable for indirect, incidental, special, or consequential damages, including loss of production, revenue, or business interruption.',
    ]);

    renderClause('10.0', 'DISPUTES & GOVERNING JURISDICTION', [
      '10.1 Any dispute or claim arising out of or relating to this AMC shall be resolved amicably through mutual executive consultation.',
      '10.2 Failing amicable settlement within thirty (30) days, disputes shall be referred to sole arbitration in accordance with the Arbitration and Conciliation Act, 1996 of India.',
      '10.3 The seat and venue of arbitration shall be Vadodara, Gujarat, and courts at Vadodara shall exercise exclusive legal jurisdiction.',
    ]);

    // Bottom confirmation bar (y = 732 to 764)
    doc
      .roundedRect(36, 732, contentWidth, 32, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#1e40af')
      .text('ANNEXURE - 1 ACKNOWLEDGMENT:', 44, 737)
      .font('Helvetica')
      .fontSize(6.5)
      .fillColor('#475569')
      .text(
        'The general rules above form an integral part of this AMC Proposal. By issuing a Purchase Order, the customer acknowledges and accepts all terms in full.',
        44,
        748,
        { width: contentWidth - 16 }
      );
  }

  /**
   * PAGE 4 — SCOPE OF WORK, EXCLUSIONS & SERVICE SLA (ANNEXURE - 2)
   * Fills full page cleanly and beautifully
   */
  private static renderPage4ScopeAndSla(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    this.renderHeader(doc, data, company, 'SCOPE OF WORK & SERVICE SLA');

    const rev = data.revision as any;
    const contentWidth = doc.page.width - 72;

    // Centered Title
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1e40af')
      .text('ANNEXURE - 2: PREVENTIVE MAINTENANCE SCOPE & SERVICE SLA', 36, 126, { align: 'center', width: contentWidth });

    // 1. SCOPE OF WORK SECTION (y = 146, height = 96)
    const scopeBoxY = 146;
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('1. PREVENTIVE MAINTENANCE SCOPE OF WORK:', 36, scopeBoxY);

    const scopeItems =
      rev.amcScope && rev.amcScope.length > 0
        ? rev.amcScope
        : [
            { description: 'Servicing of Stabilizer & Cleaning of Control Cards' },
            { description: 'Check Input & Output Voltage Variation & Calibration' },
            { description: 'Check Input Current & Output Current Balance' },
            { description: 'Auto & Manual Facility Operation Check' },
            { description: 'Check Servo Motor Condition & Gearbox Lubrication' },
            { description: 'Check Cut Off Switch, Relay Trip & Digital Display' },
          ];

    const sCardY = scopeBoxY + 13;
    doc
      .roundedRect(36, sCardY, contentWidth, 76, 4)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    const halfScopeW = (contentWidth - 24) / 2;
    scopeItems.forEach((s: any, idx: number) => {
      const colIdx = idx % 2;
      const rowIdx = Math.floor(idx / 2);
      const sx = 44 + colIdx * (halfScopeW + 16);
      const sy = sCardY + 7 + rowIdx * 22;

      this.drawCheckmark(doc, sx, sy + 2, '#0284c7', 8);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#1e40af')
        .text(`${idx + 1}.`, sx + 14, sy + 1)
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(s.description, sx + 26, sy + 1, { width: halfScopeW - 30 });
    });

    // 2. EXCLUSIONS SECTION (y = 246, height = 78)
    const exHeaderY = 246;
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#b91c1c')
      .text('2. EXCLUDED EQUIPMENT & BOUNDARIES (STRICTLY OUTSIDE AMC SCOPE):', 36, exHeaderY);

    const exclusionItems =
      rev.amcExclusions && rev.amcExclusions.length > 0
        ? rev.amcExclusions
        : [
            { description: 'Transformer & High Voltage Coils' },
            { description: 'MCCB / Main Breakers & Switchgear' },
            { description: 'Capacitor Banks & External Supply Cabling' },
          ];

    const exCardY = exHeaderY + 13;
    doc
      .roundedRect(36, exCardY, contentWidth, 64, 4)
      .fillAndStroke('#fef2f2', '#fca5a5');

    const halfExW = (contentWidth - 24) / 2;
    exclusionItems.forEach((e: any, idx: number) => {
      const colIdx = idx % 2;
      const rowIdx = Math.floor(idx / 2);
      const exX = 44 + colIdx * (halfExW + 16);
      const exY = exCardY + 7 + rowIdx * 17;

      this.drawCrossmark(doc, exX, exY + 2, '#dc2626', 7);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#991b1b')
        .text(`${e.description} ARE EXCLUDED`, exX + 14, exY + 1, { width: halfExW - 20 });
    });

    doc
      .font('Helvetica')
      .fontSize(6.8)
      .fillColor('#7f1d1d')
      .text(
        '* Note: Any repair, replacement, overhaul, modification, additional service or work not specifically included in the AMC scope shall be carried out only upon customer authorization and shall be charged separately at applicable rates.',
        44,
        exCardY + 41,
        { width: contentWidth - 16, lineGap: 1.0 }
      );

    // 3. PREVENTIVE MAINTENANCE ACTIVITY CHECKLIST MATRIX (y = 334, height = 108)
    const tableTitleY = 334;
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('3. PREVENTIVE MAINTENANCE ACTIVITY CHECKLIST & FREQUENCY:', 36, tableTitleY);

    const actTableY = tableTitleY + 13;
    const actColX = [36, 60, 260, 360, 460, contentWidth + 36];
    const actColW = [24, 200, 100, 100, 63];

    // Table Header
    doc
      .rect(36, actTableY, contentWidth, 18)
      .fill('#1e293b');

    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#ffffff')
      .text('SR', actColX[0] + 4, actTableY + 5, { width: actColW[0] - 4, align: 'center' })
      .text('MAINTENANCE ACTIVITY', actColX[1] + 4, actTableY + 5, { width: actColW[1] - 4 })
      .text('FREQUENCY', actColX[2] + 4, actTableY + 5, { width: actColW[2] - 4 })
      .text('INSPECTION METHOD', actColX[3] + 4, actTableY + 5, { width: actColW[3] - 4 })
      .text('STATUS', actColX[4] + 4, actTableY + 5, { width: actColW[4] - 4, align: 'center' });

    const activities = [
      { sr: '1', act: 'Control Card Dusting & Electronic Calibration', freq: 'Quarterly', method: 'Voltage Meter & Calibrator', status: 'Mandatory' },
      { sr: '2', act: 'Servo Motor Brushes & Drive Chain Lubrication', freq: 'Quarterly', method: 'Physical Inspection & Grease', status: 'Mandatory' },
      { sr: '3', act: 'Input / Output Voltage & Current Balance Test', freq: 'Quarterly', method: 'Digital Multimeter Readings', status: 'Mandatory' },
      { sr: '4', act: 'High/Low Voltage Cut-Off & Safety Relay Trip Test', freq: 'Quarterly', method: 'Simulated Trip Test', status: 'Mandatory' },
      { sr: '5', act: 'Terminal Torque Tightening & Thermal Scan', freq: 'Bi-Annually', method: 'Torque Wrench & IR Camera', status: 'Scheduled' },
    ];

    let actRowY = actTableY + 18;
    activities.forEach((a, idx) => {
      const isEven = idx % 2 === 0;
      doc
        .rect(36, actRowY, contentWidth, 15)
        .fill(isEven ? '#ffffff' : '#f8fafc');

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#0f172a')
        .text(a.sr, actColX[0] + 4, actRowY + 4, { width: actColW[0] - 4, align: 'center' })
        .text(a.act, actColX[1] + 4, actRowY + 4, { width: actColW[1] - 4 })
        .text(a.freq, actColX[2] + 4, actRowY + 4, { width: actColW[2] - 4 })
        .text(a.method, actColX[3] + 4, actRowY + 4, { width: actColW[3] - 4 })
        .font('Helvetica-Bold')
        .fillColor('#0284c7')
        .text(a.status, actColX[4] + 4, actRowY + 4, { width: actColW[4] - 4, align: 'center' });

      actRowY += 15;
    });

    doc
      .rect(36, actTableY, contentWidth, actRowY - actTableY)
      .stroke('#cbd5e1');

    // 4. EMERGENCY BREAKDOWN & SLA COMMITMENT (y = 450, height = 54)
    const slaHeaderY = 450;
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('4. EMERGENCY BREAKDOWN PROTOCOL & SLA COMMITMENT:', 36, slaHeaderY);

    const slaCardY = slaHeaderY + 13;
    const slaColW = (contentWidth - 16) / 3;
    const slaMetrics = [
      { title: 'FIRST RESPONSE SLA', metric: '< 30 Minutes', desc: 'Ticket logging & remote technical guidance' },
      { title: 'ON-SITE RESPONSE SLA', metric: '2 to 4 Hours', desc: 'Engineer at site for urban & industrial belts' },
      { title: 'CRITICAL SPARES SLA', metric: '< 24 Hours', desc: 'Direct dispatch from central warehouse' },
    ];

    slaMetrics.forEach((m, idx) => {
      const sx = 36 + idx * (slaColW + 8);
      doc
        .roundedRect(sx, slaCardY, slaColW, 44, 3)
        .fillAndStroke('#eff6ff', '#bfdbfe');

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#1e40af')
        .text(m.title, sx + 6, slaCardY + 5, { width: slaColW - 12, align: 'center' })
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#0369a1')
        .text(m.metric, sx + 6, slaCardY + 17, { width: slaColW - 12, align: 'center' })
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#475569')
        .text(m.desc, sx + 6, slaCardY + 29, { width: slaColW - 12, align: 'center' });
    });

    // 5. STANDARD AMC OPERATIONAL CONDITIONS (y = 518, height = 70)
    const condY = 518;
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text('5. OPERATIONAL GUIDELINES & SITE SAFETY:', 36, condY);

    const conditions = [
      'Maintenance visits are conducted during standard business working hours (9:30 AM to 6:30 PM, Monday through Saturday).',
      'The customer shall ensure prior plant shutdown clearance and safe access around the covered equipment during visits.',
      'The customer shall provide and maintain necessary site safety arrangements and, where required, auxiliary equipment and personnel for safe lifting, handling and transportation of equipment connected with the maintenance activity.',
      'Any unauthorized modifications, third-party overhauls, or seal breaches shall void warranty and AMC coverage.',
      'Consequential production loss, indirect financial damages, or utility blackout losses are strictly disclaimed.',
    ];

    let cRowY = condY + 13;
    conditions.forEach((c) => {
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#334155')
        .text(`• ${c}`, 44, cRowY, { width: contentWidth - 16, lineGap: 1.0 });
      cRowY = doc.y + 2.5;
    });

    // 6. CONTRACT EXECUTION & AUTHORIZED SIGNATURE BOXES (Anchored at y = 645 to 765)
    const endSigY = 645;
    const boxW = (contentWidth - 16) / 2;

    // Customer Box
    doc
      .roundedRect(36, endSigY, boxW, 115, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#1e40af')
      .text('ACCEPTED & CONFIRMED BY CUSTOMER', 46, endSigY + 10)
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text('(Official Acceptance of Annexure - 2 Scope & SLA)', 46, endSigY + 22)
      .text('Signature: _________________________________', 46, endSigY + 55)
      .text('Authorized Name: __________________________', 46, endSigY + 75)
      .text('Date & Company Stamp: ______________________', 46, endSigY + 95);

    // Company Box
    const rightBoxX = 36 + boxW + 16;
    doc
      .roundedRect(rightBoxX, endSigY, boxW, 115, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#1e40af')
      .text(`FOR ${company.name.toUpperCase()}`, rightBoxX + 10, endSigY + 10, { width: boxW - 20, align: 'right' })
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text('Technical Operations & AMC Division', rightBoxX + 10, endSigY + 22, { width: boxW - 20, align: 'right' })
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text('AUTHORIZED SIGNATORY — AMC DIVISION', rightBoxX + 10, endSigY + 75, { width: boxW - 20, align: 'right' })
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text(`Issued at: ${company.addressLine2 || 'Vadodara, Gujarat'} • Date: ${formatDate(rev.quotationDate || data.createdAt)}`, rightBoxX + 10, endSigY + 95, { width: boxW - 20, align: 'right' });
  }
}
