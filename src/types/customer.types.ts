export const CustomerTier = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
} as const;

export type CustomerTier = (typeof CustomerTier)[keyof typeof CustomerTier];

export const CustomerStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
} as const;

export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus];

export interface Customer {
  id: string;
  customerId: string; // Unique customer ID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  city: string;
  postalCode?: string;
  nic?: string; // National Identity Card
  dateOfBirth?: string;
  tier: CustomerTier;
  status: CustomerStatus;
  loyaltyPoints: number;
  totalPurchases: number;
  totalSpent: number;
  registeredDate: string;
  lastPurchaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    name: string;
    address: string;
  };
}

export interface PurchaseHistory {
  id: number;
  customerId: number;
  saleId: number;
  invoiceNumber: string;
  productName: string;
  quantity: number;
  amount: number;
  purchaseDate: string;
  shopName: string;
  branchCode: string;
}

export interface TradeInDevice {
  id: number;
  customerId: number;
  deviceBrand: string;
  deviceModel: string;
  imei: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  tradeInValue: number;
  tradeInDate: string;
  usedInSaleId?: number;
  status: 'evaluated' | 'accepted' | 'used' | 'rejected';
  notes?: string;
}

export interface CustomerFeedback {
  id:string;
  customerId: number;
  customerName: string;
  rating: number; // 1-5
  feedback: string;
  category: 'product' | 'service' | 'staff' | 'overall';
  shopId?: number;
  shopName?: string;
  purchaseId?: number;
  feedbackDate: string;
  response?: string;
  respondedBy?: string;
  respondedAt?: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;

  walkin:number ;
  vip:number;
  regular:number;

 
}

export interface CreateCustomerDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  city: string;
  postalCode?: string;
  nic?: string;
  dateOfBirth?: string;
  notes?: string;
}

export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {
  tier?: CustomerTier;
  status?: CustomerStatus;
  loyaltyPoints?: number;
}
