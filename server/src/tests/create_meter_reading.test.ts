import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, meterReadingsTable } from '../db/schema';
import { type CreateMeterReadingInput } from '../schema';
import { createMeterReading } from '../handlers/create_meter_reading';
import { eq } from 'drizzle-orm';

describe('createMeterReading', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test customer
  const createTestCustomer = async () => {
    const result = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test Street',
        whatsapp_number: '+1234567890'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create a meter reading for new customer with no previous readings', async () => {
    const customer = await createTestCustomer();
    
    const testInput: CreateMeterReadingInput = {
      customer_id: customer.id,
      reading_date: new Date('2024-01-15'),
      current_reading: 100.5
    };

    const result = await createMeterReading(testInput);

    // Basic field validation
    expect(result.customer_id).toEqual(customer.id);
    expect(result.reading_date).toEqual(new Date('2024-01-15'));
    expect(result.current_reading).toEqual(100.5);
    expect(result.previous_reading).toEqual(0);
    expect(result.usage_calculated).toEqual(100.5); // 100.5 - 0
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a meter reading with provided previous reading', async () => {
    const customer = await createTestCustomer();
    
    const testInput: CreateMeterReadingInput = {
      customer_id: customer.id,
      reading_date: new Date('2024-01-15'),
      current_reading: 150.75,
      previous_reading: 100.25
    };

    const result = await createMeterReading(testInput);

    expect(result.current_reading).toEqual(150.75);
    expect(result.previous_reading).toEqual(100.25);
    expect(result.usage_calculated).toEqual(50.5); // 150.75 - 100.25
  });

  it('should calculate zero usage when current reading equals previous reading', async () => {
    const customer = await createTestCustomer();
    
    const testInput: CreateMeterReadingInput = {
      customer_id: customer.id,
      reading_date: new Date('2024-01-15'),
      current_reading: 100,
      previous_reading: 100
    };

    const result = await createMeterReading(testInput);

    expect(result.usage_calculated).toEqual(0);
  });

  it('should handle negative usage calculation (sets to 0)', async () => {
    const customer = await createTestCustomer();
    
    const testInput: CreateMeterReadingInput = {
      customer_id: customer.id,
      reading_date: new Date('2024-01-15'),
      current_reading: 50,
      previous_reading: 100 // Previous reading higher than current
    };

    const result = await createMeterReading(testInput);

    expect(result.usage_calculated).toEqual(0); // Should be 0, not negative
  });

  it('should use last meter reading as previous reading when not provided', async () => {
    const customer = await createTestCustomer();
    
    // Create first meter reading
    await createMeterReading({
      customer_id: customer.id,
      reading_date: new Date('2024-01-01'),
      current_reading: 50,
      previous_reading: 0
    });

    // Create second reading without specifying previous_reading
    const testInput: CreateMeterReadingInput = {
      customer_id: customer.id,
      reading_date: new Date('2024-01-15'),
      current_reading: 120.5
    };

    const result = await createMeterReading(testInput);

    expect(result.previous_reading).toEqual(50); // Should use previous current_reading
    expect(result.usage_calculated).toEqual(70.5); // 120.5 - 50
  });

  it('should save meter reading to database correctly', async () => {
    const customer = await createTestCustomer();
    
    const testInput: CreateMeterReadingInput = {
      customer_id: customer.id,
      reading_date: new Date('2024-01-15'),
      current_reading: 100.5,
      previous_reading: 25.75
    };

    const result = await createMeterReading(testInput);

    // Query the database to verify storage
    const readings = await db.select()
      .from(meterReadingsTable)
      .where(eq(meterReadingsTable.id, result.id))
      .execute();

    expect(readings).toHaveLength(1);
    expect(readings[0].customer_id).toEqual(customer.id);
    expect(parseFloat(readings[0].current_reading)).toEqual(100.5);
    expect(parseFloat(readings[0].previous_reading!)).toEqual(25.75);
    expect(parseFloat(readings[0].usage_calculated)).toEqual(74.75);
    expect(readings[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null previous_reading in input', async () => {
    const customer = await createTestCustomer();
    
    const testInput: CreateMeterReadingInput = {
      customer_id: customer.id,
      reading_date: new Date('2024-01-15'),
      current_reading: 100,
      previous_reading: null
    };

    const result = await createMeterReading(testInput);

    expect(result.previous_reading).toEqual(0); // Should default to 0
    expect(result.usage_calculated).toEqual(100);
  });

  it('should throw error for non-existent customer', async () => {
    const testInput: CreateMeterReadingInput = {
      customer_id: 999, // Non-existent customer
      reading_date: new Date('2024-01-15'),
      current_reading: 100
    };

    expect(createMeterReading(testInput)).rejects.toThrow(/customer.*not found/i);
  });

  it('should verify numeric type conversions', async () => {
    const customer = await createTestCustomer();
    
    const testInput: CreateMeterReadingInput = {
      customer_id: customer.id,
      reading_date: new Date('2024-01-15'),
      current_reading: 123.45, // Use 2 decimal places to match DB precision
      previous_reading: 23.78
    };

    const result = await createMeterReading(testInput);

    // Verify all numeric fields are proper numbers
    expect(typeof result.current_reading).toBe('number');
    expect(typeof result.previous_reading).toBe('number');
    expect(typeof result.usage_calculated).toBe('number');
    
    expect(result.current_reading).toEqual(123.45);
    expect(result.previous_reading).toEqual(23.78);
    expect(result.usage_calculated).toEqual(99.67); // 123.45 - 23.78
  });
});