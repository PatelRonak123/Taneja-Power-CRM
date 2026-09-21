import { UserEntity } from '../../../database/schema/users.js';
import { AuthenticatedUser } from '../types/auth.types.js';
import { UserResponseDto } from '../dto/auth.dto.js';
import { UserRole } from '../../../config/constants.js';

export class AuthMapper {
  static toAuthenticatedUser(entity: UserEntity): AuthenticatedUser {
    return {
      id: entity.id,
      email: entity.email,
      fullName: entity.fullName,
      role: entity.role as UserRole,
      designation: entity.designation,
      phone: entity.phone,
      avatarUrl: entity.avatarUrl,
    };
  }

  static toUserResponseDto(entity: UserEntity): UserResponseDto {
    return {
      id: entity.id,
      email: entity.email,
      fullName: entity.fullName,
      role: entity.role,
      designation: entity.designation,
      phone: entity.phone,
      avatarUrl: entity.avatarUrl,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
