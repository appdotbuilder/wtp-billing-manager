import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '../../../server/src/schema';

interface CustomerManagementProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

export function CustomerManagement({ customers, setCustomers }: CustomerManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for creating customers
  const [createFormData, setCreateFormData] = useState<CreateCustomerInput>({
    name: '',
    address: '',
    whatsapp_number: ''
  });

  // Form state for editing customers
  const [editFormData, setEditFormData] = useState<Partial<UpdateCustomerInput>>({
    name: '',
    address: '',
    whatsapp_number: ''
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createCustomer.mutate(createFormData);
      setCustomers((prev: Customer[]) => [...prev, response]);
      setCreateFormData({
        name: '',
        address: '',
        whatsapp_number: ''
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    
    setIsLoading(true);
    try {
      const updateData: UpdateCustomerInput = {
        id: editingCustomer.id,
        ...editFormData
      };
      const response = await trpc.updateCustomer.mutate(updateData);
      setCustomers((prev: Customer[]) => 
        prev.map((customer: Customer) => 
          customer.id === editingCustomer.id ? response : customer
        )
      );
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Failed to update customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteCustomer.mutate({ id: customerId });
      setCustomers((prev: Customer[]) => 
        prev.filter((customer: Customer) => customer.id !== customerId)
      );
    } catch (error) {
      console.error('Failed to delete customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name,
      address: customer.address,
      whatsapp_number: customer.whatsapp_number
    });
    setIsEditDialogOpen(true);
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.whatsapp_number.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👥 Customer Management
          </CardTitle>
          <CardDescription>
            Manage water treatment plant customers and their information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search customers by name, address, or WhatsApp..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  ➕ Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Enter the customer details below to add them to the system.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCustomer} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={createFormData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Customer name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={createFormData.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateCustomerInput) => ({ ...prev, address: e.target.value }))
                      }
                      placeholder="Customer address"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp Number</Label>
                    <Input
                      id="whatsapp"
                      value={createFormData.whatsapp_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateCustomerInput) => ({ ...prev, whatsapp_number: e.target.value }))
                      }
                      placeholder="WhatsApp number"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Adding...' : 'Add Customer'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500 text-lg mb-2">
                {searchTerm ? 'No customers found matching your search' : 'No customers yet'}
              </p>
              <p className="text-gray-400">
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first customer to get started!'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCustomers.map((customer: Customer) => (
                <Card key={customer.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{customer.name}</h3>
                          <Badge variant="secondary">ID: {customer.id}</Badge>
                        </div>
                        <p className="text-gray-600 flex items-center gap-2">
                          📍 {customer.address}
                        </p>
                        <p className="text-gray-600 flex items-center gap-2">
                          📱 {customer.whatsapp_number}
                        </p>
                        <p className="text-xs text-gray-400">
                          Added: {customer.created_at.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(customer)}
                          disabled={isLoading}
                        >
                          ✏️ Edit
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isLoading}
                            >
                              🗑️ Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {customer.name}? This action cannot be undone and will also delete all associated meter readings and invoices.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCustomer} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: Partial<UpdateCustomerInput>) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Customer name"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editFormData.address || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: Partial<UpdateCustomerInput>) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Customer address"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-whatsapp">WhatsApp Number</Label>
              <Input
                id="edit-whatsapp"
                value={editFormData.whatsapp_number || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: Partial<UpdateCustomerInput>) => ({ ...prev, whatsapp_number: e.target.value }))
                }
                placeholder="WhatsApp number"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}