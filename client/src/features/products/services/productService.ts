import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import { Product, ProductQueryParams, CreateProductPayload, UpdateProductPayload } from '../types/product.types';

export const productService = {
  getProducts: async (params?: ProductQueryParams): Promise<ApiEnvelope<Product[]>> => {
    return apiClient.get('/products', { params }) as unknown as Promise<ApiEnvelope<Product[]>>;
  },

  getProductById: async (id: string): Promise<ApiEnvelope<Product>> => {
    return apiClient.get(`/products/${id}`) as unknown as Promise<ApiEnvelope<Product>>;
  },

  createProduct: async (payload: CreateProductPayload): Promise<ApiEnvelope<Product>> => {
    return apiClient.post('/products', payload) as unknown as Promise<ApiEnvelope<Product>>;
  },

  updateProduct: async (id: string, payload: UpdateProductPayload): Promise<ApiEnvelope<Product>> => {
    return apiClient.put(`/products/${id}`, payload) as unknown as Promise<ApiEnvelope<Product>>;
  },

  deleteProduct: async (id: string): Promise<ApiEnvelope<{ id: string }>> => {
    return apiClient.delete(`/products/${id}`) as unknown as Promise<ApiEnvelope<{ id: string }>>;
  },
};
