import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    productCode: string;
    unitPrice: number;
  };
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalPrice: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: {
    id: string;
    name: string;
    supplierCode: string;
    phone: string;
  };
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentTerms?: string;
  shippingMethod?: string;
  shippingAddress?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface PurchaseOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  supplierId?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'orderNumber' | 'orderDate' | 'totalAmount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

interface PurchaseOrderStats {
  totalOrders: number;
  draftOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  totalOrderValue: number;
  totalPaidAmount: number;
  totalDueAmount: number;
}

interface CreatePurchaseOrderData {
  supplierId: string;
  orderDate?: string;
  expectedDate?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  paymentTerms?: string;
  shippingMethod?: string;
  shippingAddress?: string;
  shippingCost?: number;
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxPercent?: number;
    notes?: string;
  }[];
}

interface UpdatePurchaseOrderData extends Partial<Omit<CreatePurchaseOrderData, 'items'>> {
  id: string;
}

interface UpdateStatLKRata {
  status: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  notes?: string;
}

interface ReceiveOrderData {
  receivedDate?: string;
  items: {
    itemId: string;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    notes?: string;
  }[];
  notes?: string;
}

interface ReceiveOrderWithItemsData {
  locationId: string;
  receivedDate?: string;
  autoUpdateInventory?: boolean;
  items: {
    productId: string;
    quantityReceived: number;
    notes?: string;
  }[];
  notes?: string;
}

interface AddItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  notes?: string;
}

interface UpdateItemData extends Partial<AddItemData> {
  itemId: string;
}

