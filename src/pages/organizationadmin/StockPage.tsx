import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StockStatsCards from '../../components/superadmin/stock/StockStatsCards';
import StockTable from '../../components/superadmin/stock/StockTable';
import StockFilters from '../../components/superadmin/stock/StockFilters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Plus, RefreshCw, Upload, Download, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import DataRawModal from '../../components/common/DataRawModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useProduct } from '../../hooks/useProduct';
import { useProductCategory } from '../../hooks/useProductCategory';
import { useProductVariantType } from '../../hooks/useProductVariantType';
import type { ProductVariantType } from '../../hooks/useProductVariantType';
import VariantPOSSearch from '../../components/organizationadmin/products/VariantPOSSearch';
import AddStockModal from '../../components/superadmin/stock/AddStockModal';
import EditStockModal from '../../components/superadmin/stock/EditStockModal';
import ViewStockModal from '../../components/superadmin/stock/ViewStockModal';
import DeleteStockModal from '../../components/superadmin/stock/DeleteStockModal';
import StockTransferModal from '../../components/superadmin/stock/StockTransferModal';
import ProductTransferModal from '../../components/superadmin/products/ProductTransferModal';
import BulkUploadModal from '../../components/superadmin/stock/BulkUploadModal';
import VariantTypeManagerModal from '../../components/organizationadmin/products/VariantTypeManagerModal';
import ManageVariantsModal from '../../components/organizationadmin/products/ManageVariantsModal';
import { mapStockProductStatusFilter, toCategoryOptions } from '../../utils/productListFilters';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';

// Import ProductItem type from hook
import type { ProductItem } from '../../hooks/useProduct';

interface StockStats {
  totalProducts: number;
  activeProducts: number;
  discontinuedProducts: number;
  lowStockProducts: number;
  totalValue: number;
  totalRetailValue?: number;
  categoryBreakdown: { name: string; count: number }[];
}

