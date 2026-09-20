/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import useProduct from '../../../hooks/useProduct';
import { useProductCategory } from '../../../hooks/useProductCategory';
import { useLocation } from '../../../hooks/useLocation';

interface StockLocation {
  id: string;
  name: string;
  locationCode?: string;
  locationType?: string;
}

export interface QuickProduct {
  id: string;
  name: string;
  productCode: string;
  unitPrice: number;
  costPrice?: number;
}

interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the created/updated product so the caller can select it. */
  onSaved: (product: QuickProduct) => void;
  /** When provided, the modal edits this product instead of creating a new one. */
  product?: QuickProduct | null;
  /** Pre-fill the name field when creating (e.g. from the search term). */
  initialName?: string;
}

export default function QuickProductModal({
  isOpen,
  onClose,
  onSaved,
  product,
  initialName,
}: QuickProductModalProps) {
  const productHook = useProduct();
  const { getAllCategories, categories } = useProductCategory();
  const { getAllLocations } = useLocation();

  const isEdit = !!product?.id;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [description, setDescription] = useState('');
  // Initial stock (create mode only)
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [initialStockQty, setInitialStockQty] = useState('');
  const [stockLocationId, setStockLocationId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    getAllCategories({ limit: 1000 });

    // Load warehouses + branches for the initial-stock location picker (create mode)
    setInitialStockQty('');
    if (!isEdit) {
      getAllLocations({ limit: 1000 }).then((res: any) => {
        const list: StockLocation[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.locations)
            ? res.data.locations
            : [];
        const active = list.filter((l: any) => l.isActive !== false);
        setLocations(active);
        // Default to a warehouse if available, otherwise the first location
        const defaultWarehouse = active.find((l) => (l.locationType || '').toUpperCase() === 'WAREHOUSE');
        setStockLocationId(defaultWarehouse?.id || active[0]?.id || '');
      });
    }

    if (isEdit && product) {
      setName(product.name || '');
      setSku(product.productCode || '');
      setUnitPrice(product.unitPrice != null ? String(product.unitPrice) : '');
      setCostPrice(product.costPrice != null ? String(product.costPrice) : '');
      setCategoryId('');
      setDescription('');
    } else {
      setName(initialName || '');
      setSku('');
      setUnitPrice('');
      setCostPrice('');
      setCategoryId('');
      setDescription('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id]);

  const extractProduct = (res: any): QuickProduct | null => {
    const p = res?.data?.data ?? res?.data?.product ?? res?.data ?? null;
    if (!p || !p.id) return null;
    return {
      id: p.id,
      name: p.name,
      productCode: p.productCode || p.sku || '',
      unitPrice: Number(p.unitPrice ?? 0),
      costPrice: p.costPrice != null ? Number(p.costPrice) : undefined,
    };
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (unitPrice === '' || Number(unitPrice) < 0) {
      toast.error('Enter a valid selling price');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        unitPrice: Number(unitPrice),
        ...(costPrice !== '' && { costPrice: Number(costPrice) }),
        ...(sku.trim() && { sku: sku.trim() }),
        ...(categoryId && { categoryId }),
        ...(description.trim() && { description: description.trim() }),
        isActive: true,
      };

      const res = isEdit
        ? await productHook.updateProduct({ id: product!.id, ...payload })
        : await productHook.createProduct(payload);

      if (res?.success) {
        const saved = extractProduct(res) || {
          id: product?.id || '',
          name: name.trim(),
          productCode: sku.trim(),
          unitPrice: Number(unitPrice),
          costPrice: costPrice !== '' ? Number(costPrice) : undefined,
        };
        if (saved.id) {
          // Add initial stock for a brand-new (non-variant) product, if requested
          const qty = Number(initialStockQty);
          if (!isEdit && qty > 0 && stockLocationId) {
            try {
              await productHook.adjustProductStock({
                productId: saved.id,
                branchId: stockLocationId,
                quantity: qty,
                type: 'IN',
                reason: 'Initial stock',
              });
            } catch (stockErr) {
              console.error('Failed to add initial stock:', stockErr);
              toast.error('Product created, but adding initial stock failed');
            }
          }
          onSaved(saved);
          onClose();
        } else {
          toast.error('Saved, but could not read product back');
        }
      }
    } catch (err) {
      console.error('Quick product save failed:', err);
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Package className="h-5 w-5 text-orange-600" />
            {isEdit ? 'Edit Product' : 'New Product'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
              placeholder="e.g. iPhone 15 screen"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">SKU / Code</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                placeholder="Auto if empty"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
              >
                <option value="">None</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cost Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Selling Price *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Initial stock   only when creating a new (non-variant) product */}
          {!isEdit && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-3">
              <p className="text-sm font-semibold text-gray-800">Initial Stock (Optional)</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={initialStockQty}
                    onChange={(e) => setInitialStockQty(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Store at</label>
                  <select
                    value={stockLocationId}
                    onChange={(e) => setStockLocationId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                  >
                    {locations.length === 0 && <option value="">No locations</option>}
                    {locations.map((l) => {
                      const type = (l.locationType || '').toUpperCase();
                      const label = type === 'WAREHOUSE' ? 'Warehouse' : type === 'BRANCH' ? 'Branch' : (l.locationType || 'Location');
                      return (
                        <option key={l.id} value={l.id}>
                          {l.name}{l.locationCode ? ` (${l.locationCode})` : ''}   {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">Stock defaults to your warehouse. Leave quantity 0 to skip.</p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
