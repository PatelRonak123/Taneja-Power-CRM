import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

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

export interface ServiceReportPdfData {
  reportNumber: string;
  serviceType: string;
  status: string;
  inspectionDate: string;
  contractNumber: string;
  visitNumber: number;
  customerName: string;
  companyName?: string;
  endUser?: string;
  branch?: string;
  zone?: string;
  amcPlan: string;
  technicianName?: string;
  technicianEmail?: string;
  serviceSummary?: string;
  observations?: string;
  recommendations?: string;
  customerRemarks?: string;
  acknowledgementStatus?: string;
  acknowledgedAt?: string;
  equipment: Array<{
    equipmentName: string;
    configuration?: string;
    rating?: string;
    conditionStatus: string;
    observations?: string;
  }>;
  checklist: Array<{
    scopeDescription: string;
    status: string;
    remarks?: string;
  }>;
  materials?: Array<{
    productNameSnapshot: string;
    skuSnapshot?: string;
    quantity: string;
    unitSnapshot: string;
    materialType: string;
    coverageType: string;
    remarks?: string;
  }>;
}

export class AmcServiceReportPdfService {
  private static readonly MARGIN_LEFT = 36;
  private static readonly MARGIN_RIGHT = 36;
  private static readonly PAGE_WIDTH = 595.28;
  private static readonly PAGE_HEIGHT = 841.89;
  private static readonly CONTENT_WIDTH = 523; // 595.28 - 72

  public static async generatePdf(data: ServiceReportPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 30,
            bottom: 30,
            left: 36,
            right: 36,
          },
          bufferPages: true,
          autoFirstPage: true,
          info: {
            Title: `AMC Service Report ${data.reportNumber}`,
            Author: 'Taneja Power Controls',
            Subject: `Field Service Report for Contract ${data.contractNumber}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', (err) => reject(err));

        let currentY = 30;

        // 1. Header
        currentY = this.renderHeader(doc, data, currentY);

        // 2. Metadata Overview Grid
        currentY = this.renderOverviewGrid(doc, data, currentY);

        // 3. Equipment Section
        currentY = this.renderEquipmentSection(doc, data, currentY);

        // 4. Checklist Section
        currentY = this.renderChecklistSection(doc, data, currentY);

        // 5. Observations & Recommendations Section
        currentY = this.renderObservationsSection(doc, data, currentY);

        // 6. Materials / Spares Consumed (if any)
        if (data.materials && data.materials.length > 0) {
          currentY = this.renderMaterialsSection(doc, data, currentY);
        }

        // 7. Signatures
        this.renderSignatures(doc, data, currentY);

        // 8. Global Footers
        this.addFooters(doc);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private static checkPageBreak(doc: PDFKit.PDFDocument, currentY: number, neededHeight: number): number {
    const bottomLimit = 780;
    if (currentY + neededHeight > bottomLimit) {
      doc.addPage();
      return 40;
    }
    return currentY;
  }

  private static renderHeader(doc: PDFKit.PDFDocument, data: ServiceReportPdfData, startY: number): number {
    const logoPath = path.resolve(process.cwd(), 'client/public/logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, this.MARGIN_LEFT, startY, { width: 130 });
      } catch {
        // Fallback if logo fails
      }
    }

    doc
      .fillColor('#0F172A')
      .fontSize(15)
      .font('Helvetica-Bold')
      .text('TANEJA POWER CONTROLS', 220, startY + 2, { align: 'right', width: 339 });

    doc
      .fillColor('#475569')
      .fontSize(7.5)
      .font('Helvetica')
      .text('ISO 9001:2015 & ISO 14001 CERTIFIED COMPANY', 220, startY + 19, { align: 'right', width: 339 })
      .text('Industrial Voltage Stabilizers & AMC Technical Services', 220, startY + 29, { align: 'right', width: 339 });

    const dividerY = startY + 44;
    doc.moveTo(this.MARGIN_LEFT, dividerY).lineTo(this.MARGIN_LEFT + this.CONTENT_WIDTH, dividerY).lineWidth(1).strokeColor('#CBD5E1').stroke();

    // Report Title Banner
    const bannerY = dividerY + 6;
    const bannerHeight = 22;
    doc.rect(this.MARGIN_LEFT, bannerY, this.CONTENT_WIDTH, bannerHeight).fillAndStroke('#0F172A', '#0F172A');

    doc
      .fillColor('#FFFFFF')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`FIELD AMC SERVICE REPORT — ${data.reportNumber}`, this.MARGIN_LEFT + 8, bannerY + 6, {
        width: 320,
        lineBreak: false,
      });

    const statusText = `STATUS: ${(data.status || 'DRAFT').toUpperCase()}`;
    doc
      .fillColor('#93C5FD')
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text(statusText, this.MARGIN_LEFT + 320, bannerY + 6, {
        width: this.CONTENT_WIDTH - 328,
        align: 'right',
        lineBreak: false,
      });

    return bannerY + bannerHeight + 8;
  }

  private static renderOverviewGrid(doc: PDFKit.PDFDocument, data: ServiceReportPdfData, startY: number): number {
    const boxHeight = 58;
    doc.rect(this.MARGIN_LEFT, startY, this.CONTENT_WIDTH, boxHeight).fillAndStroke('#F8FAFC', '#E2E8F0');

    const leftColLabelX = this.MARGIN_LEFT + 8;
    const leftColValX = this.MARGIN_LEFT + 115;
    const rightColLabelX = this.MARGIN_LEFT + 280;
    const rightColValX = this.MARGIN_LEFT + 380;

    const rowSpacing = 13;
    let rY = startY + 6;

    // Row 1
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('CONTRACT NUMBER:', leftColLabelX, rY);
    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(data.contractNumber || '—', leftColValX, rY, { width: 155 });

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('INSPECTION DATE:', rightColLabelX, rY);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica').text(formatDate(data.inspectionDate), rightColValX, rY, { width: 135 });

    rY += rowSpacing;

    // Row 2
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('CUSTOMER NAME:', leftColLabelX, rY);
    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(data.companyName || data.customerName || '—', leftColValX, rY, { width: 155 });

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('SERVICE TYPE:', rightColLabelX, rY);
    doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text(data.serviceType || 'PREVENTIVE', rightColValX, rY, { width: 135 });

    rY += rowSpacing;

    // Row 3
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('SITE / END USER:', leftColLabelX, rY);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica').text(data.endUser || data.branch || '—', leftColValX, rY, { width: 155 });

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('VISIT NUMBER:', rightColLabelX, rY);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(`Visit #${data.visitNumber || 1}`, rightColValX, rY, { width: 135 });

    rY += rowSpacing;

    // Row 4
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('AMC PLAN TIER:', leftColLabelX, rY);
    doc.fillColor('#4338CA').fontSize(8).font('Helvetica-Bold').text(data.amcPlan || '—', leftColValX, rY, { width: 155 });

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('TECHNICIAN:', rightColLabelX, rY);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica').text(data.technicianName || 'Taneja Engineer', rightColValX, rY, { width: 135 });

    return startY + boxHeight + 10;
  }

