import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiShoppingBag,
  FiClock,
  FiCheckCircle,
  FiDollarSign,
  FiTrendingUp,
  FiPackage,
} from 'react-icons/fi';
import { useSupplierPortal } from '../../hooks';
import { formatCurrency } from '../../utils/currency';

interface DashboardStats {
  totalPurchaseOrders: number;
  pendingPurchaseOrders: number;
  completedPurchaseOrders: number;
  totalOrderValue: number;
  totalPaidAmount: number;
  outstandingAmount: number;
}

interface RecentOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  expectedDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

const SupplierDashboard = () => {
  const { getDashboard, loading } = useSupplierPortal();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await getDashboard();
      setStats(data.stats);
      setRecentOrders(data.recentOrders);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      RECEIVED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const statCards = [
    {
      title: 'Total Purchase Orders',
      value: stats?.totalPurchaseOrders || 0,
      icon: <FiShoppingBag size={24} />,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingPurchaseOrders || 0,
      icon: <FiClock size={24} />,
      color: 'bg-yellow-500',
    },
    {
      title: 'Completed Orders',
      value: stats?.completedPurchaseOrders || 0,
      icon: <FiCheckCircle size={24} />,
      color: 'bg-green-500',
    },
    {
      title: 'Total Order Value',
      value: formatCurrency(stats?.totalOrderValue || 0),
      icon: <FiDollarSign size={24} />,
      color: 'bg-indigo-500',
    },
    {
      title: 'Total Paid',
      value: formatCurrency(stats?.totalPaidAmount || 0),
      icon: <FiTrendingUp size={24} />,
      color: 'bg-teal-500',
    },
    {
      title: 'Outstanding Amount',
      value: formatCurrency(stats?.outstandingAmount || 0),
      icon: <FiPackage size={24} />,
      color: 'bg-red-500',
    },
  ];

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome to Your Supplier Portal</h1>
        <p className="text-indigo-100">
          Manage your purchase orders, track payments, and update your profile all in one place.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg text-white`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Purchase Orders</h2>
            <Link
              to="/supplier/purchase-orders"
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {recentOrders.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/supplier/purchase-orders/${order.id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        {order.poNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.expectedDate
                        ? new Date(order.expectedDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.balanceAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <FiShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your recent purchase orders will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
