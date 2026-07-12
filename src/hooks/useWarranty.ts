import { useCallback } from 'react';
import useFetch from './useFetch';

// Types based on backend API
export interface WarrantyCard {
  id: string;
  warrantyNumber: string;
  saleId: string;
  saleItemId: string;
  productId: string;
  productName: string;
  productSKU?: string;
  productCode: string;
  serialNumber?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  locationId: string;
  warrantyType: 'STANDARD' | 'EXTENDED' | 'LIMITED' | 'LIFETIME' | 'NO_WARRANTY';
  warrantyMonths: number;
  startDate: string;
  expiryDate: string;
  terms?: string;
  coverage?: string;
  exclusions?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOIDED' | 'TRANSFERRED';
  activatedAt: string;
  voidedAt?: string;
  voidReason?: string;
  isTransferred: boolean;
  transferredTo?: string;
  transferredPhone?: string;
  transferredDate?: string;
  transferNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  warrantyCardId: string;
  warrantyCard?: WarrantyCard;
  claimDate: string;
  issueDescription: string;
  issueType: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  resolutionType?: 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'STORE_CREDIT' | 'REJECTED';
  resolutionNotes?: string;
  resolutionDate?: string;
  jobSheetId?: string;
  replacementProductId?: string;
  submittedById?: string;
  assignedToId?: string;
  locationId: string;
  estimatedCost?: number;
  actualCost?: number;
  customerCharge?: number;
  images?: string[];
  documents?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyAnalytics {
  totalWarranties: number;
  activeWarranties: number;
  expiredWarranties: number;
  voidedWarranties: number;
  claimedWarranties: number;
  transferredWarranties: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  completedClaims: number;
  totalClaimCost: number;
  averageClaimCost: number;
  claimRate: number;
  averageResolutionTime: number;
  statusBreakdown: { status: string; count: number }[];
  claimsByType: { type: string; count: number }[];
  monthlyTrends: { month: string; warranties: number; claims: number }[];
}

export interface ProductWarrantyAnalytics {
  productId: string;
  productName: string;
  totalWarranties: number;
  activeClaims: number;
  completedClaims: number;
  failureRate: number;
  averageClaimCost: number;
  totalClaimCost: number;
  commonIssues: { issue: string; count: number }[];
}

export interface CreateWarrantyCardDTO {
  saleId: string;
  saleItemId: string;
  productId: string;
  customerId?: string;
  locationId: string;
  warrantyType: 'STANDARD' | 'EXTENDED' | 'LIMITED' | 'LIFETIME' | 'NO_WARRANTY';
  warrantyMonths: number;
  serialNumber?: string;
  terms?: string;
  coverage?: string;
  exclusions?: string;
  notes?: string;
}

export interface CreateWarrantyClaimDTO {
  warrantyCardId: string;
  issueDescription: string;
  issueType: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  locationId: string;
  estimatedCost?: number;
  images?: string[];
  notes?: string;
}

export interface WarrantyQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  locationId?: string;
  customerId?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
  expiringInDays?: number;
}

export interface ClaimQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  locationId?: string;
  warrantyCardId?: string;
  startDate?: string;
  endDate?: string;
}

