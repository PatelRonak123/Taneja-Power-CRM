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
  public static async generatePdf(data: ServiceReportPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36,
          bufferPages: true,
          info: {
            Title: `AMC Service Report ${data.reportNumber}`,
            Author: 'Taneja Power CRM',
            Subject: `Service Report for Contract ${data.contractNumber}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', (err) => reject(err));

        // Render Report Document
        this.renderHeader(doc, data);
        this.renderOverviewGrid(doc, data);
        this.renderEquipmentSection(doc, data);
        this.renderChecklistSection(doc, data);
        this.renderObservationsSection(doc, data);
        this.renderMaterialsSection(doc, data);
        this.renderSignatures(doc, data);
        this.addFooters(doc);


        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private static renderHeader(doc: PDFKit.PDFDocument, data: ServiceReportPdfData) {
    const logoPath = path.resolve(process.cwd(), 'client/public/logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 36, 30, { width: 130 });
      } catch {
        // Fallback title
      }
    }

    doc
      .fillColor('#0F172A')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('TANEJA POWER CONTROLS', 220, 32, { align: 'right' });

    doc
      .fillColor('#475569')
      .fontSize(8)
      .font('Helvetica')
      .text('ISO 9001:2015 & ISO 14001 CERTIFIED COMPANY', 220, 50, { align: 'right' })
      .text('Industrial Voltage Stabilizers & AMC Technical Services', 220, 60, { align: 'right' });

    doc.moveTo(36, 75).lineTo(559, 75).lineWidth(1).strokeColor('#CBD5E1').stroke();

    // Report Title Banner
    doc
      .rect(36, 85, 523, 26)
      .fillAndStroke('#0F172A', '#0F172A');

    doc
      .fillColor('#FFFFFF')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`FIELD AMC SERVICE REPORT — ${data.reportNumber}`, 44, 92, { align: 'left' });

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`STATUS: ${data.status.toUpperCase()}`, 400, 92, { align: 'right' });
  }

  private static renderOverviewGrid(doc: PDFKit.PDFDocument, data: ServiceReportPdfData) {
    let y = 120;

    doc.rect(36, y, 523, 70).fillAndStroke('#F8FAFC', '#E2E8F0');

    // Left Column
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('CONTRACT NUMBER:', 44, y + 8);
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(data.contractNumber, 140, y + 8);

    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('CUSTOMER NAME:', 44, y + 22);
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(data.companyName || data.customerName, 140, y + 22);

    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('SITE / END USER:', 44, y + 36);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica').text(data.endUser || data.branch || '—', 140, y + 36);

    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('AMC PLAN TIER:', 44, y + 50);
    doc.fillColor('#4338CA').fontSize(8).font('Helvetica-Bold').text(data.amcPlan, 140, y + 50);

    // Right Column
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('INSPECTION DATE:', 320, y + 8);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica').text(formatDate(data.inspectionDate), 420, y + 8);

    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('SERVICE TYPE:', 320, y + 22);
    doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text(data.serviceType, 420, y + 22);

    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('VISIT NUMBER:', 320, y + 36);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(`Visit #${data.visitNumber}`, 420, y + 36);

    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('TECHNICIAN:', 320, y + 50);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica').text(data.technicianName || 'Taneja Engineer', 420, y + 50);
  }

  private static renderEquipmentSection(doc: PDFKit.PDFDocument, data: ServiceReportPdfData) {
    let y = 202;

    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('1. COVERED EQUIPMENT INSPECTION', 36, y);
    y += 14;

    // Table Header
    doc.rect(36, y, 523, 18).fillAndStroke('#1E293B', '#1E293B');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    doc.text('EQUIPMENT NAME', 42, y + 5);
    doc.text('CONFIGURATION', 200, y + 5);
    doc.text('RATING', 310, y + 5);
    doc.text('CONDITION STATUS', 410, y + 5);

    y += 18;

    (data.equipment || []).forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(36, y, 523, 18).fillAndStroke(bg, '#E2E8F0');

      doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(item.equipmentName, 42, y + 5);
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(item.configuration || '—', 200, y + 5);
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(item.rating || '—', 310, y + 5);

      const isOp = item.conditionStatus === 'OPERATIONAL';
      doc.fillColor(isOp ? '#047857' : '#B91C1C').fontSize(8).font('Helvetica-Bold').text(item.conditionStatus, 410, y + 5);

      y += 18;
    });
  }

  private static renderChecklistSection(doc: PDFKit.PDFDocument, data: ServiceReportPdfData) {
    let y = doc.y + 16;
    if (y > 650) {
      doc.addPage();
      y = 40;
    }

    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('2. PREVENTIVE SCOPE CHECKLIST EVALUATION', 36, y);
    y += 14;

    // Table Header
    doc.rect(36, y, 523, 18).fillAndStroke('#1E293B', '#1E293B');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    doc.text('#', 42, y + 5);
    doc.text('SCOPE ITEM DESCRIPTION', 60, y + 5);
    doc.text('STATUS', 360, y + 5);
    doc.text('REMARKS', 440, y + 5);

    y += 18;

    (data.checklist || []).forEach((item, idx) => {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }

      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(36, y, 523, 18).fillAndStroke(bg, '#E2E8F0');

      doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(`${idx + 1}`, 42, y + 5);
      doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(item.scopeDescription, 60, y + 5, { width: 290 });

      const isDone = item.status === 'COMPLETED';
      doc.fillColor(isDone ? '#047857' : '#D97706').fontSize(8).font('Helvetica-Bold').text(item.status, 360, y + 5);
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(item.remarks || 'Ok', 440, y + 5, { width: 110 });

      y += 18;
    });
  }

  private static renderObservationsSection(doc: PDFKit.PDFDocument, data: ServiceReportPdfData) {
    let y = doc.y + 16;
    if (y > 620) {
      doc.addPage();
      y = 40;
    }

    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('3. TECHNICAL OBSERVATIONS & RECOMMENDATIONS', 36, y);
    y += 14;

    doc.rect(36, y, 523, 60).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('OBSERVATIONS:', 44, y + 8);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica').text(data.observations || 'All stabilizer voltage and current parameters found within standard operating thresholds.', 130, y + 8, { width: 420 });

    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('RECOMMENDATIONS:', 44, y + 32);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica').text(data.recommendations || 'Regular preventive maintenance schedule to be maintained.', 130, y + 32, { width: 420 });

    y += 70;
    if (y > 680) {
      doc.addPage();
      y = 40;
    }

    doc.rect(36, y, 523, 40).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('CUSTOMER REMARKS:', 44, y + 8);
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica').text(data.customerRemarks || 'Satisfactory preventive servicing completed.', 130, y + 8, { width: 420 });
  }

  private static renderMaterialsSection(doc: PDFKit.PDFDocument, data: ServiceReportPdfData) {
    const mats = data.materials || [];
    if (mats.length === 0) return;

    let y = doc.y + 16;
    if (y > 650) {
      doc.addPage();
      y = 40;
    }

    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('4. MATERIALS / SPARES CONSUMED', 36, y);
    y += 14;

    const coverageColors: Record<string, string> = {
      AMC_INCLUDED: '#047857',
      CHARGEABLE: '#B91C1C',
      CUSTOMER_SUPPLIED: '#D97706',
    };

    // Table Header
    doc.rect(36, y, 523, 18).fillAndStroke('#1E293B', '#1E293B');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    doc.text('ITEM / PRODUCT', 42, y + 5);
    doc.text('ITEM CODE', 215, y + 5);
    doc.text('QTY', 310, y + 5);
    doc.text('UNIT', 350, y + 5);
    doc.text('COVERAGE', 390, y + 5);
    doc.text('REMARKS', 470, y + 5);
    y += 18;

    mats.forEach((mat, idx) => {
      if (y > 750) {
        doc.addPage();
        y = 40;
        // Reprint header on new page
        doc.rect(36, y, 523, 18).fillAndStroke('#1E293B', '#1E293B');
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        doc.text('ITEM / PRODUCT', 42, y + 5);
        doc.text('ITEM CODE', 215, y + 5);
        doc.text('QTY', 310, y + 5);
        doc.text('UNIT', 350, y + 5);
        doc.text('COVERAGE', 390, y + 5);
        doc.text('REMARKS', 470, y + 5);
        y += 18;
      }

      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(36, y, 523, 18).fillAndStroke(bg, '#E2E8F0');

      doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(mat.productNameSnapshot, 42, y + 5, { width: 165 });
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(mat.skuSnapshot || '—', 215, y + 5, { width: 85 });
      doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(String(mat.quantity), 310, y + 5, { width: 32 });
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(mat.unitSnapshot || 'PCS', 350, y + 5, { width: 32 });

      const coverageColor = coverageColors[mat.coverageType] || '#334155';
      const coverageLabel = mat.coverageType.replace(/_/g, ' ');
      doc.fillColor(coverageColor).fontSize(7).font('Helvetica-Bold').text(coverageLabel, 390, y + 5, { width: 70 });
      doc.fillColor('#475569').fontSize(7).font('Helvetica').text(mat.remarks || '—', 470, y + 5, { width: 85 });

      y += 18;
    });
  }

  private static renderSignatures(doc: PDFKit.PDFDocument, data: ServiceReportPdfData) {

    let y = doc.y + 60;
    if (y > 720) {
      doc.addPage();
      y = doc.page.height - 120;
    }

    // Technician Signature Box
    doc.rect(40, y, 220, 50).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('TECHNICIAN / SERVICE ENGINEER', 48, y + 8);
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(data.technicianName || 'Taneja Authorized Engineer', 48, y + 32);

    // Customer Acceptance Box
    doc.rect(330, y, 220, 50).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('CUSTOMER ACKNOWLEDGEMENT & SEAL', 338, y + 8);
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(data.customerName, 338, y + 32);
  }

  private static addFooters(doc: PDFKit.PDFDocument) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      const bottomY = 800;

      doc.moveTo(36, bottomY - 10).lineTo(559, bottomY - 10).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

      doc.fillColor('#94A3B8').fontSize(7).font('Helvetica');
      doc.text('Taneja Power Controls — Official Field AMC Service Report', 36, bottomY, { align: 'left' });
      doc.text(`Page ${i + 1} of ${pages.count}`, 500, bottomY, { align: 'right' });
    }
  }
}
