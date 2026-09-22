import { apiClient, ApiEnvelope } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  FsrDetailedView,
  FsrListItem,
  FsrQueryParams,
  FsrListResult,
  UpdateSiteObservationPayload,
  BatteryBankPayload,
  BatteryReadingItem,
  PartPayload,
  UploadAttachmentPayload,
  CustomerSignOffPayload,
  FseSignOffPayload,
  FsrAttachment,
  UpdateFsrPayload,
} from '../types/fsr.types';

export const fsrService = {
  /**
   * List FSRs with pagination and filters
   */
  async list(params?: FsrQueryParams): Promise<FsrListResult> {
    const queryParams: Record<string, string | number> = {};
    if (params?.status && params.status !== 'ALL') queryParams.status = params.status;
    if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
    if (params?.callType && params.callType !== 'ALL') queryParams.callType = params.callType;
    if (params?.warrantyStatus) queryParams.warrantyStatus = params.warrantyStatus;
    if (params?.assignedEngineerId) queryParams.assignedEngineerId = params.assignedEngineerId;
    if (params?.customerId) queryParams.customerId = params.customerId;
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;

    const response = (await apiClient.get(API_ENDPOINTS.FIELD_SERVICE.LIST, {
      params: queryParams,
    })) as unknown as ApiEnvelope<FsrListItem[]>;

    return {
      reports: response.data || [],
      total: response.meta?.total || response.data?.length || 0,
      page: response.meta?.page || 1,
      limit: response.meta?.limit || 10,
      totalPages: response.meta?.totalPages || 1,
    };
  },

  /**
   * Get single FSR detailed structure
   */
  async getById(id: string): Promise<FsrDetailedView> {
    const response = (await apiClient.get(
      API_ENDPOINTS.FIELD_SERVICE.GET_BY_ID(id)
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Update FSR core details (PATCH /api/v1/field-service/:id)
   */
  async update(id: string, payload: Partial<UpdateFsrPayload>): Promise<FsrDetailedView> {
    const response = (await apiClient.patch(
      API_ENDPOINTS.FIELD_SERVICE.UPDATE(id),
      payload
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Start FSR (DRAFT -> IN_PROGRESS)
   */
  async start(id: string): Promise<FsrDetailedView> {
    const response = (await apiClient.post(
      API_ENDPOINTS.FIELD_SERVICE.START(id)
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Complete FSR (IN_PROGRESS -> COMPLETED)
   */
  async complete(id: string): Promise<FsrDetailedView> {
    const response = (await apiClient.post(
      API_ENDPOINTS.FIELD_SERVICE.COMPLETE(id)
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Update Site Observation measurements and notes
   */
  async updateSiteObservation(
    id: string,
    payload: UpdateSiteObservationPayload
  ): Promise<FsrDetailedView> {
    const response = (await apiClient.put(
      API_ENDPOINTS.FIELD_SERVICE.SITE_OBSERVATION(id),
      payload
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Add a battery bank
   */
  async addBatteryBank(id: string, payload: BatteryBankPayload): Promise<FsrDetailedView> {
    const response = (await apiClient.post(
      API_ENDPOINTS.FIELD_SERVICE.BATTERY_BANKS(id),
      payload
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Update battery bank details
   */
  async updateBatteryBank(
    id: string,
    bankId: string,
    payload: Partial<BatteryBankPayload>
  ): Promise<FsrDetailedView> {
    const response = (await apiClient.put(
      API_ENDPOINTS.FIELD_SERVICE.BATTERY_BANK_BY_ID(id, bankId),
      payload
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Delete a battery bank
   */
  async deleteBatteryBank(id: string, bankId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FIELD_SERVICE.BATTERY_BANK_BY_ID(id, bankId));
  },

  /**
   * Add / batch save readings for a battery bank
   */
  async saveBatteryReadings(
    id: string,
    bankId: string,
    readings: BatteryReadingItem[]
  ): Promise<FsrDetailedView> {
    const response = (await apiClient.post(
      API_ENDPOINTS.FIELD_SERVICE.BATTERY_READINGS(id, bankId),
      { readings }
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Update a single battery reading
   */
  async updateBatteryReading(
    id: string,
    bankId: string,
    readingId: string,
    payload: Partial<BatteryReadingItem>
  ): Promise<FsrDetailedView> {
    const response = (await apiClient.put(
      API_ENDPOINTS.FIELD_SERVICE.BATTERY_READING_BY_ID(id, bankId, readingId),
      payload
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Delete a single battery reading
   */
  async deleteBatteryReading(id: string, bankId: string, readingId: string): Promise<void> {
    await apiClient.delete(
      API_ENDPOINTS.FIELD_SERVICE.BATTERY_READING_BY_ID(id, bankId, readingId)
    );
  },

  /**
   * Add a replaced part
   */
  async addPart(id: string, payload: PartPayload): Promise<FsrDetailedView> {
    const response = (await apiClient.post(
      API_ENDPOINTS.FIELD_SERVICE.PARTS(id),
      payload
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Update a replaced part
   */
  async updatePart(id: string, partId: string, payload: Partial<PartPayload>): Promise<FsrDetailedView> {
    const response = (await apiClient.put(
      API_ENDPOINTS.FIELD_SERVICE.PART_BY_ID(id, partId),
      payload
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Delete a replaced part
   */
  async deletePart(id: string, partId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FIELD_SERVICE.PART_BY_ID(id, partId));
  },

  /**
   * Upload an attachment / photo
   */
  async uploadAttachment(id: string, payload: UploadAttachmentPayload): Promise<FsrAttachment> {
    const response = (await apiClient.post(
      API_ENDPOINTS.FIELD_SERVICE.ATTACHMENTS(id),
      payload
    )) as unknown as ApiEnvelope<FsrAttachment>;
    return response.data;
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(id: string, attachmentId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FIELD_SERVICE.ATTACHMENT_BY_ID(id, attachmentId));
  },

  /**
   * Save customer sign-off
   */
  async customerSignOff(id: string, payload: CustomerSignOffPayload): Promise<FsrDetailedView> {
    const response = (await apiClient.post(
      API_ENDPOINTS.FIELD_SERVICE.CUSTOMER_SIGNOFF(id),
      payload
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },

  /**
   * Save FSE sign-off
   */
  async fseSignOff(id: string, payload: FseSignOffPayload): Promise<FsrDetailedView> {
    const response = (await apiClient.post(
      API_ENDPOINTS.FIELD_SERVICE.FSE_SIGNOFF(id),
      payload
    )) as unknown as ApiEnvelope<FsrDetailedView>;
    return response.data;
  },
};
