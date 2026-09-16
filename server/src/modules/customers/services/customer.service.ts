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

export class CustomerService {
  constructor(
    private readonly customerRepo: CustomerRepository = new CustomerRepository()
  ) {}

  async listCustomers(options: CustomerFilterOptions) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const [{ data, total }, metrics] = await Promise.all([
      this.customerRepo.findAll(options),
      this.customerRepo.getMetrics(),
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

  async getCustomerById(id: string): Promise<CustomerWithDestinations> {
    const customer = await this.customerRepo.findByIdWithDestinations(id);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }
    return customer;
  }

  async createCustomer(input: CreateCustomerInput): Promise<CustomerEntity> {
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
    });
  }

  async updateCustomer(
    id: string,
    input: UpdateCustomerInput
  ): Promise<CustomerEntity> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Customer not found');
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
