import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import {
  FollowUpItem,
  FollowUpMetrics,
  FollowUpQueryParams,
  CreateFollowUpPayload,
  UpdateFollowUpPayload,
  CompleteFollowUpPayload,
  RescheduleFollowUpPayload,
  CancelFollowUpPayload,
} from '../types/follow-up.types';

export const followUpService = {
  getFollowUps: async (params?: FollowUpQueryParams): Promise<ApiEnvelope<FollowUpItem[]>> => {
    return apiClient.get('/follow-ups', { params }) as unknown as Promise<ApiEnvelope<FollowUpItem[]>>;
  },

  getMetrics: async (): Promise<ApiEnvelope<FollowUpMetrics>> => {
    return apiClient.get('/follow-ups/metrics') as unknown as Promise<ApiEnvelope<FollowUpMetrics>>;
  },

  getFollowUpById: async (id: string): Promise<ApiEnvelope<FollowUpItem>> => {
    return apiClient.get(`/follow-ups/${id}`) as unknown as Promise<ApiEnvelope<FollowUpItem>>;
  },

  createFollowUp: async (payload: CreateFollowUpPayload): Promise<ApiEnvelope<FollowUpItem>> => {
    return apiClient.post('/follow-ups', payload) as unknown as Promise<ApiEnvelope<FollowUpItem>>;
  },

  updateFollowUp: async (id: string, payload: UpdateFollowUpPayload): Promise<ApiEnvelope<FollowUpItem>> => {
    return apiClient.patch(`/follow-ups/${id}`, payload) as unknown as Promise<ApiEnvelope<FollowUpItem>>;
  },

  completeFollowUp: async (id: string, payload: CompleteFollowUpPayload): Promise<ApiEnvelope<FollowUpItem>> => {
    return apiClient.post(`/follow-ups/${id}/complete`, payload) as unknown as Promise<ApiEnvelope<FollowUpItem>>;
  },

  rescheduleFollowUp: async (id: string, payload: RescheduleFollowUpPayload): Promise<ApiEnvelope<FollowUpItem>> => {
    return apiClient.post(`/follow-ups/${id}/reschedule`, payload) as unknown as Promise<ApiEnvelope<FollowUpItem>>;
  },

  cancelFollowUp: async (id: string, payload: CancelFollowUpPayload): Promise<ApiEnvelope<FollowUpItem>> => {
    return apiClient.post(`/follow-ups/${id}/cancel`, payload) as unknown as Promise<ApiEnvelope<FollowUpItem>>;
  },

  deleteFollowUp: async (id: string): Promise<ApiEnvelope<{ id: string }>> => {
    return apiClient.delete(`/follow-ups/${id}`) as unknown as Promise<ApiEnvelope<{ id: string }>>;
  },
};
