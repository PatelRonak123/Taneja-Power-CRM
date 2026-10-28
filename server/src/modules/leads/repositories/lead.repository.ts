import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { leads, leadActivityLogs, leadDestinations, NewLeadEntity } from '../../../database/schema/leads.js';
import { customers, customerDestinations } from '../../../database/schema/customers.js';
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

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'lead_destinations'
          ) THEN
            CREATE TABLE lead_destinations (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              lead_id varchar(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
              name varchar(255) NOT NULL,
              address text,
              city varchar(100),
              state varchar(100),
              pincode varchar(20),
              latitude numeric(10, 7),
              longitude numeric(10, 7),
              place_id varchar(255),
              contact_person varchar(255),
              contact_phone varchar(50),
              notes text,
              status varchar(50) DEFAULT 'ACTIVE' NOT NULL,
              created_at timestamp with time zone DEFAULT now() NOT NULL,
              updated_at timestamp with time zone DEFAULT now() NOT NULL
            );
            CREATE INDEX IF NOT EXISTS lead_destinations_lead_id_idx ON lead_destinations(lead_id);
          END IF;

          UPDATE leads
          SET status = 'Contacted'
          WHERE linked_client_id IS NOT NULL
            AND UPPER(status) IN ('NEW', 'NEW LEADS', 'NEW_LEAD', 'NEW_LEADS');

          UPDATE leads
          SET status = 'Quotation Sent'
          WHERE UPPER(status) IN ('QUOTATION ACCEPTED', 'QUOTATION_ACCEPTED');
        END $$;
      `);
    } catch (err) {
      console.warn('Lead ensureSchema warning:', err);
    }
  }


  async resolveLeadPipelineStage(leadRecord: any, txOrDb: any = db): Promise<string> {
    try {
      if (!leadRecord) return 'New';

      const rawUpper = (leadRecord.status || '').toUpperCase();
      const isNew = rawUpper === 'NEW' || rawUpper === 'NEW LEADS' || rawUpper === 'NEW_LEAD' || rawUpper === 'NEW_LEADS' || !leadRecord.status;

      let clientId = leadRecord.linkedClientId;

      // If clientId is missing, attempt quick lookup by email or name/company
      if (!clientId) {
        if (leadRecord.email && leadRecord.email.trim() !== '') {
          const [c] = await txOrDb
            .select({ id: customers.id })
            .from(customers)
            .where(eq(customers.email, leadRecord.email.trim()))
            .limit(1);
          if (c) clientId = c.id;
        }
        if (!clientId && leadRecord.customerName) {
          const [c] = await txOrDb
            .select({ id: customers.id })
            .from(customers)
            .where(ilike(customers.name, leadRecord.customerName.trim()))
            .limit(1);
          if (c) clientId = c.id;
        }
      }

      // Check date threshold: only match downstream business events that occurred after this lead was created
      const leadCreatedAt = leadRecord.createdAt ? new Date(leadRecord.createdAt) : null;
      const createdThreshold = leadCreatedAt ? new Date(leadCreatedAt.getTime() - 2 * 60 * 1000) : null;

      if (clientId && createdThreshold) {
        // 1. Check Field Service Reports for Installation & Completion created for this lead/deal
        const fsrRes = await txOrDb.execute(sql`
          SELECT fsr.id, fsr.fsr_number, fsr.call_type, fsr.status
          FROM field_service_reports fsr
          WHERE fsr.customer_id = ${clientId}::uuid
            AND fsr.created_at >= ${createdThreshold}
          ORDER BY fsr.created_at DESC
          LIMIT 1
        `).catch(() => null);
        const fsr = (fsrRes as any)?.rows?.[0] || (fsrRes as any)?.[0];
        if (fsr && fsr.call_type === 'INSTALLATION') {
          if (fsr.status === 'COMPLETED' || fsr.status === 'CLOSED') {
            return 'Completed';
          }
          if (fsr.status === 'DRAFT' || fsr.status === 'IN_PROGRESS') {
            return 'Installation';
          }
        }

        const dispRes = await txOrDb.execute(sql`
          SELECT d.id, d.dispatch_number, d.status
          FROM dispatches d
          WHERE d.customer_id = ${clientId}::uuid
            AND d.status = 'DISPATCHED'
            AND d.created_at >= ${createdThreshold}
          ORDER BY d.created_at DESC
          LIMIT 1
        `).catch(() => null);
        const disp = (dispRes as any)?.rows?.[0] || (dispRes as any)?.[0];
        if (disp) {
          if (fsr && fsr.call_type === 'INSTALLATION') {
            if (fsr.status === 'COMPLETED' || fsr.status === 'CLOSED') {
              return 'Completed';
            }
            return 'Installation';
          }
          return 'Dispatched';
        }

        // 3. Check Sales Orders created after this lead was created
        const soRes = await txOrDb.execute(sql`
          SELECT so.id, so.sales_order_number, so.status
          FROM sales_orders so
          WHERE so.customer_id = ${clientId}::uuid
            AND so.status != 'CANCELLED'
            AND so.created_at >= ${createdThreshold}
          ORDER BY so.created_at DESC
          LIMIT 1
        `).catch(() => null);
        const so = (soRes as any)?.rows?.[0] || (soRes as any)?.[0];
        if (so) {
          const soItemsRes = await txOrDb.execute(sql`
            SELECT soi.quantity, COALESCE(p.stock_quantity, 0) as physical_stock
            FROM sales_order_items soi
            LEFT JOIN products p ON p.id = soi.product_id
            WHERE soi.sales_order_id = ${so.id}::uuid
          `).catch(() => null);
          const soItems = ((soItemsRes as any)?.rows || (soItemsRes as any) || []) as any[];
          const isFulfillable = soItems.length > 0 && soItems.every((it: any) => Number(it.physical_stock || 0) >= Number(it.quantity || 0));
          if (isFulfillable) {
            return 'Ready for Dispatch';
          }
          return 'Order Confirmed';
        }

        // 4. Check explicit Negotiation stage (takes precedence over Quotation Sent unless an SO exists)
        if (rawUpper === 'NEGOTIATION') {
          return 'Negotiation';
        }

        // 5. Check Quotation Sent or Accepted created for this customer
        const quoteRes = await txOrDb.execute(sql`
          SELECT q.id, q.quotation_number, q.status,
                 (SELECT COUNT(*) FROM quotation_activity_logs qal WHERE qal.quotation_id = q.id AND qal.action = 'EMAIL_SENT') as email_sent_count
          FROM quotations q
          WHERE q.customer_id = ${clientId}::uuid
            ${createdThreshold ? sql`AND q.created_at >= ${createdThreshold}` : sql``}
            AND (q.status IN ('SENT', 'ACCEPTED') OR EXISTS (SELECT 1 FROM quotation_activity_logs qal WHERE qal.quotation_id = q.id AND qal.action = 'EMAIL_SENT'))
          ORDER BY q.created_at DESC
          LIMIT 1
        `).catch(() => null);
        const quote = (quoteRes as any)?.rows?.[0] || (quoteRes as any)?.[0];
        if (quote) {
          return 'Quotation Sent';
        }
      }

      // 6. Check explicit Negotiation stage if not already matched
      if (rawUpper === 'NEGOTIATION') {
        return 'Negotiation';
      }

      // 7. Check Meeting Scheduled from Follow-ups
      const fuConditions = [];
      if (leadRecord.id) {
        fuConditions.push(sql`fu.lead_id = ${leadRecord.id}`);
        fuConditions.push(sql`fu.deal_id = ${leadRecord.id}`);
      }
      if (clientId) {
        fuConditions.push(sql`(fu.customer_id = ${clientId}::uuid ${createdThreshold ? sql`AND fu.created_at >= ${createdThreshold}` : sql``})`);
      }
      if (fuConditions.length > 0) {
        const fuRes = await txOrDb.execute(sql`
          SELECT fu.id, fu.scheduled_date, fu.scheduled_time, fu.type
          FROM follow_ups fu
          WHERE (${sql.join(fuConditions, sql` OR `)})
            AND fu.status = 'PENDING'
            AND fu.scheduled_date IS NOT NULL
          ORDER BY fu.created_at DESC
          LIMIT 1
        `).catch(() => null);
        const fu = (fuRes as any)?.rows?.[0] || (fuRes as any)?.[0];
        if (fu) {
          return 'Meeting Scheduled';
        }
      }

      // 8. Check manual Contacted
      if (rawUpper === 'CONTACTED') {
        return 'Contacted';
      }

      // 9. Check stored Meeting Scheduled
      if (rawUpper === 'MEETING SCHEDULED' || rawUpper === 'MEETING_SCHEDULED') {
        return 'Meeting Scheduled';
      }

      // If lead is converted/linked to a customer and has no subsequent stage, it belongs in Contacted
      if (clientId || leadRecord.linkedClientId) {
        return 'Contacted';
      }

      // 10. If new lead and no newer transactions
      if (isNew) {
        return 'New';
      }

      // 11. Stored canonical status mappings
      if (rawUpper === 'APPROVED/PO' || rawUpper === 'APPROVED' || rawUpper === 'ORDER CONFIRMED') return 'Order Confirmed';
      if (
        rawUpper === 'PROPOSAL SENT' ||
        rawUpper === 'QUOTATION SENT' ||
        rawUpper === 'QUOTATION_SENT' ||
        rawUpper === 'QUOTATION ACCEPTED' ||
        rawUpper === 'QUOTATION_ACCEPTED' ||
        rawUpper === 'ACCEPTED'
      ) return 'Quotation Sent';
      if (rawUpper === 'READY FOR DISPATCH') return 'Ready for Dispatch';
      if (rawUpper === 'DISPATCHED') return 'Dispatched';
      if (rawUpper === 'INSTALLATION') return 'Installation';
      if (rawUpper === 'COMPLETED' || rawUpper === 'WON') return 'Completed';

      return 'New';
    } catch (err) {
      console.warn('resolveLeadPipelineStage error:', err);
      return leadRecord.status || 'New';
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

    const destCountMap = new Map<string, number>();
    try {
      const destCountRows = await db
        .select({
          leadId: leadDestinations.leadId,
          count: sql<number>`count(*)::int`,
        })
        .from(leadDestinations)
        .groupBy(leadDestinations.leadId);

      for (const row of destCountRows) {
        destCountMap.set(row.leadId, Number(row.count || 0));
      }
    } catch {
      // Table might be initializing
    }

    const result = await Promise.all(
      leadRecords.map(async (lead) => {
        const logs = await db
          .select()
          .from(leadActivityLogs)
          .where(eq(leadActivityLogs.leadId, lead.id))
          .orderBy(desc(leadActivityLogs.createdAt));

        const authoritativeStatus = await this.resolveLeadPipelineStage(lead);

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
          status: authoritativeStatus,
          source: lead.source,
          linkedClientId: lead.linkedClientId || undefined,
          destinationCount: destCountMap.get(lead.id) || 0,
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

    const destinations = await db
      .select()
      .from(leadDestinations)
      .where(eq(leadDestinations.leadId, leadRecord.id))
      .orderBy(desc(leadDestinations.createdAt))
      .catch(() => []);

    const authoritativeStatus = await this.resolveLeadPipelineStage(leadRecord);

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
      status: authoritativeStatus,
      source: leadRecord.source,
      linkedClientId: leadRecord.linkedClientId || undefined,
      destinationCount: destinations.length,
      destinations,
      activityLogs: logs.map((l) => ({
        id: l.id,
        title: l.title,
        date: l.date || new Date(l.createdAt).toISOString().split('T')[0],
        type: l.type || 'System',
      })),
    };
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

    const linkedClientId = data.linkedClientId || null;

    const [created] = await db
      .insert(leads)
      .values({
        ...data,
        id: newId,
        leadCode: newCode,
        assignedEmployeeId,
        linkedClientId,
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

    // Backend validation for manual vs system-driven pipeline transitions
    if (payload.status) {
      const normStatus = payload.status.toUpperCase();
      const manualAllowed = ['NEW', 'NEW LEADS', 'NEW_LEADS', 'CONTACTED', 'NEGOTIATION'];
      if (!manualAllowed.includes(normStatus)) {
        // Validate if the corresponding business event/entity actually exists
        const resolvedStage = await this.resolveLeadPipelineStage(existingLead || { ...payload, id });
        const resolvedNorm = resolvedStage.toUpperCase();

        const isMatch =
          normStatus === resolvedNorm ||
          (normStatus.includes('MEETING') && resolvedNorm.includes('MEETING')) ||
          ((normStatus.includes('QUOTATION') || normStatus.includes('PROPOSAL')) && (resolvedNorm.includes('QUOTATION') || resolvedNorm.includes('PROPOSAL'))) ||
          ((normStatus.includes('ORDER') || normStatus.includes('APPROVED')) && (resolvedNorm.includes('ORDER') || resolvedNorm.includes('APPROVED'))) ||
          (normStatus.includes('READY') && resolvedNorm.includes('READY')) ||
          (normStatus.includes('DISPATCHED') && resolvedNorm.includes('DISPATCHED')) ||
          (normStatus.includes('INSTALLATION') && resolvedNorm.includes('INSTALLATION')) ||
          (normStatus.includes('COMPLETED') && resolvedNorm.includes('COMPLETED'));

        if (!isMatch) {
          const reasons: Record<string, string> = {
            'MEETING SCHEDULED': 'Meeting Scheduled stage is automatically managed by scheduling a Meeting follow-up in the Follow-ups module.',
            'QUOTATION SENT': 'Quotation Sent stage requires an approved quotation to be emailed to the customer using "Send Email to Customer".',
            'PROPOSAL SENT': 'Quotation Sent stage requires an approved quotation to be emailed to the customer using "Send Email to Customer".',
            'ORDER CONFIRMED': 'Order Confirmed stage requires a confirmed Sales Order to be created in the Sales Orders module.',
            'APPROVED': 'Order Confirmed stage requires a confirmed Sales Order to be created in the Sales Orders module.',
            'APPROVED/PO': 'Order Confirmed stage requires a confirmed Sales Order to be created in the Sales Orders module.',
            'READY FOR DISPATCH': 'Ready for Dispatch stage requires a Sales Order with verified available inventory stock.',
            'DISPATCHED': 'Dispatched stage requires physical stock reduction through confirmed dispatch in the Dispatch module.',
            'INSTALLATION': 'Installation stage requires an active Field Service / FSR installation job card.',
            'COMPLETED': 'Completed stage requires completed delivery dispatch or completed installation FSR.',
          };
          throw AppError.badRequest(reasons[payload.status.toUpperCase()] || `Cannot move lead to "${payload.status}" without the corresponding business transaction.`);
        }
      }
    }

    const linkedClientId =
      payload.linkedClientId !== undefined
        ? payload.linkedClientId
        : existingLead?.linkedClientId || null;

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
        productInterested: payload.productInterested || '',
        expectedValue: payload.expectedValue || '0',
        assignedExecutive: payload.assignedExecutive || 'Unassigned',
        assignedEmployeeId: user?.userId,
        priority: payload.priority || 'Medium',
        status: payload.status || 'New',
        source: payload.source || 'Web',
        linkedClientId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };
      if (payload.leadCode !== undefined) updateData.leadCode = payload.leadCode;
      if (payload.customerName !== undefined) updateData.customerName = payload.customerName;
      if (payload.companyName !== undefined) updateData.companyName = payload.companyName;
      if (payload.email !== undefined) updateData.email = payload.email;
      if (payload.phone !== undefined) updateData.phone = payload.phone;
      if (payload.address !== undefined) updateData.address = payload.address;
      if (payload.productInterested !== undefined) updateData.productInterested = payload.productInterested;
      if (payload.expectedValue !== undefined) updateData.expectedValue = String(payload.expectedValue);
      if (payload.assignedExecutive !== undefined) updateData.assignedExecutive = payload.assignedExecutive;
      if (payload.assignedEmployeeId !== undefined) updateData.assignedEmployeeId = payload.assignedEmployeeId;
      if (payload.createdBy !== undefined) updateData.createdBy = payload.createdBy;
      if (payload.createdById !== undefined) updateData.createdById = payload.createdById;
      if (payload.priority !== undefined) updateData.priority = payload.priority;
      if (payload.status !== undefined) {
        updateData.status = payload.status;
      } else if (payload.linkedClientId && ['NEW', 'NEW LEADS', 'NEW_LEAD', 'NEW_LEADS'].includes((existingLead?.status || '').toUpperCase())) {
        updateData.status = 'Contacted';
      }
      if (payload.source !== undefined) updateData.source = payload.source;
      if (linkedClientId !== undefined) updateData.linkedClientId = linkedClientId;

      await db
        .update(leads)
        .set(updateData)
        .where(eq(leads.id, id));
    }

    if (linkedClientId) {
      await this.syncLeadDestinationsToCustomer(id, linkedClientId);
    }

    const logTitle = payload.status
      ? `Lead status updated to ${payload.status}`
      : payload.linkedClientId
        ? `Lead converted to customer`
        : 'Lead details updated';

    await db.insert(leadActivityLogs).values({
      id: `act-${id}-${Date.now()}`,
      leadId: id,
      title: logTitle,
      date: new Date().toISOString().split('T')[0],
      type: 'System',
    });

    return this.findById(id, user);
  }

  async syncLeadDestinationsToCustomer(leadId: string, customerId: string) {
    try {
      await this.ensureSchema();
      const existingLeadDests = await db
        .select()
        .from(leadDestinations)
        .where(eq(leadDestinations.leadId, leadId));

      const [leadRecord] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (existingLeadDests.length > 0) {
        for (const ld of existingLeadDests) {
          const [alreadyExists] = await db
            .select({ id: customerDestinations.id })
            .from(customerDestinations)
            .where(
              and(
                eq(customerDestinations.customerId, customerId),
                eq(customerDestinations.name, ld.name)
              )
            )
            .limit(1);

          if (!alreadyExists) {
            await db.insert(customerDestinations).values({
              customerId,
              name: ld.name,
              address: ld.address,
              city: ld.city,
              state: ld.state,
              pincode: ld.pincode,
              latitude: ld.latitude,
              longitude: ld.longitude,
              placeId: ld.placeId,
              contactPerson: ld.contactPerson,
              contactPhone: ld.contactPhone,
              notes: ld.notes,
              status: ld.status || 'ACTIVE',
            });
          }
        }
      } else if (leadRecord && leadRecord.address && leadRecord.address.trim() !== '') {
        const destName = `${leadRecord.companyName || leadRecord.customerName} - Main Site`;
        const [alreadyExists] = await db
          .select({ id: customerDestinations.id })
          .from(customerDestinations)
          .where(
            and(
              eq(customerDestinations.customerId, customerId),
              eq(customerDestinations.name, destName)
            )
          )
          .limit(1);

        if (!alreadyExists) {
          await db.insert(customerDestinations).values({
            customerId,
            name: destName,
            address: leadRecord.address,
            status: 'ACTIVE',
          });

          await db.insert(leadDestinations).values({
            leadId,
            name: destName,
            address: leadRecord.address,
            status: 'ACTIVE',
          });
        }
      }
    } catch (err) {
      console.warn('Failed to sync lead destinations to customer:', err);
    }
  }

  async findDestinationsByLeadId(leadId: string) {
    await this.ensureSchema();
    return db
      .select()
      .from(leadDestinations)
      .where(eq(leadDestinations.leadId, leadId))
      .orderBy(desc(leadDestinations.createdAt));
  }

  async createDestination(leadId: string, data: any) {
    await this.ensureSchema();
    const [created] = await db
      .insert(leadDestinations)
      .values({
        leadId,
        name: data.name,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        latitude: data.latitude !== undefined && data.latitude !== null && data.latitude !== '' ? String(data.latitude) : null,
        longitude: data.longitude !== undefined && data.longitude !== null && data.longitude !== '' ? String(data.longitude) : null,
        placeId: data.placeId || null,
        contactPerson: data.contactPerson || null,
        contactPhone: data.contactPhone || null,
        notes: data.notes || null,
        status: data.status || 'ACTIVE',
      })
      .returning();

    // If lead is already linked to a customer, also create under customerDestinations
    const [lead] = await db.select({ linkedClientId: leads.linkedClientId }).from(leads).where(eq(leads.id, leadId)).limit(1);
    if (lead?.linkedClientId) {
      try {
        await db.insert(customerDestinations).values({
          customerId: lead.linkedClientId,
          name: created.name,
          address: created.address,
          city: created.city,
          state: created.state,
          pincode: created.pincode,
          latitude: created.latitude,
          longitude: created.longitude,
          placeId: created.placeId,
          contactPerson: created.contactPerson,
          contactPhone: created.contactPhone,
          notes: created.notes,
          status: created.status,
        });
      } catch (e) {
        console.warn('Failed to mirror lead destination to customer destination:', e);
      }
    }

    return created;
  }

  async updateDestination(leadId: string, destinationId: string, data: any) {
    await this.ensureSchema();
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.city !== undefined) updateData.city = data.city || null;
    if (data.state !== undefined) updateData.state = data.state || null;
    if (data.pincode !== undefined) updateData.pincode = data.pincode || null;
    if (data.latitude !== undefined) updateData.latitude = data.latitude !== null && data.latitude !== '' ? String(data.latitude) : null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude !== null && data.longitude !== '' ? String(data.longitude) : null;
    if (data.placeId !== undefined) updateData.placeId = data.placeId || null;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson || null;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.status !== undefined) updateData.status = data.status;

    const [updated] = await db
      .update(leadDestinations)
      .set(updateData)
      .where(and(eq(leadDestinations.id, destinationId), eq(leadDestinations.leadId, leadId)))
      .returning();

    return updated;
  }

  async deleteDestination(leadId: string, destinationId: string) {
    await this.ensureSchema();
    const result = await db
      .delete(leadDestinations)
      .where(and(eq(leadDestinations.id, destinationId), eq(leadDestinations.leadId, leadId)))
      .returning();
    return result.length > 0;
  }

  async getPipelineData(user?: JwtPayload) {
    const allLeads = await this.findAll({}, user);

    const STAGES = [
      { id: 'NEW LEADS', title: 'NEW LEADS', statusKeys: ['NEW', 'NEW LEADS', 'NEW_LEAD', 'NEW_LEADS'] },
      { id: 'CONTACTED', title: 'CONTACTED', statusKeys: ['CONTACTED'] },
      { id: 'MEETING SCHEDULED', title: 'MEETING SCHEDULED', statusKeys: ['MEETING SCHEDULED', 'MEETING_SCHEDULED'] },
      { id: 'QUOTATION SENT', title: 'QUOTATION SENT', statusKeys: ['QUOTATION SENT', 'QUOTATION_SENT', 'PROPOSAL SENT', 'PROPOSAL_SENT', 'QUOTATION ACCEPTED', 'QUOTATION_ACCEPTED', 'ACCEPTED'] },
      { id: 'NEGOTIATION', title: 'NEGOTIATION', statusKeys: ['NEGOTIATION'] },
      { id: 'ORDER CONFIRMED', title: 'ORDER CONFIRMED', statusKeys: ['ORDER CONFIRMED', 'ORDER_CONFIRMED', 'APPROVED/PO', 'APPROVED'] },
      { id: 'READY FOR DISPATCH', title: 'READY FOR DISPATCH', statusKeys: ['READY FOR DISPATCH', 'READY_FOR_DISPATCH'] },
      { id: 'DISPATCHED', title: 'DISPATCHED', statusKeys: ['DISPATCHED'] },
      { id: 'INSTALLATION', title: 'INSTALLATION', statusKeys: ['INSTALLATION'] },
      { id: 'COMPLETED', title: 'COMPLETED', statusKeys: ['COMPLETED', 'WON'] },
    ];

    return STAGES.map((stage) => {
      const deals = allLeads.filter((l) =>
        stage.statusKeys.includes((l.status || '').toUpperCase())
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

  async convertToCustomer(id: string, user?: JwtPayload) {
    await this.ensureSchema();
    const lead = await this.findById(id, user);
    if (!lead) {
      throw AppError.notFound('Lead not found');
    }

    // Check if the lead has a linked client that exists in customers
    let targetCustomerId: string | null = null;
    if (lead.linkedClientId) {
      const [existingLinked] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, lead.linkedClientId))
        .limit(1);
      // Only keep if the customer name matches or resembles the lead name
      if (
        existingLinked &&
        existingLinked.name.toLowerCase().trim() === lead.customerName.toLowerCase().trim()
      ) {
        targetCustomerId = existingLinked.id;
      }
    }

    // If not found yet, check if there is an exact match customer by name and company
    if (!targetCustomerId) {
      const trimmedName = lead.customerName.trim();
      const trimmedCompany = (lead.companyName || '').trim();
      const trimmedEmail = (lead.email || '').trim().toLowerCase();

      const candidateCustomers = await db
        .select()
        .from(customers)
        .where(ilike(customers.name, trimmedName))
        .limit(10);

      const exactMatch = candidateCustomers.find((c) => {
        const matchComp =
          trimmedCompany &&
          c.companyName &&
          c.companyName.toLowerCase().trim() === trimmedCompany.toLowerCase();
        const matchEm = trimmedEmail && c.email && c.email.toLowerCase().trim() === trimmedEmail;
        return Boolean(matchComp || matchEm);
      });

      if (exactMatch) {
        targetCustomerId = exactMatch.id;
      }
    }

    // Fetch lead destinations
    const leadDests = await this.findDestinationsByLeadId(id);
    const firstDest = leadDests[0];

    // If still no target customer, create a new customer
    if (!targetCustomerId) {
      const [newCust] = await db
        .insert(customers)
        .values({
          name: lead.customerName.trim(),
          companyName: lead.companyName?.trim() || lead.customerName.trim(),
          phone: lead.phone?.trim() || null,
          email: lead.email?.trim() || null,
          address: lead.address?.trim() || firstDest?.address || null,
          city: firstDest?.city || null,
          state: firstDest?.state || null,
          pincode: firstDest?.pincode || null,
          notes: lead.productInterested
            ? `Converted from Lead ${lead.id} (${lead.leadCode}). Product: ${lead.productInterested}`
            : `Converted from Lead ${lead.id} (${lead.leadCode})`,
          status: 'ACTIVE',
          createdById: lead.createdById || user?.userId || null,
          createdBy: lead.createdBy || (user as any)?.fullName || 'User',
        })
        .returning();

      targetCustomerId = newCust.id;
    }

    // Copy lead destinations into customer_destinations
    if (leadDests.length > 0) {
      const existingCustDests = await db
        .select()
        .from(customerDestinations)
        .where(eq(customerDestinations.customerId, targetCustomerId));

      for (const dest of leadDests) {
        const alreadyExists = existingCustDests.some(
          (cd) => cd.name.toLowerCase().trim() === dest.name.toLowerCase().trim()
        );
        if (!alreadyExists) {
          await db.insert(customerDestinations).values({
            customerId: targetCustomerId,
            name: dest.name,
            address: dest.address || null,
            city: dest.city || null,
            state: dest.state || null,
            pincode: dest.pincode || null,
            latitude: dest.latitude ? String(dest.latitude) : null,
            longitude: dest.longitude ? String(dest.longitude) : null,
            placeId: dest.placeId || null,
            contactPerson: dest.contactPerson || lead.customerName,
            contactPhone: dest.contactPhone || lead.phone || null,
            notes: dest.notes || null,
            status: (dest.status as any) || 'ACTIVE',
          });
        }
      }
    }

    // Link lead to this customer and transition status to Contacted if it was New
    const currentStatus = (lead.status || '').toUpperCase();
    const isNewLead = ['NEW', 'NEW LEADS', 'NEW_LEAD', 'NEW_LEADS'].includes(currentStatus) || !lead.status;
    const newLeadStatus = isNewLead ? 'Contacted' : lead.status;

    await db
      .update(leads)
      .set({
        linkedClientId: targetCustomerId,
        status: newLeadStatus,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));

    // Add activity log
    const authorName = (user as any)?.fullName || 'User';
    await db.insert(leadActivityLogs).values({
      id: `act-${id}-${Date.now()}`,
      leadId: id,
      title: isNewLead
        ? `Lead converted to customer: ${lead.customerName} (by ${authorName}) — status moved from New to Contacted`
        : `Lead converted to customer: ${lead.customerName} (by ${authorName})`,
      date: new Date().toISOString().split('T')[0],
      type: 'System',
    });

    // Fetch final updated lead and customer with destinations
    const updatedLead = await this.findById(id, user);

    const [customerRow] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, targetCustomerId))
      .limit(1);

    const fullCustDestinations = await db
      .select()
      .from(customerDestinations)
      .where(eq(customerDestinations.customerId, targetCustomerId))
      .orderBy(desc(customerDestinations.createdAt));

    const finalCustomer = {
      ...customerRow,
      destinations: fullCustDestinations,
      destinationCount: fullCustDestinations.length,
    };

    return {
      customer: finalCustomer,
      lead: updatedLead,
    };
  }
}

