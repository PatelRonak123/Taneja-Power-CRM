import { UserRole, APP_CONSTANTS } from '../../config/constants.js';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [APP_CONSTANTS.ROLES.ADMIN]: [
    'products:create',
    'products:read',
    'products:update',
    'products:delete',
    'users:manage',
  ],
  [APP_CONSTANTS.ROLES.MANAGER]: [
    'products:create',
    'products:read',
    'products:update',
  ],
  [APP_CONSTANTS.ROLES.USER]: [
    'products:read',
  ],
};

export const hasPermission = (role: UserRole, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};
