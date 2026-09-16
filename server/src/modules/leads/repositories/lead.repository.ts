import { eq, ilike, or, and, desc } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { leads, leadActivityLogs, LeadEntity, NewLeadEntity } from '../../../database/schema/leads.js';

export class LeadRepository {
  async findAll(filters: { search?: string; status?: string; priority?: string; assignee?: string }) {
    const conditions = [];

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

    if (filters.assignee && filters.assignee !== 'ALL') {
      conditions.push(eq(leads.assignedExecutive, filters.assignee));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const leadRecords = await db
      .select()
      .from(leads)
      .where(whereClause)
      .orderBy(desc(leads.createdAt));

    // Fetch activity logs for each lead
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

  async findById(id: string) {
    const [leadRecord] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!leadRecord) return null;

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

  async create(data: NewLeadEntity) {
    const [created] = await db.insert(leads).values(data).returning();
    
    // Add default creation activity log
    await db.insert(leadActivityLogs).values({
      leadId: created.id,
      title: 'Lead Created in System',
      date: new Date().toISOString().split('T')[0],
      type: 'System',
    });

    return this.findById(created.id);
  }

  async update(id: string, data: Partial<NewLeadEntity>) {
    await db
      .update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leads.id, id));

    // Log update activity
    await db.insert(leadActivityLogs).values({
      leadId: id,
      title: 'Lead Details Updated',
      date: new Date().toISOString().split('T')[0],
      type: 'System',
    });

    return this.findById(id);
  }

  async delete(id: string) {
    await db.delete(leads).where(eq(leads.id, id));
    return true;
  }
}
