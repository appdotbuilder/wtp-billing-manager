import { db } from '../db';
import { customersTable } from '../db/schema';
import { type DeleteCustomerInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteCustomer(input: DeleteCustomerInput): Promise<{ success: boolean }> {
  try {
    // First check if customer exists
    const existingCustomers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.id))
      .execute();

    if (existingCustomers.length === 0) {
      throw new Error(`Customer with id ${input.id} not found`);
    }

    // Delete the customer - cascading deletes will handle meter readings and invoices
    const result = await db.delete(customersTable)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Customer deletion failed:', error);
    throw error;
  }
}