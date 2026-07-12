import { Building2, TrendingUp, TrendingDown } from 'lucide-react';
import type { BranchPerformance } from '../../../../hooks/useSales';
import { formatCurrency } from '../../../../utils/currency';

interface BranchPerformanceCardProps {
  branches?: BranchPerformance[];
}

export default function BranchPerformanceCard({ branches }: BranchPerformanceCardProps) {
  if (!branches || branches.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-orange-600" />
          Top Branches
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
        <Building2 className="w-5 h-5 text-orange-600" />
        Top Branches
      </h3>
      
      <div className="space-y-4">
        {branches.slice(0, 5).map((branch, index) => (
          <div key={branch.locationId} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-gray-900">{branch.locationName}</p>
                <p className="text-sm text-gray-500">{branch.salesCount} sales</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatCurrency(branch.revenue)}</p>
              <div className="flex items-center justify-end gap-1">
                {branch.growth > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+{branch.growth.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600">{branch.growth.toFixed(1)}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
