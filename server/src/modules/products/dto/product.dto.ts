export interface ProductDto {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string;
  price: number;
  stockQuantity: number;
  status: string;

  // Catalogue master fields (public)
  brand?: string | null;
  model?: string | null;
  subModel?: string | null;
  series?: string | null;
  warrantyDescription?: string | null;
  hsnSac?: string | null;
  gstRate?: number | null;
  unit?: string;
  moq?: number | null;
  mrp?: number | null;
  priceOnRequest?: boolean;
  capacityRating?: string | null;
  phase?: string | null;
  technicalSpecifications?: string | null;
  parentProductId?: string | null;
  parentProduct?: {
    id: string;
    name: string;
    sku: string;
    brand?: string | null;
    model?: string | null;
  } | null;

  // Commercial / confidential pricing tiers (internal only)
  dealerPrice?: number | null;
  partnerPrice?: number | null;
  dtp?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  basicPrice?: number | null;
  gstPaidPrice?: number | null;
  recommendedPrice?: number | null;

  // Source audit traceability
  sourceSheet?: string | null;
  sourceRowNumber?: number | null;

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
