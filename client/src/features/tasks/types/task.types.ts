export type TaskStatus = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskCustomerSummary {
  id: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
}

export interface TaskDestinationSummary {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  status: string;
}

export interface TaskUserSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  avatarUrl?: string | null;
  status?: string | null;
}

export interface TaskItem {
  id: string;
  customerId: string;
  destinationId: string;
  assignedTo?: string | null;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  scheduledAt?: string | null;
  dueAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  currentLatitude?: string | null;
  currentLongitude?: string | null;
  locationAccuracy?: string | null;
  lastLocationUpdatedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customer?: TaskCustomerSummary | null;
  destination?: TaskDestinationSummary | null;
  assignedUser?: TaskUserSummary | null;
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface TaskQueryParams {
  search?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  customerId?: string;
  scheduledDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  customerId: string;
  destinationId: string;
  assignedTo?: string | null;
  priority?: TaskPriority;
  scheduledAt?: string | null;
  dueAt?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  customerId?: string;
  destinationId?: string;
  assignedTo?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  scheduledAt?: string | null;
  dueAt?: string | null;
}

export interface CancelTaskPayload {
  cancellationReason: string;
}

export interface TaskMetrics {
  total: number;
  created: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}
