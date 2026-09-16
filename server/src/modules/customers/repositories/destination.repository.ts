import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  customerDestinations,
  CustomerDestinationEntity,
  NewCustomerDestinationEntity,
} from '../../../database/schema/customers.js';

export class DestinationRepository {
  async findByCustomerId(customerId: string): Promise<CustomerDestinationEntity[]> {
    return db
      .select()
      .from(customerDestinations)
      .where(eq(customerDestinations.customerId, customerId))
      .orderBy(desc(customerDestinations.createdAt));
  }

  async findByIdAndCustomerId(
    id: string,
    customerId: string
  ): Promise<CustomerDestinationEntity | undefined> {
    const result = await db
      .select()
      .from(customerDestinations)
      .where(
        and(
          eq(customerDestinations.id, id),
          eq(customerDestinations.customerId, customerId)
        )
      )
      .limit(1);

    return result[0];
  }

  async findById(id: string): Promise<CustomerDestinationEntity | undefined> {
    const result = await db
      .select()
      .from(customerDestinations)
      .where(eq(customerDestinations.id, id))
      .limit(1);

    return result[0];
  }

  async create(data: NewCustomerDestinationEntity): Promise<CustomerDestinationEntity> {
    const result = await db.insert(customerDestinations).values(data).returning();
    return result[0];
  }

  async update(
    id: string,
    data: Partial<NewCustomerDestinationEntity>
  ): Promise<CustomerDestinationEntity | undefined> {
    const result = await db
      .update(customerDestinations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerDestinations.id, id))
      .returning();

    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(customerDestinations)
      .where(eq(customerDestinations.id, id))
      .returning();

    return result.length > 0;
  }
}
