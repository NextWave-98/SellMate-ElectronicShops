/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { X, Package, MapPin, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProduct } from '../../../hooks/useProduct';
import { useLocation } from '../../../hooks/useLocation';

interface ProductTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouseOr: boolean | null;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  locationType: string;
}

interface Product {
  id: string;
  productCode: string;
  name: string;
  categoryName?: string;
  unitPrice: number;
  reorderPoint?: number;
}

interface SelectedProduct {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  availableStock?: number;
}

export default function ProductTransferModal({ isOpen, onClose, onSuccess, warehouseOr }: ProductTransferModalProps) {
  const productHook = useProduct();
  const locationHook = useLocation();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  const [formData, setFormData] = useState({
    fromLocationId: '',
    toLocationId: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Debounced SERVER-side product search (top 20 matches) — replaces the old
  // 1000-product prefetch + client-side filtering.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await productHook.getAllProducts({ search: searchQuery.trim(), limit: 20 } as any);
        setFilteredProducts(Array.isArray(res?.data) ? (res.data as Product[]) : []);
      } catch {
        setFilteredProducts([]);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      let locationResponse;
      // Load locations
      if (warehouseOr === false) {
        locationResponse = await locationHook.getWarehouses();
      } else if (warehouseOr === true) {
        locationResponse = await locationHook.getAllLocations();
      }

      else {
        locationResponse = await locationHook.getBranches();
      }

      if (locationResponse?.success && locationResponse?.data) {
        const locations = Array.isArray(locationResponse.data) ? locationResponse.data : (locationResponse.data as { locations?: any[] }).locations || [];
        setBranches(locations as unknown as Branch[]);
      }

      // Products are now fetched on demand via the debounced server search above
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddProduct = (product: Product) => {
    if (selectedProducts.find((p) => p.productId === product.id)) {
      toast.error('Product already added');
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product.id,
        productCode: product.productCode,
        productName: product.name,
        quantity: 1,
      },
    ]);
    setSearchQuery('');
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.productId !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.productId === productId ? { ...p, quantity } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fromLocationId || !formData.toLocationId) {
      toast.error('Please select both source and destination branches');
      return;
    }

    if (formData.fromLocationId === formData.toLocationId) {
      toast.error('Source and destination branches must be different');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Please add at least one product to transfer');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        fromLocationId: formData.fromLocationId,
        toLocationId: formData.toLocationId,
        notes: formData.notes || undefined,
        products: selectedProducts.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
        })),
      };

      const response = await productHook.bulkTransferProducts(submitData);

      if (response?.success) {
        toast.success(`Successfully transferred ${selectedProducts.length} product(s)`);
        onSuccess();
        onClose();
        resetForm();
      }
    } catch (error: unknown) {
      console.error('Error transferring products:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transfer products';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fromLocationId: '',
      toLocationId: '',
      notes: '',
    });
    setSelectedProducts([]);
    setSearchQuery('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">Transfer Products</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {loadingData ? (
            <div className="py-12 text-center text-gray-600">Loading data...</div>
          ) : (
            <>
              <div className="space-y-6">
                {/* Branch Selection Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* From Branch */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      From Branch <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="fromLocationId"
                      value={formData.fromLocationId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      required
                    >
                      <option value="">Select source branch</option>
                      
                      {warehouseOr === true ? branches
                        .filter(branch => branch.locationType  === "WAREHOUSE")
                        .map(branch => (
                          <option key={branch.id} value={branch.id}>
                            Warehouse - {branch.name}
                          </option>
                        )) : branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
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
                      name="toLocationId"
                      value={formData.toLocationId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      required
                    >
                      <option value="">Select destination branch</option>
                      {branches.map((branch) => (
                        <option
                          key={branch.id}
                          value={branch.id}
                          disabled={branch.id === formData.fromLocationId}
                          className={branch.locationType  !== "BRANCH"? 'hidden' : ''}
                        >
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Product Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Package className="w-4 h-4 inline mr-1" />
                    Search Products <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by product code, name, or category..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {searchQuery && filteredProducts.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="w-full text-left px-4 py-2 hover:bg-orange-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">{product.productCode}</div>
                              <div className="text-sm text-gray-600">{product.name}</div>
                              {product.categoryName && (
                                <div className="text-xs text-gray-500">{product.categoryName}</div>
                              )}
                            </div>
                            <div className="text-sm text-gray-700">
                              ${product.unitPrice}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Products Table */}
                {selectedProducts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Products ({selectedProducts.length})
                    </label>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product Code
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedProducts.map((product) => (
                            <tr key={product.productId}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {product.productCode}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {product.productName}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={product.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(product.productId, parseInt(e.target.value) || 1)
                                  }
                                  className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProduct(product.productId)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
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
                  <h4 className="text-sm font-semibold text-orange-900 mb-2">Transfer Information</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Products will be deducted from the source branch inventory</li>
                    <li>• Products will be added to the destination branch inventory</li>
                    <li>• Stock movements will be recorded for tracking</li>
                    <li>• Transfer operation is atomic (all or nothing)</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:bg-orange-300"
                  disabled={loading || selectedProducts.length === 0}
                >
                  {loading ? 'Transferring...' : `Transfer ${selectedProducts.length} Product(s)`}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
