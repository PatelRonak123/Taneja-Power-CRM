import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import {
  Customer,
  CustomerDestination,
  CustomerQueryParams,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CreateDestinationPayload,
  UpdateDestinationPayload,
} from '../types/customer.types';

export const customerService = {
  // Customer APIs
  getCustomers: async (params?: CustomerQueryParams): Promise<ApiEnvelope<Customer[]>> => {
    return apiClient.get('/customers', { params }) as unknown as Promise<ApiEnvelope<Customer[]>>;
  },

  getCustomerById: async (id: string): Promise<ApiEnvelope<Customer>> => {
    return apiClient.get(`/customers/${id}`) as unknown as Promise<ApiEnvelope<Customer>>;
  },

  createCustomer: async (payload: CreateCustomerPayload): Promise<ApiEnvelope<Customer>> => {
    return apiClient.post('/customers', payload) as unknown as Promise<ApiEnvelope<Customer>>;
  },

  updateCustomer: async (id: string, payload: UpdateCustomerPayload): Promise<ApiEnvelope<Customer>> => {
    return apiClient.put(`/customers/${id}`, payload) as unknown as Promise<ApiEnvelope<Customer>>;
  },

  deleteCustomer: async (id: string): Promise<ApiEnvelope<{ id: string }>> => {
    return apiClient.delete(`/customers/${id}`) as unknown as Promise<ApiEnvelope<{ id: string }>>;
  },

  // Destination APIs
  getDestinations: async (customerId: string): Promise<ApiEnvelope<CustomerDestination[]>> => {
    return apiClient.get(`/customers/${customerId}/destinations`) as unknown as Promise<
      ApiEnvelope<CustomerDestination[]>
    >;
  },

  getDestinationById: async (
    customerId: string,
    destinationId: string
  ): Promise<ApiEnvelope<CustomerDestination>> => {
    return apiClient.get(
      `/customers/${customerId}/destinations/${destinationId}`
    ) as unknown as Promise<ApiEnvelope<CustomerDestination>>;
  },

  createDestination: async (
    customerId: string,
    payload: CreateDestinationPayload
  ): Promise<ApiEnvelope<CustomerDestination>> => {
    return apiClient.post(
      `/customers/${customerId}/destinations`,
      payload
    ) as unknown as Promise<ApiEnvelope<CustomerDestination>>;
  },

  updateDestination: async (
    customerId: string,
    destinationId: string,
    payload: UpdateDestinationPayload
  ): Promise<ApiEnvelope<CustomerDestination>> => {
    return apiClient.put(
      `/customers/${customerId}/destinations/${destinationId}`,
      payload
    ) as unknown as Promise<ApiEnvelope<CustomerDestination>>;
  },

  deleteDestination: async (
    customerId: string,
    destinationId: string
  ): Promise<ApiEnvelope<{ id: string }>> => {
    return apiClient.delete(
      `/customers/${customerId}/destinations/${destinationId}`
    ) as unknown as Promise<ApiEnvelope<{ id: string }>>;
  },
};
