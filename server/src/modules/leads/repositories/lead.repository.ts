import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { leads, leadActivityLogs, NewLeadEntity } from '../../../database/schema/leads.js';
import crypto from 'crypto';

const INITIAL_SEED_LEADS = [
  {
    id: 'lead-4',
    leadCode: 'LEAD-104',
    customerName: 'Ananya Verma',
    companyName: 'L&T Electrical',
    email: 'ananya.v@lntelectrical.com',
    phone: '+91 97411 88203',
    address: 'Gate 5, Powai Campus, Mumbai, Maharashtra',
    productInterested: 'Industrial Switchgear Panel',
    expectedValue: '18500',
    assignedExecutive: 'Nilesh Mehta',
    priority: 'Medium',
    status: 'New',
    source: 'Exhibition',
  },
  {
    id: 'lead-2',
    leadCode: 'LEAD-102',
    customerName: 'Aditya Roy',
    companyName: 'Finolex Cables',
    email: 'aditya.roy@finolex.com',
    phone: '+91 98230 11492',
    address: 'Plot 45, Pimpri Industrial Zone, Pune, Maharashtra',
    productInterested: 'Winding Temperature Indicator (WTI)',
    expectedValue: '6500',
    assignedExecutive: 'Amit Patel',
    priority: 'Low',
    status: 'Meeting Scheduled',
    source: 'Web',
  },
  {
    id: 'lead-1',
    leadCode: 'LEAD-101',
    customerName: 'Rajesh Sharma',
    companyName: 'Siemens Energy',
    email: 'r.sharma@siemens-energy.com',
    phone: '+91 91102 54311',
    address: 'B-12 Technopark, Whitefield, Bengaluru, Karnataka',
    productInterested: '100 KVA Power Transformer',
    expectedValue: '45000',
    assignedExecutive: 'Rahul Shah (Admin)',
    priority: 'High',
    status: 'Proposal Sent',
    source: 'Referral',
  },
  {
    id: 'lead-3',
    leadCode: 'LEAD-103',
    customerName: 'Divya Dutta',
    companyName: 'CG Power',
    email: 'divya.dutta@cgpower.in',
    phone: '+91 96963 38224',
    address: '231, MIDC Industrial Area, Phase 1, Pune, Maharashtra',
    productInterested: 'Magnetic Oil Level Gauge (MOG)',
    expectedValue: '9000',
    assignedExecutive: 'Nilesh Mehta',
    priority: 'Low',
    status: 'Approved',
    source: 'Web',
    linkedClientId: 'CL-8092',
  },
  {
    id: 'deal-101',
    leadCode: 'DEAL-101',
    customerName: 'Arjun Rampal',
    companyName: 'ABB India',
    email: 'arjun.r@abb.com',
    phone: '+91 98110 22334',
    address: 'Peenya Industrial Area, Bengaluru',
    productInterested: 'Vacuum Circuit Breaker (VCB)',
    expectedValue: '6630000',
    assignedExecutive: 'Nilesh Mehta',
    priority: 'Low',
    status: 'Negotiation',
    source: 'Web',
  },
  {
    id: 'deal-102',
    leadCode: 'DEAL-102',
    customerName: 'Rajesh Rao',
    companyName: 'Reliance Industries',
    email: 'rajesh.rao@ril.com',
    phone: '+91 99001 55443',
    address: 'Jamnagar Refinery Complex, Gujarat',
    productInterested: '500 KVA Power Transformer',
    expectedValue: '7820000',
    assignedExecutive: 'Amit Patel',
    priority: 'High',
    status: 'Approved',
    source: 'Direct',
  },
  {
    id: 'deal-103',
    leadCode: 'DEAL-103',
    customerName: 'Siddharth Malhotra',
    companyName: 'Divis Laboratories',
    email: 'siddharth@divislabs.com',
    phone: '+91 97000 88776',
    address: 'Cyberabad, Hyderabad, Telangana',
    productInterested: 'Automatic Transfer Switch 400A',
    expectedValue: '8830000',
    assignedExecutive: 'Rahul Shah (Admin)',
    priority: 'Low',
    status: 'Completed',
    source: 'Referral',
  },
];

export class LeadRepository {
  private async autoSeedIfEmpty() {
    try {
      // 1. Convert PostgreSQL column type for "id" to varchar(255) if previously created as uuid
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
        END $$;
      `);

      // 2. Auto-seed initial leads if table is empty
      const existing = await db.select().from(leads).limit(1);
      if (existing.length === 0) {
        for (const item of INITIAL_SEED_LEADS) {
          await db.insert(leads).values({
            ...item,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).onConflictDoNothing();

          await db.insert(leadActivityLogs).values({
            id: `act-${item.id}-init`,
            leadId: item.id,
            title: 'Lead Initialized in System',
            date: new Date().toISOString().split('T')[0],
            type: 'System',
          }).onConflictDoNothing();
        }
      }
    } catch (err) {
      console.warn('Lead autoSeedIfEmpty warning:', err);
    }
  }

  async findAll(filters: { search?: string; status?: string; priority?: string; assignee?: string }) {
    await this.autoSeedIfEmpty();

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
    await this.autoSeedIfEmpty();
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
    const newId = data.id || `lead-${crypto.randomUUID()}`;
    const newCode = data.leadCode || `lead-${Math.floor(100 + Math.random() * 900)}`;

    const [created] = await db
      .insert(leads)
      .values({
        ...data,
        id: newId,
        leadCode: newCode,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Add default creation activity log
    await db.insert(leadActivityLogs).values({
      id: `act-${created.id}-${Date.now()}`,
      leadId: created.id,
      title: 'Lead Created in System',
      date: new Date().toISOString().split('T')[0],
      type: 'System',
    });

    return this.findById(created.id);
  }

  async update(id: string, data: Partial<NewLeadEntity>) {
    await this.autoSeedIfEmpty();
    const existing = await db.select().from(leads).where(eq(leads.id, id)).limit(1);

    if (existing.length === 0) {
      // Upsert: Create lead record if missing
      const newCode = data.leadCode || `lead-${Math.floor(100 + Math.random() * 900)}`;
      await db.insert(leads).values({
        id,
        leadCode: newCode,
        customerName: data.customerName || 'New Client',
        companyName: data.companyName || 'Company',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        productInterested: data.productInterested || 'Equipment',
        expectedValue: data.expectedValue || '0',
        assignedExecutive: data.assignedExecutive || 'Nilesh Mehta',
        priority: data.priority || 'Medium',
        status: data.status || 'New',
        source: data.source || 'Web',
        linkedClientId: data.linkedClientId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(leads)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(leads.id, id));
    }

    // Log update activity
    await db.insert(leadActivityLogs).values({
      id: `act-${id}-${Date.now()}`,
      leadId: id,
      title: `Lead status updated to ${data.status || 'modified'}`,
      date: new Date().toISOString().split('T')[0],
      type: 'System',
    });

    return this.findById(id);
  }

  async getPipelineData() {
    const allLeads = await this.findAll({});

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

  async delete(id: string) {
    await db.delete(leads).where(eq(leads.id, id));
    return true;
  }
}
