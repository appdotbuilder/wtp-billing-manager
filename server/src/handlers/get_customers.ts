import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';
import { asc } from 'drizzle-orm';

export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const results = await db.select()
      .from(customersTable)
      .orderBy(asc(customersTable.name))
      .execute();

    return results;
  } catch (error) {
    console.error('Get customers failed:', error);
    throw error;
  }
};