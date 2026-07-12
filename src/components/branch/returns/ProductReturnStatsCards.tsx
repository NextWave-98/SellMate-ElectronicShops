import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  RotateCcw
} from 'lucide-react';

interface ProductReturnStatsCardsProps {
  stats: {
    totalReturns: number;
    pendingReturns: number;
    approvedReturns: number;
    rejectedReturns: number;
    completedReturns: number;
    totalValue: number;
    totalRefunded: number;
    averageProcessingTime: number;
  };
}

export default function ProductReturnStatsCards({ stats }: ProductReturnStatsCardsProps) {
  const formatCurrency = (amount: number | undefined) => {
    if (amount == null) return 'LKR 0';
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  const formatTime = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
  };

  const statusCards = [
    {
      title: 'Total Returns',
      value: stats.totalReturns,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Pending',
      value: stats.pendingReturns,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
    },
    {
      title: 'Approved',
      value: stats.approvedReturns,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      title: 'Rejected',
      value: stats.rejectedReturns,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-200',
    },
    {
      title: 'Completed',
      value: stats.completedReturns,
      icon: RotateCcw,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
    },
  ];

  const financialCards = [
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      title: 'Total Refunded',
      value: formatCurrency(stats.totalRefunded),
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      title: 'Avg Processing Time',
      value: formatTime(stats.averageProcessingTime),
      icon: TrendingUp,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Success Rate',
      value: stats.totalReturns > 0
        ? `${Math.round((stats.completedReturns / stats.totalReturns) * 100)}%`
        : '0%',
      icon: AlertCircle,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Return Status Statistics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Return Status Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statusCards.map((card) => (
            <div
              key={card.title}
              className={`${card.bgColor} ${card.borderColor} border rounded-lg p-4 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.textColor} mt-1`}>
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-full`}>
                  <card.icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Statistics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {financialCards.map((card) => (
            <div
              key={card.title}
              className={`${card.bgColor} ${card.borderColor} border rounded-lg p-4 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className={`text-xl font-bold ${card.textColor} mt-1`}>
                    {card.value}
                  </p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-full`}>
                  <card.icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}