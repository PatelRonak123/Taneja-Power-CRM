import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from '../../../common/auth/cookie.js';
import { AppError } from '../../../common/errors/AppError.js';

export class AuthController {
  constructor(private readonly authService: AuthService = new AuthService()) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
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
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        'Login successful'
      );
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;
      const result = await this.authService.refresh(refreshToken);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        'Token refreshed successfully'
      );
    } catch (error) {
      if (error instanceof AppError && error.statusCode === APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED) {
        clearAuthCookies(res);
      }
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;
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

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.sendForgotPasswordOtp(req.body.email);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.verifyForgotPasswordOtp(req.body.email, req.body.otp);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.resetPasswordWithOtp(
        req.body.email,
        req.body.otp,
        req.body.newPassword
      );
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  verifyCurrentPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.verifyCurrentPassword(req.user!.userId, req.body.currentPassword);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, { valid: true }, 'Current password verified');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.changePassword(
        req.user!.userId,
        req.body.currentPassword,
        req.body.newPassword
      );
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, result.message);
    } catch (error) {
      next(error);
    }
  };
}
