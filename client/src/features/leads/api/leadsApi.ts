import { apiClient } from '../../../app/api/apiClient';
import { Lead } from '../types/lead';
import { Customer, CustomerDestination, CreateDestinationPayload } from '../../customers/types/customer.types';

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

  getLeadDestinations: async (leadId: string): Promise<CustomerDestination[]> => {
    try {
      const response = await apiClient.get<any, any>(`/leads/${leadId}/destinations`);
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (error) {
      console.warn('Backend lead destinations API error:', error);
      return [];
    }
  },

  createLeadDestination: async (leadId: string, payload: CreateDestinationPayload): Promise<CustomerDestination> => {
    const response = await apiClient.post<any, any>(`/leads/${leadId}/destinations`, payload);
    return response?.data || response;
  },

  updateLeadDestination: async (
    leadId: string,
    destinationId: string,
    payload: Partial<CreateDestinationPayload>
  ): Promise<CustomerDestination> => {
    const response = await apiClient.put<any, any>(`/leads/${leadId}/destinations/${destinationId}`, payload);
    return response?.data || response;
  },

  deleteLeadDestination: async (leadId: string, destinationId: string): Promise<boolean> => {
    const response = await apiClient.delete<any, any>(`/leads/${leadId}/destinations/${destinationId}`);
    return response?.success ?? true;
  },

  convertToCustomer: async (leadId: string): Promise<{ customer: Customer; lead: Lead }> => {
    const response = await apiClient.post<any, any>(`/leads/${leadId}/convert-to-customer`);
    return response?.data || response;
  },
};

