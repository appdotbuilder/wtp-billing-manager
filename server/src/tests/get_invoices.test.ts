import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, meterReadingsTable, invoicesTable, billingConfigTable } from '../db/schema';
import { type GetInvoicesByCustomerInput } from '../schema';
import { getInvoices } from '../handlers/get_invoices';

describe('getInvoices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create customers
    const customers = await db.insert(customersTable)
      .values([
        {
          name: 'John Doe',
          address: '123 Main St',
          whatsapp_number: '+1234567890'
        },
        {
          name: 'Jane Smith',
          address: '456 Oak Ave',
          whatsapp_number: '+0987654321'
        }
      ])
      .returning()
      .execute();

    // Create billing config
    await db.insert(billingConfigTable)
      .values({
        price_per_unit: '2.50',
        due_date_offset_days: 15
      })
      .execute();

    // Create meter readings
    const meterReadings = await db.insert(meterReadingsTable)
      .values([
        {
          customer_id: customers[0].id,
          reading_date: new Date('2024-01-01'),
          current_reading: '150.00',
          previous_reading: '100.00',
          usage_calculated: '50.00'
        },
        {
          customer_id: customers[1].id,
          reading_date: new Date('2024-01-02'),
          current_reading: '200.00',
          previous_reading: '150.00',
          usage_calculated: '50.00'
        },
        {
          customer_id: customers[0].id,
          reading_date: new Date('2024-02-01'),
          current_reading: '200.00',
          previous_reading: '150.00',
          usage_calculated: '50.00'
        }
      ])
      .returning()
      .execute();

    // Create invoices with different statuses and dates - create them sequentially to ensure proper timestamps
    const invoices = [];
    
    // First invoice (oldest)
    const invoice1 = await db.insert(invoicesTable)
      .values({
        customer_id: customers[0].id,
        meter_reading_id: meterReadings[0].id,
        billing_period: '2024-01',
        total_usage: '50.00',
        price_per_unit: '2.5000',
        amount_due: '125.00',
        due_date: new Date('2024-01-16'),
        status: 'pending'
      })
      .returning()
      .execute();
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Second invoice
    const invoice2 = await db.insert(invoicesTable)
      .values({
        customer_id: customers[1].id,
        meter_reading_id: meterReadings[1].id,
        billing_period: '2024-01',
        total_usage: '50.00',
        price_per_unit: '2.5000',
        amount_due: '125.00',
        due_date: new Date('2024-01-17'),
        status: 'paid'
      })
      .returning()
      .execute();
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Third invoice (newest)
    const invoice3 = await db.insert(invoicesTable)
      .values({
        customer_id: customers[0].id,
        meter_reading_id: meterReadings[2].id,
        billing_period: '2024-02',
        total_usage: '50.00',
        price_per_unit: '2.5000',
        amount_due: '125.00',
        due_date: new Date('2024-02-16'),
        status: 'overdue'
      })
      .returning()
      .execute();
    
    invoices.push(...invoice1, ...invoice2, ...invoice3);

    return { customers, meterReadings, invoices };
  };

  it('should return all invoices when no filters are provided', async () => {
    const { invoices: testInvoices } = await createTestData();

    const input: GetInvoicesByCustomerInput = {};
    const result = await getInvoices(input);

    expect(result).toHaveLength(3);
    
    // Should be ordered by created_at descending (newest first)
    expect(result[0].billing_period).toEqual('2024-02');
    expect(result[1].billing_period).toEqual('2024-01');
    expect(result[2].billing_period).toEqual('2024-01');

    // Verify numeric conversions
    result.forEach(invoice => {
      expect(typeof invoice.total_usage).toBe('number');
      expect(typeof invoice.price_per_unit).toBe('number');
      expect(typeof invoice.amount_due).toBe('number');
      expect(invoice.total_usage).toEqual(50);
      expect(invoice.price_per_unit).toEqual(2.5);
      expect(invoice.amount_due).toEqual(125);
    });
  });

  it('should filter invoices by customer_id', async () => {
    const { customers } = await createTestData();

    const input: GetInvoicesByCustomerInput = {
      customer_id: customers[0].id
    };
    const result = await getInvoices(input);

    expect(result).toHaveLength(2);
    result.forEach(invoice => {
      expect(invoice.customer_id).toEqual(customers[0].id);
    });

    // Verify ordering (newest first)
    expect(result[0].billing_period).toEqual('2024-02');
    expect(result[1].billing_period).toEqual('2024-01');
  });

  it('should filter invoices by status', async () => {
    await createTestData();

    const input: GetInvoicesByCustomerInput = {
      status: 'pending'
    };
    const result = await getInvoices(input);

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('pending');
    expect(result[0].billing_period).toEqual('2024-01');
  });

  it('should filter invoices by both customer_id and status', async () => {
    const { customers } = await createTestData();

    const input: GetInvoicesByCustomerInput = {
      customer_id: customers[0].id,
      status: 'overdue'
    };
    const result = await getInvoices(input);

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toEqual(customers[0].id);
    expect(result[0].status).toEqual('overdue');
    expect(result[0].billing_period).toEqual('2024-02');
  });

  it('should return empty array when no invoices match filters', async () => {
    const { customers } = await createTestData();

    const input: GetInvoicesByCustomerInput = {
      customer_id: customers[1].id,
      status: 'overdue'
    };
    const result = await getInvoices(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when customer has no invoices', async () => {
    await createTestData();

    // Create another customer with no invoices
    const newCustomer = await db.insert(customersTable)
      .values({
        name: 'Bob Wilson',
        address: '789 Pine St',
        whatsapp_number: '+1122334455'
      })
      .returning()
      .execute();

    const input: GetInvoicesByCustomerInput = {
      customer_id: newCustomer[0].id
    };
    const result = await getInvoices(input);

    expect(result).toHaveLength(0);
  });

  it('should include all required invoice fields', async () => {
    const { customers, meterReadings } = await createTestData();

    const input: GetInvoicesByCustomerInput = {
      customer_id: customers[0].id
    };
    const result = await getInvoices(input);

    expect(result.length).toBeGreaterThan(0);
    const invoice = result[0];

    // Check all required fields exist
    expect(invoice.id).toBeDefined();
    expect(invoice.customer_id).toBeDefined();
    expect(invoice.meter_reading_id).toBeDefined();
    expect(invoice.billing_period).toBeDefined();
    expect(invoice.total_usage).toBeDefined();
    expect(invoice.price_per_unit).toBeDefined();
    expect(invoice.amount_due).toBeDefined();
    expect(invoice.due_date).toBeInstanceOf(Date);
    expect(invoice.status).toBeDefined();
    expect(invoice.created_at).toBeInstanceOf(Date);
    expect(invoice.updated_at).toBeInstanceOf(Date);

    // Verify numeric fields are correctly converted
    expect(typeof invoice.total_usage).toBe('number');
    expect(typeof invoice.price_per_unit).toBe('number');
    expect(typeof invoice.amount_due).toBe('number');
  });

  it('should handle all possible invoice statuses', async () => {
    await createTestData();

    // Test each status individually
    const statuses = ['pending', 'paid', 'overdue'] as const;

    for (const status of statuses) {
      const input: GetInvoicesByCustomerInput = { status };
      const result = await getInvoices(input);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(invoice => {
        expect(invoice.status).toEqual(status);
      });
    }
  });
});