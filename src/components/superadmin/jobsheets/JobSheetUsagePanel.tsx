import { useCallback, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Package, Plus, ScanLine, Search, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import useJobSheet from '../../../hooks/useJobSheet';
import useInventory from '../../../hooks/useInventory';
import useBarcode from '../../../hooks/useBarcode';
import BarcodeScannerModal from '../../common/BarcodeScannerModal';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../store/types';

interface JobSheetPartRow {
  id: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  part?: {
    id: string;
    name: string;
    partNumber?: string;
  };
}

interface JobSheetProductRow {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: {
    id: string;
    name: string;
    productCode?: string;
  };
}

interface ProductInventoryOption {
  productId: string;
  name: string;
  sku?: string;
  productCode?: string;
  barcode?: string;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
}

interface PartInventoryOption {
  partId: string;
  name: string;
  partNumber?: string;
  category?: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
}

interface JobSheetUsagePanelProps {
  jobSheetId: string;
  locationId: string;
  parts: JobSheetPartRow[];
  products: JobSheetProductRow[];
  onUpdated: () => void;
  inventoryLoaderRef?: MutableRefObject<((force?: boolean) => Promise<void>) | null>;
  activeSection?: 'parts' | 'products';
  onSectionChange?: (section: 'parts' | 'products') => void;
}

function parseProductInventoryResponse(response: unknown): ProductInventoryOption[] {
  const payload = (response as { data?: unknown })?.data ?? response;
  const record = payload as { products?: unknown[]; inventory?: unknown[] };
  const list = record?.products ?? record?.inventory ?? (Array.isArray(payload) ? payload : []);

  return (list as Record<string, unknown>[])
    .map((item) => {
      const product = (item.product ?? item) as Record<string, unknown>;
      const category = product.category as { id?: string; name?: string } | undefined;
      const productId = (item.productId || product?.id) as string | undefined;
      if (!productId) return null;
      const qty = Number(item.quantity ?? item.availableQuantity ?? 0);
      if (qty <= 0) return null;
      return {
        productId,
        name: (product?.name as string) || 'Unknown product',
        sku: (product?.sku as string) || (product?.productCode as string),
        productCode: (item.productCode as string) || (product?.productCode as string),
        barcode: (item.barcode as string) || (product?.barcode as string) || undefined,
        categoryId: category?.id,
        categoryName: category?.name,
        quantity: qty,
        unitPrice: Number(item.unitPrice ?? product?.unitPrice ?? 0),
        costPrice: Number(item.costPrice ?? product?.costPrice ?? 0),
      };
    })
    .filter(Boolean) as ProductInventoryOption[];
}

function parsePartInventoryResponse(response: unknown): PartInventoryOption[] {
  const payload = (response as { data?: unknown })?.data ?? response;
  const record = payload as { parts?: unknown[] };
  const list = record?.parts ?? (Array.isArray(payload) ? payload : []);

  return (list as Record<string, unknown>[])
    .map((item) => {
      const partId = (item.partId || (item.part as { id?: string })?.id) as string | undefined;
      if (!partId) return null;
      const qty = Number(item.quantity ?? 0);
      if (qty <= 0) return null;
      return {
        partId,
        name: (item.name as string) || ((item.part as { name?: string })?.name) || 'Unknown part',
        partNumber: (item.partNumber as string) || ((item.part as { partNumber?: string })?.partNumber),
        category: (item.category as string) || ((item.part as { category?: string })?.category),
        brand: (item.brand as string) || ((item.part as { brand?: string })?.brand),
        quantity: qty,
        unitPrice: Number(item.unitPrice ?? (item.part as { unitPrice?: number })?.unitPrice ?? 0),
        costPrice: Number(item.costPrice ?? (item.part as { costPrice?: number })?.costPrice ?? 0),
      };
    })
    .filter(Boolean) as PartInventoryOption[];
}

function matchesSearch(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export default function JobSheetUsagePanel({
  jobSheetId,
  locationId,
  parts,
  products,
  onUpdated,
  inventoryLoaderRef,
  activeSection = 'parts',
  onSectionChange,
}: JobSheetUsagePanelProps) {
  const { addPartToJob, removePartFromJob, addProductToJob, removeProductFromJob } = useJobSheet();
  const { getLocationInventory, getLocationPartInventory } = useInventory();
  const { scanProduct, scanning } = useBarcode();
  const { hasPermission } = usePermissions();
  const canManage =
    hasPermission(PERMISSIONS.JOBSHEETS_UPDATE) ||
    hasPermission(PERMISSIONS.JOBSHEETS_MANAGE);

  const [productOptions, setProductOptions] = useState<ProductInventoryOption[]>([]);
  const [partOptions, setPartOptions] = useState<PartInventoryOption[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [partQuantity, setPartQuantity] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [partCategory, setPartCategory] = useState('');
  const [showProductScanner, setShowProductScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadingRef = useRef(false);
  const loadedLocationRef = useRef<string | null>(null);

  const loadInventories = useCallback(
    async (force = false) => {
      if (!locationId || loadingRef.current) return;
      if (!force && loadedLocationRef.current === locationId) return;

      loadingRef.current = true;
      setLoadingInventory(true);
      try {
        const [productRes, partRes] = await Promise.all([
          getLocationInventory(locationId),
          getLocationPartInventory(locationId),
        ]);
        setProductOptions(parseProductInventoryResponse(productRes));
        setPartOptions(parsePartInventoryResponse(partRes));
        loadedLocationRef.current = locationId;
        setInventoryLoaded(true);
      } catch (error) {
        console.error('Failed to load branch inventory:', error);
        toast.error('Failed to load branch inventory');
      } finally {
        loadingRef.current = false;
        setLoadingInventory(false);
      }
    },
    [getLocationInventory, getLocationPartInventory, locationId]
  );

  const reloadInventories = useCallback(async () => {
    loadedLocationRef.current = null;
    setInventoryLoaded(false);
    await loadInventories(true);
  }, [loadInventories]);

  if (inventoryLoaderRef) {
    inventoryLoaderRef.current = loadInventories;
  }

  const productCategories = useMemo(() => {
    const map = new Map<string, string>();
    productOptions.forEach((item) => {
      if (item.categoryId && item.categoryName) {
        map.set(item.categoryId, item.categoryName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [productOptions]);

  const partCategories = useMemo(() => {
    const set = new Set<string>();
    partOptions.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [partOptions]);

  const filteredProducts = useMemo(() => {
    const assignedIds = new Set(products.map((p) => p.productId));
    return productOptions
      .filter((item) => !assignedIds.has(item.productId))
      .filter((item) => {
        if (productCategory && item.categoryId !== productCategory) return false;
        if (!productSearch.trim()) return true;
        const q = productSearch.trim();
        return (
          matchesSearch(item.name, q) ||
          matchesSearch(item.productCode || '', q) ||
          matchesSearch(item.sku || '', q) ||
          matchesSearch(item.barcode || '', q)
        );
      });
  }, [productOptions, productSearch, productCategory, products]);

  const filteredParts = useMemo(() => {
    const assignedIds = new Set(parts.map((p) => p.partId));
    return partOptions
      .filter((item) => !assignedIds.has(item.partId))
      .filter((item) => {
        if (partCategory && item.category !== partCategory) return false;
        if (!partSearch.trim()) return true;
        const q = partSearch.trim();
        return (
          matchesSearch(item.name, q) ||
          matchesSearch(item.partNumber || '', q) ||
          matchesSearch(item.brand || '', q)
        );
      });
  }, [partOptions, partSearch, partCategory, parts]);

  const selectedProduct = productOptions.find((item) => item.productId === selectedProductId);
  const selectedPart = partOptions.find((item) => item.partId === selectedPartId);

  const handleAddProduct = async () => {
    if (!selectedProduct) {
      toast.error('Select a product');
      return;
    }

    if (productQuantity > selectedProduct.quantity) {
      toast.error(`Only ${selectedProduct.quantity} available in stock`);
      return;
    }

    setSubmitting(true);
    try {
      await addProductToJob(jobSheetId, {
        productId: selectedProduct.productId,
        quantity: productQuantity,
        unitPrice: selectedProduct.unitPrice,
        costPrice: selectedProduct.costPrice,
      });
      setSelectedProductId('');
      setProductQuantity(1);
      setProductSearch('');
      await reloadInventories();
      onUpdated();
    } catch (error) {
      console.error('Failed to add product to job:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    setSubmitting(true);
    try {
      await removeProductFromJob(jobSheetId, productId);
      await reloadInventories();
      onUpdated();
    } catch (error) {
      console.error('Failed to remove product from job:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPart = async () => {
    if (!selectedPart) {
      toast.error('Select a part');
      return;
    }

    if (partQuantity > selectedPart.quantity) {
      toast.error(`Only ${selectedPart.quantity} available in stock`);
      return;
    }

    setSubmitting(true);
    try {
      await addPartToJob(jobSheetId, {
        partId: selectedPart.partId,
        quantity: partQuantity,
        unitPrice: Number(selectedPart.unitPrice),
      });
      setSelectedPartId('');
      setPartQuantity(1);
      setPartSearch('');
      await reloadInventories();
      onUpdated();
    } catch (error) {
      console.error('Failed to add part to job:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePart = async (partId: string) => {
    setSubmitting(true);
    try {
      await removePartFromJob(jobSheetId, partId);
      await reloadInventories();
      onUpdated();
    } catch (error) {
      console.error('Failed to remove part from job:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductBarcodeScan = async (value: string) => {
    setShowProductScanner(false);
    const trimmed = value.trim();
    if (!trimmed) return;

    if (!inventoryLoaded) {
      await loadInventories(false);
    }

    const localMatch = productOptions.find(
      (item) =>
        item.barcode === trimmed ||
        item.sku === trimmed ||
        item.productCode === trimmed
    );

    if (localMatch) {
      setSelectedProductId(localMatch.productId);
      setProductSearch(localMatch.name);
      onSectionChange?.('products');
      toast.success(`Selected: ${localMatch.name}`);
      return;
    }

    try {
      const scanned = await scanProduct(trimmed, true, locationId);
      const match = scanned?.[0];
      if (!match) {
        toast.error(`No product found for: ${trimmed}`);
        return;
      }

      const inventoryMatch = productOptions.find(
        (item) => item.productId === match.productId || item.productId === match.id
      );

      if (inventoryMatch) {
        setSelectedProductId(inventoryMatch.productId);
        setProductSearch(inventoryMatch.name);
        onSectionChange?.('products');
        toast.success(`Selected: ${inventoryMatch.name}`);
        return;
      }

      if ((match.stock ?? 0) <= 0) {
        toast.error(`${match.name} has no stock at this branch`);
        return;
      }

      setProductOptions((prev) => {
        if (prev.some((p) => p.productId === match.productId)) return prev;
        return [
          ...prev,
          {
            productId: match.productId || match.id,
            name: match.name,
            sku: match.sku || match.productCode,
            productCode: match.productCode,
            barcode: match.barcode || undefined,
            quantity: match.stock,
            unitPrice: match.unitPrice,
            costPrice: match.unitPrice,
          },
        ];
      });
      setSelectedProductId(match.productId || match.id);
      setProductSearch(match.name);
      onSectionChange?.('products');
      toast.success(`Selected: ${match.name}`);
    } catch (error) {
      console.error('Barcode scan failed:', error);
      toast.error('Barcode scan failed');
    }
  };

  const formatCurrency = (amount: number) =>
    `LKR ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const usageTotal =
    parts.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0) +
    products.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

  const setSection = (section: 'parts' | 'products') => {
    onSectionChange?.(section);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
        Sidebar → <strong>Job Sheets</strong> → open a job → <strong>Parts &amp; Products</strong> tab.
        Parts and products are not separate sidebar pages.
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Job usage summary</p>
          <p className="text-xs text-gray-600 mt-1">
            {parts.length} part(s), {products.length} product(s). Branch inventory updates automatically.
          </p>
        </div>
        <p className="text-sm font-semibold text-gray-900">Usage total: {formatCurrency(usageTotal)}</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setSection('parts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeSection === 'parts'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Wrench className="w-4 h-4 inline mr-1" />
          Parts ({parts.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('products')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeSection === 'products'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 inline mr-1" />
          Products ({products.length})
        </button>
      </div>

      {!inventoryLoaded && !loadingInventory && (
        <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
          <p className="text-sm text-gray-600 mb-3">Branch stock not loaded yet.</p>
          <Button type="button" onClick={() => loadInventories(false)} className="bg-orange-600 hover:bg-orange-700">
            Load branch parts &amp; products
          </Button>
        </div>
      )}

      {activeSection === 'parts' && (
        <>
          {canManage && inventoryLoaded && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Part to Job
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={partSearch}
                    onChange={(e) => setPartSearch(e.target.value)}
                    placeholder="Search part name, part number, or brand..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <select
                  value={partCategory}
                  onChange={(e) => setPartCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">All categories</option>
                  {partCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border border-orange-200 rounded-lg bg-white max-h-52 overflow-y-auto">
                {loadingInventory ? (
                  <p className="p-4 text-sm text-gray-500">Loading parts...</p>
                ) : filteredParts.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No matching parts in stock at this branch.</p>
                ) : (
                  filteredParts.map((item) => (
                    <button
                      key={item.partId}
                      type="button"
                      onClick={() => setSelectedPartId(item.partId)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-orange-50 ${
                        selectedPartId === item.partId ? 'bg-orange-100' : ''
                      }`}
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.partNumber}
                            {item.category ? ` · ${item.category}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-gray-900">Stock: {item.quantity}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="number"
                  min={1}
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Quantity"
                />
                <div className="md:col-span-2 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleAddPart}
                    disabled={submitting || !selectedPartId}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Add Part to Job
                  </Button>
                  {selectedPart && (
                    <span className="text-xs text-gray-600">
                      Selected: {selectedPart.name} (max {selectedPart.quantity})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <PartsUsedTable
            parts={parts}
            canManage={canManage}
            submitting={submitting}
            onRemove={handleRemovePart}
            formatCurrency={formatCurrency}
          />
        </>
      )}

      {activeSection === 'products' && (
        <>
          {canManage && inventoryLoaded && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Product to Job
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductScanner(true)}
                  disabled={scanning || submitting}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <ScanLine className="w-4 h-4 mr-1" />
                  Scan Barcode
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search name, product code, SKU, or barcode..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">All categories</option>
                  {productCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border border-orange-200 rounded-lg bg-white max-h-52 overflow-y-auto">
                {loadingInventory ? (
                  <p className="p-4 text-sm text-gray-500">Loading products...</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No matching products in stock at this branch.</p>
                ) : (
                  filteredProducts.map((item) => (
                    <button
                      key={item.productId}
                      type="button"
                      onClick={() => setSelectedProductId(item.productId)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-orange-50 ${
                        selectedProductId === item.productId ? 'bg-orange-100' : ''
                      }`}
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.productCode || item.sku}
                            {item.categoryName ? ` · ${item.categoryName}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-gray-900">Stock: {item.quantity}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="number"
                  min={1}
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Quantity"
                />
                <div className="md:col-span-2 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={submitting || !selectedProductId}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Add Product to Job
                  </Button>
                  {selectedProduct && (
                    <span className="text-xs text-gray-600">
                      Selected: {selectedProduct.name} (max {selectedProduct.quantity})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <ProductsUsedTable
            products={products}
            canManage={canManage}
            submitting={submitting}
            onRemove={handleRemoveProduct}
            formatCurrency={formatCurrency}
          />
        </>
      )}

      <BarcodeScannerModal
        open={showProductScanner}
        onClose={() => setShowProductScanner(false)}
        onScan={handleProductBarcodeScan}
        title="Scan Product Barcode"
      />
    </div>
  );
}

function PartsUsedTable({
  parts,
  canManage,
  submitting,
  onRemove,
  formatCurrency,
}: {
  parts: JobSheetPartRow[];
  canManage: boolean;
  submitting: boolean;
  onRemove: (partId: string) => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Wrench className="w-4 h-4" />
        Parts Used on This Job ({parts.length})
      </h3>
      {parts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          No parts assigned yet. Use the form above to add parts from branch stock.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Part</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                {canManage && <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {parts.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.part?.name || 'Part'}
                    {item.part?.partNumber && (
                      <div className="text-xs text-gray-500">{item.part.partNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemove(item.partId)}
                        disabled={submitting}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductsUsedTable({
  products,
  canManage,
  submitting,
  onRemove,
  formatCurrency,
}: {
  products: JobSheetProductRow[];
  canManage: boolean;
  submitting: boolean;
  onRemove: (productId: string) => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Package className="w-4 h-4" />
        Products Used on This Job ({products.length})
      </h3>
      {products.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          No products assigned yet. Switch to search or scan barcode above.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                {canManage && <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {products.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.product?.name || 'Product'}
                    {item.product?.productCode && (
                      <div className="text-xs text-gray-500">{item.product.productCode}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemove(item.productId)}
                        disabled={submitting}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
