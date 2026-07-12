import { useEffect, useState, useCallback, useRef } from 'react';
import CategoryStatsCards from '../../components/superadmin/categories/CategoryStatsCards';
import CategoryTable from '../../components/superadmin/categories/CategoryTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Plus, RefreshCw, Search, X, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useProductCategory } from '../../hooks/useProductCategory';
import AddCategoryModal from '../../components/superadmin/categories/AddCategoryModal';
import EditCategoryModal from '../../components/superadmin/categories/EditCategoryModal';
import ViewCategoryModal from '../../components/superadmin/categories/ViewCategoryModal';
import DeleteCategoryModal from '../../components/superadmin/categories/DeleteCategoryModal';
import BulkUploadModal from '../../components/superadmin/categories/BulkUploadModal';

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: {
    name: string;
  };
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  withProducts: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [stats, setStats] = useState<CategoryStats>({
    total: 0,
    active: 0,
    inactive: 0,
    withProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);



  // Hooks
  const categoryHook = useProductCategory();

  // Load data
  const loadCategories = useCallback(async (page = currentPage, limit = itemsPerPage) => {
    try {
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filters: any = {
        page,
        limit,
      };

      // Add search filter
      if (debouncedSearchQuery) {
        filters.search = debouncedSearchQuery;
      }

      // Add status filters
      if (selectedStatus === 'active') {
        filters.isActive = true;
      } else if (selectedStatus === 'inactive') {
        filters.isActive = false;
      }
      // Add parent filters (root/subcategories)
      if (selectedStatus === 'withoutParent') {
        filters.parentorNoT = 'withoutParent';
      } else if (selectedStatus === 'withParent') {
        filters.parentorNoT = 'withParent';
      }
      // Note: parentId filter can be added if backend supports it

      const response = await categoryHook.getAllCategories(filters);
      if (response?.data) {
        const categoriesData = response.data as CategoryItem[];
        setCategories(categoriesData);
        // Extract pagination info if backend returns it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagination = (response as any).pagination;
        if (pagination) {
          setTotalItems(pagination.total || 0);
          setTotalPages(pagination.totalPages || 0);
        } else {
          // Fallback if pagination info not in response
          setTotalItems(categoriesData.length);
          setTotalPages(Math.ceil(categoriesData.length / limit));
        }
      }
    } catch (error) {
      toast.error('Failed to load categories');
      console.error(error);
    } finally {
      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, [categoryHook, currentPage, itemsPerPage, debouncedSearchQuery, selectedStatus]);

  const loadStats = useCallback(async () => {
    try {
      const response = await categoryHook.getCategoryStats();
      if (response?.data) {
        const apiStats = response.data as CategoryStats;
        setStats({
          total: apiStats.total || 0,
          active: apiStats.active || 0,
          inactive: apiStats.inactive || 0,
          withProducts: apiStats.withProducts || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }, [categoryHook]);

  // Debounce search so the input stays focused while typing
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

  // Initial load
  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data when filters or pagination changes
  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchQuery, selectedStatus]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCategories(), loadStats()]);
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [loadCategories, loadStats]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEdit = (item: CategoryItem) => {
    setSelectedCategory(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = (item: CategoryItem) => {
    setSelectedCategory(item);
    setIsDeleteModalOpen(true);
  };

  const handleView = (item: CategoryItem) => {
    setSelectedCategory(item);
    setIsViewModalOpen(true);
  };

  const handleAddCategory = () => {
    setIsAddModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadCategories();
    loadStats();
  };

  // const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   // Validate file type
  //   const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
  //   if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
  //     toast.error('Please select a valid Excel (.xlsx) or CSV (.csv) file');
  //     return;
  //   }

  //   setIsBulkUploading(true);
  //   try {
  //     const response = await categoryHook.bulkUploadCategories(file);
  //     if (response?.success) {
  //       toast.success(`Bulk upload completed! Created: ${response.data?.created || 0}, Updated: ${response.data?.updated || 0}`);
  //       loadCategories();
  //       loadStats();
  //     } else {
  //       toast.error('Bulk upload failed');
  //     }
  //   } catch (error) {
  //     toast.error('Failed to upload categories');
  //     console.error(error);
  //   } finally {
  //     setIsBulkUploading(false);
  //     // Reset file input
  //     event.target.value = '';
  //   }
  // };

  const handleDownloadSample = () => {
    // Create a link to download the sample file from the public folder
    const link = document.createElement('a');
    link.href = '/samples/sample_categories.xlsx';
    link.download = 'sample_categories.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Organize and manage product categories across your system
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleDownloadSample}>
            <Download className="w-4 h-4 mr-2" />
            Sample Excel
          </Button>
          <Button variant="outline" onClick={() => setIsBulkUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAddCategory} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <CategoryStatsCards stats={stats} />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Label>Search</Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="pl-10 pr-10"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Label>Status</Label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="mt-1 w-full px-3 py-2 border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm text-sm focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="withoutParent">Root Categories</option>
                <option value="withParent">Subcategories</option>
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedStatus) && (
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/20">
              <span className="text-sm text-muted-foreground">
                {totalItems} categories found
              </span>
              <Button variant="link" onClick={handleResetFilters} className="text-orange-600 hover:text-orange-700">
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Table */}
      <CategoryTable
        items={categories}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Category Modals */}
      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <EditCategoryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        onSuccess={handleModalSuccess}
      />

      <ViewCategoryModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
      />

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        onSuccess={handleModalSuccess}
      />

      <BulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
