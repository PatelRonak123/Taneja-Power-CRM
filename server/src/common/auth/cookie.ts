import { Response, CookieOptions } from 'express';
import { env } from '../../config/env.js';

const isSecure = env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE : env.isProduction;

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// 15 minutes in milliseconds
export const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;

// 30 days in milliseconds
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const getBaseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isSecure,
  sameSite: env.COOKIE_SAME_SITE as CookieOptions['sameSite'],
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
});

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  const baseOptions = getBaseCookieOptions();

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
};

export const clearAuthCookies = (res: Response): void => {
  const baseOptions = getBaseCookieOptions();

  res.clearCookie(ACCESS_TOKEN_COOKIE, baseOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseOptions);
};
