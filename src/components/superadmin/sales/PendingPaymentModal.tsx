/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { type Sale, PaymentMethod } from '../../../types/sales.types';
import { X, DollarSign, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useSales from '../../../hooks/useSales';
import { useAuth } from '../../../context/AuthContext';

interface PendingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onSuccess: () => void;
}

export default function PendingPaymentModal({ isOpen, onClose, sale, onSuccess }: PendingPaymentModalProps) {
  const { addPaymentToSale } = useSales();
  const { user } = useAuth();
  const balance = sale.totalAmount - (sale as any).paidAmount || sale.totalAmount;
  
  const [amount, setAmount] = useState<number>(balance);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [reference, setReference] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > balance) {
      toast.error('Invalid payment amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await addPaymentToSale(sale.id, {
        method: paymentMethod as any,
        amount,
        reference: reference || undefined,
        receivedById: user?.id,
      });
      toast.success('Payment recorded successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to record payment', error);
      toast.error('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Complete Payment
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm flex flex-col gap-1">
          <p><span className="font-semibold text-gray-700">Sale:</span> {sale.invoiceNumber}</p>
          <p><span className="font-semibold text-gray-700">Customer:</span> {sale.customerName}</p>
          <p><span className="font-semibold text-gray-700">Total:</span> LKR {sale.totalAmount.toLocaleString()}</p>
          <p><span className="font-semibold text-gray-700">Balance Due:</span> <span className="font-bold text-orange-600">LKR {balance.toLocaleString()}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Pay (LKR)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              max={balance}
              min={1}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="KOKO">Koko</option>
              <option value="MINTPAY">MintPay</option>
              <option value="PAYZY">Payzy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Bank Ref #, Batch #"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2 uppercase"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing</>
              ) : (
                'Confirm Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
