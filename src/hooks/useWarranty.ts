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
  warrantyType: 'STANDARD' | 'EXTENDED' | 'LIMITED' | 'LIFETIME' | 'SERVICE' | 'NO_WARRANTY';
  warrantyMonths: number;
  startDate: string;
  expiryDate: string;
  terms?: string;
  coverage?: string;
  exclusions?: string;
  // Provider / DOA / claim-limit   copied from the product at issue time,
  // never re-derived from the product's current settings (see the coverage
  // service's own notes: a later product edit must not rewrite a card
  // already in a customer's hand).
  warrantyProvider?: 'SHOP' | 'MANUFACTURER' | 'SUPPLIER' | 'THIRD_PARTY' | null;
  doaDays?: number | null;
  doaAction?: 'REPLACE' | 'REFUND' | 'REPAIR' | null;
  claimLimit?: number | null;
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
  warrantyType: 'STANDARD' | 'EXTENDED' | 'LIMITED' | 'LIFETIME' | 'SERVICE' | 'NO_WARRANTY';
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

// ============================================
// WARRANTY COVERAGE (provider / DOA / claim limit / coverage vocabulary)
// ============================================

export interface WarrantyCoverageItem {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductCoverageEntry extends WarrantyCoverageItem {
  stance: 'INCLUDED' | 'EXCLUDED';
}

export interface CardCoverageEntry {
  itemName: string;
  stance: 'INCLUDED' | 'EXCLUDED';
  coverageItemId: string | null;
}

export interface ClaimEligibility {
  warrantyCardId: string;
  warrantyNumber: string;
  productName: string;
  status: string;
  expired: boolean;
  expiryDate: string | null;
  provider: 'SHOP' | 'MANUFACTURER' | 'SUPPLIER' | 'THIRD_PARTY' | null;
  covered: string[];
  excluded: string[];
  coverageText: string | null;
  exclusionsText: string | null;
  doa: {
    days: number | null;
    action: 'REPLACE' | 'REFUND' | 'REPAIR' | null;
    withinWindow: boolean;
    daysRemaining: number | null;
  };
  claims: {
    used: number;
    limit: number | null;
    remaining: number | null;
    limitReached: boolean;
  };
  summary: string;
}

const useWarranty = () => {
  const warrantyFetch = useFetch('/warranty-cards');
  const claimFetch = useFetch('/warranty-claims');
  const analyticsFetch = useFetch('/warranty-cards/analytics');
  const coverageFetch = useFetch('/coverage-items');

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

  /**
   * Sale lines that could still be given a warranty card.
   *
   * A warranty card always belongs to the sale line that produced it, so adding
   * one by hand means picking a line that has not got one yet rather than
   * inventing a card from nothing. This feeds that picker.
   */
  const getWarrantableSaleItems = useCallback(
    async (params?: { search?: string; locationId?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.locationId) qs.set('locationId', params.locationId);
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return warrantyFetch.fetchData({
        endpoint: `/warranty-cards/warrantable-sale-items${query ? `?${query}` : ''}`,
        method: 'GET',
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

  // ============================================
  // WARRANTY COVERAGE OPERATIONS
  // ============================================

  /** This organization's coverage vocabulary. Empty until it is filled in. */
  const getCoverageItems = useCallback(
    async (includeInactive = false) => {
      return coverageFetch.fetchData({
        endpoint: `/coverage-items${includeInactive ? '?includeInactive=true' : ''}`,
        method: 'GET', silent: true, noRedirect: true,
      });
    },
    [coverageFetch]
  );

  const createCoverageItem = useCallback(
    async (data: { name: string; description?: string; sortOrder?: number }) => {
      return coverageFetch.fetchData({
        endpoint: '/coverage-items',
        method: 'POST',
        data,
      });
    },
    [coverageFetch]
  );

  const updateCoverageItem = useCallback(
    async (
      id: string,
      data: Partial<{ name: string; description: string; sortOrder: number; isActive: boolean }>
    ) => {
      return coverageFetch.fetchData({
        endpoint: `/coverage-items/${id}`,
        method: 'PUT',
        data,
      });
    },
    [coverageFetch]
  );

  const deleteCoverageItem = useCallback(
    async (id: string) => {
      return coverageFetch.fetchData({
        endpoint: `/coverage-items/${id}`,
        method: 'DELETE',
      });
    },
    [coverageFetch]
  );

  /** Fill an empty list with a starting vocabulary for this organization's industry. */
  const seedCoverageItems = useCallback(
    async () => {
      return coverageFetch.fetchData({
        endpoint: '/coverage-items/seed',
        method: 'POST',
      });
    },
    [coverageFetch]
  );

  /** The template: what a card issued for this product will cover. */
  const getProductCoverage = useCallback(
    async (productId: string) => {
      return coverageFetch.fetchData({
        endpoint: `/products/${productId}/coverage`,
        method: 'GET', silent: true, noRedirect: true,
      });
    },
    [coverageFetch]
  );

  /** Replace a product's coverage template with exactly this set. */
  const setProductCoverage = useCallback(
    async (productId: string, items: Array<{ coverageItemId: string; stance: 'INCLUDED' | 'EXCLUDED' }>) => {
      return coverageFetch.fetchData({
        endpoint: `/products/${productId}/coverage`,
        method: 'PUT',
        data: { items },
        silent: true,
      });
    },
    [coverageFetch]
  );

  /** What THIS card covers   the snapshot taken when it was issued. */
  const getCardCoverage = useCallback(
    async (warrantyCardId: string) => {
      return coverageFetch.fetchData({
        endpoint: `/warranty-cards/${warrantyCardId}/coverage`,
        method: 'GET', silent: true, noRedirect: true,
      });
    },
    [coverageFetch]
  );

  /**
   * Should this claim be honoured? Advisory only   it answers, it never
   * refuses. Optional asOf (YYYY-MM-DD) to ask about a date other than today.
   */
  const getClaimEligibility = useCallback(
    async (warrantyCardId: string, asOf?: string) => {
      return coverageFetch.fetchData({
        endpoint: `/warranty-cards/${warrantyCardId}/eligibility${asOf ? `?asOf=${asOf}` : ''}`,
        method: 'GET', silent: true, noRedirect: true,
      });
    },
    [coverageFetch]
  );

  return {
    // Warranty Card Operations
    getWarrantyCards,
    getWarrantyCardById,
    searchWarrantyByIdentifier,
    getCustomerWarranties,
    getExpiringWarranties,
    getWarrantableSaleItems,
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

    // Warranty Coverage Operations
    getCoverageItems,
    createCoverageItem,
    updateCoverageItem,
    deleteCoverageItem,
    seedCoverageItems,
    getProductCoverage,
    setProductCoverage,
    getCardCoverage,
    getClaimEligibility,

    // Loading states
    loading: {
      warranties: warrantyFetch.loading,
      claims: claimFetch.loading,
      analytics: analyticsFetch.loading,
      coverage: coverageFetch.loading,
    },

    // Error states
    error: {
      warranties: warrantyFetch.error,
      claims: claimFetch.error,
      analytics: analyticsFetch.error,
      coverage: coverageFetch.error,
    },
  };
};

export default useWarranty;
