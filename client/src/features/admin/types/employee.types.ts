export type EmployeeRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface Employee {
  id: string;
  email: string;
  fullName: string;
  role: EmployeeRole;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeQueryParams {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export interface CreateEmployeePayload {
  fullName: string;
  email: string;
  password: string;
  role: EmployeeRole;
  avatarUrl?: string;
}
