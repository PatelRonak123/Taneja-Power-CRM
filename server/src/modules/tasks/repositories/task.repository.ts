import { eq, ilike, or, and, count, desc, sql, aliasedTable, gte, lte } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { tasks, TaskEntity, NewTaskEntity } from '../../../database/schema/tasks.js';
import { customers, customerDestinations, CustomerEntity, CustomerDestinationEntity } from '../../../database/schema/customers.js';
import { users } from '../../../database/schema/users.js';

export interface TaskFilterOptions {
  search?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  customerId?: string;
  scheduledDate?: string;
  page?: number;
  limit?: number;
}

export interface TaskUserSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  avatarUrl?: string | null;
  status?: string | null;
}

export interface TaskWithDetails extends TaskEntity {
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
    status: string;
  } | null;
  destination: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    latitude: string | null;
    longitude: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
    status: string;
  } | null;
  assignedUser: TaskUserSummary | null;
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface TaskMetricsDto {
  total: number;
  created: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

const assignedUsers = aliasedTable(users, 'assigned_users');
const createdByUsers = aliasedTable(users, 'created_by_users');

export class TaskRepository {
  async findAll(
    options: TaskFilterOptions = {}
  ): Promise<{ data: TaskWithDetails[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (options.status && options.status.trim() !== '' && options.status.trim() !== 'ALL') {
      conditions.push(eq(tasks.status, options.status.trim()));
    }

    if (options.priority && options.priority.trim() !== '' && options.priority.trim() !== 'ALL') {
      conditions.push(eq(tasks.priority, options.priority.trim()));
    }

    if (options.assignedTo && options.assignedTo.trim() !== '' && options.assignedTo.trim() !== 'ALL') {
      conditions.push(eq(tasks.assignedTo, options.assignedTo.trim()));
    }

    if (options.customerId && options.customerId.trim() !== '' && options.customerId.trim() !== 'ALL') {
      conditions.push(eq(tasks.customerId, options.customerId.trim()));
    }

    if (options.scheduledDate && options.scheduledDate.trim() !== '') {
      const dateStr = options.scheduledDate.trim();
      const startDate = new Date(`${dateStr}T00:00:00.000Z`);
      const endDate = new Date(`${dateStr}T23:59:59.999Z`);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        conditions.push(
          and(
            gte(tasks.scheduledAt, startDate),
            lte(tasks.scheduledAt, endDate)
          )
        );
      }
    }

    if (options.search && options.search.trim() !== '') {
      const searchPattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(tasks.title, searchPattern),
          ilike(tasks.description, searchPattern),
          ilike(customers.name, searchPattern),
          ilike(customers.companyName, searchPattern),
          ilike(customerDestinations.name, searchPattern),
          ilike(assignedUsers.fullName, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count query
    const [countResult] = await db
      .select({ value: count() })
      .from(tasks)
      .leftJoin(customers, eq(tasks.customerId, customers.id))
      .leftJoin(customerDestinations, eq(tasks.destinationId, customerDestinations.id))
      .leftJoin(assignedUsers, eq(tasks.assignedTo, assignedUsers.id))
      .where(whereClause);

    const total = Number(countResult?.value || 0);

    // List records query
    const rows = await db
      .select({
        task: tasks,
        customer: {
          id: customers.id,
          name: customers.name,
          companyName: customers.companyName,
          phone: customers.phone,
          email: customers.email,
          status: customers.status,
        },
        destination: {
          id: customerDestinations.id,
          name: customerDestinations.name,
          address: customerDestinations.address,
          city: customerDestinations.city,
          state: customerDestinations.state,
          pincode: customerDestinations.pincode,
          latitude: customerDestinations.latitude,
          longitude: customerDestinations.longitude,
          contactPerson: customerDestinations.contactPerson,
          contactPhone: customerDestinations.contactPhone,
          status: customerDestinations.status,
        },
        assignedUser: {
          id: assignedUsers.id,
          fullName: assignedUsers.fullName,
          email: assignedUsers.email,
          phone: assignedUsers.phone,
          designation: assignedUsers.designation,
          avatarUrl: assignedUsers.avatarUrl,
          status: assignedUsers.status,
        },
        createdByUser: {
          id: createdByUsers.id,
          fullName: createdByUsers.fullName,
          email: createdByUsers.email,
        },
      })
      .from(tasks)
      .leftJoin(customers, eq(tasks.customerId, customers.id))
      .leftJoin(customerDestinations, eq(tasks.destinationId, customerDestinations.id))
      .leftJoin(assignedUsers, eq(tasks.assignedTo, assignedUsers.id))
      .leftJoin(createdByUsers, eq(tasks.createdBy, createdByUsers.id))
      .where(whereClause)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    const data: TaskWithDetails[] = rows.map((r) => ({
      ...r.task,
      customer: r.customer?.id ? r.customer : null,
      destination: r.destination?.id ? r.destination : null,
      assignedUser: r.assignedUser?.id ? r.assignedUser : null,
      createdByUser: r.createdByUser?.id ? r.createdByUser : null,
    }));

    return { data, total };
  }

  async findById(id: string): Promise<TaskWithDetails | undefined> {
    const rows = await db
      .select({
        task: tasks,
        customer: {
          id: customers.id,
          name: customers.name,
          companyName: customers.companyName,
          phone: customers.phone,
          email: customers.email,
          status: customers.status,
        },
        destination: {
          id: customerDestinations.id,
          name: customerDestinations.name,
          address: customerDestinations.address,
          city: customerDestinations.city,
          state: customerDestinations.state,
          pincode: customerDestinations.pincode,
          latitude: customerDestinations.latitude,
          longitude: customerDestinations.longitude,
          contactPerson: customerDestinations.contactPerson,
          contactPhone: customerDestinations.contactPhone,
          status: customerDestinations.status,
        },
        assignedUser: {
          id: assignedUsers.id,
          fullName: assignedUsers.fullName,
          email: assignedUsers.email,
          phone: assignedUsers.phone,
          designation: assignedUsers.designation,
          avatarUrl: assignedUsers.avatarUrl,
          status: assignedUsers.status,
        },
        createdByUser: {
          id: createdByUsers.id,
          fullName: createdByUsers.fullName,
          email: createdByUsers.email,
        },
      })
      .from(tasks)
      .leftJoin(customers, eq(tasks.customerId, customers.id))
      .leftJoin(customerDestinations, eq(tasks.destinationId, customerDestinations.id))
      .leftJoin(assignedUsers, eq(tasks.assignedTo, assignedUsers.id))
      .leftJoin(createdByUsers, eq(tasks.createdBy, createdByUsers.id))
      .where(eq(tasks.id, id))
      .limit(1);

    if (!rows[0]) return undefined;

    const r = rows[0];
    return {
      ...r.task,
      customer: r.customer?.id ? r.customer : null,
      destination: r.destination?.id ? r.destination : null,
      assignedUser: r.assignedUser?.id ? r.assignedUser : null,
      createdByUser: r.createdByUser?.id ? r.createdByUser : null,
    };
  }

  async create(data: NewTaskEntity): Promise<TaskEntity> {
    const result = await db.insert(tasks).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewTaskEntity>): Promise<TaskEntity | undefined> {
    const result = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  async getMetrics(): Promise<TaskMetricsDto> {
    const [totalRes] = await db.select({ value: count() }).from(tasks);
    const [createdRes] = await db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.status, 'CREATED'));
    const [assignedRes] = await db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.status, 'ASSIGNED'));
    const [inProgressRes] = await db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.status, 'IN_PROGRESS'));
    const [completedRes] = await db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.status, 'COMPLETED'));
    const [cancelledRes] = await db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.status, 'CANCELLED'));

    return {
      total: Number(totalRes?.value || 0),
      created: Number(createdRes?.value || 0),
      assigned: Number(assignedRes?.value || 0),
      inProgress: Number(inProgressRes?.value || 0),
      completed: Number(completedRes?.value || 0),
      cancelled: Number(cancelledRes?.value || 0),
    };
  }
}
