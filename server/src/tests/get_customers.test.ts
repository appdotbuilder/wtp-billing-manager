import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';

// Test customers data
const testCustomers: CreateCustomerInput[] = [
  {
    name: 'Charlie Wilson',
    address: '789 Oak Street',
    whatsapp_number: '+1234567890'
  },
  {
    name: 'Alice Johnson',
    address: '123 Main Street',
    whatsapp_number: '+0987654321'
  },
  {
    name: 'Bob Smith',
    address: '456 Elm Avenue',
    whatsapp_number: '+1122334455'
  }
];

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all customers ordered by name', async () => {
    // Insert test customers
    await db.insert(customersTable)
      .values(testCustomers)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(3);
    
    // Verify customers are ordered by name (Alice, Bob, Charlie)
    expect(result[0].name).toEqual('Alice Johnson');
    expect(result[1].name).toEqual('Bob Smith');
    expect(result[2].name).toEqual('Charlie Wilson');
    
    // Verify all fields are present
    result.forEach(customer => {
      expect(customer.id).toBeDefined();
      expect(typeof customer.id).toBe('number');
      expect(customer.name).toBeDefined();
      expect(customer.address).toBeDefined();
      expect(customer.whatsapp_number).toBeDefined();
      expect(customer.created_at).toBeInstanceOf(Date);
      expect(customer.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return customer with correct field values', async () => {
    const singleCustomer = testCustomers[0];
    
    await db.insert(customersTable)
      .values([singleCustomer])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    const customer = result[0];
    
    expect(customer.name).toEqual(singleCustomer.name);
    expect(customer.address).toEqual(singleCustomer.address);
    expect(customer.whatsapp_number).toEqual(singleCustomer.whatsapp_number);
    expect(customer.id).toBeGreaterThan(0);
    expect(customer.created_at).toBeInstanceOf(Date);
    expect(customer.updated_at).toBeInstanceOf(Date);
  });

  it('should handle large number of customers', async () => {
    // Create multiple customers with different names to test ordering
    const manyCustomers = Array.from({ length: 10 }, (_, i) => ({
      name: `Customer ${String.fromCharCode(90 - i)}`, // Z, Y, X, ... to test ordering
      address: `${100 + i} Test Street`,
      whatsapp_number: `+123456789${i}`
    }));

    await db.insert(customersTable)
      .values(manyCustomers)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(10);
    
    // Verify they are sorted alphabetically by name
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].name.localeCompare(result[i + 1].name)).toBeLessThanOrEqual(0);
    }
  });

  it('should verify database persistence after retrieval', async () => {
    await db.insert(customersTable)
      .values([testCustomers[0]])
      .execute();

    const result = await getCustomers();
    const customerId = result[0].id;

    // Verify data is still in database after retrieval
    const directQuery = await db.select()
      .from(customersTable)
      .execute();

    expect(directQuery).toHaveLength(1);
    expect(directQuery[0].id).toEqual(customerId);
    expect(directQuery[0].name).toEqual(testCustomers[0].name);
  });
});