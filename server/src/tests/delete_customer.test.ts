import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, meterReadingsTable, invoicesTable, billingConfigTable } from '../db/schema';
import { type DeleteCustomerInput } from '../schema';
import { deleteCustomer } from '../handlers/delete_customer';
import { eq } from 'drizzle-orm';

describe('deleteCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a customer successfully', async () => {
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

    const input: DeleteCustomerInput = {
      id: customerId
    };

    const result = await deleteCustomer(input);

    expect(result.success).toBe(true);

    // Verify customer is deleted from database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(0);
  });

  it('should throw error when customer does not exist', async () => {
    const input: DeleteCustomerInput = {
      id: 999
    };

    expect(deleteCustomer(input)).rejects.toThrow(/Customer with id 999 not found/i);
  });

  it('should cascade delete meter readings and invoices', async () => {
    // Create billing config first (required for invoices)
    await db.insert(billingConfigTable)
      .values({
        price_per_unit: '0.50',
        due_date_offset_days: 15
      })
      .execute();

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

    // Create meter reading for the customer
    const meterReadingResult = await db.insert(meterReadingsTable)
      .values({
        customer_id: customerId,
        reading_date: new Date(),
        current_reading: '150.00',
        previous_reading: '100.00',
        usage_calculated: '50.00'
      })
      .returning()
      .execute();

    const meterReadingId = meterReadingResult[0].id;

    // Create invoice for the customer
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    await db.insert(invoicesTable)
      .values({
        customer_id: customerId,
        meter_reading_id: meterReadingId,
        billing_period: '2024-01',
        total_usage: '50.00',
        price_per_unit: '0.50',
        amount_due: '25.00',
        due_date: dueDate,
        status: 'pending'
      })
      .execute();

    // Verify data exists before deletion
    const meterReadingsBefore = await db.select()
      .from(meterReadingsTable)
      .where(eq(meterReadingsTable.customer_id, customerId))
      .execute();

    const invoicesBefore = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.customer_id, customerId))
      .execute();

    expect(meterReadingsBefore).toHaveLength(1);
    expect(invoicesBefore).toHaveLength(1);

    // Delete the customer
    const input: DeleteCustomerInput = {
      id: customerId
    };

    const result = await deleteCustomer(input);

    expect(result.success).toBe(true);

    // Verify customer is deleted
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(0);

    // Verify meter readings are cascaded deleted
    const meterReadingsAfter = await db.select()
      .from(meterReadingsTable)
      .where(eq(meterReadingsTable.customer_id, customerId))
      .execute();

    expect(meterReadingsAfter).toHaveLength(0);

    // Verify invoices are cascaded deleted
    const invoicesAfter = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.customer_id, customerId))
      .execute();

    expect(invoicesAfter).toHaveLength(0);
  });

  it('should handle customer deletion with multiple meter readings', async () => {
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

    // Create multiple meter readings
    await db.insert(meterReadingsTable)
      .values([
        {
          customer_id: customerId,
          reading_date: new Date('2024-01-01'),
          current_reading: '100.00',
          previous_reading: '50.00',
          usage_calculated: '50.00'
        },
        {
          customer_id: customerId,
          reading_date: new Date('2024-02-01'),
          current_reading: '150.00',
          previous_reading: '100.00',
          usage_calculated: '50.00'
        }
      ])
      .execute();

    // Verify meter readings exist
    const meterReadingsBefore = await db.select()
      .from(meterReadingsTable)
      .where(eq(meterReadingsTable.customer_id, customerId))
      .execute();

    expect(meterReadingsBefore).toHaveLength(2);

    // Delete the customer
    const input: DeleteCustomerInput = {
      id: customerId
    };

    const result = await deleteCustomer(input);

    expect(result.success).toBe(true);

    // Verify all meter readings are cascaded deleted
    const meterReadingsAfter = await db.select()
      .from(meterReadingsTable)
      .where(eq(meterReadingsTable.customer_id, customerId))
      .execute();

    expect(meterReadingsAfter).toHaveLength(0);
  });

  it('should handle deletion with zero as customer id', async () => {
    const input: DeleteCustomerInput = {
      id: 0
    };

    expect(deleteCustomer(input)).rejects.toThrow(/Customer with id 0 not found/i);
  });
});