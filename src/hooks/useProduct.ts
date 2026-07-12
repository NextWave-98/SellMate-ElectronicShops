/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

export interface ProductItem {
  id: string;
  sku?: string;
  barcode?: string;
  productCode: string;
  name: string;
  description?: string;
  categoryId?: string; // Now optional
  category?: {
    id: string;
    name: string;
    categoryCode: string;
  };
  brand?: string;
  model?: string;
  compatibility?: string;
  specifications?: Record<string, unknown>;
  unitPrice: number;
  costPrice?: number; // Now optional
  wholesalePrice?: number;
  profitMargin?: number;
  taxRate?: number; // Now optional
  minStockLevel?: number; // Now optional
  maxStockLevel?: number;
  reorderLevel?: number; // Now optional
  reorderQuantity?: number; // Now optional
  weight?: number;
  dimensions?: string;
  warrantyMonths?: number; // Now optional
  warrantyType?: string; // Now optional
  qualityGrade?: string; // Now optional
  terms?: string;
  coverage?: string;
  exclusions?: string;
  isActive: boolean;
  isDiscontinued: boolean;
  images?: string[];
  primaryImage?: string;
  // New flexible fields
  customAttributes?: Record<string, any>; // Business-specific attributes
  tags?: string[]; // Flexible tagging
  hasVariants?: boolean; // Product has variants
  parentProductId?: string; // Parent product reference
  variantAttributes?: Record<string, any>; // Variant-specific attributes
  variants?: ProductItem[]; // Child variants
  discountInfo?: {
    discountId: string;
    discountName: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    discountAmount: number;
    effectivePrice: number;
    startDate?: string | null;
    endDate?: string | null;
    scope: 'product' | 'category';
  } | null;
  inventorySummary?: {
    totalQuantity: number;
    totalAvailable: number;
    locations: {
      locationId: string;
      locationName: string;
      locationCode: string;
      locationType: string;
      quantity: number;
      availableQuantity: number;
      reservedQuantity: number;
    }[];
  };
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  sku?: string;
  barcode?: string;
  productCode: string;
  name: string;
  description?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  brand?: string;
  model?: string;
  compatibility?: string;
  specifications?: Record<string, unknown>;
  unitPrice: number;
  costPrice?: number;
  wholesalePrice?: number;
  profitMargin?: number;
  taxRate?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  weight?: number;
  dimensions?: string;
  warrantyMonths?: number;
  warrantyType?: string;
  qualityGrade?: string;
  terms?: string;
  coverage?: string;
  exclusions?: string;
  isActive: boolean;
  isDiscontinued: boolean;
  images?: string[];
  primaryImage?: string;
  customAttributes?: Record<string, any>;
  tags?: string[];
  hasVariants?: boolean;
  parentProductId?: string;
  variantAttributes?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  branchId?: string;
  brand?: string;
  qualityGrade?: string;
  isActive?: boolean;
  isDiscontinued?: boolean;
  lowStock?: boolean;
  sortBy?: 'name' | 'productCode' | 'unitPrice' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  discontinuedProducts: number;
  lowStockProducts: number;
  totalValue: number;
  categoryBreakdown: Record<string, number>;
}

interface CreateProductData {
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string; // Now optional
  brand?: string;
  model?: string;
  compatibility?: string;
  specifications?: Record<string, unknown>;
  unitPrice: number;
  costPrice?: number; // Now optional
  wholesalePrice?: number;
  profitMargin?: number;
  taxRate?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  weight?: number;
  dimensions?: string;
  warrantyMonths?: number;
  warrantyType?: string;
  qualityGrade?: string;
  terms?: string;
  coverage?: string;
  exclusions?: string;
  isActive?: boolean;
  images?: string[];
  primaryImage?: string;
  // New flexible fields
  customAttributes?: Record<string, any>;
  tags?: string[];
  hasVariants?: boolean;
  parentProductId?: string;
  variantAttributes?: Record<string, any>;
  isService?: boolean;
}

interface UpdateProductData extends Partial<CreateProductData> {
  id: string;
}

interface BulkPriceUpdateData {
  productIds: string[];
  priceType: 'unitPrice' | 'costPrice' | 'wholesalePrice';
  updateType: 'percentage' | 'fixed';
  value: number;
}

