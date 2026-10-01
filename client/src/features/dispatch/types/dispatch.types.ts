export type DispatchStatus = 'DRAFT' | 'PENDING_DISPATCH' | 'DISPATCHED' | 'CANCELLED';

export interface DispatchItem {
  id: string;
  dispatchId: string;
  salesOrderItemId: string;
  salesInvoiceItemId?: string | null;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot?: string | null;
  descriptionSnapshot?: string | null;
  hsnSacSnapshot?: string | null;
  unitSnapshot: string;
  orderedQuantity: string;
  invoicedQuantity?: string | null;
  previouslyDispatchedQuantity: string;
  dispatchQuantity: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  deliveryChallanNumber: string;
  salesOrderId: string;
  customerId: string;
  salesInvoiceId?: string | null;
  dispatchDate: string;
  status: DispatchStatus;

  // Logistics
  vehicleNumber?: string | null;
  transporterName?: string | null;
  transporterContact?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;

  // Snapshots
  customerNameSnapshot: string;
  customerGstinSnapshot?: string | null;
  destinationAddressSnapshot?: string | null;
  shippingCitySnapshot?: string | null;
  shippingStateSnapshot?: string | null;
  shippingPincodeSnapshot?: string | null;

  notes?: string | null;
  createdById?: string | null;
  dispatchedById?: string | null;
  dispatchedAt?: string | null;
  cancelledById?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;

  items?: DispatchItem[];
  salesOrder?: {
    id: string;
    orderNumber?: string;
    salesOrderNumber?: string;
    customerPoNumber?: string | null;
    status: string;
    dispatchStatus: string;
  };
  customer?: {
    id: string;
    companyName: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
  salesInvoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  };
}

export interface CreateDispatchPayload {
  salesOrderId: string;
  salesInvoiceId?: string;
  dispatchDate?: string;
  vehicleNumber?: string;
  transporterName?: string;
  transporterContact?: string;
  driverName?: string;
  driverPhone?: string;
  destinationAddressSnapshot?: string;
  shippingCitySnapshot?: string;
  shippingStateSnapshot?: string;
  shippingPincodeSnapshot?: string;
  notes?: string;
  items?: {
    salesOrderItemId: string;
    salesInvoiceItemId?: string;
    dispatchQuantity: number;
  }[];
}

export interface UpdateDispatchPayload {
  dispatchDate?: string;
  vehicleNumber?: string;
  transporterName?: string;
  transporterContact?: string;
  driverName?: string;
  driverPhone?: string;
  destinationAddressSnapshot?: string;
  shippingCitySnapshot?: string;
  shippingStateSnapshot?: string;
  shippingPincodeSnapshot?: string;
  notes?: string;
  items?: {
    salesOrderItemId: string;
    salesInvoiceItemId?: string;
    dispatchQuantity: number;
  }[];
}

export interface CancelDispatchPayload {
  cancellationReason: string;
}

export interface ListDispatchesQuery {
  search?: string;
  status?: DispatchStatus;
  customerId?: string;
  salesOrderId?: string;
  salesInvoiceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DispatchableItem {
  salesOrderItemId: string;
  productId: string;
  productName: string;
  sku: string | null;
  description: string | null;
  hsnSac: string | null;
  unit: string;
  orderedQuantity: number;
  previouslyDispatchedQuantity: number;
  remainingDispatchableQuantity: number;
  currentPhysicalStock: number;
}

export interface DispatchableSummary {
  salesOrderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
  soStatus: string;
  dispatchStatus: string;
  items: DispatchableItem[];
}
