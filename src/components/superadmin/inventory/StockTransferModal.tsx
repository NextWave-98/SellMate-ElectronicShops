import { useState, useEffect } from 'react';
import { ArrowRight, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { InventoryItem } from '../../../hooks/useInventory';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  branches: Array<{ id: string; name: string; code: string }>;
  onTransfer: (data: TransferStockData) => Promise<void>;
}

interface TransferStockData {
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  quantity: number;
  notes?: string;
  
}

export default function StockTransferModal({
  isOpen,
  onClose,
  item,
  branches,
  onTransfer,
}: StockTransferModalProps) {
  const [toBranchId, setToBranchId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      // Reset form when modal opens
      setToBranchId('');
      setQuantity(0);
      setNotes('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const availableBranches = branches.filter((b) => b.id !== (item.locationId || item.branchId));
  const selectedBranch = branches.find((b) => b.id === toBranchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toBranchId) {
      alert('Please select a destination branch');
      return;
    }

    if (quantity <= 0 || quantity > item.quantity) {
      alert('Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
    const res=  await onTransfer({
        fromBranchId: item.locationId || item.branchId,
        toBranchId,
        productId: item.productId,
        quantity,
        notes,
      });
      if(res?.success === true){
handleClose();
      }
      
    } catch (error) {
      console.error('Failed to transfer stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setToBranchId('');
    setQuantity(0);
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>Transfer Stock Between Branches</DialogTitle>
        </DialogHeader>

          <form onSubmit={handleSubmit}>
            {/* Content */}
            <div className="px-6 py-4 space-y-6">
              {/* Product Info */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{item.product?.name}</h4>
                    <p className="text-sm text-gray-600">{item.product?.productCode} | {item.product?.sku}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Category</p>
                    <p className="font-medium text-gray-900">{item.product?.category?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Available Stock</p>
                    <p className="font-medium text-gray-900">{item.availableQuantity} units</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Unit Price</p>
                    <p className="font-medium text-gray-900">
                      LKR {item.product?.unitPrice?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transfer Flow Visual */}
              <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 text-center">
                  <p className="text-sm text-gray-600 mb-1">From</p>
                  <div className="bg-white rounded-lg p-3 border-2 border-orange-400">
                    <p className="font-semibold text-gray-900">{item.location?.name || item.branch?.name}</p>
                    <p className="text-sm text-gray-600">{item.location?.locationCode || item.branch?.code}</p>
                    <p className="text-xs text-orange-600 mt-1">{item.quantity} units available</p>
                  </div>
                </div>

                <ArrowRight className="w-8 h-8 text-gray-400 flex-shrink-0" />

                <div className="flex-1 text-center">
                  <p className="text-sm text-gray-600 mb-1">To</p>
                  <div className={`bg-white rounded-lg p-3 border-2 ${selectedBranch ? 'border-green-500' : 'border-gray-300 border-dashed'}`}>
                    {selectedBranch ? (
                      <>
                        <p className="font-semibold text-gray-900">{selectedBranch.name}</p>
                        <p className="text-sm text-gray-600">{selectedBranch.code}</p>
                        <p className="text-xs text-green-600 mt-1">Destination branch</p>
                      </>
                    ) : (
                      <p className="text-gray-400">Select branch</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Destination Branch Selection */}
              <div>
                <label htmlFor="toBranchId" className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Branch <span className="text-red-500">*</span>
                </label>
                <select
                  id="toBranchId"
                  value={toBranchId}
                  onChange={(e) => setToBranchId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select destination branch...</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
                {availableBranches.length === 0 && (
                  <p className="mt-2 text-sm text-amber-600">
                    ⚠️ No other branches available for transfer
                  </p>
                )}
              </div>

              {/* Quantity Input */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Quantity <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="quantity"
                    min="1"
                    max={item.quantity}
                    value={quantity || ''}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter quantity to transfer"
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    Max: {item.quantity}
                  </div>
                </div>
                {quantity > 0 && quantity <= item.quantity && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Remaining at source:</span>
                    <span className="font-medium text-gray-900">{item.quantity - quantity} units</span>
                  </div>
                )}
                {quantity > item.quantity && (
                  <p className="mt-2 text-sm text-red-600">
                    ⚠️ Quantity exceeds available stock
                  </p>
                )}
              </div>

              {/* Transfer Value */}
              {quantity > 0 && item.product?.unitPrice && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Transfer Value</span>
                    <span className="text-lg font-bold text-orange-600">
                      LKR {(quantity * item.product.unitPrice).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Add notes about this transfer (e.g., reason, special instructions)..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={loading || !toBranchId || quantity <= 0 || quantity > item.quantity}>
                {loading ? 'Processing Transfer...' : 'Transfer Stock'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}
