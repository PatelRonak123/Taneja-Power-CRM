import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import {
  AttendanceItem,
  AttendanceQueryParams,
  AttendanceMetrics,
  CheckInPayload,
  CheckOutPayload,
  MyAttendanceResponse,
} from '../types/attendance.types';

export const attendanceService = {
  getAttendance: async (params?: AttendanceQueryParams): Promise<ApiEnvelope<AttendanceItem[]>> => {
    return apiClient.get('/attendance', { params }) as unknown as Promise<ApiEnvelope<AttendanceItem[]>>;
  },

  getAttendanceById: async (id: string): Promise<ApiEnvelope<AttendanceItem>> => {
    return apiClient.get(`/attendance/${id}`) as unknown as Promise<ApiEnvelope<AttendanceItem>>;
  },

  getMetrics: async (date?: string): Promise<ApiEnvelope<AttendanceMetrics>> => {
    return apiClient.get('/attendance/metrics', {
      params: date ? { date } : undefined,
    }) as unknown as Promise<ApiEnvelope<AttendanceMetrics>>;
  },

  getCurrentlyCheckedIn: async (date?: string): Promise<ApiEnvelope<AttendanceItem[]>> => {
    return apiClient.get('/attendance/currently-checked-in', {
      params: date ? { date } : undefined,
    }) as unknown as Promise<ApiEnvelope<AttendanceItem[]>>;
  },

  getMyAttendance: async (date?: string): Promise<ApiEnvelope<MyAttendanceResponse>> => {
    return apiClient.get('/attendance/me', {
      params: date ? { date } : undefined,
    }) as unknown as Promise<ApiEnvelope<MyAttendanceResponse>>;
  },

  checkIn: async (payload: CheckInPayload): Promise<ApiEnvelope<AttendanceItem>> => {
    return apiClient.post('/attendance/check-in', payload) as unknown as Promise<ApiEnvelope<AttendanceItem>>;
  },

  checkOut: async (payload: CheckOutPayload): Promise<ApiEnvelope<AttendanceItem>> => {
    return apiClient.post('/attendance/check-out', payload) as unknown as Promise<ApiEnvelope<AttendanceItem>>;
  },
};
