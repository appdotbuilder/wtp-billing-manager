import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, meterReadingsTable, billingConfigTable, invoicesTable } from '../db/schema';
import { type CreateInvoiceInput } from '../schema';
import { createInvoice } from '../handlers/create_invoice';
import { eq } from 'drizzle-orm';

describe('createInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const setupTestData = async () => {
    // Create a test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test Street',
        whatsapp_number: '+1234567890'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create a test meter reading
    const meterReadingResult = await db.insert(meterReadingsTable)
      .values({
        customer_id: customerId,
        reading_date: new Date(),
        current_reading: '150.50',
        previous_reading: '100.00',
        usage_calculated: '50.50'
      })
      .returning()
      .execute();

    const meterReadingId = meterReadingResult[0].id;

    // Create billing configuration
    const billingConfigResult = await db.insert(billingConfigTable)
      .values({
        price_per_unit: '2.5000',
        due_date_offset_days: 30
      })
      .returning()
      .execute();

    return {
      customerId,
      meterReadingId,
      billingConfig: billingConfigResult[0]
    };
  };

  it('should create an invoice with correct calculations', async () => {
    const { customerId, meterReadingId } = await setupTestData();

    const testInput: CreateInvoiceInput = {
      customer_id: customerId,
      meter_reading_id: meterReadingId,
      billing_period: '2024-01'
    };

    const result = await createInvoice(testInput);

    // Basic field validation
    expect(result.customer_id).toEqual(customerId);
    expect(result.meter_reading_id).toEqual(meterReadingId);
    expect(result.billing_period).toEqual('2024-01');
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Calculation validation
    expect(result.total_usage).toEqual(50.5); // usage_calculated from meter reading
    expect(result.price_per_unit).toEqual(2.5); // from billing config
    expect(result.amount_due).toEqual(126.25); // 50.5 * 2.5
    
    // Due date should be 30 days from now (billing config offset)
    const expectedDueDate = new Date();
    expectedDueDate.setDate(expectedDueDate.getDate() + 30);
    expect(result.due_date.toDateString()).toEqual(expectedDueDate.toDateString());

    // Verify numeric types
    expect(typeof result.total_usage).toBe('number');
    expect(typeof result.price_per_unit).toBe('number');
    expect(typeof result.amount_due).toBe('number');
  });

  it('should save invoice to database correctly', async () => {
    const { customerId, meterReadingId } = await setupTestData();

    const testInput: CreateInvoiceInput = {
      customer_id: customerId,
      meter_reading_id: meterReadingId,
      billing_period: '2024-02'
    };

    const result = await createInvoice(testInput);

    // Query the database to verify the invoice was saved
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, result.id))
      .execute();

    expect(invoices).toHaveLength(1);
    const savedInvoice = invoices[0];

    expect(savedInvoice.customer_id).toEqual(customerId);
    expect(savedInvoice.meter_reading_id).toEqual(meterReadingId);
    expect(savedInvoice.billing_period).toEqual('2024-02');
    expect(savedInvoice.status).toEqual('pending');
    expect(parseFloat(savedInvoice.total_usage)).toEqual(50.5);
    expect(parseFloat(savedInvoice.price_per_unit)).toEqual(2.5);
    expect(parseFloat(savedInvoice.amount_due)).toEqual(126.25);
  });

  it('should handle different billing configurations correctly', async () => {
    const { customerId, meterReadingId } = await setupTestData();

    // Update billing config with different values
    await db.insert(billingConfigTable)
      .values({
        price_per_unit: '1.7500',
        due_date_offset_days: 15
      })
      .execute();

    const testInput: CreateInvoiceInput = {
      customer_id: customerId,
      meter_reading_id: meterReadingId,
      billing_period: '2024-03'
    };

    const result = await createInvoice(testInput);

    // Should use the most recent billing config
    expect(result.price_per_unit).toEqual(1.75);
    expect(result.amount_due).toBeCloseTo(88.375, 2); // 50.5 * 1.75, rounded to 2 decimal places

    // Due date should be 15 days from now
    const expectedDueDate = new Date();
    expectedDueDate.setDate(expectedDueDate.getDate() + 15);
    expect(result.due_date.toDateString()).toEqual(expectedDueDate.toDateString());
  });

  it('should throw error when meter reading does not exist', async () => {
    const { customerId } = await setupTestData();
    
    const testInput: CreateInvoiceInput = {
      customer_id: customerId,
      meter_reading_id: 999, // Non-existent meter reading ID
      billing_period: '2024-01'
    };

    await expect(createInvoice(testInput)).rejects.toThrow(/meter reading.*not found/i);
  });

  it('should throw error when no billing configuration exists', async () => {
    const { customerId, meterReadingId } = await setupTestData();

    // Delete all billing configurations
    await db.delete(billingConfigTable).execute();

    const testInput: CreateInvoiceInput = {
      customer_id: customerId,
      meter_reading_id: meterReadingId,
      billing_period: '2024-01'
    };

    await expect(createInvoice(testInput)).rejects.toThrow(/no billing configuration found/i);
  });

  it('should handle zero usage correctly', async () => {
    const { customerId } = await setupTestData();

    // Create meter reading with zero usage
    const zeroUsageMeterResult = await db.insert(meterReadingsTable)
      .values({
        customer_id: customerId,
        reading_date: new Date(),
        current_reading: '100.00',
        previous_reading: '100.00',
        usage_calculated: '0.00'
      })
      .returning()
      .execute();

    const testInput: CreateInvoiceInput = {
      customer_id: customerId,
      meter_reading_id: zeroUsageMeterResult[0].id,
      billing_period: '2024-04'
    };

    const result = await createInvoice(testInput);

    expect(result.total_usage).toEqual(0);
    expect(result.amount_due).toEqual(0);
    expect(result.status).toEqual('pending');
  });
});