import { apiClient } from '../../../app/api/apiClient';
import type {
  SalesInvoice,
  CreateSalesInvoiceFromSoPayload,
  UpdateSalesInvoicePayload,
  CancelSalesInvoicePayload,
  ListSalesInvoicesQuery,
  VendorInvoice,
  CreateVendorInvoicePayload,
  UpdateVendorInvoicePayload,
  RejectVendorInvoicePayload,
  CancelVendorInvoicePayload,
  ListVendorInvoicesQuery,
} from '../types/invoice.types';

const SALES_BASE = '/sales-invoices';
const VENDOR_BASE = '/vendor-invoices';

export const invoiceService = {
  // ─── Sales Invoices ──────────────────────────────────────────────────────────

  listSalesInvoices: async (
    query: ListSalesInvoicesQuery = {}
  ): Promise<{ data: SalesInvoice[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    if (query.customerId) params.set('customerId', query.customerId);
    if (query.salesOrderId) params.set('salesOrderId', query.salesOrderId);
    if (query.startDate) params.set('startDate', query.startDate);
    if (query.endDate) params.set('endDate', query.endDate);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const qs = params.toString();
    const res: any = await apiClient.get(`${SALES_BASE}${qs ? `?${qs}` : ''}`);
    return { data: res.data ?? [], meta: res.meta ?? {} };
  },

  getSalesInvoiceById: async (id: string): Promise<SalesInvoice> => {
    const res: any = await apiClient.get(`${SALES_BASE}/${id}`);
    return res.data;
  },

  createSalesInvoiceFromSo: async (
    salesOrderId: string,
    payload: CreateSalesInvoiceFromSoPayload = {}
  ): Promise<SalesInvoice> => {
    const res: any = await apiClient.post(
      `${SALES_BASE}/from-sales-order/${salesOrderId}`,
      payload
    );
    return res.data;
  },

  updateSalesInvoice: async (
    id: string,
    payload: UpdateSalesInvoicePayload
  ): Promise<SalesInvoice> => {
    const res: any = await apiClient.put(`${SALES_BASE}/${id}`, payload);
    return res.data;
  },

  submitSalesInvoice: async (id: string): Promise<SalesInvoice> => {
    const res: any = await apiClient.post(`${SALES_BASE}/${id}/submit`);
    return res.data;
  },

  issueSalesInvoice: async (id: string): Promise<SalesInvoice> => {
    const res: any = await apiClient.post(`${SALES_BASE}/${id}/issue`);
    return res.data;
  },

  cancelSalesInvoice: async (
    id: string,
    payload: CancelSalesInvoicePayload
  ): Promise<SalesInvoice> => {
    const res: any = await apiClient.post(`${SALES_BASE}/${id}/cancel`, payload);
    return res.data;
  },

  // ─── Vendor Invoices ─────────────────────────────────────────────────────────

  listVendorInvoices: async (
    query: ListVendorInvoicesQuery = {}
  ): Promise<{ data: VendorInvoice[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    if (query.supplierId) params.set('supplierId', query.supplierId);
    if (query.purchaseOrderId) params.set('purchaseOrderId', query.purchaseOrderId);
    if (query.startDate) params.set('startDate', query.startDate);
    if (query.endDate) params.set('endDate', query.endDate);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const qs = params.toString();
    const res: any = await apiClient.get(`${VENDOR_BASE}${qs ? `?${qs}` : ''}`);
    return { data: res.data ?? [], meta: res.meta ?? {} };
  },

  getVendorInvoiceById: async (id: string): Promise<VendorInvoice> => {
    const res: any = await apiClient.get(`${VENDOR_BASE}/${id}`);
    return res.data;
  },

  createVendorInvoice: async (
    payload: CreateVendorInvoicePayload
  ): Promise<VendorInvoice> => {
    const res: any = await apiClient.post(VENDOR_BASE, payload);
    return res.data;
  },

  updateVendorInvoice: async (
    id: string,
    payload: UpdateVendorInvoicePayload
  ): Promise<VendorInvoice> => {
    const res: any = await apiClient.put(`${VENDOR_BASE}/${id}`, payload);
    return res.data;
  },

  submitVendorInvoice: async (id: string): Promise<VendorInvoice> => {
    const res: any = await apiClient.post(`${VENDOR_BASE}/${id}/submit`);
    return res.data;
  },

  verifyVendorInvoice: async (id: string): Promise<VendorInvoice> => {
    const res: any = await apiClient.post(`${VENDOR_BASE}/${id}/verify`);
    return res.data;
  },

  postVendorInvoice: async (id: string): Promise<VendorInvoice> => {
    const res: any = await apiClient.post(`${VENDOR_BASE}/${id}/post`);
    return res.data;
  },

  rejectVendorInvoice: async (
    id: string,
    payload: RejectVendorInvoicePayload
  ): Promise<VendorInvoice> => {
    const res: any = await apiClient.post(`${VENDOR_BASE}/${id}/reject`, payload);
    return res.data;
  },

  cancelVendorInvoice: async (
    id: string,
    payload: CancelVendorInvoicePayload
  ): Promise<VendorInvoice> => {
    const res: any = await apiClient.post(`${VENDOR_BASE}/${id}/cancel`, payload);
    return res.data;
  },

  // ─── Customer Payments & Collections ──────────────────────────────────────────

  recordPayment: async (payload: {
    customerId: string;
    salesInvoiceId?: string;
    amcContractId?: string;
    amount: number;
    paymentDate?: string;
    paymentMode: 'BANK_TRANSFER' | 'NEFT_RTGS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER';
    referenceNumber?: string;
    notes?: string;
  }): Promise<any> => {
    const res: any = await apiClient.post('/payments', payload);
    return res.data;
  },

  listPayments: async (query: {
    customerId?: string;
    salesInvoiceId?: string;
    amcContractId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: any[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query.customerId) params.set('customerId', query.customerId);
    if (query.salesInvoiceId) params.set('salesInvoiceId', query.salesInvoiceId);
    if (query.amcContractId) params.set('amcContractId', query.amcContractId);
    if (query.search) params.set('search', query.search);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const qs = params.toString();
    const res: any = await apiClient.get(`/payments${qs ? `?${qs}` : ''}`);
    return { data: res.data ?? [], meta: res.meta ?? {} };
  },

  getReceivablesSummary: async (): Promise<any> => {
    const res: any = await apiClient.get('/payments/receivables-summary');
    const data = res.data ?? {};
    const summary = data.summary ?? {};
    const totalCollected = Number(summary.totalReceived ?? summary.totalPaid ?? 0);
    const totalInvoiced = Number(summary.totalInvoiced ?? 0);
    const totalOutstanding = Number(summary.totalOutstanding ?? Math.max(0, totalInvoiced - totalCollected));
    const customerReceivables = (data.customerReceivables ?? []).map((c: any) => {
      const outstanding = Number(c.outstandingBalance ?? c.totalOutstanding ?? Math.max(0, Number(c.totalInvoiced || 0) - Number(c.totalPaid || 0)));
      return {
        ...c,
        totalOutstanding: outstanding,
        outstandingBalance: outstanding,
      };
    });
    return {
      summary: {
        totalInvoiced,
        totalReceived: totalCollected,
        totalPaid: totalCollected,
        totalOutstanding,
        customersCount: Number(summary.customersCount ?? customerReceivables.length),
      },
      customerReceivables,
      customers: customerReceivables,
    };
  },

  updateAmcPaymentStatus: async (
    contractId: string,
    paymentStatus: string,
    notes?: string
  ): Promise<any> => {
    const res: any = await apiClient.put(`/payments/amc-contracts/${contractId}/status`, {
      paymentStatus,
      notes,
    });
    return res.data;
  },
};
