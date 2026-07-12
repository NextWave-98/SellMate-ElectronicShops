import { JobPriority } from '../../../types/jobsheet.types';
import { AlertCircle, AlertTriangle, Flag, Zap } from 'lucide-react';

interface JobSheetPriorityBadgeProps {
  priority: JobPriority;
}

export default function JobSheetPriorityBadge({ priority }: JobSheetPriorityBadgeProps) {
  const getPriorityConfig = () => {
    switch (priority) {
      case JobPriority.LOW:
        return {
          text: 'Low',
          icon: Flag,
          color: 'text-gray-700',
          bgColor: 'bg-gray-50',
        };
      case JobPriority.MEDIUM:
        return {
          text: 'Medium',
          icon: AlertCircle,
          color: 'text-orange-700',
          bgColor: 'bg-orange-50',
        };
      case JobPriority.HIGH:
        return {
          text: 'High',
          icon: AlertTriangle,
          color: 'text-orange-700',
          bgColor: 'bg-orange-50',
        };
      case JobPriority.URGENT:
        return {
          text: 'Urgent',
          icon: Zap,
          color: 'text-red-700',
          bgColor: 'bg-red-50',
        };
      default:
        return {
          text: priority,
          icon: Flag,
          color: 'text-gray-700',
          bgColor: 'bg-gray-50',
        };
    }
  };

  const config = getPriorityConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.bgColor} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.text}
    </span>
  );
}
