import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatchService } from '../services/dispatchService';
import type {
  ListDispatchesQuery,
  CreateDispatchPayload,
  UpdateDispatchPayload,
  CancelDispatchPayload,
} from '../types/dispatch.types';
import { toast } from '../../../utils/toast';

export const DISPATCH_KEYS = {
  all: ['dispatches'] as const,
  lists: () => [...DISPATCH_KEYS.all, 'list'] as const,
  list: (filters: ListDispatchesQuery) => [...DISPATCH_KEYS.lists(), filters] as const,
  details: () => [...DISPATCH_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...DISPATCH_KEYS.details(), id] as const,
  dispatchable: (soId: string) => [...DISPATCH_KEYS.all, 'dispatchable', soId] as const,
};

export const useDispatches = (query: ListDispatchesQuery = {}) =>
  useQuery({
    queryKey: DISPATCH_KEYS.list(query),
    queryFn: () => dispatchService.listDispatches(query),
    staleTime: 30_000,
  });

export const useDispatch = (id: string) =>
  useQuery({
    queryKey: DISPATCH_KEYS.detail(id),
    queryFn: () => dispatchService.getDispatchById(id),
    enabled: !!id,
    staleTime: 15_000,
  });

export const useDispatchableItems = (salesOrderId: string) =>
  useQuery({
    queryKey: DISPATCH_KEYS.dispatchable(salesOrderId),
    queryFn: () => dispatchService.getDispatchableItems(salesOrderId),
    enabled: !!salesOrderId,
    staleTime: 15_000,
  });

export const useCreateDispatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDispatchPayload) => dispatchService.createDispatch(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DISPATCH_KEYS.all });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Dispatch / Delivery Challan created successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to create dispatch');
    },
  });
};

export const useUpdateDispatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDispatchPayload }) =>
      dispatchService.updateDispatch(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: DISPATCH_KEYS.detail(vars.id) });
      qc.invalidateQueries({ queryKey: DISPATCH_KEYS.lists() });
      toast.success('Dispatch updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to update dispatch');
    },
  });
};

export const useSubmitDispatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dispatchService.submitDispatch(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: DISPATCH_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: DISPATCH_KEYS.lists() });
      toast.success('Dispatch submitted for approval');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit dispatch');
    },
  });
};

export const useConfirmDispatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dispatchService.confirmDispatch(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: DISPATCH_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: DISPATCH_KEYS.lists() });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Dispatch confirmed! Inventory Stock OUT successfully executed.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to confirm dispatch');
    },
  });
};

export const useCancelDispatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelDispatchPayload }) =>
      dispatchService.cancelDispatch(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: DISPATCH_KEYS.detail(vars.id) });
      qc.invalidateQueries({ queryKey: DISPATCH_KEYS.lists() });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Dispatch cancelled');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to cancel dispatch');
    },
  });
};
