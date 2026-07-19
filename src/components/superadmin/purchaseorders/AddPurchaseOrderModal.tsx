import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search, ChevronDown, Pencil, PackagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import usePurchaseOrder from '../../../hooks/usePurchaseOrder';
import useSupplier from '../../../hooks/useSupplier';
import useProduct from '../../../hooks/useProduct';
import QuickProductModal, { type QuickProduct } from './QuickProductModal';
import AsyncSearchSelect from '../../common/AsyncSearchSelect';
import { usePermissions } from '../../../hooks/usePermissions';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface AddPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSupplierId?: string;
}

interface OrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}

const validationSchema = Yup.object({
  supplierId: Yup.string().required('Supplier is required'),
  orderDate: Yup.string().required('Order date is required'),
  expectedDate: Yup.string().optional(),
  priority: Yup.string().oneOf(['LOW', 'NORMAL', 'HIGH', 'URGENT']).required('Priority is required'),
  paymentTerms: Yup.string().optional(),
  shippingMethod: Yup.string().optional(),
  shippingAddress: Yup.string().optional(),
  shippingCost: Yup.number().min(0).optional(),
  discountAmount: Yup.number().min(0).optional(),
  taxAmount: Yup.number().min(0).optional(),
  notes: Yup.string().optional(),
});

