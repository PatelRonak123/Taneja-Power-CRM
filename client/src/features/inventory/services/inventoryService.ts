import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import { StockMovement, AdjustStockPayload, InventoryItem } from '../types/inventory.types';

export const inventoryService = {
  getCurrentInventory: async (params?: Record<string, unknown>): Promise<ApiEnvelope<InventoryItem[]>> => {
    return apiClient.get('/inventory', { params }) as unknown as Promise<ApiEnvelope<InventoryItem[]>>;
  },

  getStockMovements: async (
    productId: string,
    params?: Record<string, unknown>
  ): Promise<ApiEnvelope<StockMovement[]>> => {
    return apiClient.get(`/inventory/${productId}/movements`, { params }) as unknown as Promise<
      ApiEnvelope<StockMovement[]>
    >;
  },

  adjustStock: async (payload: AdjustStockPayload): Promise<ApiEnvelope<StockMovement>> => {
    return apiClient.post('/inventory/adjust', payload) as unknown as Promise<ApiEnvelope<StockMovement>>;
  },
};
