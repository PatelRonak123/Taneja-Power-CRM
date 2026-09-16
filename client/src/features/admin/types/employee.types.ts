export type EmployeeRole = 'ADMIN' | 'MANAGER' | 'USER';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export interface Employee {
  id: string;
  email: string;
  fullName: string;
  role: EmployeeRole;
  phone?: string | null;
  designation?: string | null;
  status: EmployeeStatus;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeQueryParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateEmployeePayload {
  fullName: string;
  email: string;
  password: string;
  role: EmployeeRole;
  phone?: string;
  designation?: string;
  status?: EmployeeStatus;
  avatarUrl?: string;
}

export interface UpdateEmployeePayload {
  fullName?: string;
  role?: EmployeeRole;
  phone?: string;
  designation?: string;
  status?: EmployeeStatus;
  avatarUrl?: string;
}

export interface EmployeeMetrics {
  total: number;
  admins: number;
  managers: number;
  users: number;
  active: number;
  inactive: number;
}
