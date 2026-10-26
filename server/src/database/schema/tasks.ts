import { pgTable, uuid, varchar, text, timestamp, index, numeric } from 'drizzle-orm/pg-core';
import { customers, customerDestinations } from './customers.js';
import { leads, leadDestinations } from './leads.js';
import { users } from './users.js';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' }),
    destinationId: uuid('destination_id')
      .references(() => customerDestinations.id, { onDelete: 'restrict' }),
    leadId: varchar('lead_id', { length: 255 })
      .references(() => leads.id, { onDelete: 'set null' }),
    leadDestinationId: uuid('lead_destination_id')
      .references(() => leadDestinations.id, { onDelete: 'set null' }),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    priority: varchar('priority', { length: 50 }).default('MEDIUM').notNull(),
    status: varchar('status', { length: 50 }).default('CREATED').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    currentLatitude: numeric('current_latitude', { precision: 10, scale: 7 }),
    currentLongitude: numeric('current_longitude', { precision: 10, scale: 7 }),
    locationAccuracy: numeric('location_accuracy', { precision: 8, scale: 2 }),
    lastLocationUpdatedAt: timestamp('last_location_updated_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('tasks_customer_id_idx').on(table.customerId),
    index('tasks_destination_id_idx').on(table.destinationId),
    index('tasks_lead_id_idx').on(table.leadId),
    index('tasks_lead_destination_id_idx').on(table.leadDestinationId),
    index('tasks_assigned_to_idx').on(table.assignedTo),
    index('tasks_status_idx').on(table.status),
    index('tasks_priority_idx').on(table.priority),
    index('tasks_scheduled_at_idx').on(table.scheduledAt),
    index('tasks_created_at_idx').on(table.createdAt),
  ]
);

export type TaskEntity = typeof tasks.$inferSelect;
export type NewTaskEntity = typeof tasks.$inferInsert;
