import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import {
  QuotationListItem,
  QuotationDetailedView,
  QuotationRevision,
  QuotationApproval,
  QuotationActivityLog,
  CreateQuotationPayload,
  UpdateQuotationPayload,
  CreateRevisionPayload,
  SubmitQuotationPayload,
  ApproveQuotationPayload,
  RejectQuotationPayload,
  WithdrawQuotationPayload,
  QuotationQueryParams,
} from '../types/quotation.types';

export const quotationService = {
  /**
   * List quotations with pagination & filters
   */
  getQuotations: async (params?: QuotationQueryParams): Promise<ApiEnvelope<QuotationListItem[]>> => {
    return apiClient.get('/quotations', { params }) as unknown as Promise<ApiEnvelope<QuotationListItem[]>>;
  },

  /**
   * Get single quotation detailed view
   */
  getQuotationById: async (id: string): Promise<ApiEnvelope<QuotationDetailedView>> => {
    return apiClient.get(`/quotations/${id}`) as unknown as Promise<ApiEnvelope<QuotationDetailedView>>;
  },

  /**
   * Create new draft quotation
   */
  createQuotation: async (payload: CreateQuotationPayload): Promise<ApiEnvelope<QuotationDetailedView>> => {
    return apiClient.post('/quotations', payload) as unknown as Promise<ApiEnvelope<QuotationDetailedView>>;
  },

  /**
   * Update draft quotation, or edit pending quotation (triggers withdrawal)
   */
  updateQuotation: async (
    id: string,
    payload: UpdateQuotationPayload
  ): Promise<ApiEnvelope<QuotationDetailedView>> => {
    return apiClient.put(`/quotations/${id}`, payload) as unknown as Promise<ApiEnvelope<QuotationDetailedView>>;
  },

  /**
   * Submit draft quotation for management approval
   */
  submitQuotation: async (
    id: string,
    payload?: SubmitQuotationPayload
  ): Promise<ApiEnvelope<QuotationDetailedView>> => {
    return apiClient.post(`/quotations/${id}/submit`, payload) as unknown as Promise<ApiEnvelope<QuotationDetailedView>>;
  },

  /**
   * Approve pending quotation (Admin/Manager)
   */
  approveQuotation: async (
    id: string,
    payload?: ApproveQuotationPayload
  ): Promise<ApiEnvelope<QuotationDetailedView>> => {
    return apiClient.post(`/quotations/${id}/approve`, payload) as unknown as Promise<ApiEnvelope<QuotationDetailedView>>;
  },

  /**
   * Reject pending quotation (Admin/Manager)
   */
  rejectQuotation: async (
    id: string,
    payload: RejectQuotationPayload
  ): Promise<ApiEnvelope<QuotationDetailedView>> => {
    return apiClient.post(`/quotations/${id}/reject`, {
      rejectionReason: payload.rejectionReason || payload.comments,
      ...payload,
    }) as unknown as Promise<ApiEnvelope<QuotationDetailedView>>;
  },

  /**
   * Withdraw pending approval submission back to Draft
   */
  withdrawQuotation: async (
    id: string,
    payload?: WithdrawQuotationPayload
  ): Promise<ApiEnvelope<QuotationDetailedView>> => {
    return apiClient.post(`/quotations/${id}/withdraw`, payload) as unknown as Promise<ApiEnvelope<QuotationDetailedView>>;
  },

  /**
   * Create formal revision (Rev N+1)
   */
  createRevision: async (
    id: string,
    payload: CreateRevisionPayload
  ): Promise<ApiEnvelope<QuotationDetailedView>> => {
    return apiClient.post(`/quotations/${id}/revisions`, payload) as unknown as Promise<ApiEnvelope<QuotationDetailedView>>;
  },

  /**
   * Get all revisions list for a quotation
   */
  getRevisions: async (id: string): Promise<ApiEnvelope<QuotationRevision[]>> => {
    return apiClient.get(`/quotations/${id}/revisions`) as unknown as Promise<ApiEnvelope<QuotationRevision[]>>;
  },

  /**
   * Get specific revision and its line items
   */
  getRevisionByNumber: async (
    id: string,
    revisionNumber: number
  ): Promise<ApiEnvelope<QuotationRevision>> => {
    return apiClient.get(`/quotations/${id}/revisions/${revisionNumber}`) as unknown as Promise<ApiEnvelope<QuotationRevision>>;
  },

  /**
   * Get approval workflow audit trail
   */
  getApprovals: async (id: string): Promise<ApiEnvelope<QuotationApproval[]>> => {
    return apiClient.get(`/quotations/${id}/approvals`) as unknown as Promise<ApiEnvelope<QuotationApproval[]>>;
  },

  /**
   * Get activity logs stream
   */
  getActivity: async (id: string): Promise<ApiEnvelope<QuotationActivityLog[]>> => {
    return apiClient.get(`/quotations/${id}/activity`) as unknown as Promise<ApiEnvelope<QuotationActivityLog[]>>;
  },

  /**
   * Get authoritative PDF Blob stream
   */
  getQuotationPdfBlob: async (id: string, revisionNumber?: number): Promise<Blob> => {
    const url = revisionNumber !== undefined
      ? `/quotations/${id}/revisions/${revisionNumber}/pdf`
      : `/quotations/${id}/pdf`;

    const blobData = await apiClient.get(url, {
      responseType: 'blob',
    });

    return blobData as unknown as Blob;
  },

  /**
   * Trigger direct PDF download to disk
   */
  downloadQuotationPdf: async (id: string, quotationNumber: string, revisionNumber?: number): Promise<void> => {
    const blob = await quotationService.getQuotationPdfBlob(id, revisionNumber);
    const safeNum = quotationNumber.replace(/[/\\?%*:|"<>]/g, '_');
    const filename = revisionNumber !== undefined
      ? `Quotation_${safeNum}_Rev${revisionNumber}.pdf`
      : `Quotation_${safeNum}.pdf`;

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Send quotation PDF directly to customer email via Resend
   */
  sendQuotationEmail: async (
    id: string,
    payload?: { customEmail?: string; customSubject?: string; customNotes?: string }
  ): Promise<ApiEnvelope<{ message: string; emailId: string; recipientEmail: string }>> => {
    return apiClient.post(`/quotations/${id}/send-email`, payload) as unknown as Promise<
      ApiEnvelope<{ message: string; emailId: string; recipientEmail: string }>
    >;
  },
};