export const usePurchaseOrder = () => {
  const { fetchData, loading, error, data, reset } = useFetch();
  const { user } = useAuth();
  const businessId = user?.businessId;

  // Get all purchase orders with filters
  const getAllPurchaseOrders = useCallback(async (filters?: PurchaseOrderFilters) => {
    const queryParams = new URLSearchParams();
    if (businessId) queryParams.append('businessId', businessId);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/purchaseorders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',  silent:true
    });
  }, [fetchData, businessId]);

  // Get purchase order statistics
  const getPurchaseOrderStats = useCallback(async () => {
    return await fetchData({
      endpoint: '/purchaseorders/stats',
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Get purchase order by ID
  const getPurchaseOrderById = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/purchaseorders/${id}`,
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Create purchase order
  const createPurchaseOrder = useCallback(async (orderData: CreatePurchaseOrderData) => {
    return await fetchData({
      endpoint: '/purchaseorders',
      method: 'POST',
      data: { ...orderData, businessId },
      successMessage: 'Purchase order created successfully',
    });
  }, [fetchData, businessId]);

  // Update purchase order
  const updatePurchaseOrder = useCallback(async (orderData: UpdatePurchaseOrderData) => {
    const { id, ...updateData } = orderData;
    return await fetchData({
      endpoint: `/purchaseorders/${id}`,
      method: 'PUT',
      data: { ...updateData, businessId },
      successMessage: 'Purchase order updated successfully',
    });
  }, [fetchData, businessId]);

  // Delete purchase order
  const deletePurchaseOrder = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/purchaseorders/${id}`,
      method: 'DELETE',
      successMessage: 'Purchase order deleted successfully',
    });
  }, [fetchData]);

  // Update purchase order status
  const updatePurchaseOrderStatus = useCallback(async (id: string, statLKRata: UpdateStatLKRata) => {
    return await fetchData({
      endpoint: `/purchaseorders/${id}/status`,
      method: 'PATCH',
      data: { ...statLKRata, businessId },
      successMessage: 'Purchase order status updated successfully',
    });
  }, [fetchData, businessId]);

  // Approve purchase order
  const approvePurchaseOrder = useCallback(async (id: string, notes?: string) => {
    return await fetchData({
      endpoint: `/purchaseorders/${id}/approve`,
      method: 'POST',
      data: { notes },
      successMessage: 'Purchase order approved successfully',
    });
  }, [fetchData]);

  // Submit purchase order
  const submitPurchaseOrder = useCallback(async (id: string, notes?: string) => {
    return await fetchData({
      endpoint: `/purchaseorders/${id}/submit`,
      method: 'POST',
      data: { notes },
      successMessage: 'Purchase order submitted successfully',
    });
  }, [fetchData]);

  // Receive purchase order
  const receivePurchaseOrder = useCallback(async (id: string, receiveData: ReceiveOrderData) => {
    return await fetchData({
      endpoint: `/purchaseorders/${id}/receive`,
      method: 'POST',
      data: { ...receiveData, businessId },
      successMessage: 'Purchase order received successfully',
    });
  }, [fetchData, businessId]);

  // Receive purchase order with items (auto-update inventory)
  const receivePurchaseOrderWithItems = useCallback(async (id: string, receiveData: ReceiveOrderWithItemsData) => {
    return await fetchData({
      endpoint: `/purchaseorders/${id}/receive-items`,
      method: 'POST',
      data: { ...receiveData, businessId },
      successMessage: 'Purchase order received and inventory updated successfully',
    });
  }, [fetchData, businessId]);

  // Cancel purchase order
  const cancelPurchaseOrder = useCallback(async (id: string, reason?: string) => {
    return await fetchData({
      endpoint: `/purchaseorders/${id}/cancel`,
      method: 'POST',
      data: { reason },
      successMessage: 'Purchase order cancelled successfully',
    });
  }, [fetchData]);

  // Add item to purchase order
  const addItemToPurchaseOrder = useCallback(async (id: string, itemData: AddItemData) => {
    return await fetchData({
      endpoint: `/purchaseorders/${id}/items`,
      method: 'POST',
      data: { ...itemData, businessId },
      successMessage: 'Item added to purchase order successfully',
    });
  }, [fetchData, businessId]);

  // Update purchase order item
  const updatePurchaseOrderItem = useCallback(async (orderId: string, itemData: UpdateItemData) => {
    const { itemId, ...updateData } = itemData;
    return await fetchData({
      endpoint: `/purchaseorders/${orderId}/items/${itemId}`,
      method: 'PUT',
      data: { ...updateData, businessId },
      successMessage: 'Purchase order item updated successfully',
    });
  }, [fetchData, businessId]);

  // Delete purchase order item
  const deletePurchaseOrderItem = useCallback(async (orderId: string, itemId: string) => {
    return await fetchData({
      endpoint: `/purchaseorders/${orderId}/items/${itemId}`,
      method: 'DELETE',
      successMessage: 'Purchase order item deleted successfully',
    });
  }, [fetchData]);

  // Create supplier payment
  const createSupplierPayment = useCallback(async (paymentData: {
    purchaseOrderId: string;
    supplierId: string;
    amount: number;
    paymentMethod: string;
    paymentDate?: string;
    reference?: string;
    bankName?: string;
    checkNumber?: string;
    transactionId?: string;
    notes?: string;
  }) => {
    return await fetchData({
      endpoint: '/supplier-payments',
      method: 'POST',
      data: { ...paymentData, businessId },
      successMessage: 'Supplier payment recorded successfully',
    });
  }, [fetchData, businessId]);

  // Get payments for a purchase order
  const getPurchaseOrderPayments = useCallback(async (orderId: string) => {
    return await fetchData({
      endpoint: `/purchaseorders/${orderId}/payments`,
      method: 'GET',
      silent: true,
    });
  }, [fetchData]);

  // Get all supplier payments
  const getAllSupplierPayments = useCallback(async (filters?: {
    page?: number;
    limit?: number;
    supplierId?: string;
    purchaseOrderId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/supplier-payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',
      silent: true,
    });
  }, [fetchData]);

  return {
    // State
    purchaseOrders: data?.data as PurchaseOrder[] | undefined,
    purchaseOrder: data?.data as PurchaseOrder | undefined,
    stats: data?.data as PurchaseOrderStats | undefined,
    loading,
    error,
    
    // Methods
    getAllPurchaseOrders,
    getPurchaseOrderStats,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    updatePurchaseOrderStatus,
    approvePurchaseOrder,
    submitPurchaseOrder,
    receivePurchaseOrder,
    receivePurchaseOrderWithItems,
    cancelPurchaseOrder,
    addItemToPurchaseOrder,
    updatePurchaseOrderItem,
    deletePurchaseOrderItem,
    createSupplierPayment,
    getPurchaseOrderPayments,
    getAllSupplierPayments,
    reset,
  };
};

export default usePurchaseOrder;
