import { AuthRepository } from "../repositories/auth.repository.js";
import { RefreshTokenRepository } from "../repositories/refreshToken.repository.js";
import { RegisterInput, LoginInput } from "../validators/auth.validator.js";
import {
  hashPassword,
  comparePassword,
} from "../../../common/auth/password.js";
import { signToken } from "../../../common/auth/jwt.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../../../common/auth/crypto.js";
import { REFRESH_TOKEN_MAX_AGE } from "../../../common/auth/cookie.js";
import { AppError } from "../../../common/errors/AppError.js";
import { AuthMapper } from "../mappers/auth.mapper.js";
import { AuthResultDto, UserResponseDto } from "../dto/auth.dto.js";
import { emailService } from "../../../common/services/email.service.js";

export class AuthService {
  private static otpStore: Map<string, { code: string; expiresAt: number }> =
    new Map();

  constructor(
    private readonly authRepo: AuthRepository = new AuthRepository(),
    private readonly refreshTokenRepo: RefreshTokenRepository = new RefreshTokenRepository(),
  ) {}

  private async generateTokensAndSaveSession(
    userId: string,
    email: string,
    role: any,
    workType?: any,
    designation?: any,
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
      throw AppError.conflict(
        "An account with this email address already exists",
      );
    }

    const passwordHash = await hashPassword(input.password);
    const newUser = await this.authRepo.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role || "USER",
      workType: input.workType || "OFFICE",
      phone: input.phone || null,
      designation: input.designation || null,
    });

    const authenticatedUser = AuthMapper.toAuthenticatedUser(newUser);
    const { accessToken, refreshToken } =
      await this.generateTokensAndSaveSession(
        authenticatedUser.id,
        authenticatedUser.email,
        authenticatedUser.role,
        authenticatedUser.workType,
        authenticatedUser.designation,
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
      throw AppError.unauthorized("Invalid email or password");
    }

    const isValid = await comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized("Invalid email or password");
    }

    if (user.status === "INACTIVE") {
      throw AppError.forbidden(
        "Your account has been deactivated. Please contact an administrator.",
      );
    }

    const authenticatedUser = AuthMapper.toAuthenticatedUser(user);
    const { accessToken, refreshToken } =
      await this.generateTokensAndSaveSession(
        authenticatedUser.id,
        authenticatedUser.email,
        authenticatedUser.role,
        authenticatedUser.workType,
        authenticatedUser.designation,
      );

    return {
      user: authenticatedUser,
      accessToken,
      refreshToken,
    };
  }

  async refresh(rawRefreshToken?: string): Promise<AuthResultDto> {
    if (!rawRefreshToken) {
      throw AppError.unauthorized("Refresh token missing");
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const tokenRecord = await this.refreshTokenRepo.findByHash(tokenHash);

    if (!tokenRecord || new Date(tokenRecord.expiresAt) <= new Date()) {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }

    // Grace period for token rotation (30 seconds) to handle concurrent requests & retries
    if (tokenRecord.revokedAt) {
      const revokedTime = new Date(tokenRecord.revokedAt).getTime();
      const isWithinGraceWindow = Date.now() - revokedTime < 30 * 1000;
      if (!isWithinGraceWindow) {
        throw AppError.unauthorized("Refresh token already revoked or expired");
      }
    }

    const user = await this.authRepo.findById(tokenRecord.userId);
    if (!user) {
      throw AppError.unauthorized(
        "User associated with token no longer exists",
      );
    }

    if (user.status === "INACTIVE") {
      throw AppError.forbidden(
        "Your account has been deactivated. Please contact an administrator.",
      );
    }

    // Revoke old refresh token (Refresh Token Rotation) if not already revoked within grace window
    if (!tokenRecord.revokedAt) {
      await this.refreshTokenRepo.revoke(tokenRecord.id);
    }

    // Issue new access JWT and new refresh token session
    const authenticatedUser = AuthMapper.toAuthenticatedUser(user);
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await this.generateTokensAndSaveSession(
        authenticatedUser.id,
        authenticatedUser.email,
        authenticatedUser.role,
        authenticatedUser.workType,
        authenticatedUser.designation,
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
      throw AppError.notFound("User not found");
    }

    return AuthMapper.toUserResponseDto(user);
  }

  /**
   * 1. Generate & Send 4-digit OTP code to email for password reset
   */
  async sendForgotPasswordOtp(
    email: string,
  ): Promise<{ message: string; devOtp?: string; emailDelivered?: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.authRepo.findByEmail(cleanEmail);
    if (!user) {
      throw AppError.notFound(
        "No registered account found with this email address",
      );
    }
    if (user.status === "INACTIVE") {
      throw AppError.forbidden(
        "Your account has been deactivated. Please contact an administrator.",
      );
    }

    // Generate random 4-digit numeric OTP code
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Invalidate any old OTP for this email and set the new one
    AuthService.otpStore.delete(cleanEmail);
    AuthService.otpStore.set(cleanEmail, { code: otpCode, expiresAt });

    // Send email via emailService
    const emailResult = await emailService.sendOtpEmail(cleanEmail, otpCode);

    let message = `A 4-digit verification code has been sent to ${cleanEmail}. Valid for 5 minutes.`;
    if (!emailResult.delivered) {
      if (emailResult.isSandboxRestricted) {
        message = `Email notice: Resend is in free sandbox mode ('onboarding@resend.dev'), which restricts delivery to unverified domains. Your OTP code is: ${otpCode}`;
      } else {
        message = `Email notice: ${emailResult.error || "Email delivery failed"}. Your OTP code is: ${otpCode}`;
      }
    }

    return {
      message,
      devOtp: otpCode,
      emailDelivered: emailResult.delivered,
    };
  }

  /**
   * 2. Verify 4-digit OTP code
   */
  async verifyForgotPasswordOtp(
    email: string,
    otp: string,
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    const stored = AuthService.otpStore.get(cleanEmail);

    if (!stored) {
      throw AppError.badRequest(
        "OTP code has expired or was not requested for this email address",
      );
    }
    if (Date.now() > stored.expiresAt) {
      AuthService.otpStore.delete(cleanEmail);
      throw AppError.badRequest(
        "OTP code has expired. Please request a new OTP",
      );
    }
    if (stored.code !== cleanOtp) {
      throw AppError.badRequest(
        "Invalid 4-digit OTP code. Please check your email and try again",
      );
    }

    return {
      success: true,
      message: "OTP verified successfully",
    };
  }

  /**
   * 3. Reset password after OTP verification
   */
  async resetPasswordWithOtp(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    const stored = AuthService.otpStore.get(cleanEmail);

    if (!stored || stored.code !== cleanOtp || Date.now() > stored.expiresAt) {
      throw AppError.badRequest(
        "Invalid or expired OTP session. Please restart password reset",
      );
    }

    const user = await this.authRepo.findByEmail(cleanEmail);
    if (!user) {
      throw AppError.notFound("User account not found");
    }

    const passwordHash = await hashPassword(newPassword);
    await this.authRepo.updatePassword(user.id, passwordHash);

    // Revoke OTP after successful reset
    AuthService.otpStore.delete(cleanEmail);

    return {
      message:
        "Password reset successfully! You can now sign in with your new password.",
    };
  }

  /**
   * 4. Verify current user's password for profile security
   */
  async verifyCurrentPassword(
    userId: string,
    currentPassword: string,
  ): Promise<boolean> {
    const user = await this.authRepo.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw AppError.badRequest("Current password is incorrect. Please try again.");
    }

    return true;
  }

  /**
   * 5. Change user password from profile page after verifying current password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.authRepo.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw AppError.badRequest("Current password is incorrect. Please try again.");
    }

    const isSamePassword = await comparePassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw AppError.badRequest("New password cannot be the same as your current password");
    }

    const passwordHash = await hashPassword(newPassword);
    await this.authRepo.updatePassword(user.id, passwordHash);

    return {
      message: "Password updated successfully! Next time you sign in, use your new password.",
    };
  }
}

