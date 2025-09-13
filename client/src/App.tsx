import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { CustomerManagement } from '@/components/CustomerManagement';
import { MeterReadingManagement } from '@/components/MeterReadingManagement';
import { InvoiceManagement } from '@/components/InvoiceManagement';
import { BillingConfiguration } from '@/components/BillingConfiguration';
// Using type-only imports for better TypeScript compliance
import type { Customer, Invoice, BillingConfig } from '../../server/src/schema';

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingConfig, setBillingConfig] = useState<BillingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [customersData, invoicesData, configData] = await Promise.all([
        trpc.getCustomers.query(),
        trpc.getInvoices.query({}),
        trpc.getBillingConfig.query()
      ]);
      setCustomers(customersData);
      setInvoices(invoicesData);
      setBillingConfig(configData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate dashboard stats
  const totalCustomers = customers.length;
  const pendingInvoices = invoices.filter(invoice => invoice.status === 'pending').length;
  const overdueInvoices = invoices.filter(invoice => invoice.status === 'overdue').length;
  const totalRevenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.amount_due, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-700 font-medium">Loading WTP Billing System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
      <header className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-2xl font-bold">💧</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Water Treatment Plant
              </h1>
              <p className="text-blue-600 text-sm font-medium">Billing Management System</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalCustomers}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingInvoices}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Overdue Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueInvoices}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-md">
            <TabsTrigger value="customers" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              👥 Customers
            </TabsTrigger>
            <TabsTrigger value="readings" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              📊 Meter Readings
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              🧾 Invoices
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              ⚙️ Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <CustomerManagement 
              customers={customers} 
              setCustomers={setCustomers} 
            />
          </TabsContent>

          <TabsContent value="readings">
            <MeterReadingManagement 
              customers={customers}
              onInvoiceGenerated={loadData}
            />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoiceManagement 
              invoices={invoices} 
              customers={customers}
              setInvoices={setInvoices}
            />
          </TabsContent>

          <TabsContent value="settings">
            <BillingConfiguration 
              billingConfig={billingConfig}
              setBillingConfig={setBillingConfig}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;