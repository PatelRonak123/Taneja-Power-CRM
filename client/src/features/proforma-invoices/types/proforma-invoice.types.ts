export type ProformaInvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED';

export interface ProformaInvoiceItem {
  id: string;
  proformaInvoiceId: string;
  salesOrderItemId: string;
  productId?: string | null;
  productNameSnapshot: string;
  skuSnapshot?: string | null;
  descriptionSnapshot?: string | null;
  hsnSacSnapshot?: string | null;
  unitSnapshot: string;
  quantity: string | number;
  unitPrice: string | number;
  discountAmount?: string | number;
  taxableAmount: string | number;
  taxRate: string | number;
  cgstRate?: string | number;
  sgstRate?: string | number;
  igstRate?: string | number;
  cgstAmount?: string | number;
  sgstAmount?: string | number;
  igstAmount?: string | number;
  taxAmount: string | number;
  lineTotal: string | number;
  sortOrder?: number;
}

export interface ProformaInvoice {
  id: string;
  proformaInvoiceNumber: string;
  salesOrderId: string;
  customerId: string;
  proformaInvoiceDate: string;
  validityDate?: string | null;
  status: ProformaInvoiceStatus;
  currency: string;

  customerName: string;
  customerNameSnapshot?: string;
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

  subtotal: string | number;
  discountAmount?: string | number;
  taxableAmount: string | number;
  cgstAmount?: string | number;
  sgstAmount?: string | number;
  igstAmount?: string | number;
  totalTax: string | number;
  roundOff?: string | number;
  totalAmount: string | number;

  advanceAmountRequested: string | number;
  paidAmount: string | number;

  createdBy: string;
  issuedBy?: string | null;
  issuedAt?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  revisionNumber?: number;
  relatedTaxInvoiceId?: string | null;

  createdAt: string;
  updatedAt: string;

  items?: ProformaInvoiceItem[];
  customer?: {
    id: string;
    name: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  salesOrder?: {
    id: string;
    salesOrderNumber: string;
    status: string;
    customerPoNumber?: string | null;
    customerPoDate?: string | null;
  };
  createdByUser?: {
    id: string;
    fullName: string;
  };
  issuedByUser?: {
    id: string;
    fullName: string;
  } | null;
}

export interface CreateProformaInvoicePayload {
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

export interface ListProformaInvoicesParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  salesOrderId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}
