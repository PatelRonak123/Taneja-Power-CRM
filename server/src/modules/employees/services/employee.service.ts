import { EmployeeRepository, EmployeeFilterOptions } from '../repositories/employee.repository.js';
import { CreateEmployeeInput } from '../validators/employee.validator.js';
import { hashPassword } from '../../../common/auth/password.js';
import { AppError } from '../../../common/errors/AppError.js';
import { UserEntity } from '../../../database/schema/users.js';

export interface EmployeeResponseDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
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
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async listEmployees(options: EmployeeFilterOptions) {
    const { data, total } = await this.employeeRepo.findAll(options);
    const employees = data.map((user) => this.mapToDto(user));
    const page = options.page || 1;
    const limit = options.limit || 10;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      employees,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
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
      avatarUrl: input.avatarUrl || null,
    });

    return this.mapToDto(newUser);
  }

  async deleteEmployee(id: string): Promise<void> {
    const existing = await this.employeeRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Employee not found');
    }

    await this.employeeRepo.delete(id);
  }
}
