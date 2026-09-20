import { useState, useEffect, useCallback } from 'react';

import { Settings, Play, Lock, CheckCircle, ChevronRight, DollarSign, Users, RefreshCw, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';

interface PayrollConfig {
  commissionMode: 'fixed' | 'percentage';
  basicRateValue: number;
  addToBasicSalary: boolean;
  minimumSalesThreshold: number;
  standardWorkingDaysPerMonth: number;
  workingHoursPerDay: number;
  overtimeRateMultiplier: number;
}

interface PayrollRun {
  id: string;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'confirmed' | 'locked';
  staffCount: number;
  totalBasicSalary: number;
  totalCommission: number;
  totalPayable: number;
}

interface Payslip {
  id: string;
  staffId: string;
  daysWorked: number;
  totalWorkingDays: number;
  absentDays: number;
  basicSalary: number;
  totalSales: number;
  commissionEarned: number;
  addCommissionToBasic: boolean;
  deductions: number;
  bonuses: number;
  netPayable: number;
  status: string;
  adminNotes: string | null;
  staff?: { staffId: string; user?: { name: string } };
}

interface StaffRateRow {
  staff: { id: string; staffId: string; user?: { name: string; email: string } };
  currentRate: {
    basicSalary: number;
    commissionMode: string | null;
    rateValue: number | null;
    effectiveFrom: string;
  } | null;
}

const runStatusBadge: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  locked: 'bg-green-100 text-green-700',
};

