import React, { useEffect, useState } from 'react';
import useFetch from '../../../hooks/useFetch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { TrendingUp, DollarSign, Calendar, AlertCircle, Loader2 } from 'lucide-react';

interface UsageStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentialId: string;
}

interface UsageStats {
  currentMonthUsage: number;
  monthlyQuota: number | string;
  quotaRemaining: number | string;
  usagePercentage: string;
  totalCost: number;
  costPerUnit: number | null;
  quotaResetDate: string | null;
  isQuotaExceeded: boolean;
}

const UsageStatsModal: React.FC<UsageStatsModalProps> = ({
  isOpen,
  onClose,
  credentialId,
}) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const { fetchData, loading } = useFetch();

  useEffect(() => {
    if (isOpen && credentialId) {
      loadStats();
    }
  }, [isOpen, credentialId]);

  const loadStats = async () => {
    const response = await fetchData({
      endpoint: `/api/communication-credentials/${credentialId}/usage`,
      method: 'GET',
      silent: true,
    });

    if (response?.data) {
      setStats(response.data as UsageStats);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Usage Statistics</DialogTitle>
          <DialogDescription>
            Detailed usage and cost information for this credential
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Usage</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.currentMonthUsage}</div>
                <p className="text-xs text-muted-foreground">
                  messages sent this month
                </p>
              </CardContent>
            </Card>

            {/* Monthly Quota */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Quota</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {typeof stats.monthlyQuota === 'number'
                    ? stats.monthlyQuota.toLocaleString()
                    : stats.monthlyQuota}
                </div>
                <p className="text-xs text-muted-foreground">
                  {typeof stats.quotaRemaining === 'number'
                    ? `${stats.quotaRemaining.toLocaleString()} remaining`
                    : stats.quotaRemaining}
                </p>
              </CardContent>
            </Card>

            {/* Usage Percentage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usage Percentage</CardTitle>
                {stats.isQuotaExceeded ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    stats.isQuotaExceeded ? 'text-red-600' : ''
                  }`}
                >
                  {stats.usagePercentage}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.isQuotaExceeded
                    ? 'Quota exceeded!'
                    : 'of monthly allowance used'}
                </p>
              </CardContent>
            </Card>

            {/* Total Cost */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.totalCost.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.costPerUnit
                    ? `at $${stats.costPerUnit.toFixed(4)} per unit`
                    : 'lifetime cost'}
                </p>
              </CardContent>
            </Card>

            {/* Quota Reset Date */}
            {stats.quotaResetDate && (
              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Quota Reset Date
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {new Date(stats.quotaResetDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usage counter will reset on this date
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quota Exceeded Warning */}
            {stats.isQuotaExceeded && (
              <Card className="md:col-span-2 bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900">Quota Exceeded</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This credential has exceeded its monthly quota. Messages will not
                        be sent until the quota is reset or increased.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Usage Progress Bar */}
            {typeof stats.monthlyQuota === 'number' && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Usage Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all ${
                        stats.isQuotaExceeded
                          ? 'bg-red-600'
                          : parseFloat(stats.usagePercentage) > 80
                          ? 'bg-yellow-600'
                          : 'bg-green-600'
                      }`}
                      style={{
                        width: `${Math.min(
                          parseFloat(stats.usagePercentage) || 0,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>0</span>
                    <span>{stats.currentMonthUsage}</span>
                    <span>{stats.monthlyQuota}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No usage data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UsageStatsModal;
