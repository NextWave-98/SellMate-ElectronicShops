interface SupplierStatusBadgeProps {
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'PENDING_APPROVAL';
}

export default function SupplierStatusBadge({ status }: SupplierStatusBadgeProps) {
  const statusConfig = {
    ACTIVE: {
      label: 'Active',
      className: 'bg-green-100 text-green-800',
    },
    INACTIVE: {
      label: 'Inactive',
      className: 'bg-gray-100 text-gray-800',
    },
    BLACKLISTED: {
      label: 'Blacklisted',
      className: 'bg-red-100 text-red-800',
    },
    PENDING_APPROVAL: {
      label: 'Pending Approval',
      className: 'bg-yellow-100 text-yellow-800',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
