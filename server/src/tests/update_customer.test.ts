import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateCustomerInput, type CreateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/update_customer';

// Test data
const testCustomerInput: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main Street',
  whatsapp_number: '+1234567890'
};

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update customer name', async () => {
    // Create a customer first
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update only the name
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Jane Smith'
    };

    const result = await updateCustomer(updateInput);

    // Verify the update
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Jane Smith');
    expect(result.address).toEqual('123 Main Street'); // Should remain unchanged
    expect(result.whatsapp_number).toEqual('+1234567890'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update customer address', async () => {
    // Create a customer first
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update only the address
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      address: '456 Oak Avenue'
    };

    const result = await updateCustomer(updateInput);

    // Verify the update
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.address).toEqual('456 Oak Avenue');
    expect(result.whatsapp_number).toEqual('+1234567890'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update customer whatsapp number', async () => {
    // Create a customer first
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update only the WhatsApp number
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      whatsapp_number: '+9876543210'
    };

    const result = await updateCustomer(updateInput);

    // Verify the update
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.address).toEqual('123 Main Street'); // Should remain unchanged
    expect(result.whatsapp_number).toEqual('+9876543210');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    // Create a customer first
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update multiple fields
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Alice Johnson',
      address: '789 Pine Road',
      whatsapp_number: '+5555555555'
    };

    const result = await updateCustomer(updateInput);

    // Verify all updates
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Alice Johnson');
    expect(result.address).toEqual('789 Pine Road');
    expect(result.whatsapp_number).toEqual('+5555555555');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Create a customer first
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;
    const originalUpdatedAt = createdCustomer[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update the customer
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Updated Name'
    };

    const result = await updateCustomer(updateInput);

    // Verify updated_at changed
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should save changes to database', async () => {
    // Create a customer first
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update the customer
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Database Test Name',
      address: 'Database Test Address'
    };

    await updateCustomer(updateInput);

    // Verify changes were persisted to database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Database Test Name');
    expect(customers[0].address).toEqual('Database Test Address');
    expect(customers[0].whatsapp_number).toEqual('+1234567890'); // Should remain unchanged
  });

  it('should throw error for non-existent customer', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 999999, // Non-existent ID
      name: 'Should Fail'
    };

    await expect(updateCustomer(updateInput)).rejects.toThrow(/customer with id 999999 not found/i);
  });

  it('should handle partial updates without overriding existing values', async () => {
    // Create a customer first
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update only one field
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Partial Update Name'
    };

    const result = await updateCustomer(updateInput);

    // Verify only the specified field was updated
    expect(result.name).toEqual('Partial Update Name');
    expect(result.address).toEqual(testCustomerInput.address); // Original value preserved
    expect(result.whatsapp_number).toEqual(testCustomerInput.whatsapp_number); // Original value preserved
  });
});