import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { EmployeeEntitlement, RoleEntitlement } from '@/types/leave.types';
import { formatDate, formatNumber } from '../leaveFormat';
import { ALL, fromSelect, nullableNumber, type LeaveAdminShared } from './shared';
import { EmptyRow, FilterSelect } from './widgets';

type Kind = 'role' | 'employee';
type Rule = RoleEntitlement | EmployeeEntitlement;

interface FormState {
  id: string | null;
  leaveTypeId: string;
  targetId: string;
  locationId: string;
  days: string;
  isUnlimited: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
  note: string;
}

const EMPTY: FormState = {
  id: null, leaveTypeId: '', targetId: '', locationId: ALL, days: '', isUnlimited: false,
  effectiveFrom: '', effectiveTo: '', isActive: true, note: '',
};

function isRoleRule(rule: Rule): rule is RoleEntitlement {
  return 'roleId' in rule;
}

export function LeaveEntitlementsTab({ shared, kind }: { shared: LeaveAdminShared; kind: Kind }) {
  const { api, meta, allTypes, types, roles, employees, branches } = shared;
  const canEdit = meta.permissions.manageEntitlements;
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setRules(null);
    const query = { leaveTypeId: fromSelect(typeFilter), includeInactive: showInactive };
    setRules(kind === 'role' ? await api.listRoleEntitlements(query) : await api.listEmployeeEntitlements(query));
  }, [api, kind, typeFilter, showInactive]);

  useEffect(() => { void load(); }, [load]);

  const edit = (rule: Rule) =>
    setForm({
      id: rule.id,
      leaveTypeId: rule.leaveTypeId,
      targetId: isRoleRule(rule) ? rule.roleId : rule.userId,
      locationId: isRoleRule(rule) ? rule.locationId ?? ALL : ALL,
      days: rule.days === null ? '' : String(rule.days),
      isUnlimited: rule.isUnlimited,
      effectiveFrom: rule.effectiveFrom ?? '',
      effectiveTo: rule.effectiveTo ?? '',
      isActive: rule.isActive,
      note: (isRoleRule(rule) ? rule.notes : rule.reason) ?? '',
    });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const common = {
      days: form.isUnlimited ? null : nullableNumber(form.days),
      isUnlimited: form.isUnlimited,
      effectiveFrom: form.effectiveFrom || null,
      effectiveTo: form.effectiveTo || null,
      isActive: form.isActive,
    };
    const note = form.note.trim();
    let ok: unknown;
    if (kind === 'role') {
      const fields = { ...common, locationId: fromSelect(form.locationId) ?? null, notes: note || null };
      ok = form.id
        ? await api.updateRoleEntitlement(form.id, fields)
        : await api.createRoleEntitlement({ ...fields, leaveTypeId: form.leaveTypeId, roleId: form.targetId });
    } else {
      ok = form.id
        ? await api.updateEmployeeEntitlement(form.id, { ...common, reason: note || null })
        : await api.createEmployeeEntitlement({ ...common, leaveTypeId: form.leaveTypeId, userId: form.targetId, reason: note });
    }
    setSaving(false);
    if (ok) {
      setForm(null);
      void load();
    }
  };

  const daysMissing = !!form && !form.isUnlimited && nullableNumber(form.days) === null;
  const reasonMissing = kind === 'employee' && !!form && !form.id && !form.note.trim();
  const datesInvalid = !!form && !!form.effectiveFrom && !!form.effectiveTo && form.effectiveFrom > form.effectiveTo;
  const typeChoices = types.filter((t) => !t.isUnlimited);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect className="w-56" label="Leave type" value={typeFilter} onChange={setTypeFilter} options={allTypes.map((t) => ({ value: t.id, label: t.name }))} />
          <label className="flex items-center gap-2 text-sm pb-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Show inactive
          </label>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setForm(EMPTY)}>
            <Plus className="h-4 w-4 mr-2" />{kind === 'role' ? 'New role entitlement' : 'New employee override'}
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {kind === 'role'
          ? 'Role entitlements replace the leave type default for everyone in that role (optionally only in one branch). Employee overrides win over role entitlements.'
          : 'An override sets one employee\'s entitlement for a leave type and wins over role entitlements and defaults. Every override needs a reason.'}
      </p>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave type</TableHead>
                  <TableHead>{kind === 'role' ? 'Role' : 'Employee'}</TableHead>
                  {kind === 'role' && <TableHead>Branch</TableHead>}
                  <TableHead>Days</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>{kind === 'role' ? 'Notes' : 'Reason'}</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!rules ? (
                  <EmptyRow colSpan={8}>Loading…</EmptyRow>
                ) : rules.length === 0 ? (
                  <EmptyRow colSpan={8}>No {kind === 'role' ? 'role entitlements' : 'employee overrides'} yet.</EmptyRow>
                ) : (
                  rules.map((r) => (
                    <TableRow key={r.id} className={r.isActive ? '' : 'opacity-60'}>
                      <TableCell>{r.leaveTypeName}</TableCell>
                      <TableCell className="font-medium">{isRoleRule(r) ? r.roleName : r.employeeName}</TableCell>
                      {kind === 'role' && <TableCell>{isRoleRule(r) ? r.locationName ?? 'All branches' : ''}</TableCell>}
                      <TableCell>{r.isUnlimited ? 'Unlimited' : formatNumber(r.days)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.effectiveFrom || r.effectiveTo ? `${formatDate(r.effectiveFrom)} → ${r.effectiveTo ? formatDate(r.effectiveTo) : 'open'}` : 'Always'}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-gray-600">{(isRoleRule(r) ? r.notes : r.reason) ?? '—'}</TableCell>
                      <TableCell>{r.isActive ? <Badge className="bg-green-100 text-green-800">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => edit(r)}><Pencil className="h-4 w-4" /></Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Edit' : 'New'} {kind === 'role' ? 'role entitlement' : 'employee override'}</DialogTitle>
          </DialogHeader>
          {form && (
            <DialogBody className="space-y-3">
              {!form.id && (
                <>
                  <div className="space-y-1">
                    <Label>Leave type</Label>
                    <Select value={form.leaveTypeId} onValueChange={(v) => set('leaveTypeId', v)}>
                      <SelectTrigger><SelectValue placeholder="Choose leave type" /></SelectTrigger>
                      <SelectContent>{typeChoices.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{kind === 'role' ? 'Role' : 'Employee'}</Label>
                    <Select value={form.targetId} onValueChange={(v) => set('targetId', v)}>
                      <SelectTrigger><SelectValue placeholder={kind === 'role' ? 'Choose role' : 'Choose employee'} /></SelectTrigger>
                      <SelectContent>
                        {kind === 'role'
                          ? roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)
                          : employees.map((e) => (
                              <SelectItem key={e.userId} value={e.userId}>{e.name}{e.locationName ? `  ${e.locationName}` : ''}</SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {kind === 'role' && (
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Select value={form.locationId} onValueChange={(v) => set('locationId', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All branches</SelectItem>
                      {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <Label>Days per year</Label>
                  <Input type="number" min={0} step={0.5} value={form.days} disabled={form.isUnlimited} onChange={(e) => set('days', e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm pb-2">
                  <Switch checked={form.isUnlimited} onCheckedChange={(v) => set('isUnlimited', v)} /> Unlimited
                </label>
              </div>
              <p className="text-xs text-gray-500">Enter 0 to give no entitlement for this type.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Effective from</Label>
                  <Input type="date" value={form.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Expires on</Label>
                  <Input type="date" value={form.effectiveTo} onChange={(e) => set('effectiveTo', e.target.value)} />
                </div>
              </div>
              {datesInvalid && <p className="text-xs text-red-600">The expiry date must be on or after the start date.</p>}
              <div className="space-y-1">
                <Label>{kind === 'role' ? 'Notes' : 'Reason'}</Label>
                <Textarea rows={2} maxLength={500} value={form.note} onChange={(e) => set('note', e.target.value)} />
              </div>
              {form.id && (
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} /> Active
                </label>
              )}
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
            <Button
              onClick={() => void save()}
              disabled={saving || !form || daysMissing || reasonMissing || datesInvalid || (!form.id && (!form.leaveTypeId || !form.targetId))}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LeaveEntitlementsTab;
