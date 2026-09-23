import { UserRole, WorkType } from '../../../config/constants.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  workType: WorkType;
  designation?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginResult {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}
