import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiEnvelope } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { TodayAttendanceResponse, AttendanceRecord } from '../types/attendance.types';

export const useTodayAttendance = () => {
  return useQuery({
    queryKey: ['today-attendance'],
    queryFn: async (): Promise<TodayAttendanceResponse> => {
      const response = (await apiClient.get(
        API_ENDPOINTS.ATTENDANCE.ME
      )) as unknown as ApiEnvelope<TodayAttendanceResponse>;
      return response.data;
    },
  });
};

export const useAttendanceHistory = () => {
  return useQuery({
    queryKey: ['my-attendance-history'],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const response = (await apiClient.get(
        API_ENDPOINTS.ATTENDANCE.MY_HISTORY
      )) as unknown as ApiEnvelope<AttendanceRecord[]>;
      return response.data || [];
    },
  });
};
