import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(AppError.notFound(`Cannot find resource on endpoint ${req.originalUrl}`));
};
