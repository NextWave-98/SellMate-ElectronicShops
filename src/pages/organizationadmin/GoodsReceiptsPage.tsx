/* eslint-disable react-hooks/exhaustive-deps */
// NOTE: react-hooks/exhaustive-deps is intentionally enforced
import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, PackageCheck, Plus, RefreshCw, Eye, CheckCircle2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGoodsReceipt, type GoodsReceipt } from '../../hooks/useGoodsReceipt';
import GoodsReceiptTable from '../../components/superadmin/suppliers/GoodsReceiptTable';
import ViewGoodsReceiptModal from '../../components/superadmin/suppliers/ViewGoodsReceiptModal';
import ApproveGoodsReceiptModal from '../../components/superadmin/suppliers/ApproveGoodsReceiptModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface GoodsReceiptFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'PENDING_QC' | 'QC_PASSED' | 'QC_FAILED' | 'PARTIALLY_ACCEPTED' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
}

export default function GoodsReceiptsPage() {
  const {
    getAllGoodsReceipts,
    deleteGoodsReceipt,
    getGoodsReceiptStats,
  } = useGoodsReceipt();

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    pendingQC: number;
    completed: number;
    todayReceipts: number;
  }>({
    total: 0,
    pendingQC: 0,
    completed: 0,
    todayReceipts: 0,
  });

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Selection state
  const [selectedReceipts, setSelectedReceipts] = useState<GoodsReceipt[]>([]);

  // Load receipts
  const loadReceipts = useCallback(async (overrideFilters?: GoodsReceiptFilters) => {
    setLoading(true);
    try {
      const filters: GoodsReceiptFilters = {
        page: overrideFilters?.page ?? currentPage,
        limit: overrideFilters?.limit ?? itemsPerPage,
        // Search should only be passed explicitly via override filters so we don't fetch on each keystroke
        search: overrideFilters?.search,
        status: overrideFilters?.status ?? (statusFilter !== 'ALL' ? (statusFilter as 'PENDING_QC' | 'QC_PASSED' | 'QC_FAILED' | 'PARTIALLY_ACCEPTED' | 'COMPLETED') : undefined),
      };

      const response = await getAllGoodsReceipts(filters);
      
      if (response?.data) {
        // The backend can respond in two shapes:
        // 1) { success: true, data: [items], pagination: { totalPages } }
        // 2) { success: true, data: { receipts: [items], totalPages } }
        // Handle both formats for migration-proofing.
        if (Array.isArray(response.data)) {
          setReceipts(response.data as GoodsReceipt[]);
        } else {
          const objData = response.data as { receipts?: GoodsReceipt[] };
          setReceipts(objData.receipts || []);
        }

        // Pagination can exist either as a top-level `pagination` field or inside the data object.
        type RespShape = { pagination?: { totalPages?: number }; data?: { totalPages?: number } | GoodsReceipt[] };
        const rpc = response as unknown as RespShape;
        const paginationTotalPages = rpc?.pagination?.totalPages || (rpc.data as { totalPages?: number })?.totalPages;
        setTotalPages(paginationTotalPages || 1);
      }
    } catch (error) {
      console.error('Error loading goods receipts:', error);
      toast.error('Failed to load goods receipts');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, getAllGoodsReceipts]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const response = await getGoodsReceiptStats();
      if (response?.data) {
        const data = response.data as { total: number; pendingQC: number; completed: number; todayReceipts: number };
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [getGoodsReceiptStats]);

  // Re-run loadReceipts when dependency values change (currentPage, filters, etc.)
  useEffect(() => {
    // Re-fetch when pagination or status filter change (not on each search term keystroke)
    loadReceipts({ page: currentPage, limit: itemsPerPage, status: statusFilter !== 'ALL' ? (statusFilter as GoodsReceiptFilters['status']) : undefined });
  }, [currentPage, statusFilter]);

  // Load stats on mount and when loadStats identity changes
  useEffect(() => {
    loadStats();
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    loadReceipts({ page: 1, search: searchTerm });
  };

  const handleView = (receipt: GoodsReceipt) => {
    setSelectedReceipt(receipt);
    setIsViewModalOpen(true);
  };

  const handleApprove = (receipt: GoodsReceipt) => {
    setSelectedReceipt(receipt);
    setIsApproveModalOpen(true);
  };

  const handleDelete = async (receiptId: string) => {
    try {
      await deleteGoodsReceipt(receiptId);
      toast.success('Goods receipt deleted successfully');
      loadReceipts();
      loadStats();
    } catch (error) {
      console.error('Error deleting goods receipt:', error);
      toast.error('Failed to delete goods receipt');
    }
  };

  const handleApproveSuccess = () => {
    setIsApproveModalOpen(false);
    setSelectedReceipt(null);
    loadReceipts();
    loadStats();
    toast.success('Goods receipt approved and inventory updated successfully!');
  };

  return (
    <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Goods Receipts (GRN)</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage incoming stock from suppliers</p>
        </div>
        <Button
          onClick={() => loadReceipts()}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Receipts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <PackageCheck className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending QC</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingQC}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Filter className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <PackageCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Today's Receipts</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.todayReceipts}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Plus className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by receipt number, PO number, or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING_QC">Pending QC</option>
                <option value="APPROVED">Approved</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <Button onClick={handleSearch} className="bg-orange-600 hover:bg-orange-700">
                Search
              </Button>

              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="mb-2">Start Date</Label>
                <Input type="date" />
              </div>
              <div>
                <Label className="mb-2">End Date</Label>
                <Input type="date" />
              </div>
              <div>
                <Label className="mb-2">Sort By</Label>
                <select className="w-full px-4 py-2 border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-400">
                  <option value="receiptDate">Receipt Date</option>
                  <option value="receiptNumber">Receipt Number</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Bar - Shown when goods receipts are selected */}
      {selectedReceipts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-900">
                  {selectedReceipts.length} receipt{selectedReceipts.length > 1 ? 's' : ''} selected
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedReceipts.length === 1 && (
                  <>
                    <Button
                      onClick={() => { handleView(selectedReceipts[0]); }}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View Details
                    </Button>

                    {selectedReceipts[0].status === 'PENDING_QC' && (
                      <Button
                        onClick={() => { handleApprove(selectedReceipts[0]); }}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Approve & Update Inventory
                      </Button>
                    )}

                    {selectedReceipts[0].status !== 'COMPLETED' && (
                      <Button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this goods receipt?')) {
                            handleDelete(selectedReceipts[0].id);
                            setSelectedReceipts([]);
                          }
                        }}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </CardContent>
        ) : (
          <GoodsReceiptTable
            receipts={receipts}
            onView={handleView}
            onApprove={handleApprove}
            onDelete={handleDelete}
            loading={loading}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={stats.total}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={() => {}}
            selectable={true}
            selectedReceipts={selectedReceipts}
            onSelectionChange={setSelectedReceipts}
          />
        )}
      </Card>

    

      {/* Modals */}
      <ViewGoodsReceiptModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
      />

      <ApproveGoodsReceiptModal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setSelectedReceipt(null);
        }}
        onSuccess={handleApproveSuccess}
        goodsReceipt={selectedReceipt}
      />
    </div>
  );
}
