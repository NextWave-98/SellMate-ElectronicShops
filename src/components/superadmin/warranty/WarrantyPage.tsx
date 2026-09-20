/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldPlus } from 'lucide-react';
import type { Warranty, WarrantyClaim, WarrantyStats } from '../../../types/warranty.types';
import LoadingSpinner from '../../common/LoadingSpinner';
import toast from 'react-hot-toast';
import useWarranty, { type WarrantyCard, type WarrantyClaim as APIWarrantyClaim } from '../../../hooks/useWarranty';

// Import separated components
import WarrantyStatsCards from '../../branch/warranty/WarrantyStatsCards';
import ExpiringWarrantiesAlert from '../../branch/warranty/ExpiringWarrantiesAlert';
import Pagination from '../../branch/warranty/Pagination';
import SuperAdminWarrantiesTable from './SuperAdminWarrantiesTable';
import SuperAdminClaimsTable from './SuperAdminClaimsTable';
import SuperAdminWarrantyActionsMenu from './SuperAdminWarrantyActionsMenu';
import SuperAdminClaimActionsMenu from './SuperAdminClaimActionsMenu';
import ConfirmModal from '../../common/ConfirmModal';
import { getExpiringWarrantyCount } from '../../../utils/warrantyClaimStatus';

// Import Warranty Modals
import ViewWarrantyModal from './ViewWarrantyModal';
import AddWarrantyModal from './AddWarrantyModal';
import EditWarrantyModal from './EditWarrantyModal';
import TransferWarrantyModal from './TransferWarrantyModal';
import CreateClaimModal from './CreateClaimModal';
import VoidWarrantyModal from './VoidWarrantyModal';

// Import Claim Modals
import ViewClaimModal from './ViewClaimModal';
import UpdateClaimStatusModal from './UpdateClaimStatusModal';
import AssignTechnicianModal from './AssignTechnicianModal';
import ResolveClaimModal from './ResolveClaimModal';
import CoverageSettingsPanel from './CoverageSettingsPanel';

