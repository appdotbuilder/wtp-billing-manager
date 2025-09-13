import { db } from '../db';
import { invoicesTable, customersTable, meterReadingsTable } from '../db/schema';
import { type GetInvoicesByCustomerInput, type Invoice } from '../schema';
import { eq, desc, and, type SQL } from 'drizzle-orm';

export async function getInvoices(input: GetInvoicesByCustomerInput): Promise<Invoice[]> {
  try {
    // Build conditions array for optional filters
    const conditions: SQL<unknown>[] = [];

    if (input.customer_id !== undefined) {
      conditions.push(eq(invoicesTable.customer_id, input.customer_id));
    }

    if (input.status !== undefined) {
      conditions.push(eq(invoicesTable.status, input.status));
    }

    // Build base query with joins
    const baseQuery = db.select()
      .from(invoicesTable)
      .innerJoin(customersTable, eq(invoicesTable.customer_id, customersTable.id))
      .innerJoin(meterReadingsTable, eq(invoicesTable.meter_reading_id, meterReadingsTable.id));

    // Execute query with or without where clause
    const results = conditions.length > 0
      ? await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(invoicesTable.created_at))
          .execute()
      : await baseQuery
          .orderBy(desc(invoicesTable.created_at))
          .execute();

    // Transform results and convert numeric fields
    return results.map(result => ({
      id: result.invoices.id,
      customer_id: result.invoices.customer_id,
      meter_reading_id: result.invoices.meter_reading_id,
      billing_period: result.invoices.billing_period,
      total_usage: parseFloat(result.invoices.total_usage),
      price_per_unit: parseFloat(result.invoices.price_per_unit),
      amount_due: parseFloat(result.invoices.amount_due),
      due_date: result.invoices.due_date,
      status: result.invoices.status,
      created_at: result.invoices.created_at,
      updated_at: result.invoices.updated_at
    }));
  } catch (error) {
    console.error('Invoice retrieval failed:', error);
    throw error;
  }
}