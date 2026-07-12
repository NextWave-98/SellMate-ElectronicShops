import { Users, UserCheck, TrendingUp, Star } from 'lucide-react';
import type { CustomerStats } from '../../../types/customer.types';
import React from 'react';

type SimpleCustomerStats = {
  total: number;
  walkin: number;
  regular: number;
  vip: number;
  active: number;
  inactive: number;
};

interface CustomerStatsCardsProps {
  stats: Partial<CustomerStats> | Partial<SimpleCustomerStats>;
}

const formatValue = (v: unknown) => {
  if (v === undefined || v === null) return '-';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
};

export default function CustomerStatsCards({ stats }: CustomerStatsCardsProps) {
  const statCards = [
    {
      title: 'Total Customers',
      value: stats.total,
      icon: Users,
      textColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
    },
    {
      title: 'Walk-in Customers',
      value: (stats as Partial<SimpleCustomerStats>).walkin,
      icon: TrendingUp,
      textColor: 'text-purple-600',
      bgLight: 'bg-purple-50',
    },
    {
      title: 'Regular Customers',
      value: (stats as Partial<SimpleCustomerStats>).regular,
      icon: UserCheck,
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    {
      title: 'VIP Customers',
      value: (stats as Partial<SimpleCustomerStats>).vip,
      icon: Star,
      textColor: 'text-yellow-600',
      bgLight: 'bg-yellow-50',
    },
    {
      title: 'Active Customers',
      value: stats.active,
      icon: UserCheck,
      textColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
    },
    {
      title: 'Inactive Customers',
      value: stats.inactive,
      icon: Users,
      textColor: 'text-gray-600',
      bgLight: 'bg-gray-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
      {statCards.map((card, index) => {
        const Icon = card.icon as React.ComponentType<{ className?: string }>;
        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>{formatValue(card.value)}</p>
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
