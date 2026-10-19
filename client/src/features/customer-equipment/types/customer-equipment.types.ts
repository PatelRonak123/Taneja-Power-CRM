export type CustomerEquipmentCondition = 'OPERATIONAL' | 'NEEDS_REPAIR' | 'FAULTY' | 'REPAIRED';
export type CustomerEquipmentAssetStatus = 'ACTIVE' | 'INACTIVE';
export type CustomerEquipmentWarrantyStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'AMC_COVERED';
export type CustomerEquipmentWarrantyDurationUnit = 'MONTHS' | 'YEARS';

export interface CustomerEquipment {
  id: string;
  assetNumber: string;
  customerId: string;
  productId: string;
  salesOrderId: string | null;
  salesOrderItemId: string | null;
  salesInvoiceId: string | null;
  salesInvoiceItemId: string | null;
  deliveryId: string | null;
  deliveryItemId: string | null;
  unitIndex: number;
  serialNumber: string | null;
  productName: string;
  sku: string | null;
  model: string | null;
  make: string | null;
  capacityRating: string | null;
  hsnSac: string | null;
  destinationId: string | null;
  installationLocation: string | null;
  installationNotes: string | null;
  installationDate: string | null;
  deliveryDate: string;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  warrantyTermsSnapshot: string | null;
  warrantyStatus?: CustomerEquipmentWarrantyStatus;
  warrantyDurationValue?: number | null;
  warrantyDurationUnit?: CustomerEquipmentWarrantyDurationUnit | null;
  commissioningNotes?: string | null;
  commissionedById?: string | null;
  commissionedAt?: string | null;
  conditionStatus: CustomerEquipmentCondition;
  assetStatus: CustomerEquipmentAssetStatus;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined / flat properties from backend repository
  customerName?: string | null;
  customerCompanyName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  deliveryNumber?: string | null;
  deliveryChallanNumber?: string | null;
  salesOrderNumber?: string | null;
  salesInvoiceNumber?: string | null;
  destinationName?: string | null;
  destinationAddress?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  destinationPincode?: string | null;
  activeAmc?: {
    contractId: string;
    contractNumber: string;
    status: string;
    amcPlan?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    endDate?: string;
  } | null;

  // Joined/detailed properties
  customer?: {
    id: string;
    companyName: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  };
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    model?: string | null;
    brand?: string | null;
    capacity?: string | null;
  };
  salesOrder?: {
    id: string;
    orderNumber: string;
    orderDate?: string | null;
    status?: string | null;
  };
  salesInvoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate?: string | null;
    status?: string | null;
  };
  dispatch?: {
    id: string;
    dispatchNumber: string;
    dispatchDate?: string | null;
    status?: string | null;
  };
  destination?: {
    id: string;
    destinationName: string;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
  };
  amcContracts?: Array<{
    id: string;
    contractNumber: string;
    contractType: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  serviceVisits?: Array<{
    id: string;
    visitId?: string | null;
    visitNumber?: number | null;
    visitDate: string;
    visitType: string;
    status: string;
    visitOutcome?: string | null;
    reportNumber?: string | null;
    engineerName?: string | null;
    findings?: string | null;
    conditionStatus?: string | null;
    contractNumber?: string | null;
    observations?: string | null;
  }>;
  serviceRequests?: Array<{
    id: string;
    requestNumber: string;
    serviceType?: string | null;
    issueDescription: string;
    priority: string;
    status: string;
    coverageType?: 'PENDING_REVIEW' | 'AMC_COVERED' | 'CHARGEABLE' | string;
    coverageNotes?: string | null;
    coverageDecidedAt?: string | null;
    requestedAt?: string | null;
    createdAt?: string;
    resolvedAt?: string | null;
    amcContractId?: string | null;
    contractNumber?: string | null;
    taskId?: string | null;
    taskTitle?: string | null;
    taskStatus?: string | null;
    taskPriority?: string | null;
    taskCompletedAt?: string | null;
    technicianName?: string | null;
    technicianEmail?: string | null;
  }>;
}

export interface ListCustomerEquipmentQuery {
  search?: string;
  customerId?: string;
  productId?: string;
  assetStatus?: CustomerEquipmentAssetStatus | string;
  conditionStatus?: CustomerEquipmentCondition | string;
  serialNumber?: string;
  page?: number;
  limit?: number;
}

export interface UpdateCustomerEquipmentPayload {
  destinationId?: string | null;
  installationLocation?: string | null;
  installationNotes?: string | null;
  installationDate?: string | null;
  conditionStatus?: CustomerEquipmentCondition;
  assetStatus?: CustomerEquipmentAssetStatus;
  serialNumber?: string | null;
}

export interface CreateManualCustomerEquipmentPayload {
  customerId: string;
  productId: string;
  productName: string;
  sku?: string | null;
  model?: string | null;
  make?: string | null;
  capacityRating?: string | null;
  serialNumber?: string | null;
  destinationId?: string | null;
  installationLocation?: string | null;
  installationNotes?: string | null;
  installationDate?: string | null;
  deliveryDate?: string;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  warrantyTermsSnapshot?: string | null;
  conditionStatus?: CustomerEquipmentCondition;
  assetStatus?: CustomerEquipmentAssetStatus;
}

export interface CommissionCustomerEquipmentPayload {
  installationDate: string;
  warrantyDurationValue: number;
  warrantyDurationUnit: CustomerEquipmentWarrantyDurationUnit;
  commissioningNotes?: string | null;
}

export interface CommissioningWarrantyData {
  status: CustomerEquipmentWarrantyStatus;
  installationDate: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  proposedAmcStartDate: string;
  warrantyDurationValue: number;
  warrantyDurationUnit: CustomerEquipmentWarrantyDurationUnit;
  warrantyCycle: string;
  commissionedById: string;
  commissionedAt: string | null;
}

export interface CommissioningResult {
  equipment: CustomerEquipment;
  warranty: CommissioningWarrantyData;
}
