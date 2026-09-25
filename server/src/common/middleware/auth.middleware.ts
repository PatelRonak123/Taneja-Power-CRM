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

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  let token: string | undefined = req.cookies?.access_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
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

    if (req.user.designation && blockedDesignations.includes(req.user.designation)) {
      return next(AppError.forbidden('You do not have permission to access this resource'));
    }

    next();
  };
};

