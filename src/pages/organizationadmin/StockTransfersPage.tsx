import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStockTransfer } from '../../hooks/useStockTransfer';
import TransferStatsCards from '../../components/superadmin/stocktransfer/TransferStatsCards';
import TransferListTable from '../../components/superadmin/stocktransfer/TransferListTable';
import CreateTransferModal from '../../components/superadmin/stocktransfer/CreateTransferModal';
import ViewTransferModal from '../../components/superadmin/stocktransfer/ViewTransferModal';
import type { StockRelease } from '../../types/stockTransfer.types';

const StockTransfersPage: React.FC = () => {
  const {
    stockReleases,
    stats,
    loading,
    error,
    getAllStockReleases,
    getStockTransferStats,
    createBranchTransfer,
    approveStockRelease,
    releaseStock,
    receiveStock,
    cancelStockRelease,
  } = useStockTransfer();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockRelease | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([getAllStockReleases(), getStockTransferStats()]);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateTransfer = async (data: {
    fromBranchId: string;
    toBranchId: string;
    items: Array<{ productId: string; requestedQuantity: number; unitCost?: number; notes?: string }>;
    notes?: string;
  }) => {
    await createBranchTransfer(data);
    await loadData();
  };

  const handleViewTransfer = (transfer: StockRelease) => {
    setSelectedTransfer(transfer);
    setIsViewModalOpen(true);
  };

  const handleApproveTransfer = async (transferId: string) => {
    if (window.confirm('Are you sure you want to approve this transfer?')) {
      try {
        await approveStockRelease(transferId);
        await loadData();
      } catch (err) {
        console.error('Failed to approve transfer:', err);
        alert('Failed to approve transfer. Please try again.');
      }
    }
  };

  const handleReleaseTransfer = async (transferId: string) => {
    if (window.confirm('Are you sure you want to release this stock? This will deduct inventory from the source branch.')) {
      try {
        await releaseStock(transferId);
        await loadData();
      } catch (err) {
        console.error('Failed to release stock:', err);
        alert('Failed to release stock. Please try again.');
      }
    }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    if (window.confirm('Confirm receipt of this stock transfer? This will add inventory to the destination branch.')) {
      try {
        await receiveStock(transferId);
        await loadData();
      } catch (err) {
        console.error('Failed to receive stock:', err);
        alert('Failed to receive stock. Please try again.');
      }
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    if (window.confirm('Are you sure you want to cancel this transfer? This action cannot be undone.')) {
      try {
        await cancelStockRelease(transferId);
        await loadData();
      } catch (err) {
        console.error('Failed to cancel transfer:', err);
        alert('Failed to cancel transfer. Please try again.');
      }
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Stock Transfers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage inventory transfers between branches
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus size={20} />
            Create Transfer
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <TransferStatsCards stats={stats} loading={loading && !refreshing} />

      {/* Transfer List */}
      <TransferListTable
        transfers={stockReleases}
        loading={loading && !refreshing}
        onViewTransfer={handleViewTransfer}
        onApproveTransfer={handleApproveTransfer}
        onReleaseTransfer={handleReleaseTransfer}
        onReceiveTransfer={handleReceiveTransfer}
        onCancelTransfer={handleCancelTransfer}
      />

      {/* Modals */}
      <CreateTransferModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTransfer}
      />

      <ViewTransferModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedTransfer(null);
        }}
        transfer={selectedTransfer}
      />
    </div>
  );
};

export default StockTransfersPage;
