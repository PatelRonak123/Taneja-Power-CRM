import { AppError } from '../../../common/errors/AppError.js';
import { CustomerEquipmentRepository } from '../repositories/customer-equipment.repository.js';
import { CustomerEquipmentNumberService } from './customer-equipment-number.service.js';
import {
  ListCustomerEquipmentQuery,
  UpdateCustomerEquipmentInput,
  ManualCreateCustomerEquipmentInput,
} from '../validators/customer-equipment.validator.js';
import { db } from '../../../database/db.js';
import { customers } from '../../../database/schema/customers.js';
import { products } from '../../../database/schema/products.js';
import { eq } from 'drizzle-orm';
import { isSalesOfficeUser } from '../../../common/middleware/auth.middleware.js';
import { JwtPayload } from '../../../common/auth/jwt.js';

export class CustomerEquipmentService {
  constructor(
    private readonly repo: CustomerEquipmentRepository = new CustomerEquipmentRepository(),
    private readonly numberService: CustomerEquipmentNumberService = new CustomerEquipmentNumberService()
  ) {}

  async listEquipment(query: ListCustomerEquipmentQuery) {
    return this.repo.findAll(query);
  }

  async getEquipmentById(id: string) {
    const equipment = await this.repo.findById(id);
    if (!equipment) {
      throw AppError.notFound(`Customer Equipment with ID "${id}" was not found`, 'EQUIPMENT_NOT_FOUND');
    }
    return equipment;
  }

  async getEquipmentByCustomerId(customerId: string, authUser?: JwtPayload) {
    const [customer] = await db
      .select({ id: customers.id, name: customers.name, createdById: customers.createdById })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      throw AppError.notFound(`Customer with ID "${customerId}" not found`, 'CUSTOMER_NOT_FOUND');
    }

    if (authUser && isSalesOfficeUser(authUser)) {
      if (customer.createdById && customer.createdById !== authUser.userId) {
        throw AppError.forbidden('You do not have permission to view equipment for this customer');
      }
    }

    return this.repo.findByCustomerId(customerId);
  }

  async getServiceHistory(id: string) {
    await this.getEquipmentById(id);
    return this.repo.getServiceHistory(id);
  }

  async getAmcHistory(id: string) {
    await this.getEquipmentById(id);
    return this.repo.getAmcHistory(id);
  }

  async updateEquipment(id: string, input: UpdateCustomerEquipmentInput, user: any) {
    const existing = await this.getEquipmentById(id);

    return this.repo.update(id, input);
  }

  async manualCreateEquipment(input: ManualCreateCustomerEquipmentInput, user: any) {
    // 1. Verify customer exists
    const [customer] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (!customer) {
      throw AppError.notFound(`Customer with ID "${input.customerId}" not found`, 'CUSTOMER_NOT_FOUND');
    }

    // 2. Verify product exists
    const [product] = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!product) {
      throw AppError.notFound(`Product with ID "${input.productId}" not found`, 'PRODUCT_NOT_FOUND');
    }

    // 3. Generate sequential asset number atomically
    const deliveryDate = input.deliveryDate ? new Date(input.deliveryDate) : new Date();
    const assetNumber = await this.numberService.generateAssetNumber(deliveryDate);

    // 4. Create customer equipment record
    const created = await this.repo.create({
      assetNumber,
      customerId: input.customerId,
      productId: input.productId,
      unitIndex: 1,
      serialNumber: input.serialNumber || null,
      productName: input.productName,
      sku: input.sku || null,
      model: input.model || null,
      make: input.make || null,
      capacityRating: input.capacityRating || null,
      hsnSac: input.hsnSac || null,
      destinationId: input.destinationId || null,
      installationLocation: input.installationLocation || null,
      installationNotes: input.installationNotes || null,
      installationDate: input.installationDate ? new Date(input.installationDate) : null,
      deliveryDate,
      conditionStatus: input.conditionStatus,
      assetStatus: input.assetStatus,
      createdById: user.userId || user.id,
      updatedById: user.userId || user.id,
    } as any);

    return created;
  }
}
