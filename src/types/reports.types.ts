export const ReportType = {
  SALES : 'sales',
  PROFIT_LOSS : 'profit_loss',
  INVENTORY : 'inventory',
  STAFF_PERFORMANCE : 'staff_performance',
  CUSTOMER_ANALYSIS : 'customer_analysis',
  SHOP_PERFORMANCE : 'shop_performance',
  JOBSHEET : 'jobsheet',
} as const;

export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const ReportPeriod = {
  TODAY : 'today',
  WEEK : 'week',
  MONTH : 'month',
  QUARTER : 'quarter',
  YEAR : 'year',
  CUSTOM : 'custom',
} as const;

export type ReportPeriod = (typeof ReportPeriod)[keyof typeof ReportPeriod];

export const SalesView = {
  TOTAL: 'total',
  COURIER: 'courier',
  OFFLINE: 'offline',
} as const;

export type SalesView = (typeof SalesView)[keyof typeof SalesView];

export const DateBasis = {
  UPDATED: 'updated',
  ACTIVITY: 'activity',
} as const;

export type DateBasis = (typeof DateBasis)[keyof typeof DateBasis];

export interface SalesReport {
  period: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  averageOrderValue: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  topShops: Array<{
    shopName: string;
    sales: number;
    revenue: number;
  }>;
  salesByDay: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
}

export interface ProfitLossReport {
  period: string;
  totalRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: {
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    other: number;
    total: number;
  };
  netProfit: number;
  profitMargin: number;
}

export interface InventoryReport {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  excessStockItems: number;
  inventoryTurnover: number;
  fastMovingItems: Array<{
    productName: string;
    quantity: number;
    turnoverRate: number;
  }>;
  slowMovingItems: Array<{
    productName: string;
    quantity: number;
    daysInStock: number;
  }>;
}

export interface StaffPerformanceReport {
  period: string;
  topPerformers: Array<{
    staffName: string;
    totalSales: number;
    revenue: number;
    rating: number;
  }>;
  attendanceRate: number;
  averageSalesPerStaff: number;
}
