/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { Inventory } from '../../types/inventory.types';
import { InventoryStatus } from '../../types/inventory.types';
import { useAuth } from '../../context/AuthContext';
import { useInventory, type InventoryItem } from '../../hooks/useInventory';
import useProductCategory from '../../hooks/useProductCategory';
import { useAddonRequest, type CreateAddonRequestData } from '../../hooks/useAddonRequest';
import ProductFilters from '../../components/branch/products/ProductFilters';
import ProductsTable from '../../components/branch/products/ProductsTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { RefreshCw, Package2, AlertTriangle, ShoppingCart, Plus, Undo2, X, Loader2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import BarcodePrintModal, { type PrintProduct } from '../../components/common/BarcodePrintModal';

// Helper function to transform InventoryItem to Inventory type
const transformInventoryItem = (item: InventoryItem): Inventory => {
  // Determine status based on quantity and stock levels
  const determineStatus = (): InventoryStatus => {
    if (item.quantity === 0) return InventoryStatus.OUT_OF_STOCK;
    if (item.minStockLevel && item.quantity <= item.minStockLevel) return InventoryStatus.LOW_STOCK;
    if (item.maxStockLevel && item.quantity > item.maxStockLevel) return InventoryStatus.OVERSTOCKED;
    return InventoryStatus.IN_STOCK;
  };

  return {
    id: item.id,
    productId: item.productId,
    productName: item.product?.name || 'Unknown Product',
    productCode: item.product?.productCode || item.product?.sku || 'N/A',
    category: item.product?.category?.name || 'Uncategorized',
    locationId: item.locationId,
    shopName: item.location?.name || 'Unknown Branch',
    branchCode: item.location?.locationCode || 'N/A',
    quantity: item.quantity,
    minStockLevel: (item.product as any)?.minStockLevel || item.minStockLevel || 0,
    maxStockLevel: (item.product as any)?.maxStockLevel || item.maxStockLevel || 0,
    unitPrice: parseFloat(String(item.product?.unitPrice || 0)),
    totalValue: parseFloat(String(item.totalValue || 0)),
    status: determineStatus(),
    lastRestocked: item.lastRestocked || '',
    lastUpdated: item.updatedAt,
    supplier: '',
    location: item.location,
  };
};

