/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useCallback } from 'react';
import { useAddonRequest, type AddonRequest, AddonRequestStatus, type AddonRequestQueryParams } from '../../hooks/useAddonRequest';
import { RefreshCw, CheckCircle, XCircle, Clock, Package, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AddonRequestsPage() {
  const { getAllAddonRequests, updateAddonRequest, getAddonRequestStats, loading } = useAddonRequest();
  const [requests, setRequests] = useState<AddonRequest[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<AddonRequestQueryParams>({
    status: undefined,
  });

  const loadRequests = useCallback(async () => {
    try {
      const response = await getAllAddonRequests({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (response?.success && response.data) {
        setRequests(Array.isArray(response.data) ? response.data : []);
        const responseWithPagination = response as unknown as { pagination?: typeof pagination };
        if (responseWithPagination.pagination) {
          setPagination(responseWithPagination.pagination);
        }
      }
    } catch (error) {
      console.error('Error loading addon requests:', error);
      toast.error('Failed to load addon requests');
    }
  }, [filters, pagination.page, pagination.limit]);

  const loadStats = useCallback(async () => {
    try {
      const response = await getAddonRequestStats();
      if (response?.success && response.data) {
        const statsData = response.data as unknown as typeof stats;
        setStats({
          total: statsData.total || 0,
          pending: statsData.pending || 0,
          approved: statsData.approved || 0,
          rejected: statsData.rejected || 0,
          completed: statsData.completed || 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadStats();
  }, [pagination.page, pagination.limit, filters]);

  const handleStatusChange = async (id: string, status: AddonRequestStatus) => {
    try {
      const response = await updateAddonRequest(id, { status });
      if (response?.success) {
        toast.success(`Request ${status.toLowerCase()} successfully`);
        loadRequests();
        loadStats();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: AddonRequestStatus) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-orange-100 text-orange-800 border-orange-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getSmsStatusBadge = (sent: boolean, delivered: boolean) => {
    if (!sent) {
      return <span className="text-xs text-gray-500">Not Sent</span>;
    }
    if (delivered) {
      return <span className="text-xs text-green-600 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> Delivered
      </span>;
    }
    return <span className="text-xs text-yellow-600 flex items-center gap-1">
      <Clock className="w-3 h-3" /> Sent
    </span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && requests.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Addon Requests</h1>
          <p className="text-gray-600 mt-1">Manage product addon requests from branches</p>
        </div>
        <button
          onClick={() => { loadRequests(); loadStats(); }}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
        </div>
        <div className="flex gap-3">
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as AddonRequestStatus | undefined })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <button
            onClick={() => setFilters({ status: undefined })}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantities
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SMS Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {request.product?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.product?.productCode || request.product?.sku || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {request.location?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.location?.locationCode || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {request.requestedByUser?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Current: <span className="font-semibold">{request.currentQuantity}</span>
                    </div>
                    <div className="text-sm text-orange-600">
                      Requested: <span className="font-semibold">{request.requestedQuantity}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSmsStatusBadge(request.smsNotificationSent, request.smsDelivered)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {request.status === AddonRequestStatus.PENDING && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(request.id, AddonRequestStatus.APPROVED)}
                          className="text-orange-600 hover:text-orange-900 font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(request.id, AddonRequestStatus.REJECTED)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {request.status === AddonRequestStatus.APPROVED && (
                      <button
                        onClick={() => handleStatusChange(request.id, AddonRequestStatus.COMPLETED)}
                        className="text-green-600 hover:text-green-900 font-medium"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