export default function AddPurchaseOrderModal({ isOpen, onClose, onSuccess, initialSupplierId }: AddPurchaseOrderModalProps) {
  const { canViewPurchaseOrderCosts } = usePermissions();
  const hideFinancials = !canViewPurchaseOrderCosts();
  const purchaseOrderHook = usePurchaseOrder();
  const supplierHook = useSupplier();
  const productHook = useProduct();
  
  const [loading, setLoading] = useState(false);
  // Supplier is picked via a server-backed search select (no 1000-row prefetch)
  const [selectedSupplier, setSelectedSupplier] = useState<{id: string; name: string; supplierCode: string} | null>(null);
  const [products, setProducts] = useState<Array<{id: string; name: string; productCode: string; unitPrice: number; costPrice?: number}>>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [quickProductEdit, setQuickProductEdit] = useState<QuickProduct | null>(null);
  const [currentItem, setCurrentItem] = useState<OrderItem>({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    taxPercent: 0,
  });

  const formik = useFormik({
    initialValues: {
      supplierId: initialSupplierId || '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: '',
      priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
      paymentTerms: '',
      shippingMethod: '',
      shippingAddress: '',
      shippingCost: 0,
      discountAmount: 0,
      taxAmount: 0,
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (items.length === 0) {
        toast.error('Please add at least one item');
        return;
      }

      setLoading(true);
      try {
        // Convert date-only values to full ISO datetimes and coerce numeric fields
        const orderData = {
          ...values,
          orderDate: values.orderDate ? new Date(values.orderDate + 'T00:00:00Z').toISOString() : values.orderDate,
          expectedDate: values.expectedDate ? new Date(values.expectedDate + 'T00:00:00Z').toISOString() : values.expectedDate,
          shippingCost: Number(values.shippingCost) || 0,
          discountAmount: Number(values.discountAmount) || 0,
          taxAmount: Number(values.taxAmount) || 0,
          items: items.map(item => ({
            productId: item.productId,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            discountPercent: Number(item.discountPercent) || 0,
            taxPercent: Number(item.taxPercent) || 0,
          })),
        };

       const result = await purchaseOrderHook.createPurchaseOrder(orderData);
       console.log('Create Purchase Order Result:', result);
       if (result?.success===true) {
        onSuccess();
        handleClose();}
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create purchase order';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
  });

  // Ensure supplier is pre-selected when modal opens or when initialSupplierId changes
  useEffect(() => {
    if (isOpen) {
      // set the supplierId in the form to the provided initial value (or empty string)
      formik.setFieldValue('supplierId', initialSupplierId || '');
      if (initialSupplierId) {
        // Resolve the supplier object so the search-select can display its name
        supplierHook.getSupplierById(initialSupplierId).then((res: any) => {
          const s = res?.data;
          if (s?.id) setSelectedSupplier({ id: s.id, name: s.name, supplierCode: s.supplierCode || '' });
        }).catch(() => {/* non-fatal — user can still search manually */});
      } else {
        setSelectedSupplier(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSupplierId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadProducts('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Server-backed supplier search — top 20 matches instead of a 1000-row prefetch
  const searchSuppliers = async (search: string) => {
    const response = await supplierHook.getAllSuppliers({
      search: search || undefined,
      limit: 20,
      status: 'ACTIVE',
    });
    return (response?.data && Array.isArray(response.data) ? response.data : []) as Array<{id: string; name: string; supplierCode: string}>;
  };

  // Server-backed product search — top 20 matches instead of a 1000-row prefetch
  const loadProducts = async (search: string) => {
    try {
      const response = await productHook.getAllProducts({
        search: search || undefined,
        limit: 20,
        isActive: true,
      } as any);
      if (response?.data && Array.isArray(response.data)) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to load products', error);
    }
  };

  // Debounced server search while the product dropdown is open.
  // Skipped when the box shows the picked product's label ("Name — CODE").
  const productSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isOpen || !showProductDropdown) return;
    if (productSearchDebounceRef.current) clearTimeout(productSearchDebounceRef.current);
    productSearchDebounceRef.current = setTimeout(() => {
      loadProducts(productSearch.trim());
    }, 300);
    return () => {
      if (productSearchDebounceRef.current) clearTimeout(productSearchDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSearch, showProductDropdown, isOpen]);

  const handleClose = () => {
    formik.resetForm();
    setItems([]);
    setProductSearch('');
    setSelectedSupplier(null);
    setShowProductDropdown(false);
    setCurrentItem({
      productId: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 0,
    });
    onClose();
  };

  const filteredProducts = products.filter(p => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q);
  });

  // Close product dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setCurrentItem({
        ...currentItem,
        productId,
        productName: product.name,
        unitPrice: Number(product.costPrice ?? product.unitPrice ?? 0),
      });
      setProductSearch(product.name + ' — ' + product.productCode);
      setShowProductDropdown(false);
    }
  };

  const handleProductChange = (productId: string) => {
    handleProductSelect(productId);
  };

  // Open the quick-create modal, pre-filling the name from the current search
  const openCreateProduct = () => {
    setQuickProductEdit(null);
    setShowQuickProduct(true);
    setShowProductDropdown(false);
  };

  // Open the quick-edit modal for the currently selected product
  const openEditProduct = () => {
    const product = products.find(p => p.id === currentItem.productId);
    if (!product) return;
    setQuickProductEdit({
      id: product.id,
      name: product.name,
      productCode: product.productCode,
      unitPrice: Number(product.unitPrice ?? 0),
      costPrice: product.costPrice != null ? Number(product.costPrice) : undefined,
    });
    setShowQuickProduct(true);
  };

  // Upsert the saved product into the local list and select it on the line
  const handleQuickProductSaved = (p: QuickProduct) => {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...p };
        return next;
      }
      return [p, ...prev];
    });
    setCurrentItem(ci => ({
      ...ci,
      productId: p.id,
      productName: p.name,
      unitPrice: Number(p.costPrice ?? p.unitPrice ?? 0),
    }));
    setProductSearch(`${p.name} — ${p.productCode}`);
    setShowProductDropdown(false);
  };

  const handleAddItem = () => {
    if (!currentItem.productId) {
      toast.error('Please select a product');
      return;
    }
    if (currentItem.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (currentItem.unitPrice < 0) {
      toast.error('Unit price cannot be negative');
      return;
    }

    const existingIndex = items.findIndex(item => item.productId === currentItem.productId);
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingIndex] = currentItem;
      setItems(updatedItems);
    } else {
      setItems([...items, currentItem]);
    }

    setCurrentItem({
      productId: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 0,
    });
    setProductSearch('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateItemTotal = (item: OrderItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = (subtotal * item.discountPercent) / 100;
    const afterDiscount = subtotal - discount;
    const tax = (afterDiscount * item.taxPercent) / 100;
    return afterDiscount + tax;
  };

  const calculateOrderTotal = () => {
    const itemsTotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const shipping = formik.values.shippingCost || 0;
    const discount = formik.values.discountAmount || 0;
    const tax = formik.values.taxAmount || 0;
    return itemsTotal + shipping - discount + tax;
  };

  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Create Purchase Order</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={formik.handleSubmit} className="p-6 space-y-6">
          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <AsyncSearchSelect<{id: string; name: string; supplierCode: string}>
                name="supplierId"
                value={selectedSupplier}
                onSelect={(s) => {
                  setSelectedSupplier(s);
                  formik.setFieldValue('supplierId', s?.id ?? '');
                }}
                onBlur={() => formik.setFieldTouched('supplierId', true)}
                fetcher={searchSuppliers}
                getOptionLabel={(s) => s.name}
                getOptionSublabel={(s) => s.supplierCode}
                getOptionKey={(s) => s.id}
                placeholder="Search supplier by name or code..."
              />
              {formik.touched.supplierId && formik.errors.supplierId && (
                <p className="text-red-500 text-sm mt-1">{formik.errors.supplierId}</p>
              )}
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="orderDate"
                value={formik.values.orderDate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
              />
              {formik.touched.orderDate && formik.errors.orderDate && (
                <p className="text-red-500 text-sm mt-1">{formik.errors.orderDate}</p>
              )}
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
              <input
                type="date"
                name="expectedDate"
                value={formik.values.expectedDate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                name="priority"
                value={formik.values.priority}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <input
                type="text"
                name="paymentTerms"
                value={formik.values.paymentTerms}
                onChange={formik.handleChange}
                placeholder="e.g., Net 30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Method</label>
              <input
                type="text"
                name="shippingMethod"
                value={formik.values.shippingMethod}
                onChange={formik.handleChange}
                placeholder="e.g., Standard Delivery"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
              <textarea
                name="shippingAddress"
                value={formik.values.shippingAddress}
                onChange={formik.handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Add Items */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2" ref={productSearchRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                          if (!e.target.value) {
                            setCurrentItem({ ...currentItem, productId: '', productName: undefined, unitPrice: 0 });
                          }
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        placeholder="Search by name or product code..."
                        className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 text-sm"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    {showProductDropdown && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">No matching products</div>
                        ) : (
                          filteredProducts.map(product => (
                            <button
                              key={product.id}
                              type="button"
                              onMouseDown={() => handleProductSelect(product.id)}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 flex justify-between items-center ${
                                currentItem.productId === product.id ? 'bg-orange-100 font-medium' : ''
                              }`}
                            >
                              <span className="truncate">{product.name}</span>
                              <span className="ml-2 shrink-0 text-xs text-gray-400 font-mono">{product.productCode}</span>
                            </button>
                          ))
                        )}
                        {/* Create-new-product action — always available */}
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); openCreateProduct(); }}
                          className="sticky bottom-0 w-full border-t border-gray-100 bg-white px-4 py-2.5 text-left text-sm font-medium text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                        >
                          <PackagePlus className="w-4 h-4" />
                          {productSearch.trim() ? `Create new product “${productSearch.trim()}”` : 'Create new product'}
                        </button>
                      </div>
                    )}
                  </div>
                  {currentItem.productId && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-green-600">
                      <span>Selected: {currentItem.productName}</span>
                      <button
                        type="button"
                        onClick={openEditProduct}
                        className="inline-flex items-center gap-1 text-gray-500 hover:text-orange-600"
                        title="Edit this product"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                {!hideFinancials && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentItem.unitPrice}
                    onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                )}

                {!hideFinancials && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={currentItem.discountPercent}
                    onChange={(e) => setCurrentItem({ ...currentItem, discountPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                )}

                {!hideFinancials && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={currentItem.taxPercent}
                    onChange={(e) => setCurrentItem({ ...currentItem, taxPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="mt-3 inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      {!hideFinancials && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>}
                      {!hideFinancials && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount %</th>}
                      {!hideFinancials && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax %</th>}
                      {!hideFinancials && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>}
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm">{product?.name || item.productName}</td>
                          <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                          {!hideFinancials && <td className="px-4 py-3 text-sm text-right">Rs. {item.unitPrice}</td>}
                          {!hideFinancials && <td className="px-4 py-3 text-sm text-right">{item.discountPercent}%</td>}
                          {!hideFinancials && <td className="px-4 py-3 text-sm text-right">{item.taxPercent}%</td>}
                          {!hideFinancials && (
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            Rs. {calculateItemTotal(item).toFixed(2)}
                          </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost</label>
                <input
                  type="number"
                  name="shippingCost"
                  min="0"
                  step="0.01"
                  value={formik.values.shippingCost}
                  onChange={formik.handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Discount</label>
                <input
                  type="number"
                  name="discountAmount"
                  min="0"
                  step="0.01"
                  value={formik.values.discountAmount}
                  onChange={formik.handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Tax</label>
                <input
                  type="number"
                  name="taxAmount"
                  min="0"
                  step="0.01"
                  value={formik.values.taxAmount}
                  onChange={formik.handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              {!hideFinancials && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-lg font-semibold">
                  Total Amount: <span className="text-orange-600">Rs. {calculateOrderTotal().toFixed(2)}</span>
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formik.values.notes}
              onChange={formik.handleChange}
              rows={3}
              placeholder="Additional notes or instructions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>

      <QuickProductModal
        isOpen={showQuickProduct}
        onClose={() => setShowQuickProduct(false)}
        onSaved={handleQuickProductSaved}
        product={quickProductEdit}
        initialName={quickProductEdit ? undefined : productSearch.trim()}
      />
    </div>
  );
}
