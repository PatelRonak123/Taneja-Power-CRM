import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from '../../../common/auth/cookie.js';

export class AuthController {
  constructor(private readonly authService: AuthService = new AuthService()) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        { user: result.user },
        'Registration successful'
      );
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        { user: result.user },
        'Login successful'
      );
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
      const result = await this.authService.refresh(refreshToken);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        { user: result.user },
        'Token refreshed successfully'
      );
    } catch (error) {
      clearAuthCookies(res);
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
      await this.authService.logout(refreshToken);
      clearAuthCookies(res);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, null, 'Logged out successfully');
    } catch (error) {
      clearAuthCookies(res);
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