export default function ProductsPage() {
  const { branchCode } = useParams();
  const { user } = useAuth();
  const { getAllInventory, getLowStockItems } = useInventory();
  const { getAllCategories } = useProductCategory();
  const { createAddonRequest, loading: addonLoading } = useAddonRequest();
  const [products, setProducts] = useState<Inventory[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Selection state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Modal state
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [addonRemark, setAddonRemark] = useState('');
  const [requestedQuantity, setRequestedQuantity] = useState<number>(0);

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });

  const loadProducts = useCallback(async (page = pagination.page, limit = pagination.limit, search = debouncedSearch) => {
    if (!user?.locationId) {
      toast.error('Branch information not found');
      setLoading(false);
      return;
    }

    try {
      const response = await getAllInventory({
        locationId: user.locationId,
        sortBy: 'name',
        sortOrder: 'asc',
        page,
        limit,
        search: search || undefined,
        category: selectedCategory || undefined,
      });

      if (response?.data && (response.data as any).inventory) {
        const inventoryItems = Array.isArray((response.data as any).inventory) ? (response.data as any).inventory : [];
        const transformedProducts = inventoryItems.map(transformInventoryItem);
        setProducts(transformedProducts);
        
        // Handle pagination if present
        if ((response.data as any).pagination) {
          const pagData = (response.data as any).pagination;
          setPagination({
            page: pagData.page || page,
            limit: pagData.limit || limit,
            total: pagData.total || transformedProducts.length,
            totalPages: pagData.totalPages || 1,
          });
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [getAllInventory, user?.locationId, pagination.page, pagination.limit, debouncedSearch, selectedCategory]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await getAllCategories();
      if (response?.data && Array.isArray(response.data)) {
        const categoryNames = response.data.map((cat) => cat.name).sort();
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to product categories if API fails
      const uniqueCategories = Array.from(new Set(products.map((item) => item.category))).sort();
      setCategories(uniqueCategories);
    }
  }, [getAllCategories, products]);

  // Search and category are filtered server-side so results cover the whole branch.
  const applyFilters = useCallback(() => {
    setFilteredProducts(products);
  }, [products]);

  const calculateStats = useCallback(() => {
    const totalProducts = filteredProducts.length;
    const inStock = filteredProducts.filter((p) => p.status === InventoryStatus.IN_STOCK).length;
    const lowStock = filteredProducts.filter((p) => p.status === InventoryStatus.LOW_STOCK).length;
    const outOfStock = filteredProducts.filter(
      (p) => p.status === InventoryStatus.OUT_OF_STOCK
    ).length;
    const totalValue = filteredProducts.reduce((sum, p) => sum + p.totalValue, 0);

    setStats({
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
      totalValue,
    });
  }, [filteredProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProducts();
      toast.success('Products refreshed successfully');
    } catch (error) {
      console.error('Error refreshing products:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = async (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    // loadProducts will be triggered by useEffect watching pagination.page
  };

  const handleLimitChange = async (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
    // loadProducts will be triggered by useEffect watching pagination.limit
  };

  // Debounce search query → triggers server-side reload
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset to page 1 when search or category changes
  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [debouncedSearch, selectedCategory]);

  // Load data on mount and whenever pagination or filters change
  useEffect(() => {
    if (user?.locationId) {
      loadProducts(pagination.page, pagination.limit, debouncedSearch);
    }
  }, [user?.locationId, pagination.page, pagination.limit, debouncedSearch, selectedCategory]);

  // Categories only need loading once the branch is known
  useEffect(() => {
    if (user?.locationId) {
      loadCategories();
    }
  }, [user?.locationId]);

  // Apply filters whenever products or filter states change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Calculate stats whenever filteredProducts change
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
  };

  
  // Get selected product details for modal
  const getSelectedProductDetails = () => {
    if (selectedProducts.length === 0) return null;
    return products.find((p) => p.id === selectedProducts[0]);
  };

  const handleAddonRequest = async () => {
    const selectedProduct = getSelectedProductDetails();
    if (!selectedProduct || !user?.id || !user?.locationId) {
      toast.error('Missing required information');
      return;
    }

    if (!requestedQuantity || requestedQuantity <= 0) {
      toast.error('Please enter a valid requested quantity');
      return;
    }

    const addonData: CreateAddonRequestData = {
      productId: String(selectedProduct.productId),
      locationId: user.locationId,
      requestedBy: user.id,
      currentQuantity: selectedProduct.quantity,
      requestedQuantity: requestedQuantity,
      remark: addonRemark,
    };

    try {
      const response = await createAddonRequest(addonData);
      
      if (response?.success) {
        toast.success('Addon request submitted successfully! Admin has been notified via SMS.');
        
        // Reset modal state
        setShowAddonModal(false);
        setAddonRemark('');
        setRequestedQuantity(0);
        setSelectedProducts([]);
      } else {
        toast.error(response?.message || 'Failed to submit addon request');
      }
    } catch (error) {
      console.error('Error submitting addon request:', error);
      toast.error('Failed to submit addon request');
    }
  };

  const handleCloseModal = () => {
    setShowAddonModal(false);
    setAddonRemark('');
    setRequestedQuantity(0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
        <p className="mt-4 text-gray-600">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">
            Manage your branch products and inventory
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Package2 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        {/* In Stock */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Stock</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.inStock}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Low Stock */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                {stats.lowStock > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Alert
                  </span>
                )}
              </div>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        {/* Out of Stock */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.outOfStock}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        
      </div>

      {/* Filters */}
      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        onReset={handleResetFilters}
      />

      {/* Action Bar - Shows when products are selected */}
      {selectedProducts.length > 0 && (
        <div className="bg-gradient-to-r from-orange-600 to-indigo-600 rounded-lg shadow-lg border border-orange-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg px-3 py-1.5">
                <span className="text-white font-semibold">
                  {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Set initial requested quantity to min stock level
                  const product = products.find((p) => p.id === selectedProducts[0]);
                  if (product) {
                    setRequestedQuantity(product.minStockLevel || 1);
                  }
                  setShowAddonModal(true);
                }}
                className="inline-flex items-center px-5 py-2.5 bg-white text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-200 shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                Addon Quantity
              </button>
              <button
                onClick={() => toast('Return feature coming soon')}
                className="inline-flex items-center px-5 py-2.5 bg-white text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-200 shadow-md"
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Return
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="inline-flex items-center px-5 py-2.5 bg-white text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-200 shadow-md"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Barcodes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <ProductsTable
        items={filteredProducts}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
        pagination={pagination}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />

      {/* Results count */}
      {filteredProducts.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredProducts.length} of {pagination.total} products
          <span className="ml-2 text-gray-500">
            | Total Quantity: {filteredProducts.reduce((sum, item) => sum + item.quantity, 0)} units
          </span>
        </div>
      )}

      {/* Addon Quantity Modal */}
      {showAddonModal && selectedProducts.length > 0 && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-400/20 via-purple-500/20 to-pink-500/20 backdrop-blur-md transition-opacity flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] border border-white/20">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 to-indigo-600 px-6 py-2 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Request Addon Quantity</h2>
              <button
                onClick={handleCloseModal}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {(() => {
                const product = getSelectedProductDetails();
                if (!product) return (
                  <div className="text-center text-gray-500 py-8">
                    <p>No product selected</p>
                  </div>
                );

                return (
                  <>
                    {/* Product Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Product Name */}
                      <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Product Name
                        </label>
                        <p className="text-base font-medium text-gray-900">{product.productName}</p>
                      </div>

                      {/* Product Code */}
                      <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Product Code
                        </label>
                        <p className="text-base font-medium text-gray-900">{product.productCode}</p>
                      </div>

                      {/* Current Quantity */}
                      <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Current Quantity
                        </label>
                        <p className="text-2xl font-bold text-orange-600">{product.quantity}</p>
                      </div>

                      {/* Requested Quantity - Editable */}
                      <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border-2 border-orange-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Requested Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={requestedQuantity || ''}
                          onChange={(e) => setRequestedQuantity(parseInt(e.target.value) || 0)}
                          placeholder="Enter quantity needed"
                          className="w-full px-4 py-3 text-xl font-bold text-green-600 border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">Min stock level: {product.minStockLevel}</p>
                      </div>
                    </div>

                    {/* Remark Field */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Remark <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        value={addonRemark}
                        onChange={(e) => setAddonRemark(e.target.value)}
                        rows={4}
                        placeholder="Enter any remarks or notes for this request..."
                        className="w-full px-4 py-3 border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="bg-white/30 backdrop-blur-sm px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl border-t border-white/20">
              <Button
                variant="outline"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <button
                onClick={handleAddonRequest}
                disabled={addonLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-orange-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addonLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      {showPrintModal && selectedProducts.length > 0 && (
        <BarcodePrintModal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          products={products
            .filter((p) => selectedProducts.includes(p.id))
            .map<PrintProduct>((p) => ({
              productId: p.productId,
              name: p.productName,
              productCode: p.productCode,
              unitPrice: p.unitPrice,
            }))}
        />
      )}
    </div>
  );
}
