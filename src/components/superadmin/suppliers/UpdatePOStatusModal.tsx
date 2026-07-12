import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import usePurchaseOrder from '../../../hooks/usePurchaseOrder';

interface UpdatePOStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder: {
    id: string;
    orderNumber: string;
    status: string;
  } | null;
}

const statusOptions = [
  { value: 'DRAFT', label: 'Draft', description: 'Being prepared' },
  { value: 'SUBMITTED', label: 'Submitted', description: 'Sent to supplier' },
  { value: 'CONFIRMED', label: 'Confirmed', description: 'Confirmed by supplier' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially Received', description: 'Some items received' },
  { value: 'RECEIVED', label: 'Received', description: 'All items received' },
  { value: 'COMPLETED', label: 'Completed', description: 'Fully processed and paid' },
  { value: 'CANCELLED', label: 'Cancelled', description: 'Order cancelled' },
  { value: 'ON_HOLD', label: 'On Hold', description: 'Temporarily paused' },
];

export default function UpdatePOStatusModal({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
}: UpdatePOStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const purchaseOrderHook = usePurchaseOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!purchaseOrder || !selectedStatus) {
      toast.error('Please select a status');
      return;
    }

    if (selectedStatus === purchaseOrder.status) {
      toast.error('Please select a different status');
      return;
    }

    setLoading(true);
    try {
      await purchaseOrderHook.updatePurchaseOrderStatus(purchaseOrder.id, {
        status: selectedStatus as 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD',
        notes: notes || undefined,
      });

      toast.success('Purchase order status updated successfully');
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      console.error('Error updating status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus('');
    setNotes('');
    onClose();
  };

  if (!isOpen || !purchaseOrder) return null;

  const currentStatusOption = statusOptions.find((s) => s.value === purchaseOrder.status);

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="glass-modal-header flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Update Purchase Order Status</h2>
            <p className="text-sm text-gray-600 mt-1">PO: {purchaseOrder.orderNumber}</p>
          </div>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="glass-modal-scroll px-6 py-6">
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-orange-900 mb-1">Current Status</h3>
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-orange-900">
                  {currentStatusOption?.label || purchaseOrder.status}
                </span>
                {currentStatusOption && (
                  <span className="text-sm text-orange-700">
                    - {currentStatusOption.description}
                  </span>
                )}
              </div>
            </div>

            {/* New Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedStatus(option.value)}
                    disabled={option.value === purchaseOrder.status}
                    className={`text-left p-4 border-2 rounded-lg transition-all ${
                      selectedStatus === option.value
                        ? 'border-orange-400 bg-orange-50'
                        : option.value === purchaseOrder.status
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900 mb-1">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.description}</div>
                    {option.value === purchaseOrder.status && (
                      <div className="text-xs text-gray-500 mt-1">(Current)</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes / Remarks
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes about this status change..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
            </div>

            {/* Information Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">Important Notes</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Status changes are tracked and logged</li>
                <li>• PARTIALLY_RECEIVED and RECEIVED statuses should be set via "Receive Items" for automatic inventory updates</li>
                <li>• COMPLETED status indicates full payment has been made</li>
                <li>• CANCELLED orders cannot be modified</li>
              </ul>
            </div>
          </div>
          </div>

          {/* Action Buttons */}
          <div className="glass-modal-footer flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:bg-orange-300"
              disabled={loading || !selectedStatus || selectedStatus === purchaseOrder.status}
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
