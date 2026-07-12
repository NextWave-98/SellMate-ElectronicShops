interface ShopStatusBadgeProps {
  status: boolean;
}

export default function ShopStatusBadge({ status }: ShopStatusBadgeProps) {
  const getStatusStyles = () => {
    return status
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusText = () => {
    return status ? 'Active' : 'Inactive';
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles()}`}
    >
      {getStatusText()}
    </span>
  );
}
