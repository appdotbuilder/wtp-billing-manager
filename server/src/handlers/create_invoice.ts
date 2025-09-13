import { db } from '../db';
import { meterReadingsTable, billingConfigTable, invoicesTable } from '../db/schema';
import { type CreateInvoiceInput, type Invoice } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const createInvoice = async (input: CreateInvoiceInput): Promise<Invoice> => {
  try {
    // 1. Fetch the meter reading to get total usage
    const meterReadingResult = await db.select()
      .from(meterReadingsTable)
      .where(eq(meterReadingsTable.id, input.meter_reading_id))
      .execute();

    if (meterReadingResult.length === 0) {
      throw new Error(`Meter reading with id ${input.meter_reading_id} not found`);
    }

    const meterReading = meterReadingResult[0];

    // 2. Fetch current billing config to get price_per_unit and due_date_offset
    const billingConfigResult = await db.select()
      .from(billingConfigTable)
      .orderBy(desc(billingConfigTable.created_at))
      .limit(1)
      .execute();

    if (billingConfigResult.length === 0) {
      throw new Error('No billing configuration found');
    }

    const billingConfig = billingConfigResult[0];

    // 3. Calculate amount_due = total_usage * price_per_unit
    const totalUsage = parseFloat(meterReading.usage_calculated);
    const pricePerUnit = parseFloat(billingConfig.price_per_unit);
    const amountDue = totalUsage * pricePerUnit;

    // 4. Calculate due_date = current_date + due_date_offset_days
    const currentDate = new Date();
    const dueDate = new Date(currentDate);
    dueDate.setDate(dueDate.getDate() + billingConfig.due_date_offset_days);

    // 5. Insert invoice record with status 'pending'
    const result = await db.insert(invoicesTable)
      .values({
        customer_id: input.customer_id,
        meter_reading_id: input.meter_reading_id,
        billing_period: input.billing_period,
        total_usage: totalUsage.toString(),
        price_per_unit: pricePerUnit.toString(),
        amount_due: amountDue.toString(),
        due_date: dueDate,
        status: 'pending'
      })
      .returning()
      .execute();

    // 6. Return the created invoice with proper numeric conversions
    const invoice = result[0];
    return {
      ...invoice,
      total_usage: parseFloat(invoice.total_usage),
      price_per_unit: parseFloat(invoice.price_per_unit),
      amount_due: parseFloat(invoice.amount_due)
    };
  } catch (error) {
    console.error('Invoice creation failed:', error);
    throw error;
  }
};