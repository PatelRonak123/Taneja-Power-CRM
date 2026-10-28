export interface ProductDto {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string;
  price: number;
  stockQuantity: number;
  status: string;
  gstRate?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedProductsDto {
  items: ProductDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
