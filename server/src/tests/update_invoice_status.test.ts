import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, meterReadingsTable, invoicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateInvoiceStatusInput } from '../schema';
import { updateInvoiceStatus } from '../handlers/update_invoice_status';

// Test setup data
const testCustomer = {
  name: 'Test Customer',
  address: '123 Test Street',
  whatsapp_number: '+1234567890'
};

const testMeterReading = {
  customer_id: 1, // Will be set after customer creation
  reading_date: new Date('2024-01-15'),
  current_reading: '150.00',
  previous_reading: '100.00',
  usage_calculated: '50.00'
};

const testInvoice = {
  customer_id: 1, // Will be set after customer creation
  meter_reading_id: 1, // Will be set after meter reading creation
  billing_period: '2024-01',
  total_usage: '50.00',
  price_per_unit: '10.5000',
  amount_due: '525.00',
  due_date: new Date('2024-02-15'),
  status: 'pending' as const
};

describe('updateInvoiceStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update invoice status from pending to paid', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const meterReadingResult = await db.insert(meterReadingsTable)
      .values({
        ...testMeterReading,
        customer_id: customerId
      })
      .returning()
      .execute();
    const meterReadingId = meterReadingResult[0].id;

    const invoiceResult = await db.insert(invoicesTable)
      .values({
        ...testInvoice,
        customer_id: customerId,
        meter_reading_id: meterReadingId
      })
      .returning()
      .execute();
    const invoiceId = invoiceResult[0].id;

    const input: UpdateInvoiceStatusInput = {
      id: invoiceId,
      status: 'paid'
    };

    // Test the handler
    const result = await updateInvoiceStatus(input);

    // Verify the result
    expect(result.id).toEqual(invoiceId);
    expect(result.status).toEqual('paid');
    expect(result.customer_id).toEqual(customerId);
    expect(result.meter_reading_id).toEqual(meterReadingId);
    expect(result.billing_period).toEqual('2024-01');
    expect(result.total_usage).toEqual(50.00);
    expect(result.price_per_unit).toEqual(10.5000);
    expect(result.amount_due).toEqual(525.00);
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_usage).toBe('number');
    expect(typeof result.price_per_unit).toBe('number');
    expect(typeof result.amount_due).toBe('number');
  });

  it('should update invoice status from pending to overdue', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const meterReadingResult = await db.insert(meterReadingsTable)
      .values({
        ...testMeterReading,
        customer_id: customerId
      })
      .returning()
      .execute();
    const meterReadingId = meterReadingResult[0].id;

    const invoiceResult = await db.insert(invoicesTable)
      .values({
        ...testInvoice,
        customer_id: customerId,
        meter_reading_id: meterReadingId
      })
      .returning()
      .execute();
    const invoiceId = invoiceResult[0].id;

    const input: UpdateInvoiceStatusInput = {
      id: invoiceId,
      status: 'overdue'
    };

    const result = await updateInvoiceStatus(input);

    expect(result.status).toEqual('overdue');
    expect(result.id).toEqual(invoiceId);
  });

  it('should save updated status to database', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const meterReadingResult = await db.insert(meterReadingsTable)
      .values({
        ...testMeterReading,
        customer_id: customerId
      })
      .returning()
      .execute();
    const meterReadingId = meterReadingResult[0].id;

    const invoiceResult = await db.insert(invoicesTable)
      .values({
        ...testInvoice,
        customer_id: customerId,
        meter_reading_id: meterReadingId
      })
      .returning()
      .execute();
    const invoiceId = invoiceResult[0].id;

    const input: UpdateInvoiceStatusInput = {
      id: invoiceId,
      status: 'paid'
    };

    const originalTimestamp = invoiceResult[0].updated_at;

    // Small delay to ensure updated_at changes
    await new Promise(resolve => setTimeout(resolve, 10));

    await updateInvoiceStatus(input);

    // Verify the update was saved to database
    const updatedInvoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    expect(updatedInvoices).toHaveLength(1);
    const updatedInvoice = updatedInvoices[0];
    expect(updatedInvoice.status).toEqual('paid');
    expect(updatedInvoice.updated_at > originalTimestamp).toBe(true);
  });

  it('should throw error when invoice does not exist', async () => {
    const input: UpdateInvoiceStatusInput = {
      id: 999,
      status: 'paid'
    };

    await expect(updateInvoiceStatus(input)).rejects.toThrow(/invoice with id 999 not found/i);
  });

  it('should update invoice status from paid back to pending', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const meterReadingResult = await db.insert(meterReadingsTable)
      .values({
        ...testMeterReading,
        customer_id: customerId
      })
      .returning()
      .execute();
    const meterReadingId = meterReadingResult[0].id;

    // Create invoice with paid status
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        ...testInvoice,
        customer_id: customerId,
        meter_reading_id: meterReadingId,
        status: 'paid'
      })
      .returning()
      .execute();
    const invoiceId = invoiceResult[0].id;

    const input: UpdateInvoiceStatusInput = {
      id: invoiceId,
      status: 'pending'
    };

    const result = await updateInvoiceStatus(input);

    expect(result.status).toEqual('pending');
    expect(result.id).toEqual(invoiceId);

    // Verify in database
    const dbInvoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    expect(dbInvoices[0].status).toEqual('pending');
  });

  it('should preserve all other invoice fields when updating status', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const meterReadingResult = await db.insert(meterReadingsTable)
      .values({
        ...testMeterReading,
        customer_id: customerId
      })
      .returning()
      .execute();
    const meterReadingId = meterReadingResult[0].id;

    const invoiceResult = await db.insert(invoicesTable)
      .values({
        ...testInvoice,
        customer_id: customerId,
        meter_reading_id: meterReadingId
      })
      .returning()
      .execute();
    const invoiceId = invoiceResult[0].id;
    const originalInvoice = invoiceResult[0];

    const input: UpdateInvoiceStatusInput = {
      id: invoiceId,
      status: 'overdue'
    };

    const result = await updateInvoiceStatus(input);

    // Verify all other fields are preserved
    expect(result.customer_id).toEqual(originalInvoice.customer_id);
    expect(result.meter_reading_id).toEqual(originalInvoice.meter_reading_id);
    expect(result.billing_period).toEqual(originalInvoice.billing_period);
    expect(result.total_usage).toEqual(parseFloat(originalInvoice.total_usage));
    expect(result.price_per_unit).toEqual(parseFloat(originalInvoice.price_per_unit));
    expect(result.amount_due).toEqual(parseFloat(originalInvoice.amount_due));
    expect(result.due_date.getTime()).toEqual(originalInvoice.due_date.getTime());
    expect(result.created_at.getTime()).toEqual(originalInvoice.created_at.getTime());
    // Only status and updated_at should change
    expect(result.status).toEqual('overdue');
    expect(result.status).not.toEqual(originalInvoice.status);
    expect(result.updated_at > originalInvoice.updated_at).toBe(true);
  });
});