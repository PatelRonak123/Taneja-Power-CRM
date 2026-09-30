import { apiClient } from '../../../app/api/apiClient';
import type {
  SalesOrder,
  CreateSalesOrderPayload,
  UpdateSalesOrderPayload,
  CancelSalesOrderPayload,
  ListSalesOrdersQuery,
} from '../types/salesOrder.types';

const BASE = '/sales-orders';

export const salesOrderService = {
  // ─── List ──────────────────────────────────────────────────────────────────
  list: async (query: ListSalesOrdersQuery = {}): Promise<{ data: SalesOrder[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    if (query.customerId) params.set('customerId', query.customerId);
    if (query.quotationId) params.set('quotationId', query.quotationId);
    if (query.startDate) params.set('startDate', query.startDate);
    if (query.endDate) params.set('endDate', query.endDate);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const qs = params.toString();
    const res: any = await apiClient.get(`${BASE}${qs ? `?${qs}` : ''}`);
    return { data: res.data ?? [], meta: res.meta ?? {} };
  },

  // ─── Get by ID ─────────────────────────────────────────────────────────────
  getById: async (id: string): Promise<SalesOrder> => {
    const res: any = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },

  // ─── Create ────────────────────────────────────────────────────────────────
  create: async (payload: CreateSalesOrderPayload): Promise<SalesOrder> => {
    const res: any = await apiClient.post(BASE, payload);
    return res.data;
  },

  // ─── Update (DRAFT only) ───────────────────────────────────────────────────
  update: async (id: string, payload: UpdateSalesOrderPayload): Promise<SalesOrder> => {
    const res: any = await apiClient.put(`${BASE}/${id}`, payload);
    return res.data;
  },

  // ─── Submit (DRAFT → PENDING_CONFIRMATION) ─────────────────────────────────
  submit: async (id: string): Promise<SalesOrder> => {
    const res: any = await apiClient.post(`${BASE}/${id}/submit`);
    return res.data;
  },

  // ─── Confirm (PENDING_CONFIRMATION → CONFIRMED) ─────────────────────────────
  confirm: async (id: string): Promise<SalesOrder> => {
    const res: any = await apiClient.post(`${BASE}/${id}/confirm`);
    return res.data;
  },

  // ─── Cancel ────────────────────────────────────────────────────────────────
  cancel: async (id: string, payload: CancelSalesOrderPayload): Promise<SalesOrder> => {
    const res: any = await apiClient.post(`${BASE}/${id}/cancel`, payload);
    return res.data;
  },
};
