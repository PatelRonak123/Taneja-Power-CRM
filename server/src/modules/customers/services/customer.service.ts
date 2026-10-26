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
import { db } from '../../../database/db.js';
import { users } from '../../../database/schema/users.js';
import { tasks } from '../../../database/schema/tasks.js';
import { eq, and } from 'drizzle-orm';
import { JwtPayload } from '../../../common/auth/jwt.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class CustomerService {
  constructor(
    private readonly customerRepo: CustomerRepository = new CustomerRepository()
  ) {}

  private async isScopedEmployee(user?: JwtPayload): Promise<boolean> {
    if (!user) return false;
    // Admins and Managers have global access
    if (user.role === APP_CONSTANTS.ROLES.ADMIN || user.role === APP_CONSTANTS.ROLES.MANAGER) {
      return false;
    }

    let workType = user.workType;
    let designation = (user.designation || '').toLowerCase();
    const roleStr = String(user.role || '').toUpperCase();

    // If workType or designation is missing from token, fetch from users table
    if (!workType || !designation) {
      try {
        const [dbUser] = await db
          .select({ workType: users.workType, designation: users.designation })
          .from(users)
          .where(eq(users.id, user.userId))
          .limit(1);
        if (dbUser) {
          workType = (dbUser.workType as any) || workType;
          designation = (dbUser.designation || designation || '').toLowerCase();
        }
      } catch {
        // Fallback to token values
      }
    }

    // Sales users (Sales Office, Sales reps, etc.) are strictly scoped to their own customers
    if (
      roleStr === 'SALES' ||
      roleStr === 'SALES_OFFICE' ||
      designation.includes('sales')
    ) {
      return true;
    }

    // Non-sales Office employees (Service Office, Accountant Office, HR) have full customer access
    if (workType === APP_CONSTANTS.WORK_TYPES.OFFICE) {
      return false;
    }

    // Service field staff (Service Engineer, Solar Technician, FSE, Electrician, etc.) must be able to view/select all customers
    const exemptKeywords = [
      'office',
      'accountant',
      'hr',
      'service',
      'technician',
      'tech',
      'engineer',
      'electrician',
      'fse',
      'solar',
    ];

    if (exemptKeywords.some((k) => designation.includes(k))) {
      return false;
    }

    return true;
  }

  private async hasAssignedTaskForCustomer(userId: string, customerId: string): Promise<boolean> {
    try {
      const rows = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.assignedTo, userId), eq(tasks.customerId, customerId)))
        .limit(1);
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  async listCustomers(options: CustomerFilterOptions, authUser?: JwtPayload) {
    const page = options.page || 1;
    const limit = options.limit || 10;

    // Server-side Ownership Scoping: only pure field sales reps are scoped to their own accounts
    let scopedCreatedById: string | undefined = options.createdById;
    if (authUser && (await this.isScopedEmployee(authUser))) {
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

    if (authUser && (await this.isScopedEmployee(authUser))) {
      const isOwner = customer.createdById === authUser.userId;
      if (!isOwner) {
        throw AppError.forbidden('You do not have permission to view this customer');
      }
    }

    return customer;
  }

  async createCustomer(
    input: CreateCustomerInput,
    authUser?: JwtPayload
  ): Promise<CustomerEntity> {
    const isAdminOrManager =
      authUser?.role === APP_CONSTANTS.ROLES.ADMIN ||
      authUser?.role === APP_CONSTANTS.ROLES.MANAGER;

    let creatorName = input.createdBy || null;
    const targetUserId =
      isAdminOrManager && input.createdById ? input.createdById : authUser?.userId;
    if (targetUserId) {
      try {
        const [u] = await db
          .select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, targetUserId))
          .limit(1);
        if (u?.fullName) {
          creatorName = u.fullName;
        }
      } catch {
        // Fallback
      }
    }

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
      createdById: isAdminOrManager
        ? (input.createdById || authUser?.userId || null)
        : (authUser?.userId || null),
      createdBy: creatorName,
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

    if (authUser && (await this.isScopedEmployee(authUser))) {
      if (existing.createdById !== authUser.userId) {
        throw AppError.forbidden('You do not have permission to edit this customer');
      }
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

  async deleteCustomer(id: string, authUser?: JwtPayload): Promise<void> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Customer not found');
    }

    if (authUser && (await this.isScopedEmployee(authUser))) {
      if (existing.createdById !== authUser.userId) {
        throw AppError.forbidden('You do not have permission to delete this customer');
      }
    }

    await this.customerRepo.delete(id);
  }
}