export const useProduct = () => {
  const { fetchData, loading, error, data, reset } = useFetch();
  const { user } = useAuth();
  const businessId = user?.businessId;

  // Get all products with filters
  const getAllProducts = useCallback(async (filters?: ProductFilters) => {
    const queryParams = new URLSearchParams();
    if (businessId) queryParams.append('businessId', businessId);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET', silent:true
    });
  }, [fetchData, businessId]);

  // Get product by ID
  const getProductById = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/products/${id}`,
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Get low stock products
  const getLowStockProducts = useCallback(async () => {
    return await fetchData({
      endpoint: '/products/low-stock',
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Get product statistics
  const getProductStats = useCallback(async () => {
    return await fetchData({
      endpoint: '/products/stats',
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Create product
  const createProduct = useCallback(async (productData: CreateProductData) => {
    return await fetchData({
      endpoint: '/products',
      method: 'POST',
      data: { ...productData, businessId },
      successMessage: 'Product created successfully',
    });
  }, [fetchData, businessId]);

  // Update product
  const updateProduct = useCallback(async (productData: UpdateProductData) => {
    const { id, ...updateData } = productData;
    return await fetchData({
      endpoint: `/products/${id}`,
      method: 'PUT',
      data: { ...updateData, businessId },
      successMessage: 'Product updated successfully',
    });
  }, [fetchData, businessId]);

  // Delete product
  const deleteProduct = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/products/${id}`,
      method: 'DELETE',
      successMessage: 'Product deleted successfully',
    });
  }, [fetchData]);

  // Bulk price update
  const bulkPriceUpdate = useCallback(async (updateData: BulkPriceUpdateData) => {
    return await fetchData({
      endpoint: '/products/bulk-price-update',
      method: 'POST',
      data: { ...updateData, businessId },
      successMessage: 'Product prices updated successfully',
    });
  }, [fetchData, businessId]);

  // Transfer product between branches
  const transferProduct = useCallback(async (transferData: {
    productId: string;
    fromBranchId: string;
    toBranchId: string;
    quantity: number;
    notes?: string;
  }) => {
    return await fetchData({
      endpoint: '/products/transfer',
      method: 'POST',
      data: { ...transferData, businessId },
      successMessage: 'Product transferred successfully',
    });
  }, [fetchData, businessId]);

  // Bulk transfer products
  const bulkTransferProducts = useCallback(async (transferData: {
    fromLocationId: string;
    toLocationId: string;
    notes?: string;
    products: {
      productId: string;
      quantity: number;
    }[];
  }) => {
    return await fetchData({
      endpoint: '/products/bulk-transfer',
      method: 'POST',
      data: { ...transferData, businessId },
      successMessage: 'Products transferred successfully',
    });
  }, [fetchData, businessId]);

  // Adjust product stock
  const adjustProductStock = useCallback(async (adjustData: {
    productId: string;
    branchId: string;
    quantity: number;
    type: 'IN' | 'OUT';
    reason: string;
    notes?: string;
  }) => {
    // Transform data to match backend API expectations
    const apiData: any = {
      productId: adjustData.productId,
      locationId: adjustData.branchId, // Backend expects locationId
      quantity: adjustData.quantity,
      movementType: adjustData.type === 'IN' ? 'STOCK_IN' : 'STOCK_OUT', // Backend expects movementType enum
      notes: adjustData.reason || adjustData.notes,
    };

    // Only add referenceType if backend supports it
    // Remove this field since it's causing validation errors
    
    return await fetchData({
      endpoint: '/products/adjust-stock',
      method: 'POST',
      data: apiData,
      successMessage: 'Product stock adjusted successfully',
    });
  }, [fetchData, businessId]);

  // Bulk upload products
  const bulkUploadProducts = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return await fetchData({
      endpoint: '/products/bulk-upload',
      method: 'POST',
      file: file,
      successMessage: 'Products uploaded successfully',
    });
  }, [fetchData]);

  const exportProducts = useCallback(async () => {
    return await fetchData({
      endpoint: '/products/export',
      method: 'GET',
      responseType: 'blob',
      silent: true,
    });
  }, [fetchData]);

  // Get stock movement history
  const getStockMovements = useCallback(async (filters?: {
    productId?: string;
    branchId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/products/stock-movements${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get variants of a product with inventory per location
  const getProductVariants = useCallback(async (productId: string) => {
    return await fetchData({
      endpoint: `/products/${productId}/variants`,
      method: 'GET',
      silent: true,
    });
  }, [fetchData]);

  // Get barcode image as blob URL for a product
  const getBarcodeImage = useCallback(async (
    productId: string,
    symbology = 'code128',
    format: 'png' | 'svg' = 'png'
  ): Promise<string | null> => {
    const token = (await import('../utils/tokenStorage')).getAccessToken();
    const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';
    const res = await fetch(`${BASE_URL}/products/${productId}/barcode?symbology=${symbology}&format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }, []);

  // Get QR code PNG as blob URL for a product
  const getQRCodeImage = useCallback(async (productId: string): Promise<string | null> => {
    const token = (await import('../utils/tokenStorage')).getAccessToken();
    const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';
    const res = await fetch(`${BASE_URL}/products/${productId}/qrcode`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }, []);

  // Print barcode/label PDF – downloads the PDF directly
  const printBarcodeLabels = useCallback(async (
    items: { productId: string; quantity?: number }[],
    options?: {
      width?: number;
      height?: number;
      columns?: number;
      barcodeType?: string;
      labelMode?: 'barcode-only' | 'label-only' | 'label-with-barcode' | 'label-with-qr' | 'label-with-both' | 'label-with-barcode-styled';
      pageSize?: 'A4' | 'A5' | 'letter' | 'custom';
      showProductName?: boolean;
      showPrice?: boolean;
      showProductCode?: boolean;
      showBrand?: boolean;
      showWooCommerceId?: boolean;
      labelSpacing?: number;
    },
    filename = 'barcode-labels.pdf'
  ): Promise<boolean> => {
    const token = (await import('../utils/tokenStorage')).getAccessToken();
    const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';
    const res = await fetch(`${BASE_URL}/products/barcode/print-labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ items, options }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }, []);

  // Auto-generate barcode for a single product
  const generateBarcodeForProduct = useCallback(async (productId: string) => {
    return await fetchData({
      endpoint: `/products/${productId}/barcode/generate`,
      method: 'POST',
      successMessage: 'Barcode generated',
    });
  }, [fetchData]);

  // Open barcode labels PDF in new tab for browser printing
  const openBarcodeLabelsForPrint = useCallback(async (
    items: { productId: string; quantity?: number }[],
    options?: {
      width?: number;
      height?: number;
      columns?: number;
      barcodeType?: string;
      labelMode?: 'barcode-only' | 'label-only' | 'label-with-barcode' | 'label-with-qr' | 'label-with-both' | 'label-with-barcode-styled';
      pageSize?: 'A4' | 'A5' | 'letter' | 'custom';
      showProductName?: boolean;
      showPrice?: boolean;
      showProductCode?: boolean;
      showBrand?: boolean;
      showWooCommerceId?: boolean;
      labelSpacing?: number;
    }
  ): Promise<boolean> => {
    const token = (await import('../utils/tokenStorage')).getAccessToken();
    const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';
    const res = await fetch(`${BASE_URL}/products/barcode/print-labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ items, options }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    // Revoke after the tab has had time to load
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return !!win;
  }, []);

  // Bulk auto-generate barcodes for all products without one
  const generateBarcodesForAll = useCallback(async () => {
    return await fetchData({
      endpoint: '/products/barcode/generate-all',
      method: 'POST',
      successMessage: 'Barcodes generated for all products',
    });
  }, [fetchData]);

  /**
   * Upload up to 5 image files to the backend (which compresses to WebP via sharp
   * and stores on ImageKit). Returns the CDN URLs of the uploaded images.
   */
  const uploadProductImages = useCallback(async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    const token = (await import('../utils/tokenStorage')).getAccessToken();
    const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    const res = await fetch(`${BASE_URL}/products/upload-images`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message ?? 'Image upload failed');
    }
    const json = await res.json();
    return (json.data as { url: string }[]).map(d => d.url);
  }, []);

  return {
    // State
    products: data?.data as Product[] | undefined,
    product: data?.data as Product | undefined,
    stats: data?.data as ProductStats | undefined,
    loading,
    error,
    
    // Methods
    getAllProducts,
    getProductById,
    getLowStockProducts,
    getProductStats,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkPriceUpdate,
    transferProduct,
    bulkTransferProducts,
    adjustProductStock,
    bulkUploadProducts,
    exportProducts,
    getStockMovements,
    getProductVariants,
    getBarcodeImage,
    getQRCodeImage,
    printBarcodeLabels,
    openBarcodeLabelsForPrint,
    generateBarcodeForProduct,
    generateBarcodesForAll,
    uploadProductImages,
    reset,
  };
};

export default useProduct;
