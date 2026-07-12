import { Users, Package, DollarSign, AlertCircle } from 'lucide-react';
import type { SupplierStats } from '../../../types/supplier.types';

interface SupplierStatsCardsProps {
  stats: SupplierStats;
  hideFinancials?: boolean;
}

export default function SupplierStatsCards({ stats, hideFinancials = false }: SupplierStatsCardsProps) {
  const statCards = [
    {
      title: 'Total Suppliers',
      value: stats.totalSuppliers,
      subtitle: `${stats.activeSuppliers} active`,
      icon: Users,
      color: 'bg-orange-400',
      textColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
    },
    {
      title: 'Purchase Orders',
      value: stats.totalPurchaseOrders,
      subtitle: `${stats.pendingOrders} pending`,
      icon: Package,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgLight: 'bg-yellow-50',
    },
    {
      title: 'Total Purchase Value',
      value: `LKR ${(stats.totalPurchaseValue/1000000 ).toFixed(2)} M`,
      subtitle: 'All time',
      icon: DollarSign,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    {
      title: 'Outstanding Payments',
      value: `LKR ${(stats.outstandingPayments/1000000 ).toFixed(2)} M`,
      subtitle: 'Pending',
      icon: AlertCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgLight: 'bg-red-50',
    },
  ].filter((card) => !hideFinancials || !['Total Purchase Value', 'Outstanding Payments'].includes(card.title));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                )}
              </div>
              <div className={`${card.bgLight} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
