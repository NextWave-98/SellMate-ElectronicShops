/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { X, CheckCircle, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGoodsReceipt, type GoodsReceipt } from '../../../hooks/useGoodsReceipt';
import { useLocation } from '../../../hooks/useLocation';
import LoadingSpinner from '../../common/LoadingSpinner';

interface ApproveGoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goodsReceipt: GoodsReceipt | null;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

export default function ApproveGoodsReceiptModal({
  isOpen,
  onClose,
  onSuccess,
  goodsReceipt,
}: ApproveGoodsReceiptModalProps) {
  const { approveGoodsReceipt } = useGoodsReceipt();
  const locationHook = useLocation();
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [locationId, setLocationId] = useState('');
  const [qualityCheckNotes, setQualityCheckNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBranches();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const response = await locationHook. getAllLocations();
      if (response?.success && response?.data) {
        const responseData = response.data as unknown as { locations?: any[] };
        const locations = Array.isArray(response.data) ? response.data : responseData.locations || [];
        setBranches(locations as unknown as Branch[]);
      
        const mainStore = locations.find(
          (b: any) => b.code === 'MAIN' || b.code === 'WAREHOUSE' || b.locationCode === 'MAIN' || b.locationCode === 'WAREHOUSE'
        );
        if (mainStore) {
          setLocationId(mainStore.id);
        }
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationId) {
      toast.error('Please select a location (main store)');
      return;
    }

    if (!goodsReceipt) {
      toast.error('No goods receipt selected');
      return;
    }

    setLoading(true);
    try {
     const res= await approveGoodsReceipt(goodsReceipt.id, {
        locationId,
        qualityCheckNotes: qualityCheckNotes || undefined,
      });

     if(res?.success===true){
      onSuccess();
      handleClose();}
    } catch (error) {
      console.error('Error approving goods receipt:', error);
      toast.error('Failed to approve goods receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLocationId('');
    setQualityCheckNotes('');
    onClose();
  };

  if (!isOpen || !goodsReceipt) return null;

  const totalAccepted = goodsReceipt.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
  const totalRejected = goodsReceipt.items.reduce((sum, item) => sum + item.rejectedQuantity, 0);

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-3xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="glass-modal-header flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold">Approve Goods Receipt & Update Inventory</h2>
              <p className="text-sm text-gray-600">GRN: {goodsReceipt.receiptNumber}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="glass-modal-scroll min-h-0 flex-1">
          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
            {/* Summary */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-2">Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Items</p>
                  <p className="text-lg font-semibold text-gray-900">{goodsReceipt.items.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Accepted Qty</p>
                  <p className="text-lg font-semibold text-green-600">{totalAccepted}</p>
                </div>
                <div>
                  <p className="text-gray-600">Rejected Qty</p>
                  <p className="text-lg font-semibold text-red-600">{totalRejected}</p>
                </div>
              </div>
            </div>

            {/* Branch Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Select Main Store / Warehouse /Shop *
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                required
                disabled={loadingBranches}
              >
                <option value="">Select a branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.locationCode || branch.code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select the main store or warehouse where inventory will be updated
              </p>
            </div>

            {/* Items Preview */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Items to be Added to Inventory</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Accepted</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rejected</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {goodsReceipt.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                          <div className="text-xs text-gray-500">{item.product?.productCode}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-green-600 font-semibold">
                          {item.acceptedQuantity}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-600">
                          {item.rejectedQuantity}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.qualityStatus === 'ACCEPTED'
                                ? 'bg-green-100 text-green-800'
                                : item.qualityStatus === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : item.qualityStatus === 'PARTIAL'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.qualityStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quality Check Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality Check Notes
              </label>
              <textarea
                value={qualityCheckNotes}
                onChange={(e) => setQualityCheckNotes(e.target.value)}
                rows={3}
                placeholder="Enter any quality check notes or observations..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action will update the inventory for the selected branch. 
                Once approved, the goods receipt cannot be modified. Please ensure all information is correct.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="glass-modal-footer flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !locationId}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Update Inventory
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
