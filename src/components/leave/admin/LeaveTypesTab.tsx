import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { LeaveType, LeaveTypeInput } from '@/types/leave.types';
import { formatNumber } from '../leaveFormat';
import { nullableNumber, type LeaveAdminShared } from './shared';

const BLANK: LeaveTypeInput = {
  name: '',
  description: null,
  color: '#3b82f6',
  isPaid: true,
  isActive: true,
  isUnlimited: false,
  defaultDays: 0,
  requiresApproval: true,
  requiresAttachment: false,
  attachmentRequiredAfterDays: null,
  allowHalfDay: true,
  allowCarryForward: false,
  maxCarryForwardDays: null,
  maxConsecutiveDays: null,
  minNoticeDays: null,
  minServiceDays: null,
  eligibleRoleIds: null,
  sortOrder: 100,
  useMonthlyEntitlement: false,
};

function toInput(t: LeaveType): LeaveTypeInput {
  return {
    name: t.name,
    description: t.description,
    color: t.color,
    isPaid: t.isPaid,
    isActive: t.isActive,
    isUnlimited: t.isUnlimited,
    defaultDays: t.defaultDays,
    requiresApproval: t.requiresApproval,
    requiresAttachment: t.requiresAttachment,
    attachmentRequiredAfterDays: t.attachmentRequiredAfterDays,
    allowHalfDay: t.allowHalfDay,
    allowCarryForward: t.allowCarryForward,
    maxCarryForwardDays: t.maxCarryForwardDays,
    maxConsecutiveDays: t.maxConsecutiveDays,
    minNoticeDays: t.minNoticeDays,
    minServiceDays: t.minServiceDays,
    eligibleRoleIds: t.eligibleRoleIds,
    sortOrder: t.sortOrder,
    useMonthlyEntitlement: t.useMonthlyEntitlement === true,
  };
}

