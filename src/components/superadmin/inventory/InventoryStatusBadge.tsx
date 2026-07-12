import type { InventoryStatus } from '../../../types/inventory.types';
import { InventoryStatus as Status } from '../../../types/inventory.types';

interface InventoryStatusBadgeProps {
  status: InventoryStatus;
}

export default function InventoryStatusBadge({ status }: InventoryStatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case Status.IN_STOCK:
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          label: 'In Stock',
        };
      case Status.LOW_STOCK:
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          label: 'Low Stock',
        };
      case Status.OUT_OF_STOCK:
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          label: 'Out of Stock',
        };
      case Status.OVERSTOCKED:
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          label: 'Overstocked',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: 'Unknown',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.bg} ${styles.text}`}
    >
      {styles.label}
    </span>
  );
}
