import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiEnvelope } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  basePrice?: string | number | null;
  description?: string | null;
}

export const useProductsList = (search?: string) => {
  return useQuery({
    queryKey: ['products-list', search],
    queryFn: async (): Promise<ProductItem[]> => {
      const res = (await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, {
        params: { search: search?.trim() || undefined, limit: 100 },
      })) as unknown as ApiEnvelope<ProductItem[]>;
      return res.data || [];
    },
  });
};
