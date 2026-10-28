export interface SupplierProduct {
  id: string;
  name: string;
  sku: string;
  category?: string;
  price?: string;
  gstRate?: string | null;
}

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  legalName?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  productIds?: string[];
  products?: SupplierProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot?: string | null;
  quantity: number;
  unitCost: string;
  taxRate: string;
  taxAmount: string;
  lineTotal: string;
  receivedQuantity: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED';
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes?: string | null;
  termsAndConditions?: string | null;
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
  createdByUser?: { id: string; fullName: string; email: string };
  approvedByUser?: { id: string; fullName: string; email: string } | null;
}

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  purchaseOrderItemId: string;
  productId: string;
  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  receivedQuantity: number;
  createdAt: string;
  product?: { id: string; name: string; sku: string };
  purchaseOrderItem?: PurchaseOrderItem;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  receiptDate: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  notes?: string | null;
  receivedBy: string;
  createdAt: string;
  updatedAt: string;
  purchaseOrder?: PurchaseOrder;
  items?: GoodsReceiptItem[];
  receivedByUser?: { id: string; fullName: string; email: string };
}
