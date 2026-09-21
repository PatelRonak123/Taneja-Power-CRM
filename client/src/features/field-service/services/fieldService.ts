import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import {
  FsrListItem,
  FsrDetailedView,
  FsrQueryParams,
  CreateFsrPayload,
  UpdateFsrPayload,
  AssignFsePayload,
  CustomerSignOffPayload,
  FseSignOffPayload,
  AttachmentUploadPayload,
  FsrSiteObservation,
  FsrBatteryBank,
  FsrBatteryReading,
  FsrPart,
  FsrAttachment,
  FsrActivityLog,
} from '../types/field-service.types';

export const fieldService = {
  /**
   * List FSRs with pagination & multi-criteria filters
   */
  getFsrs: async (params?: FsrQueryParams): Promise<ApiEnvelope<FsrListItem[]>> => {
    return apiClient.get('/field-service', { params }) as unknown as Promise<ApiEnvelope<FsrListItem[]>>;
  },

  /**
   * Get single FSR complete structured details
   */
  getFsrById: async (id: string): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.get(`/field-service/${id}`) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * Create new Field Service Report (Default: DRAFT)
   */
  createFsr: async (payload: CreateFsrPayload): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.post('/field-service', payload) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * Update master FSR & details
   */
  updateFsr: async (id: string, payload: UpdateFsrPayload): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.put(`/field-service/${id}`, payload) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * Start Visit (DRAFT -> IN_PROGRESS)
   */
  startFsr: async (id: string): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.post(`/field-service/${id}/start`) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * Complete Visit (IN_PROGRESS -> COMPLETED)
   */
  completeFsr: async (id: string): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.post(`/field-service/${id}/complete`) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * Close Visit (COMPLETED -> CLOSED) (Admin/Manager only)
   */
  closeFsr: async (id: string): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.post(`/field-service/${id}/close`) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * Cancel FSR (Admin/Manager only)
   */
  cancelFsr: async (id: string, reason?: string): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.post(`/field-service/${id}/cancel`, { reason }) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * Reassign Service Engineer (Admin/Manager only)
   */
  assignFse: async (id: string, payload: AssignFsePayload): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.post(`/field-service/${id}/assign`, payload) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * Customer Sign-Off
   */
  customerSignOff: async (id: string, payload: CustomerSignOffPayload): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.post(`/field-service/${id}/customer-signoff`, payload) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * FSE Sign-Off
   */
  fseSignOff: async (id: string, payload: FseSignOffPayload): Promise<ApiEnvelope<FsrDetailedView>> => {
    return apiClient.post(`/field-service/${id}/fse-signoff`, payload) as unknown as Promise<ApiEnvelope<FsrDetailedView>>;
  },

  /**
   * Site Observations Upsert
   */
  updateSiteObservation: async (id: string, payload: FsrSiteObservation): Promise<ApiEnvelope<FsrSiteObservation>> => {
    return apiClient.put(`/field-service/${id}/site-observation`, payload) as unknown as Promise<ApiEnvelope<FsrSiteObservation>>;
  },

  /**
   * Battery Bank Sub-Resources
   */
  addBatteryBank: async (id: string, payload: Partial<FsrBatteryBank>): Promise<ApiEnvelope<FsrBatteryBank>> => {
    return apiClient.post(`/field-service/${id}/battery-banks`, payload) as unknown as Promise<ApiEnvelope<FsrBatteryBank>>;
  },

  updateBatteryBank: async (id: string, bankId: string, payload: Partial<FsrBatteryBank>): Promise<ApiEnvelope<FsrBatteryBank>> => {
    return apiClient.put(`/field-service/${id}/battery-banks/${bankId}`, payload) as unknown as Promise<ApiEnvelope<FsrBatteryBank>>;
  },

  deleteBatteryBank: async (id: string, bankId: string): Promise<ApiEnvelope<{ success: boolean; message: string }>> => {
    return apiClient.delete(`/field-service/${id}/battery-banks/${bankId}`) as unknown as Promise<ApiEnvelope<{ success: boolean; message: string }>>;
  },

  /**
   * Battery Reading Sub-Resources
   */
  addBatteryReadings: async (id: string, bankId: string, payload: Partial<FsrBatteryReading> | { readings: Array<Partial<FsrBatteryReading>> }): Promise<ApiEnvelope<FsrBatteryBank>> => {
    return apiClient.post(`/field-service/${id}/battery-banks/${bankId}/readings`, payload) as unknown as Promise<ApiEnvelope<FsrBatteryBank>>;
  },

  updateBatteryReading: async (id: string, bankId: string, readingId: string, payload: Partial<FsrBatteryReading>): Promise<ApiEnvelope<FsrBatteryReading>> => {
    return apiClient.put(`/field-service/${id}/battery-banks/${bankId}/readings/${readingId}`, payload) as unknown as Promise<ApiEnvelope<FsrBatteryReading>>;
  },

  deleteBatteryReading: async (id: string, bankId: string, readingId: string): Promise<ApiEnvelope<{ success: boolean; message: string }>> => {
    return apiClient.delete(`/field-service/${id}/battery-banks/${bankId}/readings/${readingId}`) as unknown as Promise<ApiEnvelope<{ success: boolean; message: string }>>;
  },

  /**
   * Parts Replacement Sub-Resources
   */
  addPart: async (id: string, payload: Partial<FsrPart>): Promise<ApiEnvelope<FsrPart>> => {
    return apiClient.post(`/field-service/${id}/parts`, payload) as unknown as Promise<ApiEnvelope<FsrPart>>;
  },

  updatePart: async (id: string, partId: string, payload: Partial<FsrPart>): Promise<ApiEnvelope<FsrPart>> => {
    return apiClient.put(`/field-service/${id}/parts/${partId}`, payload) as unknown as Promise<ApiEnvelope<FsrPart>>;
  },

  deletePart: async (id: string, partId: string): Promise<ApiEnvelope<{ success: boolean; message: string }>> => {
    return apiClient.delete(`/field-service/${id}/parts/${partId}`) as unknown as Promise<ApiEnvelope<{ success: boolean; message: string }>>;
  },

  /**
   * Attachments Sub-Resources
   */
  uploadAttachment: async (id: string, payload: AttachmentUploadPayload): Promise<ApiEnvelope<FsrAttachment>> => {
    return apiClient.post(`/field-service/${id}/attachments`, payload) as unknown as Promise<ApiEnvelope<FsrAttachment>>;
  },

  deleteAttachment: async (id: string, attachmentId: string): Promise<ApiEnvelope<{ success: boolean; message: string }>> => {
    return apiClient.delete(`/field-service/${id}/attachments/${attachmentId}`) as unknown as Promise<ApiEnvelope<{ success: boolean; message: string }>>;
  },

  /**
   * Activity History Stream
   */
  getActivityLogs: async (id: string): Promise<ApiEnvelope<FsrActivityLog[]>> => {
    return apiClient.get(`/field-service/${id}/activity`) as unknown as Promise<ApiEnvelope<FsrActivityLog[]>>;
  },

  /**
   * Delete FSR (Admin / Manager for DRAFT)
   */
  deleteFsr: async (id: string): Promise<ApiEnvelope<{ success: boolean; message: string }>> => {
    return apiClient.delete(`/field-service/${id}`) as unknown as Promise<ApiEnvelope<{ success: boolean; message: string }>>;
  },

  /**
   * Get authoritative FSR PDF Blob stream
   */
  getFsrPdfBlob: async (id: string): Promise<Blob> => {
    const blobData = await apiClient.get(`/field-service/${id}/pdf`, {
      responseType: 'blob',
    });
    return blobData as unknown as Blob;
  },

  /**
   * Trigger direct official FSR PDF download to disk
   */
  downloadFsrPdf: async (id: string, fsrNumber?: string): Promise<void> => {
    const blob = await fieldService.getFsrPdfBlob(id);
    const safeNum = (fsrNumber || id).replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `FSR_${safeNum}.pdf`;

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};
