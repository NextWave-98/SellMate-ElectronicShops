export interface Sale {
  paymentReference: string;
  id: string;
  invoiceNumber: string;
  locationId: string; // Changed from shopId
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
  shopName?: string; // For backward compatibility
  branchCode?: string; // For backward compatibility
  saleChannel: 'POS' | 'ONLINE' | 'COURIER' | 'WHOLESALE';

  // Customer details
  customerId?: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;


  // Sale items
  items: SaleItem[];

  // Pricing
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;

  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount?: number;

  // Staff
  soldBy: string;
  soldByStaffId: number;

  // Status
  status: SaleStatus;

  // Metadata
  saleDate: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface SaleItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export const PaymentMethod = {
  CASH: 'cash',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  MOBILE_PAYMENT: 'mobile_payment',
  CREDIT: 'credit',
  KOKO: 'koko',
  MINTPAY: 'mintpay',
  PAYZY: 'payzy',
  COD: 'cod',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PAID: 'paid',
  PENDING: 'pending',
  PARTIAL: 'partial',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const SaleStatus = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export interface CreateSaleDTO {
  locationId: string; // Changed from shopId
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: Omit<SaleItem, 'id'>[];
  discount: number;
  paymentMethod: PaymentMethod;
  soldByStaffId: number;
  notes?: string;
}

export interface UpdateSaleDTO {
  status?: SaleStatus;
  paymentStatus?: PaymentStatus;
  notes?: string;
}

export interface SalesFilters {
  locationId?: string; // Changed from shopId
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  soldByStaffId?: number;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalDiscount: number;
  totalTax: number;

  // By payment method
  paymentMethodBreakdown: {
    cash: number;
    card: number;
    bankTransfer: number;
    mobilePayment: number;
    credit: number;
  };

  // By shop
  topShops: {
    shopId: number;
    shopName: string;
    totalSales: number;
    revenue: number;
  }[];

  // By product
  topProducts: {
    productId: number;
    productName: string;
    quantitySold: number;
    revenue: number;
  }[];

  // By staff
  topSellers: {
    staffId: number;
    staffName: string;
    totalSales: number;
    revenue: number;
  }[];

  // Trends
  dailySales: {
    date: string;
    sales: number;
    revenue: number;
  }[];

  // Status breakdown
  statusBreakdown: {
    completed: number;
    pending: number;
    cancelled: number;
    refunded: number;
  };
}

export interface SalesSummary {
  todaySales: number;
  todayRevenue: number;
  yesterdaySales: number;
  yesterdayRevenue: number;
  weekSales: number;
  weekRevenue: number;
  monthSales: number;
  monthRevenue: number;
  growthRate: number;
}
