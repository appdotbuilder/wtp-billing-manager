import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { billingConfigTable } from '../db/schema';
import { type UpdateBillingConfigInput } from '../schema';
import { updateBillingConfig } from '../handlers/update_billing_config';
import { eq } from 'drizzle-orm';

describe('updateBillingConfig', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new billing config when none exists', async () => {
    const testInput: UpdateBillingConfigInput = {
      price_per_unit: 15.50,
      due_date_offset_days: 20
    };

    const result = await updateBillingConfig(testInput);

    expect(result.price_per_unit).toEqual(15.50);
    expect(typeof result.price_per_unit).toBe('number');
    expect(result.due_date_offset_days).toEqual(20);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create config with defaults when no input provided', async () => {
    const testInput: UpdateBillingConfigInput = {};

    const result = await updateBillingConfig(testInput);

    expect(result.price_per_unit).toEqual(10.0);
    expect(result.due_date_offset_days).toEqual(15);
    expect(result.id).toBeDefined();
  });

  it('should create config with partial input and defaults', async () => {
    const testInput: UpdateBillingConfigInput = {
      price_per_unit: 12.75
    };

    const result = await updateBillingConfig(testInput);

    expect(result.price_per_unit).toEqual(12.75);
    expect(result.due_date_offset_days).toEqual(15); // Default value
  });

  it('should update existing billing config', async () => {
    // Create initial config
    await db.insert(billingConfigTable)
      .values({
        price_per_unit: '10.0',
        due_date_offset_days: 15
      })
      .execute();

    const updateInput: UpdateBillingConfigInput = {
      price_per_unit: 25.99,
      due_date_offset_days: 30
    };

    const result = await updateBillingConfig(updateInput);

    expect(result.price_per_unit).toEqual(25.99);
    expect(result.due_date_offset_days).toEqual(30);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields in existing config', async () => {
    // Create initial config
    const initialResult = await db.insert(billingConfigTable)
      .values({
        price_per_unit: '8.50',
        due_date_offset_days: 10
      })
      .returning()
      .execute();

    const initialConfig = initialResult[0];

    const updateInput: UpdateBillingConfigInput = {
      price_per_unit: 18.75
      // due_date_offset_days not provided - should remain unchanged
    };

    const result = await updateBillingConfig(updateInput);

    expect(result.price_per_unit).toEqual(18.75);
    expect(result.due_date_offset_days).toEqual(10); // Unchanged
    expect(result.id).toEqual(initialConfig.id);
  });

  it('should save updated config to database', async () => {
    const testInput: UpdateBillingConfigInput = {
      price_per_unit: 22.50,
      due_date_offset_days: 25
    };

    const result = await updateBillingConfig(testInput);

    // Verify in database
    const configs = await db.select()
      .from(billingConfigTable)
      .where(eq(billingConfigTable.id, result.id))
      .execute();

    expect(configs).toHaveLength(1);
    expect(parseFloat(configs[0].price_per_unit)).toEqual(22.50);
    expect(configs[0].due_date_offset_days).toEqual(25);
  });

  it('should return unchanged config when no updates provided to existing config', async () => {
    // Create initial config
    const initialResult = await db.insert(billingConfigTable)
      .values({
        price_per_unit: '5.25',
        due_date_offset_days: 7
      })
      .returning()
      .execute();

    const initialConfig = {
      ...initialResult[0],
      price_per_unit: parseFloat(initialResult[0].price_per_unit)
    };

    const updateInput: UpdateBillingConfigInput = {};

    const result = await updateBillingConfig(updateInput);

    expect(result.price_per_unit).toEqual(5.25);
    expect(result.due_date_offset_days).toEqual(7);
    expect(result.id).toEqual(initialConfig.id);
    expect(result.created_at).toEqual(initialConfig.created_at);
  });

  it('should handle decimal precision correctly', async () => {
    const testInput: UpdateBillingConfigInput = {
      price_per_unit: 9.9999
    };

    const result = await updateBillingConfig(testInput);

    expect(result.price_per_unit).toEqual(9.9999);
    expect(typeof result.price_per_unit).toBe('number');

    // Verify in database
    const configs = await db.select()
      .from(billingConfigTable)
      .where(eq(billingConfigTable.id, result.id))
      .execute();

    expect(parseFloat(configs[0].price_per_unit)).toEqual(9.9999);
  });

  it('should only have one billing config record at a time', async () => {
    // Create first config
    await updateBillingConfig({ price_per_unit: 10.0 });

    // Update config
    await updateBillingConfig({ price_per_unit: 15.0 });

    // Verify only one record exists
    const allConfigs = await db.select()
      .from(billingConfigTable)
      .execute();

    expect(allConfigs).toHaveLength(1);
    expect(parseFloat(allConfigs[0].price_per_unit)).toEqual(15.0);
  });
});