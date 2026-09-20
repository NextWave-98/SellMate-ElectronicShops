/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import useCashDrawer, { type CashDrawerRecord, type DayBalanceSummary } from '../../hooks/useCashDrawer';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  History,
  Landmark,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isValid } from 'date-fns';

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
  n == null ? ' ' : `Rs. ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

const varianceBadge = (variance: number | null) => {
  if (variance == null) return null;
  const abs = Math.abs(variance);
  if (abs < 0.01) return <Badge className="bg-green-100 text-green-700 border-green-200">Balanced</Badge>;
  if (variance > 0) return <Badge className="bg-blue-100 text-blue-700 border-blue-200">+{fmt(variance)} Over</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200">{fmt(variance)} Short</Badge>;
};

// ─────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}) {
  const colours = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    green: 'bg-green-50 text-green-600 ring-green-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    purple: 'bg-purple-50 text-purple-600 ring-purple-100',
    red: 'bg-red-50 text-red-600 ring-red-100',
  };
  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ring-1 ${colours[accent]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentBar({ label, icon, amount, total }: { label: string; icon: React.ReactNode; amount: number; total: number }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-1.5 text-gray-700">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-right">
          <span className="font-semibold text-gray-900">{fmt(amount)}</span>
          <span className="text-gray-400 ml-1.5">({pct}%)</span>
        </div>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────
export default function CashDrawerPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canViewHistory = hasPermission(PERMISSIONS.SALES_READ);
  const locationId: string = (user as any)?.locationId || (user as any)?.branchId || '';
  const { openDrawer, closeDrawer, getActiveDrawer, getDayBalance, getDrawerHistory, loading } = useCashDrawer();

  // State
  const [activeDrawer, setActiveDrawer] = useState<CashDrawerRecord | null>(null);
  const [dayBalance, setDayBalance] = useState<DayBalanceSummary | null>(null);
  const [history, setHistory] = useState<{ data: any[]; pagination: any } | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [histPage, setHistPage] = useState(1);
  const [histLimit, setHistLimit] = useState(20);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Dialog state
  const [openDialog, setOpenDialog] = useState<'open' | 'close' | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Data fetchers ──────────────────────────────────
  const loadActiveDrawer = useCallback(async () => {
    if (!locationId) return;
    try {
      const res = await getActiveDrawer(locationId);
      setActiveDrawer((res as any)?.data ?? null);
    } catch {
      /* silent */
    }
  }, [locationId, getActiveDrawer]);

  const loadDayBalance = useCallback(async (date?: string) => {
    if (!locationId) return;
    setBalanceLoading(true);
    try {
      const res = await getDayBalance(locationId, date);
      setDayBalance((res as any)?.data ?? null);
    } catch {
      setDayBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [locationId, getDayBalance]);

  const loadHistory = useCallback(async (page = 1, limit = histLimit) => {
    if (!locationId || !canViewHistory) return;
    try {
      const res = await getDrawerHistory(locationId, page, limit);
      setHistory({ data: (res as any)?.data ?? [], pagination: (res as any)?.pagination ?? {} });
    } catch {
      /* silent */
    }
  }, [locationId, getDrawerHistory, histLimit, canViewHistory]);

  const loadAll = useCallback(async () => {
    setPageLoading(true);
    const tasks = [loadActiveDrawer(), loadDayBalance(selectedDate)];
    if (canViewHistory) tasks.push(loadHistory(1));
    await Promise.all(tasks);
    setPageLoading(false);
  }, [loadActiveDrawer, loadDayBalance, loadHistory, selectedDate, canViewHistory]);

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────
  const handleOpenDrawer = async () => {
    const amount = parseFloat(openingBalance);
    if (isNaN(amount) || amount < 0) { toast.error('Enter a valid opening balance.'); return; }
    setSubmitting(true);
    try {
      await openDrawer(locationId, amount, drawerNotes || undefined);
      toast.success('Cash drawer opened successfully.');
      setOpenDialog(null);
      setOpeningBalance('');
      setDrawerNotes('');
      await loadAll();
    } catch {
      toast.error('Failed to open drawer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDrawer = async () => {
    if (!activeDrawer) return;
    const amount = parseFloat(closingBalance);
    if (isNaN(amount) || amount < 0) { toast.error('Enter a valid closing balance.'); return; }
    setSubmitting(true);
    try {
      await closeDrawer(activeDrawer.id, amount, drawerNotes || undefined);
      toast.success('Cash drawer closed successfully.');
      setOpenDialog(null);
      setClosingBalance('');
      setDrawerNotes('');
      await loadAll();
    } catch {
      toast.error('Failed to close drawer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    await loadDayBalance(date);
  };

  // ── Derived values ─────────────────────────────────
  const isDrawerOpen = activeDrawer?.status === 'OPEN';
  const totalRevenue = dayBalance?.todaySales.totalRevenue ?? 0;
  const totalPayments =
    (dayBalance?.paymentBreakdown.cash ?? 0) +
    (dayBalance?.paymentBreakdown.card ?? 0) +
    (dayBalance?.paymentBreakdown.bankTransfer ?? 0) +
    (dayBalance?.paymentBreakdown.mobilePayment ?? 0) +
    (dayBalance?.paymentBreakdown.other ?? 0);

  // Safe parsed dates for formatting (guard against invalid/empty values)
  const openedDate = activeDrawer?.openedAt ? new Date(activeDrawer.openedAt) : null;
  const closedDate = activeDrawer?.closedAt ? new Date(activeDrawer.closedAt) : null;

  // ── Skeleton while loading ─────────────────────────
  if (pageLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // ── No location guard ──────────────────────────────
  if (!locationId) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="text-red-400" size={36} />
        <p className="text-gray-600 font-medium">Location not assigned to your account.</p>
        <p className="text-sm text-gray-400">Please contact your administrator.</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6  mx-auto">
      {/* ── Header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Banknote size={24} className="text-green-600" />
            Cash Drawer
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage daily cash balances and sales summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin mr-1' : 'mr-1'} />
            Refresh
          </Button>
          {isDrawerOpen ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => { setDrawerNotes(''); setClosingBalance(''); setOpenDialog('close'); }}
            >
              <X size={14} className="mr-1" />
              Close Drawer
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => { setDrawerNotes(''); setOpeningBalance(''); setOpenDialog('open'); }}
            >
              <Wallet size={14} className="mr-1" />
              Open Drawer
            </Button>
          )}
        </div>
      </div>

      {/* ── Drawer Status Banner ─────────────── */}
      <Card className={`border ${isDrawerOpen ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isDrawerOpen ? (
              <CheckCircle2 size={22} className="text-green-600 shrink-0" />
            ) : (
              <AlertCircle size={22} className="text-gray-400 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {isDrawerOpen ? 'Drawer is Open' : 'Drawer is Closed'}
                </span>
                <Badge variant={isDrawerOpen ? 'default' : 'secondary'}>
                  {activeDrawer?.status ?? 'No Session'}
                </Badge>
              </div>
              {activeDrawer && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {isDrawerOpen
                    ? `Opened by ${activeDrawer.openedBy?.name} at ${openedDate && isValid(openedDate) ? format(openedDate, 'HH:mm, dd MMM yyyy') : ' '}`
                    : `Closed by ${activeDrawer.closedBy?.name ?? ' '} at ${closedDate && isValid(closedDate) ? format(closedDate, 'HH:mm, dd MMM yyyy') : ' '}`}
                </p>
              )}
            </div>
          </div>
          {activeDrawer && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Opening Balance</p>
              <p className="text-lg font-bold text-gray-900">{fmt(activeDrawer.openingBalance)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Day Balance / History ───────────── */}
      <Tabs defaultValue="day-balance">
        {canViewHistory ? (
          <TabsList className="mb-4">
            <TabsTrigger value="day-balance">
              <BarChart3 size={14} className="mr-1.5" />
              Day Balance
            </TabsTrigger>
            <TabsTrigger value="history">
              <History size={14} className="mr-1.5" />
              History
            </TabsTrigger>
          </TabsList>
        ) : (
          <div className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
           
          </div>
        )}

        {/* ── Day Balance Tab ──────────────── */}
        {canViewHistory && (
        <TabsContent value="day-balance" className="space-y-5">
          {/* Date picker */}
          <div className="flex items-center gap-3">
            <CalendarDays size={16} className="text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-48"
            />
            {balanceLoading && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>

          {balanceLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : dayBalance ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<Banknote size={18} />}
                  label="Opening Balance"
                  value={fmt(dayBalance.cashFlow.openingBalance)}
                  accent="blue"
                />
                <StatCard
                  icon={<ShoppingCart size={18} />}
                  label="Total Sales"
                  value={fmt(dayBalance.todaySales.totalRevenue)}
                  sub={`${dayBalance.todaySales.totalSalesCount} transactions`}
                  accent="green"
                />
                <StatCard
                  icon={<TrendingUp size={18} />}
                  label="POS Sales"
                  value={fmt(dayBalance.todaySales.totalPOSRevenue)}
                  sub={`${dayBalance.todaySales.totalPOSSalesCount} POS transactions`}
                  accent="purple"
                />
                <StatCard
                  icon={<Wallet size={18} />}
                  label="Expected Cash"
                  value={fmt(dayBalance.cashFlow.totalExpectedCash)}
                  sub="Opening + Cash received"
                  accent="amber"
                />
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                {/* Cash Flow card */}
                <Card className="border border-gray-100 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Banknote size={16} className="text-green-600" />
                      Cash Flow Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                      <span className="text-sm text-gray-600">Opening Balance</span>
                      <span className="font-semibold">{fmt(dayBalance.cashFlow.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                      <span className="text-sm text-gray-600">Cash Sales Received</span>
                      <span className="font-semibold text-green-700">+{fmt(dayBalance.cashFlow.cashSalesReceived)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-800">Expected Closing Cash</span>
                      <span className="font-bold text-gray-900">{fmt(dayBalance.cashFlow.totalExpectedCash)}</span>
                    </div>
                    {dayBalance.cashFlow.closingBalance != null && (
                      <>
                        <div className="flex justify-between py-2">
                          <span className="text-sm text-gray-600">Actual Closing Balance</span>
                          <span className="font-semibold">{fmt(dayBalance.cashFlow.closingBalance)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm font-medium text-gray-800">Variance</span>
                          {varianceBadge(dayBalance.cashFlow.variance)}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Payment breakdown */}
                <Card className="border border-gray-100 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard size={16} className="text-blue-600" />
                      Payment Method Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <PaymentBar
                      label="Cash"
                      icon={<Banknote size={14} className="text-green-600" />}
                      amount={dayBalance.paymentBreakdown.cash}
                      total={totalPayments}
                    />
                    <PaymentBar
                      label="Card"
                      icon={<CreditCard size={14} className="text-blue-600" />}
                      amount={dayBalance.paymentBreakdown.card}
                      total={totalPayments}
                    />
                    <PaymentBar
                      label="Bank Transfer"
                      icon={<Landmark size={14} className="text-purple-600" />}
                      amount={dayBalance.paymentBreakdown.bankTransfer}
                      total={totalPayments}
                    />
                    <PaymentBar
                      label="Mobile / Online"
                      icon={<Smartphone size={14} className="text-amber-600" />}
                      amount={dayBalance.paymentBreakdown.mobilePayment}
                      total={totalPayments}
                    />
                    {dayBalance.paymentBreakdown.other > 0 && (
                      <PaymentBar
                        label="Other"
                        icon={<Wallet size={14} className="text-gray-500" />}
                        amount={dayBalance.paymentBreakdown.other}
                        total={totalPayments}
                      />
                    )}
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total Collected</span>
                      <span>{fmt(totalPayments)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Sale status breakdown */}
                <Card className="border border-gray-100 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShoppingCart size={16} className="text-purple-600" />
                      Sales Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Completed', count: dayBalance.todaySales.statusBreakdown.completed, color: 'bg-green-100 text-green-800' },
                        { label: 'Draft', count: dayBalance.todaySales.statusBreakdown.pending, color: 'bg-amber-100 text-amber-800' },
                        { label: 'Cancelled', count: dayBalance.todaySales.statusBreakdown.cancelled, color: 'bg-red-100 text-red-800' },
                        { label: 'Refunded', count: dayBalance.todaySales.statusBreakdown.refunded, color: 'bg-gray-100 text-gray-800' },
                      ].map(({ label, count, color }) => (
                        <div key={label} className={`rounded-xl px-4 py-3 ${color}`}>
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-xs font-medium mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* POS vs Total summary */}
                <Card className="border border-gray-100 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp size={16} className="text-green-600" />
                      Sales Revenue Split
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">POS Sales</span>
                        <span className="font-semibold">{fmt(dayBalance.todaySales.totalPOSRevenue)}</span>
                      </div>
                      <Progress
                        value={totalRevenue > 0 ? (dayBalance.todaySales.totalPOSRevenue / totalRevenue) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Non-POS Sales</span>
                        <span className="font-semibold">
                          {fmt(totalRevenue - dayBalance.todaySales.totalPOSRevenue)}
                        </span>
                      </div>
                      <Progress
                        value={totalRevenue > 0 ? ((totalRevenue - dayBalance.todaySales.totalPOSRevenue) / totalRevenue) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-sm">
                      <span>Total Revenue</span>
                      <span>{fmt(totalRevenue)}</span>
                    </div>
                    {dayBalance.todaySales.totalDiscounts > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discounts Given</span>
                        <span>-{fmt(dayBalance.todaySales.totalDiscounts)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="border-dashed border-gray-200">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <Banknote size={36} className="text-gray-300" />
                <p className="text-gray-500 font-medium">No cash drawer found for this date.</p>
                <p className="text-sm text-gray-400">
                  {selectedDate === format(new Date(), 'yyyy-MM-dd')
                    ? 'Open the drawer to start tracking today\'s cash.'
                    : 'No session was opened on this date.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        )}

        {canViewHistory && (
          <TabsContent value="history">
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Drawer Session History</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadHistory(histPage)}
                >
                  <RefreshCw size={13} className="mr-1" />
                  Reload
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Opened At</TableHead>
                        <TableHead>Opened By</TableHead>
                        <TableHead className="text-right">Opening</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Actual Closing</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead>Closed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(history?.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                            No history available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (history?.data ?? []).map((row: any) => {
                          const variance = row.closingBalance != null && row.expectedClosingBalance != null
                            ? Number(row.closingBalance) - Number(row.expectedClosingBalance)
                            : null;
                          return (
                            <TableRow key={row.id}>
                              <TableCell>
                                <Badge variant={row.status === 'OPEN' ? 'default' : 'secondary'}>
                                  {row.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {format(new Date(row.openedAt), 'dd MMM yyyy HH:mm')}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.openedBy ? row.openedBy.name : ' '}
                              </TableCell>
                              <TableCell className="text-right font-medium">{fmt(row.openingBalance)}</TableCell>
                              <TableCell className="text-right">{fmt(row.expectedClosingBalance)}</TableCell>
                              <TableCell className="text-right">{fmt(row.closingBalance)}</TableCell>
                              <TableCell className="text-right">{varianceBadge(variance)}</TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {row.closedAt ? format(new Date(row.closedAt), 'dd MMM yyyy HH:mm') : ' '}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {history?.pagination && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>Page {history.pagination.page} of {history.pagination.totalPages} &nbsp;·&nbsp; {history.pagination.total} sessions</span>
                      <select
                        value={histLimit}
                        onChange={(e) => { const l = Number(e.target.value); setHistLimit(l); setHistPage(1); loadHistory(1, l); }}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[5, 10, 30, 50, 100].map((n) => (
                          <option key={n} value={n}>{n} / page</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={histPage <= 1}
                        onClick={() => { const p = histPage - 1; setHistPage(p); loadHistory(p); }}
                      >
                        <ChevronUp size={14} className="-rotate-90" />
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={histPage >= history.pagination.totalPages}
                        onClick={() => { const p = histPage + 1; setHistPage(p); loadHistory(p); }}
                      >
                        Next
                        <ChevronDown size={14} className="-rotate-90" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ─── Open Drawer Dialog ──────────────────────── */}
      <Dialog open={openDialog === 'open'} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet size={18} className="text-green-600" />
              Open Cash Drawer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="opening-balance">Opening Cash Amount <span className="text-red-500">*</span></Label>
              <Input
                id="opening-balance"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <p className="text-xs text-gray-400">Count the physical cash in the drawer and enter total.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="open-notes">Notes (optional)</Label>
              <Textarea
                id="open-notes"
                placeholder="Any notes for this session..."
                value={drawerNotes}
                onChange={(e) => setDrawerNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleOpenDrawer}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={14} className="animate-spin mr-1" /> : <Wallet size={14} className="mr-1" />}
              Open Drawer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Close Drawer Dialog ─────────────────────── */}
      <Dialog open={openDialog === 'close'} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X size={18} className="text-red-500" />
              Close Cash Drawer
            </DialogTitle>
          </DialogHeader>
          {activeDrawer && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Opening Balance</span>
                <span className="font-semibold">{fmt(activeDrawer.openingBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expected Closing Cash</span>
                <span className="font-semibold">{fmt(activeDrawer.expectedClosingBalance)}</span>
              </div>
            </div>
          )}
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="closing-balance">Actual Cash in Drawer <span className="text-red-500">*</span></Label>
              <Input
                id="closing-balance"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
              />
              <p className="text-xs text-gray-400">Count physical cash and enter the actual amount.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="close-notes">Notes (optional)</Label>
              <Textarea
                id="close-notes"
                placeholder="Any discrepancy notes..."
                value={drawerNotes}
                onChange={(e) => setDrawerNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleCloseDrawer}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={14} className="animate-spin mr-1" /> : <X size={14} className="mr-1" />}
              Close Drawer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
