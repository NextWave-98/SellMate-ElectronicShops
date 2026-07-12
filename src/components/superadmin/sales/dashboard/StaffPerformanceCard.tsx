import { Users } from 'lucide-react';
import type { StaffPerformance } from '../../../../hooks/useSales';
import { formatCurrency } from '../../../../utils/currency';

interface StaffPerformanceCardProps {
  staff?: StaffPerformance[];
}

export default function StaffPerformanceCard({ staff }: StaffPerformanceCardProps) {
  if (!staff || staff.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          Top Staff
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-green-600" />
        Top Staff
      </h3>
      
      <div className="space-y-4">
        {staff.slice(0, 5).map((member, index) => (
          <div key={member.staffId} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold text-sm">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-gray-900">{member.staffName}</p>
                <p className="text-sm text-gray-500">{member.salesCount} sales</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatCurrency(member.revenue)}</p>
              <p className="text-xs text-gray-500">
                Commission: {formatCurrency(member.commission)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {staff.length > 5 && (
        <button className="mt-4 w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium">
          View All Staff
        </button>
      )}
    </div>
  );
}
