import { formatCurrency } from '@/utils/currency';
import { Package, DollarSign, AlertTriangle, XCircle } from 'lucide-react';

interface StockStats {
  totalProducts: number;
  activeProducts: number;
  discontinuedProducts: number;
  lowStockProducts: number;
  totalValue: number;
  totalRetailValue?: number;
  categoryBreakdown: { name: string; count: number }[];
}

interface StockStatsCardsProps {
  stats: StockStats;
}

export default function StockStatsCards({ stats }: StockStatsCardsProps) {
  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-orange-400',
      textColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
    },
    {
      title: 'Total Cost Value',
      value: `${formatCurrency(stats.totalValue)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    {
      title: 'Total Retail Value',
      value: `${formatCurrency(stats.totalRetailValue ?? 0)}`,
      icon: DollarSign,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    {
      title: 'Low Stock Products',
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgLight: 'bg-yellow-50',
    },
    {
      title: 'Discontinued',
      value: stats.discontinuedProducts,
      icon: XCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgLight: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
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
