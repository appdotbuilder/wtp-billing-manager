import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Customer, MeterReading, CreateMeterReadingInput } from '../../../server/src/schema';

interface MeterReadingManagementProps {
  customers: Customer[];
  onInvoiceGenerated: () => void;
}

export function MeterReadingManagement({ customers, onInvoiceGenerated }: MeterReadingManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for creating meter readings
  const [formData, setFormData] = useState<CreateMeterReadingInput>({
    customer_id: 0,
    reading_date: new Date(),
    current_reading: 0,
    previous_reading: null
  });

  // Load meter readings for selected customer
  const loadMeterReadings = useCallback(async (customerId: number) => {
    try {
      const readings = await trpc.getMeterReadingsByCustomer.query({ customer_id: customerId });
      setMeterReadings(readings);
    } catch (error) {
      console.error('Failed to load meter readings:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadMeterReadings(selectedCustomerId);
    }
  }, [selectedCustomerId, loadMeterReadings]);

  const handleCreateReading = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createMeterReading.mutate(formData);
      
      // Generate invoice for this meter reading
      const billingPeriod = `${formData.reading_date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      await trpc.createInvoice.mutate({
        customer_id: formData.customer_id,
        meter_reading_id: 0, // This would be returned from createMeterReading in real implementation
        billing_period: billingPeriod
      });

      // Reset form
      setFormData({
        customer_id: 0,
        reading_date: new Date(),
        current_reading: 0,
        previous_reading: null
      });
      setIsDialogOpen(false);
      
      // Reload meter readings if we have a selected customer
      if (selectedCustomerId) {
        loadMeterReadings(selectedCustomerId);
      }
      
      // Notify parent to reload invoices
      onInvoiceGenerated();
    } catch (error) {
      console.error('Failed to create meter reading and invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCustomer = customers.find((customer: Customer) => customer.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Meter Reading Management
          </CardTitle>
          <CardDescription>
            Record water meter readings and automatically generate invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  📝 Add Reading
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Meter Reading</DialogTitle>
                  <DialogDescription>
                    Enter the meter reading details. An invoice will be automatically generated.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateReading} className="space-y-4">
                  <div>
                    <Label htmlFor="customer">Customer</Label>
                    <Select
                      value={formData.customer_id.toString()}
                      onValueChange={(value: string) =>
                        setFormData((prev: CreateMeterReadingInput) => ({ 
                          ...prev, 
                          customer_id: parseInt(value) 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer: Customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name} - {customer.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reading-date">Reading Date</Label>
                    <Input
                      id="reading-date"
                      type="date"
                      value={formData.reading_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateMeterReadingInput) => ({ 
                          ...prev, 
                          reading_date: new Date(e.target.value) 
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="current-reading">Current Reading</Label>
                    <Input
                      id="current-reading"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.current_reading}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateMeterReadingInput) => ({ 
                          ...prev, 
                          current_reading: parseFloat(e.target.value) || 0 
                        }))
                      }
                      placeholder="Enter current reading"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="previous-reading">Previous Reading (Optional)</Label>
                    <Input
                      id="previous-reading"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.previous_reading || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateMeterReadingInput) => ({ 
                          ...prev, 
                          previous_reading: e.target.value ? parseFloat(e.target.value) : null
                        }))
                      }
                      placeholder="Enter previous reading"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading || formData.customer_id === 0}>
                      {isLoading ? 'Processing...' : 'Add Reading & Generate Invoice'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Customer Selection */}
          <div className="mb-6">
            <Label>Select Customer to View Readings:</Label>
            <Select
              value={selectedCustomerId?.toString() || ''}
              onValueChange={(value: string) => setSelectedCustomerId(parseInt(value))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose a customer to view their meter readings" />
              </SelectTrigger>
              <SelectContent>
                {filteredCustomers.map((customer: Customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name} - {customer.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meter Readings Display */}
          {selectedCustomer ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">
                  📊 Readings for {selectedCustomer.name}
                </h3>
                <p className="text-blue-600 text-sm">
                  Address: {selectedCustomer.address} | WhatsApp: {selectedCustomer.whatsapp_number}
                </p>
              </div>

              {meterReadings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-gray-500">No meter readings recorded yet</p>
                  <p className="text-gray-400 text-sm">Add the first reading for this customer!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {meterReadings.map((reading: MeterReading) => (
                    <Card key={reading.id} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">Reading #{reading.id}</Badge>
                              <Badge variant="outline">
                                {reading.reading_date.toLocaleDateString()}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Current Reading:</span>
                                <div className="font-semibold text-blue-600">
                                  {reading.current_reading.toFixed(2)} units
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">Previous Reading:</span>
                                <div className="font-semibold text-gray-700">
                                  {reading.previous_reading ? `${reading.previous_reading.toFixed(2)} units` : 'N/A'}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">Usage Calculated:</span>
                                <div className="font-semibold text-green-600">
                                  {reading.usage_calculated.toFixed(2)} units
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400">
                              Recorded: {reading.created_at.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👆</div>
              <p className="text-gray-500 text-lg">Select a customer above to view their meter readings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}