import { pgTable, varchar, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';

export const leads = pgTable('leads', {
  id: varchar('id', { length: 255 }).primaryKey(),
  leadCode: varchar('lead_code', { length: 50 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  productInterested: varchar('product_interested', { length: 255 }),
  expectedValue: numeric('expected_value', { precision: 12, scale: 2 }).default('0'),
  assignedExecutive: varchar('assigned_executive', { length: 255 }),
  assignedEmployeeId: varchar('assigned_employee_id', { length: 255 }),
  createdBy: varchar('created_by', { length: 255 }),
  createdById: varchar('created_by_id', { length: 255 }),
  priority: varchar('priority', { length: 50 }).default('Medium').notNull(),
  status: varchar('status', { length: 50 }).default('New').notNull(),
  source: varchar('source', { length: 50 }).default('Web').notNull(),
  linkedClientId: varchar('linked_client_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const leadActivityLogs = pgTable(
  'lead_activity_logs',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    leadId: varchar('lead_id', { length: 255 })
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    date: varchar('date', { length: 50 }),
    type: varchar('type', { length: 50 }).default('System'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('lead_activity_logs_lead_id_idx').on(table.leadId),
  ]
);

export type LeadEntity = typeof leads.$inferSelect;
export type NewLeadEntity = typeof leads.$inferInsert;

export type LeadActivityLogEntity = typeof leadActivityLogs.$inferSelect;
export type NewLeadActivityLogEntity = typeof leadActivityLogs.$inferInsert;
