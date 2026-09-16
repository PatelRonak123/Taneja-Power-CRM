import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiEnvelope } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { TaskItem, TaskMetrics, TaskStatus } from '../types/task.types';

interface MyTasksParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface MyTasksResult {
  tasks: TaskItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics?: TaskMetrics;
}

export const useMyTasks = (params?: MyTasksParams) => {
  return useQuery({
    queryKey: ['my-tasks', params],
    queryFn: async (): Promise<MyTasksResult> => {
      const queryParams: Record<string, string | number> = {};
      if (params?.status && params.status !== 'ALL') {
        queryParams.status = params.status;
      }
      if (params?.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;

      const response = (await apiClient.get(API_ENDPOINTS.TASKS.MY_TASKS, {
        params: queryParams,
      })) as unknown as ApiEnvelope<TaskItem[]>;

      return {
        tasks: response.data || [],
        total: response.meta?.total || (response.data?.length || 0),
        page: response.meta?.page || 1,
        limit: response.meta?.limit || 10,
        totalPages: response.meta?.totalPages || 1,
        metrics: response.meta?.metrics as TaskMetrics | undefined,
      };
    },
  });
};

export const useTaskDetails = (taskId: string) => {
  return useQuery({
    queryKey: ['task-details', taskId],
    queryFn: async (): Promise<TaskItem> => {
      const response = (await apiClient.get(
        API_ENDPOINTS.TASKS.GET_BY_ID(taskId)
      )) as unknown as ApiEnvelope<TaskItem>;
      return response.data;
    },
    enabled: Boolean(taskId),
  });
};
