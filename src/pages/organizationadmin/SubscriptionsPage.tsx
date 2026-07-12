import { useEffect, useState, useCallback } from 'react';

import {
  CreditCard,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Edit,
  Trash2,
  Package,
  Users,
  TrendingUp,
  Building2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { useOrganization } from '../../hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type {
  SubscriptionPlan,
  SubscriptionPlanType,
  BusinessSubscription,
  SubscriptionPayment,
  SubscriptionPlanFilters,
  SubscriptionStatus,
  PaymentStatus,
  BillingCycle,
  PaymentMethod,
} from '../../types/subscription.types';
import type { Organization } from '../../types/organization.types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

// Modal Components
import {
  ViewPlanModal,
  AddPlanModal,
  EditPlanModal,
  ViewSubscriptionModal,
  AddSubscriptionModal,
  ViewPaymentModal,
  AddPaymentModal
} from '../../components/superadmin/subscriptions';

type TabType = 'plans' | 'subscriptions' | 'payments';

export default function SubscriptionsPage() {
  const {
    getSubscriptionPlans,
    getSubscriptionPlanById,
    createSubscriptionPlan,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    getBusinessSubscriptions,
    getBusinessSubscriptionById,
    cancelBusinessSubscription,
    renewBusinessSubscription,
    createBusinessSubscription,
    getSubscriptionPayments,
    getSubscriptionPaymentById,
    createSubscriptionPayment,
  } = useSubscription();

  const { listOrganizations } = useOrganization();

  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [loading, setLoading] = useState(true);
  
  // Organizations state for AddSubscriptionModal
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<BusinessSubscription[]>([]);
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>('all');
  
  // Payments state
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  
  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Modal States
  const [isViewPlanModalOpen, setIsViewPlanModalOpen] = useState(false);
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const [isViewSubscriptionModalOpen, setIsViewSubscriptionModalOpen] = useState(false);
  const [isAddSubscriptionModalOpen, setIsAddSubscriptionModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<BusinessSubscription | null>(null);

  const [isViewPaymentModalOpen, setIsViewPaymentModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SubscriptionPayment | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // Load Plans
  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const filters: SubscriptionPlanFilters = {};
      if (statusFilter !== 'all') filters.isActive = statusFilter === 'active';
      
      const response = await getSubscriptionPlans(filters);
      if (response?.success && response.data) {
        const data = response.data as { plans?: SubscriptionPlan[]; pagination?: { total: number; page: number; limit: number; totalPages: number } };
        setPlans(data.plans || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      toast.error('Failed to load subscription plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getSubscriptionPlans, statusFilter]);

  // Load Subscriptions
  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getBusinessSubscriptions({
        status: subscriptionStatusFilter === 'all' ? undefined : subscriptionStatusFilter as SubscriptionStatus,
        limit: pagination.limit,
        page: pagination.page,
      });
      if (response?.success && response.data) {
        const data = response.data as { subscriptions?: BusinessSubscription[]; pagination?: { total: number; page: number; limit: number; totalPages: number } };
        setSubscriptions(data.subscriptions || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      toast.error('Failed to load subscriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getBusinessSubscriptions, subscriptionStatusFilter, pagination.limit, pagination.page]);

  // Load Payments
  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSubscriptionPayments({
        status: paymentStatusFilter === 'all' ? undefined : paymentStatusFilter as PaymentStatus,
        limit: pagination.limit,
        page: pagination.page,
      });
      if (response?.success && response.data) {
        const data = response.data as { payments?: SubscriptionPayment[]; pagination?: { total: number; page: number; limit: number; totalPages: number } };
        setPayments(data.payments || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      toast.error('Failed to load payments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getSubscriptionPayments, paymentStatusFilter, pagination.limit, pagination.page]);

  // Load Organizations for AddSubscriptionModal
  const loadOrganizations = useCallback(async () => {
    try {
      const response = await listOrganizations({ limit: 100, isActive: true });
      if (response?.success && response.data?.organizations) {
        setOrganizations(response.data.organizations);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  }, [listOrganizations]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'plans') {
      loadPlans();
    } else if (activeTab === 'subscriptions') {
      loadSubscriptions();
      loadOrganizations(); // Load organizations for AddSubscriptionModal
      if (plans.length === 0) loadPlans(); // Also load plans for dropdown
    } else if (activeTab === 'payments') {
      loadPayments();
      loadSubscriptions(); // Also load subscriptions for AddPaymentModal
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Handlers for Plans
  const handleViewPlan = async (plan: SubscriptionPlan) => {
    try {
      setIsProcessing(true);
      const response = await getSubscriptionPlanById(plan.id);
      if (response?.success && response.data) {
        setSelectedPlan(response.data as SubscriptionPlan);
        setIsViewPlanModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to fetch plan details');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditPlan = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsEditPlanModalOpen(true);
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${plan.name}" plan?`);
    if (!confirmed) return;

    try {
      setIsProcessing(true);
      await deleteSubscriptionPlan(plan.id);
      toast.success('Plan deleted successfully');
      await loadPlans();
    } catch (err) {
      toast.error('Failed to delete plan');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePlan = async (data: Partial<SubscriptionPlan>) => {
    try {
      setIsProcessing(true);
      const planData = {
        planType: (data.plan_type || 'BASIC') as SubscriptionPlanType,
        name: data.name || '',
        description: data.description,
        monthlyPrice: Number(data.monthly_price) || 0,
        quarterlyPrice: Number(data.quarterly_price) || 0,
        semiAnnualPrice: Number(data.semi_annual_price) || 0,
        annualPrice: Number(data.annual_price) || 0,
        maxLocations: data.max_locations || 1,
        maxWarehouses: data.max_warehouses || 1,
        maxBranches: data.max_branches || 1,
        maxUsers: data.max_users || 5,
        maxProducts: data.max_products || 100,
        unlimitedStorage: data.unlimited_storage,
        storageLimitGb: data.storage_limit_gb,
        posEnabled: data.pos_enabled,
        onlineSalesEnabled: data.online_sales_enabled,
        courierIntegrationEnabled: data.courier_integration_enabled,
        advancedReporting: data.advanced_reporting,
        apiAccess: data.api_access,
        customBranding: data.custom_branding,
        multiCurrency: data.multi_currency,
        prioritySupport: data.priority_support,
        trialDays: Number(data.trial_days) || 0,
        features: data.features,
      } as import('../../types/subscription.types').CreateSubscriptionPlanDTO;
      await createSubscriptionPlan(planData);
      toast.success('Plan created successfully');
      setIsAddPlanModalOpen(false);
      await loadPlans();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePlan = async (id: string, data: Partial<SubscriptionPlan>) => {
    try {
      setIsProcessing(true);
      await updateSubscriptionPlan(id, data);
      toast.success('Plan updated successfully');
      setIsEditPlanModalOpen(false);
      await loadPlans();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handlers for Subscriptions
  const handleViewSubscription = async (subscription: BusinessSubscription) => {
    try {
      setIsProcessing(true);
      const response = await getBusinessSubscriptionById(subscription.id);
      if (response?.success && response.data) {
        setSelectedSubscription(response.data as BusinessSubscription);
        setIsViewSubscriptionModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to fetch subscription details');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async (subscription: BusinessSubscription) => {
    const confirmed = window.confirm('Are you sure you want to cancel this subscription?');
    if (!confirmed) return;

    try {
      setIsProcessing(true);
      await cancelBusinessSubscription(subscription.id, 'Cancelled by admin');
      toast.success('Subscription cancelled');
      await loadSubscriptions();
    } catch (err) {
      toast.error('Failed to cancel subscription');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenewSubscription = async (subscription: BusinessSubscription) => {
    try {
      setIsProcessing(true);
      await renewBusinessSubscription(subscription.id);
      toast.success('Subscription renewed');
      await loadSubscriptions();
    } catch (err) {
      toast.error('Failed to renew subscription');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateSubscription = async (data: { businessId: string; planId: string; billingCycle: 'MONTHLY' | 'ANNUAL'; autoRenew: boolean }) => {
    try {
      setIsProcessing(true);
      const subscriptionData = {
        businessId: data.businessId,
        planId: data.planId,
        billingCycle: data.billingCycle as BillingCycle,
        startDate: new Date().toISOString(),
        autoRenew: data.autoRenew,
      };
      await createBusinessSubscription(subscriptionData);
      toast.success('Subscription created successfully');
      setIsAddSubscriptionModalOpen(false);
      await loadSubscriptions();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handlers for Payments
  const handleViewPayment = async (payment: SubscriptionPayment) => {
    try {
      setIsProcessing(true);
      const response = await getSubscriptionPaymentById(payment.id);
      if (response?.success && response.data) {
        setSelectedPayment(response.data as SubscriptionPayment);
        setIsViewPaymentModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to fetch payment details');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePayment = async (data: { subscriptionId: string; amount: number; paymentMethod: string; transactionId?: string; notes?: string }) => {
    try {
      setIsProcessing(true);
      const paymentData = {
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        paymentMethod: data.paymentMethod as PaymentMethod,
        paymentDate: new Date().toISOString(),
        transactionId: data.transactionId,
        notes: data.notes,
      };
      await createSubscriptionPayment(paymentData);
      toast.success('Payment recorded successfully');
      setIsAddPaymentModalOpen(false);
      await loadPayments();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'plans') loadPlans();
    else if (activeTab === 'subscriptions') loadSubscriptions();
    else if (activeTab === 'payments') loadPayments();
    toast.success('Data refreshed');
  };

  // Stats calculations
  const activePlanCount = plans.filter((p) => p.is_active).length;
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE').length;
  const totalRevenue = payments
    .filter((p) => p.paymentStatus === 'COMPLETED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
      SUSPENDED: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-purple-100 text-purple-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && plans.length === 0 && subscriptions.length === 0 && payments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            Subscription Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage subscription plans, business subscriptions, and payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          {activeTab === 'plans' && (
            <Button
              onClick={() => setIsAddPlanModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Plan
            </Button>
          )}
          {activeTab === 'subscriptions' && (
            <Button
              onClick={() => setIsAddSubscriptionModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Subscription
            </Button>
          )}
          {activeTab === 'payments' && (
            <Button
              onClick={() => setIsAddPaymentModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Plans</p>
              <p className="text-xl font-bold text-gray-900">{activePlanCount} / {plans.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Subscriptions</p>
              <p className="text-xl font-bold text-gray-900">{activeSubscriptions}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Payments</p>
              <p className="text-xl font-bold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <div className="border-b border-white/20">
          <nav className="flex -mb-px">
            {(['plans', 'subscriptions', 'payments'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'plans' && <Package className="w-4 h-4 inline mr-2" />}
                {tab === 'subscriptions' && <Users className="w-4 h-4 inline mr-2" />}
                {tab === 'payments' && <CreditCard className="w-4 h-4 inline mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Plans Tab */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search plans..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadPlans()}
                      className="w-full pl-10 pr-4 py-2 border border-white/40 rounded-lg bg-white/30 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <Button
                    onClick={loadPlans}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Search
                  </Button>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-4 py-2 border border-white/40 rounded-lg bg-white/30 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-white/30 backdrop-blur-sm rounded-xl p-6 border border-white/30"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan.name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            plan.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <span className="text-sm text-indigo-600 font-medium">
                        {plan.plan_type}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-3xl font-bold text-gray-900">
                        {formatCurrency(Number(plan.monthly_price))}
                        <span className="text-sm font-normal text-gray-500">/mo</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(Number(plan.annual_price))}/year
                      </p>
                    </div>

                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Max Users</span>
                        <span className="font-medium">{plan.max_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Locations</span>
                        <span className="font-medium">{plan.max_locations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Products</span>
                        <span className="font-medium">{plan.max_products}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-white/20">
                      <Button
                        onClick={() => handleViewPlan(plan)}
                        size="sm"
                        className="flex-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                        variant="ghost"
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => handleEditPlan(plan)}
                        size="sm"
                        className="flex-1 text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
                        variant="ghost"
                      >
                        <Edit className="w-4 h-4 inline mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeletePlan(plan)}
                        size="sm"
                        className="text-red-600 bg-red-50 hover:bg-red-100"
                        variant="ghost"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {plans.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No plans found</h3>
                  <p className="text-gray-500 mt-1">
                    Create your first subscription plan
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <select
                  value={subscriptionStatusFilter}
                  onChange={(e) => {
                    setSubscriptionStatusFilter(e.target.value);
                    loadSubscriptions();
                  }}
                  className="px-4 py-2 border border-white/40 rounded-lg bg-white/30 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="all">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING_PAYMENT">Pending Payment</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              {/* Subscriptions Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/30 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {sub.business?.name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-gray-900">{sub.plan?.name || 'Unknown'}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-gray-600">{sub.billingCycle}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="text-gray-900">{formatDate(sub.startDate)}</div>
                            <div className="text-gray-500">to {formatDate(sub.endDate)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(sub.status)}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleViewSubscription(sub)}
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-indigo-600"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {sub.status === 'ACTIVE' && (
                              <Button
                                onClick={() => handleCancelSubscription(sub)}
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-red-600"
                                title="Cancel"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {(sub.status === 'EXPIRED' || sub.status === 'CANCELLED') && (
                              <Button
                                onClick={() => handleRenewSubscription(sub)}
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-green-600"
                                title="Renew"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {subscriptions.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No subscriptions found</h3>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    loadPayments();
                  }}
                  className="px-4 py-2 border border-white/40 rounded-lg bg-white/30 backdrop-blur-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="all">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>

              {/* Payments Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/30 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-white/30 transition-colors">
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm text-gray-900">
                            {payment.transactionId || payment.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-gray-900">
                            {payment.subscription?.business?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-medium text-gray-900">
                            {formatCurrency(Number(payment.amount))}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-gray-600">{payment.paymentMethod}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-gray-600">{formatDate(payment.paymentDate)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(payment.paymentStatus)}`}>
                            {payment.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button
                            onClick={() => handleViewPayment(payment)}
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-indigo-600"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {payments.length === 0 && (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No payments found</h3>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <select
                value={pagination.limit}
                onChange={(e) => setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="text-sm border border-white/40 rounded bg-white/30 backdrop-blur-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
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

      {/* Plan Modals */}
      <ViewPlanModal
        isOpen={isViewPlanModalOpen}
        onClose={() => setIsViewPlanModalOpen(false)}
        plan={selectedPlan}
      />
      <AddPlanModal
        isOpen={isAddPlanModalOpen}
        onClose={() => setIsAddPlanModalOpen(false)}
        onSubmit={handleCreatePlan}
        isLoading={isProcessing}
      />
      <EditPlanModal
        isOpen={isEditPlanModalOpen}
        onClose={() => setIsEditPlanModalOpen(false)}
        onSubmit={handleUpdatePlan}
        plan={selectedPlan}
        isLoading={isProcessing}
      />

      {/* Subscription Modals */}
      <ViewSubscriptionModal
        isOpen={isViewSubscriptionModalOpen}
        onClose={() => setIsViewSubscriptionModalOpen(false)}
        subscription={selectedSubscription}
      />
      <AddSubscriptionModal
        isOpen={isAddSubscriptionModalOpen}
        onClose={() => setIsAddSubscriptionModalOpen(false)}
        onSubmit={handleCreateSubscription}
        plans={plans}
        organizations={organizations.map(org => ({ id: org.id, businessName: org.name, email: org.email }))}
        isLoading={isProcessing}
      />

      {/* Payment Modals */}
      <ViewPaymentModal
        isOpen={isViewPaymentModalOpen}
        onClose={() => setIsViewPaymentModalOpen(false)}
        payment={selectedPayment}
      />
      <AddPaymentModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        onSubmit={handleCreatePayment}
        subscriptions={subscriptions}
        isLoading={isProcessing}
      />
    </div>
  );
}
