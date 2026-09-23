import { EmployeeRepository, EmployeeFilterOptions, EmployeeMetricsDto } from '../repositories/employee.repository.js';
import { CreateEmployeeInput, UpdateEmployeeInput, isValidDesignationForWorkType } from '../validators/employee.validator.js';
import { hashPassword } from '../../../common/auth/password.js';
import { AppError } from '../../../common/errors/AppError.js';
import { UserEntity, NewUserEntity } from '../../../database/schema/users.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export interface EmployeeResponseDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  workType: string;
  phone?: string | null;
  designation?: string | null;
  status: string;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class EmployeeService {
  constructor(private readonly employeeRepo: EmployeeRepository = new EmployeeRepository()) {}

  private mapToDto(user: UserEntity): EmployeeResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      workType: user.workType || APP_CONSTANTS.WORK_TYPES.OFFICE,
      phone: user.phone,
      designation: user.designation,
      status: user.status || APP_CONSTANTS.STATUS.ACTIVE,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async listEmployees(options: EmployeeFilterOptions) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const [{ data, total }, metrics] = await Promise.all([
      this.employeeRepo.findAll(options),
      this.employeeRepo.getMetrics(),
    ]);

    const employees = data.map((user) => this.mapToDto(user));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      employees,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      metrics,
    };
  }

  async getEmployeeById(id: string): Promise<EmployeeResponseDto> {
    const user = await this.employeeRepo.findById(id);
    if (!user) {
      throw AppError.notFound('Employee not found');
    }
    return this.mapToDto(user);
  }

  async createEmployee(input: CreateEmployeeInput): Promise<EmployeeResponseDto> {
    const existing = await this.employeeRepo.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An employee or user with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const newUser = await this.employeeRepo.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      workType: input.workType || APP_CONSTANTS.WORK_TYPES.OFFICE,
      phone: input.phone || null,
      designation: input.designation || null,
      status: input.status || APP_CONSTANTS.STATUS.ACTIVE,
      avatarUrl: input.avatarUrl || null,
    });

    return this.mapToDto(newUser);
  }

  async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<EmployeeResponseDto> {
    const existing = await this.employeeRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Employee not found');
    }

    const effectiveWorkType = input.workType ?? existing.workType ?? APP_CONSTANTS.WORK_TYPES.OFFICE;
    const effectiveDesignation = input.designation !== undefined ? input.designation : existing.designation;
    const effectiveRole = input.role ?? existing.role;

    if (!isValidDesignationForWorkType(effectiveWorkType, effectiveDesignation, effectiveRole)) {
      throw AppError.badRequest(
        `Invalid designation "${effectiveDesignation}" for workType "${effectiveWorkType}". Valid combinations for OFFICE: ${APP_CONSTANTS.DESIGNATIONS.OFFICE.join(', ')}. Valid combinations for FIELD: ${APP_CONSTANTS.DESIGNATIONS.FIELD.join(', ')}.`
      );
    }

    const updateData: Partial<NewUserEntity> = {};
    if (input.fullName !== undefined) updateData.fullName = input.fullName;
    if (input.workType !== undefined) updateData.workType = input.workType;
    if (input.phone !== undefined) updateData.phone = input.phone || null;
    if (input.designation !== undefined) updateData.designation = input.designation || null;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl || null;

    const updated = await this.employeeRepo.update(id, updateData);
    if (!updated) {
      throw AppError.internal('Failed to update employee details');
    }

    return this.mapToDto(updated);
  }

  async deleteEmployee(id: string, currentAdminId?: string): Promise<void> {
    if (currentAdminId && id === currentAdminId) {
      throw AppError.badRequest('Administrators cannot delete their own account.');
    }

    const existing = await this.employeeRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Employee not found');
    }

    await this.employeeRepo.delete(id);
  }
}
