import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  LEAVE_CANCELLATION_POLICIES,
  LEAVE_ENTITLEMENT_MODES,
  type LeaveApprovalStep,
  type LeaveCancellationPolicy,
  type LeaveEntitlementMode,
  type LeaveProrationMethod,
  type LeaveSettings,
  type LeaveSettingsInput,
} from '@/types/leave.types';
import { CANCELLATION_POLICY_LABEL, MONTH_NAMES, WEEKDAY_SHORT } from '../leaveFormat';
import { LeaveHolidaysCard } from './LeaveHolidaysCard';
import { nullableNumber, type LeaveAdminShared } from './shared';

const PRORATION_LABEL: Record<LeaveProrationMethod, string> = {
  NONE: 'No proration  full entitlement from day one',
  MONTHLY: 'By remaining months after joining',
  DAILY: 'By remaining days after joining',
};

const ENTITLEMENT_MODE_LABEL: Record<LeaveEntitlementMode, string> = {
  YEARLY: 'Yearly allotment (classic)',
  MONTHLY_BY_DAYS: 'Monthly by calendar days (e.g. 31→6, 30/28→5)',
};

type Section = 'policies' | 'settings';

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-md border p-3">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

function stepKey(name: string, index: number): string {
  const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
  return base || `STEP_${index + 1}`;
}

