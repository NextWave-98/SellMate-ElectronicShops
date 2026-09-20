/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useCallback } from 'react';
import {
  Truck, CheckCircle, XCircle, AlertCircle, RefreshCw,
  TrendingUp, TrendingDown, DollarSign, Users, Package,
  Clock, BarChart2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/currency';
import useBranchSales from '../../hooks/useBranchSales';

// ─── Types ───────────────────────────────────────────────────────────────────
interface StaffEntry {
  userId: string;
  userName: string;
  total: number;
  delivered: number;
  returned: number;
  cancelled: number;
  successRate: number;
  codAmount: number;
}

interface CODStats {
  totalShipments: number;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
}

interface PerformanceStats {
  total: number;
  delivered: number;
  returned: number;
  cancelled: number;
  failedDelivery: number;
  inTransit: number;
  outForDelivery: number;
  pending: number;
  pendingPickup: number;
  pickedUp: number;
  onHold: number;
  successRate: number;
  returnRate: number;
  cod: CODStats;
  staffPerformance: StaffEntry[];
  recentShipments: any[];
}

// ─── Period options ──────────────────────────────────────────────────────────
const PERIODS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pct = (n: number) => `${n.toFixed(1)}%`;

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    DELIVERED: 'bg-green-100 text-green-700',
    RETURNED: 'bg-red-100 text-red-700',
    RETURNED_TO_SENDER: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
    IN_TRANSIT: 'bg-blue-100 text-blue-700',
    OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    FAILED_DELIVERY: 'bg-rose-100 text-rose-700',
    DELIVERY_FAILED: 'bg-rose-100 text-rose-700',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CourierPerformancePage = () => {
  const { getBranchCourierStats } = useBranchSales();

  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (period === 'custom') {
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
      } else if (period !== 'all') {
        filters.period = period;
      }
      const res = await getBranchCourierStats(filters);
      if (res?.data) setStats(res.data as PerformanceStats);
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  // ── Stat card ──────────────────────────────────────────────────────────────
  const StatCard = ({
    label, value, sub, icon: Icon, color, bg,
  }: {
    label: string; value: number | string; sub?: string;
    icon: any; color: string; bg: string;
  }) => (
    <Card className="p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            Courier Performance
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Branch shipment success rates, staff stats & COD</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Period filter */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <input
                type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm"> </span>
              <input
                type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">Loading performance data…</span>
        </div>
      )}

      {!loading && stats && (
        <>
          {/* ── Overview stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Shipments" value={stats.total}
              icon={Package} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Delivered" value={stats.delivered}
              sub={`${pct(stats.successRate)} success rate`}
              icon={CheckCircle} color="text-green-600" bg="bg-green-50" />
            <StatCard label="Returned" value={stats.returned}
              sub={`${pct(stats.returnRate)} return rate`}
              icon={XCircle} color="text-red-600" bg="bg-red-50" />
            <StatCard label="Cancelled" value={stats.cancelled}
              icon={AlertCircle} color="text-gray-500" bg="bg-gray-100" />
          </div>

          {/* ── Success rate highlight ── */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-1">Overall Success Rate</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-gray-900">{pct(stats.successRate)}</span>
                  {stats.successRate >= 70
                    ? <span className="flex items-center text-green-600 text-sm font-medium mb-1"><TrendingUp className="w-4 h-4 mr-0.5" />Good</span>
                    : <span className="flex items-center text-red-500 text-sm font-medium mb-1"><TrendingDown className="w-4 h-4 mr-0.5" />Needs attention</span>}
                </div>
                <div className="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                    style={{ width: `${Math.min(stats.successRate, 100)}%` }}
                  />
                </div>
              </div>
              {/* Mini status breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center min-w-[260px]">
                {[
                  { label: 'In Transit', value: stats.inTransit, color: 'text-blue-600' },
                  { label: 'Out for Del.', value: stats.outForDelivery, color: 'text-orange-600' },
                  { label: 'Pending', value: stats.pending + stats.pendingPickup, color: 'text-yellow-600' },
                  { label: 'Picked Up', value: stats.pickedUp, color: 'text-indigo-600' },
                  { label: 'Failed', value: stats.failedDelivery, color: 'text-rose-600' },
                  { label: 'On Hold', value: stats.onHold, color: 'text-purple-600' },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg py-2 px-1">
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* ── COD Stats ── */}
          {stats.cod.totalShipments > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-yellow-500" /> COD Collection
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-4 border-l-4 border-l-yellow-400">
                  <p className="text-xs text-gray-500 font-medium">COD Shipments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.cod.totalShipments}</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-blue-400">
                  <p className="text-xs text-gray-500 font-medium">Total COD Value</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.cod.totalAmount)}</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-green-400">
                  <p className="text-xs text-gray-500 font-medium">Collected</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(stats.cod.collectedAmount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                    {stats.cod.totalAmount > 0
                      ? pct((stats.cod.collectedAmount / stats.cod.totalAmount) * 100)
                      : '0%'} collected
                  </p>
                </Card>
                <Card className="p-4 border-l-4 border-l-orange-400">
                  <p className="text-xs text-gray-500 font-medium">Pending</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.cod.pendingAmount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-0.5">
                    <ArrowDownRight className="w-3 h-3 text-orange-400" />
                    in transit
                  </p>
                </Card>
              </div>
            </div>
          )}

          {/* ── Staff Performance ── */}
          {stats.staffPerformance.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" /> Staff Performance
              </h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Staff</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Orders</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivered</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Returned</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cancelled</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">COD Value</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Success %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.staffPerformance.map((s, i) => (
                        <tr key={s.userId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {s.userName.charAt(0).toUpperCase()}
                              </div>
                              {s.userName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 font-medium">{s.total}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-green-700 font-medium">{s.delivered}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-red-600 font-medium">{s.returned}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-gray-500">{s.cancelled}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(s.codAmount)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${s.successRate >= 70 ? 'bg-green-500' : s.successRate >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                  style={{ width: `${Math.min(s.successRate, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold ${s.successRate >= 70 ? 'text-green-600' : s.successRate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {pct(s.successRate)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── Recent Shipments ── */}
          {stats.recentShipments.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" /> Recent Shipments
              </h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipment #</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tracking</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.recentShipments.map((s, i) => (
                        <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-3 font-medium text-blue-600">{s.shipment_number}</td>
                          <td className="px-4 py-3 text-gray-700">{s.recipient_name || ' '}</td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.tracking_number || ' '}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {s.declared_value ? formatCurrency(Number(s.declared_value)) : ' '}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs">
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ' '}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <StatusBadge status={s.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {stats.total === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No shipments found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different date range</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CourierPerformancePage;
