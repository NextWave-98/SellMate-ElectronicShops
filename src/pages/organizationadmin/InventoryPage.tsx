/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useRef } from 'react';
import InventoryStatsCards from '../../components/superadmin/inventory/InventoryStatsCards';
import InventoryTable from '../../components/superadmin/inventory/InventoryTable';
import StockAdjustmentModal from '../../components/superadmin/inventory/StockAdjustmentModal';
import StockTransferModal from '../../components/superadmin/inventory/StockTransferModal';
import InventoryFormModal from '../../components/superadmin/inventory/InventoryFormModal';
import StockMovementsModal from '../../components/superadmin/inventory/StockMovementsModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { RefreshCw, History, Download } from 'lucide-react';
import LocationSelector from '../../components/common/LocationSelector';
import SearchSelect from '../../components/common/SearchSelect';
import toast from 'react-hot-toast';
import DataRawModal from '../../components/common/DataRawModal';
import { useInventory } from '../../hooks/useInventory';
import { useLocation } from '../../hooks/useLocation';
import { useProductCategory } from '../../hooks/useProductCategory';
import { toCategoryOptions, type CategoryOption, normalizeLocationFilter } from '../../utils/productListFilters';
import ProductTransferModal from '../../components/superadmin/products/ProductTransferModal';
import EditStockModal from '../../components/superadmin/stock/EditStockModal';
import type { ProductItem } from '../../hooks/useProduct';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface InventoryItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    productCode: string;
    sku: string;
    name: string;
    brand?: string;
    model?: string;
    category?: {
      id: string;
      name: string;
      categoryCode: string;
    };
    unitPrice: number;
    costPrice?: number;
    primaryImage?: string;
    warrantyMonths?: number;
    isActive: boolean;
    minStockLevel?: number;
    tags?: string[];
    customAttributes?: Record<string, any>;
  };
  locationId: string;
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  warehouseLocation?: string;
  zone?: string;
  averageCost: number;
  totalValue: number;
  lastRestocked?: string;
  lastStockCheck?: string;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    inStockItems: 0,
    totalShops: 0,
    totalQuantity: 0,
    categoryBreakdown: [] as { category: string; count: number }[],
  });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; productCode: string; sku: string; category: { id: string; name: string; }; }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [rawData, setRawData] = useState<unknown | null>(null);
  
  // Modal states
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProductTransferModalOpen, setIsProductTransferModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<ProductItem | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' | ''>('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [warehouseOr, setWarehouseOr] = useState<boolean | null>(null);

  // Tracks whether the first inventory load has completed, so background reloads
  // (e.g. typing in search) don't toggle the full-page spinner and unmount the input.
  const hasLoadedRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hooks
  const inventoryHook = useInventory();
  const locationHook = useLocation();
  const categoryHook = useProductCategory();

  const loadCategories = useCallback(async () => {
    try {
      const response = await categoryHook.getAllCategories({
        page: 1,
        limit: 1000,
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      if (response) {
        setCategories(toCategoryOptions(response.data));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [categoryHook]);

  const resolveCategoryName = useCallback(
    (categoryId: string) => categories.find((c) => c.id === categoryId)?.name,
    [categories],
  );

  // Load branches for dropdowns
  const loadBranches = useCallback(async () => {
    try {
      const res = await locationHook.getAllLocations();
      const locData = (res?.data as any);
      const locs: Array<{ id: string; name: string; locationCode: string }> =
        Array.isArray(locData) ? locData
        : Array.isArray(locData?.locations) ? locData.locations
        : Array.isArray(locData?.data) ? locData.data
        : [];
      setBranches(locs.map((l) => ({ id: l.id, name: l.name, code: l.locationCode })));
    } catch (err) {
      console.error('Failed to load locations', err);
    }
  }, [locationHook]);

  // Load data
  const loadInventory = useCallback(async () => {
    try {
      // Only show the full-page spinner on the very first load. Subsequent reloads
      // (search, filters, pagination) keep the page — and the focused search input — mounted.
      if (!hasLoadedRef.current) setLoading(true);
      const filters: Record<string, unknown> = {
        page: currentPage,
        limit: itemsPerPage,
        exactLocation: true,
      };

      if (debouncedSearchQuery) filters.search = debouncedSearchQuery;
      const locationFilter = normalizeLocationFilter(selectedLocation);
      if (locationFilter) filters.locationId = locationFilter;
      const categoryName = resolveCategoryName(selectedCategory);
      if (categoryName) filters.category = categoryName;
      if (selectedStatus) filters.status = selectedStatus;

      const response = await inventoryHook.getAllInventory(filters);

      // Normalize various possible response shapes from the API.
      // The API may return either:
      // - an array directly in `response.data`
      // - a wrapper object where the array is at `response.data.data`
      // - other names like `items` etc. We try common variants.
      // Ensure we always set `inventory` and `filteredInventory` to an array.
      let items: InventoryItem[] = [];

      // response is the ApiResponse object returned by useFetch
      const apiData = response?.data as any;

      // Backend always returns { inventory: [...], pagination: {...} }
      if (apiData && Array.isArray(apiData.inventory)) {
        items = apiData.inventory as InventoryItem[];
      } else if (Array.isArray(apiData)) {
        items = apiData as InventoryItem[];
      } else if (apiData && Array.isArray((apiData as any).data)) {
        items = (apiData as any).data as InventoryItem[];
      } else if (apiData && typeof apiData === 'object') {
        const firstArray = Object.values(apiData).find(v => Array.isArray(v));
        if (Array.isArray(firstArray)) items = firstArray as InventoryItem[];
      }

      // Search / location / category / status are all applied server-side
      // (see inventory.service.getInventory). Re-filtering them on the client
      // would only operate on the current page and could drop rows the server
      // matched on fields the client doesn't check (e.g. barcode/description),
      // making the filters look broken. We just store the page here; the
      // client-only Transfer Type filter is applied reactively below.
      setInventory(items);

      // Extract pagination info from common locations
     
      // Backend returns { inventory: [...], pagination: {...} } under response.data
      const pagination = (response?.data as any)?.pagination || (response as any).pagination;
      if (pagination) {
        setTotalItems(pagination.total || 0);
        setTotalPages(pagination.totalPages || 0);
      } else {
        const dataLength = items.length;
        setTotalItems(dataLength);
        setTotalPages(Math.ceil(dataLength / itemsPerPage));
      }

    } catch (error) {
      toast.error('Failed to load inventory');
      console.error(error);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
      setIsInitialLoad(false);
    }
  }, [inventoryHook, currentPage, itemsPerPage, debouncedSearchQuery, selectedLocation, selectedCategory, selectedStatus, resolveCategoryName]);

  const loadDashboardStats = useCallback(async () => {
    try {
      const response = await inventoryHook.getDashboardStats(normalizeLocationFilter(selectedLocation));
      // API returns { stats: {...}, productsWithStock: [...] }
      const payload = (response?.data as any);
      const d = payload?.stats ?? payload;
      if (d) {
        setStats({
          totalItems: d.totalItems ?? 0,
          totalValue: d.totalValue ?? 0,
          lowStockItems: d.lowStockItems ?? 0,
          outOfStockItems: d.outOfStockItems ?? 0,
          inStockItems: d.inStockItems ?? 0,
          totalShops: d.totalLocations ?? d.totalShops ?? 0,
          totalQuantity: d.totalQuantity ?? 0,
          categoryBreakdown: d.categoryBreakdown ?? [],
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    }
  }, [inventoryHook, selectedLocation]);

  const loadProducts = useCallback(async () => {
    try {
      // Fetch products from API - using inventory data to extract unique products
      const productMap = new Map();
      
      inventory.forEach((inv) => {
        if (inv.product && !productMap.has(inv.productId)) {
          productMap.set(inv.productId, {
            id: inv.productId,
            name: inv.product.name,
            productCode: inv.product.productCode,
            sku: inv.product.sku || '',
            category: inv.product.category || { id: '', name: 'Uncategorized' }
          });
        }
      });
      
      setProducts(Array.from(productMap.values()));
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, [inventory]);

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Transfer Type is a client-side-only filter
  // recompute the visible rows from the loaded page whenever it or the data changes.
  useEffect(() => {
    if (warehouseOr === null) {
      setFilteredInventory(inventory);
      return;
    }
    setFilteredInventory(
      inventory.filter((it) => {
        const locType = it.location?.locationType || '';
        const isWarehouse = /warehouse/i.test(locType) || /whs/i.test(locType);
        return warehouseOr ? isWarehouse : !isWarehouse;
      })
    );
  }, [warehouseOr, inventory]);

  // Reload when pagination or filters change
  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchQuery, selectedStatus, selectedLocation, selectedCategory, resolveCategoryName]);

  // Load branches, categories, and initial stats once on mount
  useEffect(() => {
    loadBranches();
    loadCategories();
    loadDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load products when inventory changes
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  
  // Load stats separately so they reflect ALL inventory, not just current page
  useEffect(() => {
    loadDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);



  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadInventory(), loadDashboardStats()]);
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [loadInventory, loadDashboardStats]);

  // CSV export — fetches all inventory with current filters (no pagination)
  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const filters: Record<string, unknown> = { page: 1, limit: 10000, exactLocation: true };
      if (searchQuery) filters.search = searchQuery;
      const locationFilter = normalizeLocationFilter(selectedLocation);
      if (locationFilter) filters.locationId = locationFilter;
      const categoryName = resolveCategoryName(selectedCategory);
      if (categoryName) filters.category = categoryName;
      if (selectedStatus) filters.status = selectedStatus;

      const response = await inventoryHook.getAllInventory(filters);
      const apiData = response?.data as any;
      let items: InventoryItem[] = [];
      if (apiData && Array.isArray(apiData.inventory)) items = apiData.inventory;
      else if (Array.isArray(apiData)) items = apiData;

      const headers = ['Product Code', 'SKU', 'Name', 'Category', 'Location', 'Location Code', 'Quantity', 'Available Qty', 'Reserved Qty', 'Unit Price', 'Total Value', 'Min Stock', 'Max Stock', 'Last Restocked', 'Status'];
      const rows = items.map(item => {
        const qty = item.quantity ?? 0;
        const minStock = item.minStockLevel ?? item.product?.minStockLevel ?? 0;
        const maxStock = item.maxStockLevel ?? 0;
        const status = qty === 0 ? 'Out of Stock' : qty <= minStock ? 'Low Stock' : maxStock && qty >= maxStock ? 'Overstocked' : 'In Stock';
        return [
          item.product?.productCode ?? '',
          item.product?.sku ?? '',
          item.product?.name ?? '',
          item.product?.category?.name ?? '',
          item.location?.name ?? '',
          item.location?.locationCode ?? '',
          qty,
          item.availableQuantity ?? '',
          item.reservedQuantity ?? '',
          item.product?.unitPrice ?? '',
          item.totalValue ?? '',
          minStock,
          maxStock,
          item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : '',
          status,
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${items.length} inventory items`);
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }, [inventoryHook, searchQuery, selectedLocation, selectedCategory, selectedStatus, resolveCategoryName]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedLocation('');
    setSelectedCategory('');
    setWarehouseOr(null);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // useEffect watching currentPage will trigger loadInventory
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    // useEffect watching itemsPerPage/currentPage will trigger loadInventory
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormMode('edit');
    setIsFormModalOpen(true);
  };

  const handleDelete = async (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete inventory for ${item.product?.name}?`)) {
      try {
        await inventoryHook.deleteInventory(item.id);
        toast.success('Inventory deleted successfully');
        loadInventory();
      } catch {
        toast.error('Failed to delete inventory');
      }
    }
  };

  const handleView = (item: InventoryItem) => {
    setRawData(item);
    setIsRawModalOpen(true);
  };

  const handleAdjustStock = async (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAdjustModalOpen(true);
  };

  const handleTransferStock = async (item: InventoryItem) => {
    setSelectedItem(item);
    setIsTransferModalOpen(true);
  };

  // const handleAddInventory = () => {
  //   setSelectedItem(null);
  //   setFormMode('create');
  //   setIsFormModalOpen(true);
  // };

  const handleViewMovements = () => {
    setIsMovementsModalOpen(true);
  };

  const handleEditProduct = (item: InventoryItem) => {
    if (!item.product) return;
    // Map inventory product to ProductItem shape expected by EditStockModal
    const productItem: ProductItem = {
      id: item.productId,
      productCode: item.product.productCode,
      sku: item.product.sku,
      name: item.product.name,
      brand: item.product.brand,
      model: item.product.model,
      category: item.product.category,
      categoryId: item.product.category?.id,
      unitPrice: item.product.unitPrice,
      costPrice: item.product.costPrice,
      primaryImage: item.product.primaryImage,
      warrantyMonths: item.product.warrantyMonths,
      isActive: item.product.isActive,
      isDiscontinued: false,
      minStockLevel: item.product.minStockLevel,
      tags: item.product.tags,
      customAttributes: item.product.customAttributes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
    setSelectedProductForEdit(productItem);
    setIsEditProductModalOpen(true);
  };

  // Modal handlers
  const handleAdjustSubmit = async (id: string, adjustData: {
    quantity: number;
    movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED';
    notes?: string;
  }) => {
    await inventoryHook.adjustStock(id, adjustData);
    await loadInventory();
  };

  const handleTransferSubmit = async (transferData: {
    fromBranchId: string;
    toBranchId: string;
    productId: string;
    quantity: number;
    notes?: string;
  }) => {
    const { fromBranchId, toBranchId, ...rest } = transferData;
    await inventoryHook.transferStock({
      fromLocationId: fromBranchId,
      toLocationId: toBranchId,
      ...rest
    });
    await loadInventory();
  };

  const handleFormSubmit = async (formData: {
    id?: string;
    productId: string;
    branchId: string;
    quantity: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    location?: string;
    zone?: string;
  }) => {
    if (formMode === 'create') {
      const { branchId, ...rest } = formData;
      await inventoryHook.createInventory({
        locationId: branchId,
        ...rest
      });
    } else if (formData.id) {
      await inventoryHook.updateInventory({ ...formData, id: formData.id });
    }
    await loadInventory();
  };

  if (loading && isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Inventory Monitor</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Monitor and manage inventory across branches, warehouses, and all locations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setIsProductTransferModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Transfer Products
          </Button>
          <Button
            onClick={handleViewMovements}
            variant="outline"
          >
            <History className="w-4 h-4 mr-2" />
            View Movements
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={exporting}
            variant="outline"
          >
            <Download className={`w-4 h-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <InventoryStatsCards stats={stats} />

      {/* Filters */}
      <Card>
        <CardContent className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, SKU, barcode, brand, category, tags..."
              className="form-control w-full"
            />
          </div>
          
          {/* Location Filter */}
          <div>
            <LocationSelector
              value={selectedLocation}
              onChange={(loc) => {
                setSelectedLocation(loc === 'all' ? '' : loc);
                setCurrentPage(1);
              }}
              label="Filter by Location"
              showAll={true}
              placeholder="All Locations"
            />
          </div>
          
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <SearchSelect
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value);
                setCurrentPage(1);
              }}
              placeholder="All Categories"
            />
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as typeof selectedStatus);
                setCurrentPage(1);
              }}
              className="form-control w-full"
            >
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="overstocked">Overstocked</option>
            </select>
          </div>

          {/* Transfer Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
            <select
              value={warehouseOr === null ? '' : warehouseOr.toString()}
              onChange={(e) => setWarehouseOr(e.target.value === '' ? null : e.target.value === 'true')}
              className="form-control w-full"
            >
              <option value="">All Types</option>
              <option value="true">Warehouse Transfer</option>
              <option value="false">Branch Transfer</option>
            </select>
          </div>
        </div>
        
        {/* Reset Button */}
        {(searchQuery || selectedLocation || selectedCategory || selectedStatus || warehouseOr !== null) && (
          <div className="mt-4 flex justify-end">
            <button onClick={handleResetFilters} className="btn-secondary">
              Reset Filters
            </button>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <InventoryTable
        inventory={filteredInventory}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onAdjustStock={handleAdjustStock}
        onTransferStock={handleTransferStock}
        onEditProduct={handleEditProduct}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

     

      {/* Results count */}
      {filteredInventory.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredInventory.length} of {totalItems} inventory items
        </div>
      )}

      {/* Raw Data Modal */}
      <DataRawModal
        isOpen={isRawModalOpen}
        onClose={() => {
          setIsRawModalOpen(false);
          setRawData(null);
        }}
        data={rawData}
        title="Inventory Item Raw Data"
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onAdjust={handleAdjustSubmit}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        branches={branches}
        onTransfer={handleTransferSubmit}
      />

      {/* Product Transfer Modal */}
      <ProductTransferModal
        isOpen={isProductTransferModalOpen}
        onClose={() => setIsProductTransferModalOpen(false)}
        onSuccess={() => {
          setIsProductTransferModalOpen(false);
          loadInventory();
        }}
        warehouseOr={warehouseOr}
      />

      {/* Inventory Form Modal */}
      <InventoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem as any}
        branches={branches}
        products={products}
        onSubmit={handleFormSubmit}
        mode={formMode}
      />

      {/* Edit Product Modal */}
      <EditStockModal
        isOpen={isEditProductModalOpen}
        onClose={() => {
          setIsEditProductModalOpen(false);
          setSelectedProductForEdit(null);
        }}
        stockItem={selectedProductForEdit}
        onSuccess={() => {
          setIsEditProductModalOpen(false);
          setSelectedProductForEdit(null);
          loadInventory();
        }}
      />

      {/* Stock Movements Modal */}
      <StockMovementsModal
        isOpen={isMovementsModalOpen}
        onClose={() => setIsMovementsModalOpen(false)}
        onLoadMovements={async (productId, branchId) => {
          const result = await inventoryHook.getStockMovements(productId, branchId);
          return { data: (result?.data || []) as Array<{
            id: string;
            productId: string;
            movementType: string;
            quantity: number;
            quantityBefore: number;
            quantityAfter: number;
            referenceId?: string | null;
            referenceType?: string | null;
            referenceNumber?: string | null;
            notes?: string;
            createdAt?: string | null;
            product?: { 
              id: string;
              productCode: string;
              sku: string;
              name: string;
              category: { name: string; };
            };
          }> };
        }}
      />
    </div>
  );
}