export function LeaveSettingsTab({ shared, section }: { shared: LeaveAdminShared; section: Section }) {
  const { api, roles, meta } = shared;
  const canEdit = meta.permissions.managePolicies;
  const [settings, setSettings] = useState<LeaveSettings | null>(null);
  const [form, setForm] = useState<LeaveSettingsInput>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api.getSettings().then((s) => {
      setSettings(s);
      if (s) setForm(s);
    });
  }, [api]);

  if (!settings) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;

  const set = <K extends keyof LeaveSettingsInput>(key: K, value: LeaveSettingsInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const steps = form.approvalSteps ?? [];
  const setStep = (index: number, patch: Partial<LeaveApprovalStep>) =>
    set('approvalSteps', steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const save = async () => {
    setSaving(true);
    const payload: LeaveSettingsInput =
      section === 'policies'
        ? {
            allowNegativeBalance: form.allowNegativeBalance,
            allowUnpaidLeave: form.allowUnpaidLeave,
            enableCarryForward: form.enableCarryForward,
            maxCarryForwardDays: form.maxCarryForwardDays,
            prorationMethod: form.prorationMethod,
            employeeCancellationPolicy: form.employeeCancellationPolicy,
            preventPendingOverlap: form.preventPendingOverlap,
            entitlementMode: form.entitlementMode,
            monthlyDaysMap: form.monthlyDaysMap,
          }
        : {
            enabled: form.enabled,
            leaveYearStartMonth: form.leaveYearStartMonth,
            leaveYearStartDay: form.leaveYearStartDay,
            workingDays: form.workingDays,
            countNonWorkingDays: form.countNonWorkingDays,
            allowWeekendLeave: form.allowWeekendLeave,
            countHolidays: form.countHolidays,
            allowHalfDay: form.allowHalfDay,
            requireConfirmation: form.requireConfirmation,
            reminderDaysBefore: form.reminderDaysBefore,
            approvalSteps: steps.map((s, i) => {
              const key = stepKey(s.name, i);
              const duplicate = steps.slice(0, i).some((prev, j) => stepKey(prev.name, j) === key);
              return { ...s, name: s.name.trim(), key: duplicate ? `${key}_${i + 1}` : key };
            }),
          };
    const result = await api.updateSettings(payload);
    setSaving(false);
    if (result) {
      setSettings(result);
      setForm(result);
    }
  };

  const footer = canEdit && (
    <div className="flex justify-end">
      <Button onClick={() => void save()} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save {section === 'policies' ? 'policies' : 'settings'}
      </Button>
    </div>
  );

  if (section === 'policies') {
    const daysMap = form.monthlyDaysMap ?? { '28': 5, '29': 5, '30': 5, '31': 6 };
    const setMapDay = (key: string, value: number) =>
      set('monthlyDaysMap', { ...daysMap, [key]: Math.max(0, Math.min(31, value)) });

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Entitlement period</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 max-w-xl">
              <Label>How leave days are allotted</Label>
              <Select
                value={form.entitlementMode ?? 'YEARLY'}
                onValueChange={(v) => set('entitlementMode', v as LeaveEntitlementMode)}
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_ENTITLEMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>{ENTITLEMENT_MODE_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Monthly mode uses the map below for leave types marked &quot;Use monthly entitlement&quot;.
                Enabling it also presets all 7 weekdays as working days.
                Leave usage here gates leave-linked payroll allowances (and unused-leave pay if
                enabled) — it does not cut basic salary; that follows Payroll → Pay mode
                (use Full basic if attendance must not reduce basic).
              </p>
            </div>
            {(form.entitlementMode ?? 'YEARLY') === 'MONTHLY_BY_DAYS' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['28', '29', '30', '31'] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label>{key}-day months → leave days</Label>
                    <Input
                      type="number"
                      min={0}
                      max={31}
                      step={0.5}
                      value={daysMap[key] ?? 0}
                      onChange={(e) => setMapDay(key, Number(e.target.value) || 0)}
                      disabled={!canEdit}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Balance rules</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Toggle label="Allow negative balances" hint="Employees may request more days than they have left." checked={!!form.allowNegativeBalance} onChange={(v) => set('allowNegativeBalance', v)} disabled={!canEdit} />
            <Toggle label="Allow unpaid leave types" hint="Off blocks new requests for unpaid types." checked={!!form.allowUnpaidLeave} onChange={(v) => set('allowUnpaidLeave', v)} disabled={!canEdit} />
            <Toggle label="Block overlapping pending requests" hint="Off = a pending overlap is only a warning." checked={!!form.preventPendingOverlap} onChange={(v) => set('preventPendingOverlap', v)} disabled={!canEdit} />
            <Toggle label="Carry forward unused days" hint="Only types that allow carry forward are carried. Not used for monthly entitlement types." checked={!!form.enableCarryForward} onChange={(v) => set('enableCarryForward', v)} disabled={!canEdit} />
            {form.enableCarryForward && (
              <div className="space-y-1">
                <Label>Organization carry-forward cap (days)</Label>
                <Input type="number" min={0} step={0.5} value={form.maxCarryForwardDays ?? ''} onChange={(e) => set('maxCarryForwardDays', nullableNumber(e.target.value))} placeholder="No cap" disabled={!canEdit} />
                <p className="text-xs text-gray-500">The lower of this and the leave type&apos;s own cap applies.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Joiners and cancellations</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Proration for mid-year joiners</Label>
              <Select value={form.prorationMethod} onValueChange={(v) => set('prorationMethod', v as LeaveProrationMethod)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRORATION_LABEL) as LeaveProrationMethod[]).map((m) => <SelectItem key={m} value={m}>{PRORATION_LABEL[m]}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Uses the joining date on the staff profile.</p>
            </div>
            <div className="space-y-1">
              <Label>Employees can cancel their own leave</Label>
              <Select value={form.employeeCancellationPolicy} onValueChange={(v) => set('employeeCancellationPolicy', v as LeaveCancellationPolicy)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_CANCELLATION_POLICIES.map((p) => <SelectItem key={p} value={p}>{CANCELLATION_POLICY_LABEL[p]}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Pending requests can always be withdrawn unless this is &quot;never&quot;. Cancelling confirmed leave restores the days.</p>
            </div>
          </CardContent>
        </Card>
        {footer}
      </div>
    );
  }

  const workingDays = new Set(form.workingDays ?? []);
  const toggleDay = (day: number, checked: boolean) => {
    const next = new Set(workingDays);
    if (checked) next.add(day);
    else next.delete(day);
    set('workingDays', [...next].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Leave requests enabled" hint="Off stops new requests; existing leave and balances are kept." checked={!!form.enabled} onChange={(v) => set('enabled', v)} disabled={!canEdit} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Leave year starts  month</Label>
              <Select value={String(form.leaveYearStartMonth ?? 1)} onValueChange={(v) => set('leaveYearStartMonth', Number(v))} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Day</Label>
              <Input type="number" min={1} max={28} value={form.leaveYearStartDay ?? 1} onChange={(e) => set('leaveYearStartDay', Math.min(28, Math.max(1, Number(e.target.value) || 1)))} disabled={!canEdit} />
            </div>
            <div className="space-y-1">
              <Label>&quot;Starting soon&quot; reminder (days before)</Label>
              <Input type="number" min={0} max={30} value={form.reminderDaysBefore ?? 0} onChange={(e) => set('reminderDaysBefore', Math.min(30, Math.max(0, Number(e.target.value) || 0)))} disabled={!canEdit} />
            </div>
          </div>
          <p className="text-xs text-gray-500">The leave year start cannot be changed once leave has been requested or balances adjusted.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Working days and counting</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <Checkbox checked={workingDays.has(d)} onCheckedChange={(c) => toggleDay(d, c === true)} disabled={!canEdit} />
                {WEEKDAY_SHORT[d]}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Toggle label="Charge non-working days" hint="Count every calendar day in the range." checked={!!form.countNonWorkingDays} onChange={(v) => set('countNonWorkingDays', v)} disabled={!canEdit} />
            <Toggle label="Charge holidays" hint="Off = holidays inside a request are free." checked={!!form.countHolidays} onChange={(v) => set('countHolidays', v)} disabled={!canEdit} />
            <Toggle label="Allow leave to start or end on a non-working day" checked={!!form.allowWeekendLeave} onChange={(v) => set('allowWeekendLeave', v)} disabled={!canEdit} />
            <Toggle label="Allow half days" checked={!!form.allowHalfDay} onChange={(v) => set('allowHalfDay', v)} disabled={!canEdit} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Approval workflow</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500 w-14">Step {i + 1}</span>
                <Input value={step.name} maxLength={80} onChange={(e) => setStep(i, { name: e.target.value })} disabled={!canEdit} />
                {canEdit && steps.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => set('approvalSteps', steps.filter((_, j) => j !== i))} aria-label="Remove step">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {roles.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Who approves (leave all unticked for anyone with leave approval permission):</p>
                  <div className="flex flex-wrap gap-3">
                    {roles.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={step.approverRoleIds.includes(r.id)}
                          disabled={!canEdit}
                          onCheckedChange={(c) =>
                            setStep(i, {
                              approverRoleIds: c === true ? [...step.approverRoleIds, r.id] : step.approverRoleIds.filter((id) => id !== r.id),
                            })
                          }
                        />
                        {r.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {canEdit && steps.length < 3 && (
            <Button variant="outline" size="sm" onClick={() => set('approvalSteps', [...steps, { key: `STEP_${steps.length + 1}`, name: steps.length === 0 ? 'Manager approval' : 'HR approval', approverRoleIds: [] }])}>
              <Plus className="h-4 w-4 mr-2" />Add approval step
            </Button>
          )}
          <Toggle
            label="Final confirmation after approval"
            hint="Approved leave is deducted only when someone with leave confirmation permission confirms it."
            checked={!!form.requireConfirmation}
            onChange={(v) => set('requireConfirmation', v)}
            disabled={!canEdit}
          />
          <p className="text-xs text-gray-500">Changes apply to new requests; requests already in progress keep the workflow they were submitted with.</p>
        </CardContent>
      </Card>

      {footer}

      <LeaveHolidaysCard shared={shared} />
    </div>
  );
}

export default LeaveSettingsTab;
