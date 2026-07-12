export const SupplierStatus = {
  ACTIVE : 'active',
  INACTIVE : 'inactive',
  BLOCKED : 'blocked',
}

export type SupplierStatus = (typeof SupplierStatus)[keyof typeof SupplierStatus];

export const SupplierRating = {
  EXCELLENT : 5,
  GOOD : 4,
  AVERAGE : 3,
  POOR : 2,
  VERY_POOR : 1,
}

export interface Supplier {
  id: number;
  supplierId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  city: string;
  country: string;
  taxId?: string;
  status: SupplierStatus;
  rating: number;
  productsSupplied: string[];
  totalPurchases: number;
  totalSpent: number;
  outstandingBalance: number;
  paymentTerms: string;
  deliveryTime: string; // e.g., "7-10 days"
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  orderDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  items: PurchaseOrderItem[];
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: number;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  totalPurchaseOrders: number;
  pendingOrders: number;
  totalPurchaseValue: number;
  outstandingPayments: number;
  averageRating: number;
  topSuppliers: Array<{
    id: number;
    name: string;
    totalSpent: number;
  }>;
}
