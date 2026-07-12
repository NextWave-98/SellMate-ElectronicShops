import { StaffStatus } from '../../../types/staff.types';

interface StaffStatusBadgeProps {
  status: StaffStatus;
}

export default function StaffStatusBadge({ status }: StaffStatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case StaffStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-200';
      case StaffStatus.INACTIVE:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case StaffStatus.ON_LEAVE:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case StaffStatus.SUSPENDED:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case StaffStatus.TERMINATED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case StaffStatus.ACTIVE:
        return 'Active';
      case StaffStatus.INACTIVE:
        return 'Inactive';
      case StaffStatus.ON_LEAVE:
        return 'On Leave';
      case StaffStatus.SUSPENDED:
        return 'Suspended';
      case StaffStatus.TERMINATED:
        return 'Terminated';
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles()}`}
    >
      {getStatusText()}
    </span>
  );
}