const useWarranty = () => {
  const warrantyFetch = useFetch('/warranty-cards');
  const claimFetch = useFetch('/warranty-claims');
  const analyticsFetch = useFetch('/warranty-cards/analytics');

  // ============================================
  // WARRANTY CARD OPERATIONS
  // ============================================

  const getWarrantyCards = useCallback(
    async (params?: WarrantyQueryParams) => {
      return warrantyFetch.fetchData({
        endpoint: '/warranty-cards',
        method: 'GET', silent:true,
        config: { params },
      });
    },
    [warrantyFetch]
  );

  const getWarrantyCardById = useCallback(
    async (id: string) => {
      return warrantyFetch.fetchData({
        endpoint: `/warranty-cards/${id}`,
        method: 'GET', silent:true,
      });
    },
    [warrantyFetch]
  );

  const searchWarrantyByIdentifier = useCallback(
    async (identifier: string) => {
      return warrantyFetch.fetchData({
        endpoint: `/warranty-cards/search/${identifier}`,
        method: 'GET', silent:true,
      });
    },
    [warrantyFetch]
  );

  const getCustomerWarranties = useCallback(
    async (customerId: string) => {
      return warrantyFetch.fetchData({
        endpoint: `/warranty-cards/customer/${customerId}`,
        method: 'GET', silent:true,
      });
    },
    [warrantyFetch]
  );

  const getExpiringWarranties = useCallback(
    async (days = 30, locationId?: string) => {
      return warrantyFetch.fetchData({
        endpoint: '/warranty-cards/expiring',
        method: 'GET', silent:true,
        config: {
          params: {
            days,
            ...(locationId ? { locationId } : {}),
          },
        },
      });
    },
    [warrantyFetch]
  );

  const createWarrantyCard = useCallback(
    async (data: CreateWarrantyCardDTO) => {
      return warrantyFetch.fetchData({
        endpoint: '/warranty-cards/generate',
        method: 'POST',
        data,
      });
    },
    [warrantyFetch]
  );

  const transferWarranty = useCallback(
    async (id: string, data: {
      transferredTo: string;
      transferredPhone: string;
      transferNotes?: string;
    }) => {
      return warrantyFetch.fetchData({
        endpoint: `/warranty-cards/${id}/transfer`,
        method: 'PUT',
        data,
      });
    },
    [warrantyFetch]
  );

  const voidWarranty = useCallback(
    async (id: string, reason: string) => {
      return warrantyFetch.fetchData({
        endpoint: `/warranty-cards/${id}/void`,
        method: 'PUT',
        data: { voidReason: reason },
      });
    },
    [warrantyFetch]
  );

  const updateWarrantyCard = useCallback(
    async (
      id: string,
      data: {
        warrantyType?: WarrantyCard['warrantyType'];
        warrantyMonths?: number;
        coverage?: string;
        terms?: string;
        exclusions?: string;
        notes?: string;
      }
    ) => {
      return warrantyFetch.fetchData({
        endpoint: `/warranty-cards/${id}`,
        method: 'PUT',
        data,
      });
    },
    [warrantyFetch]
  );

  // ============================================
  // WARRANTY CLAIM OPERATIONS
  // ============================================

  const getWarrantyClaims = useCallback(
    async (params?: ClaimQueryParams) => {
      return claimFetch.fetchData({
        endpoint: '/warranty-claims',
        method: 'GET', silent:true,
        config: { params },
      });
    },
    [claimFetch]
  );

  const getClaimById = useCallback(
    async (id: string) => {
      return claimFetch.fetchData({
        endpoint: `/warranty-claims/${id}`,
        method: 'GET', silent:true,
      });
    },
    [claimFetch]
  );

  const createClaim = useCallback(
    async (data: CreateWarrantyClaimDTO) => {
      return claimFetch.fetchData({
        endpoint: '/warranty-claims',
        method: 'POST',
        data,
      });
    },
    [claimFetch]
  );

  const updateClaimStatus = useCallback(
    async (id: string, status: string, notes?: string) => {
      return claimFetch.fetchData({
        endpoint: `/warranty-claims/${id}/status`,
        method: 'PUT',
        data: { status, notes },
      });
    },
    [claimFetch]
  );

  const resolveClaim = useCallback(
    async (id: string, data: {
      resolutionType: 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'STORE_CREDIT' | 'REJECTED';
      resolutionNotes?: string;
      actualCost?: number;
      customerCharge?: number;
      replacementProductId?: string;
      jobSheetId?: string;
    }) => {
      return claimFetch.fetchData({
        endpoint: `/warranty-claims/${id}/resolve`,
        method: 'PUT',
        data,
      });
    },
    [claimFetch]
  );

  const assignClaim = useCallback(
    async (id: string, assignedToId: string) => {
      return claimFetch.fetchData({
        endpoint: `/warranty-claims/${id}/assign`,
        method: 'PUT',
        data: { assignedToId },
      });
    },
    [claimFetch]
  );

  // ============================================
  // ANALYTICS
  // ============================================

  const getWarrantyAnalytics = useCallback(
    async (params?: { locationId?: string; startDate?: string; endDate?: string }) => {
      return analyticsFetch.fetchData({
        endpoint: '/warranty-cards/analytics/overview',
        method: 'GET', silent:true,
        config: { params },
      });
    },
    [analyticsFetch]
  );

  const getProductAnalytics = useCallback(
    async (productId: string, params?: { startDate?: string; endDate?: string }) => {
      return analyticsFetch.fetchData({
        endpoint: `/warranty-cards/analytics/product/${productId}`,
        method: 'GET', silent:true,
        config: { params },
      });
    },
    [analyticsFetch]
  );
  /**
   * Download Warranty Card as PDF
   */
  const downloadWarrantyCard = useCallback(
    async (warrantyId: string, options: { includeTerms?: boolean; includeConditions?: boolean } = {}) => {
      try {
        const queryParams = new URLSearchParams({
          format: 'pdf',
          includeTerms: (options.includeTerms ?? true).toString(),
          includeConditions: (options.includeConditions ?? true).toString(),
        });

        const result = await warrantyFetch.fetchData({
          method: 'GET',
          endpoint: `/warranty-cards/${warrantyId}/download?${queryParams}`,
          responseType: 'blob',
          silent: true,
        });

        if (!result || !(result instanceof Blob)) {
          throw new Error('Failed to download warranty card');
        }

        const blob = result as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `warranty_card_${warrantyId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading warranty card:', error);
        throw error;
      }
    },
    [warrantyFetch]
  );

  /**
   * Print Warranty Card
   */
  const printWarrantyCard = useCallback(
    async (warrantyId: string, options: { copies?: number; includeTerms?: boolean; includeConditions?: boolean } = {}) => {
      try {
        const queryParams = new URLSearchParams({
          copies: (options.copies ?? 1).toString(),
          includeTerms: (options.includeTerms ?? true).toString(),
          includeConditions: (options.includeConditions ?? true).toString(),
        });

        const result = await warrantyFetch.fetchData({
          method: 'GET',
          endpoint: `/warranty-cards/${warrantyId}/print?${queryParams}`,
          responseType: 'blob',
          silent: true,
        });

        if (!result || !(result instanceof Blob)) {
          throw new Error('Failed to generate warranty card for printing');
        }

        const blob = result as Blob;
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          // Fallback: download the file if popup is blocked
          const link = document.createElement('a');
          link.href = url;
          link.download = `warranty_card_${warrantyId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        // Clean up the URL object after a delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
      } catch (error) {
        console.error('Error printing warranty card:', error);
        throw error;
      }
    },
    [warrantyFetch]
  );

  return {
    // Warranty Card Operations
    getWarrantyCards,
    getWarrantyCardById,
    searchWarrantyByIdentifier,
    getCustomerWarranties,
    getExpiringWarranties,
    createWarrantyCard,
    updateWarrantyCard,
    transferWarranty,
    voidWarranty,

    // Warranty Claim Operations
    getWarrantyClaims,
    getClaimById,
    createClaim,
    updateClaimStatus,
    resolveClaim,
    assignClaim,

    // Analytics
    getWarrantyAnalytics,
    getProductAnalytics,

    // Download & Print
    downloadWarrantyCard,
    printWarrantyCard,

    // Loading states
    loading: {
      warranties: warrantyFetch.loading,
      claims: claimFetch.loading,
      analytics: analyticsFetch.loading,
    },

    // Error states
    error: {
      warranties: warrantyFetch.error,
      claims: claimFetch.error,
      analytics: analyticsFetch.error,
    },
  };
};

export default useWarranty;
