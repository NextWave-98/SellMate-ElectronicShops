import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CreatePaymentData } from '../../../hooks/useJobSheet';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePaymentData) => Promise<void>;
  jobSheet: {
    id: string;
    jobNumber: string;
    customerId: string;
    customerName: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
  };
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_PAYMENT', label: 'Mobile Payment' },
  { value: 'CHECK', label: 'Check' },
  { value: 'OTHER', label: 'Other' },
];

export default function AddPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  jobSheet,
}: AddPaymentModalProps) {
  const [formData, setFormData] = useState<CreatePaymentData>({
    jobSheetId: jobSheet.id,
    customerId: jobSheet.customerId,
    amount: 0,
    paymentMethod: 'CASH',
    reference: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        jobSheetId: jobSheet.id,
        customerId: jobSheet.customerId,
        amount: jobSheet.balanceAmount ? parseFloat(String(jobSheet.balanceAmount)) : 0,
        paymentMethod: 'CASH',
        reference: '',
        notes: '',
      });
    }
  }, [isOpen, jobSheet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.amount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }

    if (formData.amount > parseFloat(String(jobSheet.balanceAmount))) {
      const confirmOverpayment = window.confirm(
        `Payment amount (LKR ${formData.amount}) exceeds balance (LKR ${parseFloat(String(jobSheet.balanceAmount)).toFixed(2)}). Do you want to proceed?`
      );
      if (!confirmOverpayment) return;
    }

    setLoading(true);

    try {
      await onSubmit(formData);
      // onClose();
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || '',
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? 0 : parseFloat(value) || 0,
    }));
  };

  const handleQuickAmount = (amount: number) => {
    setFormData((prev) => ({
      ...prev,
      amount,
    }));
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]  ">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 text-green-600 mr-2" />
            <div>
              <DialogTitle>Record Payment</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Job: {jobSheet.jobNumber} - {jobSheet.customerName}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Balance Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(parseFloat(String(jobSheet.totalAmount)))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Paid Amount</p>
                <p className="text-sm font-semibold text-green-600">
                  {formatCurrency(parseFloat(String(jobSheet.paidAmount)))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Balance Due</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(parseFloat(String(jobSheet.balanceAmount)))}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount (LKR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleNumberChange}
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-semibold"
            />
            
            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleQuickAmount(parseFloat(String(jobSheet.balanceAmount)))}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                Full Balance
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(Math.floor(parseFloat(String(jobSheet.balanceAmount)) / 2))}
                className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
              >
                Half
              </button>
              {[1000, 5000, 10000].map((amt) => (
                parseFloat(String(jobSheet.balanceAmount)) >= amt && (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {amt.toLocaleString()}
                  </button>
                )
              ))}
            </div>

            {/* Overpayment Warning */}
            {formData.amount > parseFloat(String(jobSheet.balanceAmount)) && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ Payment exceeds balance by {formatCurrency(formData.amount - parseFloat(String(jobSheet.balanceAmount)))}
                </p>
              </div>
            )}

            {/* Remaining Balance Preview */}
            {formData.amount > 0 && formData.amount <= parseFloat(String(jobSheet.balanceAmount)) && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-800">
                  Remaining balance after payment: {formatCurrency(parseFloat(String(jobSheet.balanceAmount)) - formData.amount)}
                </p>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="Transaction ID, Check Number, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: For bank transfers, checks, or card payments
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Any additional notes about this payment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={loading || formData.amount <= 0}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
