import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';
import { Employee, EmployeeQueryParams, CreateEmployeePayload } from '../types/employee.types';

export const employeeService = {
  getEmployees: async (params?: EmployeeQueryParams): Promise<ApiEnvelope<Employee[]>> => {
    return apiClient.get('/employees', { params }) as unknown as Promise<ApiEnvelope<Employee[]>>;
  },

  getEmployeeById: async (id: string): Promise<ApiEnvelope<Employee>> => {
    return apiClient.get(`/employees/${id}`) as unknown as Promise<ApiEnvelope<Employee>>;
  },

  createEmployee: async (payload: CreateEmployeePayload): Promise<ApiEnvelope<Employee>> => {
    return apiClient.post('/employees', payload) as unknown as Promise<ApiEnvelope<Employee>>;
  },

  deleteEmployee: async (id: string): Promise<ApiEnvelope<{ id: string }>> => {
    return apiClient.delete(`/employees/${id}`) as unknown as Promise<ApiEnvelope<{ id: string }>>;
  },
};
