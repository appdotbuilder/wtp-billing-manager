import { db } from '../db';
import { customersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateCustomerInput, type Customer } from '../schema';

export const updateCustomer = async (input: UpdateCustomerInput): Promise<Customer> => {
  try {
    // First check if the customer exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.id))
      .execute();

    if (existingCustomer.length === 0) {
      throw new Error(`Customer with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.address !== undefined) {
      updateData.address = input.address;
    }

    if (input.whatsapp_number !== undefined) {
      updateData.whatsapp_number = input.whatsapp_number;
    }

    // Update the customer record
    const result = await db.update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer update failed:', error);
    throw error;
  }
};