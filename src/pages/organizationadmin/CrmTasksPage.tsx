/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCrm, CRM_TASK_STATUSES, CRM_TASK_PRIORITIES } from '../../hooks/useCrm';
import useCustomer from '../../hooks/useCustomer';
import { useStaff } from '../../hooks/useStaff';
import { useT } from '../../i18n/useT';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const staffLabel = (s: any) => (s?.user?.name || s?.user?.firstName || s?.name || s?.staffId || 'Staff');

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  DONE: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500', MEDIUM: 'text-amber-600', HIGH: 'text-red-600',
};

export default function CrmTasksPage() {
  const { list, getStats, create, update, remove } = useCrm();
  const { t } = useT();
  const { getCustomers } = useCustomer();
  const { getAllStaff } = useStaff() as any;
  const [customers, setCustomers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ open: 0, overdue: 0 });
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ title: '', description: '', dueDate: '', priority: 'MEDIUM', customerId: '', assignedStaffId: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([list({ status }), getStats()]);
      setRows((listRes?.data as any) ?? []);
      if (statsRes?.data) setStats(statsRes.data);
    } finally { setLoading(false); }
  }, [list, getStats, status]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const c = await getCustomers();
        setCustomers((c?.data as any)?.customers ?? (Array.isArray(c?.data) ? c?.data : []));
      } catch { /* ignore */ }
      try {
        const s = await getAllStaff(1, 200);
        setStaffList(s?.data?.staff ?? s?.data?.data?.staff ?? (Array.isArray(s?.data) ? s.data : []));
      } catch { /* ignore */ }
    })();
  }, [getCustomers, getAllStaff]);

  const submit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const res = await create({
        title: form.title,
        description: form.description || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        priority: form.priority,
        customerId: form.customerId || null,
        assignedStaffId: form.assignedStaffId || null,
      });
      if (res?.success || res?.status) { setShowCreate(false); setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM' }); load(); }
    } finally { setSaving(false); }
  };

  const changeStatus = async (id: string, s: any) => { await update(id, { status: s }); load(); };
  const del = async (id: string) => { await remove(id); load(); };
  const isOverdue = (r: any) => r.dueDate && new Date(r.dueDate) < new Date() && ['OPEN', 'IN_PROGRESS'].includes(r.status);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-800"><ListChecks className="w-7 h-7" /> {t('crmTasks')}</h1>
        <div className="flex gap-2 items-center">
          <LanguageSwitcher />
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'table' ? 'board' : 'table')}>{viewMode === 'table' ? 'Board view' : 'Table view'}</Button>
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Task</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open tasks</p><p className="text-2xl font-bold text-blue-700">{stats.open ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> Overdue</p><p className="text-2xl font-bold text-red-600">{stats.overdue ?? 0}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label>Status</Label>
          <select className="block w-44 h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {CRM_TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {viewMode === 'table' && <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-muted-foreground"><tr>
            <th className="p-3">Task</th><th className="p-3">Customer</th><th className="p-3">Due</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t ${isOverdue(r) ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                <td className="p-3"><p className="font-medium">{r.title}</p>{r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}</td>
                <td className="p-3 text-sm">{r.customer?.name || '—'}</td>
                <td className="p-3 text-sm">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</td>
                <td className="p-3"><span className={`text-xs font-semibold ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span></td>
                <td className="p-3">
                  <select className={`text-xs rounded px-2 py-1 border-0 ${STATUS_COLORS[r.status] || 'bg-gray-100'}`} value={r.status} onChange={(e) => changeStatus(r.id, e.target.value)}>
                    {CRM_TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className="p-3 text-right"><Button variant="ghost" size="sm" onClick={() => del(r.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{loading ? 'Loading…' : 'No tasks.'}</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>}

      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {CRM_TASK_STATUSES.map((col) => (
            <div key={col} className="bg-gray-50 rounded-lg p-2 min-h-[80px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData('id'); if (id) changeStatus(id, col); }}>
              <p className="text-xs font-semibold text-muted-foreground px-1 pb-2">{col.replace(/_/g, ' ')} ({rows.filter((r) => r.status === col).length})</p>
              <div className="space-y-2">
                {rows.filter((r) => r.status === col).map((r) => (
                  <Card key={r.id} draggable onDragStart={(e) => e.dataTransfer.setData('id', r.id)} className="cursor-grab active:cursor-grabbing"><CardContent className="p-3">
                    <p className="font-medium text-sm">{r.title}</p>
                    {r.customer?.name && <p className="text-xs text-muted-foreground">{r.customer.name}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-semibold ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                      <select className="text-xs border rounded px-1 py-0.5" value={r.status} onChange={(e) => changeStatus(r.id, e.target.value)}>
                        {CRM_TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Follow-up Task</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer</Label>
                <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">— None —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                </select>
              </div>
              <div>
                <Label>Assign to</Label>
                <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.assignedStaffId} onChange={(e) => setForm({ ...form, assignedStaffId: e.target.value })}>
                  <option value="">— Unassigned —</option>
                  {staffList.map((s) => <option key={s.id} value={s.id}>{staffLabel(s)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Due Date</Label><Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
              <div>
                <Label>Priority</Label>
                <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {CRM_TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.title}>{saving ? 'Saving…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
