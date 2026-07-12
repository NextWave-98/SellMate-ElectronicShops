interface PurchaseOrderStatusBadgeProps {
  status: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
}

export default function PurchaseOrderStatusBadge({ status }: PurchaseOrderStatusBadgeProps) {
  const statusConfig = {
    DRAFT: {
      label: 'Draft',
      className: 'bg-gray-100 text-gray-800',
    },
    SUBMITTED: {
      label: 'Submitted',
      className: 'bg-yellow-100 text-yellow-800',
    },
    CONFIRMED: {
      label: 'Confirmed',
      className: 'bg-orange-100 text-orange-800',
    },
    PARTIALLY_RECEIVED: {
      label: 'Partially Received',
      className: 'bg-orange-100 text-orange-800',
    },
    RECEIVED: {
      label: 'Received',
      className: 'bg-green-100 text-green-800',
    },
    COMPLETED: {
      label: 'Completed',
      className: 'bg-emerald-100 text-emerald-800',
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'bg-red-100 text-red-800',
    },
    ON_HOLD: {
      label: 'On Hold',
      className: 'bg-purple-100 text-purple-800',
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
