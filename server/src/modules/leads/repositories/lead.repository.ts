import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { leads, leadActivityLogs, NewLeadEntity } from '../../../database/schema/leads.js';
import { customers } from '../../../database/schema/customers.js';
import { users } from '../../../database/schema/users.js';
import { JwtPayload } from '../../../common/auth/jwt.js';
import { AppError } from '../../../common/errors/AppError.js';
import crypto from 'crypto';

export class LeadRepository {
  private async ensureSchema() {
    try {
      await db.execute(sql`
        DO $$ 
        BEGIN 
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'id' AND data_type = 'uuid'
          ) THEN
            ALTER TABLE lead_activity_logs DROP CONSTRAINT IF EXISTS lead_activity_logs_lead_id_leads_id_fk;
            ALTER TABLE leads ALTER COLUMN id TYPE varchar(255);
            ALTER TABLE lead_activity_logs ALTER COLUMN id TYPE varchar(255);
            ALTER TABLE lead_activity_logs ALTER COLUMN lead_id TYPE varchar(255);
            ALTER TABLE lead_activity_logs ADD CONSTRAINT lead_activity_logs_lead_id_leads_id_fk FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'assigned_employee_id'
          ) THEN
            ALTER TABLE leads ADD COLUMN assigned_employee_id varchar(255);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'created_by'
          ) THEN
            ALTER TABLE leads ADD COLUMN created_by varchar(255);
            ALTER TABLE leads ADD COLUMN created_by_id varchar(255);
          END IF;
        END $$;
      `);
    } catch (err) {
      console.warn('Lead ensureSchema warning:', err);
    }
  }

  async findAll(
    filters: { search?: string; status?: string; priority?: string; assignee?: string },
    user?: JwtPayload
  ) {
    await this.ensureSchema();

    const conditions = [];

    // Server-side Ownership Scoping for Sales Employees (USER / SALES)
    const isSalesRole =
      user &&
      user.role !== 'ADMIN' &&
      user.role !== 'MANAGER' &&
      user.designation !== 'Accountant Office';
    if (isSalesRole && user) {
      const [currentUser] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, user.userId))
        .limit(1);

      const userFullName = currentUser?.fullName;

      const scopeConditions = [
        eq(leads.assignedEmployeeId, user.userId),
        ilike(leads.assignedExecutive, `%${user.userId}%`),
      ];

      if (userFullName) {
        scopeConditions.push(ilike(leads.assignedExecutive, `%${userFullName}%`));
      }

