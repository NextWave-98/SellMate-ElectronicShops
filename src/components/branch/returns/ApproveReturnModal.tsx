import React, { useState } from 'react';
import { CheckCircle, FileText, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ProductReturn, ApproveReturnData } from '../../../hooks/useProductReturn';

interface ApproveReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: ApproveReturnData) => Promise<void>;
  returnItem: ProductReturn | null;
}

export default function ApproveReturnModal({
  isOpen,
  onClose,
  onSubmit,
  returnItem
}: ApproveReturnModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ApproveReturnData>({
    resolutionType: 'REFUND_PROCESSED',
    notes: ''
  });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        resolutionType: 'REFUND_PROCESSED',
        notes: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!returnItem) return;

    try {
      setLoading(true);
      await onSubmit(returnItem.id, formData);
      onClose();
    } catch (error) {
      console.error('Error approving return:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !returnItem) return null;

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  const resolutionOptions = [
    { value: 'REFUND_PROCESSED', label: 'Refund Processed', description: 'Process refund to customer' },
    { value: 'RESTOCKED_BRANCH', label: 'Restocked Branch', description: 'Return product to branch inventory' },
    { value: 'RETURNED_SUPPLIER', label: 'Returned to Supplier', description: 'Send back to supplier/manufacturer' },
    { value: 'TRANSFERRED_WAREHOUSE', label: 'Transferred to Warehouse', description: 'Move to central warehouse' },
    { value: 'SCRAPPED', label: 'Scrapped', description: 'Product is damaged beyond repair' },
    { value: 'STORE_CREDIT', label: 'Store Credit Issued', description: 'Issue store credit instead of refund' },
    { value: 'EXCHANGE_PROCESSED', label: 'Exchange Processed', description: 'Exchange for new/different product' },
    { value: 'WARRANTY_REPLACEMENT', label: 'Warranty Replacement', description: 'Replace under warranty' },
    { value: 'DONATION', label: 'Donated', description: 'Donate the product' },
    { value: 'RECYCLING', label: 'Recycled', description: 'Send for recycling' },
    { value: 'OTHER', label: 'Other', description: 'Other resolution method' }
  ];

  return (
    <Dialog open={isOpen && !!returnItem} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]  ">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Approve Return</DialogTitle>
            <span className="text-lg font-semibold text-gray-600">#{returnItem?.returnNumber}</span>
          </div>
        </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Return Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">Return Approved</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-800">Product</label>
                  <p className="text-green-900">{returnItem.productName}</p>
                  <p className="text-sm text-green-700">{returnItem.productCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800">Customer</label>
                  <p className="text-green-900">{returnItem.customerName || 'N/A'}</p>
                  <p className="text-sm text-green-700">{returnItem.customerPhone || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800">Value</label>
                  <p className="text-green-900">{formatCurrency(returnItem.productValue)}</p>
                  <p className="text-sm text-green-700">Quantity: {returnItem.quantity}</p>
                </div>
              </div>
              {returnItem.inspectionNotes && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-green-800">Inspection Notes</label>
                  <p className="text-green-900">{returnItem.inspectionNotes}</p>
                </div>
              )}
            </div>

            {/* Resolution Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resolution Details
              </h3>

              {/* Resolution Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Resolution Type *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {resolutionOptions.map((option) => (
                    <label key={option.value} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="resolutionType"
                        value={option.value}
                        checked={formData.resolutionType === option.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, resolutionType: e.target.value as ApproveReturnData['resolutionType'] }))}
                        className="mt-1 text-orange-600 focus:ring-orange-400"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Approval Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Add any additional notes about the approval decision..."
                />
              </div>

              {/* Financial Summary */}
              {(formData.resolutionType === 'REFUND_PROCESSED' || formData.resolutionType === 'STORE_CREDIT') && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-orange-900 flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Financial Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-800">Product Value</label>
                      <p className="text-orange-900">{formatCurrency(returnItem.productValue)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-800">Refund Amount</label>
                      <p className="text-orange-900">
                        {returnItem.refundAmount ? formatCurrency(returnItem.refundAmount) : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-800">Quantity</label>
                      <p className="text-orange-900">{returnItem.quantity}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={loading}>
                {loading ? 'Approving...' : 'Approve Return'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}