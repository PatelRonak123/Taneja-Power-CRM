import { CustomerDestination } from '../../customers/types/customer.types';

export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type LeadStatus =
  | 'New'
  | 'NEW LEADS'
  | 'Contacted'
  | 'CONTACTED'
  | 'Meeting Scheduled'
  | 'MEETING SCHEDULED'
  | 'Quotation Sent'
  | 'QUOTATION SENT'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'NEGOTIATION'
  | 'Order Confirmed'
  | 'ORDER CONFIRMED'
  | 'Approved'
  | 'APPROVED/PO'
  | 'Ready for Dispatch'
  | 'READY FOR DISPATCH'
  | 'Dispatched'
  | 'DISPATCHED'
  | 'Installation'
  | 'INSTALLATION'
  | 'Completed'
  | 'COMPLETED'
  | 'Lost'
  | 'LOST'
  | string;

export type LeadSource = 'Web' | 'Referral' | 'Field Call' | 'Exhibition' | 'Direct';

export interface LeadActivity {
  id: string;
  title: string;
  date: string;
  type: string;
}

export interface Lead {
  id: string;
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  productInterested: string;
  expectedValue: number;
  assignedExecutive: string;
  assignedEmployeeId?: string;
  createdBy?: string;
  createdById?: string;
  priority: LeadPriority;
  status: LeadStatus;
  source: LeadSource;
  linkedClientId?: string;
  destinationCount?: number;
  destinations?: CustomerDestination[];
  activityLogs: LeadActivity[];
}

