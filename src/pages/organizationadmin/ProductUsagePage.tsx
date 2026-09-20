/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';

import {
  Package,
  RefreshCw,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  MapPin,
  User,
  Tag,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LogProductUsageModal from '../../components/superadmin/inventory/LogProductUsageModal';
import {
  useProductUsage,
  type ProductUsageRecord,
  type UsageType,
  USAGE_TYPE_LABELS,
  USAGE_TYPE_COLORS,
  COGS_LOSS_TYPES,
  INTERNAL_USE_TYPES,
  ALREADY_COUNTED_TYPES,
  type LossBucket,
} from '../../hooks/useProductUsage';
import { useLocation } from '../../hooks/useLocation';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(v?: number) {
  if (v == null) return ' ';
  return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(v);
}

const STAT_COLOR_MAP: Record<string, string> = {
  INTERNAL: 'text-yellow-600',
  JOB_SHEET: 'text-blue-600',
  REPAIR: 'text-purple-600',
  DEMO: 'text-pink-600',
  DAMAGED: 'text-red-600',
  MANUAL: 'text-gray-600',
  SALE: 'text-green-600',
  OTHER: 'text-slate-600',
  EXPIRED: 'text-orange-600',
  LOST: 'text-rose-600',
  THEFT: 'text-red-700',
  SAMPLE: 'text-teal-600',
  WRITE_OFF: 'text-red-600',
};

/** Rupee formatter with cents   loss values are small and rounding hides them. */
function formatMoney(v?: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v ?? 0));
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProductUsagePage() {
  const { getUsages, getStats } = useProductUsage();
  const { getAllLocations } = useLocation();

  const [usages, setUsages] = useState<ProductUsageRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<UsageType | ''>('');
  const [filterLocation, setFilterLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lossOnly, setLossOnly] = useState(false);
  const [filterBucket, setFilterBucket] = useState<LossBucket | ''>('');
  const [page, setPage] = useState(1);

  // Keep latest filter values in a ref so loadData always reads fresh values
  // without needing them as hook dependencies
  const filtersRef = useRef({
    page: 1,
    search: '',
    filterType: '' as UsageType | '',
    filterLocation: '',
    startDate: '',
    endDate: '',
    lossOnly: false,
    filterBucket: '' as LossBucket | '',
  });
  filtersRef.current = { page, search, filterType, filterLocation, startDate, endDate, lossOnly, filterBucket };

  async function loadData(overrides: {
    page?: number;
    search?: string;
    usageType?: UsageType | '';
    locationId?: string;
    startDate?: string;
    endDate?: string;
    lossOnly?: boolean;
    lossBucket?: LossBucket | '';
  } = {}) {
    setLoading(true);
    const f = filtersRef.current;
    try {
      const [usageRes, statsRes] = await Promise.all([
        getUsages({
          page:       overrides.page       ?? f.page,
          limit: 20,
          search:     (overrides.search     !== undefined ? overrides.search     : f.search)     || undefined,
          usageType:  (overrides.usageType  !== undefined ? overrides.usageType  : f.filterType)  || undefined,
          locationId: (overrides.locationId !== undefined ? overrides.locationId : f.filterLocation) || undefined,
          startDate:  (overrides.startDate  !== undefined ? overrides.startDate  : f.startDate)  || undefined,
          endDate:    (overrides.endDate    !== undefined ? overrides.endDate    : f.endDate)    || undefined,
          isLoss:     ((overrides.lossOnly   !== undefined ? overrides.lossOnly   : f.lossOnly) ? 'true' : undefined),
          lossBucket: (overrides.lossBucket  !== undefined ? overrides.lossBucket : f.filterBucket) || undefined,
        }),
        getStats(),
      ]);
      setUsages(usageRes.data);
      setPagination(usageRes.pagination);
      if (statsRes) setStats(statsRes);
    } finally {
      setLoading(false);
    }
  }

  // Mount-only initial load   avoid unstable hook deps that retrigger API calls
  useEffect(() => {
    void loadData();
    void (async () => {
      try {
        const locRes = await getAllLocations();
        const locData = locRes?.data as any;
        const locs = Array.isArray(locData)
          ? locData
          : Array.isArray(locData?.locations)
            ? locData.locations
            : Array.isArray(locData?.data)
              ? locData.data
              : [];
        setLocations(locs);
      } catch { /* silently fail */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRefresh() {
    setPage(1);
    void loadData({ page: 1 });
    toast.success('Refreshed');
  }

  function handleReset() {
    setSearch('');
    setFilterType('');
    setFilterLocation('');
    setStartDate('');
    setEndDate('');
    setLossOnly(false);
    setFilterBucket('');
    setPage(1);
    void loadData({ page: 1, search: '', usageType: '', locationId: '', startDate: '', endDate: '', lossOnly: false, lossBucket: '' });
  }

  function handleTypeChange(v: UsageType | '') {
    setFilterType(v);
    setPage(1);
    void loadData({ usageType: v, page: 1 });
  }

  function handleLossOnly(v: boolean) {
    setLossOnly(v);
    setPage(1);
    void loadData({ lossOnly: v, page: 1 });
  }

  function handleBucketChange(v: LossBucket | '') {
    setFilterBucket(v);
    setPage(1);
    void loadData({ lossBucket: v, page: 1 });
  }

  function handleLocationChange(v: string) {
    setFilterLocation(v);
    setPage(1);
    void loadData({ locationId: v, page: 1 });
  }

  function handleStartDate(v: string) {
    setStartDate(v);
    setPage(1);
    void loadData({ startDate: v, page: 1 });
  }

  function handleEndDate(v: string) {
    setEndDate(v);
    setPage(1);
    void loadData({ endDate: v, page: 1 });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void loadData({ page: 1 });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    void loadData({ page: newPage });
  }

  const hasFilters = search || filterType || filterLocation || startDate || endDate || lossOnly || filterBucket;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Usage</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track manual product consumption   packaging, internal use, demos, repairs and more.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Log Usage
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'All Time', value: stats.totalAll, color: 'text-gray-700' },
            { label: 'Today', value: stats.totalToday, color: 'text-blue-600' },
            { label: 'This Week', value: stats.totalThisWeek, color: 'text-purple-600' },
            { label: 'This Month', value: stats.totalThisMonth, color: 'text-orange-600' },
          ].map((s) => (
            <Card key={s.label} className="shadow-sm border border-gray-100">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">usage logs</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── What the losses actually cost ─────────────────────────────────────
          Entry counts are the wrong headline: ten damaged screen guards and one
          damaged laptop are both "1 entry". These are rupee figures, net of
          anything recovered. */}
      {Number(stats?.loss?.allTime?.zeroCostCount ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            {stats.loss.allTime.zeroCostCount} loss{' '}
            {stats.loss.allTime.zeroCostCount === 1 ? 'entry is' : 'entries are'} worth LKR 0.00
          </p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            Those products had no cost price when the usage was logged, so they reduce nothing in
            the Sales, Profit &amp; Loss or Inventory reports no matter what the period is. Set a
            cost price on the product, then log the usage again.
          </p>
        </div>
      )}

      {stats?.loss && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="shadow-sm border border-red-100 bg-red-50/40">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-red-700">Net loss this month</p>
              <p className="text-2xl font-bold mt-1 text-red-700">
                {formatMoney(stats.loss.thisMonth?.net)}
              </p>
              <p className="text-xs text-red-500/80 mt-0.5">
                {formatMoney(stats.loss.thisMonth?.gross)} lost
                {Number(stats.loss.thisMonth?.recovered) > 0 &&
                  `, ${formatMoney(stats.loss.thisMonth?.recovered)} recovered`}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500">Damaged / expired / stolen</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">
                {formatMoney(stats.loss.thisMonthCogs?.net)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">reduces gross profit</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500">Internal use / demo / sample</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">
                {formatMoney(stats.loss.thisMonthOpex?.net)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">operating expense</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500">All-time net loss</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">
                {formatMoney(stats.loss.allTime?.net)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">since records began</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Type breakdown */}
      {stats?.byType?.length > 0 && (
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">By Usage Type</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.byType.map((t: any) => (
                <div key={t.usageType} className="flex flex-col items-center bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 min-w-22.5">
                  <span className={`text-lg font-bold ${STAT_COLOR_MAP[t.usageType] ?? 'text-gray-700'}`}>
                    {t.count}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5 text-center">
                    {USAGE_TYPE_LABELS[t.usageType as UsageType] ?? t.usageType}
                  </span>
                  <span className="text-xs text-gray-400">{t.totalQuantity} units</span>
                  <span className="text-xs font-medium text-gray-600">
                    {formatMoney(Number(t.totalCost ?? 0))}
                  </span>
                  {Number(t.zeroCostCount ?? 0) > 0 && (
                    <span className="text-[10px] text-amber-600 mt-0.5">
                      {t.zeroCostCount} with no cost
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <form onSubmit={handleSearchSubmit} className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => void loadData({ page: 1 })}
                placeholder="Search product name or code…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </form>
            <select
              value={filterType}
              onChange={(e) => handleTypeChange(e.target.value as UsageType | '')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Types</option>
              <optgroup label="Stock loss (reduces gross profit)">
                {COGS_LOSS_TYPES.map((k) => (
                  <option key={k} value={k}>{USAGE_TYPE_LABELS[k]}</option>
                ))}
              </optgroup>
              <optgroup label="Internal use (operating expense)">
                {INTERNAL_USE_TYPES.map((k) => (
                  <option key={k} value={k}>{USAGE_TYPE_LABELS[k]}</option>
                ))}
              </optgroup>
              <optgroup label="Already costed elsewhere">
                {ALREADY_COUNTED_TYPES.map((k) => (
                  <option key={k} value={k}>{USAGE_TYPE_LABELS[k]}</option>
                ))}
              </optgroup>
              <optgroup label="Other">
                <option value="MANUAL">{USAGE_TYPE_LABELS.MANUAL}</option>
                <option value="OTHER">{USAGE_TYPE_LABELS.OTHER}</option>
              </optgroup>
            </select>
            <select
              value={filterBucket}
              onChange={(e) => handleBucketChange(e.target.value as LossBucket | '')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All P&amp;L buckets</option>
              <option value="COGS">Cost of goods sold</option>
              <option value="OPEX">Operating expense</option>
            </select>
            <select
              value={filterLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Locations</option>
              {locations.map((l: any) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDate(e.target.value)}
                className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDate(e.target.value)}
                className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={lossOnly}
                onChange={(e) => handleLossOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              Only entries that reduce profit
            </label>
            {hasFilters && (
              <button
                onClick={handleReset}
                className="text-xs text-orange-600 hover:underline flex items-center gap-1"
              >
                <Filter className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="md" />
            </div>
          ) : usages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">No usage records found</p>
              <p className="text-sm mt-1">Click "Log Usage" to record product consumption.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">By</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usages.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 max-w-45 truncate">
                          {u.product?.name ?? ' '}
                        </div>
                        <div className="text-xs text-gray-400">{u.product?.productCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium ${USAGE_TYPE_COLORS[u.usageType]}`}
                        >
                          {USAGE_TYPE_LABELS[u.usageType] ?? u.usageType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 max-w-50 truncate" title={u.reason}>
                          {u.reason}
                        </div>
                        {u.referenceNumber && (
                          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Tag className="h-3 w-3" />{u.referenceNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">{u.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
                        {formatCurrency(u.totalCost)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600 text-xs">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {u.location?.name ?? ' '}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600 text-xs">
                          <User className="h-3 w-3 shrink-0" />
                          {u.performer ? u.performer.name : ' '}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDateTime(u.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1.5 text-sm text-gray-600 font-medium border rounded-md">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(pagination.totalPages, page + 1))}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal   mount only when open to avoid extra inventory hook / API churn */}
      {showModal && (
        <LogProductUsageModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          inventoryItem={null}
          locations={locations}
          onSuccess={() => { void loadData(); }}
        />
      )}
    </div>
  );
}
