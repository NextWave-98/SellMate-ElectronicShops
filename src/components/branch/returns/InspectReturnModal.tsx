import React, { useState } from 'react';
import { Package, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import type { ProductReturn, InspectReturnData } from '../../../hooks/useProductReturn';

interface InspectReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: InspectReturnData) => Promise<void>;
  returnItem: ProductReturn | null;
}

export default function InspectReturnModal({
  isOpen,
  onClose,
  onSubmit,
  returnItem
}: InspectReturnModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InspectReturnData>({
    condition: 'USED_GOOD',
    inspectionNotes: '',
    recommendedAction: null
  });

  React.useEffect(() => {
    if (isOpen && returnItem) {
      // Pre-fill with existing data if available
      setFormData({
        condition: returnItem.productCondition || 'USED_GOOD',
        inspectionNotes: returnItem.inspectionNotes || '',
        recommendedAction: returnItem.recommendedAction || null
      });
    }
  }, [isOpen, returnItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!returnItem) return;

    if (!formData.inspectionNotes.trim()) {
      toast.error('Please provide inspection notes');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(returnItem.id, formData);
      onClose();
    } catch (error) {
      console.error('Error submitting inspection:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !returnItem) return null;

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  return (
    <Dialog open={isOpen && !!returnItem} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]  ">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Inspect Return</DialogTitle>
            <span className="text-lg font-semibold text-gray-600">#{returnItem?.returnNumber}</span>
          </div>
        </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Return Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Package className="w-5 h-5" />
                Return Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <p className="text-gray-900">{returnItem.productName}</p>
                  <p className="text-sm text-gray-600">{returnItem.productCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-gray-900">{returnItem.customerName || ''}</p>
                  <p className="text-sm text-gray-600">{returnItem.customerPhone || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Value</label>
                  <p className="text-gray-900">{formatCurrency(returnItem.productValue)}</p>
                  <p className="text-sm text-gray-600">Quantity: {returnItem.quantity}</p>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Return Reason</label>
                <p className="text-gray-900">{returnItem.returnReason}</p>
              </div>
              {returnItem.notes && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                  <p className="text-gray-900">{returnItem.notes}</p>
                </div>
              )}
            </div>

            {/* Inspection Form */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Inspection Details
              </h3>

              {/* Product Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Product Condition *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { value: 'NEW_SEALED', label: 'New Sealed' },
                    { value: 'NEW_OPEN_BOX', label: 'New Open Box' },
                    { value: 'USED_EXCELLENT', label: 'Used Excellent' },
                    { value: 'USED_GOOD', label: 'Used Good' },
                    { value: 'USED_FAIR', label: 'Used Fair' },
                    { value: 'DEFECTIVE', label: 'Defective' },
                    { value: 'DAMAGED', label: 'Damaged' },
                    { value: 'PARTS_MISSING', label: 'Parts Missing' },
                    { value: 'DESTROYED', label: 'Destroyed' }
                  ].map((condition) => (
                    <label key={condition.value} className="flex items-center">
                      <input
                        type="radio"
                        name="condition"
                        value={condition.value}
                        checked={formData.condition === condition.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as InspectReturnData['condition'] }))}
                        className="text-orange-600 focus:ring-orange-400"
                      />
                      <span className="ml-2 text-sm text-gray-700">{condition.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Inspection Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inspection Notes *
                </label>
                <textarea
                  value={formData.inspectionNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspectionNotes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Describe the condition of the product, any defects, functionality tests performed, etc."
                />
              </div>

              {/* Recommendation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Recommendation
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="recommendation"
                      value="APPROVE"
                      checked={formData.recommendedAction === 'APPROVE'}
                      onChange={() => setFormData(prev => ({ ...prev, recommendedAction: 'APPROVE' }))}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 flex items-center gap-1 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Approve Return
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="recommendation"
                      value="REJECT"
                      checked={formData.recommendedAction === 'REJECT'}
                      onChange={() => setFormData(prev => ({ ...prev, recommendedAction: 'REJECT' }))}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 flex items-center gap-1 text-sm text-gray-700">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Reject Return
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="recommendation"
                      value=""
                      checked={formData.recommendedAction === null}
                      onChange={() => setFormData(prev => ({ ...prev, recommendedAction: null }))}
                      className="text-gray-600 focus:ring-gray-500"
                    />
                    <span className="ml-2 flex items-center gap-1 text-sm text-gray-700">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      No Recommendation
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Inspection'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}