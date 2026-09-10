import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../auth/jwt.js';
import { AppError } from '../errors/AppError.js';
import { UserRole } from '../../config/constants.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication token missing or invalid'));
  }

  const token = authHeader.split(' ')[1];

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

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to access this resource'));
    }

    next();
  };
};
