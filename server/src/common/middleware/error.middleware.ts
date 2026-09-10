import { Request, Response, NextFunction } from 'express';
import { handleError } from '../errors/errorHandler.js';

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  handleError(err, res);
};
