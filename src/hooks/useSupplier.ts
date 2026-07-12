import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  fax?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  taxId?: string;
  registrationNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
  creditDays: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  swiftCode?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  contactPersonDesignation?: string;
  rating?: number;
  supplierType: 'LOCAL' | 'INTERNATIONAL' | 'MANUFACTURER' | 'DISTRIBUTOR' | 'WHOLESALER' | 'RETAILER';
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'PENDING_APPROVAL';
  documents?: Record<string, unknown>;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SupplierFilters {
  page?: number;
  limit?: number;
  search?: string;
  supplierType?: string;
  status?: string;
  city?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'supplierCode' | 'createdAt' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  blacklistedSuppliers: number;
  totalPurchaseOrders: number;
  pendingOrders: number;
  totalPurchaseValue: number;
  outstandingPayments: number;
}

interface CreateSupplierData {
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  fax?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  registrationNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
  creditDays?: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  swiftCode?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  contactPersonDesignation?: string;
  rating?: number;
  supplierType?: 'LOCAL' | 'INTERNATIONAL' | 'MANUFACTURER' | 'DISTRIBUTOR' | 'WHOLESALER' | 'RETAILER';
  status?: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'PENDING_APPROVAL';
  documents?: Record<string, unknown>;
  notes?: string;
  isActive?: boolean;
}

interface UpdateSupplierData extends Partial<CreateSupplierData> {
  id: string;
}

interface SupplierProduct {
  productId: string;
  supplierSKU?: string;
  supplierPrice: number;
  leadTimeDays?: number;
  minimumOrderQuantity?: number;
  isPreferred?: boolean;
}

interface SupplierPerformance {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalPurchaseValue: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  qualityRating: number;
  returnRate: number;
}

export const useSupplier = () => {
  const { fetchData, loading, error, data, reset } = useFetch();
  const { user } = useAuth();
  const businessId = user?.businessId;

  // Get all suppliers with filters
  const getAllSuppliers = useCallback(async (filters?: SupplierFilters) => {
    const queryParams = new URLSearchParams();
    if (businessId) queryParams.append('businessId', businessId);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/suppliers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',  silent:true
    });
  }, [fetchData, businessId]);

  // Get supplier statistics
  const getSupplierStats = useCallback(async () => {
    return await fetchData({
      endpoint: '/suppliers/stats',
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Get supplier by ID
  const getSupplierById = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/suppliers/${id}`,
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Create supplier
  const createSupplier = useCallback(async (supplierData: CreateSupplierData) => {
    return await fetchData({
      endpoint: '/suppliers',
      method: 'POST',
      data: { ...supplierData, businessId },
      successMessage: 'Supplier created successfully',
    });
  }, [fetchData, businessId]);

  // Update supplier
  const updateSupplier = useCallback(async (supplierData: UpdateSupplierData) => {
    const { id, ...updateData } = supplierData;
    return await fetchData({
      endpoint: `/suppliers/${id}`,
      method: 'PUT',
      data: { ...updateData, businessId },
      successMessage: 'Supplier updated successfully',
    });
  }, [fetchData, businessId]);

  // Delete supplier
  const deleteSupplier = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/suppliers/${id}`,
      method: 'DELETE',
      successMessage: 'Supplier deleted successfully',
    });
  }, [fetchData]);

  // Get supplier products
  const getSupplierProducts = useCallback(async (supplierId: string) => {
    return await fetchData({
      endpoint: `/suppliers/${supplierId}/products`,
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Add product to supplier
  const addProductToSupplier = useCallback(async (supplierId: string, productData: SupplierProduct) => {
    return await fetchData({
      endpoint: `/suppliers/${supplierId}/products`,
      method: 'POST',
      data: { ...productData, businessId },
      successMessage: 'Product added to supplier successfully',
    });
  }, [fetchData, businessId]);

  // Update supplier product
  const updateSupplierProduct = useCallback(async (supplierId: string, productId: string, productData: Partial<SupplierProduct>) => {
    return await fetchData({
      endpoint: `/suppliers/${supplierId}/products/${productId}`,
      method: 'PUT',
      data: { ...productData, businessId },
      successMessage: 'Supplier product updated successfully',
    });
  }, [fetchData, businessId]);

  // Remove product from supplier
  const removeProductFromSupplier = useCallback(async (supplierId: string, productId: string) => {
    return await fetchData({
      endpoint: `/suppliers/${supplierId}/products/${productId}`,
      method: 'DELETE',
      successMessage: 'Product removed from supplier successfully',
    });
  }, [fetchData]);

  // Get supplier performance
  const getSupplierPerformance = useCallback(async (supplierId: string) => {
    return await fetchData({
      endpoint: `/suppliers/${supplierId}/performance`,
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  return {
    // State
    suppliers: data?.data as Supplier[] | undefined,
    supplier: data?.data as Supplier | undefined,
    stats: data?.data as SupplierStats | undefined,
    supplierProducts: data?.data as SupplierProduct[] | undefined,
    performance: data?.data as SupplierPerformance | undefined,
    loading,
    error,
    
    // Methods
    getAllSuppliers,
    getSupplierStats,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierProducts,
    addProductToSupplier,
    updateSupplierProduct,
    removeProductFromSupplier,
    getSupplierPerformance,
    reset,
  };
};

export default useSupplier;
