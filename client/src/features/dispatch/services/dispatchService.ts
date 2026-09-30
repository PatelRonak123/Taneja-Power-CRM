import { apiClient } from '../../../app/api/apiClient';
import type {
  Dispatch,
  CreateDispatchPayload,
  UpdateDispatchPayload,
  CancelDispatchPayload,
  ListDispatchesQuery,
  DispatchableSummary,
} from '../types/dispatch.types';

const BASE_URL = '/dispatches';

export const dispatchService = {
  listDispatches: async (
    query: ListDispatchesQuery = {}
  ): Promise<{ data: Dispatch[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    if (query.customerId) params.set('customerId', query.customerId);
    if (query.salesOrderId) params.set('salesOrderId', query.salesOrderId);
    if (query.salesInvoiceId) params.set('salesInvoiceId', query.salesInvoiceId);
    if (query.startDate) params.set('startDate', query.startDate);
    if (query.endDate) params.set('endDate', query.endDate);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const qs = params.toString();
    const res: any = await apiClient.get(`${BASE_URL}${qs ? `?${qs}` : ''}`);
    return { data: res.data ?? [], meta: res.meta ?? {} };
  },

  getDispatchById: async (id: string): Promise<Dispatch> => {
    const res: any = await apiClient.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  getDispatchableItems: async (salesOrderId: string): Promise<DispatchableSummary> => {
    const res: any = await apiClient.get(`${BASE_URL}/sales-order/${salesOrderId}/dispatchable-items`);
    return res.data;
  },

  createDispatch: async (payload: CreateDispatchPayload): Promise<Dispatch> => {
    const res: any = await apiClient.post(BASE_URL, payload);
    return res.data;
  },

  updateDispatch: async (id: string, payload: UpdateDispatchPayload): Promise<Dispatch> => {
    const res: any = await apiClient.put(`${BASE_URL}/${id}`, payload);
    return res.data;
  },

  submitDispatch: async (id: string): Promise<Dispatch> => {
    const res: any = await apiClient.post(`${BASE_URL}/${id}/submit`);
    return res.data;
  },

  confirmDispatch: async (id: string): Promise<Dispatch> => {
    const res: any = await apiClient.post(`${BASE_URL}/${id}/dispatch`);
    return res.data;
  },

  cancelDispatch: async (id: string, payload: CancelDispatchPayload): Promise<Dispatch> => {
    const res: any = await apiClient.post(`${BASE_URL}/${id}/cancel`, payload);
    return res.data;
  },
};
