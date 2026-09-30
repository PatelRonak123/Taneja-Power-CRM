import { useMutation, useQueryClient } from '@tanstack/react-query';
import { procurementService } from '../services/procurementService';
import { PROCUREMENT_KEYS } from './useProcurementQueries';
import { toast } from '../../../utils/toast';
import { Supplier } from '../types/procurement.types';

// ─── Supplier mutations ───────────────────────────────────────────────────────
export const useCreateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Supplier>) => procurementService.createSupplier(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement', 'suppliers'] });
      toast.success('Supplier created successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to create supplier', err?.response?.data?.message || err?.message);
    },
  });
};

export const useUpdateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Supplier> }) =>
      procurementService.updateSupplier(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement', 'suppliers'] });
      toast.success('Supplier updated successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to update supplier', err?.response?.data?.message || err?.message);
    },
  });
};

export const useSetSupplierStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      procurementService.setSupplierStatus(id, status),
    onSuccess: (_res, { status }) => {
      qc.invalidateQueries({ queryKey: ['procurement', 'suppliers'] });
      toast.success(`Supplier marked as ${status}`);
    },
    onError: (err: any) => {
      toast.error('Failed to update supplier status', err?.response?.data?.message || err?.message);
    },
  });
};

// ─── Purchase Order mutations ─────────────────────────────────────────────────
type CreatePoPayload = Parameters<typeof procurementService.createPurchaseOrder>[0];

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePoPayload) => procurementService.createPurchaseOrder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] });
      toast.success('Purchase order created in DRAFT status');
    },
    onError: (err: any) => {
      toast.error('Failed to create purchase order', err?.response?.data?.message || err?.message);
    },
  });
};

export const useSubmitPurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => procurementService.submitPurchaseOrder(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] });
      qc.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrder(id) });
      toast.success('Purchase order submitted for approval');
    },
    onError: (err: any) => {
      toast.error('Failed to submit purchase order', err?.response?.data?.message || err?.message);
    },
  });
};

export const useApprovePurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => procurementService.approvePurchaseOrder(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] });
      qc.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrder(id) });
      toast.success(
        'Purchase order approved',
        'Inventory remains unchanged until a Goods Receipt is posted.'
      );
    },
    onError: (err: any) => {
      toast.error('Failed to approve purchase order', err?.response?.data?.message || err?.message);
    },
  });
};

export const useCancelPurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => procurementService.cancelPurchaseOrder(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] });
      qc.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrder(id) });
      toast.success('Purchase order cancelled');
    },
    onError: (err: any) => {
      toast.error('Failed to cancel purchase order', err?.response?.data?.message || err?.message);
    },
  });
};

// ─── Goods Receipt mutations ──────────────────────────────────────────────────
type CreateGrnPayload = Parameters<typeof procurementService.createGoodsReceipt>[0];

export const useCreateGoodsReceipt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGrnPayload) => procurementService.createGoodsReceipt(payload),
    onSuccess: (_res, payload) => {
      qc.invalidateQueries({ queryKey: ['procurement', 'goods-receipts'] });
      qc.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] });
      toast.success(
        payload.autoPost
          ? 'Goods receipt posted! Inventory updated and stock ledger recorded.'
          : 'Goods receipt saved as draft (inventory unchanged).'
      );
    },
    onError: (err: any) => {
      toast.error('Failed to process goods receipt', err?.response?.data?.message || err?.message);
    },
  });
};

export const usePostGoodsReceipt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => procurementService.postGoodsReceipt(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['procurement', 'goods-receipts'] });
      qc.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] });
      qc.invalidateQueries({ queryKey: PROCUREMENT_KEYS.goodsReceipt(id) });
      toast.success('Goods receipt posted! Inventory updated via StockService.');
    },
    onError: (err: any) => {
      toast.error('Failed to post goods receipt', err?.response?.data?.message || err?.message);
    },
  });
};
