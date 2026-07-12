/* eslint-disable react-hooks/exhaustive-deps */
import { useState,useEffect, useCallback } from 'react';
import { X, PackageCheck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import usePurchaseOrder from '../../../hooks/usePurchaseOrder';
import { useLocation } from '../../../hooks/useLocation';

interface ReceivePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder: {
    id: string;
    poNumber?: string;
    orderNumber?: string;
    items?: {
      id: string;
      product?: {
        id: string;
        name: string;
        productCode: string;
      };
      quantity: number;
      receivedQuantity?: number;
    }[];
  } | null;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  locationType?: string;
}

interface ProductItem {
  productId: string;
  productCode: string;
  productName: string;
  orderedQuantity: number;
  receiveQuantity: number;
  notes: string;
}

export default function ReceivePurchaseOrderModal({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
}: ReceivePurchaseOrderModalProps) {
  const poHook = usePurchaseOrder();
  const locationHook = useLocation();
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [locationId, setLocationId] = useState('');
  const [autoUpdateInventory, setAutoUpdateInventory] = useState(true);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [productItems, setProductItems] = useState<ProductItem[]>([]);

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const response = await locationHook.getAllLocations({ page: 1, limit: 100 });
      if (response?.success && response?.data) {
        const responseData = response.data as unknown as { locations?: Branch[] };
        const locations = Array.isArray(response.data) ? response.data : responseData.locations || [];
       // const warehouseLocations = locations.filter((loc) => loc.locationType === 'WAREHOUSE');
        setBranches(locations);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  const initializeProductItems = useCallback(() => {
    if (!purchaseOrder?.items) return;

    const items: ProductItem[] = purchaseOrder.items
      .filter((item) => item.product)
      .map((item) => ({
        productId: item.product!.id,
        productCode: item.product!.productCode,
        productName: item.product!.name,
        orderedQuantity: item.quantity,
        receiveQuantity: item.quantity - (item.receivedQuantity || 0),
        notes: '',
      }));

    setProductItems(items);
  }, [purchaseOrder]);

  // Load branches and initialize product items when modal opens
  useEffect(() => {
    if (isOpen && purchaseOrder) {
      loadBranches();
      initializeProductItems();
    }
  }, [isOpen, initializeProductItems]);

  const handleQuantityChange = (productId: string, quantity: number) => {
    setProductItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, receiveQuantity: Math.max(0, quantity) } : item
      )
    );
  };

  const handleNotesChange = (productId: string, notes: string) => {
    setProductItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, notes } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationId) {
      toast.error('Please select a location');
      return;
    }

    if (!purchaseOrder) {
      toast.error('No purchase order selected');
      return;
    }

    const itemsToReceive = productItems.filter((item) => item.receiveQuantity > 0);

    if (itemsToReceive.length === 0) {
      toast.error('Please specify quantities to receive for at least one product');
      return;
    }

    setLoading(true);
    try {
      const receiveData = {
        locationId,
        receivedDate,
        autoUpdateInventory,
        items: itemsToReceive.map((item) => ({
          productId: item.productId,
          quantityReceived: item.receiveQuantity,
          notes: item.notes || undefined,
        })),
        notes: generalNotes || undefined,
      };

      const response = await poHook.receivePurchaseOrderWithItems(purchaseOrder.id, receiveData);

      if (response?.success) {
        toast.success('Purchase order received successfully');
        onSuccess();
        onClose();
        resetForm();
      }
    } catch (error: unknown) {
      console.error('Error receiving purchase order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to receive purchase order';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLocationId('');
    setAutoUpdateInventory(true);
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setGeneralNotes('');
    setProductItems([]);
  };

  if (!isOpen || !purchaseOrder) return null;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="glass-modal-header flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Receive Purchase Order</h2>
            <p className="text-sm text-gray-600 mt-1">PO #{purchaseOrder.poNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="glass-modal-scroll px-6 py-6">
          <div className="space-y-6">
            {/* Branch and Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Receiving Location <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 font-normal ml-1">(Stock will be added here)</span>
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  required
                  disabled={loadingBranches}
                >
                  <option value="">Select location (typically Main Branch)</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {/* {branch.code === 'MAIN' || branch.name.toLowerCase().includes('main') ? ' - Main Warehouse' : ''} */}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-amber-600 mt-1">
                  💡 Tip: Receive to Main Branch first, then use Stock Transfer to distribute to other branches
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Location Selection Warning */}
            {locationId && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-900">
                  <strong>Stock will be added to:</strong> {branches.find(b => b.id === locationId)?.name} ({branches.find(b => b.id === locationId)?.code})
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  ⓘ Products will be available for transfer from this location to other locations after receipt.
                </p>
              </div>
            )}

            {/* Auto Update Inventory Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoUpdateInventory"
                checked={autoUpdateInventory}
                onChange={(e) => setAutoUpdateInventory(e.target.checked)}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-400"
              />
              <label htmlFor="autoUpdateInventory" className="text-sm text-gray-700">
                Automatically update inventory for received items (Recommended)
              </label>
            </div>

            {/* Products Table */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PackageCheck className="w-4 h-4 inline mr-1" />
                Products to Receive
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product Name
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Ordered
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Receive Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productItems.map((item) => (
                      <tr key={item.productId}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.productCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {item.orderedQuantity}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.orderedQuantity}
                            value={item.receiveQuantity}
                            onChange={(e) =>
                              handleQuantityChange(item.productId, parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => handleNotesChange(item.productId, e.target.value)}
                            placeholder="Optional notes..."
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                General Notes
              </label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={3}
                placeholder="Add any general notes about this receipt..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
            </div>

            {/* Info Box */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 mb-2">Receipt Information</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Received quantities will be recorded against this purchase order</li>
                {autoUpdateInventory && locationId && (
                  <li>• Inventory will be automatically updated for: <span className="font-semibold">{branches.find(b => b.id === locationId)?.name || 'selected location'}</span></li>
                )}
                <li>• Purchase order status will be updated based on received quantities</li>
                <li>• Stock movement records will be created for tracking</li>
                <li className="text-orange-700 font-medium">⚠️ Make sure to receive to the correct location (typically Main Branch for initial stock)</li>
              </ul>
            </div>
          </div>
          </div>

          {/* Action Buttons */}
          <div className="glass-modal-footer flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-300"
              disabled={loading || !locationId}
            >
              {loading ? 'Receiving...' : 'Receive Items'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
