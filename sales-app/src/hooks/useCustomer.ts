import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiEnvelope } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { Customer, CustomerDestination } from '../types/customer.types';

export const useCustomerDetails = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-details', customerId],
    queryFn: async (): Promise<Customer> => {
      const [customerRes, destinationsRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.CUSTOMERS.GET_BY_ID(customerId)) as Promise<ApiEnvelope<Customer>>,
        apiClient.get(API_ENDPOINTS.CUSTOMERS.GET_DESTINATIONS(customerId)) as Promise<ApiEnvelope<CustomerDestination[]>>,
      ]);

      return {
        ...customerRes.data,
        destinations: destinationsRes.data || [],
      };
    },
    enabled: Boolean(customerId),
  });
};

export const useCustomerList = (search?: string) => {
  return useQuery({
    queryKey: ['customers-list', search],
    queryFn: async (): Promise<Customer[]> => {
      const res = (await apiClient.get(API_ENDPOINTS.CUSTOMERS.LIST, {
        params: { search: search?.trim() || undefined, limit: 100 },
      })) as unknown as ApiEnvelope<Customer[]>;
      return res.data || [];
    },
  });
};

export const useCustomerDestinations = (customerId?: string | null) => {
  return useQuery({
    queryKey: ['customer-destinations', customerId],
    queryFn: async (): Promise<CustomerDestination[]> => {
      if (!customerId) return [];
      const res = (await apiClient.get(
        API_ENDPOINTS.CUSTOMERS.GET_DESTINATIONS(customerId)
      )) as unknown as ApiEnvelope<CustomerDestination[]>;
      return res.data || [];
    },
    enabled: Boolean(customerId),
  });
};
