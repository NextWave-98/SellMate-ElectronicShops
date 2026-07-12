/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import useFetch from '../../../hooks/useFetch';
import { Package, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  branches: Array<{ id: string; name: string; code: string }>;
  products: Array<{ id: string; name: string; productCode: string; sku: string; category: { id: string; name: string; } }>;
  onSubmit: (data: InventoryFormData) => Promise<void>;
  mode: 'create' | 'edit';
}

interface InventoryItem {
  id: string;
  productId: string;
  branchId?: string;
  locationId?: string;
  quantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  location?: string;
  zone?: string;
}

interface InventoryFormData {
  id?: string;
  productId: string;
  branchId: string;
  quantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  location?: string;
  zone?: string;
}

type ProductApi = {
  id: string;
  name: string;
  productCode?: string;
  sku?: string;
  category?: { id: string; name?: string } | null;
  categoryId?: string;
};

export default function InventoryFormModal({
  isOpen,
  onClose,
  item,
  branches,
  products,
  onSubmit,
  mode,
}: InventoryFormModalProps) {
  const [formData, setFormData] = useState<InventoryFormData>({
    productId: '',
    branchId: '',
    quantity: 0,
    minStockLevel: 10,
    maxStockLevel: 100,
    // location: '',
    zone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localProducts, setLocalProducts] = useState<ProductApi[]>(products || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // useFetch hook (we'll call fetchData with search endpoint overrides)
  const { loading: loadingFetch, fetchData } = useFetch<ProductApi[]>('/api/products?limit=50', {
    method: 'GET',
    silent: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && item) {
        setFormData({
          id: item.id,
          productId: item.productId,
          branchId: item.locationId || item.branchId || '',
          quantity: item.quantity,
          minStockLevel: item.minStockLevel,
          maxStockLevel: item.maxStockLevel,
          // location: item.location,
          zone: item.zone,
        });
      } else {
        setFormData({
          productId: '',
          branchId: '',
          quantity: 0,
          minStockLevel: 10,
          maxStockLevel: 100,
          // location: '',
          zone: '',
        });
      }
      setErrors({});
      // clear search/results when opening
      setSearchTerm('');
      // preserve provided products when editing so selected product can be displayed
      if (mode === 'edit') {
        setLocalProducts(products || []);
      } else {
        setLocalProducts([]);
      }
      setShowDropdown(false);
    }
  }, [isOpen, mode, item, products]);

  // Debounced search: call API when searchTerm changes
  useEffect(() => {
    if (!isOpen) return;

    if (!searchTerm) {
      setLocalProducts([]);
      setShowDropdown(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetchData({ endpoint: `/products?limit=50&search=${encodeURIComponent(searchTerm)}`, silent: true });
        if (res && Array.isArray(res.data)) {
          const mapped = (res.data as ProductApi[]).map((p) => {
            const cat = p.category
              ? { id: p.category.id || '', name: p.category.name || '' }
              : { id: p.categoryId || '', name: '' };
            return {
              id: p.id,
              name: p.name || '',
              productCode: p.productCode || '',
              sku: p.sku || '',
              category: cat,
            };
          });
          setLocalProducts(mapped);
          setShowDropdown(true);
        } else {
          setLocalProducts([]);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Error searching products via useFetch:', err);
        setLocalProducts([]);
        setShowDropdown(true);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [searchTerm, isOpen]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId) {
      newErrors.productId = 'Please select a product';
    }

    if (!formData.branchId) {
      newErrors.branchId = 'Please select a branch';
    }

    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }

    if (formData.minStockLevel !== undefined && formData.minStockLevel < 0) {
      newErrors.minStockLevel = 'Minimum stock level cannot be negative';
    }

    if (formData.maxStockLevel && formData.minStockLevel && formData.maxStockLevel <= formData.minStockLevel) {
      newErrors.maxStockLevel = 'Maximum stock level must be greater than minimum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    //   handleClose();
    } catch (error) {
      console.error('Failed to save inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      productId: '',
      branchId: '',
      quantity: 0,
      minStockLevel: 10,
      maxStockLevel: 100,
      location: '',
      zone: '',
    });
    setErrors({});
    setSearchTerm('');
    setLocalProducts([]);
    onClose();
  };

  const handleChange = (field: keyof InventoryFormData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Look for the selected product in local search results first, then fallback to the provided `products` prop
  const selectedProduct = (localProducts || []).find((p) => p.id === formData.productId) || (products || []).find((p) => p.id === formData.productId);
  const selectedBranch = branches.find((b) => b.id === formData.branchId);

  const selectProduct = (p: ProductApi) => {
    handleChange('productId', p.id);
    // keep the product name visible in the input after selecting
    setSearchTerm(p.name || '');
    // ensure the selected product exists in localProducts so selectedProduct lookup works
    setLocalProducts((prev) => {
      if (!prev) return [p];
      if (prev.find((x) => x.id === p.id)) return prev;
      return [p, ...prev];
    });
    setShowDropdown(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]  ">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-black" />
            <DialogTitle>{mode === 'create' ? 'Add New Inventory Item' : 'Edit Inventory Item'}</DialogTitle>
          </div>
        </DialogHeader>

          <form onSubmit={handleSubmit}>
            {/* Content */}
            <div className="px-6 py-4 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
              {/* Selection Summary */}
              {(selectedProduct || selectedBranch) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Selected Details</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedProduct && (
                      <div>
                        <p className="text-gray-600">Product</p>
                        <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                        <p className="text-xs text-gray-500">{selectedProduct.productCode} | {selectedProduct.sku}</p>
                      </div>
                    )}
                    {selectedBranch && (
                      <div>
                        <p className="text-gray-600">Branch</p>
                        <p className="font-medium text-gray-900">{selectedBranch.name}</p>
                        <p className="text-xs text-gray-500">{selectedBranch.code}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Product Selection */}
              <div>
                <label htmlFor="productSearch" className="block text-sm font-medium text-gray-700 mb-2">
                  Product <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="productSearch"
                    type="text"
                    value={selectedProduct?.name ?? searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => { if (localProducts.length > 0) setShowDropdown(true); }}
                    placeholder={mode === 'edit' ? '' : 'Search products by name, SKU or code...'}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      errors.productId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={mode === 'edit'}
                  />
                  {showDropdown && (
                    <ul className="absolute z-40 left-0 right-0 mt-1 max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
                      {loadingFetch ? (
                        <li className="px-4 py-2 text-sm text-gray-500">Loading products...</li>
                      ) : localProducts.length === 0 ? (
                        <li className="px-4 py-2 text-sm text-gray-500">No products found</li>
                      ) : (
                        localProducts.map((product) => (
                          <li
                            key={product.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectProduct(product)}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-gray-500">{product.productCode} | {product.sku} {product.category?.name ? `• ${product.category.name}` : ''}</div>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                {errors.productId && <p className="mt-1 text-sm text-red-600">{errors.productId}</p>}
              </div>

              {/* Branch Selection */}
              <div>
                <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-2">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  id="branchId"
                  value={formData.branchId}
                  onChange={(e) => handleChange('branchId', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.branchId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                  disabled={mode === 'edit'}
                >
                    <option value="">Select a branch...</option>
                    {branches.length === 0 ? (
                      <option value="" disabled>
                        No branches available
                      </option>
                    ) : (
                      branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </option>
                      ))
                    )}
                </select>
                {errors.branchId && <p className="mt-1 text-sm text-red-600">{errors.branchId}</p>}
              </div>

              {/* Current Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
              </div>

              {/* Stock Level Settings */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Stock Level Settings</h4>

                <div className="grid grid-cols-2 gap-4">
                  {/* Min Stock Level */}
                  <div>
                    <label htmlFor="minStockLevel" className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Stock Level
                    </label>
                    <input
                      type="number"
                      id="minStockLevel"
                      min="0"
                      value={formData.minStockLevel || ''}
                      onChange={(e) => handleChange('minStockLevel', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Optional override"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                        errors.minStockLevel ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.minStockLevel && <p className="mt-1 text-sm text-red-600">{errors.minStockLevel}</p>}
                  </div>

                  {/* Max Stock Level */}
                  <div>
                    <label htmlFor="maxStockLevel" className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Stock Level
                    </label>
                    <input
                      type="number"
                      id="maxStockLevel"
                      min="0"
                      value={formData.maxStockLevel || ''}
                      onChange={(e) => handleChange('maxStockLevel', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Optional override"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                        errors.maxStockLevel ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.maxStockLevel && <p className="mt-1 text-sm text-red-600">{errors.maxStockLevel}</p>}
                  </div>

                  {/* Location */}
                  {/* <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={formData.location || ''}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="e.g., Warehouse A, Shelf 5"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                  </div> */}

                  {/* Zone */}
                  <div>
                    <label htmlFor="zone" className="block text-sm font-medium text-gray-700 mb-2">
                      Zone
                    </label>
                    <input
                      type="text"
                      id="zone"
                      value={formData.zone || ''}
                      onChange={(e) => handleChange('zone', e.target.value)}
                      placeholder="e.g., Zone A, Electronics"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Visual Guide */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Stock Level Guide:</p>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-orange-400"></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>Min: {formData.minStockLevel || 0}</span>
                        <span>Max: {formData.maxStockLevel || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white inline-flex items-center gap-2" disabled={loading}>
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : mode === 'create' ? 'Create Inventory' : 'Update Inventory'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}
