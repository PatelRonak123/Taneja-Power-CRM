import { apiClient } from '../../../app/api/apiClient';
import type {
  ProformaInvoice,
  CreateProformaInvoicePayload,
  ListProformaInvoicesParams,
} from '../types/proforma-invoice.types';

const BASE_URL = '/proforma-invoices';

export const proformaInvoiceApi = {
  list: async (
    query: ListProformaInvoicesParams = {}
  ): Promise<{
    data: ProformaInvoice[];
    total: number;
    metrics: {
      totalAmount: number;
      totalAdvanceRequested: number;
      totalPaid: number;
      totalCount: number;
      issuedCount: number;
      paidCount: number;
    };
  }> => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    if (query.customerId) params.set('customerId', query.customerId);
    if (query.salesOrderId) params.set('salesOrderId', query.salesOrderId);
    if (query.fromDate) params.set('fromDate', query.fromDate);
    if (query.toDate) params.set('toDate', query.toDate);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const qs = params.toString();
    const res: any = await apiClient.get(`${BASE_URL}${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getById: async (id: string): Promise<ProformaInvoice> => {
    const res: any = await apiClient.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  createFromSalesOrder: async (
    salesOrderId: string,
    payload: CreateProformaInvoicePayload = {}
  ): Promise<ProformaInvoice> => {
    const res: any = await apiClient.post(
      `${BASE_URL}/from-sales-order/${salesOrderId}`,
      payload
    );
    return res.data;
  },

  update: async (
    id: string,
    payload: Partial<CreateProformaInvoicePayload>
  ): Promise<ProformaInvoice> => {
    const res: any = await apiClient.patch(`${BASE_URL}/${id}`, payload);
    return res.data;
  },

  issue: async (id: string): Promise<ProformaInvoice> => {
    const res: any = await apiClient.post(`${BASE_URL}/${id}/issue`);
    return res.data;
  },

  cancel: async (id: string, reason: string): Promise<ProformaInvoice> => {
    const res: any = await apiClient.post(`${BASE_URL}/${id}/cancel`, { reason });
    return res.data;
  },

  sendEmail: async (
    id: string,
    payload: { to?: string; subject?: string; customMessage?: string } = {}
  ): Promise<{ delivered: boolean; messageId?: string }> => {
    const res: any = await apiClient.post(`${BASE_URL}/${id}/send-email`, payload);
    return res.data;
  },
};
