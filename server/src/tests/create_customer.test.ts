import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main Street, Anytown',
  whatsapp_number: '+1234567890'
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.address).toEqual(testInput.address);
    expect(result.whatsapp_number).toEqual(testInput.whatsapp_number);
    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('John Doe');
    expect(customers[0].address).toEqual(testInput.address);
    expect(customers[0].whatsapp_number).toEqual(testInput.whatsapp_number);
    expect(customers[0].created_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle special characters in customer data', async () => {
    const specialInput: CreateCustomerInput = {
      name: "José María O'Connor",
      address: "Apt 5B, 123 Oak St. (Building #2)",
      whatsapp_number: "+1 (555) 123-4567"
    };

    const result = await createCustomer(specialInput);

    expect(result.name).toEqual(specialInput.name);
    expect(result.address).toEqual(specialInput.address);
    expect(result.whatsapp_number).toEqual(specialInput.whatsapp_number);

    // Verify in database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers[0].name).toEqual(specialInput.name);
    expect(customers[0].address).toEqual(specialInput.address);
    expect(customers[0].whatsapp_number).toEqual(specialInput.whatsapp_number);
  });

  it('should create multiple customers with unique IDs', async () => {
    const customer1Input: CreateCustomerInput = {
      name: 'Alice Smith',
      address: '456 Elm Avenue',
      whatsapp_number: '+1987654321'
    };

    const customer2Input: CreateCustomerInput = {
      name: 'Bob Johnson',
      address: '789 Pine Road',
      whatsapp_number: '+1122334455'
    };

    const result1 = await createCustomer(customer1Input);
    const result2 = await createCustomer(customer2Input);

    // Verify unique IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).toBeGreaterThan(0);
    expect(result2.id).toBeGreaterThan(0);

    // Verify both customers exist in database
    const allCustomers = await db.select()
      .from(customersTable)
      .execute();

    expect(allCustomers).toHaveLength(2);
    
    const customer1 = allCustomers.find(c => c.id === result1.id);
    const customer2 = allCustomers.find(c => c.id === result2.id);

    expect(customer1?.name).toEqual('Alice Smith');
    expect(customer2?.name).toEqual('Bob Johnson');
  });

  it('should set created_at and updated_at timestamps', async () => {
    const beforeCreation = new Date();
    
    const result = await createCustomer(testInput);
    
    const afterCreation = new Date();

    // Verify timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    
    // Initially, created_at and updated_at should be the same
    expect(result.created_at.getTime()).toEqual(result.updated_at.getTime());
  });
});