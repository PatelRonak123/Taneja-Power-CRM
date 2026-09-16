export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  TASKS: {
    MY_TASKS: '/tasks/my-tasks',
    GET_BY_ID: (id: string) => `/tasks/${id}`,
  },
  ATTENDANCE: {
    ME: '/attendance/me',
    MY_HISTORY: '/attendance/my-history',
    GET_BY_ID: (id: string) => `/attendance/${id}`,
  },
  CUSTOMERS: {
    GET_BY_ID: (id: string) => `/customers/${id}`,
    GET_DESTINATIONS: (customerId: string) => `/customers/${customerId}/destinations`,
  },
  HEALTH: '/health',
} as const;
