/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import {
  AlertCircle,
  Banknote,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  RefreshCw,
  Store,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useCashDrawer, {
  type BranchesDrawerOverview,
  type BranchDrawerOverviewItem,
} from '../../hooks/useCashDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : `Rs. ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

const fmtTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return isValid(d) ? format(d, 'dd MMM yyyy, hh:mm a') : '—';
};

export default function CashDrawerOverviewPage() {
  const [searchParams] = useSearchParams();
  const { getBranchesOverview, getDrawerHistory, loading } = useCashDrawer();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [overview, setOverview] = useState<BranchesDrawerOverview | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(searchParams.get('locationId'));
  const [historyByLocation, setHistoryByLocation] = useState<Record<string, any[]>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  const loadOverview = useCallback(async () => {
    setPageLoading(true);
    try {
      const res = await getBranchesOverview(selectedDate);
      setOverview((res as any)?.data ?? null);
    } catch {
      toast.error('Failed to load cash drawer overview');
      setOverview(null);
    } finally {
      setPageLoading(false);
    }
  }, [getBranchesOverview, selectedDate]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const locId = searchParams.get('locationId');
    if (!locId || !overview?.branches?.length) return;
    const branch = overview.branches.find((b) => b.locationId === locId);
    if (!branch) return;
    setExpandedId(locId);
    setHistoryByLocation((prev) => {
      if (prev[locId]) return prev;
      void (async () => {
        setHistoryLoadingId(locId);
        try {
          const res = await getDrawerHistory(locId, 1, 15);
          setHistoryByLocation((p) => ({
            ...p,
            [locId]: (res as any)?.data ?? [],
          }));
        } catch {
          /* silent */
        } finally {
          setHistoryLoadingId(null);
        }
      })();
      return prev;
    });
  }, [searchParams, overview, getDrawerHistory]);

  const branches = useMemo(() => {
    const list = overview?.branches ?? [];
    if (statusFilter === 'ALL') return list;
    return list.filter((b) => b.status === statusFilter);
  }, [overview, statusFilter]);

  const toggleExpand = async (branch: BranchDrawerOverviewItem) => {
    if (expandedId === branch.locationId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(branch.locationId);
    if (historyByLocation[branch.locationId]) return;

    setHistoryLoadingId(branch.locationId);
    try {
      const res = await getDrawerHistory(branch.locationId, 1, 15);
      setHistoryByLocation((prev) => ({
        ...prev,
        [branch.locationId]: (res as any)?.data ?? [],
      }));
    } catch {
      toast.error('Failed to load branch history');
    } finally {
      setHistoryLoadingId(null);
    }
  };

  if (pageLoading && !overview) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const summary = overview?.summary;

  return (
    <div className="p-4 sm:p-6 space-y-6 mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="text-emerald-600" size={24} />
            Cash Drawer — All Branches
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live open/closed status, today&apos;s open counts, and branch-wise history
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[160px] h-9"
          />
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === f
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'OPEN' ? 'Open' : 'Closed'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadOverview()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin mr-1' : 'mr-1'} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Store size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Branches</p>
              <p className="text-xl font-bold text-gray-900">{summary?.totalBranches ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Banknote size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Open now</p>
              <p className="text-xl font-bold text-emerald-700">{summary?.openNow ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Closed now</p>
              <p className="text-xl font-bold text-gray-900">{summary?.closedNow ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <History size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Opens today</p>
              <p className="text-xl font-bold text-amber-700">{summary?.totalOpensToday ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Branch status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {branches.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No branches found for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Opened by</TableHead>
                    <TableHead>Opened at</TableHead>
                    <TableHead>Opening bal.</TableHead>
                    <TableHead className="text-center">Opens today</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => {
                    const isOpen = branch.status === 'OPEN';
                    const expanded = expandedId === branch.locationId;
                    return (
                      <Fragment key={branch.locationId}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50/80"
                          onClick={() => void toggleExpand(branch)}
                        >
                          <TableCell>
                            <div className="font-semibold text-gray-900">{branch.locationName}</div>
                            <div className="text-xs text-gray-400">
                              {branch.locationCode || branch.locationType}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isOpen ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Open</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200">Closed</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-700">
                            {branch.activeDrawer?.openedBy || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {fmtTime(branch.activeDrawer?.openedAt)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {branch.activeDrawer ? fmt(branch.activeDrawer.openingBalance) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex min-w-[28px] justify-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                branch.todayOpenCount > 0
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-gray-50 text-gray-400'
                              }`}
                            >
                              {branch.todayOpenCount}
                            </span>
                          </TableCell>
                          <TableCell>
                            {expanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-slate-50/70 p-4">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                                    Today&apos;s sessions ({branch.todaySessions.length})
                                  </p>
                                  {branch.todaySessions.length === 0 ? (
                                    <p className="text-sm text-gray-400">No drawer opens on this date.</p>
                                  ) : (
                                    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Opened</TableHead>
                                            <TableHead>Closed</TableHead>
                                            <TableHead>By</TableHead>
                                            <TableHead>Opening</TableHead>
                                            <TableHead>Closing</TableHead>
                                            <TableHead>Variance</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {branch.todaySessions.map((s) => (
                                            <TableRow key={s.id}>
                                              <TableCell>
                                                <Badge
                                                  className={
                                                    s.status === 'OPEN'
                                                      ? 'bg-emerald-100 text-emerald-700'
                                                      : 'bg-slate-100 text-slate-600'
                                                  }
                                                >
                                                  {s.status}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="text-xs">{fmtTime(s.openedAt)}</TableCell>
                                              <TableCell className="text-xs">{fmtTime(s.closedAt)}</TableCell>
                                              <TableCell className="text-xs">
                                                {s.openedBy}
                                                {s.closedBy ? ` → ${s.closedBy}` : ''}
                                              </TableCell>
                                              <TableCell className="text-xs">{fmt(s.openingBalance)}</TableCell>
                                              <TableCell className="text-xs">{fmt(s.closingBalance)}</TableCell>
                                              <TableCell className="text-xs">{fmt(s.variance)}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                                    Recent history
                                  </p>
                                  {historyLoadingId === branch.locationId ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                                      <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
                                    </div>
                                  ) : (historyByLocation[branch.locationId] || []).length === 0 ? (
                                    <p className="text-sm text-gray-400">No history yet.</p>
                                  ) : (
                                    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Opened</TableHead>
                                            <TableHead>Closed</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Opened by</TableHead>
                                            <TableHead>Opening</TableHead>
                                            <TableHead>Closing</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {(historyByLocation[branch.locationId] || []).map((row: any) => (
                                            <TableRow key={row.id}>
                                              <TableCell className="text-xs">{fmtTime(row.openedAt)}</TableCell>
                                              <TableCell className="text-xs">{fmtTime(row.closedAt)}</TableCell>
                                              <TableCell className="text-xs">{row.status}</TableCell>
                                              <TableCell className="text-xs">
                                                {row.openedBy?.name || row.openedBy || '—'}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {fmt(Number(row.openingBalance))}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {row.closingBalance != null
                                                  ? fmt(Number(row.closingBalance))
                                                  : '—'}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
