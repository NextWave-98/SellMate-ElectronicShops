import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useLocation } from '../../../hooks/useLocation';
import { useProduct } from '../../../hooks/useProduct';
import useFetch from '../../../hooks/useFetch';

interface ProductInventory {
  id: string;
  name: string;
  sku: string;
  productCode: string;
  availableQuantity: number;
  unitPrice: number;
}

interface TransferItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  availableQuantity: number;
  unitCost: number;
}

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    fromBranchId: string;
    toBranchId: string;
    items: Array<{ productId: string; requestedQuantity: number; unitCost?: number; notes?: string }>;
    notes?: string;
  }) => Promise<void>;
}

const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { getAllLocations } = useLocation();
  const { products, getAllProducts } = useProduct();
  const { fetchData } = useFetch();

  const [branches, setBranches] = useState<any[]>([]);
  const [sourceBranchId, setSourceBranchId] = useState<string>('');
  const [destinationBranchId, setDestinationBranchId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [branchInventory, setBranchInventory] = useState<ProductInventory[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      getAllProducts();
    }
  }, [isOpen]);

  const loadBranches = async () => {
    const response = await getAllLocations({ page: 1, limit: 100, isActive: true });
    if (response?.success && response?.data) {
      const responseData = response.data as unknown as { locations?: any[] };
      const locations = Array.isArray(response.data) ? response.data : responseData.locations || [];
      setBranches(locations);
    }
  };

  // Fetch inventory when source branch changes
  const fetchBranchInventory = useCallback(async (branchId: string) => {
    setError('');
    try {
      const response = await fetchData({
        endpoint: `/inventory/branch/${branchId}`,
        method: 'GET',
        silent: true
      });

      if (response?.data) {
        const inventoryData = Array.isArray(response.data) ? response.data : [];
        
        // Map inventory to product inventory format
        const mappedInventory: ProductInventory[] = inventoryData
          .filter((inv: any) => inv.availableQuantity > 0)
          .map((inv: any) => ({
            id: inv.product?.id || inv.productId,
            name: inv.product?.name || 'Unknown Product',
            sku: inv.product?.sku || inv.product?.productCode || 'N/A',
            productCode: inv.product?.productCode || inv.product?.sku || 'N/A',
            availableQuantity: inv.availableQuantity || 0,
            unitPrice: inv.product?.unitPrice || inv.averageCost || 0
          }));

        setBranchInventory(mappedInventory);
      }
    } catch (err) {
      console.error('Error fetching branch inventory:', err);
      setError('Failed to load branch inventory. Please try again.');
      setBranchInventory([]);
    }
  }, [fetchData]);

  useEffect(() => {
    if (sourceBranchId) {
      fetchBranchInventory(sourceBranchId);
      // Clear transfer items when source branch changes
      setTransferItems([]);
    } else {
      setBranchInventory([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceBranchId]);

  const mainStoreBranch = branches.find((b: any) => b.isMainStore);

  const availableProducts: ProductInventory[] = branchInventory
    .filter(p => {
      // Filter out already added products
      return !transferItems.some(item => item.productId === p.id);
    });

  const handleAddItem = () => {
    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }

    const product = availableProducts.find(p => p.id === selectedProductId);
    if (!product) {
      setError('Product not found');
      return;
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (quantity > product.availableQuantity) {
      setError(`Only ${product.availableQuantity} units available`);
      return;
    }

    const newItem: TransferItem = {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity,
      availableQuantity: product.availableQuantity,
      unitCost: product.unitPrice
    };

    setTransferItems([...transferItems, newItem]);
    setSelectedProductId('');
    setQuantity(1);
    setError('');
  };

  const handleRemoveItem = (productId: string) => {
    setTransferItems(transferItems.filter(item => item.productId !== productId));
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    setTransferItems(
      transferItems.map(item => {
        if (item.productId === productId) {
          if (newQuantity > item.availableQuantity) {
            setError(`Only ${item.availableQuantity} units available for ${item.productName}`);
            return item;
          }
          setError('');
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!sourceBranchId) {
      setError('Please select a source branch');
      return;
    }

    if (!destinationBranchId) {
      setError('Please select a destination branch');
      return;
    }

    if (sourceBranchId === destinationBranchId) {
      setError('Source and destination branches must be different');
      return;
    }

    if (transferItems.length === 0) {
      setError('Please add at least one product');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        fromBranchId: sourceBranchId,
        toBranchId: destinationBranchId,
        items: transferItems.map(item => ({
          productId: item.productId,
          requestedQuantity: item.quantity,
          unitCost: item.unitCost
        })),
        notes: notes.trim() || undefined,
      });

      // Reset form
      setSourceBranchId('');
      setDestinationBranchId('');
      setNotes('');
      setTransferItems([]);
      setSelectedProductId('');
      setQuantity(1);
      setBranchInventory([]);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setLoading(false);
    }
  };

  const totalItems = transferItems.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="glass-modal-panel max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Create Stock Transfer</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-modal-scroll px-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Branch Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Branch (From) <span className="text-red-500">*</span>
              </label>
              <select
                value={sourceBranchId}
                onChange={(e) => setSourceBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                required
                disabled={loading}
              >
                <option value="">Select source branch</option>
                {branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} {branch.isMainStore ? '(Main Store)' : ''}
                  </option>
                ))}
              </select>
              {mainStoreBranch && sourceBranchId === '' && (
                <p className="mt-1 text-xs text-gray-500">
                  Tip: Select {mainStoreBranch.name} for main store transfers
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Branch (To) <span className="text-red-500">*</span>
              </label>
              <select
                value={destinationBranchId}
                onChange={(e) => setDestinationBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                required
                disabled={loading}
              >
                <option value="">Select destination branch</option>
                {branches
                  .filter((branch: any) => branch.id !== sourceBranchId)
                  .map((branch: any) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} {branch.isMainStore ? '(Main Store)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Add Product Section */}
          {sourceBranchId && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Products</h3>
              {branchInventory.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No products available in the selected branch or loading inventory...
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Product
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      disabled={loading}
                    >
                      <option value="">Choose a product</option>
                      {availableProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku}) - {product.availableQuantity} available
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:bg-gray-400"
                        disabled={loading || !selectedProductId}
                      >
                        <Plus size={20} />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transfer Items List */}
          {transferItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Transfer Items ({totalItems} total units)
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Available
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transferItems.map((item) => (
                      <tr key={item.productId}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {item.availableQuantity}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="number"
                            min="1"
                            max={item.availableQuantity}
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                item.productId,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            disabled={loading}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          ${item.unitCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            disabled={loading}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
              placeholder="Add any additional notes or comments..."
              disabled={loading}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {transferItems.length > 0 && (
              <span>
                {transferItems.length} product{transferItems.length !== 1 ? 's' : ''}, {totalItems}{' '}
                total unit{totalItems !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || transferItems.length === 0}
            >
              {loading ? 'Creating...' : 'Create Transfer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTransferModal;
