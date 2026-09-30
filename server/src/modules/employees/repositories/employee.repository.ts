import { eq, ilike, or, and, count, desc } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { users, UserEntity, NewUserEntity } from '../../../database/schema/users.js';

export interface EmployeeFilterOptions {
  search?: string;
  role?: string;
  status?: string;
  workType?: string;
  page?: number;
  limit?: number;
}

export interface EmployeeMetricsDto {
  total: number;
  admins: number;
  managers: number;
  users: number;
  active: number;
  inactive: number;
  office: number;
  field: number;
}

export class EmployeeRepository {
  async findAll(options: EmployeeFilterOptions = {}): Promise<{ data: UserEntity[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (options.role && options.role.trim() !== '' && options.role.trim() !== 'ALL') {
      conditions.push(eq(users.role, options.role.trim()));
    }

    if (options.status && options.status.trim() !== '' && options.status.trim() !== 'ALL') {
      conditions.push(eq(users.status, options.status.trim()));
    }

    if (options.workType && options.workType.trim() !== '' && options.workType.trim() !== 'ALL') {
      conditions.push(eq(users.workType, options.workType.trim()));
    }

    if (options.search && options.search.trim() !== '') {
      const searchPattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(users.fullName, searchPattern),
          ilike(users.email, searchPattern),
          ilike(users.phone, searchPattern)
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
    const trimmed = email.trim();
    const result = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, trimmed),
          ilike(users.email, trimmed),
          ilike(users.email, `%, ${trimmed}%`),
          ilike(users.email, `${trimmed},%`),
          ilike(users.email, `%,${trimmed}%`)
        )
      )
      .limit(1);
    return result[0];
  }

  async create(employee: NewUserEntity): Promise<UserEntity> {
    const result = await db.insert(users).values(employee).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewUserEntity>): Promise<UserEntity | undefined> {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getMetrics(): Promise<EmployeeMetricsDto> {
    const [totalRes] = await db.select({ value: count() }).from(users);
    const [adminRes] = await db.select({ value: count() }).from(users).where(eq(users.role, 'ADMIN'));
    const [managerRes] = await db.select({ value: count() }).from(users).where(eq(users.role, 'MANAGER'));
    const [userRes] = await db.select({ value: count() }).from(users).where(eq(users.role, 'USER'));
    const [activeRes] = await db.select({ value: count() }).from(users).where(eq(users.status, 'ACTIVE'));
    const [inactiveRes] = await db.select({ value: count() }).from(users).where(eq(users.status, 'INACTIVE'));
    const [officeRes] = await db.select({ value: count() }).from(users).where(eq(users.workType, 'OFFICE'));
    const [fieldRes] = await db.select({ value: count() }).from(users).where(eq(users.workType, 'FIELD'));

    return {
      total: Number(totalRes?.value || 0),
      admins: Number(adminRes?.value || 0),
      managers: Number(managerRes?.value || 0),
      users: Number(userRes?.value || 0),
      active: Number(activeRes?.value || 0),
      inactive: Number(inactiveRes?.value || 0),
      office: Number(officeRes?.value || 0),
      field: Number(fieldRes?.value || 0),
    };
  }
}
