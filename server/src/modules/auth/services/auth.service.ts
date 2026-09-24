import { AuthRepository } from '../repositories/auth.repository.js';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import { hashPassword, comparePassword } from '../../../common/auth/password.js';
import { signToken } from '../../../common/auth/jwt.js';
import { generateRefreshToken, hashRefreshToken } from '../../../common/auth/crypto.js';
import { REFRESH_TOKEN_MAX_AGE } from '../../../common/auth/cookie.js';
import { AppError } from '../../../common/errors/AppError.js';
import { AuthMapper } from '../mappers/auth.mapper.js';
import { AuthResultDto, UserResponseDto } from '../dto/auth.dto.js';

export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository = new AuthRepository(),
    private readonly refreshTokenRepo: RefreshTokenRepository = new RefreshTokenRepository()
  ) {}

  private async generateTokensAndSaveSession(
    userId: string,
    email: string,
    role: any,
    workType?: any,
    designation?: any
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Access JWT
    const accessToken = signToken({
      userId,
      email,
      role,
      workType,
      designation,
    });

    // Opaque Refresh Token
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);

    // Save hashed refresh token record in DB
    await this.refreshTokenRepo.create({
      userId,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput): Promise<AuthResultDto> {
    const existing = await this.authRepo.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const newUser = await this.authRepo.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role || 'USER',
      workType: input.workType || 'OFFICE',
      phone: input.phone || null,
      designation: input.designation || null,
    });

    const authenticatedUser = AuthMapper.toAuthenticatedUser(newUser);
    const { accessToken, refreshToken } = await this.generateTokensAndSaveSession(
      authenticatedUser.id,
      authenticatedUser.email,
      authenticatedUser.role,
      authenticatedUser.workType,
      authenticatedUser.designation
    );

    return {
      user: authenticatedUser,
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput): Promise<AuthResultDto> {
    const user = await this.authRepo.findByEmail(input.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isValid = await comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.status === 'INACTIVE') {
      throw AppError.forbidden('Your account has been deactivated. Please contact an administrator.');
    }

    const authenticatedUser = AuthMapper.toAuthenticatedUser(user);
    const { accessToken, refreshToken } = await this.generateTokensAndSaveSession(
      authenticatedUser.id,
      authenticatedUser.email,
      authenticatedUser.role,
      authenticatedUser.workType,
      authenticatedUser.designation
    );

    return {
      user: authenticatedUser,
      accessToken,
      refreshToken,
    };
  }

  async refresh(rawRefreshToken?: string): Promise<AuthResultDto> {
    if (!rawRefreshToken) {
      throw AppError.unauthorized('Refresh token missing');
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const tokenRecord = await this.refreshTokenRepo.findByHash(tokenHash);

    if (!tokenRecord || tokenRecord.revokedAt || new Date(tokenRecord.expiresAt) <= new Date()) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const user = await this.authRepo.findById(tokenRecord.userId);
    if (!user) {
      throw AppError.unauthorized('User associated with token no longer exists');
    }

    if (user.status === 'INACTIVE') {
      throw AppError.forbidden('Your account has been deactivated. Please contact an administrator.');
    }

    // Revoke old refresh token (Refresh Token Rotation)
    await this.refreshTokenRepo.revoke(tokenRecord.id);

    // Issue new access JWT and new refresh token session
    const authenticatedUser = AuthMapper.toAuthenticatedUser(user);
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await this.generateTokensAndSaveSession(
        authenticatedUser.id,
        authenticatedUser.email,
        authenticatedUser.role,
        authenticatedUser.workType,
        authenticatedUser.designation
      );

    return {
      user: authenticatedUser,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      const tokenRecord = await this.refreshTokenRepo.findByHash(tokenHash);
      if (tokenRecord && !tokenRecord.revokedAt) {
        await this.refreshTokenRepo.revoke(tokenRecord.id);
      }
    }
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.authRepo.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    return AuthMapper.toUserResponseDto(user);
  }
}
