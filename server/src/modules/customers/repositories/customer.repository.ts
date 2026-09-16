import { eq, ilike, or, and, count, desc, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  customers,
  customerDestinations,
  CustomerEntity,
  NewCustomerEntity,
  CustomerDestinationEntity,
} from '../../../database/schema/customers.js';

export interface CustomerFilterOptions {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CustomerWithDestinations extends CustomerEntity {
  destinations?: CustomerDestinationEntity[];
  destinationCount?: number;
}

export interface CustomerMetricsDto {
  total: number;
  active: number;
  inactive: number;
  totalDestinations: number;
}

export class CustomerRepository {
  async findAll(
    options: CustomerFilterOptions = {}
  ): Promise<{ data: (CustomerEntity & { destinationCount: number })[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (options.status && options.status.trim() !== '' && options.status.trim() !== 'ALL') {
      conditions.push(eq(customers.status, options.status.trim()));
    }

    if (options.search && options.search.trim() !== '') {
      const searchPattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(customers.name, searchPattern),
          ilike(customers.companyName, searchPattern),
          ilike(customers.phone, searchPattern),
          ilike(customers.email, searchPattern),
          ilike(customers.city, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalCountResult] = await db
      .select({ value: count() })
      .from(customers)
      .where(whereClause);

    const total = Number(totalCountResult?.value || 0);

    const customerRows = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch destination counts for loaded page
    const customerIds = customerRows.map((c) => c.id);
    const countMap = new Map<string, number>();

    if (customerIds.length > 0) {
      const destCounts = await db
        .select({
          customerId: customerDestinations.customerId,
          count: count(),
        })
        .from(customerDestinations)
        .where(
          sql`${customerDestinations.customerId} IN (${sql.join(
            customerIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
        .groupBy(customerDestinations.customerId);

      for (const row of destCounts) {
        countMap.set(row.customerId, Number(row.count || 0));
      }
    }

    const data = customerRows.map((c) => ({
      ...c,
      destinationCount: countMap.get(c.id) || 0,
    }));

    return { data, total };
  }

  async findById(id: string): Promise<CustomerEntity | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return result[0];
  }

  async findByIdWithDestinations(id: string): Promise<CustomerWithDestinations | undefined> {
    const customer = await this.findById(id);
    if (!customer) return undefined;

    const destinations = await db
      .select()
      .from(customerDestinations)
      .where(eq(customerDestinations.customerId, id))
      .orderBy(desc(customerDestinations.createdAt));

    return {
      ...customer,
      destinations,
      destinationCount: destinations.length,
    };
  }

  async create(data: NewCustomerEntity): Promise<CustomerEntity> {
    const result = await db.insert(customers).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewCustomerEntity>): Promise<CustomerEntity | undefined> {
    const result = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  async getMetrics(): Promise<CustomerMetricsDto> {
    const [totalRes] = await db.select({ value: count() }).from(customers);
    const [activeRes] = await db
      .select({ value: count() })
      .from(customers)
      .where(eq(customers.status, 'ACTIVE'));
    const [inactiveRes] = await db
      .select({ value: count() })
      .from(customers)
      .where(eq(customers.status, 'INACTIVE'));
    const [totalDestRes] = await db.select({ value: count() }).from(customerDestinations);

    return {
      total: Number(totalRes?.value || 0),
      active: Number(activeRes?.value || 0),
      inactive: Number(inactiveRes?.value || 0),
      totalDestinations: Number(totalDestRes?.value || 0),
    };
  }
}
