import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesOrderService } from '../services/salesOrderService';
import type {
  ListSalesOrdersQuery,
  CreateSalesOrderPayload,
  UpdateSalesOrderPayload,
  CancelSalesOrderPayload,
} from '../types/salesOrder.types';
import { toast } from '../../../utils/toast';

// ─── Query Key Factory ───────────────────────────────────────────────────────

export const SALES_ORDER_KEYS = {
  all: ['sales-orders'] as const,
  lists: () => [...SALES_ORDER_KEYS.all, 'list'] as const,
  list: (filters: ListSalesOrdersQuery) => [...SALES_ORDER_KEYS.lists(), filters] as const,
  details: () => [...SALES_ORDER_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SALES_ORDER_KEYS.details(), id] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export const useSalesOrders = (query: ListSalesOrdersQuery = {}) =>
  useQuery({
    queryKey: SALES_ORDER_KEYS.list(query),
    queryFn: () => salesOrderService.list(query),
    staleTime: 30_000,
  });

export const useSalesOrder = (id: string) =>
  useQuery({
    queryKey: SALES_ORDER_KEYS.detail(id),
    queryFn: () => salesOrderService.getById(id),
    enabled: !!id,
    staleTime: 15_000,
  });

// ─── Mutations ───────────────────────────────────────────────────────────────

export const useCreateSalesOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalesOrderPayload) => salesOrderService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SALES_ORDER_KEYS.lists() });
      toast.success('Sales Order created successfully');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create Sales Order'),
  });
};

export const useUpdateSalesOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSalesOrderPayload }) =>
      salesOrderService.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: SALES_ORDER_KEYS.lists() });
      qc.invalidateQueries({ queryKey: SALES_ORDER_KEYS.detail(id) });
      toast.success('Sales Order updated');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update Sales Order'),
  });
};

export const useSubmitSalesOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesOrderService.submit(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: SALES_ORDER_KEYS.lists() });
      qc.invalidateQueries({ queryKey: SALES_ORDER_KEYS.detail(id) });
      toast.success('Sales Order submitted for confirmation');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to submit Sales Order'),
  });
};

export const useConfirmSalesOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesOrderService.confirm(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: SALES_ORDER_KEYS.lists() });
      qc.invalidateQueries({ queryKey: SALES_ORDER_KEYS.detail(id) });
      toast.success('Sales Order confirmed successfully');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to confirm Sales Order'),
  });
};

export const useCancelSalesOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelSalesOrderPayload }) =>
      salesOrderService.cancel(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: SALES_ORDER_KEYS.lists() });
      qc.invalidateQueries({ queryKey: SALES_ORDER_KEYS.detail(id) });
      toast.success('Sales Order cancelled');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to cancel Sales Order'),
  });
};
