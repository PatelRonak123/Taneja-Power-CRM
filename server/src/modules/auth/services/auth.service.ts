import { AuthRepository } from '../repositories/auth.repository.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import { hashPassword, comparePassword } from '../../../common/auth/password.js';
import { signToken } from '../../../common/auth/jwt.js';
import { AppError } from '../../../common/errors/AppError.js';
import { AuthMapper } from '../mappers/auth.mapper.js';
import { AuthResponseDto, UserResponseDto } from '../dto/auth.dto.js';
import { UserRole } from '../../../config/constants.js';

export class AuthService {
  constructor(private readonly authRepo: AuthRepository = new AuthRepository()) {}

  async register(input: RegisterInput): Promise<AuthResponseDto> {
    const existing = await this.authRepo.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const newUser = await this.authRepo.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: 'USER',
    });

    const authenticatedUser = AuthMapper.toAuthenticatedUser(newUser);
    const token = signToken({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
    });

    return {
      user: authenticatedUser,
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResponseDto> {
    const user = await this.authRepo.findByEmail(input.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isValid = await comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const authenticatedUser = AuthMapper.toAuthenticatedUser(user);
    const token = signToken({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
    });

    return {
      user: authenticatedUser,
      token,
    };
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.authRepo.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    return AuthMapper.toUserResponseDto(user);
  }
}
