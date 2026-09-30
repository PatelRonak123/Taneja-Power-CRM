import {
  CustomerRepository,
  CustomerFilterOptions,
  CustomerWithDestinations,
  CustomerMetricsDto,
} from '../repositories/customer.repository.js';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../validators/customer.validator.js';
import { AppError } from '../../../common/errors/AppError.js';
import { CustomerEntity } from '../../../database/schema/customers.js';
import { JwtPayload } from '../../../common/auth/jwt.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class CustomerService {
  constructor(
    private readonly customerRepo: CustomerRepository = new CustomerRepository()
  ) {}

  private isScopedEmployee(user?: JwtPayload): boolean {
    if (!user) return false;
    if (user.role === APP_CONSTANTS.ROLES.ADMIN || user.role === APP_CONSTANTS.ROLES.MANAGER) {
      return false;
    }
    return true;
  }

  async listCustomers(options: CustomerFilterOptions, authUser?: JwtPayload) {
    const page = options.page || 1;
    const limit = options.limit || 10;

    // Server-side Ownership Scoping for Sales and Service Employees
    let scopedCreatedById: string | undefined = options.createdById;
    if (authUser && this.isScopedEmployee(authUser)) {
      scopedCreatedById = authUser.userId;
    }

    const filterOptions: CustomerFilterOptions = {
      ...options,
      createdById: scopedCreatedById,
    };

    const [{ data, total }, metrics] = await Promise.all([
      this.customerRepo.findAll(filterOptions),
      this.customerRepo.getMetrics(scopedCreatedById),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      customers: data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      metrics,
    };
  }

  async getCustomerById(id: string, authUser?: JwtPayload): Promise<CustomerWithDestinations> {
    const customer = await this.customerRepo.findByIdWithDestinations(id);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }

    if (
      authUser &&
      this.isScopedEmployee(authUser) &&
      customer.createdById &&
      customer.createdById !== authUser.userId
    ) {
      throw AppError.forbidden('You do not have permission to view this customer');
    }

    return customer;
  }

  async createCustomer(
    input: CreateCustomerInput,
    authUser?: JwtPayload
  ): Promise<CustomerEntity> {
    return this.customerRepo.create({
      name: input.name,
      companyName: input.companyName || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      pincode: input.pincode || null,
      notes: input.notes || null,
      status: input.status || 'ACTIVE',
      createdById: authUser?.userId || input.createdById || null,
      createdBy: (authUser as any)?.fullName || input.createdBy || null,
    });
  }

  async updateCustomer(
    id: string,
    input: UpdateCustomerInput,
    authUser?: JwtPayload
  ): Promise<CustomerEntity> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Customer not found');
    }

    if (
      authUser &&
      this.isScopedEmployee(authUser) &&
      existing.createdById &&
      existing.createdById !== authUser.userId
    ) {
      throw AppError.forbidden('You do not have permission to edit this customer');
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.companyName !== undefined) updateData.companyName = input.companyName || null;
    if (input.phone !== undefined) updateData.phone = input.phone || null;
    if (input.email !== undefined) updateData.email = input.email || null;
    if (input.address !== undefined) updateData.address = input.address || null;
    if (input.city !== undefined) updateData.city = input.city || null;
    if (input.state !== undefined) updateData.state = input.state || null;
    if (input.pincode !== undefined) updateData.pincode = input.pincode || null;
    if (input.notes !== undefined) updateData.notes = input.notes || null;
    if (input.status !== undefined) updateData.status = input.status;

    const updated = await this.customerRepo.update(id, updateData);
    if (!updated) {
      throw AppError.internal('Failed to update customer details');
    }

    return updated;
  }

  async deleteCustomer(id: string): Promise<void> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Customer not found');
    }

    await this.customerRepo.delete(id);
  }
}
