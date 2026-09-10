import { Request, Response, NextFunction } from 'express';

// Feature-specific auth middleware extensions if required
export const authFeatureLogger = (req: Request, _res: Response, next: NextFunction): void => {
  next();
};