  private static renderEquipmentSection(doc: PDFKit.PDFDocument, data: ServiceReportPdfData, startY: number): number {
    let y = this.checkPageBreak(doc, startY, 40);

    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('1. COVERED EQUIPMENT INSPECTION', this.MARGIN_LEFT, y);
    y += 12;

    const headerHeight = 16;
    doc.rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, headerHeight).fillAndStroke('#1E293B', '#1E293B');
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
    doc.text('EQUIPMENT NAME', this.MARGIN_LEFT + 6, y + 4.5, { width: 180 });
    doc.text('CONFIGURATION', this.MARGIN_LEFT + 190, y + 4.5, { width: 110 });
    doc.text('RATING', this.MARGIN_LEFT + 305, y + 4.5, { width: 95 });
    doc.text('CONDITION STATUS', this.MARGIN_LEFT + 405, y + 4.5, { width: 112, align: 'right' });

    y += headerHeight;

    const items = data.equipment && data.equipment.length > 0 ? data.equipment : [
      {
        equipmentName: 'Servo Voltage Stabilizer',
        configuration: 'Standard',
        rating: '—',
        conditionStatus: 'OPERATIONAL',
      }
    ];

    items.forEach((item, idx) => {
      y = this.checkPageBreak(doc, y, 16);
      const rowHeight = 16;
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, rowHeight).fillAndStroke(bg, '#E2E8F0');

      doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(item.equipmentName, this.MARGIN_LEFT + 6, y + 4, { width: 180 });
      doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(item.configuration || '—', this.MARGIN_LEFT + 190, y + 4, { width: 110 });
      doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(item.rating || '—', this.MARGIN_LEFT + 305, y + 4, { width: 95 });

      const isOp = item.conditionStatus === 'OPERATIONAL';
      const statusColor = isOp ? '#047857' : (item.conditionStatus === 'MAINTENANCE_REQUIRED' ? '#D97706' : '#B91C1C');
      doc.fillColor(statusColor).fontSize(7.5).font('Helvetica-Bold').text(item.conditionStatus || 'OPERATIONAL', this.MARGIN_LEFT + 405, y + 4, {
        width: 112,
        align: 'right',
      });

      y += rowHeight;
    });

    return y + 10;
  }

  private static renderChecklistSection(doc: PDFKit.PDFDocument, data: ServiceReportPdfData, startY: number): number {
    let y = this.checkPageBreak(doc, startY, 40);

    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('2. PREVENTIVE SCOPE CHECKLIST EVALUATION', this.MARGIN_LEFT, y);
    y += 12;

    const headerHeight = 16;
    doc.rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, headerHeight).fillAndStroke('#1E293B', '#1E293B');
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
    doc.text('#', this.MARGIN_LEFT + 6, y + 4.5, { width: 16 });
    doc.text('SCOPE ITEM DESCRIPTION', this.MARGIN_LEFT + 26, y + 4.5, { width: 240 });
    doc.text('STATUS', this.MARGIN_LEFT + 270, y + 4.5, { width: 85 });
    doc.text('REMARKS / OBSERVATIONS', this.MARGIN_LEFT + 360, y + 4.5, { width: 157 });

    y += headerHeight;

    const checklist = data.checklist || [];

    checklist.forEach((item, idx) => {
      y = this.checkPageBreak(doc, y, 16);
      const rowHeight = 16;
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, rowHeight).fillAndStroke(bg, '#E2E8F0');

      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text(`${idx + 1}`, this.MARGIN_LEFT + 6, y + 4, { width: 16 });
      doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(item.scopeDescription, this.MARGIN_LEFT + 26, y + 4, {
        width: 240,
        height: 12,
        ellipsis: true,
      });

      const isDone = item.status === 'COMPLETED';
      doc.fillColor(isDone ? '#047857' : '#D97706').fontSize(7.5).font('Helvetica-Bold').text(item.status || 'COMPLETED', this.MARGIN_LEFT + 270, y + 4, {
        width: 85,
      });

      doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(item.remarks || 'Checked and found satisfactory', this.MARGIN_LEFT + 360, y + 4, {
        width: 157,
        height: 12,
        ellipsis: true,
      });

      y += rowHeight;
    });

    return y + 10;
  }

  private static renderObservationsSection(doc: PDFKit.PDFDocument, data: ServiceReportPdfData, startY: number): number {
    let y = this.checkPageBreak(doc, startY, 90);

    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('3. TECHNICAL OBSERVATIONS & RECOMMENDATIONS', this.MARGIN_LEFT, y);
    y += 12;

    const boxHeight = 78;
    doc.rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, boxHeight).fillAndStroke('#F8FAFC', '#E2E8F0');

    const labelX = this.MARGIN_LEFT + 8;
    const valX = this.MARGIN_LEFT + 145;
    const valWidth = this.CONTENT_WIDTH - 153;

    // Row 1: Observations
    const obsY = y + 6;
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('OBSERVATIONS:', labelX, obsY);
    doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica').text(
      data.observations || 'All stabilizer voltage and current parameters found within standard operating thresholds.',
      valX,
      obsY,
      { width: valWidth, height: 18 }
    );

    // Row 2: Recommendations
    const recY = y + 28;
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('RECOMMENDATIONS:', labelX, recY);
    doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica').text(
      data.recommendations || 'Regular preventive maintenance schedule to be maintained.',
      valX,
      recY,
      { width: valWidth, height: 18 }
    );

    // Row 3: Customer Remarks
    const remY = y + 50;
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('CUSTOMER REMARKS:', labelX, remY);
    doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica').text(
      data.customerRemarks || 'Satisfactory preventive servicing completed.',
      valX,
      remY,
      { width: valWidth, height: 18 }
    );

    return y + boxHeight + 10;
  }

  private static renderMaterialsSection(doc: PDFKit.PDFDocument, data: ServiceReportPdfData, startY: number): number {
    const mats = data.materials || [];
    if (mats.length === 0) return startY;

    let y = this.checkPageBreak(doc, startY, 40);

    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('4. MATERIALS / SPARES CONSUMED', this.MARGIN_LEFT, y);
    y += 12;

    const coverageColors: Record<string, string> = {
      AMC_INCLUDED: '#047857',
      CHARGEABLE: '#B91C1C',
      CUSTOMER_SUPPLIED: '#D97706',
    };

    const headerHeight = 16;
    doc.rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, headerHeight).fillAndStroke('#1E293B', '#1E293B');
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
    doc.text('ITEM / PRODUCT', this.MARGIN_LEFT + 6, y + 4.5, { width: 170 });
    doc.text('ITEM CODE', this.MARGIN_LEFT + 180, y + 4.5, { width: 75 });
    doc.text('QTY', this.MARGIN_LEFT + 260, y + 4.5, { width: 35 });
    doc.text('UNIT', this.MARGIN_LEFT + 300, y + 4.5, { width: 35 });
    doc.text('COVERAGE', this.MARGIN_LEFT + 340, y + 4.5, { width: 85 });
    doc.text('REMARKS', this.MARGIN_LEFT + 430, y + 4.5, { width: 87 });
    y += headerHeight;

    mats.forEach((mat, idx) => {
      y = this.checkPageBreak(doc, y, 16);
      const rowHeight = 16;
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, rowHeight).fillAndStroke(bg, '#E2E8F0');

      doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(mat.productNameSnapshot, this.MARGIN_LEFT + 6, y + 4, { width: 170, ellipsis: true });
      doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(mat.skuSnapshot || '—', this.MARGIN_LEFT + 180, y + 4, { width: 75 });
      doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(String(mat.quantity), this.MARGIN_LEFT + 260, y + 4, { width: 35 });
      doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(mat.unitSnapshot || 'PCS', this.MARGIN_LEFT + 300, y + 4, { width: 35 });

      const coverageColor = coverageColors[mat.coverageType] || '#334155';
      const coverageLabel = mat.coverageType.replace(/_/g, ' ');
      doc.fillColor(coverageColor).fontSize(7).font('Helvetica-Bold').text(coverageLabel, this.MARGIN_LEFT + 340, y + 4, { width: 85 });
      doc.fillColor('#475569').fontSize(7).font('Helvetica').text(mat.remarks || '—', this.MARGIN_LEFT + 430, y + 4, { width: 87, ellipsis: true });

      y += rowHeight;
    });

    return y + 10;
  }

  private static renderSignatures(doc: PDFKit.PDFDocument, data: ServiceReportPdfData, currentY: number) {
    // Pin signatures neatly above footer or place right below content
    let y = currentY + 12;
    const boxHeight = 52;
    const boxWidth = 246;

    if (y + boxHeight > 780) {
      doc.addPage();
      y = 680;
    } else if (y < 680) {
      // If there's plenty of space on a single page, place signatures neatly at bottom (y=715)
      y = Math.max(y, 715);
    }

    // Technician Signature Box (Left)
    const leftBoxX = this.MARGIN_LEFT;
    doc.rect(leftBoxX, y, boxWidth, boxHeight).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('TECHNICIAN / SERVICE ENGINEER', leftBoxX + 8, y + 6);
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(data.technicianName || 'Taneja Authorized Engineer', leftBoxX + 8, y + 22);
    doc.fillColor('#64748B').fontSize(7).font('Helvetica').text('Signature & Date Verified', leftBoxX + 8, y + 36);

    // Customer Acceptance Box (Right)
    const rightBoxX = this.MARGIN_LEFT + this.CONTENT_WIDTH - boxWidth;
    doc.rect(rightBoxX, y, boxWidth, boxHeight).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('CUSTOMER ACKNOWLEDGEMENT & SEAL', rightBoxX + 8, y + 6);
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(data.customerName || data.companyName || 'Customer Representative', rightBoxX + 8, y + 22);
    doc.fillColor('#64748B').fontSize(7).font('Helvetica').text('Authorized Seal / Signature', rightBoxX + 8, y + 36);
  }

  private static addFooters(doc: PDFKit.PDFDocument) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      const bottomY = 808;

      doc.moveTo(this.MARGIN_LEFT, bottomY - 8).lineTo(this.MARGIN_LEFT + this.CONTENT_WIDTH, bottomY - 8).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

      doc.fillColor('#94A3B8').fontSize(7).font('Helvetica');
      doc.text('Taneja Power Controls — Official Field AMC Service Report', this.MARGIN_LEFT, bottomY, {
        width: 320,
        align: 'left',
        lineBreak: false,
      });
      doc.text(`Page ${i + 1} of ${pages.count}`, this.MARGIN_LEFT + 320, bottomY, {
        width: this.CONTENT_WIDTH - 320,
        align: 'right',
        lineBreak: false,
      });
    }
  }
}

