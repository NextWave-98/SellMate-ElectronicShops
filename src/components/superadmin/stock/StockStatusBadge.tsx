import { StockStatus } from '../../../types/stock.types';
import { AlertCircle, CheckCircle, XCircle, Ban, Clock } from 'lucide-react';

interface StockStatusBadgeProps {
  status: StockStatus;
}

export default function StockStatusBadge({ status }: StockStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case StockStatus.IN_STOCK:
        return {
          text: 'In Stock',
          icon: CheckCircle,
          color: 'text-green-800',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
        };
      case StockStatus.LOW_STOCK:
        return {
          text: 'Low Stock',
          icon: AlertCircle,
          color: 'text-yellow-800',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
        };
      case StockStatus.OUT_OF_STOCK:
        return {
          text: 'Out of Stock',
          icon: XCircle,
          color: 'text-red-800',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
        };
      case StockStatus.DISCONTINUED:
        return {
          text: 'Discontinued',
          icon: Ban,
          color: 'text-gray-800',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
        };
      case StockStatus.BACK_ORDER:
        return {
          text: 'Back Order',
          icon: Clock,
          color: 'text-orange-800',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200',
        };
      default:
        return {
          text: status,
          icon: AlertCircle,
          color: 'text-gray-800',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      <Icon className="w-3 h-3" />
      {config.text}
    </span>
  );
}
