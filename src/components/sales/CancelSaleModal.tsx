import { useState } from 'react';
import type { Sale } from '../../types/sales.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CancelSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirm: (saleId: string, reason: string) => Promise<void>;
}

export default function CancelSaleModal({ isOpen, onClose, sale, onConfirm }: CancelSaleModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !sale) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onConfirm(sale.id, reason.trim());
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen && !!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Sale</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 mb-4">
          Invoice: <span className="font-medium text-gray-700">{sale.invoiceNumber}</span>
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">
            This will cancel the sale and reverse any stock deductions. This action cannot be undone.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for cancellation <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            rows={3}
            placeholder="Enter reason for cancellation..."
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Keep Sale
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
          >
            {loading ? 'Cancelling...' : 'Cancel Sale'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
