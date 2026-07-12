/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { X, Package, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import useStock from '../../../hooks/useStock';
import { useLocation } from '../../../hooks/useLocation';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Part {
  id: string;
  partNumber: string;
  name: string;
  category: string;
}

export default function StockTransferModal({ isOpen, onClose, onSuccess }: StockTransferModalProps) {
  const stockHook = useStock();
  const locationHook = useLocation();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  
  const [formData, setFormData] = useState({
    partId: '',
    fromBranchId: '',
    toBranchId: '',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Load branches/locations
      const branchResponse = await locationHook.getAllLocations({ page: 1, limit: 100 });
      if (branchResponse?.success && branchResponse?.data) {
        const responseData = branchResponse.data as unknown as { locations?: any[] };
        const locations = Array.isArray(branchResponse.data) ? branchResponse.data : responseData.locations || [];
        setBranches(locations as unknown as Branch[]);
      }

      // Load parts from inventory
      const inventoryResponse = await stockHook.getAllInventory({ limit: 1000 });
      if (inventoryResponse?.data) {
        const uniqueParts = new Map<string, Part>();
        (inventoryResponse.data as any[]).forEach((item: any) => {
          if (item.part && !uniqueParts.has(item.part.id)) {
            uniqueParts.set(item.part.id, item.part);
          }
        });
        setParts(Array.from(uniqueParts.values()));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.partId || !formData.fromBranchId || !formData.toBranchId || !formData.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.fromBranchId === formData.toBranchId) {
      toast.error('Source and destination branches must be different');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        partId: formData.partId,
        fromBranchId: formData.fromBranchId,
        toBranchId: formData.toBranchId,
        quantity: parseInt(formData.quantity),
        notes: formData.notes || undefined,
      };

      const response = await stockHook.transferStock(submitData);
      
      if (response?.success) {
        toast.success('Stock transfer initiated successfully');
        onSuccess();
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Error transferring stock:', error);
      toast.error('Failed to transfer stock');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      partId: '',
      fromBranchId: '',
      toBranchId: '',
      quantity: '',
      notes: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Transfer Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {loadingData ? (
            <div className="py-12 text-center text-gray-600">Loading data...</div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Part Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Package className="w-4 h-4 inline mr-1" />
                    Part <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="partId"
                    value={formData.partId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    required
                  >
                    <option value="">Select a part</option>
                    {parts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.partNumber} - {part.name} ({part.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* From Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    From Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="fromBranchId"
                    value={formData.fromBranchId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    required
                  >
                    <option value="">Select source branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* To Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    To Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="toBranchId"
                    value={formData.toBranchId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    required
                  >
                    <option value="">Select destination branch</option>
                    {branches.map((branch) => (
                      <option 
                        key={branch.id} 
                        value={branch.id}
                        disabled={branch.id === formData.fromBranchId}
                      >
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="Enter quantity to transfer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Add any notes about this transfer..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>

                {/* Info Box */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-orange-900 mb-2">Transfer Process</h4>
                  <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                    <li>Stock will be deducted from the source branch</li>
                    <li>Stock will be added to the destination branch</li>
                    <li>A stock movement record will be created for tracking</li>
                    <li>Make sure the source branch has sufficient quantity</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Transferring...' : 'Transfer Stock'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
