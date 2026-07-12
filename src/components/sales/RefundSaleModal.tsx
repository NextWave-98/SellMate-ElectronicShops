import { useState } from 'react';
import type { Sale } from '../../types/sales.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type RefundMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_MONEY';

interface RefundData {
  amount: number;
  reason: string;
  refundMethod: RefundMethod;
  items?: Array<{ productId: string; quantity: number }>;
}

interface RefundSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirm: (saleId: string, refundData: RefundData) => Promise<void>;
}

export default function RefundSaleModal({ isOpen, onClose, sale, onConfirm }: RefundSaleModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('CASH');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !sale) return null;

  const maxAmount = sale.totalAmount;

  const handleConfirm = async () => {
    const refundAmount = Number(amount);
    if (!reason.trim() || !refundAmount || refundAmount <= 0) return;
    setLoading(true);
    try {
      await onConfirm(sale.id, {
        amount: refundAmount,
        reason: reason.trim(),
        refundMethod,
      });
      setAmount('');
      setReason('');
      setRefundMethod('CASH');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen && !!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 mb-4">
          Invoice: <span className="font-medium text-gray-700">{sale.invoiceNumber}</span>
          {' · '}
          Total: <span className="font-medium text-gray-700">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(maxAmount)}
          </span>
        </p>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Enter refund amount"
              min={0.01}
              max={maxAmount}
              step={0.01}
            />
            {Number(amount) > maxAmount && (
              <p className="text-xs text-red-500 mt-1">Refund amount cannot exceed sale total.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Method <span className="text-red-500">*</span>
            </label>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              rows={3}
              placeholder="Enter reason for refund..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            onClick={handleConfirm}
            disabled={!reason.trim() || !amount || Number(amount) <= 0 || Number(amount) > maxAmount || loading}
          >
            {loading ? 'Processing...' : 'Process Refund'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