export default function PayrollPage() {
  const configApi = useFetch();
  const runsApi = useFetch();
  const payslipsApi = useFetch('/payroll/runs/:id/payslips');
  const runPayrollApi = useFetch();
  const staffRatesApi = useFetch();
  const setRateApi = useFetch();

  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [configDraft, setConfigDraft] = useState<Partial<PayrollConfig>>({});
  const [configSaving, setConfigSaving] = useState(false);

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);

  const [runPayrollForm, setRunPayrollForm] = useState({ periodStart: '', periodEnd: '', notes: '' });
  const [runPayrollLoading, setRunPayrollLoading] = useState(false);

  // Staff rates
  const [staffRates, setStaffRates] = useState<StaffRateRow[]>([]);
  const [staffRatesLoading, setStaffRatesLoading] = useState(false);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRateRow['staff'] | null>(null);
  const [rateForm, setRateForm] = useState({ basicSalary: '', commissionMode: '', rateValue: '', effectiveFrom: new Date().toISOString().split('T')[0], notes: '' });
  const [rateSaving, setRateSaving] = useState(false);

  // ─── Load config ────────────────────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    const res = await configApi.execute('/payroll/config', { method: 'GET', silent: true });
    if (res?.data) {
      // Coerce DECIMAL columns that come back as strings from the API
      const d = res.data;
      const normalized: PayrollConfig = {
        ...d,
        basicRateValue: Number(d.basicRateValue),
        minimumSalesThreshold: Number(d.minimumSalesThreshold),
        standardWorkingDaysPerMonth: Number(d.standardWorkingDaysPerMonth),
        workingHoursPerDay: Number(d.workingHoursPerDay),
        overtimeRateMultiplier: Number(d.overtimeRateMultiplier),
      };
      setConfig(normalized);
      setConfigDraft(normalized);
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    const res = await runsApi.execute('/payroll/runs', { method: 'GET', silent: true });
    setRunsLoading(false);
    if (res?.data) setRuns(res.data);
  }, []);

  const fetchStaffRates = useCallback(async () => {
    setStaffRatesLoading(true);
    const res = await staffRatesApi.execute('/payroll/staff-rates', { method: 'GET', silent: true });
    setStaffRatesLoading(false);
    if (res?.data) {
      const raw = res.data.data ?? res.data ?? [];
      setStaffRates(Array.isArray(raw) ? raw : []);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchRuns();
    fetchStaffRates();
  }, []);

  // ─── Save config ─────────────────────────────────────────────────────────────
  const saveConfig = async () => {
    setConfigSaving(true);
    const res = await configApi.execute('/payroll/config', { method: 'PATCH', data: configDraft });
    setConfigSaving(false);
    if (res?.success !== false) {
      toast.success('Payroll config saved');
      fetchConfig();
    }
  };

  // ─── Run Payroll ──────────────────────────────────────────────────────────────
  const handleRunPayroll = async () => {
    if (!runPayrollForm.periodStart || !runPayrollForm.periodEnd) {
      toast.error('Please select period start and end dates');
      return;
    }
    setRunPayrollLoading(true);
    const res = await runPayrollApi.execute('/payroll/runs', { method: 'POST', data: runPayrollForm });
    setRunPayrollLoading(false);
    if (res?.success !== false) {
      toast.success('Payroll run created');
      fetchRuns();
    }
  };

  // ─── Confirm / Lock ───────────────────────────────────────────────────────────
  const confirmRun = async (run: PayrollRun) => {
    const res = await runsApi.execute(`/payroll/runs/${run.id}/confirm`, { method: 'POST', data: {} });
    if (res?.success !== false) { toast.success('Payroll confirmed'); fetchRuns(); }
  };

  const lockRun = async (run: PayrollRun) => {
    const res = await runsApi.execute(`/payroll/runs/${run.id}/lock`, { method: 'POST', data: {} });
    if (res?.success !== false) { toast.success('Payroll locked'); fetchRuns(); }
  };

  // ─── Staff Rates ─────────────────────────────────────────────────────────────
  const openRateModal = (row: StaffRateRow) => {
    setEditingStaff(row.staff);
    setRateForm({
      basicSalary: row.currentRate ? String(row.currentRate.basicSalary) : '',
      commissionMode: row.currentRate?.commissionMode ?? '',
      rateValue: row.currentRate?.rateValue != null ? String(row.currentRate.rateValue) : '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setRateModalOpen(true);
  };

  const handleSaveRate = async () => {
    if (!editingStaff || !rateForm.basicSalary || !rateForm.effectiveFrom) {
      toast.error('Basic salary and effective date are required');
      return;
    }
    setRateSaving(true);
    const res = await setRateApi.execute(`/payroll/staff/${editingStaff.id}/rates`, {
      method: 'POST',
      data: {
        basicSalary: Number(rateForm.basicSalary),
        commissionMode: rateForm.commissionMode || undefined,
        rateValue: rateForm.rateValue ? Number(rateForm.rateValue) : undefined,
        effectiveFrom: rateForm.effectiveFrom,
        notes: rateForm.notes || undefined,
      },
    });
    setRateSaving(false);
    if (res?.success !== false) {
      toast.success('Rate saved');
      setRateModalOpen(false);
      fetchStaffRates();
    }
  };

  // ─── View Payslips ────────────────────────────────────────────────────────────
  const viewPayslips = async (run: PayrollRun) => {
    setSelectedRun(run);
    const res = await payslipsApi.execute(`/payroll/runs/${run.id}/payslips`, { method: 'GET', silent: true });
    if (res?.data) setPayslips(res.data);
    setPayslipModalOpen(true);
  };

  const fmt = (n: number | string | undefined) =>
    Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-500 text-sm mt-1">Configure salary rates, run payroll, and manage payslips</p>
        </div>
      </div>

      <Tabs defaultValue="config">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <TabsList className="w-max min-w-full sm:w-auto">
          <TabsTrigger value="config"><Settings className="h-4 w-4 mr-2" />Config</TabsTrigger>
          <TabsTrigger value="rates"><UserCog className="h-4 w-4 mr-2" />Staff Rates</TabsTrigger>
          <TabsTrigger value="run"><Play className="h-4 w-4 mr-2" />Run Payroll</TabsTrigger>
          <TabsTrigger value="history"><DollarSign className="h-4 w-4 mr-2" />History</TabsTrigger>
        </TabsList>
        </div>

        {/* ── Config Tab ── */}
        <TabsContent value="config" className="mt-4">
          {config && (
            <Card>
              <CardHeader><CardTitle>Global Payroll Settings</CardTitle></CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-1">
                  <Label>Commission Mode</Label>
                  <Select
                    value={configDraft.commissionMode ?? config.commissionMode}
                    onValueChange={v => setConfigDraft(d => ({ ...d, commissionMode: v as 'fixed' | 'percentage' }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (per sale)</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Commission Rate Value</Label>
                  <Input
                    type="number"
                    value={configDraft.basicRateValue ?? config.basicRateValue}
                    onChange={e => setConfigDraft(d => ({ ...d, basicRateValue: parseFloat(e.target.value) }))}
                  />
                  <p className="text-xs text-gray-500">
                    {(configDraft.commissionMode ?? config.commissionMode) === 'fixed'
                      ? 'Amount per sale transaction'
                      : 'Percentage of basic salary'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Add Commission to Basic Salary</Label>
                    <p className="text-xs text-gray-500">If OFF, commission is paid separately (shown as bonus)</p>
                  </div>
                  <Switch
                    checked={configDraft.addToBasicSalary ?? config.addToBasicSalary}
                    onCheckedChange={v => setConfigDraft(d => ({ ...d, addToBasicSalary: v }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Min Sales Threshold</Label>
                    <Input
                      type="number"
                      value={configDraft.minimumSalesThreshold ?? config.minimumSalesThreshold}
                      onChange={e => setConfigDraft(d => ({ ...d, minimumSalesThreshold: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Working Days / Month</Label>
                    <Input
                      type="number"
                      value={configDraft.standardWorkingDaysPerMonth ?? config.standardWorkingDaysPerMonth}
                      onChange={e => setConfigDraft(d => ({ ...d, standardWorkingDaysPerMonth: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Working Hours / Day</Label>
                    <Input
                      type="number"
                      value={configDraft.workingHoursPerDay ?? config.workingHoursPerDay}
                      onChange={e => setConfigDraft(d => ({ ...d, workingHoursPerDay: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Overtime Multiplier</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={configDraft.overtimeRateMultiplier ?? config.overtimeRateMultiplier}
                      onChange={e => setConfigDraft(d => ({ ...d, overtimeRateMultiplier: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <Button onClick={saveConfig} disabled={configSaving}>
                  {configSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Staff Rates Tab ── */}
        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Staff Salary Rates</CardTitle>
              <Button size="sm" variant="outline" onClick={fetchStaffRates}><RefreshCw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Commission Mode</TableHead>
                    <TableHead>Rate Value</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffRatesLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Loading…</TableCell></TableRow>
                  ) : staffRates.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No staff found</TableCell></TableRow>
                  ) : staffRates.map(row => (
                    <TableRow key={row.staff.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.staff.user?.name ?? ' '}</p>
                          <p className="text-xs text-gray-500">{row.staff.staffId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{row.currentRate ? fmt(row.currentRate.basicSalary) : <span className="text-gray-400 text-xs">Not set</span>}</TableCell>
                      <TableCell>{row.currentRate?.commissionMode ?? ' '}</TableCell>
                      <TableCell>{row.currentRate?.rateValue != null ? fmt(row.currentRate.rateValue) : ' '}</TableCell>
                      <TableCell>{row.currentRate?.effectiveFrom ?? ' '}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openRateModal(row)}>Edit Rate</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Run Payroll Tab ── */}
        <TabsContent value="run" className="mt-4">
          <Card className="max-w-xl">
            <CardHeader><CardTitle>Generate Payroll Run</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Period Start</Label>
                  <Input type="date" value={runPayrollForm.periodStart} onChange={e => setRunPayrollForm(f => ({ ...f, periodStart: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Period End</Label>
                  <Input type="date" value={runPayrollForm.periodEnd} onChange={e => setRunPayrollForm(f => ({ ...f, periodEnd: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Input value={runPayrollForm.notes} onChange={e => setRunPayrollForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Monthly payroll for April 2026" />
              </div>
              <Button onClick={handleRunPayroll} disabled={runPayrollLoading} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                {runPayrollLoading ? 'Processing...' : 'Run Payroll'}
              </Button>
              <p className="text-xs text-gray-500">
                This will calculate attendance-based salaries and commissions for all active staff for the selected period.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Payroll History</CardTitle>
              <Button size="sm" variant="outline" onClick={fetchRuns}><RefreshCw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Total Payable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runsLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Loading...</TableCell></TableRow>
                  ) : runs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No payroll runs yet</TableCell></TableRow>
                  ) : runs.map(run => (
                    <TableRow key={run.id}>
                      <TableCell className="font-mono font-medium">{run.runNumber}</TableCell>
                      <TableCell>{run.periodStart} → {run.periodEnd}</TableCell>
                      <TableCell><Users className="h-4 w-4 inline mr-1" />{run.staffCount}</TableCell>
                      <TableCell className="font-medium">LKR {fmt(run.totalPayable)}</TableCell>
                      <TableCell>
                        <Badge className={runStatusBadge[run.status] ?? 'bg-gray-100 text-gray-700'}>
                          {run.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => viewPayslips(run)}>
                            <ChevronRight className="h-4 w-4" /> View
                          </Button>
                          {run.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => confirmRun(run)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                            </Button>
                          )}
                          {run.status === 'confirmed' && (
                            <Button size="sm" variant="outline" onClick={() => lockRun(run)}>
                              <Lock className="h-4 w-4 mr-1" /> Lock
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payslips Modal */}
      <Dialog open={payslipModalOpen} onOpenChange={setPayslipModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]  ">
          <DialogHeader>
            <DialogTitle>Payslips   {selectedRun?.runNumber} ({selectedRun?.periodStart} → {selectedRun?.periodEnd})</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Basic</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Payable</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.staff?.user?.name ?? ' '}</p>
                      <p className="text-xs text-gray-500">{p.staff?.staffId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{p.daysWorked}/{p.totalWorkingDays}</TableCell>
                  <TableCell>{p.totalSales}</TableCell>
                  <TableCell>{fmt(p.basicSalary)}</TableCell>
                  <TableCell>{fmt(p.commissionEarned)}{!p.addCommissionToBasic && <span className="text-xs text-gray-400 ml-1">(sep.)</span>}</TableCell>
                  <TableCell>{fmt(p.deductions)}</TableCell>
                  <TableCell className="font-bold">{fmt(p.netPayable)}</TableCell>
                  <TableCell><Badge>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayslipModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Staff Rate Modal ── */}
      <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rate   {editingStaff?.user?.name ?? editingStaff?.staffId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Basic Salary</Label>
              <Input type="number" min="0" step="0.01" value={rateForm.basicSalary} onChange={e => setRateForm(f => ({ ...f, basicSalary: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Commission Mode</Label>
                <Select value={rateForm.commissionMode} onValueChange={v => setRateForm(f => ({ ...f, commissionMode: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Rate Value</Label>
                <Input type="number" min="0" step="0.01" value={rateForm.rateValue} onChange={e => setRateForm(f => ({ ...f, rateValue: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Effective From</Label>
              <Input type="date" value={rateForm.effectiveFrom} onChange={e => setRateForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input value={rateForm.notes} onChange={e => setRateForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Annual raise" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRate} disabled={rateSaving}>{rateSaving ? 'Saving…' : 'Save Rate'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
