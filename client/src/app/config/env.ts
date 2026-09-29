export const env = {
  NODE_ENV: import.meta.env.MODE || (import.meta.env.PROD ? 'production' : 'development'),
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Taneja Power Management',
  IS_PROD: import.meta.env.PROD,
  IS_DEV: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
} as const;
