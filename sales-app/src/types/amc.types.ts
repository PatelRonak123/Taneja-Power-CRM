export interface AmcServiceReportItem {
  id: string;
  scopeDescription?: string | null;
  descriptionSnapshot?: string | null;
  status: 'COMPLETED' | 'ATTENTION_REQUIRED' | 'PENDING' | string;
  remarks?: string | null;
  sortOrder?: number;
}

export interface AmcServiceReportEquipment {
  id: string;
  equipmentName?: string | null;
  equipmentNameSnapshot?: string | null;
  configuration?: string | null;
  rating?: string | null;
  ratingSnapshot?: string | null;
  makeSnapshot?: string | null;
  conditionStatus: 'OPERATIONAL' | 'NEEDS_REPAIR' | 'CRITICAL' | 'REPLACED' | string;
  observations?: string | null;
}

export interface AmcServiceReportData {
  id: string;
  amcContractId: string;
  amcServiceVisitId: string;
  reportNumber: string;
  serviceType: string;
  status: 'DRAFT' | 'COMPLETED';
  inspectionDate: string;
  technicianEmployeeId?: string | null;
  serviceSummary?: string | null;
  observations?: string | null;
  recommendations?: string | null;
  customerName?: string | null;
  customerRemarks?: string | null;
  acknowledgementStatus: string;
  items?: AmcServiceReportItem[];
  equipment?: AmcServiceReportEquipment[];
}

export interface UpdateAmcReportPayload {
  reportId?: string;
  serviceSummary?: string;
  observations?: string;
  recommendations?: string;
  customerName?: string;
  customerRemarks?: string;
  items?: Array<{ id: string; status: string; remarks?: string | null }>;
  equipment?: Array<{ id: string; conditionStatus: string; observations?: string | null }>;
}

export interface CompleteAmcVisitPayload {
  serviceSummary?: string;
  observations?: string;
  recommendations?: string;
  customerName?: string;
  customerRemarks?: string;
  visitOutcome?: 'SATISFACTORY' | 'REQUIRES_FOLLOWUP' | 'PARTIAL_SERVICE' | 'UNRESOLVED';
  items?: Array<{ id: string; status: string; remarks?: string | null }>;
  equipment?: Array<{ id: string; conditionStatus: string; observations?: string | null }>;
}
