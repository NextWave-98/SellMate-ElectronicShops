import { JobSheetStatus } from '../../../types/jobsheet.types';
import { Clock, RefreshCw, Package, CheckCircle, XCircle, PauseCircle, Inbox } from 'lucide-react';

interface JobSheetStatusBadgeProps {
  status: JobSheetStatus;
}

export default function JobSheetStatusBadge({ status }: JobSheetStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case JobSheetStatus.PENDING:
        return {
          text: 'Pending',
          icon: Inbox,
          color: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      case JobSheetStatus.IN_PROGRESS:
        return {
          text: 'In Progress',
          icon: RefreshCw,
          color: 'text-orange-700',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
        };
      case JobSheetStatus.WAITING_FOR_PARTS:
        return {
          text: 'Waiting for Parts',
          icon: Package,
          color: 'text-purple-700',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
        };
      case JobSheetStatus.READY_FOR_PICKUP:
        return {
          text: 'Ready for Pickup',
          icon: CheckCircle,
          color: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case JobSheetStatus.COMPLETED:
        return {
          text: 'Completed',
          icon: CheckCircle,
          color: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case JobSheetStatus.CANCELLED:
        return {
          text: 'Cancelled',
          icon: XCircle,
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case JobSheetStatus.ON_HOLD:
        return {
          text: 'On Hold',
          icon: PauseCircle,
          color: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
      default:
        return {
          text: status,
          icon: Clock,
          color: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.text}
    </span>
  );
}
