import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import all schemas
import {
  createCustomerInputSchema,
  updateCustomerInputSchema,
  getCustomerByIdSchema,
  deleteCustomerInputSchema,
  createMeterReadingInputSchema,
  getMeterReadingsByCustomerSchema,
  updateBillingConfigInputSchema,
  createInvoiceInputSchema,
  updateInvoiceStatusInputSchema,
  getInvoicesByCustomerSchema
} from './schema';

// Import all handlers
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { getCustomerById } from './handlers/get_customer_by_id';
import { updateCustomer } from './handlers/update_customer';
import { deleteCustomer } from './handlers/delete_customer';
import { createMeterReading } from './handlers/create_meter_reading';
import { getMeterReadingsByCustomer } from './handlers/get_meter_readings_by_customer';
import { getBillingConfig } from './handlers/get_billing_config';
import { updateBillingConfig } from './handlers/update_billing_config';
import { createInvoice } from './handlers/create_invoice';
import { getInvoices } from './handlers/get_invoices';
import { updateInvoiceStatus } from './handlers/update_invoice_status';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Customer management endpoints
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),

  getCustomers: publicProcedure
    .query(() => getCustomers()),

  getCustomerById: publicProcedure
    .input(getCustomerByIdSchema)
    .query(({ input }) => getCustomerById(input)),

  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),

  deleteCustomer: publicProcedure
    .input(deleteCustomerInputSchema)
    .mutation(({ input }) => deleteCustomer(input)),

  // Meter reading endpoints
  createMeterReading: publicProcedure
    .input(createMeterReadingInputSchema)
    .mutation(({ input }) => createMeterReading(input)),

  getMeterReadingsByCustomer: publicProcedure
    .input(getMeterReadingsByCustomerSchema)
    .query(({ input }) => getMeterReadingsByCustomer(input)),

  // Billing configuration endpoints
  getBillingConfig: publicProcedure
    .query(() => getBillingConfig()),

  updateBillingConfig: publicProcedure
    .input(updateBillingConfigInputSchema)
    .mutation(({ input }) => updateBillingConfig(input)),

  // Invoice management endpoints
  createInvoice: publicProcedure
    .input(createInvoiceInputSchema)
    .mutation(({ input }) => createInvoice(input)),

  getInvoices: publicProcedure
    .input(getInvoicesByCustomerSchema)
    .query(({ input }) => getInvoices(input)),

  updateInvoiceStatus: publicProcedure
    .input(updateInvoiceStatusInputSchema)
    .mutation(({ input }) => updateInvoiceStatus(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Water Treatment Plant Billing System - TRPC server listening at port: ${port}`);
}

start();