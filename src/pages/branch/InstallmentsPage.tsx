import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Plus, Search, Loader2, Eye, DollarSign, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';

interface InstallmentPlan {
    id: string;
    planNumber: string;
    customer: {
        id: string;
        customerId: string;
        name: string;
        phone: string;
    };
    totalAmount: number;
    downPayment: number;
    financedAmount: number;
    numberOfInstallments: number;
    installmentAmount: number;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
    totalPaid: number;
    totalOutstanding: number;
    paymentsCompleted: number;
    paymentsMissed: number;
    startDate: string;
    endDate: string;
}

interface InstallmentStats {
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    defaultedPlans: number;
    totalFinancedAmount: number;
    totalOutstanding: number;
    totalCollected: number;
    overduePayments: number;
    upcomingPayments: number;
}

export default function InstallmentsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [plans, setPlans] = useState<InstallmentPlan[]>([]);
    const [stats, setStats] = useState<InstallmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const { fetchData: getPlans } = useFetch('/installments/plans');
    const { fetchData: getStats } = useFetch('/installments/stats');

    const loadPlans = async () => {
        try {
            setLoading(true);
            const response = await getPlans({
                method: 'GET',
                data: {
                    page: currentPage,
                    limit: itemsPerPage,
                },
                silent: true,
            });

            if (response?.success && response?.plans) {
                setPlans(response.plans);
                if (response.pagination) {
                    setTotalPages(response.pagination.totalPages);
                }
            }
        } catch (error) {
            console.error('Failed to load plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await getStats({
                method: 'GET',
                silent: true,
            });

            if (response?.success && response?.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    useEffect(() => {
        loadPlans();
        loadStats();
    }, [currentPage, itemsPerPage]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([loadPlans(), loadStats()]);
            toast.success('Data refreshed successfully');
        } catch {
            toast.error('Failed to refresh data');
        } finally {
            setRefreshing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'COMPLETED':
                return 'bg-blue-100 text-blue-800';
            case 'DEFAULTED':
                return 'bg-red-100 text-red-800';
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading && plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
                <p className="mt-4 text-gray-600">Loading installment plans...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Installment Plans</h1>
                    <p className="text-gray-600 mt-1">Manage customer installment payment plans</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => navigate('create')}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Plan
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Plans</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activePlans}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    Rs. {stats.totalOutstanding.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-lg">
                                <AlertCircle className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">{stats.overduePayments}</p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-lg">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Upcoming Payments</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.upcomingPayments}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Search */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Search by plan number or customer name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4"
                        />
                    </div>
                </div>
            </Card>

            {/* Plans Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/20">
                        <thead className="bg-white/30 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Plan #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Paid / Outstanding
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Progress
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/20 backdrop-blur-sm divide-y divide-white/20">
                            {plans.map((plan) => (
                                <tr key={plan.id} className="hover:bg-white/30">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {plan.planNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{plan.customer.name}</div>
                                        <div className="text-sm text-gray-500">{plan.customer.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        Rs. {plan.totalAmount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-green-600">
                                            Rs. {plan.totalPaid.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-red-600">
                                            Rs. {plan.totalOutstanding.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {plan.paymentsCompleted} / {plan.numberOfInstallments}
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                            <div
                                                className="bg-green-600 h-2 rounded-full"
                                                style={{
                                                    width: `${(plan.paymentsCompleted / plan.numberOfInstallments) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                                plan.status
                                            )}`}
                                        >
                                            {plan.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => navigate(plan.id)}
                                            className="text-orange-600 hover:text-orange-900 mr-3"
                                        >
                                            <Eye className="w-4 h-4 inline" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-white/30 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-t border-white/20 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <p className="text-sm text-gray-700">
                                    Page <span className="font-medium">{currentPage}</span> of{' '}
                                    <span className="font-medium">{totalPages}</span>
                                </p>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {[5, 10, 30, 50, 100].map((n) => (
                                        <option key={n} value={n}>{n} / page</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-r-none"
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="rounded-l-none"
                                    >
                                        Next
                                    </Button>
                                </nav>
                            </div>
                        </div>
                    </div>
            </Card>

            {plans.length === 0 && !loading && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No installment plans found</p>
                </div>
            )}
        </div>
    );
}