export default function StockPage() {
  const [filteredProducts, setFilteredProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [stats, setStats] = useState<StockStats>({
    totalProducts: 0,
    activeProducts: 0,
    discontinuedProducts: 0,
    lowStockProducts: 0,
    totalValue: 0,
    totalRetailValue: 0,
    categoryBreakdown: [],
  });
  const [loading, setLoading] = useState(true);
  // Gates the full-page spinner to the first load so debounced search reloads
  // keep the search box mounted (otherwise it loses focus while typing).
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [rawData, setRawData] = useState<unknown | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedLocation] = useState<string>('');
  const [variantTypes, setVariantTypes] = useState<ProductVariantType[]>([]);
  const [selectedVariantAttrs, setSelectedVariantAttrs] = useState<Record<string, string>>({});

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProductTransferModalOpen, setIsProductTransferModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isVariantTypesModalOpen, setIsVariantTypesModalOpen] = useState(false);
  const [isManageVariantsModalOpen, setIsManageVariantsModalOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<ProductItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Bulk upload states
  // const [isBulkUploading, setIsBulkUploading] = useState(false);

  // Hooks
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreateProduct = hasPermission(PERMISSIONS.PRODUCTS_CREATE);
  const canEditProduct = hasPermission(PERMISSIONS.PRODUCTS_UPDATE);
  const canDeleteProduct = hasPermission(PERMISSIONS.PRODUCTS_DELETE);
  const productHook = useProduct();
  const categoryHook = useProductCategory();
  const variantTypeHook = useProductVariantType();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      // Reset page to 1 here (alongside debounced search) to avoid a double-load:
      // resetting the page in a separate effect would fire loadProducts with the
      // OLD search term before the debounce updates it.
      setCurrentPage(1);
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Load data
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (selectedLocation) filters.locationId = selectedLocation;
      if (debouncedSearchQuery) filters.search = debouncedSearchQuery;
      if (selectedCategory) filters.categoryId = selectedCategory;
      Object.assign(filters, mapStockProductStatusFilter(selectedStatus));
      // Pass variant attribute filters as individual query params
      Object.entries(selectedVariantAttrs).forEach(([k, v]) => {
        if (v) filters[`variantAttr_${k}`] = v;
      });

      const response = await productHook.getAllProducts(filters);
      if (response?.data) {
        setFilteredProducts(response.data as ProductItem[]);

        // Extract pagination info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagination = (response as any).pagination;
        if (pagination) {
          setTotalItems(pagination.total || 0);
          setTotalPages(pagination.totalPages || 0);
          // If the current page is beyond totalPages, reset to page 1
          if (pagination.totalPages > 0 && currentPage > pagination.totalPages) {
            setCurrentPage(1);
          }
        } else {
          const dataLength = (response.data as ProductItem[]).length;
          setTotalItems(dataLength);
          setTotalPages(Math.ceil(dataLength / itemsPerPage));
        }
      }
    } catch (error) {
      toast.error('Failed to load products');
      console.error(error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [productHook, currentPage, itemsPerPage, selectedLocation, debouncedSearchQuery, selectedCategory, selectedStatus, selectedVariantAttrs]);



  const loadVariantTypes = useCallback(async () => {
    try {
      const res = await variantTypeHook.getAllVariantTypes({ isActive: true });
      if (res?.data) {
        const list = Array.isArray(res.data) ? (res.data as ProductVariantType[]) : [];
        setVariantTypes(
          list.map((vt) => ({
            ...vt,
            options: Array.isArray(vt.options) ? vt.options : [],
          })),
        );
      }
    } catch (error) {
      console.error('Failed to load variant types:', error);
    }
  }, [variantTypeHook]);

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

  const loadStats = useCallback(async () => {
    try {
      const response = await productHook.getProductStats();
      if (response?.data) {
        const apiStats = response.data as {
          total: number;
          active?: number;
          activeProducts?: number;
          discontinued: number;
          lowStock: number;
          totalValue: number;
          totalRetailValue?: number;
          categoryBreakdown?: Record<string, number>;
          byLocation?: Array<{ locationName: string; productCount: number }>;
        };

        // Convert categoryBreakdown to array
        const categoryArray = Object.entries(apiStats.categoryBreakdown || {}).map(([name, count]) => ({
          name,
          count,
        }));

        setStats({
          totalProducts: apiStats.total || 0,
          activeProducts: apiStats.active ?? apiStats.activeProducts ?? 0,
          discontinuedProducts: apiStats.discontinued || 0,
          lowStockProducts: apiStats.lowStock || 0,
          totalValue: apiStats.totalValue || 0,
          totalRetailValue: apiStats.totalRetailValue || 0,
          categoryBreakdown: categoryArray,
        });
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }, [productHook]);

  // Initial load
  useEffect(() => {
    loadCategories();
    loadStats();
    loadProducts();
    loadVariantTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when pagination or filters change
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, selectedLocation, debouncedSearchQuery, selectedCategory, selectedStatus, selectedVariantAttrs]);

  const handleFilterCategoryChange = (category: string) => {
    setCurrentPage(1);
    setSelectedCategory(category);
  };

  const handleFilterStatusChange = (status: string) => {
    setCurrentPage(1);
    setSelectedStatus(status);
  };

  const handleVariantAttrsChange = (attrs: Record<string, string>) => {
    setCurrentPage(1);
    setSelectedVariantAttrs(attrs);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadProducts(), loadStats()]);
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [loadProducts, loadStats]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedVariantAttrs({});
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // loadProducts will be triggered by useEffect watching currentPage
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    // loadProducts will be triggered by useEffect watching itemsPerPage
  };

  const handleEdit = (item: ProductItem) => {
    navigate(`edit/${item.id}`);
  };

  const handleDelete = async (item: ProductItem) => {
    setSelectedProduct(item);
    setIsDeleteModalOpen(true);
  };

  const handleView = (item: ProductItem) => {
    setSelectedProduct(item);
    setIsViewModalOpen(true);
  };

  const handleAddProduct = () => {
    navigate('add');
  };

  const handleManageVariants = (item: ProductItem) => {
    setSelectedProductForVariants(item);
    setIsManageVariantsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadProducts();
    loadStats();
  };



  const handleDownloadSample = () => {
    // Create a link to download the sample file from the public folder
    const link = document.createElement('a');
    link.href = '/samples/phone_shop_products.xlsx';
    link.download = 'sample_products.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportProducts = async () => {
    setExporting(true);
    try {
      const response = await productHook.exportProducts();
      if (!response) {
        toast.error('Failed to export products');
        return;
      }

      const blob = response instanceof Blob
        ? response
        : new Blob([response as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Product export downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export products');
    } finally {
      setExporting(false);
    }
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
        <div className="flex-1">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage products, pricing, and stock levels across your system
          </p>
          {/* POS-style variant-aware product search */}
          <div className="mt-3 max-w-xl">
            <VariantPOSSearch
              onSelect={handleView}
              onView={handleView}
              onEdit={canEditProduct ? handleEdit : undefined}
              onManageVariants={canEditProduct ? handleManageVariants : undefined}
              placeholder="Quick search: name, SKU, barcode, brand, category, tags, variants..."
            />
          </div>
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
            onClick={() => setIsVariantTypesModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Layers className="w-4 h-4 mr-2" />
            Variant Types
          </Button>
          <Button
            onClick={() => setIsProductTransferModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Transfer Products
          </Button>
          {canCreateProduct && (
            <Button
              onClick={handleAddProduct}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Location Filter */}
      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LocationSelector
            value={selectedLocation}
            onChange={setSelectedLocation}
            label="Filter by Location"
            showAll={true}
            placeholder="All Locations"
          />
        </div>
      </div> */}


      {/* Stats Cards */}
      <StockStatsCards stats={stats} />


      <div className="flex items-end  justify-end gap-4">
        <Button
          onClick={handleDownloadSample}
          variant="outline"
        >
          <Download className="w-4 h-4 mr-2" />
          Sample Excel
        </Button>
        <Button
          onClick={handleExportProducts}
          disabled={exporting}
          variant="outline"
        >
          <Download className="w-4 h-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export Products'}
        </Button>
        <Button
          onClick={() => setIsBulkUploadModalOpen(true)}
          variant="outline"
          disabled={!canCreateProduct}
        >
          <Upload className="w-4 h-4 mr-2" />
          Bulk Upload
        </Button>
      </div>

      {/* Category Breakdown */}
      {stats.categoryBreakdown.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Products by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.categoryBreakdown.map((cat) => (
              <div key={cat.name} className="flex justify-between text-sm bg-white/30 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                <span className="text-gray-600">{cat.name}:</span>
                <span className="font-medium text-gray-900">{cat.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <StockFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={handleFilterCategoryChange}
        selectedStatus={selectedStatus}
        onStatusChange={handleFilterStatusChange}
        onReset={handleResetFilters}
        categories={categories}
        variantTypes={variantTypes}
        selectedVariantAttrs={selectedVariantAttrs}
        onVariantAttrsChange={handleVariantAttrsChange}
      />

      {/* Product Table with Pagination */}
      <StockTable
        items={filteredProducts}
        onEdit={canEditProduct ? handleEdit : undefined}
        onDelete={canDeleteProduct ? handleDelete : undefined}
        onView={handleView}
        onRestock={canEditProduct ? handleEdit : undefined}
        onManageVariants={canEditProduct ? handleManageVariants : undefined}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Raw Data Modal */}
      <DataRawModal
        isOpen={isRawModalOpen}
        onClose={() => {
          setIsRawModalOpen(false);
          setRawData(null);
        }}
        data={rawData}
        title="Product Raw Data"
      />

      {/* Product Modals */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <EditStockModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        stockItem={selectedProduct}
        onSuccess={handleModalSuccess}
      />

      <ViewStockModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedProduct(null);
        }}
        stockItem={selectedProduct}
      />

      <DeleteStockModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProduct(null);
        }}
        stockItem={selectedProduct}
        onSuccess={handleModalSuccess}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          setIsTransferModalOpen(false);
          handleModalSuccess();
        }}
      />

      {/* Product Transfer Modal */}
      <ProductTransferModal
        isOpen={isProductTransferModalOpen}
        onClose={() => setIsProductTransferModalOpen(false)}
        warehouseOr={null}
        onSuccess={() => {
          setIsProductTransferModalOpen(false);
          handleModalSuccess();
        }}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onSuccess={() => {
          setIsBulkUploadModalOpen(false);
          handleModalSuccess();
        }}
      />

      {/* Variant Types Manager Modal */}
      <VariantTypeManagerModal
        isOpen={isVariantTypesModalOpen}
        onClose={() => setIsVariantTypesModalOpen(false)}
      />

      {/* Manage Variants Modal */}
      <ManageVariantsModal
        isOpen={isManageVariantsModalOpen}
        onClose={() => {
          setIsManageVariantsModalOpen(false);
          setSelectedProductForVariants(null);
        }}
        onSuccess={handleModalSuccess}
        parentProduct={selectedProductForVariants}
      />
    </div>
  );
}
