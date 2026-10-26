import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../auth/jwt.js';
import { AppError } from '../errors/AppError.js';
import { UserRole, APP_CONSTANTS } from '../../config/constants.js';
import { hasPermission } from '../auth/permissions.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const isHrUser = (user?: JwtPayload): boolean => {
  if (!user) return false;
  const roleStr = String(user.role || '').toUpperCase();
  const designation = String(user.designation || '').toLowerCase();
  return roleStr === 'HR' || designation.includes('hr') || designation.includes('human resources');
};

export const isServiceOfficeUser = (user?: JwtPayload): boolean => {
  if (!user) return false;
  const roleStr = String(user.role || '').toUpperCase();
  return (
    (roleStr === APP_CONSTANTS.ROLES.USER || roleStr === 'SERVICE') &&
    (user.workType === APP_CONSTANTS.WORK_TYPES.OFFICE || !user.workType) &&
    String(user.designation || '').toLowerCase().includes('service')
  );
};

export const isSalesOfficeUser = (user?: JwtPayload): boolean => {
  if (!user) return false;
  const roleStr = String(user.role || '').toUpperCase();
  if (roleStr === APP_CONSTANTS.ROLES.ADMIN || roleStr === APP_CONSTANTS.ROLES.MANAGER) {
    return false;
  }
  if (roleStr === 'SALES_OFFICE' || roleStr === 'SALES') {
    return true;
  }
  return String(user.designation || '').toLowerCase().includes('sales');
};

export const isAccountantOfficeUser = (user?: JwtPayload): boolean => {
  if (!user) return false;
  const roleStr = String(user.role || '').toUpperCase();
  return (
    roleStr === APP_CONSTANTS.ROLES.USER &&
    (user.workType === APP_CONSTANTS.WORK_TYPES.OFFICE || !user.workType) &&
    String(user.designation || '').toLowerCase().includes('accountant')
  );
};

/**
 * Allows ADMIN, MANAGER, or Accountant Office users.
 * Used for product creation/update (procurement workflow).
 */
export const requireAccountantOrAdminOrManager = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(AppError.unauthorized());
  }
  const role = req.user.role;
  if (
    role === APP_CONSTANTS.ROLES.ADMIN ||
    role === APP_CONSTANTS.ROLES.MANAGER ||
    isAccountantOfficeUser(req.user)
  ) {
    return next();
  }
  return next(AppError.forbidden('You do not have permission to access this resource'));
};

/**
 * Returns true for any Office USER who is permitted to manage field tasks:
 * - Service Office (designation includes 'service')
 * - Sales Office (designation includes 'sales')
 */
export const isOfficeTaskManager = (user?: JwtPayload): boolean =>
  isServiceOfficeUser(user) || isSalesOfficeUser(user);

/**
 * Allows ADMIN, MANAGER, Sales Office, or Service Office employees to access
 * field-task management routes.
 */
export const requireTaskManager = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(AppError.unauthorized());
  }

  const role = req.user.role;
  if (
    role === APP_CONSTANTS.ROLES.ADMIN ||
    role === APP_CONSTANTS.ROLES.MANAGER ||
    isOfficeTaskManager(req.user)
  ) {
    return next();
  }

  return next(AppError.forbidden('You do not have permission to access this resource'));
};

/**
 * @deprecated Use requireTaskManager instead.
 */
export const requireManagementOrServiceOffice = requireTaskManager;

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  let token: string | undefined = req.cookies?.access_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  // Also accept token from query parameter (e.g. for downloading PDF reports via Linking or browser)
  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return next(AppError.unauthorized('Authentication token missing or invalid'));
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    next(AppError.unauthorized('Invalid or expired token'));
  }
};

/**
 * Optional authentication: attaches user if valid token exists,
 * but allows unauthenticated requests to proceed.
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  let token: string | undefined = req.cookies?.access_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
  } catch {
    // Optional auth: ignore token errors and continue unauthenticated
  }
  next();
};

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const userRole = req.user.role;
    const isHr = isHrUser(req.user);

    if (
      allowedRoles.includes(userRole) ||
      (allowedRoles.includes(APP_CONSTANTS.ROLES.HR) && isHr)
    ) {
      return next();
    }

    return next(AppError.forbidden('You do not have permission to access this resource'));
  };
};

export const requirePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    if (!hasPermission(req.user.role, permission, req.user.designation)) {
      return next(AppError.forbidden('You do not have permission to access this resource'));
    }

    next();
  };
};

export const denyDesignations = (...blockedDesignations: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const designation = (req.user.designation || '').toLowerCase();
    if (
      designation &&
      blockedDesignations.some((b) => designation.includes(b.toLowerCase()))
    ) {
      return next(AppError.forbidden('You do not have permission to access this resource'));
    }

    next();
  };
};

