import { AlertTriangle } from 'lucide-react';

interface ExpiringWarrantiesAlertProps {
  count: number;
}

export default function ExpiringWarrantiesAlert({ count }: ExpiringWarrantiesAlertProps) {
  if (count <= 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
        <div>
          <h3 className="text-sm font-semibold text-yellow-900">Expiring Warranties</h3>
          <p className="text-sm text-yellow-700 mt-1">
            {count} warranties are expiring this month
          </p>
        </div>
      </div>
    </div>
  );
}
