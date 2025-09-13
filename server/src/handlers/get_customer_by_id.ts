import { db } from '../db';
import { customersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetCustomerByIdInput, type Customer } from '../schema';

export const getCustomerById = async (input: GetCustomerByIdInput): Promise<Customer | null> => {
  try {
    // Query for the customer by ID
    const results = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.id))
      .execute();

    // Return the customer if found, null otherwise
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Customer retrieval failed:', error);
    throw error;
  }
};