export default function WarrantyPage() {
  const {
    getWarrantyCards,
    getWarrantyClaims,
    getWarrantyAnalytics,
    getExpiringWarranties,
    getWarrantyCardById,
    getClaimById,
    downloadWarrantyCard,
    printWarrantyCard,
  } = useWarranty();

  const getWarrantyCardsRef = useRef(getWarrantyCards);
  const getWarrantyClaimsRef = useRef(getWarrantyClaims);
  const getWarrantyAnalyticsRef = useRef(getWarrantyAnalytics);
  const getExpiringWarrantiesRef = useRef(getExpiringWarranties);
  getWarrantyCardsRef.current = getWarrantyCards;
  getWarrantyClaimsRef.current = getWarrantyClaims;
  getWarrantyAnalyticsRef.current = getWarrantyAnalytics;
  getExpiringWarrantiesRef.current = getExpiringWarranties;

  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);

  // Modal states
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyCard | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<APIWarrantyClaim | null>(null);
  const [showAddWarrantyModal, setShowAddWarrantyModal] = useState(false);
  const [showViewWarrantyModal, setShowViewWarrantyModal] = useState(false);
  const [showEditWarrantyModal, setShowEditWarrantyModal] = useState(false);
  const [showTransferWarrantyModal, setShowTransferWarrantyModal] = useState(false);
  const [showCreateClaimModal, setShowCreateClaimModal] = useState(false);
  const [showVoidWarrantyModal, setShowVoidWarrantyModal] = useState(false);
  const [showViewClaimModal, setShowViewClaimModal] = useState(false);
  const [showUpdateClaimStatusModal, setShowUpdateClaimStatusModal] = useState(false);
  const [showAssignTechnicianModal, setShowAssignTechnicianModal] = useState(false);
  const [showResolveClaimModal, setShowResolveClaimModal] = useState(false);
  const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false);

  const [stats, setStats] = useState<WarrantyStats>({
    totalWarranties: 0,
    activeWarranties: 0,
    expiredWarranties: 0,
    expiringThisMonth: 0,
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    totalClaimCost: 0,
    averageClaimCost: 0,
    warrantyRevenue: 0,
    claimRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'warranties' | 'claims' | 'settings'>('warranties');

  // Pagination states
  const [warrantyPagination, setWarrantyPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [claimPagination, setClaimPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Selection states
  const [selectedWarrantyIds, setSelectedWarrantyIds] = useState<string[]>([]);
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);

  const handleTabChange = useCallback((tab: 'warranties' | 'claims' | 'settings') => {
    setActiveTab(tab);
    setSelectedWarrantyIds([]);
    setSelectedClaimIds([]);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const warrantyResponse = await getWarrantyCardsRef.current({
        page: warrantyPagination.page,
        limit: warrantyPagination.limit,
      });
      const claimsResponse = await getWarrantyClaimsRef.current({
        page: claimPagination.page,
        limit: claimPagination.limit,
      });
      const analyticsResponse = await getWarrantyAnalyticsRef.current();
      const expiringResponse = await getExpiringWarrantiesRef.current(30);

      // Map API data to UI format
      if (warrantyResponse?.data) {
        const apiWarranties = Array.isArray(warrantyResponse.data)
          ? warrantyResponse.data
          : Array.isArray((warrantyResponse.data as { warranties?: unknown[] })?.warranties)
          ? (warrantyResponse.data as { warranties: unknown[] }).warranties
          : [];

        const mappedWarranties = apiWarranties.map((w: any) => ({
          id: w.id,
          warrantyNumber: w.warrantyNumber,
          customerId: w.customerId || '',
          customerName: w.customerName,
          customerPhone: w.customerPhone,
          saleId: w.saleId || '',
          invoiceNumber: w.invoiceNumber || '',
          productId: w.productId || '',
          productName: w.productName,
          productSerialNumber: w.productSerialNumber || '',
          imei: w.imei || '',
          warrantyType: w.warrantyType?.toLowerCase() || 'standard',
          status: w.status?.toLowerCase() || 'active',
          startDate: w.startDate?.split('T')[0] || '',
          endDate: w.expiryDate?.split('T')[0] || '',
          durationMonths: w.durationMonths || 12,
          coverageDetails: w.coverageDetails || '',
          shopId: w.shopId || '',
          shopName: w.shopName || '',
          purchasePrice: w.purchasePrice || 0,
          warrantyPrice: w.warrantyPrice || 0,
          terms: w.terms || '',
          exclusions: w.exclusions || '',
          createdAt: w.createdAt || '',
          updatedAt: w.updatedAt || '',
        }));
        setWarranties(mappedWarranties);

        // Update warranty pagination
        const warrantyData = warrantyResponse.data as unknown as { warranties?: unknown[]; pagination?: typeof warrantyPagination };
        if (warrantyData?.pagination) {
          setWarrantyPagination((prev) => {
            const next = warrantyData.pagination!;
            if (
              prev.page === next.page &&
              prev.limit === next.limit &&
              prev.total === next.total &&
              prev.totalPages === next.totalPages
            ) {
              return prev;
            }
            return next;
          });
        }
      }
      // Map claims data
      if (claimsResponse?.data) {
        const apiClaims = Array.isArray(claimsResponse.data)
          ? claimsResponse.data
          : Array.isArray((claimsResponse.data as { claims?: unknown[] })?.claims)
          ? (claimsResponse.data as { claims: unknown[] }).claims
          : [];

        const mappedClaims = apiClaims.map((c: any) => ({
          id: c.id,
          claimNumber: c.claimNumber,
          warrantyId: c.warrantyCardId,
          warrantyNumber: c.warrantyCard?.warrantyNumber || '',
          customerId: c.customerId || '',
          customerName: c.warrantyCard?.customerName || 'Unknown',
          customerPhone: c.customerPhone || '',
          productName: c.warrantyCard?.productName || 'Unknown',
          issueDescription: c.issueDescription,
          claimDate: c.claimDate?.split('T')[0] || '',
          status: c.status?.toLowerCase() || 'pending',
          shopId: c.shopId || '',
          shopName: c.shopName || '',
          assignedTo: c.assignedTo || '',
          estimatedCost: c.estimatedCost || 0,
          actualCost: c.actualCost || 0,
          resolution: c.resolution || '',
          resolutionDate: c.resolutionDate?.split('T')[0] || '',
          rejectionReason: c.rejectionReason || '',
          notes: c.notes || '',
          createdAt: c.createdAt || '',
          updatedAt: c.updatedAt || '',
        }));
        setClaims(mappedClaims);

        // Update claim pagination
        const claimData = claimsResponse.data as unknown as { claims?: unknown[]; pagination?: typeof claimPagination };
        if (claimData?.pagination) {
          setClaimPagination((prev) => {
            const next = claimData.pagination!;
            if (
              prev.page === next.page &&
              prev.limit === next.limit &&
              prev.total === next.total &&
              prev.totalPages === next.totalPages
            ) {
              return prev;
            }
            return next;
          });
        }
      }
      // Map analytics data
      if (analyticsResponse?.data) {
        const analytics = analyticsResponse.data as any;
        const expiringCount = getExpiringWarrantyCount(expiringResponse?.data);

        setStats({
          totalWarranties: analytics.totalWarranties || 0,
          activeWarranties: analytics.activeWarranties || 0,
          expiredWarranties: analytics.expiredWarranties || 0,
          expiringThisMonth: expiringCount,
          totalClaims: analytics.totalClaims || 0,
          pendingClaims: analytics.pendingClaims || 0,
          approvedClaims: analytics.approvedClaims || 0,
          rejectedClaims: analytics.rejectedClaims || 0,
          totalClaimCost: analytics.totalClaimCost || 0,
          averageClaimCost: analytics.averageClaimCost || 0,
          warrantyRevenue: 0, // Not provided by backend yet
          claimRate: analytics.claimRate || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load warranty data from API:', error);
      toast.error('Failed to load warranty data. Showing sample data.');
    } finally {
      setLoading(false);
    }
  }, [
    warrantyPagination.page,
    warrantyPagination.limit,
    claimPagination.page,
    claimPagination.limit,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleWarrantyPageChange = (page: number) => {
    setWarrantyPagination((prev) => ({ ...prev, page }));
  };

  const handleWarrantyLimitChange = (limit: number) => {
    setWarrantyPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const handleClaimPageChange = (page: number) => {
    setClaimPagination((prev) => ({ ...prev, page }));
  };

  const handleClaimLimitChange = (limit: number) => {
    setClaimPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  // Warranty action handlers
  const handleViewWarranty = async () => {
    if (selectedWarrantyIds.length !== 1) return;
    try {
      const response = await getWarrantyCardById(selectedWarrantyIds[0]);
      if (response?.data) {
        setSelectedWarranty(response.data as WarrantyCard);
        setShowViewWarrantyModal(true);
      }
    } catch {
      toast.error('Failed to load warranty details');
    }
  };

  const handleEditWarranty = async () => {
    if (selectedWarrantyIds.length !== 1) return;
    try {
      const response = await getWarrantyCardById(selectedWarrantyIds[0]);
      if (response?.data) {
        setSelectedWarranty(response.data as WarrantyCard);
        setShowEditWarrantyModal(true);
      }
    } catch {
      toast.error('Failed to load warranty details');
    }
  };

  const handleTransferWarranty = async () => {
    if (selectedWarrantyIds.length !== 1) return;
    try {
      const response = await getWarrantyCardById(selectedWarrantyIds[0]);
      if (response?.data) {
        setSelectedWarranty(response.data as WarrantyCard);
        setShowTransferWarrantyModal(true);
      }
    } catch {
      toast.error('Failed to load warranty details');
    }
  };

  const handleCreateClaim = async () => {
    if (selectedWarrantyIds.length !== 1) return;
    try {
      const response = await getWarrantyCardById(selectedWarrantyIds[0]);
      if (response?.data) {
        setSelectedWarranty(response.data as WarrantyCard);
        setShowCreateClaimModal(true);
      }
    } catch {
      toast.error('Failed to load warranty details');
    }
  };

  const handleDownloadPDF = async () => {
    if (selectedWarrantyIds.length !== 1) return;
    try {
      await downloadWarrantyCard(selectedWarrantyIds[0], { includeTerms: true, includeConditions: true });
      toast.success('Warranty card download started');
    } catch (error) {
      toast.error('Failed to download warranty card');
      console.error('Download error:', error);
    }
  };

  const handlePrintCard = async () => {
    if (selectedWarrantyIds.length !== 1) return;
    try {
      await printWarrantyCard(selectedWarrantyIds[0], { copies: 1, includeTerms: true, includeConditions: true });
      toast.success('Warranty card opened for printing');
    } catch (error) {
      toast.error('Failed to print warranty card');
      console.error('Print error:', error);
    }
  };

  const handleVoidWarranty = async () => {
    if (selectedWarrantyIds.length !== 1) return;
    try {
      const response = await getWarrantyCardById(selectedWarrantyIds[0]);
      if (response?.data) {
        setSelectedWarranty(response.data as WarrantyCard);
        setShowVoidWarrantyModal(true);
      }
    } catch {
      toast.error('Failed to load warranty details');
    }
  };

  // Claim action handlers
  const handleViewClaim = async () => {
    if (selectedClaimIds.length !== 1) return;
    try {
      const response = await getClaimById(selectedClaimIds[0]);
      if (response?.data) {
        setSelectedClaim(response.data as APIWarrantyClaim);
        setShowViewClaimModal(true);
      }
    } catch {
      toast.error('Failed to load claim details');
    }
  };

  const handleUpdateClaimStatus = async () => {
    if (selectedClaimIds.length !== 1) return;
    try {
      const response = await getClaimById(selectedClaimIds[0]);
      if (response?.data) {
        setSelectedClaim(response.data as APIWarrantyClaim);
        setShowUpdateClaimStatusModal(true);
      }
    } catch {
      toast.error('Failed to load claim details');
    }
  };

  const handleAssignTechnician = async () => {
    if (selectedClaimIds.length !== 1) return;
    try {
      const response = await getClaimById(selectedClaimIds[0]);
      if (response?.data) {
        setSelectedClaim(response.data as APIWarrantyClaim);
        setShowAssignTechnicianModal(true);
      }
    } catch {
      toast.error('Failed to load claim details');
    }
  };

  const handleResolveClaim = async () => {
    if (selectedClaimIds.length !== 1) return;
    try {
      const response = await getClaimById(selectedClaimIds[0]);
      if (response?.data) {
        setSelectedClaim(response.data as APIWarrantyClaim);
        setShowResolveClaimModal(true);
      }
    } catch {
      toast.error('Failed to load claim details');
    }
  };

  const handleRejectClaim = async () => {
    if (selectedClaimIds.length !== 1) return;
    try {
      const response = await getClaimById(selectedClaimIds[0]);
      if (response?.data) {
        setSelectedClaim(response.data as APIWarrantyClaim);
        setShowRejectConfirmModal(true);
      }
    } catch {
      toast.error('Failed to load claim details');
    }
  };

  const confirmRejectClaim = () => {
    if (selectedClaim) {
      setShowUpdateClaimStatusModal(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warranty Management</h1>
          <p className="text-gray-600 mt-1">Track warranties and manage warranty claims</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddWarrantyModal(true)}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            <ShieldPlus className="w-4 h-4 mr-2" />
            Add Warranty
          </button>
        </div>
      </div>

      {/* Expiring Warranties Alert */}
      <ExpiringWarrantiesAlert count={stats.expiringThisMonth} />

      {/* Stats Cards */}
      <WarrantyStatsCards stats={stats} />

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleTabChange('warranties')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'warranties'
                  ? 'border-b-2 border-orange-400 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Warranties ({warrantyPagination.total})
            </button>
            <button
              onClick={() => handleTabChange('claims')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'claims'
                  ? 'border-b-2 border-orange-400 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Claims ({claimPagination.total})
            </button>
            <button
              onClick={() => handleTabChange('settings')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'settings'
                  ? 'border-b-2 border-orange-400 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Coverage Settings
            </button>
          </nav>
        </div>

        {activeTab === 'warranties' && (
          <SuperAdminWarrantyActionsMenu
            selectedCount={selectedWarrantyIds.length}
            onViewWarranty={handleViewWarranty}
            onEditWarranty={handleEditWarranty}
            onTransferWarranty={handleTransferWarranty}
            onCreateClaim={handleCreateClaim}
            onDownloadPDF={handleDownloadPDF}
            onPrintCard={handlePrintCard}
            onVoidWarranty={handleVoidWarranty}
            onClearSelection={() => setSelectedWarrantyIds([])}
          />
        )}

        {activeTab === 'claims' && (
          <SuperAdminClaimActionsMenu
            selectedCount={selectedClaimIds.length}
            onViewClaim={handleViewClaim}
            onUpdateStatus={handleUpdateClaimStatus}
            onAssignTechnician={handleAssignTechnician}
            onResolveClaim={handleResolveClaim}
            onRejectClaim={handleRejectClaim}
            onClearSelection={() => setSelectedClaimIds([])}
          />
        )}

        {activeTab === 'settings' && <CoverageSettingsPanel />}

        {activeTab !== 'settings' && (
        <div className="p-6">
          {activeTab === 'warranties' ? (
            <div>
              <SuperAdminWarrantiesTable
                warranties={warranties}
                selectedIds={selectedWarrantyIds}
                onSelectionChange={setSelectedWarrantyIds}
              />

              {/* Warranty Pagination */}
              <Pagination
                currentPage={warrantyPagination.page}
                totalPages={warrantyPagination.totalPages}
                limit={warrantyPagination.limit}
                onPageChange={handleWarrantyPageChange}
                onLimitChange={handleWarrantyLimitChange}
              />
            </div>
          ) : (
            <div>
              <SuperAdminClaimsTable
                claims={claims}
                selectedIds={selectedClaimIds}
                onSelectionChange={setSelectedClaimIds}
              />

              {/* Claim Pagination */}
              <Pagination
                currentPage={claimPagination.page}
                totalPages={claimPagination.totalPages}
                limit={claimPagination.limit}
                onPageChange={handleClaimPageChange}
                onLimitChange={handleClaimLimitChange}
              />
            </div>
          )}
        </div>
        )}
      </div>

      {/* Warranty Modals */}
      {showAddWarrantyModal && (
        <AddWarrantyModal
          isOpen={showAddWarrantyModal}
          onClose={() => setShowAddWarrantyModal(false)}
          onCreated={handleRefresh}
        />
      )}
      {showViewWarrantyModal && selectedWarranty && (
        <ViewWarrantyModal
          isOpen={showViewWarrantyModal}
          onClose={() => setShowViewWarrantyModal(false)}
          warranty={selectedWarranty}
        />
      )}
      {showEditWarrantyModal && selectedWarranty && (
        <EditWarrantyModal
          isOpen={showEditWarrantyModal}
          onClose={() => setShowEditWarrantyModal(false)}
          warranty={selectedWarranty}
          onSuccess={() => {
            setShowEditWarrantyModal(false);
            loadData();
          }}
        />
      )}
      {showTransferWarrantyModal && selectedWarranty && (
        <TransferWarrantyModal
          isOpen={showTransferWarrantyModal}
          onClose={() => setShowTransferWarrantyModal(false)}
          warranty={selectedWarranty}
          onSuccess={() => {
            setShowTransferWarrantyModal(false);
            loadData();
          }}
        />
      )}
      {showCreateClaimModal && selectedWarranty && (
        <CreateClaimModal
          isOpen={showCreateClaimModal}
          onClose={() => setShowCreateClaimModal(false)}
          warranty={selectedWarranty}
          onSuccess={() => {
            setShowCreateClaimModal(false);
            loadData();
          }}
        />
      )}
      {showVoidWarrantyModal && selectedWarranty && (
        <VoidWarrantyModal
          isOpen={showVoidWarrantyModal}
          onClose={() => setShowVoidWarrantyModal(false)}
          warranty={selectedWarranty}
          onSuccess={() => {
            setShowVoidWarrantyModal(false);
            loadData();
          }}
        />
      )}

      {/* Claim Modals */}
      {showViewClaimModal && selectedClaim && (
        <ViewClaimModal
          isOpen={showViewClaimModal}
          onClose={() => setShowViewClaimModal(false)}
          claim={selectedClaim}
        />
      )}
      {showUpdateClaimStatusModal && selectedClaim && (
        <UpdateClaimStatusModal
          isOpen={showUpdateClaimStatusModal}
          onClose={() => setShowUpdateClaimStatusModal(false)}
          claim={selectedClaim}
          onSuccess={() => {
            setShowUpdateClaimStatusModal(false);
            loadData();
          }}
        />
      )}
      {showAssignTechnicianModal && selectedClaim && (
        <AssignTechnicianModal
          isOpen={showAssignTechnicianModal}
          onClose={() => setShowAssignTechnicianModal(false)}
          claim={selectedClaim}
          onSuccess={() => {
            setShowAssignTechnicianModal(false);
            loadData();
          }}
        />
      )}
      {showResolveClaimModal && selectedClaim && (
        <ResolveClaimModal
          isOpen={showResolveClaimModal}
          onClose={() => setShowResolveClaimModal(false)}
          claim={selectedClaim}
          onSuccess={() => {
            setShowResolveClaimModal(false);
            loadData();
          }}
        />
      )}

      {/* Confirm Reject Modal */}
      <ConfirmModal
        isOpen={showRejectConfirmModal}
        onClose={() => setShowRejectConfirmModal(false)}
        onConfirm={confirmRejectClaim}
        title="Reject Claim"
        message="Are you sure you want to reject this claim? This action will update the claim status to rejected."
        confirmText="Reject"
        cancelText="Cancel"
      />
    </div>
  );
}
