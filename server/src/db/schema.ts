import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Invoice status enum
export const invoiceStatusEnum = pgEnum('invoice_status', ['pending', 'paid', 'overdue']);

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  whatsapp_number: text('whatsapp_number').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Meter readings table
export const meterReadingsTable = pgTable('meter_readings', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => customersTable.id, { onDelete: 'cascade' }).notNull(),
  reading_date: timestamp('reading_date').notNull(),
  current_reading: numeric('current_reading', { precision: 12, scale: 2 }).notNull(),
  previous_reading: numeric('previous_reading', { precision: 12, scale: 2 }),
  usage_calculated: numeric('usage_calculated', { precision: 12, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Billing configuration table
export const billingConfigTable = pgTable('billing_config', {
  id: serial('id').primaryKey(),
  price_per_unit: numeric('price_per_unit', { precision: 10, scale: 4 }).notNull(),
  due_date_offset_days: integer('due_date_offset_days').notNull().default(15),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Invoices table
export const invoicesTable = pgTable('invoices', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => customersTable.id, { onDelete: 'cascade' }).notNull(),
  meter_reading_id: integer('meter_reading_id').references(() => meterReadingsTable.id, { onDelete: 'cascade' }).notNull(),
  billing_period: text('billing_period').notNull(),
  total_usage: numeric('total_usage', { precision: 12, scale: 2 }).notNull(),
  price_per_unit: numeric('price_per_unit', { precision: 10, scale: 4 }).notNull(),
  amount_due: numeric('amount_due', { precision: 12, scale: 2 }).notNull(),
  due_date: timestamp('due_date').notNull(),
  status: invoiceStatusEnum('status').default('pending').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relationships
export const customersRelations = relations(customersTable, ({ many }) => ({
  meterReadings: many(meterReadingsTable),
  invoices: many(invoicesTable),
}));

export const meterReadingsRelations = relations(meterReadingsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [meterReadingsTable.customer_id],
    references: [customersTable.id],
  }),
  invoices: many(invoicesTable),
}));

export const invoicesRelations = relations(invoicesTable, ({ one }) => ({
  customer: one(customersTable, {
    fields: [invoicesTable.customer_id],
    references: [customersTable.id],
  }),
  meterReading: one(meterReadingsTable, {
    fields: [invoicesTable.meter_reading_id],
    references: [meterReadingsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;

export type MeterReading = typeof meterReadingsTable.$inferSelect;
export type NewMeterReading = typeof meterReadingsTable.$inferInsert;

export type BillingConfig = typeof billingConfigTable.$inferSelect;
export type NewBillingConfig = typeof billingConfigTable.$inferInsert;

export type Invoice = typeof invoicesTable.$inferSelect;
export type NewInvoice = typeof invoicesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  customers: customersTable,
  meterReadings: meterReadingsTable,
  billingConfig: billingConfigTable,
  invoices: invoicesTable,
};