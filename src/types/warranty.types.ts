export const WarrantyType = {
  MANUFACTURER : 'manufacturer',
  EXTENDED : 'extended',
  SHOP : 'shop',
}

export type WarrantyType = (typeof WarrantyType)[keyof typeof WarrantyType];

export const WarrantyStatus = {
  ACTIVE : 'active',
  EXPIRED : 'expired',
  CLAIMED : 'claimed',
  VOIDED : 'voided',
}
export type WarrantyStatus = (typeof WarrantyStatus)[keyof typeof WarrantyStatus];

export const ClaimStatus = {
  PENDING : 'pending',
  APPROVED : 'approved',
  REJECTED : 'rejected',
  PROCESSING : 'processing',
  COMPLETED : 'completed',
}
export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export interface Warranty {
  id: string;
  warrantyNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  saleId: string;
  invoiceNumber: string;
  productId: string;
  productName: string;
  productSerialNumber?: string;
  imei?: string;
  warrantyType: WarrantyType;
  status: WarrantyStatus;
  startDate: string;
  endDate: string;
  durationMonths: number;
  coverageDetails: string;
  shopId: string;
  shopName: string;
  purchasePrice: number;
  warrantyPrice?: number; // For extended warranties
  terms: string;
  exclusions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  warrantyId: string;
  warrantyNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  issueDescription: string;
  claimDate: string;
  status: ClaimStatus;
  shopId: string;
  shopName: string;
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
  resolution?: string;
  resolutionDate?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyStats {
  totalWarranties: number;
  activeWarranties: number;
  expiredWarranties: number;
  expiringThisMonth: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalClaimCost: number;
  averageClaimCost: number;
  warrantyRevenue: number; // From extended warranties
  claimRate: number; // Percentage of warranties claimed
}

export interface CreateWarrantyDTO {
  customerId: number;
  saleId: number;
  productId: number;
  productSerialNumber?: string;
  imei?: string;
  warrantyType: WarrantyType;
  startDate: string;
  durationMonths: number;
  coverageDetails: string;
  shopId: number;
  purchasePrice: number;
  warrantyPrice?: number;
  terms: string;
  exclusions?: string;
}

export interface CreateWarrantyClaimDTO {
  warrantyId: number;
  customerId: number;
  issueDescription: string;
  shopId: number;
  estimatedCost?: number;
  notes?: string;
}

export interface UpdateWarrantyClaimDTO {
  status?: ClaimStatus;
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
  resolution?: string;
  rejectionReason?: string;
  notes?: string;
}
