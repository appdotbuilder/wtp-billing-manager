import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { billingConfigTable } from '../db/schema';
import { getBillingConfig } from '../handlers/get_billing_config';

describe('getBillingConfig', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create and return default billing config when none exists', async () => {
    const result = await getBillingConfig();

    // Verify default values
    expect(result.price_per_unit).toEqual(10.0);
    expect(result.due_date_offset_days).toEqual(15);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.price_per_unit).toBe('number');
    expect(typeof result.due_date_offset_days).toBe('number');
  });

  it('should save default config to database when none exists', async () => {
    const result = await getBillingConfig();

    // Verify it was saved to database
    const configs = await db.select()
      .from(billingConfigTable)
      .execute();

    expect(configs).toHaveLength(1);
    expect(parseFloat(configs[0].price_per_unit)).toEqual(10.0);
    expect(configs[0].due_date_offset_days).toEqual(15);
    expect(configs[0].id).toEqual(result.id);
  });

  it('should return existing billing config when one exists', async () => {
    // Create existing config with different values
    const existingConfig = await db.insert(billingConfigTable)
      .values({
        price_per_unit: '15.5', // Convert number to string for numeric column
        due_date_offset_days: 30
      })
      .returning()
      .execute();

    const result = await getBillingConfig();

    // Should return existing config, not create new one
    expect(result.id).toEqual(existingConfig[0].id);
    expect(result.price_per_unit).toEqual(15.5);
    expect(result.due_date_offset_days).toEqual(30);

    // Verify numeric types
    expect(typeof result.price_per_unit).toBe('number');
    expect(typeof result.due_date_offset_days).toBe('number');

    // Verify only one config exists in database
    const allConfigs = await db.select()
      .from(billingConfigTable)
      .execute();

    expect(allConfigs).toHaveLength(1);
  });

  it('should return first config when multiple exist', async () => {
    // Create two configs
    const firstConfig = await db.insert(billingConfigTable)
      .values({
        price_per_unit: '12.0',
        due_date_offset_days: 20
      })
      .returning()
      .execute();

    await db.insert(billingConfigTable)
      .values({
        price_per_unit: '18.0',
        due_date_offset_days: 25
      })
      .execute();

    const result = await getBillingConfig();

    // Should return the first config (lowest ID)
    expect(result.id).toEqual(firstConfig[0].id);
    expect(result.price_per_unit).toEqual(12.0);
    expect(result.due_date_offset_days).toEqual(20);
  });

  it('should handle numeric precision correctly', async () => {
    // Create config with high precision values
    await db.insert(billingConfigTable)
      .values({
        price_per_unit: '10.1234', // 4 decimal places
        due_date_offset_days: 15
      })
      .execute();

    const result = await getBillingConfig();

    expect(result.price_per_unit).toEqual(10.1234);
    expect(typeof result.price_per_unit).toBe('number');
  });

  it('should handle edge case of zero values', async () => {
    // Create config with zero values
    await db.insert(billingConfigTable)
      .values({
        price_per_unit: '0.0',
        due_date_offset_days: 0
      })
      .execute();

    const result = await getBillingConfig();

    expect(result.price_per_unit).toEqual(0.0);
    expect(result.due_date_offset_days).toEqual(0);
    expect(typeof result.price_per_unit).toBe('number');
    expect(typeof result.due_date_offset_days).toBe('number');
  });
});