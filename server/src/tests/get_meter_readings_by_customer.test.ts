import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, meterReadingsTable } from '../db/schema';
import { type GetMeterReadingsByCustomerInput } from '../schema';
import { getMeterReadingsByCustomer } from '../handlers/get_meter_readings_by_customer';

// Test data setup
const testCustomer1 = {
  name: 'John Doe',
  address: '123 Main St',
  whatsapp_number: '+1234567890'
};

const testCustomer2 = {
  name: 'Jane Smith', 
  address: '456 Oak Ave',
  whatsapp_number: '+0987654321'
};

describe('getMeterReadingsByCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return meter readings for a specific customer ordered by date descending', async () => {
    // Create test customers
    const [customer1, customer2] = await db.insert(customersTable)
      .values([testCustomer1, testCustomer2])
      .returning()
      .execute();

    // Create meter readings for customer1 with different dates
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await db.insert(meterReadingsTable)
      .values([
        {
          customer_id: customer1.id,
          reading_date: twoDaysAgo,
          current_reading: '100.50',
          previous_reading: '90.25',
          usage_calculated: '10.25'
        },
        {
          customer_id: customer1.id,
          reading_date: now,
          current_reading: '120.75',
          previous_reading: '100.50',
          usage_calculated: '20.25'
        },
        {
          customer_id: customer1.id,
          reading_date: yesterday,
          current_reading: '110.25',
          previous_reading: '100.50',
          usage_calculated: '9.75'
        },
        // Add a reading for customer2 to ensure filtering works
        {
          customer_id: customer2.id,
          reading_date: now,
          current_reading: '50.00',
          previous_reading: '40.00',
          usage_calculated: '10.00'
        }
      ])
      .execute();

    const input: GetMeterReadingsByCustomerInput = {
      customer_id: customer1.id
    };

    const result = await getMeterReadingsByCustomer(input);

    // Should return 3 readings for customer1, ordered by date descending
    expect(result).toHaveLength(3);

    // Verify ordering (newest first)
    expect(result[0].reading_date.getTime()).toBe(now.getTime());
    expect(result[1].reading_date.getTime()).toBe(yesterday.getTime());
    expect(result[2].reading_date.getTime()).toBe(twoDaysAgo.getTime());

    // Verify numeric conversions and field values
    expect(typeof result[0].current_reading).toBe('number');
    expect(typeof result[0].usage_calculated).toBe('number');
    expect(result[0].current_reading).toBe(120.75);
    expect(result[0].previous_reading).toBe(100.50);
    expect(result[0].usage_calculated).toBe(20.25);

    // Verify all readings belong to the correct customer
    result.forEach(reading => {
      expect(reading.customer_id).toBe(customer1.id);
      expect(reading.id).toBeDefined();
      expect(reading.created_at).toBeInstanceOf(Date);
      expect(reading.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for customer with no meter readings', async () => {
    // Create a customer
    const [customer] = await db.insert(customersTable)
      .values([testCustomer1])
      .returning()
      .execute();

    const input: GetMeterReadingsByCustomerInput = {
      customer_id: customer.id
    };

    const result = await getMeterReadingsByCustomer(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle null previous_reading correctly', async () => {
    // Create test customer
    const [customer] = await db.insert(customersTable)
      .values([testCustomer1])
      .returning()
      .execute();

    // Create meter reading with null previous_reading
    await db.insert(meterReadingsTable)
      .values([
        {
          customer_id: customer.id,
          reading_date: new Date(),
          current_reading: '75.50',
          previous_reading: null,
          usage_calculated: '75.50'
        }
      ])
      .execute();

    const input: GetMeterReadingsByCustomerInput = {
      customer_id: customer.id
    };

    const result = await getMeterReadingsByCustomer(input);

    expect(result).toHaveLength(1);
    expect(result[0].current_reading).toBe(75.50);
    expect(result[0].previous_reading).toBe(null);
    expect(result[0].usage_calculated).toBe(75.50);
  });

  it('should return empty array for non-existent customer', async () => {
    const input: GetMeterReadingsByCustomerInput = {
      customer_id: 999999 // Non-existent customer ID
    };

    const result = await getMeterReadingsByCustomer(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle multiple readings with same date correctly', async () => {
    // Create test customer
    const [customer] = await db.insert(customersTable)
      .values([testCustomer1])
      .returning()
      .execute();

    const sameDate = new Date();

    // Create multiple readings on the same date
    await db.insert(meterReadingsTable)
      .values([
        {
          customer_id: customer.id,
          reading_date: sameDate,
          current_reading: '100.00',
          previous_reading: '90.00',
          usage_calculated: '10.00'
        },
        {
          customer_id: customer.id,
          reading_date: sameDate,
          current_reading: '110.00',
          previous_reading: '100.00',
          usage_calculated: '10.00'
        }
      ])
      .execute();

    const input: GetMeterReadingsByCustomerInput = {
      customer_id: customer.id
    };

    const result = await getMeterReadingsByCustomer(input);

    expect(result).toHaveLength(2);
    result.forEach(reading => {
      expect(reading.reading_date.getTime()).toBe(sameDate.getTime());
      expect(reading.customer_id).toBe(customer.id);
      expect(typeof reading.current_reading).toBe('number');
      expect(typeof reading.usage_calculated).toBe('number');
    });
  });
});