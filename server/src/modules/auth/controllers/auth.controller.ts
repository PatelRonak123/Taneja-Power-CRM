import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class AuthController {
  constructor(private readonly authService: AuthService = new AuthService()) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.getCurrentUser(req.user!.userId);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'User profile retrieved');
    } catch (error) {
      next(error);
    }
  };
}
