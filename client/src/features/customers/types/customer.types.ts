export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type DestinationStatus = 'ACTIVE' | 'INACTIVE';

export interface CustomerDestination {
  id: string;
  customerId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  placeId?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  status: DestinationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  notes?: string | null;
  status: CustomerStatus;
  createdById?: string | null;
  createdBy?: string | null;
  destinationCount?: number;
  destinations?: CustomerDestination[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerQueryParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  createdById?: string;
}

export interface CreateCustomerPayload {
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  status?: CustomerStatus;
  createdById?: string;
  createdBy?: string;
}

export interface UpdateCustomerPayload {
  name?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  status?: CustomerStatus;
}

export interface CreateDestinationPayload {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  placeId?: string | null;
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
  status?: DestinationStatus;
}

export interface UpdateDestinationPayload {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  placeId?: string | null;
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
  status?: DestinationStatus;
}

export interface CustomerMetrics {
  total: number;
  active: number;
  inactive: number;
  totalDestinations: number;
}
