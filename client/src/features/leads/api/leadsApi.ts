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
      const response = await apiClient.get<any, any>('/leads', { params });
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (error) {
      console.warn('Backend leads API unavailable:', error);
      throw error;
    }
  },

  getLeadById: async (id: string): Promise<Lead> => {
    const response = await apiClient.get<any, any>(`/leads/${id}`);
    return response?.data || response;
  },

  createLead: async (leadData: Partial<Lead>): Promise<Lead> => {
    const response = await apiClient.post<any, any>('/leads', leadData);
    return response?.data || response;
  },

  updateLead: async (id: string, leadData: Partial<Lead>): Promise<Lead> => {
    const response = await apiClient.put<any, any>(`/leads/${id}`, leadData);
    return response?.data || response;
  },

  deleteLead: async (id: string): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },

  getPipelineData: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get<any, any>('/leads/pipeline');
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (error) {
      console.warn('Backend pipeline API unavailable:', error);
      throw error;
    }
  },

  addLeadActivity: async (id: string, activity: { title: string; type?: string; author?: string }): Promise<any> => {
    try {
      const response = await apiClient.post<any, any>(`/leads/${id}/activity`, activity);
      return response?.data || response;
    } catch (error) {
      console.warn('Backend add lead activity endpoint fallback:', error);
      return null;
    }
  },
};
