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
