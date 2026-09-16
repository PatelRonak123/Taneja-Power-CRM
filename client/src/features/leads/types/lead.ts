export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Meeting Scheduled'
  | 'Proposal Sent'
  | 'Approved'
  | 'Lost';

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
  priority: LeadPriority;
  status: LeadStatus;
  source: LeadSource;
  linkedClientId?: string;
  activityLogs: LeadActivity[];
}
