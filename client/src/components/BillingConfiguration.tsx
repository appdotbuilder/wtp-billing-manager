import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { BillingConfig, UpdateBillingConfigInput } from '../../../server/src/schema';

interface BillingConfigurationProps {
  billingConfig: BillingConfig | null;
  setBillingConfig: React.Dispatch<React.SetStateAction<BillingConfig | null>>;
}

export function BillingConfiguration({ billingConfig, setBillingConfig }: BillingConfigurationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state for editing billing configuration
  const [formData, setFormData] = useState<UpdateBillingConfigInput>({
    price_per_unit: billingConfig?.price_per_unit || 10.0,
    due_date_offset_days: billingConfig?.due_date_offset_days || 15
  });

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.updateBillingConfig.mutate(formData);
      // Update local state
      if (billingConfig) {
        const updatedConfig: BillingConfig = {
          ...billingConfig,
          price_per_unit: formData.price_per_unit || billingConfig.price_per_unit,
          due_date_offset_days: formData.due_date_offset_days || billingConfig.due_date_offset_days,
          updated_at: new Date()
        };
        setBillingConfig(updatedConfig);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update billing configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    if (billingConfig) {
      setFormData({
        price_per_unit: billingConfig.price_per_unit,
        due_date_offset_days: billingConfig.due_date_offset_days
      });
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (billingConfig) {
      setFormData({
        price_per_unit: billingConfig.price_per_unit,
        due_date_offset_days: billingConfig.due_date_offset_days
      });
    }
  };

  if (!billingConfig) {
    return (
      <div className="space-y-6">
        <Card className="bg-white shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚙️ Billing Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⚙️</div>
              <p className="text-gray-500">Loading billing configuration...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚙️ Billing Configuration
          </CardTitle>
          <CardDescription>
            Configure pricing and billing settings for the water treatment plant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <div className="space-y-6">
              {/* Current Configuration Display */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  📊 Current Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-blue-700">Price per Unit</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      ${billingConfig.price_per_unit.toFixed(2)}
                    </div>
                    <p className="text-sm text-blue-600">per water unit consumed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-blue-700">Payment Due Date</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {billingConfig.due_date_offset_days} days
                    </div>
                    <p className="text-sm text-blue-600">after invoice generation</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs text-blue-600">
                    Configuration ID: #{billingConfig.id} | 
                    Last updated: {billingConfig.updated_at.toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Sample Calculation */}
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                  🧮 Sample Invoice Calculation
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700">If a customer uses 100 units:</span>
                    <Badge variant="outline" className="text-green-800">
                      100 units × ${billingConfig.price_per_unit.toFixed(2)} = ${(100 * billingConfig.price_per_unit).toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-700">Invoice generated on Jan 1st:</span>
                    <Badge variant="outline" className="text-green-800">
                      Due date: Jan {billingConfig.due_date_offset_days + 1}st
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleEditClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  ✏️ Edit Configuration
                </Button>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <form onSubmit={handleUpdateConfig} className="space-y-6">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <span className="text-lg">⚠️</span>
                  <h3 className="font-semibold">Important Notice</h3>
                </div>
                <p className="text-yellow-700 text-sm">
                  Changes to pricing will affect all future invoice generations. 
                  Existing invoices will retain their original pricing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price-per-unit">Price per Unit ($)</Label>
                  <Input
                    id="price-per-unit"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price_per_unit || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: UpdateBillingConfigInput) => ({ 
                        ...prev, 
                        price_per_unit: parseFloat(e.target.value) || 0 
                      }))
                    }
                    placeholder="Enter price per unit"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Amount charged per unit of water consumed
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="due-date-offset">Due Date Offset (Days)</Label>
                  <Input
                    id="due-date-offset"
                    type="number"
                    min="1"
                    max="90"
                    value={formData.due_date_offset_days || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: UpdateBillingConfigInput) => ({ 
                        ...prev, 
                        due_date_offset_days: parseInt(e.target.value) || 0 
                      }))
                    }
                    placeholder="Enter days"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Number of days after invoice creation when payment is due
                  </p>
                </div>
              </div>

              {/* Preview Calculation */}
              {formData.price_per_unit && formData.price_per_unit > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Preview Calculation:</h4>
                  <p className="text-blue-700 text-sm">
                    100 units × ${formData.price_per_unit.toFixed(2)} = <strong>${(100 * formData.price_per_unit).toFixed(2)}</strong>
                  </p>
                  <p className="text-blue-700 text-sm">
                    Due date: {formData.due_date_offset_days} days after invoice generation
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !formData.price_per_unit || !formData.due_date_offset_days}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}