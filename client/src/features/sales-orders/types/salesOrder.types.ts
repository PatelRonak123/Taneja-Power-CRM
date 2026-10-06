// ─── Sales Order Types ───────────────────────────────────────────────────────

export type SalesOrderStatus =
  | 'DRAFT'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'PARTIALLY_INVOICED'
  | 'FULLY_INVOICED'
  | 'CANCELLED';

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId: string | null;
  productNameSnapshot: string;
  skuSnapshot: string | null;
  descriptionSnapshot: string | null;
  hsnSacSnapshot: string | null;
  unitSnapshot: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxAmount: string;
  lineSubtotal: string;
  lineTotal: string;
  sortOrder: number;
  product?: {
    id: string;
    name: string;
    sku: string | null;
    stockQuantity: number;
  } | null;
  dispatchItems?: Array<{
    id: string;
    dispatchQuantity: string | number;
    dispatch?: { id: string; status: string } | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrder {
  id: string;
  salesOrderNumber: string;
  customerId: string;
  quotationId: string;
  quotationRevisionId: string;
  customerPoNumber: string | null;
  customerPoDate: string | null;
  orderDate: string;
  expectedDeliveryDate: string | null;

  // Address snapshots
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPincode: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPincode: string | null;

  paymentTerms: string | null;
  notes: string | null;

  subtotal: string;
  taxAmount: string;
  totalAmount: string;

  status: SalesOrderStatus;
  dispatchStatus?: 'NOT_DISPATCHED' | 'PARTIALLY_DISPATCHED' | 'FULLY_DISPATCHED' | 'NOT_APPLICABLE' | string;

  createdBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;

  createdAt: string;
  updatedAt: string;

  // Joined data
  customer?: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  };
  quotation?: {
    id: string;
    quotationNumber: string;
    quotationType: string;
  };
  quotationRevision?: {
    id: string;
    revisionNumber: number;
  };
  items: SalesOrderItem[];
  createdByUser?: { id: string; fullName: string; email: string };
  confirmedByUser?: { id: string; fullName: string; email: string } | null;
  cancelledByUser?: { id: string; fullName: string; email: string } | null;
  // Enriched by the service layer – present on GET /sales-orders/:id and list responses
  linkedAmcContract?: {
    id: string;
    contractNumber: string;
    status: string;
  } | null;
}

// ─── Request/Response Types ──────────────────────────────────────────────────

export interface CreateSalesOrderPayload {
  quotationId: string;
  customerPoNumber?: string;
  customerPoDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface UpdateSalesOrderPayload {
  customerPoNumber?: string | null;
  customerPoDate?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
}

export interface CancelSalesOrderPayload {
  cancellationReason: string;
}

export interface ListSalesOrdersQuery {
  search?: string;
  status?: SalesOrderStatus | '';
  customerId?: string;
  quotationId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
