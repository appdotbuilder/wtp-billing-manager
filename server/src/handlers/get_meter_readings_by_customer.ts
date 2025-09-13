import { db } from '../db';
import { meterReadingsTable } from '../db/schema';
import { type GetMeterReadingsByCustomerInput, type MeterReading } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getMeterReadingsByCustomer(input: GetMeterReadingsByCustomerInput): Promise<MeterReading[]> {
  try {
    // Query meter readings for the specific customer, ordered by reading_date descending
    const results = await db.select()
      .from(meterReadingsTable)
      .where(eq(meterReadingsTable.customer_id, input.customer_id))
      .orderBy(desc(meterReadingsTable.reading_date))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(reading => ({
      ...reading,
      current_reading: parseFloat(reading.current_reading),
      previous_reading: reading.previous_reading ? parseFloat(reading.previous_reading) : null,
      usage_calculated: parseFloat(reading.usage_calculated)
    }));
  } catch (error) {
    console.error('Failed to fetch meter readings by customer:', error);
    throw error;
  }
}