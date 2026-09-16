export const APP_CONSTANTS = {
  API_PREFIX: '/api/v1',
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  ROLES: {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    USER: 'USER',
  } as const,
  STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
  } as const,
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  } as const,
} as const;

export type UserRole = (typeof APP_CONSTANTS.ROLES)[keyof typeof APP_CONSTANTS.ROLES];
export type UserStatus = (typeof APP_CONSTANTS.STATUS)[keyof typeof APP_CONSTANTS.STATUS];
