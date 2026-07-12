import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import usePurchaseOrder from '../../../hooks/usePurchaseOrder';
import type { PurchaseOrder } from '../../../hooks/usePurchaseOrder';

interface DeletePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder: PurchaseOrder | null;
}

export default function DeletePurchaseOrderModal({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
}: DeletePurchaseOrderModalProps) {
  const purchaseOrderHook = usePurchaseOrder();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (!purchaseOrder?.id) return;

    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setLoading(true);
    try {
      await purchaseOrderHook.deletePurchaseOrder(purchaseOrder.id);
      toast.success('Purchase order deleted successfully');
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete purchase order';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  if (!isOpen || !purchaseOrder) return null;

  const totalAmount = Number(purchaseOrder.totalAmount);
  const safeTotalAmount = Number.isFinite(totalAmount) ? totalAmount.toFixed(2) : '0.00';

  const canDelete = purchaseOrder.status === 'DRAFT' || purchaseOrder.status === 'CANCELLED';

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Delete Purchase Order
          </h3>

          <p className="text-sm text-gray-500 text-center mb-4">
            Are you sure you want to delete purchase order <strong>{purchaseOrder.orderNumber}</strong>?
          </p>

          {!canDelete && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Only DRAFT or CANCELLED orders can be deleted. 
                This order is in <strong>{purchaseOrder.status}</strong> status.
              </p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-medium">{purchaseOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Supplier:</span>
                <span className="font-medium">{purchaseOrder.supplier?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium">Rs. {safeTotalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">{purchaseOrder.status}</span>
              </div>
            </div>
          </div>

          {canDelete && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || !canDelete}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
