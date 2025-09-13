import { db } from '../db';
import { meterReadingsTable, customersTable } from '../db/schema';
import { type CreateMeterReadingInput, type MeterReading } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const createMeterReading = async (input: CreateMeterReadingInput): Promise<MeterReading> => {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error(`Customer with id ${input.customer_id} not found`);
    }

    let previousReading = input.previous_reading;

    // If previous_reading is not provided, fetch the last meter reading for this customer
    if (previousReading === undefined || previousReading === null) {
      const lastReadings = await db.select()
        .from(meterReadingsTable)
        .where(eq(meterReadingsTable.customer_id, input.customer_id))
        .orderBy(desc(meterReadingsTable.reading_date))
        .limit(1)
        .execute();

      // Set previous reading to the last reading's current_reading, or 0 if no previous readings
      previousReading = lastReadings.length > 0 
        ? parseFloat(lastReadings[0].current_reading) 
        : 0;
    }

    // Calculate usage
    const usageCalculated = Math.max(0, input.current_reading - previousReading);

    // Insert meter reading record
    const result = await db.insert(meterReadingsTable)
      .values({
        customer_id: input.customer_id,
        reading_date: input.reading_date,
        current_reading: input.current_reading.toString(),
        previous_reading: previousReading?.toString() || null,
        usage_calculated: usageCalculated.toString()
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const meterReading = result[0];
    return {
      ...meterReading,
      current_reading: parseFloat(meterReading.current_reading),
      previous_reading: meterReading.previous_reading 
        ? parseFloat(meterReading.previous_reading) 
        : null,
      usage_calculated: parseFloat(meterReading.usage_calculated)
    };
  } catch (error) {
    console.error('Meter reading creation failed:', error);
    throw error;
  }
};