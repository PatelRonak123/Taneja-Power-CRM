export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  workType?: 'OFFICE' | 'FIELD';
  phone?: string | null;
  designation?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface NormalizedApiError {
  message: string;
  code: string;
  statusCode?: number;
  details?: unknown;
}
