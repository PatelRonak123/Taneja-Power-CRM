import { apiClient } from '../../../app/api/apiClient';

export interface AmcContract {
  id: string;
  contractNumber: string;
  quotationId: string;
  quotationRevisionId: string;
  customerId: string;
  destinationId?: string;
  customerName: string;
  companyName?: string;
  customerCompanyName?: string;
  endUser?: string;
  customerCode?: string;
  branch?: string;
  zone?: string;
  amcPlan: string;
  contractStartDate: string;
  contractEndDate: string;
  serviceFrequency: string;
  scheduledVisits: number;
  completedVisits: number;
  breakdownVisitType: string;
  status: 'DRAFT' | 'PENDING_ACTIVATION' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
  totalAmount: string;
  specialClauses?: string;
  amcPaymentTerms?: string;
  terminationReason?: string;
  terminationNoticeDate?: string;
  terminatedAt?: string;
  renewedFromContractId?: string;
  sourceQuotationNumber?: string;
  equipment?: Array<{
    id: string;
    equipmentType?: string;
    equipmentName: string;
    configuration?: string;
    rating?: string;
    make?: string;
    model?: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    status: string;
  }>;
  scopeItems?: Array<{
    id: string;
    description: string;
    sortOrder: number;
  }>;
  exclusions?: Array<{
    id: string;
    description: string;
    sortOrder: number;
  }>;
  escalations?: Array<{
    id: string;
    level: string;
    contactName?: string;
    phone?: string;
    email?: string;
    sortOrder: number;
  }>;
  serviceVisits?: Array<{
    id: string;
    visitNumber: number;
    scheduledDate: string;
    serviceType: string;
    status: string;
    assignedEmployeeId?: string;
    taskId?: string;
    completedAt?: string;
    notes?: string;
  }>;
  serviceRequests?: AmcServiceRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface AmcServiceRequest {
  id: string;
  amcContractId: string;
  requestNumber: string;
  serviceType: string;
  equipmentId?: string;
  equipmentName?: string;
  equipmentConfiguration?: string;
  issueDescription: string;
  priority: string;
  escalationLevel: string;
  escalatedAt?: string;
  escalationContactName?: string;
  escalationPhone?: string;
  escalationEmail?: string;
  status: string;
  requestedAt: string;
  assignedEmployeeId?: string;
  taskId?: string;
  amcServiceVisitId?: string;
  visitStatus?: string;
  serviceReportId?: string;
  serviceReportStatus?: string;
  resolvedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListContractsResponse {
  success: boolean;
  data: AmcContract[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AmcServiceReportMaterial {
  id: string;
  serviceReportId: string;
  productId?: string;
  productNameSnapshot: string;
  skuSnapshot?: string;
  unitSnapshot: string;
  quantity: string;
  materialType: 'SPARE_PART' | 'CONSUMABLE' | 'MATERIAL' | 'OTHER';
  coverageType: 'AMC_INCLUDED' | 'CHARGEABLE' | 'CUSTOMER_SUPPLIED';
  remarks?: string;
  stockConsumedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AmcServiceReport {
  id: string;
  amcContractId: string;
  amcServiceVisitId: string;
  reportNumber: string;
  serviceType: string;
  status: 'DRAFT' | 'COMPLETED';
  inspectionDate: string;
  technicianEmployeeId?: string;
  serviceSummary?: string;
  observations?: string;
  recommendations?: string;
  customerName?: string;
  customerRemarks?: string;
  acknowledgementStatus?: string;
  acknowledgedAt?: string;
  items?: Array<{
    id: string;
    scopeItemId?: string;
    scopeDescription: string;
    status: 'COMPLETED' | 'NOT_COMPLETED' | 'NOT_APPLICABLE';
    remarks?: string;
    sortOrder: number;
  }>;
  equipment?: Array<{
    id: string;
    equipmentId?: string;
    equipmentName: string;
    configuration?: string;
    rating?: string;
    conditionStatus: 'OPERATIONAL' | 'NEEDS_REPAIR' | 'REPLACED_PART' | 'FAULTY';
    observations?: string;
  }>;
  materials?: AmcServiceReportMaterial[];
}

export const amcContractApi = {
  createFromQuotation: async (quotationId: string): Promise<{ success: boolean; data: AmcContract }> => {
    return (await apiClient.post(`/amc-contracts/from-quotation/${quotationId}`)) as any;
  },

  getContracts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
    amcPlan?: string;
  }): Promise<ListContractsResponse> => {
    return (await apiClient.get('/amc-contracts', { params })) as any;
  },

  getContractById: async (id: string): Promise<{ success: boolean; data: AmcContract }> => {
    return (await apiClient.get(`/amc-contracts/${id}`)) as any;
  },

  activateContract: async (id: string): Promise<{ success: boolean; data: AmcContract }> => {
    return (await apiClient.post(`/amc-contracts/${id}/activate`)) as any;
  },

  terminateContract: async (
    id: string,
    data: {
      reason: string;
      terminationNoticeDate?: string;
      terminationDate?: string;
    }
  ): Promise<{ success: boolean; data: AmcContract }> => {
    return (await apiClient.post(`/amc-contracts/${id}/terminate`, data)) as any;
  },

  createBreakdownRequest: async (
    contractId: string,
    data: {
      equipmentId?: string;
      issueDescription: string;
      priority?: string;
      escalationLevel?: string;
      requestedAt?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; data: AmcServiceRequest }> => {
    return (await apiClient.post(`/amc-contracts/${contractId}/service-requests`, data)) as any;
  },

  escalateBreakdownRequest: async (
    contractId: string,
    requestId: string,
    data: { newLevel: string; notes?: string }
  ): Promise<{ success: boolean; data: AmcServiceRequest }> => {
    return (await apiClient.post(`/amc-contracts/${contractId}/service-requests/${requestId}/escalate`, data)) as any;
  },

  getBreakdownRequestById: async (
    contractId: string,
    requestId: string
  ): Promise<{ success: boolean; data: AmcServiceRequest }> => {
    return (await apiClient.get(`/amc-contracts/${contractId}/service-requests/${requestId}`)) as any;
  },

  createTaskForVisit: async (
    visitId: string,
    assignedEmployeeId?: string
  ): Promise<{ success: boolean; data: any }> => {
    return (await apiClient.post(`/amc-contracts/schedule/${visitId}/create-task`, { assignedEmployeeId })) as any;
  },

  startVisit: async (visitId: string): Promise<{ success: boolean; data: any }> => {
    return (await apiClient.post(`/amc-contracts/visits/${visitId}/start`)) as any;
  },

  cancelVisit: async (visitId: string, reason?: string): Promise<{ success: boolean; data: any }> => {
    return (await apiClient.post(`/amc-contracts/visits/${visitId}/cancel`, { reason })) as any;
  },

  getOrCreateServiceReport: async (visitId: string): Promise<{ success: boolean; data: AmcServiceReport }> => {
    return (await apiClient.get(`/amc-contracts/visits/${visitId}/report`)) as any;
  },

  updateServiceReport: async (visitId: string, data: any): Promise<{ success: boolean; data: AmcServiceReport }> => {
    return (await apiClient.post(`/amc-contracts/visits/${visitId}/report`, data)) as any;
  },

  completeServiceVisit: async (visitId: string, reportData: any): Promise<{ success: boolean; data: any }> => {
    return (await apiClient.post(`/amc-contracts/visits/${visitId}/complete`, reportData)) as any;
  },

  downloadReportPdf: (reportId: string): string => {
    return `${apiClient.defaults.baseURL}/amc-contracts/reports/${reportId}/pdf`;
  },

  getMaterialsForReport: async (reportId: string): Promise<{ success: boolean; data: AmcServiceReportMaterial[] }> => {
    return (await apiClient.get(`/amc-contracts/reports/${reportId}/materials`)) as any;
  },

  renewContract: async (
    id: string,
    renewalData: {
      contractStartDate: string;
      contractEndDate: string;
      amcPlan?: string;
      serviceFrequency?: string;
      scheduledVisits?: number;
      breakdownVisitType?: string;
      specialClauses?: string;
      amcPaymentTerms?: string;
      endUser?: string;
      totalAmount?: string;
      equipment?: any[];
      scopeItems?: any[];
      exclusions?: any[];
      escalations?: any[];
    }
  ): Promise<{ success: boolean; message: string; data: AmcContract }> => {
    return (await apiClient.post(`/amc-contracts/${id}/renew`, renewalData)) as any;
  },

  getContractHistory: async (id: string): Promise<{
    success: boolean;
    data: {
      ancestors: AmcContract[];
      current: AmcContract;
      successors: AmcContract[];
    };
  }> => {
    return (await apiClient.get(`/amc-contracts/${id}/history`)) as any;
  },
};

