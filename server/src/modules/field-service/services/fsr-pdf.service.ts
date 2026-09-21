import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { FsrWithDetails } from '../repositories/field-service.repository.js';
import { CompanyProfileConfig, DEFAULT_COMPANY_CONFIG } from '../../quotations/services/quotation-pdf.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FsrPdfService {
  /**
   * Generates a high-quality, multi-page Field Service Report (FSR) PDF document.
   */
  public static async generatePdf(
    data: FsrWithDetails,
    companyConfig: CompanyProfileConfig = DEFAULT_COMPANY_CONFIG
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36, // 0.5 inch (36 pt) margins
          bufferPages: true,
          info: {
            Title: `Field Service Report ${data.fsr.fsrNumber}`,
            Author: 'Taneja Power CRM',
            Subject: `UPS Field Service Visit Report - ${data.customer.name}`,
            Keywords: 'FSR, Field Service, UPS, Battery, Maintenance, Taneja Power',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', (err) => reject(err));

        // 1. Draw Company Header & Document Meta Box
        this.renderHeader(doc, data, companyConfig);

        // 2. Section 1: Customer & Site Details
        this.renderCustomerSection(doc, data);

        // 3. Section 2: UPS & Equipment Details
        this.renderEquipmentSection(doc, data);

        // 4. Section 3: Service Visit & Engineer Details
        this.renderVisitSection(doc, data);

        // 5. Section 4: Site Observations & Electrical Measurements
        this.renderSiteObservationsSection(doc, data);

        // 6. Section 5: Battery System & Readings
        this.renderBatterySection(doc, data);

        // 7. Section 6: Part Replacement Details
        this.renderPartsSection(doc, data);

        // 8. Section 7: Standby Equipment & Commercial Charges
        this.renderStandbyAndChargesSection(doc, data);

        // 9. Section 8: Suggestions & Customer Feedback
        this.renderFeedbackSection(doc, data);

        // 10. Section 9: Sign-Off & Authentications
        this.renderSignOffSection(doc, data);

        // 11. Section 10: Site Photos & Attachments (if available)
        this.renderPhotosSection(doc, data);

        // 12. Dynamic 2-Pass Multi-Page Footers
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.page.margins.bottom = 0; // Prevent accidental auto-page break in footer

          const footerY = doc.page.height - 24;
          const leftMargin = 36;
          const rightMargin = doc.page.width - 36;
          const contentWidth = rightMargin - leftMargin;

          // Thin top rule
          doc
            .strokeColor('#cbd5e1')
            .lineWidth(0.5)
            .moveTo(leftMargin, footerY - 5)
            .lineTo(rightMargin, footerY - 5)
            .stroke();

          // Footer Text Left
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#64748b')
            .text(
              `${companyConfig.name} • Official UPS Service Report`,
              leftMargin,
              footerY,
              { width: contentWidth / 2, align: 'left', lineBreak: false }
            );

          // Footer Text Right (FSR # and accurate Page X of Y)
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#64748b')
            .text(
              `FSR: ${data.fsr.fsrNumber}  |  Page ${i + 1} of ${range.count}`,
              leftMargin + contentWidth / 2,
              footerY,
              { width: contentWidth / 2, align: 'right', lineBreak: false }
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ==========================================
  // HELPER: Resolve Image or Base64 Buffer (Secure)
  // ==========================================
  private static resolveImageBuffer(imageSource?: string | null): Buffer | string | null {
    if (!imageSource || typeof imageSource !== 'string' || imageSource.trim() === '') return null;

    // 1. If base64 data URL
    if (imageSource.startsWith('data:image/')) {
      const commaIdx = imageSource.indexOf(',');
      if (commaIdx !== -1) {
        try {
          return Buffer.from(imageSource.slice(commaIdx + 1), 'base64');
        } catch {
          return null;
        }
      }
    }

    // 2. Strict filesystem path resolution bounded to application uploads/public directory
    const allowedRoots = [
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(process.cwd(), '../client/public'),
      path.resolve(process.cwd(), 'client/public'),
      path.resolve(__dirname, '../../../../uploads'),
    ];

    // Sanitize input: strip path traversal sequences
    const sanitizedBase = path.basename(imageSource.trim());
    if (!sanitizedBase || sanitizedBase === '.' || sanitizedBase === '..') return null;

    const candidatePaths = [
      path.resolve(process.cwd(), 'uploads/fsr/signatures', sanitizedBase),
      path.resolve(process.cwd(), 'uploads/fsr/attachments', sanitizedBase),
      path.resolve(process.cwd(), 'uploads/signatures', sanitizedBase),
      path.resolve(process.cwd(), 'uploads/attachments', sanitizedBase),
      path.resolve(process.cwd(), 'uploads', sanitizedBase),
    ];

    for (const candidate of candidatePaths) {
      // Security enforcement: Must be contained within allowed roots
      const isAllowed = allowedRoots.some((root) => candidate.startsWith(root));
      if (isAllowed && fs.existsSync(candidate)) {
        try {
          const stats = fs.statSync(candidate);
          if (stats.isFile() && stats.size > 0) {
            return candidate;
          }
        } catch {
          // Ignore read error
        }
      }
    }

    return null;
  }

  // ==========================================
  // HELPER: Page Overflow Check
  // ==========================================
  private static ensureSpace(doc: PDFKit.PDFDocument, requiredHeight: number): void {
    if (doc.y + requiredHeight > doc.page.height - 40) {
      doc.addPage();
    }
  }

  // ==========================================
  // 1. HEADER & META BOX
  // ==========================================
  private static renderHeader(
    doc: PDFKit.PDFDocument,
    data: FsrWithDetails,
    company: CompanyProfileConfig
  ) {
    const leftMargin = 36;
    const rightMargin = doc.page.width - 36;
    const contentWidth = rightMargin - leftMargin;
    const startY = 36;

    // Check for logo file
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
        doc.image(logoPath, leftMargin, startY, { fit: [120, 32] });
      } catch {
        // Ignore image load error
      }
    }

    // Company Information (Left aligned below or next to logo)
    const compX = logoPath ? leftMargin + 130 : leftMargin;
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#0f172a')
      .text(company.name, compX, startY, { width: 230 });

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#475569')
      .text(`${company.addressLine1}, ${company.addressLine2}`, compX, doc.y + 1, { width: 230 })
      .text(`Phone: ${company.phone}  •  Email: ${company.email}`, compX, doc.y + 1, { width: 230 });

    // Document Title Banner (Right Top)
    const titleBoxWidth = 150;
    const titleBoxX = rightMargin - titleBoxWidth;

    doc
      .rect(titleBoxX, startY, titleBoxWidth, 42)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#1e3a8a')
      .text('FIELD SERVICE REPORT', titleBoxX, startY + 6, {
        width: titleBoxWidth,
        align: 'center',
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#2563eb')
      .text('UPS SITE VISIT', titleBoxX, doc.y + 1, {
        width: titleBoxWidth,
        align: 'center',
      });

    // Top Metadata Row (FSR No, Visit Date, Status, Call Type)
    const metaY = Math.max(doc.y + 16, startY + 50);

    doc
      .rect(leftMargin, metaY, contentWidth, 24)
      .fillAndStroke('#0f172a', '#0f172a');

    const colWidth = contentWidth / 4;

    // 1. FSR No
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#94a3b8')
      .text('FSR NUMBER:', leftMargin + 8, metaY + 4, { width: colWidth - 10 });
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#ffffff')
      .text(data.fsr.fsrNumber, leftMargin + 8, metaY + 13, { width: colWidth - 10 });

    // 2. Visit Date
    const formattedDate = data.fsr.visitDate
      ? new Date(data.fsr.visitDate).toLocaleDateString('en-GB')
      : '—';
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#94a3b8')
      .text('VISIT DATE:', leftMargin + colWidth + 8, metaY + 4, { width: colWidth - 10 });
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#ffffff')
      .text(formattedDate, leftMargin + colWidth + 8, metaY + 13, { width: colWidth - 10 });

    // 3. Status
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#94a3b8')
      .text('STATUS:', leftMargin + colWidth * 2 + 8, metaY + 4, { width: colWidth - 10 });
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#38bdf8')
      .text(data.fsr.status, leftMargin + colWidth * 2 + 8, metaY + 13, { width: colWidth - 10 });

    // 4. Call Type
    const callTypeLabels: Record<string, string> = {
      BD: 'Breakdown (BD)',
      PM: 'Preventive Maint. (PM)',
      INSTALLATION: 'Installation',
      COURTESY: 'Courtesy Visit',
      OTHER: 'Other Call',
    };
    const callTypeStr = callTypeLabels[data.fsr.callType] || data.fsr.callType;

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#94a3b8')
      .text('CALL TYPE:', leftMargin + colWidth * 3 + 8, metaY + 4, { width: colWidth - 10 });
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#fbbf24')
      .text(callTypeStr, leftMargin + colWidth * 3 + 8, metaY + 13, { width: colWidth - 10 });

    doc.y = metaY + 30;
  }

  // ==========================================
  // SECTION HEADER COMPONENT
  // ==========================================
  private static renderSectionHeader(doc: PDFKit.PDFDocument, title: string) {
    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;
    const y = doc.y + 4;

    doc
      .rect(leftMargin, y, contentWidth, 15)
      .fillAndStroke('#f1f5f9', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text(title, leftMargin + 8, y + 3.5);

    doc.y = y + 18;
  }

  // ==========================================
  // 2. CUSTOMER & SITE SECTION
  // ==========================================
  private static renderCustomerSection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    this.ensureSpace(doc, 75);
    this.renderSectionHeader(doc, '1. CUSTOMER & SITE LOCATION');

    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;
    const halfWidth = contentWidth / 2 - 4;
    const startY = doc.y;

    const leftX = leftMargin;
    const rightX = leftMargin + halfWidth + 8;

    // Left Column: Customer details
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#475569')
      .text('Customer / Company:', leftX, startY, { width: 100 });
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text(data.customer.name || data.fsr.customerName || '—', leftX + 105, startY, {
        width: halfWidth - 105,
      });

    const afterCustY = doc.y;

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#475569')
      .text('Contact Phone:', leftX, afterCustY + 2, { width: 100 });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(data.customer.phone || data.fsr.customerPhone || '—', leftX + 105, afterCustY + 2, {
        width: halfWidth - 105,
      });

    const afterPhoneY = doc.y;

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#475569')
      .text('Email Address:', leftX, afterPhoneY + 2, { width: 100 });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(data.customer.email || data.fsr.customerEmail || '—', leftX + 105, afterPhoneY + 2, {
        width: halfWidth - 105,
      });

    const afterEmailY = doc.y;

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#475569')
      .text('Site / Destination:', leftX, afterEmailY + 2, { width: 100 });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(
        data.destination?.name || data.fsr.customerAddress || 'Primary Customer Site',
        leftX + 105,
        afterEmailY + 2,
        { width: halfWidth - 105 }
      );

    const leftBottomY = doc.y;

    // Right Column: Problem reported & Reason for visit
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#475569')
      .text('Problem Reported:', rightX, startY, { width: 95 });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(data.fsr.problemReported || '—', rightX + 100, startY, { width: halfWidth - 100 });

    const afterProblemY = doc.y;

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#475569')
      .text('Reason for Visit:', rightX, afterProblemY + 3, { width: 95 });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(data.fsr.reasonForVisit || '—', rightX + 100, afterProblemY + 3, {
        width: halfWidth - 100,
      });

    const rightBottomY = doc.y;

    doc.y = Math.max(leftBottomY, rightBottomY) + 6;
  }

  // ==========================================
  // 3. UPS & EQUIPMENT SECTION
  // ==========================================
  private static renderEquipmentSection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    this.ensureSpace(doc, 60);
    this.renderSectionHeader(doc, '2. UPS & EQUIPMENT DETAILS');

    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;
    const colW = contentWidth / 4;
    const startY = doc.y;

    const fields = [
      { label: 'Product / Model:', val: data.fsr.productModel || data.product?.name || 'UPS Unit' },
      { label: 'Make:', val: data.fsr.productMake || 'TANEJA POWER' },
      { label: 'Serial Number:', val: data.fsr.productSerialNumber || 'N/A' },
      { label: 'Equipment Status:', val: data.fsr.equipmentStatus || 'WORKING' },
      { label: 'Warranty Status:', val: (data.fsr.warrantyStatus || 'UNDER_WARRANTY').replace(/_/g, ' ') },
      { label: 'Billing Status:', val: (data.fsr.billingStatus || 'FREE_SERVICE').replace(/_/g, ' ') },
      { label: 'Assigned FSE:', val: data.serviceEngineer.fullName || data.fsr.fseName || 'Engineer' },
      { label: 'FSE Phone:', val: data.serviceEngineer.phone || data.fsr.fseNumber || '—' },
    ];

    // Render in a clean 2-row x 4-column compact grid with safe bounds
    for (let r = 0; r < 2; r++) {
      const rowY = startY + r * 25;
      for (let c = 0; c < 4; c++) {
        const item = fields[r * 4 + c];
        const cellX = leftMargin + c * colW;

        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor('#64748b')
          .text(item.label, cellX, rowY, { width: colW - 8, lineBreak: false, ellipsis: true });

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor('#0f172a')
          .text(item.val, cellX, rowY + 9.5, { width: colW - 8, height: 11, lineBreak: false, ellipsis: true });
      }
    }

    doc.y = startY + 54;
  }

  // ==========================================
  // 4. SERVICE VISIT DETAILS
  // ==========================================
  private static renderVisitSection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    // Already summarized cleanly in Top Meta & Equipment section.
  }

  // ==========================================
  // 5. SITE OBSERVATIONS & ELECTRICAL PARAMETERS
  // ==========================================
  private static renderSiteObservationsSection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    this.ensureSpace(doc, 110);
    this.renderSectionHeader(doc, '3. SITE OBSERVATIONS & ELECTRICAL PARAMETERS');

    const obs = data.siteObservation;
    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;
    const startY = doc.y;

    const electricalParams = [
      { label: 'Input on Mains', val: obs?.inputOnMains ? String(obs.inputOnMains).toUpperCase() : '—' },
      { label: 'Input Voltage (L-N)', val: obs?.inputVoltageLN ? `${obs.inputVoltageLN} V` : '—' },
      { label: 'Input Voltage (L-L)', val: obs?.inputVoltageLL ? `${obs.inputVoltageLL} V` : '—' },
      { label: 'Output Voltage (L-N)', val: obs?.outputVoltageLN ? `${obs.outputVoltageLN} V` : '—' },
      { label: 'Output Voltage (L-L)', val: obs?.outputVoltageLL ? `${obs.outputVoltageLL} V` : '—' },
      { label: 'VAC', val: obs?.vac ? `${obs.vac} V` : '—' },
      { label: 'Frequency', val: obs?.frequency ? `${obs.frequency} Hz` : '—' },
      { label: 'DC Voltage', val: obs?.dcVoltage ? `${obs.dcVoltage} V` : '—' },
      { label: 'Output Load %', val: obs?.outputLoadPercent ? `${obs.outputLoadPercent} %` : '—' },
      { label: 'Input Frequency', val: obs?.inputFrequency ? `${obs.inputFrequency} Hz` : '—' },
      { label: 'Output Frequency', val: obs?.outputFrequency ? `${obs.outputFrequency} Hz` : '—' },
      { label: 'UPS Location', val: obs?.upsLocation ? (obs.upsLocation === 'OTHER' && obs.otherLocationSpecification ? `Other: ${obs.otherLocationSpecification}` : obs.upsLocation.replace(/_/g, ' ')) : '—' },
    ];

    const colW = contentWidth / 4;
    for (let i = 0; i < electricalParams.length; i++) {
      const r = Math.floor(i / 4);
      const c = i % 4;
      const cellX = leftMargin + c * colW;
      const cellY = startY + r * 20;

      // Draw subtle grid box
      doc
        .rect(cellX, cellY, colW - 3, 18)
        .fillAndStroke(i % 2 === 0 ? '#f8fafc' : '#ffffff', '#e2e8f0');

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text(electricalParams[i].label, cellX + 4, cellY + 3, { width: colW - 10, lineBreak: false, ellipsis: true });

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(electricalParams[i].val, cellX + 4, cellY + 10, { width: colW - 10, lineBreak: false, ellipsis: true });
    }

    let nextY = startY + Math.ceil(electricalParams.length / 4) * 20 + 4;

    // Room Environmental remarks & general observation notes
    if (obs?.environmentCondition || obs?.environmentRemarks || obs?.observationsNotes) {
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#475569')
        .text('Environment & Room Observations:', leftMargin, nextY);

      const envText = [
        obs.environmentCondition ? `Condition: ${obs.environmentCondition}` : '',
        obs.environmentRemarks ? `Remarks: ${obs.environmentRemarks}` : '',
        obs.observationsNotes ? `Technical Notes: ${obs.observationsNotes}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(envText || 'Normal operating environment', leftMargin, doc.y + 1, {
          width: contentWidth,
        });

      nextY = doc.y + 6;
    }

    doc.y = nextY + 4;
  }

  // ==========================================
  // 6. BATTERY SYSTEM & READINGS
  // ==========================================
  private static renderBatterySection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;

    this.ensureSpace(doc, 60);
    this.renderSectionHeader(doc, '4. BATTERY SYSTEM & CELL READINGS');

    if (!data.batteryBanks || data.batteryBanks.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#64748b')
        .text('No battery banks recorded for this service report.', leftMargin, doc.y + 2);
      doc.y += 10;
      return;
    }

    data.batteryBanks.forEach((bank, bankIdx) => {
      this.ensureSpace(doc, 50);

      // Bank Description Header Card
      const bankHeaderY = doc.y + 2;
      doc
        .rect(leftMargin, bankHeaderY, contentWidth, 22)
        .fillAndStroke('#f1f5f9', '#94a3b8');

      const bankTitle = `BATTERY BANK ${bank.bankNumber || bankIdx + 1}: ${bank.bankDescription || 'Standard Bank'}`;
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0f172a')
        .text(bankTitle, leftMargin + 6, bankHeaderY + 4, { width: 220, lineBreak: false });

      const specsText = `Make: ${bank.make || '—'}  |  Ah: ${bank.ah || '—'}  |  Qty: ${bank.quantity || bank.readings?.length || '—'}  |  V: ${bank.voltage ? bank.voltage + 'V' : '—'}  |  Chg: ${bank.chargingCurrent ? bank.chargingCurrent + 'A' : '—'}  |  Dischg: ${bank.dischargingCurrent ? bank.dischargingCurrent + 'A' : '—'}`;
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#334155')
        .text(specsText, leftMargin + 6, bankHeaderY + 13, { width: contentWidth - 12, lineBreak: false });

      doc.y = bankHeaderY + 26;

      // Battery Readings Table
      const readings = bank.readings || [];
      if (readings.length === 0) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(7.5)
          .fillColor('#64748b')
          .text('No individual battery cell readings logged for this bank.', leftMargin + 6, doc.y);
        doc.y += 12;
      } else {
        // Table Columns: Cell #, Charging Voltage, Discharging Voltage, Internal Resistance, Remarks
        const colWidths = [50, 110, 115, 115, contentWidth - (50 + 110 + 115 + 115)];

        const drawTableHeader = (curY: number) => {
          doc
            .rect(leftMargin, curY, contentWidth, 14)
            .fillAndStroke('#0f172a', '#0f172a');

          const headers = [
            'Cell #',
            'Charging Voltage (V)',
            'Discharging Voltage (V)',
            'Internal Resistance',
            'Remarks / State',
          ];

          let curX = leftMargin;
          headers.forEach((h, hIdx) => {
            doc
              .font('Helvetica-Bold')
              .fontSize(7)
              .fillColor('#ffffff')
              .text(h, curX + 4, curY + 3.5, {
                width: colWidths[hIdx] - 8,
                align: hIdx === 0 ? 'center' : 'left',
                lineBreak: false,
              });
            curX += colWidths[hIdx];
          });
        };

        drawTableHeader(doc.y);
        doc.y += 14;

        readings.forEach((reading, rIdx) => {
          // Multi-page check before rendering each row
          if (doc.y + 13 > doc.page.height - 40) {
            doc.addPage();
            // Re-render table header on next page
            drawTableHeader(doc.y);
            doc.y += 14;
          }

          const rowY = doc.y;
          const isEven = rIdx % 2 === 0;

          doc
            .rect(leftMargin, rowY, contentWidth, 12)
            .fillAndStroke(isEven ? '#ffffff' : '#f8fafc', '#e2e8f0');

          let cellX = leftMargin;

          // 1. Cell #
          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor('#0f172a')
            .text(String(reading.batteryNumber || rIdx + 1), cellX, rowY + 2.5, {
              width: colWidths[0],
              align: 'center',
            });
          cellX += colWidths[0];

          // 2. Charging Voltage
          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor('#0f172a')
            .text(reading.chargingVoltage ? `${reading.chargingVoltage} V` : '—', cellX + 4, rowY + 2.5, {
              width: colWidths[1] - 8,
            });
          cellX += colWidths[1];

          // 3. Discharging Voltage
          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor('#0f172a')
            .text(reading.dischargingVoltage ? `${reading.dischargingVoltage} V` : '—', cellX + 4, rowY + 2.5, {
              width: colWidths[2] - 8,
            });
          cellX += colWidths[2];

          // 4. Internal Resistance
          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor('#0f172a')
            .text(reading.internalResistance ? reading.internalResistance : '—', cellX + 4, rowY + 2.5, {
              width: colWidths[3] - 8,
            });
          cellX += colWidths[3];

          // 5. Remarks
          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor('#475569')
            .text(reading.remarks || '—', cellX + 4, rowY + 2.5, {
              width: colWidths[4] - 8,
              lineBreak: false,
            });

          doc.y = rowY + 12;
        });

        doc.y += 6;
      }
    });
  }

  // ==========================================
  // 7. PART REPLACEMENT DETAILS
  // ==========================================
  private static renderPartsSection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;

    this.ensureSpace(doc, 45);
    this.renderSectionHeader(doc, '5. PART REPLACEMENT DETAILS');

    const parts = data.parts || [];
    if (parts.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text('No spare parts replaced during this visit.', leftMargin + 6, doc.y);
      doc.y += 10;
      return;
    }

    const colWidths = [120, 80, 40, 130, 85, contentWidth - (120 + 80 + 40 + 130 + 85)];
    const headers = [
      'Part Name',
      'Part No / SKU',
      'Qty',
      'Replacement Details',
      'Old Part Status',
      'Remarks',
    ];

    const drawHeader = (curY: number) => {
      doc
        .rect(leftMargin, curY, contentWidth, 14)
        .fillAndStroke('#0f172a', '#0f172a');

      let curX = leftMargin;
      headers.forEach((h, idx) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor('#ffffff')
          .text(h, curX + 4, curY + 3.5, {
            width: colWidths[idx] - 8,
            align: idx === 2 ? 'center' : 'left',
            lineBreak: false,
          });
        curX += colWidths[idx];
      });
    };

    drawHeader(doc.y);
    doc.y += 14;

    parts.forEach((part, pIdx) => {
      if (doc.y + 14 > doc.page.height - 40) {
        doc.addPage();
        drawHeader(doc.y);
        doc.y += 14;
      }

      const rowY = doc.y;
      const isEven = pIdx % 2 === 0;

      doc
        .rect(leftMargin, rowY, contentWidth, 13)
        .fillAndStroke(isEven ? '#ffffff' : '#f8fafc', '#e2e8f0');

      let cellX = leftMargin;

      // 1. Part Name
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor('#0f172a')
        .text(part.partName, cellX + 4, rowY + 3, { width: colWidths[0] - 8, lineBreak: false });
      cellX += colWidths[0];

      // 2. Part Number / SKU
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(part.partNumber || part.product?.sku || '—', cellX + 4, rowY + 3, {
          width: colWidths[1] - 8,
          lineBreak: false,
        });
      cellX += colWidths[1];

      // 3. Qty
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor('#0f172a')
        .text(String(part.quantity || 1), cellX, rowY + 3, {
          width: colWidths[2],
          align: 'center',
        });
      cellX += colWidths[2];

      // 4. Replacement Details
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#0f172a')
        .text(part.replacementDetails || '—', cellX + 4, rowY + 3, {
          width: colWidths[3] - 8,
          lineBreak: false,
        });
      cellX += colWidths[3];

      // 5. Old Part Status
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text((part.oldPartStatus || 'DEFECTIVE_RETURNED').replace(/_/g, ' '), cellX + 4, rowY + 3, {
          width: colWidths[4] - 8,
          lineBreak: false,
        });
      cellX += colWidths[4];

      // 6. Remarks
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text(part.remarks || '—', cellX + 4, rowY + 3, {
          width: colWidths[5] - 8,
          lineBreak: false,
        });

      doc.y = rowY + 13;
    });

    doc.y += 6;
  }

  // ==========================================
  // 8. STANDBY DETAILS & CHARGES
  // ==========================================
  private static renderStandbyAndChargesSection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;
    const halfWidth = contentWidth / 2 - 4;

    this.ensureSpace(doc, 45);
    this.renderSectionHeader(doc, '6. STANDBY DETAILS & CHARGES');

    const startY = doc.y;
    const leftX = leftMargin;
    const rightX = leftMargin + halfWidth + 8;

    // Standby details (Left)
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('Standby Equipment Details:', leftX, startY);
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#0f172a')
      .text(data.fsr.standbyDetails || 'No standby unit provided (—)', leftX, doc.y + 1, {
        width: halfWidth,
      });

    const leftBottom = doc.y;

    // Charges (Right)
    const formattedCharges =
      data.fsr.charges && Number(data.fsr.charges) > 0
        ? `INR ${Number(data.fsr.charges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : 'Nil / Free Service';

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('Service Charges:', rightX, startY);
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(data.fsr.charges && Number(data.fsr.charges) > 0 ? '#1e3a8a' : '#059669')
      .text(formattedCharges, rightX, doc.y + 1);

    if (data.fsr.chargesRemarks) {
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text(`Remarks: ${data.fsr.chargesRemarks}`, rightX, doc.y + 1, { width: halfWidth });
    }

    const rightBottom = doc.y;
    doc.y = Math.max(leftBottom, rightBottom) + 6;
  }

  // ==========================================
  // 9. FEEDBACK & SUGGESTIONS
  // ==========================================
  private static renderFeedbackSection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;
    const halfWidth = contentWidth / 2 - 4;

    this.ensureSpace(doc, 45);
    this.renderSectionHeader(doc, '7. ENGINEER SUGGESTIONS & CUSTOMER FEEDBACK');

    const startY = doc.y;
    const leftX = leftMargin;
    const rightX = leftMargin + halfWidth + 8;

    // FSE Feedback
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('FSE Feedback & Recommendations:', leftX, startY);
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#0f172a')
      .text(data.fsr.fseFeedback || 'System tested under load, parameters within normal operating range.', leftX, doc.y + 1, {
        width: halfWidth,
      });

    const leftBottom = doc.y;

    // Customer Feedback
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('Customer Feedback:', rightX, startY);
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#0f172a')
      .text(data.fsr.customerFeedback || 'Service carried out satisfactorily.', rightX, doc.y + 1, {
        width: halfWidth,
      });

    const rightBottom = doc.y;
    doc.y = Math.max(leftBottom, rightBottom) + 8;
  }

  // ==========================================
  // 10. SIGN-OFF & ACKNOWLEDGEMENTS
  // ==========================================
  private static renderSignOffSection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;
    const boxWidth = contentWidth / 2 - 4;
    const boxHeight = 90;

    this.ensureSpace(doc, boxHeight + 25);
    this.renderSectionHeader(doc, '8. AUTHENTICATED DIGITAL SIGN-OFF');

    const startY = doc.y;
    const leftX = leftMargin;
    const rightX = leftMargin + boxWidth + 8;

    // Customer Sign-Off Box
    doc
      .rect(leftX, startY, boxWidth, boxHeight)
      .fillAndStroke('#ffffff', '#cbd5e1');

    doc
      .rect(leftX, startY, boxWidth, 14)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#0f172a')
      .text('CUSTOMER ACKNOWLEDGEMENT', leftX + 6, startY + 3.5);

    const custName = data.fsr.customerContactName || data.customer.name || 'Customer Representative';
    const custSignedDate = data.fsr.customerSignedAt
      ? new Date(data.fsr.customerSignedAt).toLocaleString('en-GB')
      : '—';

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text(`Representative: ${custName}`, leftX + 6, startY + 18, { width: boxWidth - 12 });
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text(`Signed At: ${custSignedDate}`, leftX + 6, startY + 27, { width: boxWidth - 12 });

    // Embedded Customer Signature / Stamp
    const custSigBuffer = this.resolveImageBuffer(data.fsr.customerSignature);
    const custStampBuffer = this.resolveImageBuffer(data.fsr.customerStamp);

    if (custSigBuffer) {
      try {
        doc.image(custSigBuffer, leftX + 6, startY + 38, { fit: [boxWidth - 12, 45] });
      } catch {
        doc
          .font('Helvetica-Oblique')
          .fontSize(7.5)
          .fillColor('#059669')
          .text('[Digitally Signed by Customer]', leftX + 6, startY + 50);
      }
    } else {
      doc
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .fillColor('#94a3b8')
        .text('Signature pending / Not provided', leftX + 6, startY + 50);
    }

    if (custStampBuffer) {
      try {
        doc.image(custStampBuffer, leftX + boxWidth - 45, startY + 38, { fit: [40, 40] });
      } catch {
        // Ignore stamp rendering error
      }
    }

    // FSE Sign-Off Box
    doc
      .rect(rightX, startY, boxWidth, boxHeight)
      .fillAndStroke('#ffffff', '#cbd5e1');

    doc
      .rect(rightX, startY, boxWidth, 14)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#0f172a')
      .text('FIELD SERVICE ENGINEER', rightX + 6, startY + 3.5);

    const fseName = data.fsr.fseName || data.serviceEngineer.fullName || 'Field Service Engineer';
    const fseNum = data.fsr.fseNumber || data.serviceEngineer.phone || '—';
    const fseSignedDate = data.fsr.fseSignatureDate
      ? new Date(data.fsr.fseSignatureDate).toLocaleDateString('en-GB')
      : '—';

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text(`Service Engineer: ${fseName} (${fseNum})`, rightX + 6, startY + 18, {
        width: boxWidth - 12,
      });
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text(`Signature Date: ${fseSignedDate}`, rightX + 6, startY + 27, { width: boxWidth - 12 });

    const fseSigBuffer = this.resolveImageBuffer(data.fsr.fseSignature);

    if (fseSigBuffer) {
      try {
        doc.image(fseSigBuffer, rightX + 6, startY + 38, { fit: [boxWidth - 12, 45] });
      } catch {
        doc
          .font('Helvetica-Oblique')
          .fontSize(7.5)
          .fillColor('#2563eb')
          .text('[Digitally Signed by FSE]', rightX + 6, startY + 50);
      }
    } else {
      doc
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .fillColor('#94a3b8')
        .text('Signature pending / Not provided', rightX + 6, startY + 50);
    }

    doc.y = startY + boxHeight + 8;
  }

  // ==========================================
  // 11. SITE PHOTOS & ATTACHMENTS (OPTIONAL)
  // ==========================================
  private static renderPhotosSection(doc: PDFKit.PDFDocument, data: FsrWithDetails) {
    const leftMargin = 36;
    const contentWidth = doc.page.width - 72;

    const imageAttachments = (data.attachments || []).filter((att) => {
      const mime = (att.mimeType || '').toLowerCase();
      const name = (att.fileName || '').toLowerCase();
      const pathStr = (att.filePath || '').toLowerCase();
      return (
        mime.startsWith('image/') ||
        name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        pathStr.startsWith('data:image') ||
        pathStr.endsWith('.png') ||
        pathStr.endsWith('.jpg') ||
        pathStr.endsWith('.jpeg')
      );
    });

    if (imageAttachments.length === 0) return;

    this.ensureSpace(doc, 140);
    this.renderSectionHeader(doc, '9. SITE PHOTOGRAPHS & ATTACHMENTS');

    const colWidth = contentWidth / 2 - 4;
    const imgHeight = 90;

    for (let i = 0; i < imageAttachments.length; i += 2) {
      this.ensureSpace(doc, imgHeight + 25);

      const rowY = doc.y;

      // Left Photo
      const att1 = imageAttachments[i];
      const img1Buf = this.resolveImageBuffer(att1.filePath);

      doc
        .rect(leftMargin, rowY, colWidth, imgHeight + 18)
        .fillAndStroke('#f8fafc', '#cbd5e1');

      if (img1Buf) {
        try {
          doc.image(img1Buf, leftMargin + 4, rowY + 4, { fit: [colWidth - 8, imgHeight] });
        } catch {
          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor('#64748b')
            .text('[Image Preview Unavailable]', leftMargin + 4, rowY + 40, {
              width: colWidth - 8,
              align: 'center',
            });
        }
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .fillColor('#2563eb')
        .text(
          `${att1.category.replace(/_/g, ' ')}: ${att1.fileName}`,
          leftMargin + 4,
          rowY + imgHeight + 6,
          { width: colWidth - 8, lineBreak: false }
        );

      // Right Photo (if exists)
      if (i + 1 < imageAttachments.length) {
        const att2 = imageAttachments[i + 1];
        const img2Buf = this.resolveImageBuffer(att2.filePath);
        const rightX = leftMargin + colWidth + 8;

        doc
          .rect(rightX, rowY, colWidth, imgHeight + 18)
          .fillAndStroke('#f8fafc', '#cbd5e1');

        if (img2Buf) {
          try {
            doc.image(img2Buf, rightX + 4, rowY + 4, { fit: [colWidth - 8, imgHeight] });
          } catch {
            doc
              .font('Helvetica')
              .fontSize(7)
              .fillColor('#64748b')
              .text('[Image Preview Unavailable]', rightX + 4, rowY + 40, {
                width: colWidth - 8,
                align: 'center',
              });
          }
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(6.5)
          .fillColor('#2563eb')
          .text(
            `${att2.category.replace(/_/g, ' ')}: ${att2.fileName}`,
            rightX + 4,
            rowY + imgHeight + 6,
            { width: colWidth - 8, lineBreak: false }
          );
      }

      doc.y = rowY + imgHeight + 24;
    }
  }
}
