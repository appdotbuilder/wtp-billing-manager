import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Invoice, Customer, UpdateInvoiceStatusInput } from '../../../server/src/schema';

interface InvoiceManagementProps {
  invoices: Invoice[];
  customers: Customer[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
}

export function InvoiceManagement({ invoices, customers, setInvoices }: InvoiceManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  const handleStatusUpdate = async (invoiceId: number, newStatus: 'pending' | 'paid' | 'overdue') => {
    setIsLoading(true);
    try {
      const updateData: UpdateInvoiceStatusInput = {
        id: invoiceId,
        status: newStatus
      };
      await trpc.updateInvoiceStatus.mutate(updateData);
      setInvoices((prev: Invoice[]) => 
        prev.map((invoice: Invoice) => 
          invoice.id === invoiceId 
            ? { ...invoice, status: newStatus, updated_at: new Date() }
            : invoice
        )
      );
    } catch (error) {
      console.error('Failed to update invoice status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get customer name by ID
  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer ? customer.name : `Customer #${customerId}`;
  };

  // Filter invoices based on search term, status, and customer
  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const customerName = getCustomerName(invoice.customer_id);
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.billing_period.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.id.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    const matchesCustomer = customerFilter === 'all' || invoice.customer_id.toString() === customerFilter;
    
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">⏳ Pending</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">✅ Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">⚠️ Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isOverdue = (dueDate: Date) => {
    return new Date() > dueDate;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧾 Invoice Management
          </CardTitle>
          <CardDescription>
            View and manage all generated invoices and their payment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <Input
              placeholder="Search by customer name, billing period, or invoice ID..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Customer</Label>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🧾</div>
              <p className="text-gray-500 text-lg mb-2">
                {invoices.length === 0 
                  ? 'No invoices generated yet' 
                  : 'No invoices match your search criteria'
                }
              </p>
              <p className="text-gray-400">
                {invoices.length === 0
                  ? 'Create meter readings to automatically generate invoices!'
                  : 'Try adjusting your search or filter settings'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredInvoices.map((invoice: Invoice) => (
                <Card 
                  key={invoice.id} 
                  className={`border-l-4 ${
                    invoice.status === 'paid' 
                      ? 'border-l-green-500' 
                      : invoice.status === 'overdue'
                      ? 'border-l-red-500'
                      : 'border-l-orange-500'
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">Invoice #{invoice.id}</h3>
                          {getStatusBadge(invoice.status)}
                          {isOverdue(invoice.due_date) && invoice.status !== 'paid' && (
                            <Badge className="bg-red-100 text-red-800">
                              🚨 {Math.floor((new Date().getTime() - invoice.due_date.getTime()) / (1000 * 60 * 60 * 24))} days overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 flex items-center gap-2">
                          👤 {getCustomerName(invoice.customer_id)}
                        </p>
                        <p className="text-gray-600 flex items-center gap-2">
                          📅 {invoice.billing_period}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ${invoice.amount_due.toFixed(2)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Due: {invoice.due_date.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Usage:</span>
                        <div className="font-semibold">
                          {invoice.total_usage.toFixed(2)} units
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Price per Unit:</span>
                        <div className="font-semibold">
                          ${invoice.price_per_unit.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Meter Reading ID:</span>
                        <div className="font-semibold">
                          #{invoice.meter_reading_id}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <p className="text-xs text-gray-400">
                        Created: {invoice.created_at.toLocaleDateString()} | 
                        Updated: {invoice.updated_at.toLocaleDateString()}
                      </p>
                      
                      <div className="flex gap-2">
                        {invoice.status !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(invoice.id, 'paid')}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            ✅ Mark as Paid
                          </Button>
                        )}
                        
                        {invoice.status !== 'overdue' && invoice.status !== 'paid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(invoice.id, 'overdue')}
                            disabled={isLoading}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            ⚠️ Mark Overdue
                          </Button>
                        )}
                        
                        {invoice.status !== 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(invoice.id, 'pending')}
                            disabled={isLoading}
                          >
                            ⏳ Mark Pending
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}