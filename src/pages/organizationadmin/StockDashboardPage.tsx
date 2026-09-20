/* eslint-disable no-constant-binary-expression */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Package, RefreshCw, Plus, Tag, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import LocationSelector from '../../components/common/LocationSelector';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useProductCategory } from '../../hooks/useProductCategory';
import { toCategoryOptions, type CategoryOption, normalizeLocationFilter } from '../../utils/productListFilters';
import ProductTransferModal from '../../components/superadmin/products/ProductTransferModal';
import ManualStockEntryModal from '../../components/organizationadmin/products/ManualStockEntryModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currency';

interface DashboardStats {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  inStockItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  overstockedItems: number;
  totalShops: number;
  categoryBreakdown: Array<{ category: string; count: number }>;
}

interface ProductWithStock {
  id: string;
  productId: string;
  productCode: string;
  sku: string;
  name: string;
  brand?: string;
  model?: string;
  variantAttributes?: Record<string, any>;
  hasVariants?: boolean;
  category: {
    id: string;
    name: string;
    categoryCode: string;
  };
  quantity: number;
  availableQuantity: number;
  unitPrice: number;
  totalValue: number;
  locationId: string;
  location: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
}

export default function StockDashboardPage() {
  const { user } = useAuth();
  const { hasPermission, isAdmin, isSuperAdmin } = usePermissions();
  const branchLocationId = user?.locationId || user?.branchId || '';
  const isBranchScoped = !!branchLocationId && !isAdmin && !isSuperAdmin;
  const canAddStock = isAdmin || isSuperAdmin || hasPermission('inventory.adjust') || hasPermission('inventory.create');
  const canTransferStock = isAdmin || isSuperAdmin || hasPermission('inventory.transfer');

  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalQuantity: 0,
    totalValue: 0,
    inStockItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    overstockedItems: 0,
    totalShops: 0,
    categoryBreakdown: [],
  });
  const [productsWithStock, setProductsWithStock] = useState<ProductWithStock[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Only the first load shows the full-page spinner; later reloads keep the search input mounted.
  const hasLoadedRef = useRef(false);
  const filtersReadyRef = useRef(false);
  const [isProductTransferModalOpen, setIsProductTransferModalOpen] = useState(false);
  const [isManualStockEntryModalOpen, setIsManualStockEntryModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Debounce ref for search
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inventoryHook = useInventory();
  const categoryHook = useProductCategory();
  const effectiveLocationId = isBranchScoped
    ? branchLocationId
    : normalizeLocationFilter(selectedLocation);

  const loadCategories = useCallback(async () => {
    try {
      const response = await categoryHook.getAllCategories({
        page: 1,
        limit: 1000,
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      if (response?.data) {
        setCategories(toCategoryOptions(response.data));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [categoryHook]);

  const resolveCategoryFilter = useCallback(
    (categoryId: string) => categories.find((c) => c.id === categoryId)?.name,
    [categories],
  );

  // Load dashboard data   all active filters are read from state inside the callback
  const loadDashboardData = useCallback(async (
    opts: { locationId?: string; page?: number; limit?: number; search?: string; status?: string; category?: string } = {}
  ) => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      const response = await inventoryHook.getAllInventory({
        locationId: opts.locationId,
        page: opts.page,
        limit: opts.limit,
        search: opts.search || undefined,
        status: (opts.status as any) || undefined,
        category: opts.category || undefined,
      });

      if (response && response.data) {
        const respData = response.data as any;
        const inventoryList = Array.isArray(respData.inventory) ? respData.inventory : [];

        // Map backend inventory items to ProductWithStock shape used by the UI
        const mapped: ProductWithStock[] = inventoryList.map((item: any) => ({
          id: item.id,
          productId: item.productId || item.product_id || item.product?.id,
          productCode: item.product?.productCode || item.productCode || item.product?.sku || '',
          sku: item.product?.sku || '',
          name: item.product?.name || '',
          brand: item.product?.brand,
          model: item.product?.model,
          variantAttributes: item.product?.variantAttributes,
          hasVariants: item.product?.hasVariants,
          category: {
            id: item.product?.category?.id || item.product?.category_id || '',
            name: item.product?.category?.name || item.product?.category?.category || item.product?.category?.category_code || '',
            categoryCode: item.product?.category?.category_code || '',
          },
          quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 0,
          availableQuantity: typeof item.availableQuantity === 'number' ? item.availableQuantity : Number(item.availableQuantity) || 0,
          unitPrice: Number(item.product?.unitPrice ?? item.product?.costPrice ?? item.averageCost ?? 0),
          totalValue: Number(item.totalValue ?? Number((item.quantity) * (item.product?.costPrice ?? item.averageCost ?? 0)) ?? 0),
          locationId: item.locationId || item.location_id || '',
          location: {
            id: item.location?.id || item.location_id || '',
            name: item.location?.name || '',
            locationCode: item.location?.locationCode || item.locationCode || '',
            locationType: item.location?.locationType || '',
          },
        }));

        setProductsWithStock(mapped);

        // Compute simple stats from inventoryList
        const totalQuantity = inventoryList.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0);
        const totalValue = inventoryList.reduce((s: number, it: any) => s + (Number(it.totalValue) || 0), 0);
        const inStockItems = inventoryList.filter((it: any) => (Number(it.quantity) || 0) > 0).length;
        const outOfStockItems = inventoryList.filter((it: any) => (Number(it.quantity) || 0) === 0).length;
        const lowStockItems = inventoryList.filter((it: any) => {
          const min = Number(it.minStockLevel ?? it.product?.minStockLevel ?? 0);
          const qty = Number(it.quantity) || 0;
          return qty > 0 && qty <= min;
        }).length;
        const overstockedItems = inventoryList.filter((it: any) => {
          const max = Number(it.maxStockLevel ?? 0);
          const qty = Number(it.quantity) || 0;
          return max > 0 && qty > max;
        }).length;

        // Category breakdown
        const categoryMap: Record<string, number> = {};
        inventoryList.forEach((it: any) => {
          const cname = it.product?.category?.name || 'Uncategorized';
          categoryMap[cname] = (categoryMap[cname] || 0) + 1;
        });
        const categoryBreakdown = Object.keys(categoryMap).map((k) => ({ category: k, count: categoryMap[k] }));

        setStats((prev) => ({
          ...prev,
          totalItems: inventoryList.length,
          totalQuantity,
          totalValue,
          inStockItems,
          lowStockItems,
          outOfStockItems,
          overstockedItems,
          categoryBreakdown,
        }));

        // Pagination
        if (respData.pagination) {
          setTotalItems(respData.pagination.total || inventoryList.length);
          setTotalPages(respData.pagination.totalPages || Math.ceil((respData.pagination.total || inventoryList.length) / (respData.pagination.limit || itemsPerPage)));
        } else {
          setTotalItems(inventoryList.length);
          setTotalPages(Math.ceil(inventoryList.length / (opts.limit || itemsPerPage)));
        }
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
      setIsInitialLoad(false);
    }
  }, [inventoryHook, itemsPerPage]);

  // Central helper that reads current filter state and triggers a load
  const reload = useCallback((overrides: { page?: number; limit?: number } = {}) => {
    loadDashboardData({
      locationId: effectiveLocationId || undefined,
      search: searchQuery || undefined,
      status: selectedStatus || undefined,
      category: resolveCategoryFilter(selectedCategory) || undefined,
      page: overrides.page ?? currentPage,
      limit: overrides.limit ?? itemsPerPage,
    });
  }, [loadDashboardData, effectiveLocationId, searchQuery, selectedStatus, selectedCategory, currentPage, itemsPerPage, resolveCategoryFilter]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadDashboardData({
      locationId: effectiveLocationId || undefined,
      search: searchQuery || undefined,
      status: selectedStatus || undefined,
      category: resolveCategoryFilter(selectedCategory) || undefined,
      page,
      limit: itemsPerPage,
    });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    loadDashboardData({
      locationId: effectiveLocationId || undefined,
      search: searchQuery || undefined,
      status: selectedStatus || undefined,
      category: resolveCategoryFilter(selectedCategory) || undefined,
      page: 1,
      limit: value,
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedCategory('');
    setSelectedLocation(isBranchScoped ? branchLocationId : '');
    setCurrentPage(1);
  };

  const handleLocationChange = (loc: string) => {
    setSelectedLocation(loc === 'all' ? '' : loc);
    setCurrentPage(1);
    loadDashboardData({
      locationId: normalizeLocationFilter(loc === 'all' ? '' : loc),
      search: searchQuery || undefined,
      status: selectedStatus || undefined,
      category: resolveCategoryFilter(selectedCategory) || undefined,
      page: 1,
      limit: itemsPerPage,
    });
  };

  const handleStatusChange = (status: typeof selectedStatus) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    loadDashboardData({
      locationId: effectiveLocationId || undefined,
      search: searchQuery || undefined,
      status: status || undefined,
      category: resolveCategoryFilter(selectedCategory) || undefined,
      page: 1,
      limit: itemsPerPage,
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
    loadDashboardData({
      locationId: effectiveLocationId || undefined,
      search: searchQuery || undefined,
      status: selectedStatus || undefined,
      category: resolveCategoryFilter(categoryId) || undefined,
      page: 1,
      limit: itemsPerPage,
    });
  };

  // Use products directly from API (already paginated by backend)
  const paginatedProducts = productsWithStock;

  const hasActiveFilters = !!(searchQuery || selectedStatus || selectedCategory || (!isBranchScoped && selectedLocation));

  // Initial load
  useEffect(() => {
    loadCategories();
    loadDashboardData({ locationId: effectiveLocationId || undefined, page: 1, limit: itemsPerPage });
    filtersReadyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isBranchScoped) {
      setSelectedLocation(branchLocationId);
    }
  }, [branchLocationId, isBranchScoped]);

  // Debounced search   skip the first run (initial load already fetched data)
  useEffect(() => {
    if (!filtersReadyRef.current) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadDashboardData({
        locationId: effectiveLocationId || undefined,
        search: searchQuery || undefined,
        status: selectedStatus || undefined,
        category: resolveCategoryFilter(selectedCategory) || undefined,
        page: 1,
        limit: itemsPerPage,
      });
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  if (loading && isInitialLoad) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-5 mb-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Stock Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isBranchScoped ? 'View and restock products for this branch' : 'View products with available stock across branches'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAddStock && (
            <Button
              onClick={() => setIsManualStockEntryModalOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stock Manually
            </Button>
          )}

          {canTransferStock && (
            <Button
              onClick={() => setIsProductTransferModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Transfer Products
            </Button>
          )}

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, code, SKU, barcode, brand, category, tags…"
                  className="form-control w-full pl-9"
                />
              </div>
            </div>

            {!isBranchScoped && (
              <div>
                <LocationSelector
                  value={selectedLocation}
                  onChange={handleLocationChange}
                  label="Location"
                  showAll={true}
                  placeholder="All Locations"
                />
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value as typeof selectedStatus)}
                className="form-control w-full"
              >
                <option value="">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="overstocked">Overstocked</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="form-control w-full"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filter badges + reset */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Search: {searchQuery}
                  <button onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {!isBranchScoped && selectedLocation && (
                <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                  Location filtered
                  <button onClick={() => setSelectedLocation('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedStatus && (
                <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  {selectedStatus.replace('_', ' ')}
                  <button onClick={() => setSelectedStatus('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Category: {resolveCategoryFilter(selectedCategory) || selectedCategory}
                  <button onClick={() => setSelectedCategory('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button
                onClick={handleResetFilters}
                className="text-xs text-red-600 hover:text-red-800 underline ml-auto"
              >
                Clear all filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Items with Stock</p>
                <p className="text-2xl font-bold text-green-600">{stats.inStockItems}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Total Quantity: {stats.totalQuantity.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.totalValue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Current valuation</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
                <p className="text-xs text-gray-500 mt-1">Needs restocking</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <Package className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Branches</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalShops}</p>
                <p className="text-xs text-gray-500 mt-1">Across system</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {/* {stats.categoryBreakdown.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
            {stats.categoryBreakdown.map((item, index) => (
              <div key={index} className="bg-white/40 backdrop-blur-sm rounded-xl p-1 border border-white/20">
                <p className="text-[10px] font-medium text-gray-600">{item.category}</p>
                <p className="text-[10px] font-bold text-gray-900 mt-1">{item.count}</p>
              </div>
            ))}
          </div>
        </Card>
      )} */}

      {/* Products with Stock Table */}
      <Card>
        <div className="px-6 py-4 border-b border-white/20">
          <h2 className="text-lg font-semibold text-gray-900">
            Products with Stock ({totalItems})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/20">
            <thead className="bg-white/30 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th> */}

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No products with stock found
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-white/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.productCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap max-w-48 truncate">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {(product.brand || product.model) && (
                        <div className="text-xs text-gray-500">
                          {[product.brand, product.model].filter(Boolean).join(' - ')}
                        </div>
                      )}
                      {product.variantAttributes && Object.keys(product.variantAttributes).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(product.variantAttributes).map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full"
                            >
                              <Tag className="w-2.5 h-2.5 text-orange-400" />
                              <span className="capitalize text-orange-400">{k}:</span>
                              <span className="font-medium">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.category.name}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.branch.name}</div>
                      <div className="text-xs text-gray-500">{product.branch.code}</div>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {product.quantity}
                      </span>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.availableQuantity}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      LKR {product.unitPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      LKR {product.totalValue.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-white/20">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>

        {/* Results count */}
        {paginatedProducts.length > 0 && (
          <div className="px-6 pb-4 text-sm text-gray-600 text-center">
            Showing {paginatedProducts.length} of {totalItems} products
          </div>
        )}
      </Card>
      
      {/* Product Transfer Modal */}
      <ProductTransferModal
        isOpen={isProductTransferModalOpen}
        onClose={() => setIsProductTransferModalOpen(false)}
        onSuccess={() => {
          setIsProductTransferModalOpen(false);
          reload();
        }}
        warehouseOr={true}
      />

      {/* Manual Stock Entry Modal */}
      <ManualStockEntryModal
        isOpen={isManualStockEntryModalOpen}
        onClose={() => setIsManualStockEntryModalOpen(false)}
        onSuccess={() => {
          setIsManualStockEntryModalOpen(false);
          reload();
        }}
        lockedLocationId={isBranchScoped ? branchLocationId : undefined}
      />
    </div>
  );
}
