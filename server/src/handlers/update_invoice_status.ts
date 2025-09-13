import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateInvoiceStatusInput, type Invoice } from '../schema';

export async function updateInvoiceStatus(input: UpdateInvoiceStatusInput): Promise<Invoice> {
  try {
    // Update the invoice status and updated_at timestamp
    const result = await db.update(invoicesTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(invoicesTable.id, input.id))
      .returning()
      .execute();

    // Check if invoice was found and updated
    if (result.length === 0) {
      throw new Error(`Invoice with id ${input.id} not found`);
    }

    const invoice = result[0];
    
    // Convert numeric fields back to numbers before returning
    return {
      ...invoice,
      total_usage: parseFloat(invoice.total_usage),
      price_per_unit: parseFloat(invoice.price_per_unit),
      amount_due: parseFloat(invoice.amount_due)
    };
  } catch (error) {
    console.error('Invoice status update failed:', error);
    throw error;
  }
}