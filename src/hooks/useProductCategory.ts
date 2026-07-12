import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: ProductCategory;
  children?: ProductCategory[];
  image?: string;
  isActive: boolean;
  displayOrder: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'displayOrder' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  parentorNoT?: 'withParent' | 'withoutParent';
}

interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  rootCategories: number;
  categoriesWithProducts: number;
}

interface CreateCategoryData {
  name: string;
  description?: string;
  parentId?: string;
  image?: string;
  isActive?: boolean;
  displayOrder?: number;
}

interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string;
}

export const useProductCategory = () => {
  const { fetchData, loading, error, data, reset } = useFetch();
  const { user } = useAuth();
  const businessId = user?.businessId;

  // Get all categories with filters
  const getAllCategories = useCallback(async (filters?: CategoryFilters) => {

    const queryParams = new URLSearchParams();
    if (businessId) queryParams.append('businessId', businessId);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/productcategories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',  silent:true
    });
  }, [fetchData, businessId]);

  // Get category tree (hierarchical structure)
  const getCategoryTree = useCallback(async () => {
    return await fetchData({
      endpoint: '/productcategories/tree',
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Get category statistics
  const getCategoryStats = useCallback(async () => {
    return await fetchData({
      endpoint: '/productcategories/stats',
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Get category by ID
  const getCategoryById = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/productcategories/${id}`,
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Create category
  const createCategory = useCallback(async (categoryData: CreateCategoryData) => {
    return await fetchData({
      endpoint: '/productcategories',
      method: 'POST',
      data: { ...categoryData, businessId },
      successMessage: 'Category created successfully',
    });
  }, [fetchData, businessId]);

  // Update category
  const updateCategory = useCallback(async (categoryData: UpdateCategoryData) => {
    const { id, ...updateData } = categoryData;
    return await fetchData({
      endpoint: `/productcategories/${id}`,
      method: 'PUT',
      data: { ...updateData, businessId },
      successMessage: 'Category updated successfully',
    });
  }, [fetchData, businessId]);

  // Delete category
  const deleteCategory = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/productcategories/${id}`,
      method: 'DELETE',
      successMessage: 'Category deleted successfully',
    });
  }, [fetchData]);

  // Bulk upload categories
  const bulkUploadCategories = useCallback(async (file: File) => {
    return await fetchData({
      endpoint: '/productcategories/bulk-upload',
      method: 'POST',
      file: file,
      successMessage: 'Categories uploaded successfully',
    });
  }, [fetchData]);

  return {
    // State
    categories: data?.data as ProductCategory[] | undefined,
    category: data?.data as ProductCategory | undefined,
    categoryTree: data?.data as ProductCategory[] | undefined,
    stats: data?.data as CategoryStats | undefined,
    loading,
    error,
    
    // Methods
    getAllCategories,
    getCategoryTree,
    getCategoryStats,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    bulkUploadCategories,
    reset,
  };
};

export default useProductCategory;
