import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export interface CompanyProfileConfig {
  name: string;
  division: string;
  addressLine1: string;
  addressLine2: string;
  gstin: string;
  email: string;
  phone: string;
  website: string;
}

/**
 * Configured corporate profile.
 * Note: These values are system-configured defaults for Taneja Power.
 */
export const DEFAULT_COMPANY_CONFIG: CompanyProfileConfig = {
  name: 'TANEJA POWER SYSTEMS',
  division: 'Industrial Heavy Engineering & Energy Division',
  addressLine1: 'GIDC Industrial Estate, Makarpura',
  addressLine2: 'Vadodara, Gujarat 390010, India',
  gstin: '24AABCT1234F1Z5',
  email: 'sales@tanejapower.com',
  phone: '+91 98765 43210',
  website: 'www.tanejapower.com',
};

export interface PdfQuotationData {
  quotationNumber: string;
  quotationType: string;
  status: string;
  createdAt: string;
  salesperson?: {
    fullName: string;
    email: string;
    phone?: string | null;
  } | null;
  createdByUser?: {
    fullName: string;
    email: string;
  } | null;
  customer?: {
    name: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    taxNumber?: string | null;
  } | null;
  destination?: {
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  } | null;
  revision: {
    revisionNumber: number;
    status: string;
    quotationDate: string;
    validityDays: number;
    validUntil: string;
    currency: string;
    customerName: string;
    companyName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerGstin?: string | null;
    customerPan?: string | null;
    billingAddress?: string | null;
    billingCity?: string | null;
    billingState?: string | null;
    billingPincode?: string | null;
    shippingName?: string | null;
    shippingAddress?: string | null;
    shippingCity?: string | null;
    shippingState?: string | null;
    shippingPincode?: string | null;
    subtotal: string;
    totalDiscount: string;
    taxableAmount: string;
    cgstAmount: string;
    sgstAmount: string;
    igstAmount: string;
    totalTax: string;
    freightCharges: string;
    otherCharges: string;
    roundOff: string;
    grandTotal: string;
    amountInWords?: string | null;
    subject?: string | null;
    termsAndConditions?: string | null;
    paymentTerms?: string | null;
    deliveryTerms?: string | null;
    warrantyTerms?: string | null;
    notes?: string | null;
    internalRemarks?: string | null;
    revisionReason?: string | null;
    items?: Array<{
      id?: string;
      itemType?: string;
      productName: string;
      productSku?: string | null;
      description?: string | null;
      make?: string | null;
      model?: string | null;
      technicalSpecifications?: string | null;
      hsnSac?: string | null;
      unit: string;
      quantity: string | number;
      unitPrice: string | number;
      discountPercent: string | number;
      discountAmount?: string | number;
      taxableAmount: string | number;
      gstRate: string | number;
      cgstAmount?: string | number;
      sgstAmount?: string | number;
      igstAmount?: string | number;
      totalTax: string | number;
      lineTotal: string | number;
    }>;
  };
  approvals?: Array<{
    action: string;
    comments?: string | null;
    actionAt: string;
    reviewedBy?: {
      fullName: string;
      email: string;
    } | null;
  }>;
}

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

const getQuotationTypeHeading = (type?: string) => {
  switch (type?.toUpperCase()) {
    case 'PRODUCT':
      return 'PRODUCT QUOTATION';
    case 'TECHNICAL':
      return 'TECHNICAL QUOTATION';
    case 'SERVICE':
      return 'SERVICE QUOTATION';
    case 'AMC':
      return 'ANNUAL MAINTENANCE CONTRACT (AMC)';
    default:
      return 'COMMERCIAL PROPOSAL';
  }
};

import { QuotationAmcPdfService } from './quotation-amc-pdf.service.js';

