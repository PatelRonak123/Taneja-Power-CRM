import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followUpService } from '../services/followUpService';
import {
  FollowUpQueryParams,
  CreateFollowUpPayload,
  UpdateFollowUpPayload,
  CompleteFollowUpPayload,
  RescheduleFollowUpPayload,
  CancelFollowUpPayload,
} from '../types/follow-up.types';
import { toast } from '../../../utils/toast';

export const FOLLOW_UP_QUERY_KEYS = {
  all: ['follow-ups'] as const,
  list: (params?: FollowUpQueryParams) => ['follow-ups', 'list', params] as const,
  metrics: () => ['follow-ups', 'metrics'] as const,
  detail: (id: string) => ['follow-ups', 'detail', id] as const,
};

export const useFollowUps = (params?: FollowUpQueryParams, enabled = true) => {
  return useQuery({
    queryKey: FOLLOW_UP_QUERY_KEYS.list(params),
    queryFn: () => followUpService.getFollowUps(params),
    enabled,
    staleTime: 15000,
  });
};

export const useFollowUpMetrics = (enabled = true) => {
  return useQuery({
    queryKey: FOLLOW_UP_QUERY_KEYS.metrics(),
    queryFn: () => followUpService.getMetrics(),
    enabled,
    staleTime: 15000,
  });
};

export const useFollowUp = (id: string, enabled = true) => {
  return useQuery({
    queryKey: FOLLOW_UP_QUERY_KEYS.detail(id),
    queryFn: () => followUpService.getFollowUpById(id),
    enabled: enabled && !!id,
  });
};

export const useCreateFollowUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFollowUpPayload) => followUpService.createFollowUp(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-followups'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard-followups'] });
      queryClient.invalidateQueries({ queryKey: ['quotation'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['amc-contract'] });
      toast.success(
        'Follow-up scheduled successfully',
        `Follow-up ${res.data?.followUpNumber || ''} created for ${res.data?.scheduledDate || ''}`
      );
    },
    onError: (err: any) => {
      toast.error('Failed to create follow-up', err?.message || 'Please check your inputs.');
    },
  });
};

export const useUpdateFollowUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFollowUpPayload }) =>
      followUpService.updateFollowUp(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.detail(variables.id) });
      toast.success('Follow-up updated successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to update follow-up', err?.message);
    },
  });
};

export const useCompleteFollowUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompleteFollowUpPayload }) =>
      followUpService.completeFollowUp(id, payload),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-followups'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard-followups'] });
      queryClient.invalidateQueries({ queryKey: ['quotation'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['amc-contract'] });
      toast.success('Follow-up completed successfully', 'The interaction has been logged into CRM history.');
    },
    onError: (err: any) => {
      toast.error('Unable to complete follow-up', err?.message);
    },
  });
};

export const useRescheduleFollowUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RescheduleFollowUpPayload }) =>
      followUpService.rescheduleFollowUp(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-followups'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard-followups'] });
      toast.success('Follow-up rescheduled successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to reschedule follow-up', err?.message);
    },
  });
};

export const useCancelFollowUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelFollowUpPayload }) =>
      followUpService.cancelFollowUp(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-followups'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard-followups'] });
      toast.success('Follow-up cancelled successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to cancel follow-up', err?.message);
    },
  });
};

export const useDeleteFollowUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => followUpService.deleteFollowUp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_UP_QUERY_KEYS.all });
      toast.success('Follow-up deleted successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to delete follow-up', err?.message);
    },
  });
};
