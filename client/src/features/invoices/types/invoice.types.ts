// ─── Sales Invoice Types ───────────────────────────────────────────────────────

export type SalesInvoiceStatus =
  | 'DRAFT'
  | 'PENDING_ISSUE'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED';

export interface SalesInvoiceItem {
  id: string;
  salesInvoiceId: string;
  salesOrderItemId: string;
  productId: string | null;
  productNameSnapshot: string;
  skuSnapshot: string | null;
  descriptionSnapshot: string | null;
  hsnSacSnapshot: string | null;
  unitSnapshot: string;
  quantity: string;
  unitPrice: string;
  taxableAmount: string;
  taxRate: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  salesOrderId: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string | null;
  status: SalesInvoiceStatus;
  currency: string;
  subtotal: string;
  discountAmount: string;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalTax: string;
  roundOff: string;
  totalAmount: string;
  notes: string | null;

  // Snapshots
  customerNameSnapshot: string | null;
  customerGstinSnapshot: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPincode: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPincode: string | null;

  createdById: string;
  issuedById: string | null;
  issuedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined relations
  items?: SalesInvoiceItem[];
  customer?: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  };
  salesOrder?: {
    id: string;
    salesOrderNumber: string;
    customerPoNumber: string | null;
  };
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateSalesInvoiceFromSoPayload {
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
  items?: Array<{
    salesOrderItemId: string;
    quantity: number;
  }>;
}

export interface UpdateSalesInvoicePayload {
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface CancelSalesInvoicePayload {
  cancellationReason: string;
}

export interface ListSalesInvoicesQuery {
  search?: string;
  status?: string;
  customerId?: string;
  salesOrderId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ─── Vendor Invoice Types ─────────────────────────────────────────────────────

export type VendorInvoiceStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'POSTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface VendorInvoiceItem {
  id: string;
  vendorInvoiceId: string;
  purchaseOrderItemId: string;
  goodsReceiptItemId: string | null;
  productId: string | null;
  productNameSnapshot: string;
  skuSnapshot: string | null;
  descriptionSnapshot: string | null;
  orderedQuantity: string;
  receivedQuantity: string;
  invoicedQuantity: string;
  unitCost: string;
  taxRate: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorInvoice {
  id: string;
  vendorInvoiceNumber: string;
  supplierId: string;
  purchaseOrderId: string;
  invoiceDate: string;
  dueDate: string | null;
  status: VendorInvoiceStatus;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes: string | null;
  createdById: string;
  verifiedById: string | null;
  verifiedAt: string | null;
  postedById: string | null;
  postedAt: string | null;
  rejectedById: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined relations
  items?: VendorInvoiceItem[];
  supplier?: {
    id: string;
    supplierCode: string;
    supplierName: string;
    gstin: string | null;
    email: string | null;
    phone: string | null;
  };
  purchaseOrder?: {
    id: string;
    poNumber: string;
    status: string;
  };
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateVendorInvoicePayload {
  vendorInvoiceNumber: string;
  supplierId: string;
  purchaseOrderId: string;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  items: Array<{
    purchaseOrderItemId: string;
    goodsReceiptItemId?: string;
    productId?: string;
    invoicedQuantity: number;
    unitCost?: number;
    taxRate?: number;
  }>;
}

export interface UpdateVendorInvoicePayload {
  vendorInvoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
  items?: Array<{
    purchaseOrderItemId: string;
    goodsReceiptItemId?: string;
    productId?: string;
    invoicedQuantity: number;
    unitCost?: number;
    taxRate?: number;
  }>;
}

export interface RejectVendorInvoicePayload {
  rejectionReason: string;
}

export interface CancelVendorInvoicePayload {
  cancellationReason: string;
}

export interface ListVendorInvoicesQuery {
  search?: string;
  status?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
