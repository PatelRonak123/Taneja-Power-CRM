import { apiClient, ApiEnvelope } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  AmcServiceReportData,
  UpdateAmcReportPayload,
  CompleteAmcVisitPayload,
} from '../types/amc.types';

export const amcService = {
  /**
   * Get existing AMC Service Report for a visit, or create a draft if not created yet.
   */
  async getOrCreateReport(visitId: string): Promise<AmcServiceReportData> {
    const response = (await apiClient.get(
      API_ENDPOINTS.AMC_CONTRACTS.GET_VISIT_REPORT(visitId)
    )) as unknown as ApiEnvelope<AmcServiceReportData>;
    return response.data;
  },

  /**
   * Save draft updates to the AMC Service Report
   */
  async updateReport(
    visitId: string,
    payload: UpdateAmcReportPayload
  ): Promise<AmcServiceReportData> {
    const response = (await apiClient.post(
      API_ENDPOINTS.AMC_CONTRACTS.UPDATE_VISIT_REPORT(visitId),
      payload
    )) as unknown as ApiEnvelope<AmcServiceReportData>;
    return response.data;
  },

  /**
   * Finalize and submit the AMC Service Report, marking visit and linked task as COMPLETED.
   */
  async completeVisit(
    visitId: string,
    payload: CompleteAmcVisitPayload
  ): Promise<any> {
    const response = (await apiClient.post(
      API_ENDPOINTS.AMC_CONTRACTS.COMPLETE_VISIT(visitId),
      payload
    )) as unknown as ApiEnvelope<any>;
    return response.data;
  },
};
