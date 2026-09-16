import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import {
  TaskItem,
  TaskQueryParams,
  CreateTaskPayload,
  UpdateTaskPayload,
  CancelTaskPayload,
} from '../types/task.types';

export const taskService = {
  getTasks: async (params?: TaskQueryParams): Promise<ApiEnvelope<TaskItem[]>> => {
    return apiClient.get('/tasks', { params }) as unknown as Promise<ApiEnvelope<TaskItem[]>>;
  },

  getTaskById: async (id: string): Promise<ApiEnvelope<TaskItem>> => {
    return apiClient.get(`/tasks/${id}`) as unknown as Promise<ApiEnvelope<TaskItem>>;
  },

  createTask: async (payload: CreateTaskPayload): Promise<ApiEnvelope<TaskItem>> => {
    return apiClient.post('/tasks', payload) as unknown as Promise<ApiEnvelope<TaskItem>>;
  },

  updateTask: async (id: string, payload: UpdateTaskPayload): Promise<ApiEnvelope<TaskItem>> => {
    return apiClient.put(`/tasks/${id}`, payload) as unknown as Promise<ApiEnvelope<TaskItem>>;
  },

  cancelTask: async (id: string, payload: CancelTaskPayload): Promise<ApiEnvelope<TaskItem>> => {
    return apiClient.post(`/tasks/${id}/cancel`, payload) as unknown as Promise<ApiEnvelope<TaskItem>>;
  },

  deleteTask: async (id: string): Promise<ApiEnvelope<{ id: string }>> => {
    return apiClient.delete(`/tasks/${id}`) as unknown as Promise<ApiEnvelope<{ id: string }>>;
  },
};
