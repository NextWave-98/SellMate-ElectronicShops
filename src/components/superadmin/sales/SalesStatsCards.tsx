import { ShoppingCart, DollarSign, TrendingUp, Tag } from 'lucide-react';
import { formatCurrency } from '../../../utils/currency';

interface SalesStatsCardsProps {
  stats: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalDiscount: number;
  };
}

export default function SalesStatsCards({ stats }: SalesStatsCardsProps) {
  const statCards = [
    {
      title: 'Total Sales',
      value: stats.totalSales,
      icon: ShoppingCart,
      color: 'bg-orange-400',
      textColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(stats.averageOrderValue),
      icon: TrendingUp,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgLight: 'bg-purple-50',
    },
    {
      title: 'Total Discount',
      value: formatCurrency(stats.totalDiscount),
      icon: Tag,
      color: 'bg-orange-400',
      textColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
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
