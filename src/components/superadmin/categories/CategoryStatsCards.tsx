import { FolderTree, CheckCircle, FolderOpen, Package } from 'lucide-react';

interface CategoryStatsCardsProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    withProducts: number;
  };
}

export default function CategoryStatsCards({ stats }: CategoryStatsCardsProps) {
  const cards = [
    {
      title: 'Total Categories',
      value: stats.total,
      icon: FolderTree,
      color: 'blue',
      bgColor: 'bg-orange-400',
      lightBg: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'Active Categories',
      value: stats.active,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-500',
      lightBg: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Inactive Categories',
      value: stats.inactive,
      icon: FolderOpen,
      color: 'purple',
      bgColor: 'bg-purple-500',
      lightBg: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'With Products',
      value: stats.withProducts,
      icon: Package,
      color: 'orange',
      bgColor: 'bg-orange-400',
      lightBg: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.lightBg} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