function NumberField({ label, value, onChange, hint, step = 0.5 }: { label: string; value: number | null; onChange: (v: number | null) => void; hint?: string; step?: number }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" min={0} step={step} value={value ?? ''} onChange={(e) => onChange(nullableNumber(e.target.value))} placeholder="None" />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function ToggleField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-md border p-3">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function LeaveTypesTab({ shared }: { shared: LeaveAdminShared }) {
  const { api, allTypes, roles, meta, reloadTypes } = shared;
  const canEdit = meta.permissions.manageTypes;
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [form, setForm] = useState<LeaveTypeInput>(BLANK);
  const [saving, setSaving] = useState(false);

  const open = (type: LeaveType | null) => {
    setEditing(type);
    setCreating(!type);
    setCode('');
    setForm(type ? toInput(type) : BLANK);
  };
  const close = () => { setEditing(null); setCreating(false); };
  const set = <K extends keyof LeaveTypeInput>(key: K, value: LeaveTypeInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form, description: form.description?.trim() || null, name: form.name.trim() };
    const result = editing ? await api.updateType(editing.id, payload) : await api.createType({ ...payload, code: code.trim() });
    setSaving(false);
    if (result) {
      close();
      reloadTypes();
    }
  };

  const toggleActive = async (type: LeaveType) => {
    if (await api.updateType(type.id, { isActive: !type.isActive })) reloadTypes();
  };

  const toggleRole = (roleId: string, checked: boolean) => {
    const current = form.eligibleRoleIds ?? [];
    const next = checked ? [...current, roleId] : current.filter((id) => id !== roleId);
    set('eligibleRoleIds', next.length ? next : null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">Leave types are never deleted  deactivate a type to stop new requests while keeping its history.</p>
        {canEdit && <Button size="sm" onClick={() => open(null)}><Plus className="h-4 w-4 mr-2" />New leave type</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave type</TableHead>
                  <TableHead>Default days</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTypes.map((t) => (
                  <TableRow key={t.id} className={t.isActive ? '' : 'opacity-60'}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-gray-500">{t.code}{t.isSystem ? ' · default' : ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{t.isUnlimited ? 'Unlimited' : formatNumber(t.defaultDays)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">{t.isPaid ? 'Paid' : 'Unpaid'}</Badge>
                        {!t.requiresApproval && <Badge variant="outline">Auto-approved</Badge>}
                        {t.requiresAttachment && <Badge variant="outline">Document{t.attachmentRequiredAfterDays ? ` > ${t.attachmentRequiredAfterDays}d` : ''}</Badge>}
                        {t.allowCarryForward && <Badge variant="outline">Carry forward{t.maxCarryForwardDays !== null ? ` ≤ ${t.maxCarryForwardDays}` : ''}</Badge>}
                        {!t.allowHalfDay && <Badge variant="outline">No half days</Badge>}
                        {t.minNoticeDays ? <Badge variant="outline">{t.minNoticeDays}d notice</Badge> : null}
                        {t.eligibleRoleIds?.length ? <Badge variant="outline">{t.eligibleRoleIds.length} role(s) only</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>{t.isActive ? <Badge className="bg-green-100 text-green-800">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => open(t)}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => void toggleActive(t)}>{t.isActive ? 'Deactivate' : 'Activate'}</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={creating || !!editing} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.name}` : 'New leave type'}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label>Name</Label>
                <Input value={form.name} maxLength={80} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Colour</Label>
                <Input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="h-9 p-1" />
              </div>
              {creating && (
                <div className="space-y-1">
                  <Label>Code</Label>
                  <Input value={code} maxLength={32} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} placeholder="e.g. STUDY" />
                </div>
              )}
              <div className={`space-y-1 ${creating ? 'sm:col-span-2' : 'sm:col-span-3'}`}>
                <Label>Description</Label>
                <Textarea rows={2} maxLength={500} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleField label="Paid leave" checked={form.isPaid} onChange={(v) => set('isPaid', v)} hint="Unpaid leave is reported to payroll as unpaid." />
              <ToggleField label="Unlimited" checked={form.isUnlimited} onChange={(v) => set('isUnlimited', v)} hint="No balance is tracked." />
              <ToggleField
                label="Use monthly entitlement"
                checked={form.useMonthlyEntitlement}
                onChange={(v) => set('useMonthlyEntitlement', v)}
                hint="When the org uses monthly-by-days mode, this type gets the month’s quota from the calendar-day map."
              />
              <ToggleField label="Needs approval" checked={form.requiresApproval} onChange={(v) => set('requiresApproval', v)} hint="Off = approved automatically on submit." />
              <ToggleField label="Half days allowed" checked={form.allowHalfDay} onChange={(v) => set('allowHalfDay', v)} />
              <ToggleField label="Needs a document" checked={form.requiresAttachment} onChange={(v) => set('requiresAttachment', v)} />
              <ToggleField label="Unused days carry forward" checked={form.allowCarryForward} onChange={(v) => set('allowCarryForward', v)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {!form.isUnlimited && (
                <NumberField label="Default days per year" value={form.defaultDays} onChange={(v) => set('defaultDays', v)} hint="Used when no role or employee rule applies." />
              )}
              {form.requiresAttachment && (
                <NumberField label="Document needed after (days)" value={form.attachmentRequiredAfterDays} onChange={(v) => set('attachmentRequiredAfterDays', v)} hint="Empty = always." />
              )}
              {form.allowCarryForward && (
                <NumberField label="Max days carried" value={form.maxCarryForwardDays} onChange={(v) => set('maxCarryForwardDays', v)} hint="Empty = organization cap." />
              )}
              <NumberField label="Max consecutive days" value={form.maxConsecutiveDays} onChange={(v) => set('maxConsecutiveDays', v)} />
              <NumberField label="Minimum notice (days)" value={form.minNoticeDays} onChange={(v) => set('minNoticeDays', v === null ? null : Math.round(v))} step={1} />
              <NumberField label="Minimum service (days)" value={form.minServiceDays} onChange={(v) => set('minServiceDays', v === null ? null : Math.round(v))} step={1} />
              <NumberField label="Sort order" value={form.sortOrder} onChange={(v) => set('sortOrder', Math.round(v ?? 100))} step={1} />
            </div>

            {roles.length > 0 && (
              <div className="space-y-2">
                <Label>Only for these roles</Label>
                <p className="text-xs text-gray-500">Leave all unticked to make this type available to every role.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {roles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.eligibleRoleIds?.includes(r.id) ?? false} onCheckedChange={(c) => toggleRole(r.id, c === true)} />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving || !form.name.trim() || (creating && code.length < 2)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LeaveTypesTab;
