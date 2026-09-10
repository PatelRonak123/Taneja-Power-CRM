export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';

export interface ProductFilterParams {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}
