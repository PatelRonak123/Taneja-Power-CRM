import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiEnvelope } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  TodayAttendanceResponse,
  AttendanceRecord,
  CheckInPayload,
  CheckOutPayload,
} from '../types/attendance.types';

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

export const useCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckInPayload): Promise<AttendanceRecord> => {
      const response = (await apiClient.post(
        API_ENDPOINTS.ATTENDANCE.CHECK_IN,
        payload
      )) as unknown as ApiEnvelope<AttendanceRecord>;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-history'] });
    },
  });
};

export const useCheckOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckOutPayload): Promise<AttendanceRecord> => {
      const response = (await apiClient.post(
        API_ENDPOINTS.ATTENDANCE.CHECK_OUT,
        payload
      )) as unknown as ApiEnvelope<AttendanceRecord>;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-history'] });
    },
  });
};

