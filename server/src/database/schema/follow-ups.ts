import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { customers } from './customers.js';
import { leads } from './leads.js';
import { quotations } from './quotations.js';
import { amcContracts } from './amc-contracts.js';

export const followUps = pgTable(
  'follow_ups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    followUpNumber: varchar('follow_up_number', { length: 50 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // CALL, MEETING, EMAIL, SITE_VISIT, QUOTATION_FOLLOW_UP, PAYMENT_FOLLOW_UP, AMC_RENEWAL, AMC_EXPIRY, CUSTOMER_VISIT, OTHER
    status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, COMPLETED, CANCELLED
    priority: varchar('priority', { length: 50 }).default('MEDIUM').notNull(), // LOW, MEDIUM, HIGH

    scheduledDate: varchar('scheduled_date', { length: 20 }).notNull(), // YYYY-MM-DD
    scheduledTime: varchar('scheduled_time', { length: 20 }), // HH:mm

    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),

    // CRM Entity Relationships
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
    leadId: varchar('lead_id', { length: 255 }).references(() => leads.id, { onDelete: 'cascade' }),
    dealId: varchar('deal_id', { length: 255 }).references(() => leads.id, { onDelete: 'cascade' }),
    quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'cascade' }),
    amcContractId: uuid('amc_contract_id').references(() => amcContracts.id, { onDelete: 'cascade' }),

    // Completion fields
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
    outcome: text('outcome'),

    // Reschedule & Next follow-up tracking
    rescheduledFromId: uuid('rescheduled_from_id'),
    nextFollowUpId: uuid('next_follow_up_id'),
    nextFollowUpDate: varchar('next_follow_up_date', { length: 20 }),

    // Cancellation fields
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledBy: uuid('cancelled_by').references(() => users.id, { onDelete: 'set null' }),
    cancellationReason: text('cancellation_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('follow_ups_number_idx').on(table.followUpNumber),
    index('follow_ups_status_idx').on(table.status),
    index('follow_ups_priority_idx').on(table.priority),
    index('follow_ups_type_idx').on(table.type),
    index('follow_ups_scheduled_date_idx').on(table.scheduledDate),
    index('follow_ups_assigned_to_idx').on(table.assignedTo),
    index('follow_ups_created_by_idx').on(table.createdBy),
    index('follow_ups_customer_id_idx').on(table.customerId),
    index('follow_ups_lead_id_idx').on(table.leadId),
    index('follow_ups_deal_id_idx').on(table.dealId),
    index('follow_ups_quotation_id_idx').on(table.quotationId),
    index('follow_ups_amc_contract_id_idx').on(table.amcContractId),
    index('follow_ups_created_at_idx').on(table.createdAt),
  ]
);

export type FollowUpEntity = typeof followUps.$inferSelect;
export type NewFollowUpEntity = typeof followUps.$inferInsert;
