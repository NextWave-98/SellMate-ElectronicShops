import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface QuickStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  trend?: number;
  subtitle?: string;
}

export default function QuickStatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  trend,
  subtitle,
}: QuickStatsCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive && (
                <>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    +{Math.abs(trend).toFixed(1)}%
                  </span>
                </>
              )}
              {isNegative && (
                <>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">
                    {trend.toFixed(1)}%
                  </span>
                </>
              )}
              {!isPositive && !isNegative && (
                <span className="text-sm font-medium text-gray-500">0%</span>
              )}
              <span className="text-xs text-gray-500 ml-1">vs last period</span>
            </div>
          )}

          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        <div className={`${iconColor} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
