import { Request, Response, NextFunction } from 'express';

export const productRateLimiter = (req: Request, _res: Response, next: NextFunction): void => {
  // Product-specific middleware hook
  next();
};
