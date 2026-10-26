export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string;
  price: number;
  stockQuantity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  createdAt: string;
  updatedAt: string;
}

export interface ProductQueryParams {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  description?: string;
  category: string;
  price: number;
  stockQuantity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
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

