import { DestinationRepository } from '../repositories/destination.repository.js';
import { CustomerRepository } from '../repositories/customer.repository.js';
import {
  CreateDestinationInput,
  UpdateDestinationInput,
} from '../validators/customer.validator.js';
import { AppError } from '../../../common/errors/AppError.js';
import { CustomerDestinationEntity } from '../../../database/schema/customers.js';
import { db } from '../../../database/db.js';
import { users } from '../../../database/schema/users.js';
import { tasks } from '../../../database/schema/tasks.js';
import { eq, and } from 'drizzle-orm';
import { JwtPayload } from '../../../common/auth/jwt.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class DestinationService {
  constructor(
    private readonly destinationRepo: DestinationRepository = new DestinationRepository(),
    private readonly customerRepo: CustomerRepository = new CustomerRepository()
  ) {}

  private async isScopedEmployee(user?: JwtPayload): Promise<boolean> {
    if (!user) return false;
    if (user.role === APP_CONSTANTS.ROLES.ADMIN || user.role === APP_CONSTANTS.ROLES.MANAGER) {
      return false;
    }

    let workType = user.workType;
    let designation = (user.designation || '').toLowerCase();
    const roleStr = String(user.role || '').toUpperCase();

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

    if (workType === APP_CONSTANTS.WORK_TYPES.OFFICE) {
      return false;
    }

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

  private async ensureCustomerExists(customerId: string, authUser?: JwtPayload) {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }

    if (authUser && (await this.isScopedEmployee(authUser))) {
      const isOwner = customer.createdById === authUser.userId;
      if (!isOwner) {
        throw AppError.forbidden('You do not have permission to access destinations for this customer');
      }
    }

    return customer;
  }

  async listDestinations(
    customerId: string,
    authUser?: JwtPayload
  ): Promise<CustomerDestinationEntity[]> {
    await this.ensureCustomerExists(customerId, authUser);
    return this.destinationRepo.findByCustomerId(customerId);
  }

  async getDestinationById(
    customerId: string,
    destinationId: string,
    authUser?: JwtPayload
  ): Promise<CustomerDestinationEntity> {
    await this.ensureCustomerExists(customerId, authUser);
    const destination = await this.destinationRepo.findByIdAndCustomerId(
      destinationId,
      customerId
    );
    if (!destination) {
      throw AppError.notFound('Customer destination not found');
    }
    return destination;
  }

  async createDestination(
    customerId: string,
    input: CreateDestinationInput,
    authUser?: JwtPayload
  ): Promise<CustomerDestinationEntity> {
    await this.ensureCustomerExists(customerId, authUser);

    return this.destinationRepo.create({
      customerId,
      name: input.name,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      pincode: input.pincode || null,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      placeId: input.placeId || null,
      contactPerson: input.contactPerson || null,
      contactPhone: input.contactPhone || null,
      notes: input.notes || null,
      status: input.status || 'ACTIVE',
    });
  }

  async updateDestination(
    customerId: string,
    destinationId: string,
    input: UpdateDestinationInput,
    authUser?: JwtPayload
  ): Promise<CustomerDestinationEntity> {
    await this.ensureCustomerExists(customerId, authUser);

    const existing = await this.destinationRepo.findByIdAndCustomerId(
      destinationId,
      customerId
    );
    if (!existing) {
      throw AppError.notFound('Customer destination not found');
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.address !== undefined) updateData.address = input.address || null;
    if (input.city !== undefined) updateData.city = input.city || null;
    if (input.state !== undefined) updateData.state = input.state || null;
    if (input.pincode !== undefined) updateData.pincode = input.pincode || null;
    if (input.latitude !== undefined) updateData.latitude = input.latitude || null;
    if (input.longitude !== undefined) updateData.longitude = input.longitude || null;
    if (input.placeId !== undefined) updateData.placeId = input.placeId || null;
    if (input.contactPerson !== undefined)
      updateData.contactPerson = input.contactPerson || null;
    if (input.contactPhone !== undefined)
      updateData.contactPhone = input.contactPhone || null;
    if (input.notes !== undefined) updateData.notes = input.notes || null;
    if (input.status !== undefined) updateData.status = input.status;

    const updated = await this.destinationRepo.update(destinationId, updateData);
    if (!updated) {
      throw AppError.internal('Failed to update destination');
    }

    return updated;
  }

  async deleteDestination(
    customerId: string,
    destinationId: string,
    authUser?: JwtPayload
  ): Promise<void> {
    await this.ensureCustomerExists(customerId, authUser);

    const existing = await this.destinationRepo.findByIdAndCustomerId(
      destinationId,
      customerId
    );
    if (!existing) {
      throw AppError.notFound('Customer destination not found');
    }

    await this.destinationRepo.delete(destinationId);
  }
}
