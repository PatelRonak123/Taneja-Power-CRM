import { apiClient } from '../../../app/api/apiClient';
import type {
  CustomerEquipment,
  ListCustomerEquipmentQuery,
  UpdateCustomerEquipmentPayload,
  CreateManualCustomerEquipmentPayload,
} from '../types/customer-equipment.types';

const BASE_URL = '/customer-equipment';

export const customerEquipmentService = {
  listEquipment: async (
    query: ListCustomerEquipmentQuery = {}
  ): Promise<{ data: CustomerEquipment[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.customerId) params.set('customerId', query.customerId);
    if (query.productId) params.set('productId', query.productId);
    if (query.assetStatus) params.set('assetStatus', query.assetStatus);
    if (query.conditionStatus) params.set('conditionStatus', query.conditionStatus);
    if (query.serialNumber) params.set('serialNumber', query.serialNumber);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const qs = params.toString();
    const res: any = await apiClient.get(`${BASE_URL}${qs ? `?${qs}` : ''}`);
    return { data: res.data ?? [], meta: res.meta ?? {} };
  },

  getEquipmentById: async (id: string): Promise<CustomerEquipment> => {
    const res: any = await apiClient.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  getEquipmentByCustomer: async (customerId: string): Promise<CustomerEquipment[]> => {
    const res: any = await apiClient.get(`/customers/${customerId}/equipment`);
    return res.data ?? [];
  },

  getEquipmentServiceHistory: async (id: string): Promise<any> => {
    const res: any = await apiClient.get(`${BASE_URL}/${id}/service-history`);
    return res.data;
  },

  getEquipmentAmcHistory: async (id: string): Promise<any> => {
    const res: any = await apiClient.get(`${BASE_URL}/${id}/amc-history`);
    return res.data;
  },

  updateEquipment: async (
    id: string,
    payload: UpdateCustomerEquipmentPayload
  ): Promise<CustomerEquipment> => {
    const res: any = await apiClient.patch(`${BASE_URL}/${id}`, payload);
    return res.data;
  },

  createManualEquipment: async (
    payload: CreateManualCustomerEquipmentPayload
  ): Promise<CustomerEquipment> => {
    const res: any = await apiClient.post(`${BASE_URL}/manual`, payload);
    return res.data;
  },
};
