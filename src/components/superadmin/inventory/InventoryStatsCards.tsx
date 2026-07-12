import { Package, DollarSign, AlertTriangle, XCircle } from 'lucide-react';
import type { InventoryStats } from '../../../types/inventory.types';
import { formatCurrency } from '@/utils/currency';

interface InventoryStatsCardsProps {
  stats: InventoryStats;
}

export default function InventoryStatsCards({ stats }: InventoryStatsCardsProps) {
  const statCards = [
    {
      title: 'Total Items',
      value: stats.totalItems,
      icon: Package,
      color: 'bg-orange-400',
      textColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
      subtitle: `Across ${stats.totalShops} locations`,
    },
    {
      title: 'Total Inventory Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
      subtitle: 'Current valuation',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgLight: 'bg-yellow-50',
      subtitle: 'Needs restocking',
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStockItems,
      icon: XCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgLight: 'bg-red-50',
      subtitle: 'Urgent attention',
    },
  ];

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
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
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
