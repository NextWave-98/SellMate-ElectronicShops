import { SaleStatus } from '../../../types/sales.types';
import { CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';

interface SalesStatusBadgeProps {
  status: SaleStatus;
}

export default function SalesStatusBadge({ status }: SalesStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case SaleStatus.COMPLETED:
        return {
          text: 'Completed',
          icon: CheckCircle,
          color: 'text-green-800',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
        };
      case SaleStatus.PENDING:
        return {
          text: 'Pending',
          icon: Clock,
          color: 'text-yellow-800',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
        };
      case SaleStatus.CANCELLED:
        return {
          text: 'Cancelled',
          icon: XCircle,
          color: 'text-red-800',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
        };
      case SaleStatus.REFUNDED:
        return {
          text: 'Refunded',
          icon: RotateCcw,
          color: 'text-orange-800',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200',
        };
      default:
        return {
          text: status,
          icon: Clock,
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
