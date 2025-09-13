import { db } from '../db';
import { billingConfigTable } from '../db/schema';
import { type UpdateBillingConfigInput, type BillingConfig } from '../schema';

export const updateBillingConfig = async (input: UpdateBillingConfigInput): Promise<BillingConfig> => {
  try {
    // First, check if a billing config already exists
    const existingConfigs = await db.select()
      .from(billingConfigTable)
      .limit(1)
      .execute();

    let result;

    if (existingConfigs.length > 0) {
      // Update existing config
      const updateData: any = {};
      
      if (input.price_per_unit !== undefined) {
        updateData.price_per_unit = input.price_per_unit.toString();
      }
      
      if (input.due_date_offset_days !== undefined) {
        updateData.due_date_offset_days = input.due_date_offset_days;
      }

      // Only update if there's something to update
      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date();
        
        const updateResult = await db.update(billingConfigTable)
          .set(updateData)
          .returning()
          .execute();
        
        result = updateResult[0];
      } else {
        result = existingConfigs[0];
      }
    } else {
      // Create new config with provided values or defaults
      const insertData = {
        price_per_unit: (input.price_per_unit || 10.0).toString(),
        due_date_offset_days: input.due_date_offset_days || 15
      };

      const insertResult = await db.insert(billingConfigTable)
        .values(insertData)
        .returning()
        .execute();
      
      result = insertResult[0];
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...result,
      price_per_unit: parseFloat(result.price_per_unit)
    };
  } catch (error) {
    console.error('Billing config update failed:', error);
    throw error;
  }
};