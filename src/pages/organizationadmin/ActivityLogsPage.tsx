import { useEffect, useState, useCallback, Fragment } from 'react';
import {
  ClipboardList,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Activity,
  Filter,
  X,
  User,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useActivityLog, { type ActivityLogEntry, type ActivityLogPage } from '@/hooks/useActivityLog';

// ── Helpers ────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string; badge: string }> = {
  CREATE: { label: 'Create', icon: Plus,    bg: 'bg-green-100',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700 border-green-200' },
  UPDATE: { label: 'Update', icon: Edit,    bg: 'bg-blue-100',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700 border-blue-200'   },
  DELETE: { label: 'Delete', icon: Trash2,  bg: 'bg-red-100',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700 border-red-200'      },
};

const DEFAULT_ACTION = { label: 'Action', icon: Activity, bg: 'bg-gray-100', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700 border-gray-200' };

function formatModuleName(module: string) {
  return module.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

// ── Payload value renderer ─────────────────────────────────────────────────

function formatFieldLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim().replace(/^\w/, c => c.toUpperCase());
}

function PayloadValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  // Boolean → colored badge
  if (typeof value === 'boolean') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
        value ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
      }`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  // Array of objects → mini table
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
    const cols = Array.from(new Set(value.flatMap(item => Object.keys(item as object))));
    return (
      <div className="rounded-lg border border-violet-100 overflow-hidden mt-0.5">
        <table className="w-full text-xs">
          <thead className="bg-violet-50">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold text-violet-700 text-[10px] uppercase tracking-wide">#</th>
              {cols.map(c => (
                <th key={c} className="px-2 py-1.5 text-left font-semibold text-violet-700 text-[10px] uppercase tracking-wide">
                  {formatFieldLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-50">
            {(value as Record<string, unknown>[]).map((row, i) => (
              <tr key={i} className="hover:bg-violet-50/40">
                <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                {cols.map(c => (
                  <td key={c} className="px-2 py-1.5 text-gray-700">
                    {row[c] == null ? <span className="text-gray-300">—</span> : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Array of primitives → pill list
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-300 text-xs">empty</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {(value as unknown[]).map((v, i) => (
          <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">{String(v)}</span>
        ))}
      </div>
    );
  }

  // Plain object → nested key-value
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v != null && v !== '');
    if (entries.length === 0) return <span className="text-gray-300 text-xs">—</span>;
    return (
      <div className="space-y-0.5 pl-2 border-l-2 border-gray-200">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="text-gray-400 font-medium shrink-0">{formatFieldLabel(k)}:</span>
            <span className="text-gray-700 font-mono break-all">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  // Number with currency hint
  if (typeof value === 'number') {
    const lk = fieldKey.toLowerCase();
    if (lk.includes('price') || lk.includes('amount') || lk.includes('charge') || lk.includes('value') || lk.includes('cost')) {
      return <span className="font-semibold text-gray-800">LKR {value.toLocaleString()}</span>;
    }
    return <span className="font-mono text-gray-800">{value}</span>;
  }

  // String
  return <span className="text-gray-800 break-all">{String(value)}</span>;
}

// ── Unique module list helper (from loaded logs) ────────────────────────────

function uniqueModules(logs: ActivityLogEntry[]): string[] {
  return Array.from(new Set(logs.map((l) => l.module))).sort();
}

// ── Page Component ─────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function ActivityLogsPage() {
  const { getActivityLogs } = useActivityLog();

  const [data, setData]       = useState<ActivityLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch]     = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(25);

  type LoadFilters = { action?: string; module?: string; search?: string; fromDate?: string; toDate?: string };

  const load = useCallback(
    async (opts: { pg?: number; lim?: number; silent?: boolean; filters?: LoadFilters } = {}) => {
      const pg  = opts.pg  ?? page;
      const lim = opts.lim ?? limit;
      // Allow the caller to override the filters (e.g. Clear) so we never read stale state.
      const f: LoadFilters = opts.filters ?? {
        action: filterAction, module: filterModule, search, fromDate, toDate,
      };
      if (!opts.silent) setLoading(true);
      const result = await getActivityLogs({
        page: pg,
        limit: lim,
        action: f.action || undefined,
        module: f.module || undefined,
        search: f.search || undefined,
        fromDate: f.fromDate || undefined,
        toDate:   f.toDate   || undefined,
      });
      setData(result);
      setLoading(false);
      setRefreshing(false);
    },
    [getActivityLogs, page, limit, filterAction, filterModule, search, fromDate, toDate]
  );

  useEffect(() => { load(); }, [page, limit]);   // re-load when page/limit changes

  const applyFilters = () => {
    // If already on page 1 the page effect won't re-fire, so load explicitly;
    // otherwise resetting the page triggers the effect (avoids a double fetch).
    if (page === 1) load({ pg: 1 });
    else setPage(1);
  };

  const clearFilters = () => {
    setFilterAction('');
    setFilterModule('');
    setFromDate('');
    setToDate('');
    setSearch('');
    setPage(1);
    // Reload immediately with empty filters — passing them explicitly avoids
    // reading the not-yet-updated state.
    load({ pg: 1, filters: {} });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    load({ silent: true });
  };

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const result = await getActivityLogs({
        page: 1,
        limit: 10000,
        action: filterAction || undefined,
        module: filterModule || undefined,
        search: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      const logs = result?.activityLogs ?? [];
      const headers = ['Action', 'Module', 'User', 'Record ID', 'IP Address', 'Path', 'Status Code', 'Time'];
      const rows = logs.map(log => {
        const details = (log as any).details ?? {};
        return [
          log.action,
          log.module,
          log.userName ?? '',
          log.recordId ?? '',
          log.ipAddress ?? '',
          details.path ?? '',
          details.statusCode ?? '',
          new Date(log.createdAt).toLocaleString(),
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  }, [getActivityLogs, filterAction, filterModule, search, fromDate, toDate]);

  const hasActiveFilters = filterAction || filterModule || fromDate || toDate || search;

  // Search is applied on the server (all pages), so render the returned page as-is.
  const visibleLogs = data?.activityLogs ?? [];

  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  // Prefer the full distinct module list from the API; fall back to the current page.
  const knownModules = data?.availableModules?.length
    ? [...data.availableModules].sort()
    : uniqueModules(data?.activityLogs ?? []);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-violet-100 p-2.5 rounded-xl">
            <ClipboardList className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
            <p className="text-sm text-gray-500">
              {pagination ? `${pagination.total.toLocaleString()} total records` : 'Organization audit trail'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={showFilters || hasActiveFilters ? 'border-violet-400 text-violet-700 bg-violet-50' : ''}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 bg-violet-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">●</span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-violet-500' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
            <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <Card className="rounded-2xl border-violet-100">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search module, user, record ID, IP…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* Action filter */}
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-violet-300 appearance-none"
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
              </div>

              {/* Module filter */}
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-violet-300 appearance-none"
                >
                  <option value="">All Modules</option>
                  {knownModules.map((m) => (
                    <option key={m} value={m}>{formatModuleName(m)}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="From date"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="To date"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 lg:col-span-2 justify-end">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                    <X className="w-4 h-4 mr-1" /> Clear
                  </Button>
                )}
                <Button size="sm" onClick={applyFilters} className="bg-violet-600 hover:bg-violet-700 text-white">
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Table ── */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-0">

          {/* Table header */}
          <div className="px-5 py-3 border-b border-white/20 flex items-center justify-between bg-white/20 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {loading ? 'Loading…' : `${visibleLogs.length} of ${pagination?.total ?? 0} entries`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Rows per page</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="text-xs border border-white/40 rounded-lg px-2 py-1 bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-violet-300"
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 bg-white/20 backdrop-blur-sm">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Action</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Record ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Time</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        Loading activity logs…
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && visibleLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">
                      <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                      No activity records found
                    </td>
                  </tr>
                )}
                {!loading && visibleLogs.map((log) => {
                  const cfg = ACTION_CONFIG[log.action] ?? DEFAULT_ACTION;
                  const ActionIcon = cfg.icon;
                  const isExpanded = expandedRow === log.id;
                  const details = (log as any).details as Record<string, unknown> | undefined;
                  const hasDetails = details && Object.keys(details).length > 0;
                  return (
                    <Fragment key={log.id}>
                    <tr
                      className={`hover:bg-white/30 transition-colors cursor-pointer ${isExpanded ? 'bg-white/20' : ''}`}
                      onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                    >
                      {/* Action */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                          <ActionIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      {/* Module */}
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-gray-800">{formatModuleName(log.module)}</span>
                      </td>
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-violet-600" />
                          </div>
                          <span className="text-gray-600 text-xs truncate max-w-36">{log.userName ?? '—'}</span>
                        </div>
                      </td>
                      {/* Record ID */}
                      <td className="px-5 py-3.5">
                        {log.recordId ? (
                          <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {log.recordId.length > 12 ? `${log.recordId.slice(0, 8)}…` : log.recordId}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      {/* IP */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-gray-400 font-mono">{log.ipAddress ?? '—'}</span>
                      </td>
                      {/* Time */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-medium text-gray-700">{formatRelative(log.createdAt)}</span>
                          <span className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
                        </div>
                      </td>
                      {/* Expand toggle */}
                      <td className="px-2 py-3.5 text-center">
                        {hasDetails
                          ? isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          : null}
                      </td>
                    </tr>
                    {/* Expanded details row */}
                    {isExpanded && hasDetails && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-6 py-4">
                          {/* Meta strip */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {details!.method && (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${
                                details!.method === 'GET' ? 'bg-green-100 text-green-700' :
                                details!.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                                details!.method === 'PUT' || details!.method === 'PATCH' ? 'bg-amber-100 text-amber-700' :
                                details!.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{String(details!.method)}</span>
                            )}
                            {details!.path && (
                              <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md break-all">
                                {String(details!.path)}
                              </span>
                            )}
                            {details!.statusCode && (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                                Number(details!.statusCode) < 300 ? 'bg-green-100 text-green-700' :
                                Number(details!.statusCode) < 400 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {String(details!.statusCode)}
                              </span>
                            )}
                            {log.recordId && (
                              <span className="ml-auto font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md hidden lg:inline">
                                ID: {log.recordId}
                              </span>
                            )}
                          </div>

                          {/* Payload */}
                          {details!.body && Object.keys(details!.body as object).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Payload</p>
                              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                  <tbody>
                                    {Object.entries(details!.body as Record<string, unknown>)
                                      .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                      .map(([key, val]) => (
                                        <tr key={key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 align-top">
                                          <td className="px-3 py-2.5 font-semibold text-gray-500 w-44 shrink-0 whitespace-nowrap">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim().replace(/^\w/, c => c.toUpperCase())}
                                          </td>
                                          <td className="px-3 py-2.5 text-gray-800">
                                            <PayloadValue fieldKey={key} value={val} />
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/20">
            {loading && (
              <div className="px-5 py-16 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                Loading…
              </div>
            )}
            {!loading && visibleLogs.length === 0 && (
              <div className="px-5 py-16 text-center text-gray-400 text-sm">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                No activity records found
              </div>
            )}
            {!loading && visibleLogs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] ?? DEFAULT_ACTION;
              const ActionIcon = cfg.icon;
              return (
                <div key={log.id} className="px-4 py-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                      <ActionIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400">{formatRelative(log.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{formatModuleName(log.module)}</span>
                    {log.recordId && (
                      <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        #{log.recordId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <User className="w-3.5 h-3.5" />
                    {log.userName ?? '—'}
                    {log.ipAddress && <span className="ml-2 font-mono text-gray-400">{log.ipAddress}</span>}
                  </div>
                  <p className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</p>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-5 py-4 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/20 backdrop-blur-sm">
              <p className="text-xs text-gray-500">
                Page <span className="font-semibold text-gray-700">{pagination.page}</span> of{' '}
                <span className="font-semibold text-gray-700">{pagination.totalPages}</span>
                {' '}· {pagination.total.toLocaleString()} total records
              </p>

              <div className="flex items-center gap-1.5">
                {/* First */}
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-white/40 text-gray-600 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>
                {/* Prev */}
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-white/40 text-gray-600 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return p <= totalPages ? (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        p === page
                          ? 'bg-violet-600 text-white border-violet-600 font-semibold'
                          : 'border-white/40 text-gray-600 hover:bg-white/30'
                      }`}
                    >
                      {p}
                    </button>
                  ) : null;
                })}

                {/* Next */}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-white/40 text-gray-600 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {/* Last */}
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-white/40 text-gray-600 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
