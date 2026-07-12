import { Shield } from 'lucide-react';
import type { WarrantyStats } from '../../../types/warranty.types';
import { formatCurrency } from '../../../utils/currency';

interface WarrantyStatsCardsProps {
  stats: WarrantyStats;
}

export default function WarrantyStatsCards({ stats }: WarrantyStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Warranties</p>
            <p className="text-2xl font-bold text-orange-600">{stats.totalWarranties}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.activeWarranties} active</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <Shield className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Pending Claims</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingClaims}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.totalClaims} total claims</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Claim Cost</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalClaimCost, { decimals: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Avg: {formatCurrency(stats.averageClaimCost, { decimals: 0 })}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Warranty Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.warrantyRevenue, { decimals: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Claim Rate: {stats.claimRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
