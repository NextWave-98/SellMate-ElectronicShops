import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, Truck, Package, Search, Filter, ChevronDown } from 'lucide-react';
import type { StockRelease } from '../../../types/stockTransfer.types';
import Pagination from '../../common/Pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TransferListTableProps {
  transfers: StockRelease[] | undefined;
  loading: boolean;
  onViewTransfer: (transfer: StockRelease) => void;
  onApproveTransfer?: (transferId: string) => void;
  onReleaseTransfer?: (transferId: string) => void;
  onReceiveTransfer?: (transferId: string) => void;
  onCancelTransfer?: (transferId: string) => void;
  // Controlled pagination props
  currentPage: number;
  itemsPerPage: number;
  totalItems?: number; // optional: fallback to local count
  totalPages?: number; // optional: fallback to computed pages
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

const TransferListTable: React.FC<TransferListTableProps> = (props) => {
  const {
    transfers,
    loading,
    onViewTransfer,
    onApproveTransfer,
    onReleaseTransfer,
    onReceiveTransfer,
    onCancelTransfer,
    currentPage: propCurrentPage,
    itemsPerPage: propItemsPerPage,
    totalItems: propTotalItems,
    totalPages: propTotalPages,
    onPageChange: propOnPageChange,
    onItemsPerPageChange: propOnItemsPerPageChange,
  } = props;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'source' | 'destination'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  // Pagination is controlled by parent when possible. Provide defaults if undefined.
  const [currentPageLocal, setCurrentPageLocal] = useState(1);
  const [itemsPerPageLocal, setItemsPerPageLocal] = useState(10);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'RELEASED':
      case 'IN_TRANSIT':
        return 'bg-orange-100 text-orange-800';
      case 'APPROVED':
        return 'bg-purple-100 text-purple-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter transfers
  const filteredTransfers = (Array.isArray(transfers) ? transfers : []).filter((transfer) => {
    const matchesSearch =
      transfer.releaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.fromBranch?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.toBranch?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || transfer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort transfers
  const sortedTransfers = [...filteredTransfers].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'source':
        comparison = (a.fromBranch?.name || '').localeCompare(b.fromBranch?.name || '');
        break;
      case 'destination':
        comparison = (a.toBranch?.name || '').localeCompare(b.toBranch?.name || '');
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Determine pagination values: prefer props, else use local state
  const currentPage = propCurrentPage ?? currentPageLocal;
  const itemsPerPage = propItemsPerPage ?? itemsPerPageLocal;

  const computedTotalItems = propTotalItems ?? sortedTransfers.length;
  const computedTotalPages = propTotalPages ?? Math.max(1, Math.ceil(sortedTransfers.length / itemsPerPage));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransfers = sortedTransfers.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (value: number) => {
    // update local state
    setItemsPerPageLocal(value);
    setCurrentPageLocal(1);
    // notify parent if handler provided
    if (propOnItemsPerPageChange) propOnItemsPerPageChange(value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPageLocal(page);
    if (propOnPageChange) propOnPageChange(page);
  };

  const canApprove = (transfer: StockRelease) => transfer.status === 'PENDING';
  const canRelease = (transfer: StockRelease) => transfer.status === 'APPROVED';
  const canReceive = (transfer: StockRelease) => transfer.status === 'RELEASED' || transfer.status === 'IN_TRANSIT';
  const canCancel = (transfer: StockRelease) => ['PENDING', 'APPROVED'].includes(transfer.status);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading transfers...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Filters and Search */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by release number or branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Filter size={20} />
            Filters
            <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="RELEASED">Released</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'status' | 'source' | 'destination')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              >
                <option value="date">Date</option>
                <option value="status">Status</option>
                <option value="source">Source Branch</option>
                <option value="destination">Destination Branch</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {sortedTransfers.length} of {transfers?.length || 0} transfer{(transfers?.length || 0) !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {sortedTransfers.length === 0 ? (
        <div className="p-8 text-center">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No transfers found</p>
          {searchTerm || statusFilter !== 'ALL' ? (
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release #</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <span className="text-sm font-medium text-orange-600">
                      {transfer.releaseNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{transfer.fromBranch?.name}</div>
                    <div className="text-xs text-gray-500">{transfer.fromBranch?.location}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{transfer.toBranch?.name}</div>
                    <div className="text-xs text-gray-500">{transfer.toBranch?.location}</div>
                  </TableCell>
                  <TableCell>
                    {transfer.items?.length || 0} item{transfer.items?.length !== 1 ? 's' : ''}
                  </TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(transfer.status)}`}>
                      {transfer.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDate(transfer.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewTransfer(transfer)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>

                      {onApproveTransfer && canApprove(transfer) && (
                        <button
                          onClick={() => onApproveTransfer(transfer.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve Transfer"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}

                      {onReleaseTransfer && canRelease(transfer) && (
                        <button
                          onClick={() => onReleaseTransfer(transfer.id)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Release Stock"
                        >
                          <Truck size={18} />
                        </button>
                      )}

                      {onReceiveTransfer && canReceive(transfer) && (
                        <button
                          onClick={() => onReceiveTransfer(transfer.id)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Receive Stock"
                        >
                          <Package size={18} />
                        </button>
                      )}

                      {onCancelTransfer && canCancel(transfer) && (
                        <button
                          onClick={() => onCancelTransfer(transfer.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel Transfer"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            currentPage={currentPage}
            totalPages={computedTotalPages}
            itemsPerPage={itemsPerPage}
            totalItems={computedTotalItems}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default TransferListTable;
