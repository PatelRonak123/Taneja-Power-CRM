export type FollowUpType =
  | 'CALL'
  | 'MEETING'
  | 'EMAIL'
  | 'SITE_VISIT'
  | 'QUOTATION_FOLLOW_UP'
  | 'PAYMENT_FOLLOW_UP'
  | 'AMC_RENEWAL'
  | 'AMC_EXPIRY'
  | 'WARRANTY_EXPIRY'
  | 'CUSTOMER_VISIT'
  | 'OTHER';

export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export type FollowUpPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FollowUpItem {
  id: string;
  followUpNumber: string;
  title: string;
  description: string | null;
  type: FollowUpType;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string | null; // HH:mm
  assignedTo: string | null;
  createdBy: string;
  customerId: string | null;
  leadId: string | null;
  dealId: string | null;
  quotationId: string | null;
  amcContractId: string | null;
  customerEquipmentId?: string | null;
  warrantyCycle?: string | null;
  completedAt: string | null;
  completedBy: string | null;
  outcome: string | null;
  rescheduledFromId: string | null;
  nextFollowUpId: string | null;
  nextFollowUpDate: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined entity relations
  assignedEmployee?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    designation: string | null;
    workType: string;
  } | null;
  creator?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  completer?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  customer?: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  lead?: {
    id: string;
    leadCode: string;
    customerName: string;
    companyName: string;
    status: string;
  } | null;
  deal?: {
    id: string;
    leadCode: string;
    customerName: string;
    companyName: string;
    status: string;
    expectedValue: string | null;
  } | null;
  quotation?: {
    id: string;
    quotationNumber: string;
    status: string;
    quotationType: string;
  } | null;
  amcContract?: {
    id: string;
    contractNumber: string;
    status: string;
    amcPlan: string;
  } | null;
  equipment?: {
    id: string;
    assetNumber: string;
    productName: string;
    model: string | null;
    make: string | null;
    capacityRating: string | null;
    serialNumber: string | null;
    warrantyEndDate: string | null;
    warrantyStatus: string | null;
  } | null;
}

export interface FollowUpMetrics {
  total: number;
  today: number;
  overdue: number;
  upcoming: number;
  completedToday: number;
  totalCompleted: number;
  totalCancelled: number;
  pendingTotal: number;
}

export interface FollowUpQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tab?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
  type?: string;
  priority?: string;
  assignedTo?: string;
  customerId?: string;
  leadId?: string;
  dealId?: string;
  quotationId?: string;
  amcContractId?: string;
  customerEquipmentId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateFollowUpPayload {
  title: string;
  description?: string | null;
  type: FollowUpType;
  priority?: FollowUpPriority;
  scheduledDate: string;
  scheduledTime?: string | null;
  assignedTo?: string | null;
  customerId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  quotationId?: string | null;
  amcContractId?: string | null;
}

export interface UpdateFollowUpPayload {
  title?: string;
  description?: string | null;
  type?: FollowUpType;
  priority?: FollowUpPriority;
  scheduledDate?: string;
  scheduledTime?: string | null;
  assignedTo?: string | null;
  customerId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  quotationId?: string | null;
  amcContractId?: string | null;
}

export interface CompleteFollowUpPayload {
  outcome: string;
  notes?: string | null;
  createNextFollowUp?: boolean;
  nextFollowUpDate?: string | null;
  nextFollowUpTime?: string | null;
  nextFollowUpTitle?: string | null;
  nextFollowUpType?: FollowUpType | null;
  nextFollowUpNotes?: string | null;
}

export interface RescheduleFollowUpPayload {
  scheduledDate: string;
  scheduledTime?: string | null;
  reason?: string | null;
}

export interface CancelFollowUpPayload {
  reason?: string | null;
}
