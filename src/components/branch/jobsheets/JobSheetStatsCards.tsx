import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TrendingUp,
  DollarSign,
  Package
} from 'lucide-react';
import { formatCurrency } from '../../../utils/currency';
import { Card, CardContent } from '@/components/ui/card';

interface JobSheetStatsCardsProps {
  stats: {
    totalJobSheets: number;
    pending: number;
    inProgress: number;
    waitingForParts: number;
    readyForPickup: number;
    completed: number;
    cancelled: number;
    onHold: number;
    totalRevenue: number;
    totalAdvancePayments: number;
    totalBalance: number;
    averageJobValue: number;
  };
}

export default function JobSheetStatsCards({ stats }: JobSheetStatsCardsProps) {

  const cards = [
    {
      title: 'Total Job Sheets',
      value: stats.totalJobSheets,
      icon: FileText,
      color: 'blue',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      title: 'Waiting for Parts',
      value: stats.waitingForParts,
      icon: Package,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Ready for Pickup',
      value: stats.readyForPickup,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'On Hold',
      value: stats.onHold,
      icon: AlertCircle,
      color: 'gray',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-200',
    },
    {
      title: 'Cancelled',
      value: stats.cancelled,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-200',
    },
  ];

  const financialCards = [
    // {
    //   title: 'Total Revenue',
    //   value: formatCurrency(stats.totalAdvancePayments),
    //   icon: DollarSign,
    //   color: 'green',
    //   bgColor: 'bg-green-50',
    //   textColor: 'text-green-600',
    //   borderColor: 'border-green-200',
    // },
    {
      title: 'Total Payments',
      value: formatCurrency(stats.totalAdvancePayments),
      icon: DollarSign,
      color: 'blue',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Total Balance',
      value: formatCurrency(stats.totalBalance),
      icon: DollarSign,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    // {
    //   title: 'Average Job Value',
    //   value: formatCurrency(stats.averageJobValue),
    //   icon: TrendingUp,
    //   color: 'purple',
    //   bgColor: 'bg-purple-50',
    //   textColor: 'text-purple-600',
    //   borderColor: 'border-purple-200',
    // },
  ];

  return (
    <div className="space-y-6">
      {/* Job Status Statistics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Job Status Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Card key={card.title} className={`${card.bgColor} ${card.borderColor} border hover:shadow-md transition-all`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.textColor} mt-1`}>{card.value}</p>
                  </div>
                  <div className={`${card.bgColor} p-3 rounded-full`}>
                    <card.icon className={`w-6 h-6 ${card.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Financial Statistics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {financialCards.map((card) => (
            <Card key={card.title} className={`${card.bgColor} ${card.borderColor} border hover:shadow-md transition-all`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className={`text-xl font-bold ${card.textColor} mt-1`}>{card.value}</p>
                  </div>
                  <div className={`${card.bgColor} p-3 rounded-full`}>
                    <card.icon className={`w-6 h-6 ${card.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
