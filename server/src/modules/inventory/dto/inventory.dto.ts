import { InventoryMovementType, InventoryReferenceType } from '../../../config/constants.js';

export interface StockMovementDto {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  movementType: InventoryMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType: InventoryReferenceType;
  referenceId: string | null;
  reason: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface StockInInput {
  productId: string;
  quantity: number;
  referenceType?: InventoryReferenceType;
  referenceId?: string | null;
  reason?: string | null;
}

export interface StockOutInput {
  productId: string;
  quantity: number;
  referenceType?: InventoryReferenceType;
  referenceId?: string | null;
  reason?: string | null;
}

export interface StockAdjustmentInput {
  productId: string;
  quantity?: number; // signed delta (+5 or -3)
  newQuantity?: number; // absolute physical stock target (e.g. 97)
  reason: string; // required remarks for auditability
  referenceId?: string | null;
}

export interface InventoryItemDto {
  productId: string;
  name: string;
  sku: string;
  category: string;
  stockQuantity: number;
  price: string;
  status: string;
  updatedAt: string;
}
