import crypto from 'crypto';

/**
 * Generates a cryptographically secure random string to be used as a raw refresh token.
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Computes the SHA-256 hash of a raw refresh token for safe database storage.
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
