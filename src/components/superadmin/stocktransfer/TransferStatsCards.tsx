import React from 'react';
import { Package, Clock, Truck, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import type { StockTransferStats } from '../../../types/stockTransfer.types';

interface TransferStatsCardsProps {
  stats: StockTransferStats | null;
  loading?: boolean;
}

const TransferStatsCards: React.FC<TransferStatsCardsProps> = ({ stats, loading }) => {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
            <div className="mt-4 h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Transfers',
      value: stats.totalTransfers,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      title: 'Pending Approval',
      value: stats.pendingTransfers,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
    {
      title: 'In Transit',
      value: stats.inTransitTransfers,
      icon: Truck,
      color: 'purple',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Completed',
      value: stats.completedTransfers,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Cancelled',
      value: stats.cancelledTransfers,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      title: 'Total Items Transferred',
      value: stats.totalItemsTransferred,
      icon: TrendingUp,
      color: 'indigo',
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={card.iconColor} size={24} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>

            {/* Optional: Add percentage or trend indicator */}
            {card.title === 'Total Transfers' && stats.totalTransfers > 0 && (
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500">
                  {stats.completedTransfers > 0 &&
                    `${((stats.completedTransfers / stats.totalTransfers) * 100).toFixed(1)}% completed`}
                </span>
              </div>
            )}

            {card.title === 'Pending Approval' && stats.pendingTransfers > 0 && (
              <div className="mt-2">
                <span className="text-sm text-yellow-600 font-medium">
                  Requires attention
                </span>
              </div>
            )}

            {card.title === 'In Transit' && stats.inTransitTransfers > 0 && (
              <div className="mt-2">
                <span className="text-sm text-purple-600 font-medium">
                  Active transfers
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TransferStatsCards;
