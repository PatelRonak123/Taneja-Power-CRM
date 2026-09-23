import { AuthenticatedUser } from '../types/auth.types.js';

export interface UserResponseDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  workType: string;
  designation?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface AuthResultDto {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseDto {
  user: AuthenticatedUser;
}
