export const PROFORMA_INVOICE_STATUSES = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export type ProformaInvoiceStatus =
  (typeof PROFORMA_INVOICE_STATUSES)[keyof typeof PROFORMA_INVOICE_STATUSES];

export interface CreateProformaInvoiceInput {
  validityDate?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  expectedDeliveryTimeline?: string | null;
  bankDetails?: string | null;
  advanceAmountRequested?: number;
  items?: {
    salesOrderItemId: string;
    quantity: number;
  }[];
}

export interface UpdateProformaInvoiceInput {
  validityDate?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  expectedDeliveryTimeline?: string | null;
  bankDetails?: string | null;
  advanceAmountRequested?: number;
}

export interface CancelProformaInvoiceInput {
  reason: string;
}

export interface SendProformaInvoiceEmailInput {
  to?: string;
  subject?: string;
  customMessage?: string;
}

export interface ListProformaInvoicesQuery {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  salesOrderId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ProformaInvoiceWithDetails {
  id: string;
  proformaInvoiceNumber: string;
  salesOrderId: string;
  customerId: string;
  proformaInvoiceDate: string | Date;
  validityDate?: string | Date | null;
  status: ProformaInvoiceStatus;
  currency: string;
  customerName: string;
  legalName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPincode?: string | null;
  billingStateCode?: string | null;
  shippingName?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPincode?: string | null;
  shippingStateCode?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  expectedDeliveryTimeline?: string | null;
  bankDetails?: string | null;
  notes?: string | null;
  subtotal: string;
  discountAmount: string;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalTax: string;
  roundOff: string;
  totalAmount: string;
  advanceAmountRequested: string;
  paidAmount: string;
  createdBy: string;
  issuedBy?: string | null;
  issuedAt?: string | Date | null;
  cancelledBy?: string | null;
  cancelledAt?: string | Date | null;
  cancellationReason?: string | null;
  revisionNumber: number;
  relatedTaxInvoiceId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  items: any[];
  salesOrder?: any;
  customer?: any;
  createdByUser?: any;
  issuedByUser?: any;
}
