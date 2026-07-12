import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Power,
  Users,
  MapPin,
  Package,
  X,
  CheckCircle,
  XCircle,
  Key,
} from 'lucide-react';
import { useOrganization } from '../../hooks/useOrganization';
import type { Organization, OrganizationFilters, CreateOrganizationDTO } from '../../types/organization.types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Modal Components
import {
  ViewOrganizationModal,
  AddOrganizationModal,
  SecretKeyModal,
} from '../../components/superadmin/organizations';

export default function OrganizationsPage() {
  const {
    listOrganizations,
    getOrganizationDetails,
    createOrganization,
    toggleOrganizationStatus,
    setSuperAdminSecret,
  } = useOrganization();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadOrganizations = useCallback(
    async (filters?: OrganizationFilters) => {
      try {
        setLoading(true);
        const response = await listOrganizations({
          ...filters,
          limit: pagination.limit,
          offset: (pagination.page - 1) * pagination.limit,
        });

        if (response?.success && response.data) {
          const data = response.data as { organizations?: Organization[]; pagination?: { total: number; page: number; limit: number; totalPages: number } };
          setOrganizations(data.organizations || []);
          if (data.pagination) {
            setPagination({
              total: data.pagination.total,
              page: data.pagination.page,
              limit: data.pagination.limit,
              totalPages: data.pagination.totalPages,
            });
          }
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to load organizations';
        if (errorMsg.includes('secret') || errorMsg.includes('403')) {
          setIsSecretModalOpen(true);
        } else {
          toast.error(errorMsg);
        }
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [listOrganizations, pagination.limit, pagination.page]
  );

  useEffect(() => {
    loadOrganizations({
      search: searchQuery || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      subscriptionStatus: subscriptionFilter === 'all' ? undefined : subscriptionFilter,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter, subscriptionFilter]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadOrganizations({
      search: searchQuery || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      subscriptionStatus: subscriptionFilter === 'all' ? undefined : subscriptionFilter,
    });
  };

  const handleRefresh = async () => {
    await loadOrganizations();
    toast.success('Data refreshed');
  };

  const handleSecretSubmit = (secret: string) => {
    setSuperAdminSecret(secret);
    setIsSecretModalOpen(false);
    loadOrganizations();
  };

  const handleView = async (org: Organization) => {
    try {
      setIsProcessing(true);
      const response = await getOrganizationDetails(org.id);
      if (response?.success && response.data) {
        setSelectedOrganization(response.data as Organization);
        setIsViewModalOpen(true);
      }
    } catch {
      toast.error('Failed to fetch organization details');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (org: Organization) => {
    const action = org.isActive ? 'suspend' : 'activate';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${org.name}"?`
    );

    if (!confirmed) return;

    try {
      setIsProcessing(true);
      const reason = org.isActive ? `Suspended by admin on ${new Date().toLocaleDateString()}` : undefined;
      await toggleOrganizationStatus(org.id, !org.isActive, reason);
      await loadOrganizations();
    } catch {
      toast.error(`Failed to ${action} organization`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateOrganization = async (data: CreateOrganizationDTO) => {
    setIsProcessing(true);
    try {
      await createOrganization(data);
      setIsAddModalOpen(false);
      await loadOrganizations();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSubscriptionFilter('all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Stats
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.isActive).length;
  const inactiveOrgs = totalOrgs - activeOrgs;

  if (loading && organizations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className=" space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900  flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Organization Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage businesses and their subscriptions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsSecretModalOpen(true)}
            className="bg-gray-800 hover:bg-gray-700 text-white"
          >
            <Key className="w-4 h-4" />
            Set Secret
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Organization
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Organizations</p>
                <p className="text-xl font-bold text-gray-900">{pagination.total || totalOrgs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-xl font-bold text-gray-900">{activeOrgs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Suspended</p>
                <p className="text-xl font-bold text-gray-900">{inactiveOrgs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-xl font-bold text-gray-900">
                  {organizations.reduce((sum, o) => sum + (o._count?.users || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Search
              </Button>
            </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white  text-gray-900  focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Suspended</option>
          </select>

          {/* Subscription Status Filter */}
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white  text-gray-900  focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Subscriptions</option>
            <option value="ACTIVE">Active Subscription</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {/* Reset */}
          <Button
            onClick={handleResetFilters}
            variant="ghost"
            size="icon"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/30 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 ">No organizations found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Create your first organization to get started
                    </p>
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-white/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 ">{org.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{org.city}</div>
                        {org.businessType && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400">
                            {org.businessType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 ">{org.email}</div>
                        <div className="text-gray-500 dark:text-gray-400">{org.telephone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>{org._count?.users || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{org._count?.locations || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Package className="w-4 h-4" />
                          <span>{org._count?.products || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {org.subscription ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900 ">
                            {org.subscription.planName}
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                              org.subscription.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : org.subscription.status === 'EXPIRED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}
                          >
                            {org.subscription.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No subscription</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {org.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(org)}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(org)}
                          className={`p-2 transition-colors ${
                            org.isActive
                              ? 'text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                              : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                          }`}
                          title={org.isActive ? 'Suspend' : 'Activate'}
                          disabled={isProcessing}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>Showing {pagination.total === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results</span>
              <select
                value={pagination.limit}
                onChange={(e) => setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[5, 10, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <Button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
      </Card>

      {/* Modals */}
      <SecretKeyModal
        isOpen={isSecretModalOpen}
        onClose={() => setIsSecretModalOpen(false)}
        onSubmit={handleSecretSubmit}
      />

      <ViewOrganizationModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        organization={selectedOrganization}
      />

      <AddOrganizationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateOrganization}
        isLoading={isProcessing}
      />
    </div>
  );
}