export class QuotationPdfService {
  /**
   * Generates a high-quality, multi-page Quotation PDF document
   */
  public static async generatePdf(
    data: PdfQuotationData,
    companyConfig: CompanyProfileConfig = DEFAULT_COMPANY_CONFIG
  ): Promise<Buffer> {
    if (data.quotationType === 'AMC') {
      return QuotationAmcPdfService.generatePdf(data, companyConfig);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36, // 0.5 inch margins
          bufferPages: true,
          info: {
            Title: `Quotation ${data.quotationNumber} Rev ${data.revision.revisionNumber}`,
            Author: 'Taneja Power CRM',
            Subject: data.revision.subject || 'Commercial Proposal',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', (err) => reject(err));

        const rev = data.revision;
        const status = (rev.status || data.status || 'DRAFT').toUpperCase();
        const isDraft = status === 'DRAFT';
        const isPending = status === 'PENDING_APPROVAL';
        const isRejected = status === 'REJECTED' || status === 'REJECTED_BY_CUSTOMER';
        const isExpired = status === 'EXPIRED';

        // Check if intra-state (Gujarat)
        const isIntraState = Number(rev.cgstAmount || 0) > 0 || Number(rev.sgstAmount || 0) > 0;

        // 1. Draw Company & Document Header
        this.renderHeader(doc, data, companyConfig);

        // 2. Draw Customer & Destination Metadata
        this.renderCustomerAndMeta(doc, data);

        // 3. Draw Line Items Table
        this.renderItemsTable(doc, rev.items || []);

        // 4. Draw Technical Specs if present
        this.renderTechnicalSpecs(doc, rev.items || []);

        // 5. Draw Commercial Totals & Amount in Words
        this.renderCommercialTotals(doc, data, isIntraState);

        // 6. Draw Terms & Conditions
        this.renderTerms(doc, rev);

        // 7. Draw Signatures Block (Status & Authorizations derived safely)
        this.renderSignatures(doc, data);

        // 8. Multi-Page Footers with dynamic total page count
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          // Set zero bottom margin temporarily to prevent accidental auto page-break
          doc.page.margins.bottom = 0;
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#94a3b8')
            .text(
              `Taneja Power — Quotation ${data.quotationNumber} (Rev ${rev.revisionNumber}) • Page ${i + 1} of ${range.count}`,
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

  private static renderHeader(
    doc: PDFKit.PDFDocument,
    data: PdfQuotationData,
    company: CompanyProfileConfig
  ) {
    const startY = 36;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 72;

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
        // Fit logo cleanly without stretching or colliding
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

    // Right Column: Quotation Document Banner
    const rightColX = pageWidth - 220;
    const typeHeading = getQuotationTypeHeading(data.quotationType);

    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#2563eb')
      .text(typeHeading, rightColX - 30, startY, { align: 'right', width: 214 })
      .moveDown(0.2);

    // Document Meta Box
    const metaBoxY = startY + 22;
    doc
      .roundedRect(rightColX - 30, metaBoxY, 214, 62, 4)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#475569')
      .text('Quotation No:', rightColX - 22, metaBoxY + 6)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(data.quotationNumber, rightColX + 45, metaBoxY + 6, { align: 'right', width: 130 })

      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('Revision:', rightColX - 22, metaBoxY + 19)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#2563eb')
      .text(`Rev ${data.revision.revisionNumber}`, rightColX + 45, metaBoxY + 19, { align: 'right', width: 130 })

      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('Date:', rightColX - 22, metaBoxY + 32)
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#0f172a')
      .text(formatDate(data.revision.quotationDate || data.createdAt), rightColX + 45, metaBoxY + 32, { align: 'right', width: 130 })

      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('Valid Until:', rightColX - 22, metaBoxY + 45)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#0f172a')
      .text(formatDate(data.revision.validUntil), rightColX + 45, metaBoxY + 45, { align: 'right', width: 130 });

    // Header dividing line
    const sepY = startY + 90;
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.75)
      .moveTo(36, sepY)
      .lineTo(36 + contentWidth, sepY)
      .stroke();

    doc.y = sepY + 8;
  }

  private static renderCustomerAndMeta(doc: PDFKit.PDFDocument, data: PdfQuotationData) {
    const rev = data.revision;
    const startY = doc.y;
    const halfWidth = (doc.page.width - 72 - 12) / 2;

    // LEFT: Bill To / Customer Details
    doc
      .roundedRect(36, startY, halfWidth, 75, 4)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('CUSTOMER / BILL TO:', 44, startY + 6)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text(rev.companyName || rev.customerName || 'Customer on record', 44, startY + 18, {
        width: halfWidth - 16,
        ellipsis: true,
      })
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#334155');

    let currentY = startY + 30;
    if (rev.customerName && rev.customerName !== rev.companyName) {
      doc.text(`Attn: ${rev.customerName}`, 44, currentY);
      currentY += 10;
    }

    const addressLine = [rev.billingAddress, rev.billingCity, rev.billingState, rev.billingPincode]
      .filter(Boolean)
      .join(', ');

    if (addressLine) {
      doc.text(addressLine, 44, currentY, { width: halfWidth - 16, height: 18, ellipsis: true });
      currentY += 12;
    }

    const taxLine = [
      rev.customerGstin ? `GSTIN: ${rev.customerGstin}` : null,
      rev.customerPan ? `PAN: ${rev.customerPan}` : null,
    ]
      .filter(Boolean)
      .join('  |  ');

    if (taxLine) {
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569').text(taxLine, 44, currentY);
    }

    // RIGHT: Ship To / Delivery Site
    const rightX = 36 + halfWidth + 12;
    doc
      .roundedRect(rightX, startY, halfWidth, 75, 4)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('DELIVERY DESTINATION / SITE:', rightX + 8, startY + 6);

    const shipName = rev.shippingName || data.destination?.name || 'Customer Facility Site';
    const shipAddr =
      [
        rev.shippingAddress || data.destination?.address,
        rev.shippingCity || data.destination?.city,
        rev.shippingState || data.destination?.state,
        rev.shippingPincode || data.destination?.pincode,
      ]
        .filter(Boolean)
        .join(', ') || addressLine || 'As per billing address.';

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text(shipName, rightX + 8, startY + 18, { width: halfWidth - 16, ellipsis: true })
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#334155')
      .text(shipAddr, rightX + 8, startY + 30, { width: halfWidth - 16, height: 24, ellipsis: true });

    // Sales Rep info on bottom right
    const salesRep = data.salesperson?.fullName || data.createdByUser?.fullName || 'Sales Engineering Team';
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text(`Representative: ${salesRep}`, rightX + 8, startY + 58);

    doc.y = startY + 83;

    // Subject line if provided
    if (rev.subject) {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#1e293b')
        .text('Subject: ', 36, doc.y, { continued: true })
        .font('Helvetica')
        .fillColor('#334155')
        .text(rev.subject);
      doc.y += 4;
    }
  }

  private static renderItemsTable(doc: PDFKit.PDFDocument, items: any[]) {
    const tableTop = doc.y + 4;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 72;

    // Column Definitions (Total = 523pt, 36 to 559)
    const cols = {
      sr: { x: 36, w: 18, align: 'center' as const },
      desc: { x: 56, w: 164, align: 'left' as const },
      hsn: { x: 222, w: 46, align: 'center' as const },
      qty: { x: 270, w: 42, align: 'right' as const },
      rate: { x: 314, w: 56, align: 'right' as const },
      disc: { x: 372, w: 32, align: 'right' as const },
      taxable: { x: 406, w: 56, align: 'right' as const },
      gst: { x: 464, w: 28, align: 'right' as const },
      total: { x: 494, w: 65, align: 'right' as const },
    };

    // Table Header
    doc
      .roundedRect(36, tableTop, contentWidth, 18, 2)
      .fill('#1e293b');

    doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff');
    doc.text('#', cols.sr.x, tableTop + 5, { width: cols.sr.w, align: cols.sr.align });
    doc.text('Product / Item Description', cols.desc.x, tableTop + 5, { width: cols.desc.w, align: cols.desc.align });
    doc.text('HSN/SAC', cols.hsn.x, tableTop + 5, { width: cols.hsn.w, align: cols.hsn.align });
    doc.text('Qty', cols.qty.x, tableTop + 5, { width: cols.qty.w, align: cols.qty.align });
    doc.text('Rate (INR)', cols.rate.x, tableTop + 5, { width: cols.rate.w, align: cols.rate.align });
    doc.text('Disc %', cols.disc.x, tableTop + 5, { width: cols.disc.w, align: cols.disc.align });
    doc.text('Taxable', cols.taxable.x, tableTop + 5, { width: cols.taxable.w, align: cols.taxable.align });
    doc.text('GST', cols.gst.x, tableTop + 5, { width: cols.gst.w, align: cols.gst.align });
    doc.text('Total (INR)', cols.total.x, tableTop + 5, { width: cols.total.w, align: cols.total.align });

    let currentY = tableTop + 20;

    items.forEach((item, index) => {
      const hasSubDetails = !!(item.productSku || item.make || (item.description && item.description !== item.productName));
      const rowHeight = hasSubDetails ? 26 : 20;

      // Check page break
      if (currentY + rowHeight > doc.page.height - 110) {
        doc.addPage();
        currentY = 36;

        // Re-draw table header on new page
        doc
          .roundedRect(36, currentY, contentWidth, 18, 2)
          .fill('#1e293b');

        doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff');
        doc.text('#', cols.sr.x, currentY + 5, { width: cols.sr.w, align: cols.sr.align });
        doc.text('Product / Item Description (Continued)', cols.desc.x, currentY + 5, { width: cols.desc.w, align: cols.desc.align });
        doc.text('HSN/SAC', cols.hsn.x, currentY + 5, { width: cols.hsn.w, align: cols.hsn.align });
        doc.text('Qty', cols.qty.x, currentY + 5, { width: cols.qty.w, align: cols.qty.align });
        doc.text('Rate (INR)', cols.rate.x, currentY + 5, { width: cols.rate.w, align: cols.rate.align });
        doc.text('Disc %', cols.disc.x, currentY + 5, { width: cols.disc.w, align: cols.disc.align });
        doc.text('Taxable', cols.taxable.x, currentY + 5, { width: cols.taxable.w, align: cols.taxable.align });
        doc.text('GST', cols.gst.x, currentY + 5, { width: cols.gst.w, align: cols.gst.align });
        doc.text('Total (INR)', cols.total.x, currentY + 5, { width: cols.total.w, align: cols.total.align });

        currentY += 20;
      }

      const isEven = index % 2 === 0;

      // Row background
      doc
        .rect(36, currentY, contentWidth, rowHeight)
        .fill(isEven ? '#ffffff' : '#f8fafc');

      // Row border bottom
      doc
        .strokeColor('#f1f5f9')
        .lineWidth(0.5)
        .moveTo(36, currentY + rowHeight)
        .lineTo(36 + contentWidth, currentY + rowHeight)
        .stroke();

      doc.font('Helvetica').fontSize(7.5).fillColor('#0f172a');
      doc.text(String(index + 1), cols.sr.x, currentY + 4, { width: cols.sr.w, align: cols.sr.align });

      // Product Name & Subtext
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(item.productName, cols.desc.x, currentY + 3, { width: cols.desc.w, lineBreak: false, ellipsis: true });

      if (hasSubDetails) {
        const subDetails = [
          item.productSku ? `SKU: ${item.productSku}` : null,
          item.make ? `Make: ${item.make}` : null,
          item.description && item.description !== item.productName ? item.description : null,
        ]
          .filter(Boolean)
          .join(' • ');

        doc
          .font('Helvetica')
          .fontSize(6.5)
          .fillColor('#64748b')
          .text(subDetails, cols.desc.x, currentY + 13, { width: cols.desc.w, lineBreak: false, ellipsis: true });
      }

      // HSN/SAC: If blank or empty, render '—'
      const hsnText = item.hsnSac && String(item.hsnSac).trim().length > 0 ? String(item.hsnSac).trim() : '—';
      doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
      doc.text(hsnText, cols.hsn.x, currentY + 4, { width: cols.hsn.w, align: cols.hsn.align });

      const gstNum = Number(item.gstRate);
      const gstFormatted = !isNaN(gstNum) ? `${gstNum}%` : `${item.gstRate}%`;

      doc.text(`${item.quantity} ${item.unit || ''}`, cols.qty.x, currentY + 4, { width: cols.qty.w, align: cols.qty.align });
      doc.text(formatCurrency(item.unitPrice), cols.rate.x, currentY + 4, { width: cols.rate.w, align: cols.rate.align });
      doc.text(Number(item.discountPercent) > 0 ? `${Number(item.discountPercent)}%` : '—', cols.disc.x, currentY + 4, { width: cols.disc.w, align: cols.disc.align });
      doc.text(formatCurrency(item.taxableAmount), cols.taxable.x, currentY + 4, { width: cols.taxable.w, align: cols.taxable.align });
      doc.text(gstFormatted, cols.gst.x, currentY + 4, { width: cols.gst.w, align: cols.gst.align });

      doc
        .font('Helvetica-Bold')
        .text(formatCurrency(item.lineTotal), cols.total.x, currentY + 4, { width: cols.total.w, align: cols.total.align });

      currentY += rowHeight;
    });

    doc.y = currentY + 6;
  }

  private static renderTechnicalSpecs(doc: PDFKit.PDFDocument, items: any[]) {
    const specsItems = items.filter((i) => i.technicalSpecifications && String(i.technicalSpecifications).trim().length > 0);
    if (specsItems.length === 0) return;

    if (doc.y > doc.page.height - 120) {
      doc.addPage();
      doc.y = 36;
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#1e293b')
      .text('Technical Specifications & Scope Notes:', 36, doc.y);

    doc.y += 4;

    specsItems.forEach((item, idx) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#2563eb')
        .text(`Item ${idx + 1} (${item.productName}): `, 44, doc.y, { continued: true })
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#334155')
        .text(item.technicalSpecifications);
      doc.y += 3;
    });

    doc.y += 4;
  }

  private static renderCommercialTotals(doc: PDFKit.PDFDocument, data: PdfQuotationData, isIntraState: boolean) {
    const rev = data.revision;

    // Check page space for totals block (requires ~110pt)
    if (doc.y > doc.page.height - 140) {
      doc.addPage();
      doc.y = 36;
    }

    const startY = doc.y + 4;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 72;
    const totalsWidth = 220;
    const totalsX = pageWidth - 36 - totalsWidth;

    // LEFT: Amount in Words Box
    const wordsWidth = contentWidth - totalsWidth - 12;
    doc
      .roundedRect(36, startY, wordsWidth, 52, 4)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text('AMOUNT IN WORDS (INR):', 44, startY + 6)
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(`"${rev.amountInWords || 'Indian Rupees Only'}"`, 44, startY + 18, {
        width: wordsWidth - 16,
      });

    // RIGHT: Totals Calculation Summary
    doc
      .roundedRect(totalsX, startY, totalsWidth, 98, 4)
      .fillAndStroke('#ffffff', '#cbd5e1');

    let rowY = startY + 6;
    const drawTotalRow = (
      label: string,
      value: string | number,
      isBold = false,
      isHighlight = false,
      isNegative = false
    ) => {
      const numStr = formatCurrency(value);
      const formattedVal = isNegative ? `-INR ${numStr}` : `INR ${numStr}`;

      doc
        .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isHighlight ? 8.5 : 7.5)
        .fillColor(isHighlight ? '#2563eb' : isBold ? '#0f172a' : '#475569')
        .text(label, totalsX + 10, rowY)
        .text(formattedVal, totalsX + 70, rowY, { align: 'right', width: totalsWidth - 80 });

      rowY += isHighlight ? 14 : 11;
    };

    drawTotalRow('Subtotal (Base):', rev.subtotal);

    // Always display Total Discount accurately
    const discountVal = Number(rev.totalDiscount || 0);
    drawTotalRow('Total Discount:', discountVal, false, false, discountVal > 0);

    drawTotalRow('Taxable Amount:', rev.taxableAmount, true);

    // GST Breakdown with rate labels where appropriate
    if (isIntraState) {
      drawTotalRow('CGST Total:', rev.cgstAmount);
      drawTotalRow('SGST Total:', rev.sgstAmount);
    } else {
      drawTotalRow('IGST Total:', rev.igstAmount);
    }

    if (Number(rev.freightCharges || 0) > 0) {
      drawTotalRow('Freight & Transit:', rev.freightCharges);
    }

    if (Number(rev.roundOff || 0) !== 0) {
      drawTotalRow('Roundoff:', rev.roundOff);
    }

    // Grand Total Divider
    doc
      .strokeColor('#0f172a')
      .lineWidth(1)
      .moveTo(totalsX + 10, rowY)
      .lineTo(totalsX + totalsWidth - 10, rowY)
      .stroke();

    rowY += 4;
    drawTotalRow('GRAND TOTAL:', rev.grandTotal, true, true);

    doc.y = Math.max(startY + 104, startY + 58);
  }

  private static renderTerms(doc: PDFKit.PDFDocument, rev: any) {
    if (doc.y > doc.page.height - 120) {
      doc.addPage();
      doc.y = 36;
    }

    const startY = doc.y + 4;
    const contentWidth = doc.page.width - 72;

    doc
      .roundedRect(36, startY, contentWidth, 68, 4)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#1e293b')
      .text('Commercial Terms & Warranty Conditions:', 44, startY + 6);

    const termColW = (contentWidth - 24) / 3;
    const col1X = 44;
    const col2X = 44 + termColW;
    const col3X = 44 + termColW * 2;

    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#64748b')
      .text('PAYMENT TERMS', col1X, startY + 18)
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#1e293b')
      .text(rev.paymentTerms || '100% Advance with order', col1X, startY + 28, { width: termColW - 10 })

      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#64748b')
      .text('DELIVERY TERMS', col2X, startY + 18)
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#1e293b')
      .text(rev.deliveryTerms || '2-3 Weeks from order confirmation', col2X, startY + 28, { width: termColW - 10 })

      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#64748b')
      .text('WARRANTY', col3X, startY + 18)
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#1e293b')
      .text(rev.warrantyTerms || '12 Months standard warranty', col3X, startY + 28, { width: termColW - 10 });

    if (rev.termsAndConditions) {
      doc
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .fillColor('#64748b')
        .text('TERMS & CONDITIONS:', col1X, startY + 48)
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#334155')
        .text(rev.termsAndConditions.replace(/\n/g, '  |  '), col1X + 90, startY + 48, {
          width: contentWidth - 110,
          ellipsis: true,
        });
    }

    doc.y = startY + 74;
  }

  private static renderSignatures(doc: PDFKit.PDFDocument, data: PdfQuotationData) {
    if (doc.y > doc.page.height - 75) {
      doc.addPage();
      doc.y = 36;
    }

    const startY = doc.y + 8;
    const pageWidth = doc.page.width;
    const halfWidth = (pageWidth - 72 - 20) / 2;

    const repName = data.salesperson?.fullName || data.createdByUser?.fullName || 'Sales Representative';
    const rev = data.revision;
    const status = (rev.status || data.status || 'DRAFT').toUpperCase();

    const isApprovedStatus = status === 'APPROVED' || status === 'ACCEPTED' || status === 'SENT';
    const isPendingStatus = status === 'PENDING_APPROVAL';
    const isDraftStatus = status === 'DRAFT';
    const isRejectedStatus = status === 'REJECTED' || status === 'REJECTED_BY_CUSTOMER';

    let approverTitle = 'Authorized Signatory';
    let approverSubtext = '';

    if (isApprovedStatus) {
      const approvedAction = data.approvals?.find((a) => a.action === 'APPROVED');
      approverTitle = approvedAction?.reviewedBy?.fullName || 'Management Authority';
      approverSubtext = approvedAction?.actionAt
        ? `Approved on ${formatDate(approvedAction.actionAt)}`
        : 'Approved by Management';
    } else if (isPendingStatus) {
      approverTitle = 'Pending Management Approval';
      approverSubtext = 'Awaiting Authorization';
    } else if (isDraftStatus) {
      approverTitle = 'Draft Proposal (Unapproved)';
      approverSubtext = 'Not Authorized for Commercial Dispatch';
    } else if (isRejectedStatus) {
      approverTitle = 'Proposal Rejected';
      approverSubtext = 'Not Approved';
    } else {
      approverTitle = 'Commercial Division';
      approverSubtext = status;
    }

    // Left: Prepared By
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text('Prepared By:', 36, startY)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(repName, 36, startY + 12)
      .font('Helvetica')
      .fontSize(6.5)
      .fillColor('#94a3b8')
      .text(`Date: ${formatDate(rev.quotationDate || data.createdAt)}`, 36, startY + 24);

    // Right: Authorized Signatory (Derived strictly according to status)
    const rightX = 36 + halfWidth + 20;
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text('For TANEJA POWER SYSTEMS', rightX, startY, { align: 'right', width: halfWidth })
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(isApprovedStatus ? '#0f172a' : '#94a3b8')
      .text(approverTitle, rightX, startY + 12, { align: 'right', width: halfWidth })
      .font('Helvetica')
      .fontSize(6.5)
      .fillColor(isApprovedStatus ? '#16a34a' : '#94a3b8')
      .text(approverSubtext, rightX, startY + 24, { align: 'right', width: halfWidth });
  }

  private static renderWatermark(doc: PDFKit.PDFDocument, text: string) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.save();

      const centerX = doc.page.width / 2;
      const centerY = doc.page.height / 2;

      doc.rotate(-45, { origin: [centerX, centerY] });
      doc
        .fontSize(48)
        .font('Helvetica-Bold')
        .fillColor('#f1f5f9')
        .text(text, centerX - 220, centerY - 24, {
          width: 440,
          align: 'center',
          lineBreak: false,
        });

      doc.restore();
    }
  }
}
