/**
 * Quotation Financial Calculation Service
 * Implements exact decimal/monetary precision handling and Indian GST tax logic.
 */

export interface LineItemCalculationInput {
  productId?: string | null;
  productName: string;
  productSku?: string | null;
  description?: string | null;
  make?: string | null;
  model?: string | null;
  technicalSpecifications?: string | null;
  hsnSac?: string | null;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  gstRate?: number;
  serviceDurationMonths?: number | null;
  serviceVisitsIncluded?: number | null;
  serviceScope?: string | null;
  equipmentType?: string | null;
  equipmentConfiguration?: string | null;
  equipmentRating?: string | null;
  customerEquipmentIds?: string[];
  customerEquipmentId?: string | null;
  sortOrder?: number;
  itemType?: string;
}

export interface CalculatedLineItem {
  productId?: string | null;
  itemType: string;
  productName: string;
  productSku?: string | null;
  description?: string | null;
  make?: string | null;
  model?: string | null;
  technicalSpecifications?: string | null;
  hsnSac?: string | null;
  unit: string;
  quantity: string; // numeric in DB
  unitPrice: string;
  discountPercent: string;
  discountAmount: string;
  taxableAmount: string;
  gstRate: string;
  cgstRate: string;
  cgstAmount: string;
  sgstRate: string;
  sgstAmount: string;
  igstRate: string;
  igstAmount: string;
  totalTax: string;
  lineTotal: string;
  serviceDurationMonths?: number | null;
  serviceVisitsIncluded?: number | null;
  serviceScope?: string | null;
  equipmentType?: string | null;
  equipmentConfiguration?: string | null;
  equipmentRating?: string | null;
  customerEquipmentIds?: string[];
  customerEquipmentId?: string | null;
  sortOrder: number;
}

export interface CalculatedRevisionTotals {
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
  amountInWords: string;
  items: CalculatedLineItem[];
}

export class QuotationCalculationService {
  private readonly DEFAULT_COMPANY_STATE = 'Gujarat';

  /**
   * Exact rounding helper to 2 decimal places (standard for INR currency)
   */
  public round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Format number to fixed string representation
   */
  public formatFixed(value: number, decimals: number = 2): string {
    return this.round(value, decimals).toFixed(decimals);
  }

  /**
   * Determine if transaction is Intra-state or Inter-state based on state
   */
  public isIntraState(customerState?: string | null): boolean {
    if (!customerState) return true; // Default to intra-state if state unspecified
    const cleanCustomer = customerState.trim().toLowerCase();
    const cleanCompany = this.DEFAULT_COMPANY_STATE.toLowerCase();
    return cleanCustomer === cleanCompany || cleanCustomer === 'gj' || cleanCustomer.includes('gujarat');
  }

  /**
   * Calculate line item financial breakdowns and tax portions
   */
  public calculateLineItem(
    input: LineItemCalculationInput,
    customerState?: string | null,
    sortOrder: number = 0
  ): CalculatedLineItem {
    const qty = Math.max(0, input.quantity || 0);
    const unitPrice = Math.max(0, input.unitPrice || 0);
    const grossAmount = this.round(qty * unitPrice, 2);

    // Calculate discount
    let discountAmount = 0;
    let discountPercent = input.discountPercent || 0;

    if (input.discountAmount && input.discountAmount > 0) {
      discountAmount = this.round(Math.min(input.discountAmount, grossAmount), 2);
      discountPercent = grossAmount > 0 ? this.round((discountAmount / grossAmount) * 100, 2) : 0;
    } else if (discountPercent > 0) {
      discountPercent = Math.min(100, discountPercent);
      discountAmount = this.round(grossAmount * (discountPercent / 100), 2);
    }

    const taxableAmount = this.round(Math.max(0, grossAmount - discountAmount), 2);

    // GST calculation
    const gstRate = input.gstRate !== undefined ? Math.max(0, input.gstRate) : 18.0;
    const isIntra = this.isIntraState(customerState);

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isIntra) {
      cgstRate = this.round(gstRate / 2, 2);
      sgstRate = this.round(gstRate / 2, 2);
      cgstAmount = this.round(taxableAmount * (cgstRate / 100), 2);
      sgstAmount = this.round(taxableAmount * (sgstRate / 100), 2);
    } else {
      igstRate = this.round(gstRate, 2);
      igstAmount = this.round(taxableAmount * (igstRate / 100), 2);
    }

    const totalTax = this.round(cgstAmount + sgstAmount + igstAmount, 2);
    const lineTotal = this.round(taxableAmount + totalTax, 2);

