export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string;
  price: number;
  stockQuantity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';

  // Catalogue Master Metadata
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

  // Technical Specifications
  capacityRating?: string | null;
  phase?: string | null;
  technicalSpecifications?: string | null;

  // Hierarchical Linking
  parentProductId?: string | null;
  parentProduct?: {
    id: string;
    name: string;
    sku: string;
    brand?: string | null;
    model?: string | null;
  } | null;

  // Commercial / Confidential Pricing (Role Restricted)
  dealerPrice?: number | null;
  partnerPrice?: number | null;
  dtp?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  basicPrice?: number | null;
  gstPaidPrice?: number | null;
  recommendedPrice?: number | null;

  // Provenance
  sourceSheet?: string | null;
  sourceRowNumber?: number | null;

  createdAt: string;
  updatedAt: string;
}

export interface ProductQueryParams {
  search?: string;
  category?: string;
  brand?: string;
  status?: string;
  priceOnRequest?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  description?: string | null;
  category: string;
  price: number;
  stockQuantity: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';

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
  minPrice?: number | null;
  maxPrice?: number | null;

  dealerPrice?: number | null;
  partnerPrice?: number | null;
  dtp?: number | null;
  basicPrice?: number | null;
  gstPaidPrice?: number | null;
  recommendedPrice?: number | null;

  capacityRating?: string | null;
  phase?: string | null;
  technicalSpecifications?: string | null;
  parentProductId?: string | null;
}

export type UpdateProductPayload = Partial<CreateProductPayload> & {
  adjustmentReason?: string;
};

export interface ExcelImportPayload {
  fileData: string;
  fileName?: string;
  mode?: 'upsert' | 'skip_existing' | 'fail_on_existing';
  dryRun?: boolean;
}

export interface SeedExcelPayload {
  filePath?: string;
  mode?: 'upsert' | 'skip_existing' | 'fail_on_existing';
  dryRun?: boolean;
}

export interface ExcelImportResult {
  success: boolean;
  batchId: string;
  executionTimestamp: string;
  durationMs: number;
  dryRun: boolean;
  mode: 'upsert' | 'skip_existing' | 'fail_on_existing';
  totalParsed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  parentsCount: number;
  childrenCount: number;
  byBrand: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  rejectedRowsCount: number;
  rejectedRows?: Array<{ sheet: string; row: number; reason: string }>;
}

