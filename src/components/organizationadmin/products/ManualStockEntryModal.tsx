/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Layers, Tag, X } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import LocationSelector from '../../common/LocationSelector';
import { useProduct } from '../../../hooks/useProduct';
import { useAuth } from '../../../context/AuthContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  productCode: string;
  unitPrice: number;
  brand?: string;
  model?: string;
  hasVariants?: boolean;
  variantAttributes?: Record<string, any>;
  isReload?: boolean;
}

interface VariantEntry {
  variantId: string;
  variantName: string;
  sku: string;
  variantAttributes: Record<string, any>;
  currentStock: number;
  quantity: number;
}

interface SelectedProduct extends Product {
  quantity: number;
  notes?: string;
  variantEntries?: VariantEntry[];
  loadingVariants?: boolean;
}

interface ManualStockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lockedLocationId?: string;
}

export default function ManualStockEntryModal({
  isOpen,
  onClose,
  onSuccess,
  lockedLocationId,
}: ManualStockEntryModalProps) {
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const { getAllProducts, adjustProductStock, getProductVariants } = useProduct();

  useEffect(() => {
    if (isOpen && lockedLocationId) {
      setSelectedLocation(lockedLocationId);
    }
  }, [isOpen, lockedLocationId]);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (!productSearchTerm || productSearchTerm.length < 2) {
        setProducts([]);
        return;
      }

      setLoadingProducts(true);
      try {
        const response = await getAllProducts({
          search: productSearchTerm,
          isActive: true,
          limit: 20,
        });

        if (response?.success && response.data) {
          const productList = response.data.data || response.data.products || response.data || [];
          const transformedProducts = productList.map((product: any) => ({
            id: product.id,
            name: product.name,
            sku: product.sku || product.productCode,
            productCode: product.productCode || product.sku,
            unitPrice: product.unitPrice || product.sellingPrice || product.price || 0,
            brand: product.brand,
            model: product.model,
            hasVariants: product.hasVariants || false,
            variantAttributes: product.variantAttributes,
            isReload: product.isReload || false,
          }));
          setProducts(transformedProducts);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [productSearchTerm]);

  const handleAddProduct = async (product: Product) => {
    const existingProduct = selectedProducts.find((p) => p.id === product.id);
    if (existingProduct) {
      toast.error('Product already added');
      return;
    }

    if (product.hasVariants) {
      // Add with loading state first
      setSelectedProducts((prev) => [
        ...prev,
        { ...product, quantity: 0, notes: '', loadingVariants: true, variantEntries: [] },
      ]);
      setProductSearchTerm('');
      setShowProductDropdown(false);

      try {
        const res = await getProductVariants(product.id);
        const variants: any[] = (res as any)?.data?.data || (res as any)?.data || [];
        const variantEntries: VariantEntry[] = variants.map((v: any) => {
          const locStock =
            v.inventorySummary?.locations?.find(
              (l: any) => l.locationId === selectedLocation
            )?.quantity ?? v.inventorySummary?.totalQuantity ?? 0;
          return {
            variantId: v.id,
            variantName: v.name,
            sku: v.sku || v.productCode || '',
            variantAttributes: v.variantAttributes ?? {},
            currentStock: locStock,
            quantity: 0,
          };
        });

        setSelectedProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? { ...p, loadingVariants: false, variantEntries }
              : p
          )
        );
      } catch {
        setSelectedProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, loadingVariants: false } : p
          )
        );
        toast.error('Failed to load variants');
      }
    } else {
      setSelectedProducts([
        ...selectedProducts,
        { ...product, quantity: 1, notes: '' },
      ]);
      setProductSearchTerm('');
      setShowProductDropdown(false);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    );
  };

  const handleProductNotesChange = (productId: string, notes: string) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id === productId ? { ...p, notes } : p
      )
    );
  };

  const handleVariantQuantityChange = (productId: string, variantId: string, quantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variantEntries: p.variantEntries?.map((v) =>
                v.variantId === variantId ? { ...v, quantity: Math.max(0, quantity) } : v
              ),
            }
          : p
      )
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedLocation) {
      toast.error('Please select a store location');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    // Validate variant products have at least one variant qty > 0
    for (const p of selectedProducts) {
      if (p.hasVariants) {
        const hasAnyQty = p.variantEntries?.some((v) => v.quantity > 0);
        if (!hasAnyQty) {
          toast.error(`Please enter quantity for at least one variant of "${p.name}"`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const adjustmentPromises: Promise<any>[] = [];

      for (const product of selectedProducts) {
        if (product.hasVariants && product.variantEntries && product.variantEntries.length > 0) {
          // Submit one adjustment per variant that has qty > 0
          for (const entry of product.variantEntries) {
            if (entry.quantity > 0) {
              adjustmentPromises.push(
                adjustProductStock({
                  productId: entry.variantId,
                  branchId: selectedLocation,
                  quantity: entry.quantity,
                  type: 'IN',
                  reason: product.notes || notes || 'Manual stock entry',
                  notes: referenceNumber ? `Reference: ${referenceNumber}` : undefined,
                })
              );
            }
          }
        } else {
          adjustmentPromises.push(
            adjustProductStock({
              productId: product.id,
              branchId: selectedLocation,
              quantity: product.quantity,
              type: 'IN',
              reason: product.notes || notes || 'Manual stock entry',
              notes: referenceNumber ? `Reference: ${referenceNumber}` : undefined,
            })
          );
        }
      }

      const res = await Promise.all(adjustmentPromises);
      if (res[0]?.success === true) {
        onSuccess();
        handleClose();
      }
    } catch (error: any) {
      console.error('Failed to add stock:', error);
      toast.error(error?.response?.data?.message || 'Failed to add stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedLocation(lockedLocationId || '');
    setSelectedProducts([]);
    setProductSearchTerm('');
    setReferenceNumber('');
    setNotes('');
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(90vh,100dvh)] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="sticky top-0 z-10 rounded-t-2xl border-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 shrink-0" />
              <DialogTitle className="text-xl font-semibold text-white">
                Manual Stock Entry
              </DialogTitle>
            </div>
            <DialogClose className="rounded-md p-1 text-white opacity-90 transition-opacity hover:bg-white/10 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/40">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-6 py-4">
              {/* Store Location Selection */}
              {lockedLocationId ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Location
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {user?.branch?.name || user?.location?.name || 'Assigned branch selected'}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Store Location <span className="text-red-500">*</span>
                  </label>
                  <LocationSelector
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                    showAll={false}
                    placeholder="Select a store..."
                  />
                </div>
              )}

              {/* Reference Number (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g., PO-2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Product Search & Add */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search & Add Products <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search by product name or SKU..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />

                  {/* Product Dropdown */}
                  {showProductDropdown && productSearchTerm && (
                    <div className="absolute z-[200] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {loadingProducts ? (
                        <div className="px-4 py-3 text-center text-gray-500">
                          Searching...
                        </div>
                      ) : products.length > 0 ? (
                        products.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => handleAddProduct(product)}
                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              SKU: {product.sku} | Code: {product.productCode} | 
                              Price: Rs. {product.unitPrice.toLocaleString()}
                              {product.brand && ` | Brand: ${product.brand}`}
                              {product.model && ` | Model: ${product.model}`}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-gray-500">
                          No products found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Products ({selectedProducts.length})
                  </label>
                  <div className="space-y-3">
                    {selectedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {product.name}
                              </span>
                              {product.hasVariants && (
                                <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                                  <Layers className="w-3 h-3" />
                                  Has Variants
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              SKU: {product.sku} | Code: {product.productCode}
                              {product.brand && ` | ${product.brand}`}
                              {product.model && ` - ${product.model}`}
                            </div>
                          </div>

                          {/* Quantity input — only for simple (non-variant) products */}
                          {!product.hasVariants && (
                            <div className="flex items-center gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  {product.isReload ? 'Amount (LKR)' : 'Quantity'}
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={product.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      product.id,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </div>

                              <button
                                onClick={() => handleRemoveProduct(product.id)}
                                className="mt-5 p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {product.hasVariants && (
                            <button
                              onClick={() => handleRemoveProduct(product.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Variant rows */}
                        {product.hasVariants && (
                          <div className="mt-3">
                            {product.loadingVariants ? (
                              <div className="flex items-center gap-2 text-sm text-purple-600 py-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                Loading variants...
                              </div>
                            ) : product.variantEntries && product.variantEntries.length > 0 ? (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-purple-700 mb-1.5 flex items-center gap-1">
                                  <Layers className="w-3.5 h-3.5" />
                                  Set quantity to add per variant:
                                </div>
                                {product.variantEntries.map((entry) => (
                                  <div
                                    key={entry.variantId}
                                    className="flex items-center gap-2 flex-wrap bg-white border border-purple-100 rounded-lg px-3 py-2"
                                  >
                                    {/* Attribute badges */}
                                    <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                      {Object.entries(entry.variantAttributes).map(([k, v]) => (
                                        <span
                                          key={k}
                                          className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full"
                                        >
                                          <Tag className="w-2.5 h-2.5" />
                                          <span className="capitalize">{k}:</span>
                                          <strong>{String(v)}</strong>
                                        </span>
                                      ))}
                                      {Object.keys(entry.variantAttributes).length === 0 && (
                                        <span className="text-xs text-gray-500">{entry.variantName}</span>
                                      )}
                                    </div>

                                    {/* Current stock */}
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                      In stock:{' '}
                                      <strong className="text-gray-800">{entry.currentStock}</strong>
                                    </span>

                                    {/* Quantity input */}
                                    <div className="flex items-center gap-1">
                                      <label className="text-xs text-gray-500">Add:</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={entry.quantity}
                                        onChange={(e) =>
                                          handleVariantQuantityChange(
                                            product.id,
                                            entry.variantId,
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-1 focus:ring-orange-500"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">No variants found.</p>
                            )}
                          </div>
                        )}

                        {/* Product-specific notes */}
                        <div className="mt-3">
                          <input
                            type="text"
                            value={product.notes || ''}
                            onChange={(e) =>
                              handleProductNotesChange(product.id, e.target.value)
                            }
                            placeholder="Notes for this product (optional)"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  General Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Summary */}
              {selectedProducts.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Total Products:
                    </span>
                    <span className="text-lg font-bold text-orange-600">
                      {selectedProducts.length} items
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium text-gray-700">
                      Total Quantity:
                    </span>
                    <span className="text-lg font-bold text-orange-600">
                      {selectedProducts.reduce((sum, p) => {
                        if (p.hasVariants && p.variantEntries) {
                          return sum + p.variantEntries.reduce((s, v) => s + v.quantity, 0);
                        }
                        return sum + p.quantity;
                      }, 0)}{' '}
                      units
                    </span>
                  </div>
                </div>
              )}
        </DialogBody>

        <DialogFooter className="border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedProducts.length === 0 || !selectedLocation}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Adding Stock...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Stock
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