    return {
      productId: input.productId || null,
      itemType: input.itemType || 'PRODUCT',
      productName: input.productName,
      productSku: input.productSku || null,
      description: input.description || null,
      make: input.make || null,
      model: input.model || null,
      technicalSpecifications: input.technicalSpecifications || null,
      hsnSac: input.hsnSac || null,
      unit: input.unit || 'NOS',
      quantity: qty.toFixed(3),
      unitPrice: this.formatFixed(unitPrice, 2),
      discountPercent: this.formatFixed(discountPercent, 2),
      discountAmount: this.formatFixed(discountAmount, 2),
      taxableAmount: this.formatFixed(taxableAmount, 2),
      gstRate: this.formatFixed(gstRate, 2),
      cgstRate: this.formatFixed(cgstRate, 2),
      cgstAmount: this.formatFixed(cgstAmount, 2),
      sgstRate: this.formatFixed(sgstRate, 2),
      sgstAmount: this.formatFixed(sgstAmount, 2),
      igstRate: this.formatFixed(igstRate, 2),
      igstAmount: this.formatFixed(igstAmount, 2),
      totalTax: this.formatFixed(totalTax, 2),
      lineTotal: this.formatFixed(lineTotal, 2),
      serviceDurationMonths: input.serviceDurationMonths || null,
      serviceVisitsIncluded: input.serviceVisitsIncluded || null,
      serviceScope: input.serviceScope || null,
      equipmentType: input.equipmentType || null,
      equipmentConfiguration: input.equipmentConfiguration || null,
      equipmentRating: input.equipmentRating || null,
      customerEquipmentIds: input.customerEquipmentIds || (input.customerEquipmentId ? [input.customerEquipmentId] : []),
      customerEquipmentId: input.customerEquipmentId || (input.customerEquipmentIds && input.customerEquipmentIds[0]) || null,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : sortOrder,
    };
  }

  /**
   * Calculate all line items and compile complete revision totals
   */
  public calculateRevisionTotals(
    itemsInput: LineItemCalculationInput[],
    customerState?: string | null,
    freightChargesInput: number = 0,
    otherChargesInput: number = 0,
    roundOffInput?: number
  ): CalculatedRevisionTotals {
    let subtotalNum = 0;
    let totalDiscountNum = 0;
    let taxableAmountNum = 0;
    let cgstAmountNum = 0;
    let sgstAmountNum = 0;
    let igstAmountNum = 0;
    let totalTaxNum = 0;

    const items: CalculatedLineItem[] = [];

    itemsInput.forEach((item, index) => {
      const calculated = this.calculateLineItem(item, customerState, item.sortOrder ?? index);
      items.push(calculated);

      const qty = parseFloat(calculated.quantity);
      const unitPrice = parseFloat(calculated.unitPrice);
      subtotalNum += this.round(qty * unitPrice, 2);
      totalDiscountNum += parseFloat(calculated.discountAmount);
      taxableAmountNum += parseFloat(calculated.taxableAmount);
      cgstAmountNum += parseFloat(calculated.cgstAmount);
      sgstAmountNum += parseFloat(calculated.sgstAmount);
      igstAmountNum += parseFloat(calculated.igstAmount);
      totalTaxNum += parseFloat(calculated.totalTax);
    });

    const freightCharges = Math.max(0, freightChargesInput || 0);
    const otherCharges = Math.max(0, otherChargesInput || 0);

    const rawGrandTotal = taxableAmountNum + totalTaxNum + freightCharges + otherCharges;
    
    // Calculate standard round-off if not explicitly provided
    let roundOff = 0;
    if (roundOffInput !== undefined && roundOffInput !== null) {
      roundOff = roundOffInput;
    } else {
      const nearestInt = Math.round(rawGrandTotal);
      roundOff = this.round(nearestInt - rawGrandTotal, 2);
    }

    const grandTotal = this.round(rawGrandTotal + roundOff, 2);
    const amountInWords = this.numberToIndianWords(grandTotal);

    return {
      subtotal: this.formatFixed(subtotalNum, 2),
      totalDiscount: this.formatFixed(totalDiscountNum, 2),
      taxableAmount: this.formatFixed(taxableAmountNum, 2),
      cgstAmount: this.formatFixed(cgstAmountNum, 2),
      sgstAmount: this.formatFixed(sgstAmountNum, 2),
      igstAmount: this.formatFixed(igstAmountNum, 2),
      totalTax: this.formatFixed(totalTaxNum, 2),
      freightCharges: this.formatFixed(freightCharges, 2),
      otherCharges: this.formatFixed(otherCharges, 2),
      roundOff: this.formatFixed(roundOff, 2),
      grandTotal: this.formatFixed(grandTotal, 2),
      amountInWords,
      items,
    };
  }

  /**
   * Indian numbering format words converter (Rupees, Lakhs, Crores, Paise)
   */
  public numberToIndianWords(amount: number): string {
    if (amount <= 0) return 'Zero Rupees Only';

    const units = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen',
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertBelowThousand = (n: number): string => {
      let str = '';
      if (n >= 100) {
        str += units[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        str += units[n] + ' ';
      }
      return str.trim();
    };

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let crore = Math.floor(integerPart / 10000000);
    let remainder = integerPart % 10000000;
    let lakh = Math.floor(remainder / 100000);
    remainder %= 100000;
    let thousand = Math.floor(remainder / 1000);
    let hundreds = remainder % 1000;

    let result = '';
    if (crore > 0) result += convertBelowThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertBelowThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertBelowThousand(thousand) + ' Thousand ';
    if (hundreds > 0) result += convertBelowThousand(hundreds) + ' ';

    result = result.trim() + ' Rupees';

    if (decimalPart > 0) {
      result += ' and ' + convertBelowThousand(decimalPart) + ' Paise';
    }

    return result + ' Only';
  }
}
