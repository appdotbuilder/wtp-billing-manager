import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetCustomerByIdInput, type CreateCustomerInput } from '../schema';
import { getCustomerById } from '../handlers/get_customer_by_id';

// Test customer data
const testCustomer: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main Street, Cityville',
  whatsapp_number: '+1234567890'
};

const testCustomer2: CreateCustomerInput = {
  name: 'Jane Smith',
  address: '456 Oak Avenue, Townsburg',
  whatsapp_number: '+0987654321'
};

describe('getCustomerById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return customer when found', async () => {
    // Create a test customer
    const insertResult = await db.insert(customersTable)
      .values({
        name: testCustomer.name,
        address: testCustomer.address,
        whatsapp_number: testCustomer.whatsapp_number
      })
      .returning()
      .execute();

    const createdCustomer = insertResult[0];

    // Test the handler
    const input: GetCustomerByIdInput = { id: createdCustomer.id };
    const result = await getCustomerById(input);

    // Verify the result
    expect(result).toBeDefined();
    expect(result!.id).toEqual(createdCustomer.id);
    expect(result!.name).toEqual(testCustomer.name);
    expect(result!.address).toEqual(testCustomer.address);
    expect(result!.whatsapp_number).toEqual(testCustomer.whatsapp_number);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when customer not found', async () => {
    // Test with non-existent ID
    const input: GetCustomerByIdInput = { id: 99999 };
    const result = await getCustomerById(input);

    // Should return null
    expect(result).toBeNull();
  });

  it('should return correct customer when multiple customers exist', async () => {
    // Create multiple test customers
    const insertResult1 = await db.insert(customersTable)
      .values({
        name: testCustomer.name,
        address: testCustomer.address,
        whatsapp_number: testCustomer.whatsapp_number
      })
      .returning()
      .execute();

    const insertResult2 = await db.insert(customersTable)
      .values({
        name: testCustomer2.name,
        address: testCustomer2.address,
        whatsapp_number: testCustomer2.whatsapp_number
      })
      .returning()
      .execute();

    const customer1 = insertResult1[0];
    const customer2 = insertResult2[0];

    // Test retrieving the first customer
    const input1: GetCustomerByIdInput = { id: customer1.id };
    const result1 = await getCustomerById(input1);

    expect(result1).toBeDefined();
    expect(result1!.id).toEqual(customer1.id);
    expect(result1!.name).toEqual(testCustomer.name);

    // Test retrieving the second customer
    const input2: GetCustomerByIdInput = { id: customer2.id };
    const result2 = await getCustomerById(input2);

    expect(result2).toBeDefined();
    expect(result2!.id).toEqual(customer2.id);
    expect(result2!.name).toEqual(testCustomer2.name);
  });

  it('should maintain data integrity after retrieval', async () => {
    // Create a test customer
    const insertResult = await db.insert(customersTable)
      .values({
        name: testCustomer.name,
        address: testCustomer.address,
        whatsapp_number: testCustomer.whatsapp_number
      })
      .returning()
      .execute();

    const createdCustomer = insertResult[0];

    // Retrieve the customer
    const input: GetCustomerByIdInput = { id: createdCustomer.id };
    const result = await getCustomerById(input);

    // Verify the customer still exists in database unchanged
    const dbCheck = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, createdCustomer.id))
      .execute();

    expect(dbCheck).toHaveLength(1);
    expect(dbCheck[0].name).toEqual(testCustomer.name);
    expect(dbCheck[0].address).toEqual(testCustomer.address);
    expect(dbCheck[0].whatsapp_number).toEqual(testCustomer.whatsapp_number);

    // Verify returned data matches database data
    expect(result).toEqual(dbCheck[0]);
  });

  it('should handle edge case with ID zero', async () => {
    // Test with ID 0 (which should not exist)
    const input: GetCustomerByIdInput = { id: 0 };
    const result = await getCustomerById(input);

    expect(result).toBeNull();
  });

  it('should handle negative ID gracefully', async () => {
    // Test with negative ID
    const input: GetCustomerByIdInput = { id: -1 };
    const result = await getCustomerById(input);

    expect(result).toBeNull();
  });
});