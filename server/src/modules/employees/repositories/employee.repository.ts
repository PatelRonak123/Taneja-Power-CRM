import { eq, ilike, or, and, count, desc } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { users, UserEntity, NewUserEntity } from '../../../database/schema/users.js';

export interface EmployeeFilterOptions {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export class EmployeeRepository {
  async findAll(options: EmployeeFilterOptions = {}): Promise<{ data: UserEntity[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (options.role && options.role.trim() !== '') {
      conditions.push(eq(users.role, options.role.trim()));
    }

    if (options.search && options.search.trim() !== '') {
      const searchPattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(users.fullName, searchPattern),
          ilike(users.email, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ value: count() })
      .from(users)
      .where(whereClause);

    const total = Number(countResult[0]?.value || 0);

    return { data, total };
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async create(employee: NewUserEntity): Promise<UserEntity> {
    const result = await db.insert(users).values(employee).returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
}
