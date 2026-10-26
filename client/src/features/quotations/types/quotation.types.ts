export type QuotationType = 'PRODUCT' | 'TECHNICAL' | 'SERVICE' | 'AMC';

export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT'
  | 'FOLLOW_UP'
  | 'ACCEPTED'
  | 'REJECTED_BY_CUSTOMER'
  | 'EXPIRED';

export type QuotationApprovalAction = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export type QuotationItemType = 'PRODUCT' | 'SERVICE' | 'AMC' | 'CUSTOM';

export interface QuotationAmcScopeItem {
  id?: string;
  quotationRevisionId?: string;
  description: string;
  sortOrder?: number;
  createdAt?: string;
}

export interface QuotationAmcExclusion {
  id?: string;
  quotationRevisionId?: string;
  description: string;
  sortOrder?: number;
  createdAt?: string;
}

export interface QuotationAmcEscalation {
  id?: string;
  quotationRevisionId?: string;
  level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  sortOrder?: number;
  createdAt?: string;
}

export interface QuotationItem {
  id: string;
  quotationRevisionId: string;
  quotationId: string;
  productId?: string | null;
  itemType: QuotationItemType;
  productName: string;
  productSku?: string | null;
  description?: string | null;
  make?: string | null;
  model?: string | null;
  technicalSpecifications?: string | null;
  hsnSac?: string | null;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  discountAmount: string;
  taxableAmount: string;
  gstRate: string;
  cgstRate: string;
  cgstAmount: string;
  sgstRate: string;
  sgstAmount: string;
  igstRate: string;
  igstAmount: string;
  totalTax: string;
  lineTotal: string;
  serviceDurationMonths?: number | null;
  serviceVisitsIncluded?: number | null;
  serviceScope?: string | null;
  equipmentType?: string | null;
  equipmentConfiguration?: string | null;
  equipmentRating?: string | null;
  sortOrder: number;
  stockQuantity?: number;
  customerEquipmentIds?: string[];
  customerEquipment?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface QuotationRevision {
  id: string;
  quotationId: string;
  revisionNumber: number;
  isCurrent: boolean;
  status: QuotationStatus;
  quotationDate: string;
  validityDays: number;
  validUntil: string;
  currency: string;
  customerName: string;
  companyName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerGstin?: string | null;
  customerPan?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPincode?: string | null;
  billingStateCode?: string | null;
  shippingName?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPincode?: string | null;
  shippingStateCode?: string | null;
  subtotal: string;
  totalDiscount: string;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalTax: string;
  freightCharges: string;
  otherCharges: string;
  roundOff: string;
  grandTotal: string;
  amountInWords?: string | null;
  subject?: string | null;
  termsAndConditions?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  warrantyTerms?: string | null;
  notes?: string | null;
  internalRemarks?: string | null;
  revisionReason?: string | null;
  amcPlan?: string | null;
  amcStartDate?: string | null;
  amcEndDate?: string | null;
  amcServiceFrequency?: string | null;
  amcScheduledVisits?: number | null;
  amcBreakdownVisitType?: string | null;
  endUser?: string | null;
  customerCode?: string | null;
  branch?: string | null;
  zone?: string | null;
  specialClauses?: string | null;
  amcPaymentTerms?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items?: QuotationItem[];
  amcScope?: QuotationAmcScopeItem[];
  amcExclusions?: QuotationAmcExclusion[];
  amcEscalations?: QuotationAmcEscalation[];
}

export interface QuotationApproval {
  id: string;
  quotationId: string;
  quotationRevisionId: string;
  requestedById: string;
  reviewedById?: string | null;
  action: QuotationApprovalAction;
  comments?: string | null;
  actionAt: string;
  createdAt: string;
  requestedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  reviewedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface QuotationActivityLog {
  id: string;
  quotationId: string;
  quotationRevisionId?: string | null;
  userId?: string | null;
  action: string;
  title: string;
  description?: string | null;
  metadata?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface QuotationAttachment {
  id: string;
  quotationId: string;
  quotationRevisionId?: string | null;
  fileName: string;
  storedFileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  storageProvider: string;
  uploadedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationListItem {
  id: string;
  quotationNumber: string;
  quotationType: QuotationType;
  status: QuotationStatus;
  currentRevisionNumber: number;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  destination?: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  } | null;
  salesperson?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  currentRevision?: {
    id: string;
    revisionNumber: number;
    grandTotal: string;
    taxableAmount: string;
    totalTax: string;
    currency: string;
    quotationDate: string;
    validUntil: string;
  } | null;
}

export interface QuotationDetailedView {
  id: string;
  quotationNumber: string;
  quotationType: QuotationType;
  status: QuotationStatus;
  customerId: string;
  destinationId?: string | null;
  salespersonId: string;
  createdById: string;
  updatedById?: string | null;
  currentRevisionNumber: number;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  } | null;
  destination?: {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  } | null;
  salesperson?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  } | null;
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  currentRevision?: (QuotationRevision & {
    items: QuotationItem[];
    amcScope?: QuotationAmcScopeItem[];
    amcExclusions?: QuotationAmcExclusion[];
    amcEscalations?: QuotationAmcEscalation[];
  }) | null;
  approvals: QuotationApproval[];
  activityLogs: QuotationActivityLog[];
  attachments: QuotationAttachment[];
  linkedSalesOrder?: {
    id: string;
    salesOrderNumber: string;
    status: string;
    orderDate: string;
    customerPoNumber?: string | null;
  } | null;
  linkedAmcContract?: {
    id: string;
    contractNumber: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null;
}

export interface LineItemFormInput {
  productId?: string | null;
  itemType: QuotationItemType;
  productName: string;
  productSku?: string | null;
  description?: string | null;
  make?: string | null;
  model?: string | null;
  technicalSpecifications?: string | null;
  hsnSac?: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  gstRate: number;
  serviceDurationMonths?: number | null;
  serviceVisitsIncluded?: number | null;
  serviceScope?: string | null;
  equipmentType?: string | null;
  equipmentConfiguration?: string | null;
  equipmentRating?: string | null;
  sortOrder?: number;
  customerEquipmentIds?: string[];
}

export interface CreateQuotationPayload {
  quotationType?: QuotationType;
  customerId: string;
  destinationId?: string | null;
  quotationDate?: string;
  validityDays?: number;
  currency?: string;
  subject?: string | null;
  termsAndConditions?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  warrantyTerms?: string | null;
  notes?: string | null;
  internalRemarks?: string | null;
  freightCharges?: number;
  otherCharges?: number;
  roundOff?: number;
  amcPlan?: string | null;
  amcStartDate?: string | null;
  amcEndDate?: string | null;
  amcServiceFrequency?: string | null;
  amcScheduledVisits?: number | null;
  amcBreakdownVisitType?: string | null;
  endUser?: string | null;
  customerCode?: string | null;
  branch?: string | null;
  zone?: string | null;
  specialClauses?: string | null;
  amcPaymentTerms?: string | null;
  items: LineItemFormInput[];
  amcScope?: QuotationAmcScopeItem[];
  amcExclusions?: QuotationAmcExclusion[];
  amcEscalations?: QuotationAmcEscalation[];
}

export interface UpdateQuotationPayload {
  quotationType?: QuotationType;
  destinationId?: string | null;
  quotationDate?: string;
  validityDays?: number;
  currency?: string;
  subject?: string | null;
  termsAndConditions?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  warrantyTerms?: string | null;
  notes?: string | null;
  internalRemarks?: string | null;
  freightCharges?: number;
  otherCharges?: number;
  roundOff?: number;
  amcPlan?: string | null;
  amcStartDate?: string | null;
  amcEndDate?: string | null;
  amcServiceFrequency?: string | null;
  amcScheduledVisits?: number | null;
  amcBreakdownVisitType?: string | null;
  endUser?: string | null;
  customerCode?: string | null;
  branch?: string | null;
  zone?: string | null;
  specialClauses?: string | null;
  amcPaymentTerms?: string | null;
  items?: LineItemFormInput[];
  amcScope?: QuotationAmcScopeItem[];
  amcExclusions?: QuotationAmcExclusion[];
  amcEscalations?: QuotationAmcEscalation[];
}

export interface CreateRevisionPayload {
  revisionReason: string;
  quotationDate?: string;
  validityDays?: number;
  subject?: string | null;
  termsAndConditions?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  warrantyTerms?: string | null;
  notes?: string | null;
  internalRemarks?: string | null;
  freightCharges?: number;
  otherCharges?: number;
  roundOff?: number;
  amcPlan?: string | null;
  amcStartDate?: string | null;
  amcEndDate?: string | null;
  amcServiceFrequency?: string | null;
  amcScheduledVisits?: number | null;
  amcBreakdownVisitType?: string | null;
  endUser?: string | null;
  customerCode?: string | null;
  branch?: string | null;
  zone?: string | null;
  specialClauses?: string | null;
  amcPaymentTerms?: string | null;
  items?: LineItemFormInput[];
  amcScope?: QuotationAmcScopeItem[];
  amcExclusions?: QuotationAmcExclusion[];
  amcEscalations?: QuotationAmcEscalation[];
}

export interface SubmitQuotationPayload {
  comments?: string;
}

export interface ApproveQuotationPayload {
  comments?: string;
}

export interface RejectQuotationPayload {
  rejectionReason?: string;
  comments?: string;
}

export interface WithdrawQuotationPayload {
  reason?: string;
}

export interface QuotationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string | string[];
  quotationType?: string;
  customerId?: string;
  salespersonId?: string;
  startDate?: string;
  endDate?: string;
}

