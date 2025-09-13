import { db } from '../db';
import { billingConfigTable } from '../db/schema';
import { type BillingConfig } from '../schema';

export const getBillingConfig = async (): Promise<BillingConfig> => {
  try {
    // First, try to get existing billing configuration
    const result = await db.select()
      .from(billingConfigTable)
      .limit(1)
      .execute();

    if (result.length > 0) {
      // Convert numeric fields back to numbers before returning
      const config = result[0];
      return {
        ...config,
        price_per_unit: parseFloat(config.price_per_unit),
        due_date_offset_days: config.due_date_offset_days
      };
    }

    // If no configuration exists, create default one
    const defaultConfig = await db.insert(billingConfigTable)
      .values({
        price_per_unit: '10.0', // Convert number to string for numeric column
        due_date_offset_days: 15
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const config = defaultConfig[0];
    return {
      ...config,
      price_per_unit: parseFloat(config.price_per_unit),
      due_date_offset_days: config.due_date_offset_days
    };
  } catch (error) {
    console.error('Failed to get billing configuration:', error);
    throw error;
  }
};