      conditions.push(or(...scopeConditions));
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(leads.customerName, `%${filters.search}%`),
          ilike(leads.companyName, `%${filters.search}%`),
          ilike(leads.productInterested, `%${filters.search}%`),
          ilike(leads.leadCode, `%${filters.search}%`)
        )
      );
    }

    if (filters.status && filters.status !== 'ALL') {
      conditions.push(eq(leads.status, filters.status));
    }

    if (filters.priority && filters.priority !== 'ALL') {
      conditions.push(eq(leads.priority, filters.priority));
    }

    if (!isSalesRole && filters.assignee && filters.assignee !== 'ALL') {
      conditions.push(eq(leads.assignedExecutive, filters.assignee));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const leadRecords = await db
      .select()
      .from(leads)
      .where(whereClause)
      .orderBy(desc(leads.createdAt));

    const result = await Promise.all(
      leadRecords.map(async (lead) => {
        const logs = await db
          .select()
          .from(leadActivityLogs)
          .where(eq(leadActivityLogs.leadId, lead.id))
          .orderBy(desc(leadActivityLogs.createdAt));

        return {
          id: lead.id,
          leadCode: lead.leadCode,
          customerName: lead.customerName,
          companyName: lead.companyName,
          email: lead.email || '',
          phone: lead.phone || '',
          address: lead.address || '',
          productInterested: lead.productInterested || '',
          expectedValue: Number(lead.expectedValue) || 0,
          assignedExecutive: lead.assignedExecutive || 'Unassigned',
          assignedEmployeeId: lead.assignedEmployeeId || undefined,
          createdBy: lead.createdBy || 'System Admin',
          createdById: lead.createdById || undefined,
          priority: lead.priority,
          status: lead.status,
          source: lead.source,
          linkedClientId: lead.linkedClientId || undefined,
          activityLogs: logs.map((l) => ({
            id: l.id,
            title: l.title,
            date: l.date || new Date(l.createdAt).toISOString().split('T')[0],
            type: l.type || 'System',
          })),
        };
      })
    );

    return result;
  }

  async findById(id: string, user?: JwtPayload) {
    await this.ensureSchema();
    const [leadRecord] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!leadRecord) return null;

    // Ownership check for Sales role
    const isSalesRole =
      user &&
      user.role !== 'ADMIN' &&
      user.role !== 'MANAGER' &&
      user.designation !== 'Accountant Office';
    if (isSalesRole && user) {
      const [currentUser] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, user.userId))
        .limit(1);

      const userFullName = currentUser?.fullName;

      const isOwner =
        leadRecord.assignedEmployeeId === user.userId ||
        (leadRecord.assignedExecutive &&
          (leadRecord.assignedExecutive.includes(user.userId) ||
            (userFullName && leadRecord.assignedExecutive.toLowerCase().includes(userFullName.toLowerCase()))));
      if (!isOwner) {
        return null;
      }
    }

    const logs = await db
      .select()
      .from(leadActivityLogs)
      .where(eq(leadActivityLogs.leadId, leadRecord.id))
      .orderBy(desc(leadActivityLogs.createdAt));

    return {
      id: leadRecord.id,
      leadCode: leadRecord.leadCode,
      customerName: leadRecord.customerName,
      companyName: leadRecord.companyName,
      email: leadRecord.email || '',
      phone: leadRecord.phone || '',
      address: leadRecord.address || '',
      productInterested: leadRecord.productInterested || '',
      expectedValue: Number(leadRecord.expectedValue) || 0,
      assignedExecutive: leadRecord.assignedExecutive || 'Unassigned',
      assignedEmployeeId: leadRecord.assignedEmployeeId || undefined,
      createdBy: leadRecord.createdBy || 'System Admin',
      createdById: leadRecord.createdById || undefined,
      priority: leadRecord.priority,
      status: leadRecord.status,
      source: leadRecord.source,
      linkedClientId: leadRecord.linkedClientId || undefined,
      activityLogs: logs.map((l) => ({
        id: l.id,
        title: l.title,
        date: l.date || new Date(l.createdAt).toISOString().split('T')[0],
        type: l.type || 'System',
      })),
    };
  }

  private async ensureCustomerForLead(data: {
    customerName: string;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    linkedClientId?: string | null;
  }): Promise<string | undefined> {
    try {
      // 1. If linkedClientId is passed, verify customer exists
      if (data.linkedClientId && data.linkedClientId.trim() !== '') {
        const [existing] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, data.linkedClientId.trim()))
          .limit(1);
        if (existing) {
          await db
            .update(customers)
            .set({
              name: data.customerName || existing.name,
              companyName: data.companyName || existing.companyName,
              phone: data.phone || existing.phone,
              email: data.email || existing.email,
              address: data.address || existing.address,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, existing.id));
          return existing.id;
        }
      }

      // 2. Try matching by email, phone, or name & companyName
      const matchConditions = [];
      if (data.email && data.email.trim() !== '') {
        matchConditions.push(eq(customers.email, data.email.trim()));
      }
      if (data.phone && data.phone.trim() !== '') {
        matchConditions.push(eq(customers.phone, data.phone.trim()));
      }
      if (data.customerName && data.customerName.trim() !== '') {
        if (data.companyName && data.companyName.trim() !== '') {
          matchConditions.push(
            and(
              ilike(customers.name, data.customerName.trim()),
              ilike(customers.companyName, data.companyName.trim())
            )
          );
        } else {
          matchConditions.push(ilike(customers.name, data.customerName.trim()));
        }
      }

      if (matchConditions.length > 0) {
        const [found] = await db
          .select()
          .from(customers)
          .where(or(...matchConditions))
          .limit(1);

        if (found) {
          await db
            .update(customers)
            .set({
              name: data.customerName || found.name,
              companyName: data.companyName || found.companyName,
              phone: data.phone || found.phone,
              email: data.email || found.email,
              address: data.address || found.address,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, found.id));
          return found.id;
        }
      }

      // 3. If no matching customer found, create a new Customer entry in customers table
      if (data.customerName && data.customerName.trim() !== '') {
        const [newCustomer] = await db
          .insert(customers)
          .values({
            name: data.customerName.trim(),
            companyName: data.companyName ? data.companyName.trim() : data.customerName.trim(),
            email: data.email ? data.email.trim() : null,
            phone: data.phone ? data.phone.trim() : null,
            address: data.address ? data.address.trim() : null,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return newCustomer.id;
      }
    } catch (err) {
      console.warn('ensureCustomerForLead warning:', err);
    }
    return data.linkedClientId || undefined;
  }

  async create(data: NewLeadEntity, user?: JwtPayload) {
    if (user?.designation === 'Accountant Office') {
      throw AppError.forbidden('Accountant Office is not permitted to create leads');
    }

    const newId = data.id || `lead-${crypto.randomUUID()}`;
    const newCode = data.leadCode || `lead-${Math.floor(100 + Math.random() * 900)}`;

    const isSalesRole = user && user.role !== 'ADMIN' && user.role !== 'MANAGER';
    const assignedEmployeeId = isSalesRole && user ? user.userId : data.assignedEmployeeId;

    let creatorName = data.createdBy;
    if (!creatorName && user?.userId) {
      const [creatorUser] = await db
        .select({ fullName: users.fullName, role: users.role })
        .from(users)
        .where(eq(users.id, user.userId))
        .limit(1);

      if (creatorUser) {
        const roleTag =
          creatorUser.role === 'ADMIN'
            ? ' (Admin)'
            : creatorUser.role === 'MANAGER'
            ? ' (Manager)'
            : '';
        creatorName = `${creatorUser.fullName}${roleTag}`;
      }
    }

    const linkedClientId = await this.ensureCustomerForLead({
      customerName: data.customerName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      linkedClientId: data.linkedClientId,
    });

    const [created] = await db
      .insert(leads)
      .values({
        ...data,
        id: newId,
        leadCode: newCode,
        assignedEmployeeId,
        linkedClientId: linkedClientId || data.linkedClientId,
        createdBy: creatorName || 'System Admin',
        createdById: user?.userId || data.createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(leadActivityLogs).values({
      id: `act-${created.id}-${Date.now()}`,
      leadId: created.id,
      title: 'Lead Created in System',
      date: new Date().toISOString().split('T')[0],
      type: 'System',
    });

    return this.findById(created.id, user);
  }

  async update(id: string, data: Partial<NewLeadEntity>, user?: JwtPayload) {
    if (user?.designation === 'Accountant Office') {
      throw AppError.forbidden('Accountant Office is not permitted to update leads');
    }

    await this.ensureSchema();
    const existingLead = await this.findById(id, user);

    const isSalesRole = user && user.role !== 'ADMIN' && user.role !== 'MANAGER';
    if (isSalesRole && !existingLead) {
      throw AppError.forbidden('Access denied: You can only update leads assigned to you');
    }

    const payload = { ...data };
    if (isSalesRole) {
      delete payload.assignedEmployeeId;
      delete payload.assignedExecutive;
    }

    const linkedClientId = await this.ensureCustomerForLead({
      customerName: payload.customerName || existingLead?.customerName || '',
      companyName: payload.companyName || existingLead?.companyName,
      email: payload.email || existingLead?.email,
      phone: payload.phone || existingLead?.phone,
      address: payload.address || existingLead?.address,
      linkedClientId: payload.linkedClientId || existingLead?.linkedClientId,
    });

    const existing = await db.select().from(leads).where(eq(leads.id, id)).limit(1);

    if (existing.length === 0) {
      const newCode = payload.leadCode || `lead-${Math.floor(100 + Math.random() * 900)}`;
      await db.insert(leads).values({
        id,
        leadCode: newCode,
        customerName: payload.customerName || 'New Client',
        companyName: payload.companyName || 'Company',
        email: payload.email || '',
        phone: payload.phone || '',
        address: payload.address || '',
        productInterested: payload.productInterested || 'Equipment',
        expectedValue: payload.expectedValue || '0',
        assignedExecutive: payload.assignedExecutive || 'Unassigned',
        assignedEmployeeId: user?.userId,
        priority: payload.priority || 'Medium',
        status: payload.status || 'New',
        source: payload.source || 'Web',
        linkedClientId: linkedClientId || payload.linkedClientId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(leads)
        .set({
          ...payload,
          linkedClientId: linkedClientId || payload.linkedClientId,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, id));
    }

    await db.insert(leadActivityLogs).values({
      id: `act-${id}-${Date.now()}`,
      leadId: id,
      title: `Lead status updated to ${payload.status || 'modified'}`,
      date: new Date().toISOString().split('T')[0],
      type: 'System',
    });

    return this.findById(id, user);
  }

  async getPipelineData(user?: JwtPayload) {
    const allLeads = await this.findAll({}, user);

    const STAGES = [
      { id: 'NEW LEADS', title: 'NEW LEADS', statusKeys: ['NEW', 'NEW LEADS'] },
      { id: 'CONTACTED', title: 'CONTACTED', statusKeys: ['CONTACTED'] },
      { id: 'MEETING SCHEDULED', title: 'MEETING SCHEDULED', statusKeys: ['MEETING SCHEDULED'] },
      { id: 'QUOTATION SENT', title: 'QUOTATION SENT', statusKeys: ['QUOTATION SENT', 'PROPOSAL SENT'] },
      { id: 'NEGOTIATION', title: 'NEGOTIATION', statusKeys: ['NEGOTIATION'] },
      { id: 'APPROVED/PO', title: 'APPROVED/PO', statusKeys: ['APPROVED/PO', 'APPROVED'] },
      { id: 'INSTALLATION', title: 'INSTALLATION', statusKeys: ['INSTALLATION'] },
      { id: 'AMC SUPPORT', title: 'AMC SUPPORT', statusKeys: ['AMC SUPPORT'] },
      { id: 'COMPLETED', title: 'COMPLETED', statusKeys: ['COMPLETED'] },
    ];

    return STAGES.map((stage) => {
      const deals = allLeads.filter((l) =>
        stage.statusKeys.includes(l.status.toUpperCase())
      );

      const totalValueRaw = deals.reduce((sum, d) => sum + (d.expectedValue || 0), 0);
      const totalValueLakhs = (totalValueRaw / 100000).toFixed(1);

      return {
        stageId: stage.id,
        stageTitle: stage.title,
        dealCount: deals.length,
        totalValueRaw,
        totalValueFormatted: `₹${totalValueLakhs}L`,
        deals,
      };
    });
  }

  async delete(id: string, user?: JwtPayload) {
    const isSalesRole = user && user.role !== 'ADMIN' && user.role !== 'MANAGER';
    if (isSalesRole) {
      throw AppError.forbidden('You do not have permission to delete lead records');
    }
    await db.delete(leads).where(eq(leads.id, id));
    return true;
  }

  async addActivityLog(id: string, activity: { title: string; type?: string }, user?: JwtPayload) {
    const lead = await this.findById(id, user);
    if (!lead) {
      throw AppError.forbidden('Access denied: Cannot add activity to this lead');
    }
    await db.insert(leadActivityLogs).values({
      id: `act-${id}-${Date.now()}`,
      leadId: id,
      title: activity.title,
      date: new Date().toISOString().split('T')[0],
      type: activity.type || 'User',
    });
    return this.findById(id, user);
  }
}
