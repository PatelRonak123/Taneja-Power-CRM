export type TaskStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskCustomer {
  id: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}

export interface TaskDestination {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: string | null;
  longitude: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
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

export interface TaskAmcVisitSummary {
  id: string;
  visitNumber?: number | null;
  amcContractId?: string | null;
  contractNumber?: string | null;
  serviceType?: string | null;
  status?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  completedAt?: string | null;
  report?: {
    id: string;
    reportNumber?: string | null;
    status?: string | null;
  } | null;
}

export interface TaskItem {
  id: string;
  customerId: string;
  destinationId: string;
  assignedTo: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  scheduledAt: string | null;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  currentLatitude?: string | null;
  currentLongitude?: string | null;
  locationAccuracy?: string | null;
  lastLocationUpdatedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customer: TaskCustomer | null;
  destination: TaskDestination | null;
  assignedUser: TaskUserSummary | null;
  amcVisit?: TaskAmcVisitSummary | null;
}

export interface StartTaskPayload {
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateTaskLocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number | null;
}

export interface CompleteTaskPayload {
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface TaskMetrics {
  total: number;
  created: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface TaskListResponseMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics?: TaskMetrics;
}
