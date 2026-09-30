import { useQuery } from '@tanstack/react-query';
import { procurementService } from '../services/procurementService';
import { productService } from '../../products/services/productService';

// ─── Query key factory ────────────────────────────────────────────────────────
export const PROCUREMENT_KEYS = {
  suppliers: (params?: Record<string, unknown>) => ['procurement', 'suppliers', params] as const,
  purchaseOrders: (params?: Record<string, unknown>) => ['procurement', 'purchase-orders', params] as const,
  purchaseOrder: (id: string) => ['procurement', 'purchase-orders', id] as const,
  goodsReceipts: (params?: Record<string, unknown>) => ['procurement', 'goods-receipts', params] as const,
  goodsReceipt: (id: string) => ['procurement', 'goods-receipts', id] as const,
  products: () => ['procurement', 'catalog-products'] as const,
} as const;

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const useSuppliers = (params?: { search?: string; status?: string }) => {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.suppliers(params),
    queryFn: () =>
      procurementService.getSuppliers({
        search: params?.search || undefined,
        status: params?.status || undefined,
        limit: 100,
      }),
    staleTime: 15_000,
    select: (res) => res.data ?? [],
  });
};

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const usePurchaseOrders = (params?: { search?: string; status?: string }) => {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.purchaseOrders(params),
    queryFn: () =>
      procurementService.getPurchaseOrders({
        search: params?.search || undefined,
        status: params?.status || undefined,
        limit: 100,
      }),
    staleTime: 10_000,
    select: (res) => res.data ?? [],
  });
};

export const usePurchaseOrder = (id: string, enabled = true) => {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.purchaseOrder(id),
    queryFn: () => procurementService.getPurchaseOrderById(id),
    enabled: enabled && !!id,
    select: (res) => res.data,
  });
};

// ─── Goods Receipts ───────────────────────────────────────────────────────────
export const useGoodsReceipts = (params?: { search?: string }) => {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.goodsReceipts(params),
    queryFn: () =>
      procurementService.getGoodsReceipts({
        search: params?.search || undefined,
        limit: 100,
      }),
    staleTime: 10_000,
    select: (res) => res.data ?? [],
  });
};

export const useGoodsReceipt = (id: string, enabled = true) => {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.goodsReceipt(id),
    queryFn: () => procurementService.getGoodsReceiptById(id),
    enabled: enabled && !!id,
    select: (res) => res.data,
  });
};

// ─── Product catalog (for PO line-item dropdowns) ────────────────────────────
export const useProcurementProducts = () => {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.products(),
    queryFn: () => productService.getProducts({ limit: 200, status: 'ACTIVE' }),
    staleTime: 60_000,
    select: (res) => res.data ?? [],
  });
};
