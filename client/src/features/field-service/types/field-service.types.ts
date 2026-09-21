export type FsrCallType = 'BD' | 'PM' | 'INSTALLATION' | 'COURTESY';
export type FsrStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';
export type FsrWarrantyStatus = 'UNDER_WARRANTY' | 'OUT_OF_WARRANTY' | 'AMC' | 'BILLABLE' | 'EXTENDED_WARRANTY';
export type FsrBillingStatus = 'BILLABLE' | 'NON_BILLABLE' | 'WARRANTY' | 'AMC' | 'FREE_SERVICE' | 'CHARGED';
export type FsrUpsLocation = 'COMPUTER_ROOM' | 'ELECTRICAL_ROOM' | 'NETWORK_ROOM' | 'OTHER';
export type FsrAttachmentCategory = 'UPS_PHOTO' | 'BATTERY_PHOTO' | 'SITE_PHOTO' | 'PART_PHOTO' | 'SIGNED_DOCUMENT' | 'OTHER';

export interface FsrSiteObservation {
  id?: string;
  fsrId?: string;
  inputOnMains?: string | null;
  inputVoltageLN?: string | number | null;
  inputVoltageLL?: string | number | null;
  outputVoltageLN?: string | number | null;
  outputVoltageLL?: string | number | null;
  vac?: string | number | null;
  frequency?: string | number | null;
  dcVoltage?: string | number | null;
  outputLoadPercent?: string | number | null;
  inputFrequency?: string | number | null;
  outputFrequency?: string | number | null;
  environmentCondition?: string | null;
  environmentRemarks?: string | null;
  upsLocation?: FsrUpsLocation | null;
  otherLocationSpecification?: string | null;
  observationsNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FsrBatteryReading {
  id?: string;
  fsrId?: string;
  batteryBankId?: string;
  batteryNumber: number;
  chargingVoltage?: string | number | null;
  dischargingVoltage?: string | number | null;
  internalResistance?: string | number | null;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FsrBatteryBank {
  id?: string;
  fsrId?: string;
  bankNumber: number;
  bankDescription?: string | null;
  make?: string | null;
  ah?: string | null;
  quantity: number;
  frontIndication?: string | null;
  voltage?: string | number | null;
  chargingCurrent?: string | number | null;
  dischargingCurrent?: string | number | null;
  remarks?: string | null;
  readings: FsrBatteryReading[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FsrPart {
  id?: string;
  fsrId?: string;
  productId?: string | null;
  partName: string;
  partNumber?: string | null;
  quantity: string | number;
  replacementDetails?: string | null;
  oldPartStatus?: string | null;
  remarks?: string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FsrAttachment {
  id: string;
  fsrId: string;
  category: FsrAttachmentCategory;
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

export interface FsrActivityLog {
  id: string;
  fsrId: string;
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

export interface FieldServiceReport {
  id: string;
  fsrNumber: string;
  customerId: string;
  destinationId?: string | null;
  productId?: string | null;
  serviceEngineerId: string;
  createdById: string;
  updatedById?: string | null;
  visitDate: string;
  problemReported?: string | null;
  reasonForVisit?: string | null;
  callType: FsrCallType;
  status: FsrStatus;
  warrantyStatus: FsrWarrantyStatus;
  billingStatus: FsrBillingStatus;
  productModel?: string | null;
  productMake?: string | null;
  productSerialNumber?: string | null;
  equipmentStatus?: string | null;
  customerName: string;
  companyName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  charges: string | number;
  chargesRemarks?: string | null;
  standbyDetails?: string | null;
  fseFeedback?: string | null;
  customerFeedback?: string | null;
  customerContactName?: string | null;
  customerSignature?: string | null;
  customerStamp?: string | null;
  customerSignedAt?: string | null;
  fseName?: string | null;
  fseNumber?: string | null;
  fseSignature?: string | null;
  fseSignatureDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FsrDetailedView {
  fsr: FieldServiceReport;
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  destination?: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
  } | null;
  product?: {
    id: string;
    name: string;
    sku: string;
    category: string;
  } | null;
  serviceEngineer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    designation: string | null;
  };
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  };
  siteObservation: FsrSiteObservation | null;
  batteryBanks: FsrBatteryBank[];
  parts: FsrPart[];
  attachments: FsrAttachment[];
  activityLogs: FsrActivityLog[];
}

export interface FsrListItem {
  fsr: FieldServiceReport;
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
  };
  destination?: {
    id: string;
    name: string;
    city: string | null;
  } | null;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
  serviceEngineer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    designation: string | null;
  };
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface FsrQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  serviceEngineerId?: string;
  status?: FsrStatus;
  callType?: FsrCallType;
  warrantyStatus?: FsrWarrantyStatus;
  startDate?: string;
  endDate?: string;
  serialNumber?: string;
}

export interface CreateFsrPayload {
  customerId: string;
  destinationId?: string | null;
  productId?: string | null;
  serviceEngineerId: string;
  visitDate: string;
  problemReported?: string | null;
  reasonForVisit?: string | null;
  callType: FsrCallType;
  status?: FsrStatus;
  warrantyStatus?: FsrWarrantyStatus;
  billingStatus?: FsrBillingStatus;
  productModel?: string | null;
  productMake?: string | null;
  productSerialNumber?: string | null;
  equipmentStatus?: string;
  charges?: number | string;
  chargesRemarks?: string | null;
  standbyDetails?: string | null;
  fseFeedback?: string | null;
  customerFeedback?: string | null;
  customerContactName?: string | null;
  customerSignature?: string | null;
  customerStamp?: string | null;
  customerSignedAt?: string | null;
  fseName?: string | null;
  fseNumber?: string | null;
  fseSignature?: string | null;
  fseSignatureDate?: string | null;
  siteObservation?: FsrSiteObservation | null;
  batteryBanks?: Array<{
    bankNumber?: number;
    bankDescription?: string | null;
    make?: string | null;
    ah?: string | null;
    quantity?: number;
    frontIndication?: string | null;
    voltage?: number | string | null;
    chargingCurrent?: number | string | null;
    dischargingCurrent?: number | string | null;
    remarks?: string | null;
    readings?: Array<{
      batteryNumber: number;
      chargingVoltage?: number | string | null;
      dischargingVoltage?: number | string | null;
      internalResistance?: number | string | null;
      remarks?: string | null;
    }>;
  }>;
  parts?: Array<{
    productId?: string | null;
    partName: string;
    partNumber?: string | null;
    quantity?: number | string;
    replacementDetails?: string | null;
    oldPartStatus?: string | null;
    remarks?: string | null;
  }>;
}

export interface UpdateFsrPayload extends Partial<CreateFsrPayload> {}

export interface CustomerSignOffPayload {
  customerContactName: string;
  customerSignature: string;
  customerStamp?: string | null;
  customerSignedAt?: string;
}

export interface FseSignOffPayload {
  fseName: string;
  fseNumber?: string | null;
  fseSignature: string;
  fseSignatureDate?: string;
}

export interface AssignFsePayload {
  serviceEngineerId: string;
  remarks?: string | null;
}

export interface AttachmentUploadPayload {
  category: FsrAttachmentCategory;
  fileName: string;
  fileData: string;
  fileSize: number;
  mimeType: string;
}
