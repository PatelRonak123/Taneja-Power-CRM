import { DestinationRepository } from '../repositories/destination.repository.js';
import { CustomerRepository } from '../repositories/customer.repository.js';
import {
  CreateDestinationInput,
  UpdateDestinationInput,
} from '../validators/customer.validator.js';
import { AppError } from '../../../common/errors/AppError.js';
import { CustomerDestinationEntity } from '../../../database/schema/customers.js';

export class DestinationService {
  constructor(
    private readonly destinationRepo: DestinationRepository = new DestinationRepository(),
    private readonly customerRepo: CustomerRepository = new CustomerRepository()
  ) {}

  private async ensureCustomerExists(customerId: string) {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }
    return customer;
  }

  async listDestinations(customerId: string): Promise<CustomerDestinationEntity[]> {
    await this.ensureCustomerExists(customerId);
    return this.destinationRepo.findByCustomerId(customerId);
  }

  async getDestinationById(
    customerId: string,
    destinationId: string
  ): Promise<CustomerDestinationEntity> {
    await this.ensureCustomerExists(customerId);
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
    input: CreateDestinationInput
  ): Promise<CustomerDestinationEntity> {
    await this.ensureCustomerExists(customerId);

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
    input: UpdateDestinationInput
  ): Promise<CustomerDestinationEntity> {
    await this.ensureCustomerExists(customerId);

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

  async deleteDestination(customerId: string, destinationId: string): Promise<void> {
    await this.ensureCustomerExists(customerId);

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
