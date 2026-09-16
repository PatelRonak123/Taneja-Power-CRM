import { apiClient } from '../../../app/api/apiClient';
import { Lead } from '../types/lead';

export const leadsApi = {
  getLeads: async (params?: {
    search?: string;
    status?: string;
    priority?: string;
    assignee?: string;
  }): Promise<Lead[]> => {
    try {
      const data = await apiClient.get<unknown, Lead[]>('/leads', { params });
      return data || [];
    } catch (error) {
      console.warn('Backend leads API unavailable, using local state fallback:', error);
      throw error;
    }
  },

  getLeadById: async (id: string): Promise<Lead> => {
    const data = await apiClient.get<unknown, Lead>(`/leads/${id}`);
    return data;
  },

  createLead: async (leadData: Partial<Lead>): Promise<Lead> => {
    const data = await apiClient.post<unknown, Lead>('/leads', leadData);
    return data;
  },

  updateLead: async (id: string, leadData: Partial<Lead>): Promise<Lead> => {
    const data = await apiClient.put<unknown, Lead>(`/leads/${id}`, leadData);
    return data;
  },

  deleteLead: async (id: string): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },
};
