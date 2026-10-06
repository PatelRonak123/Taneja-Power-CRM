import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import { Supplier, PurchaseOrder, GoodsReceipt } from '../types/procurement.types';

export const procurementService = {
  // Supplier APIs
  getSuppliers: async (params?: Record<string, unknown>): Promise<ApiEnvelope<Supplier[]>> => {
    return apiClient.get('/suppliers', { params }) as unknown as Promise<ApiEnvelope<Supplier[]>>;
  },

  getSupplierById: async (id: string): Promise<ApiEnvelope<Supplier>> => {
    return apiClient.get(`/suppliers/${id}`) as unknown as Promise<ApiEnvelope<Supplier>>;
  },

  getNextSupplierCode: async (): Promise<ApiEnvelope<{ nextCode: string }>> => {
    return apiClient.get('/suppliers/next-code') as unknown as Promise<ApiEnvelope<{ nextCode: string }>>;
  },

  createSupplier: async (payload: Partial<Supplier>): Promise<ApiEnvelope<Supplier>> => {
    return apiClient.post('/suppliers', payload) as unknown as Promise<ApiEnvelope<Supplier>>;
  },

  updateSupplier: async (id: string, payload: Partial<Supplier>): Promise<ApiEnvelope<Supplier>> => {
    return apiClient.put(`/suppliers/${id}`, payload) as unknown as Promise<ApiEnvelope<Supplier>>;
  },

  deleteSupplier: async (id: string): Promise<ApiEnvelope<{ id: string }>> => {
    return apiClient.delete(`/suppliers/${id}`) as unknown as Promise<ApiEnvelope<{ id: string }>>;
  },

  setSupplierStatus: async (id: string, status: string): Promise<ApiEnvelope<Supplier>> => {
    return apiClient.patch(`/suppliers/${id}/status`, { status }) as unknown as Promise<ApiEnvelope<Supplier>>;
  },

  // Purchase Order APIs
  getPurchaseOrders: async (params?: Record<string, unknown>): Promise<ApiEnvelope<PurchaseOrder[]>> => {
    return apiClient.get('/purchase-orders', { params }) as unknown as Promise<ApiEnvelope<PurchaseOrder[]>>;
  },

  getPurchaseOrderById: async (id: string): Promise<ApiEnvelope<PurchaseOrder>> => {
    return apiClient.get(`/purchase-orders/${id}`) as unknown as Promise<ApiEnvelope<PurchaseOrder>>;
  },

  createPurchaseOrder: async (payload: {
    supplierId: string;
    orderDate?: string;
    expectedDeliveryDate?: string | null;
    notes?: string | null;
    termsAndConditions?: string | null;
    items: Array<{ productId: string; quantity: number; unitCost: number; taxRate?: number }>;
  }): Promise<ApiEnvelope<PurchaseOrder>> => {
    return apiClient.post('/purchase-orders', payload) as unknown as Promise<ApiEnvelope<PurchaseOrder>>;
  },

  updatePurchaseOrder: async (
    id: string,
    payload: {
      supplierId?: string;
      orderDate?: string;
      expectedDeliveryDate?: string | null;
      notes?: string | null;
      termsAndConditions?: string | null;
      items?: Array<{ productId: string; quantity: number; unitCost: number; taxRate?: number }>;
    }
  ): Promise<ApiEnvelope<PurchaseOrder>> => {
    return apiClient.put(`/purchase-orders/${id}`, payload) as unknown as Promise<ApiEnvelope<PurchaseOrder>>;
  },

  submitPurchaseOrder: async (id: string): Promise<ApiEnvelope<PurchaseOrder>> => {
    return apiClient.post(`/purchase-orders/${id}/submit`, {}) as unknown as Promise<ApiEnvelope<PurchaseOrder>>;
  },

  approvePurchaseOrder: async (id: string): Promise<ApiEnvelope<PurchaseOrder>> => {
    return apiClient.post(`/purchase-orders/${id}/approve`, {}) as unknown as Promise<ApiEnvelope<PurchaseOrder>>;
  },

  cancelPurchaseOrder: async (id: string): Promise<ApiEnvelope<PurchaseOrder>> => {
    return apiClient.post(`/purchase-orders/${id}/cancel`, {}) as unknown as Promise<ApiEnvelope<PurchaseOrder>>;
  },

  // Goods Receipt APIs
  getGoodsReceipts: async (params?: Record<string, unknown>): Promise<ApiEnvelope<GoodsReceipt[]>> => {
    return apiClient.get('/goods-receipts', { params }) as unknown as Promise<ApiEnvelope<GoodsReceipt[]>>;
  },

  getGoodsReceiptById: async (id: string): Promise<ApiEnvelope<GoodsReceipt>> => {
    return apiClient.get(`/goods-receipts/${id}`) as unknown as Promise<ApiEnvelope<GoodsReceipt>>;
  },

  createGoodsReceipt: async (payload: {
    purchaseOrderId: string;
    receiptDate?: string;
    notes?: string | null;
    items: Array<{ purchaseOrderItemId: string; receivedQuantity: number }>;
    autoPost?: boolean;
  }): Promise<ApiEnvelope<GoodsReceipt>> => {
    return apiClient.post('/goods-receipts', payload) as unknown as Promise<ApiEnvelope<GoodsReceipt>>;
  },

  postGoodsReceipt: async (id: string): Promise<ApiEnvelope<GoodsReceipt>> => {
    return apiClient.post(`/goods-receipts/${id}/post`, {}) as unknown as Promise<ApiEnvelope<GoodsReceipt>>;
  },
};
