/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import useProductReturn from '../../hooks/useProductReturn.ts';
import useCustomer from '../../hooks/useCustomer.ts';
import type {
  ProductReturn,
  CreateProductReturnData,
  InspectReturnData,
  ApproveReturnData,
  RejectReturnData,
  ProcessReturnData,
  ProductReturnStats
} from '../../hooks/useProductReturn.ts';
import { Plus, RefreshCw, Loader2, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import ProductReturnFilters from '../../components/branch/returns/ProductReturnFilters.tsx';
import type { ProductReturnStatus, ProductReturnCategory, ProductReturnSourceType } from '../../components/branch/returns/ProductReturnFilters.tsx';
import ProductReturnTable from '../../components/branch/returns/ProductReturnTable.tsx';
import ProductReturnStatsCards from '../../components/branch/returns/ProductReturnStatsCards.tsx';
import CreateReturnModal from '../../components/branch/returns/CreateReturnModal.tsx';
import BulkScanReturnModal from '../../components/branch/returns/BulkScanReturnModal.tsx';
import InspectReturnModal from '../../components/branch/returns/InspectReturnModal.tsx';
import ApproveReturnModal from '../../components/branch/returns/ApproveReturnModal.tsx';
import RejectReturnModal from '../../components/branch/returns/RejectReturnModal.tsx';
import ProcessReturnModal from '../../components/branch/returns/ProcessReturnModal.tsx';
import ViewReturnModal from '../../components/branch/returns/ViewReturnModal.tsx';

export default function SuperadminReturnsPage() {
  const { user } = useAuth();
  const { searchCustomers } = useCustomer();
  const {
    getReturns,
    createReturn,
    inspectReturn,
    approveReturn,
    rejectReturn,
    processReturn,
    getReturnStats
  } = useProductReturn();

  // Data states
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<ProductReturn[]>([]);
  const [stats, setStats] = useState<ProductReturnStats>({
    totalReturns: 0,
    pendingReturns: 0,
    approvedReturns: 0,
    rejectedReturns: 0,
    completedReturns: 0,
    totalValue: 0,
    totalRefunded: 0,
    averageProcessingTime: 0,
    returnsByCategory: {},
    returnsByReason: {},
    returnsByStatus: {},
  });

  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [showCreateReturn, setShowCreateReturn] = useState(false);
  const [showBulkReturn, setShowBulkReturn] = useState(false);
  const [showViewReturn, setShowViewReturn] = useState(false);
  const [showInspectReturn, setShowInspectReturn] = useState(false);
  const [showApproveReturn, setShowApproveReturn] = useState(false);
  const [showRejectReturn, setShowRejectReturn] = useState(false);
  const [showProcessReturn, setShowProcessReturn] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProductReturnStatus | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<ProductReturnCategory | ''>('');
  const [selectedSourceType, setSelectedSourceType] = useState<ProductReturnSourceType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Apply filters whenever data or filter states change
  const applyFilters = useCallback(() => {
    let filtered = [...returns];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(ret =>
        ret.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ret.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ret.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ret.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ret.productCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(ret => ret.status === selectedStatus);
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(ret => ret.returnCategory === selectedCategory);
    }

    // Source type filter
    if (selectedSourceType) {
      filtered = filtered.filter(ret => ret.sourceType === selectedSourceType);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(ret => new Date(ret.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(ret => new Date(ret.createdAt) <= end);
    }

    setFilteredReturns(filtered);
  }, [returns, searchQuery, selectedStatus, selectedCategory, selectedSourceType, startDate, endDate]);

  // Load stats from API
  const loadStats = useCallback(async () => {
    try {
      const response = await getReturnStats(user?.locationId);
      if (response?.data) {
        const statsData = response.data;
        setStats({
          totalReturns: statsData.total ?? 0,
          pendingReturns: 0, // Not provided in new API, set to 0
          approvedReturns: statsData.byStatus?.APPROVED ?? 0,
          rejectedReturns: statsData.byStatus?.REJECTED ?? 0,
          completedReturns: statsData.byStatus?.COMPLETED ?? 0,
          totalValue: statsData.totalValue ?? 0,
          totalRefunded: statsData.totalRefundAmount ?? 0,
          averageProcessingTime: 0, // Not provided in new API, set to 0
          returnsByCategory: statsData.byCategory ?? {},
          returnsByReason: {}, // Not provided in new API, set to empty
          returnsByStatus: statsData.byStatus ?? {},
        });
      }
    } catch (err) {
      console.error('Failed to load return stats:', err);
    }
  }, [getReturnStats, user?.locationId]);

  const loadReturns = useCallback(async (page = pagination.page, limit = pagination.limit) => {
    try {
      setLoadingData(true);
      const params = {
        page,
        limit,
        status: selectedStatus || undefined,
        returnCategory: selectedCategory || undefined,
        sourceType: selectedSourceType || undefined,
        search: searchQuery || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const response = await getReturns(params);

      if (response?.data) {
        const responseData = response.data as {
          data?: ProductReturn[];
          returns?: ProductReturn[];
          pagination?: { totalPages: number; total: number; page: number; limit: number }
        } | ProductReturn[];

        const data = Array.isArray(responseData)
          ? responseData
          : (responseData as { returns?: ProductReturn[] }).returns ||
            (responseData as { data?: ProductReturn[] }).data || [];

        setReturns(data);

        // Handle pagination if present
        const paginationData = (responseData as { pagination?: { totalPages: number; total: number; page: number; limit: number } }).pagination;
        if (paginationData) {
          setPagination({
            page: paginationData.page || page,
            limit: paginationData.limit || limit,
            total: paginationData.total || data.length,
            totalPages: paginationData.totalPages || 1,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load returns:', err);
      toast.error('Failed to load returns');
    } finally {
      setLoadingData(false);
    }
  }, [pagination.page, pagination.limit, getReturns, selectedStatus, selectedCategory, selectedSourceType, searchQuery, startDate, endDate]);

  // Load data on mount
  useEffect(() => {
    loadReturns();
  }, []);

  // Load stats when component mounts
  useEffect(() => {
    loadStats();
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReturns();
    await loadStats();
    setRefreshing(false);
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const handleCreateReturn = async (data: CreateProductReturnData) => {
    if (!user?.id) {
      toast.error('User ID not found');
      return;
    }

    try {
      const result = await createReturn({
        ...data,
        createdById: user.id,
      });

      if(result?.success === true) {
        setShowCreateReturn(false);
        await loadReturns();
      }
     
    } catch (err) {
      console.error('Failed to create return:', err);
      toast.error('Failed to create return');
    }
  };

  const handleViewReturn = (returnItem: ProductReturn) => {
    setSelectedReturn(returnItem);
    setShowViewReturn(true);
  };

  const handleInspectReturn = (returnItem: ProductReturn) => {
    setSelectedReturn(returnItem);
    setShowInspectReturn(true);
  };

  const handleApproveReturn = (returnItem: ProductReturn) => {
    setSelectedReturn(returnItem);
    setShowApproveReturn(true);
  };

  const handleRejectReturn = (returnItem: ProductReturn) => {
    setSelectedReturn(returnItem);
    setShowRejectReturn(true);
  };

  const handleProcessReturn = (returnItem: ProductReturn) => {
    setSelectedReturn(returnItem);
    setShowProcessReturn(true);
  };

  const handleInspectSubmit = async (id: string, data: InspectReturnData) => {
    try {
      await inspectReturn(id, data);
      setShowInspectReturn(false);
      setSelectedReturn(null);
      await loadReturns();
      toast.success('Return inspected successfully');
    } catch (err) {
      console.error('Failed to inspect return:', err);
      toast.error('Failed to inspect return');
    }
  };

  const handleApproveSubmit = async (id: string, data: ApproveReturnData) => {
    try {
      await approveReturn(id, data);
      setShowApproveReturn(false);
      setSelectedReturn(null);
      await loadReturns();
      toast.success('Return approved successfully');
    } catch (err) {
      console.error('Failed to approve return:', err);
      toast.error('Failed to approve return');
    }
  };

  const handleRejectSubmit = async (id: string, data: RejectReturnData) => {
    try {
      await rejectReturn(id, data);
      setShowRejectReturn(false);
      setSelectedReturn(null);
      await loadReturns();
      toast.success('Return rejected successfully');
    } catch (err) {
      console.error('Failed to reject return:', err);
      toast.error('Failed to reject return');
    }
  };

  const handleProcessSubmit = async (id: string, data?: ProcessReturnData) => {
    try {
      await processReturn(id, data);
      setShowProcessReturn(false);
      setSelectedReturn(null);
      await loadReturns();
      toast.success('Return processed successfully');
    } catch (err) {
      console.error('Failed to process return:', err);
      toast.error('Failed to process return');
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedCategory('');
    setSelectedSourceType('');
    setStartDate('');
    setEndDate('');
  };

  if (loadingData && returns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Product Returns Management</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Superadmin Dashboard - All Branches
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowBulkReturn(true)}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <ScanLine className="w-4 h-4" />
              Bulk Scan Return
            </Button>
            <Button
              onClick={() => setShowCreateReturn(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4" />
              New Return
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <ProductReturnStatsCards stats={stats} />

        {/* Filters */}
        <ProductReturnFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedSourceType={selectedSourceType}
          onSourceTypeChange={setSelectedSourceType}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          onReset={handleClearFilters}
        />

        {/* Returns Table */}
        <ProductReturnTable
          returns={filteredReturns}
          onView={handleViewReturn}
          onInspect={handleInspectReturn}
          onApprove={handleApproveReturn}
          onReject={handleRejectReturn}
          onProcess={handleProcessReturn}
          pagination={pagination}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          isAdmin={true}
        />

        {/* Results count */}
        {filteredReturns.length > 0 && (
          <div className="text-sm text-gray-600 text-center mt-4">
            Showing {filteredReturns.length} of {pagination.total} returns
          </div>
        )}

        {/* Modals */}
        <CreateReturnModal
          isOpen={showCreateReturn}
          onClose={() => setShowCreateReturn(false)}
          onSubmit={handleCreateReturn}
          searchCustomers={searchCustomers}
        />

        <BulkScanReturnModal
          isOpen={showBulkReturn}
          onClose={() => setShowBulkReturn(false)}
          onSuccess={loadReturns}
          createdById={user?.id}
        />

        <ViewReturnModal
          isOpen={showViewReturn}
          onClose={() => {
            setShowViewReturn(false);
            setSelectedReturn(null);
          }}
          returnItem={selectedReturn}
        />

        <InspectReturnModal
          isOpen={showInspectReturn}
          onClose={() => {
            setShowInspectReturn(false);
            setSelectedReturn(null);
          }}
          onSubmit={handleInspectSubmit}
          returnItem={selectedReturn}
        />

        <ApproveReturnModal
          isOpen={showApproveReturn}
          onClose={() => {
            setShowApproveReturn(false);
            setSelectedReturn(null);
          }}
          onSubmit={handleApproveSubmit}
          returnItem={selectedReturn}
        />

        <RejectReturnModal
          isOpen={showRejectReturn}
          onClose={() => {
            setShowRejectReturn(false);
            setSelectedReturn(null);
          }}
          onSubmit={handleRejectSubmit}
          returnItem={selectedReturn}
        />

        <ProcessReturnModal
          isOpen={showProcessReturn}
          onClose={() => {
            setShowProcessReturn(false);
            setSelectedReturn(null);
          }}
          onSubmit={handleProcessSubmit}
          returnItem={selectedReturn}
        />
      </div>
    </div>
  );
}