export interface StockMovement {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType: 'AMC' | 'MANUAL_ADJUSTMENT' | 'PURCHASE_RECEIPT' | 'DISPATCH';
  referenceId: string | null;
  reason: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface AdjustStockPayload {
  productId: string;
  quantity?: number;
  newQuantity?: number;
  reason: string;
}

export interface InventoryItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  stockQuantity: number;
  price: string;
  status: string;
  updatedAt: string;
}
