import { z } from 'zod';

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  whatsapp_number: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

// Input schema for creating customers
export const createCustomerInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  whatsapp_number: z.string().min(1, "WhatsApp number is required")
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Input schema for updating customers
export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Name is required").optional(),
  address: z.string().min(1, "Address is required").optional(),
  whatsapp_number: z.string().min(1, "WhatsApp number is required").optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Meter reading schema
export const meterReadingSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  reading_date: z.coerce.date(),
  current_reading: z.number(),
  previous_reading: z.number().nullable(),
  usage_calculated: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MeterReading = z.infer<typeof meterReadingSchema>;

// Input schema for creating meter readings
export const createMeterReadingInputSchema = z.object({
  customer_id: z.number(),
  reading_date: z.coerce.date(),
  current_reading: z.number().nonnegative("Reading must be non-negative"),
  previous_reading: z.number().nonnegative("Previous reading must be non-negative").nullable().optional()
});

export type CreateMeterReadingInput = z.infer<typeof createMeterReadingInputSchema>;

// Billing configuration schema
export const billingConfigSchema = z.object({
  id: z.number(),
  price_per_unit: z.number(),
  due_date_offset_days: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type BillingConfig = z.infer<typeof billingConfigSchema>;

// Input schema for updating billing configuration
export const updateBillingConfigInputSchema = z.object({
  price_per_unit: z.number().positive("Price per unit must be positive").optional(),
  due_date_offset_days: z.number().int().positive("Due date offset must be positive").optional()
});

export type UpdateBillingConfigInput = z.infer<typeof updateBillingConfigInputSchema>;

// Invoice schema
export const invoiceSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  meter_reading_id: z.number(),
  billing_period: z.string(),
  total_usage: z.number(),
  price_per_unit: z.number(),
  amount_due: z.number(),
  due_date: z.coerce.date(),
  status: z.enum(['pending', 'paid', 'overdue']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invoice = z.infer<typeof invoiceSchema>;

// Input schema for creating invoices
export const createInvoiceInputSchema = z.object({
  customer_id: z.number(),
  meter_reading_id: z.number(),
  billing_period: z.string().min(1, "Billing period is required")
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

// Input schema for updating invoice status
export const updateInvoiceStatusInputSchema = z.object({
  id: z.number(),
  status: z.enum(['pending', 'paid', 'overdue'])
});

export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusInputSchema>;

// Query parameter schemas
export const getCustomerByIdSchema = z.object({
  id: z.number()
});

export type GetCustomerByIdInput = z.infer<typeof getCustomerByIdSchema>;

export const deleteCustomerInputSchema = z.object({
  id: z.number()
});

export type DeleteCustomerInput = z.infer<typeof deleteCustomerInputSchema>;

export const getMeterReadingsByCustomerSchema = z.object({
  customer_id: z.number()
});

export type GetMeterReadingsByCustomerInput = z.infer<typeof getMeterReadingsByCustomerSchema>;

export const getInvoicesByCustomerSchema = z.object({
  customer_id: z.number().optional(),
  status: z.enum(['pending', 'paid', 'overdue']).optional()
});

export type GetInvoicesByCustomerInput = z.infer<typeof getInvoicesByCustomerSchema>;