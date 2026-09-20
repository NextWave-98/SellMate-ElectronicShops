/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Plus, Trash2, RefreshCw, AlertTriangle, Pencil, CalendarClock, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
/**
 * Where a task came from, when it did not come from somebody typing it.
 *
 * A task raised off a Facebook lead or a website order used to look exactly
 * like one somebody typed by hand, so the inbox gave no clue which ones were
 * chasing new business.
 */
const RELATED_LABELS: Record<string, string> = {
  FACEBOOK_LEAD: 'Facebook lead',
  WEBSITE_LEAD: 'Website lead',
  WEBSITE_ORDER: 'Website order',
  LEAD: 'Lead',
};
const relatedLabel = (t?: string | null) =>
  t ? (RELATED_LABELS[t] || t.replace(/_/g, ' ').toLowerCase()) : null;

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500', MEDIUM: 'text-amber-600', HIGH: 'text-red-600',
};

export default function CrmTasksPage() {
  const { list, getStats, create, update, remove, restore } = useCrm();
  const { t } = useT();
  const { getCustomers } = useCustomer();
  const { getAllStaff } = useStaff() as any;
  const [customers, setCustomers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ open: 0, overdue: 0 });
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  // The API accepted these from the start; nothing ever sent them, so the
  // inbox could only be narrowed by status.
  const [assignee, setAssignee] = useState('');
  const [relatedType, setRelatedType] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ title: '', description: '', dueDate: '', priority: 'MEDIUM', customerId: '', assignedStaffId: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        list({
          status,
          assignedStaffId: assignee,
          relatedType,
          search,
          ...(onlyOverdue ? { overdue: 'true' } : {}),
        }),
        getStats(),
      ]);
      setRows((listRes?.data as any) ?? []);
      if (statsRes?.data) setStats(statsRes.data);
    } finally { setLoading(false); }
  }, [list, getStats, status, assignee, relatedType, search, onlyOverdue]);
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

  // Editing, which had no way in at all: once a task existed, its title, due
  // date and owner were fixed for ever.
  const [editing, setEditing] = useState<any>(null);
  const openEdit = (r: any) => setEditing({
    id: r.id,
    title: r.title || '',
    description: r.description || '',
    // datetime-local wants YYYY-MM-DDTHH:mm in local time.
    dueDate: r.dueDate ? new Date(new Date(r.dueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
    priority: r.priority || 'MEDIUM',
    customerId: r.customerId || '',
    assignedStaffId: r.assignedStaffId || '',
  });
  const saveEdit = async () => {
    if (!editing?.title) return;
    setSaving(true);
    try {
      const res = await update(editing.id, {
        title: editing.title,
        description: editing.description || null,
        dueDate: editing.dueDate ? new Date(editing.dueDate).toISOString() : null,
        priority: editing.priority,
        customerId: editing.customerId || null,
        assignedStaffId: editing.assignedStaffId || null,
      });
      if (res?.success || res?.status) { setEditing(null); load(); }
    } finally { setSaving(false); }
  };

  // Deleting is a soft delete now, so it can be taken back.
  const [lastDeleted, setLastDeleted] = useState<any>(null);
  const del = async (r: any) => {
    await remove(r.id);
    setLastDeleted(r);
    load();
  };
  const undoDelete = async () => {
    if (!lastDeleted) return;
    await restore(lastDeleted.id);
    setLastDeleted(null);
    load();
  };
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

      {lastDeleted && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <span className="flex-1">Deleted “{lastDeleted.title}”.</span>
          <Button size="sm" variant="outline" onClick={undoDelete}>Undo</Button>
          <Button size="sm" variant="ghost" onClick={() => setLastDeleted(null)}>Dismiss</Button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label>Status</Label>
          <select className="block w-44 h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {CRM_TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <Label>Assigned to</Label>
          <select className="block w-44 h-10 rounded-md border border-input bg-background px-3 text-sm" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Anyone</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{staffLabel(s)}</option>)}
          </select>
        </div>
        <div>
          <Label>Source</Label>
          <select className="block w-40 h-10 rounded-md border border-input bg-background px-3 text-sm" value={relatedType} onChange={(e) => setRelatedType(e.target.value)}>
            <option value="">Any</option>
            {Object.entries(RELATED_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>Search</Label>
          <Input className="w-52" placeholder="Title or notes" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 h-10 text-sm">
          <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} />
          Overdue only
        </label>
        {(status || assignee || relatedType || search || onlyOverdue) && (
          <Button variant="ghost" size="sm" className="h-10"
            onClick={() => { setStatus(''); setAssignee(''); setRelatedType(''); setSearch(''); setOnlyOverdue(false); }}>
            Clear
          </Button>
        )}
      </div>

      {viewMode === 'table' && <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-muted-foreground"><tr>
            <th className="p-3">Task</th><th className="p-3">Customer</th><th className="p-3">Assigned to</th><th className="p-3">Due</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t ${isOverdue(r) ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                <td className="p-3">
                  <p className="font-medium flex items-center gap-1.5">
                    {r.title}
                    {relatedLabel(r.relatedType) && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px] font-medium">
                        <Link2 className="w-2.5 h-2.5" /> {relatedLabel(r.relatedType)}
                      </span>
                    )}
                  </p>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  {r.location?.name && <p className="text-[10px] text-muted-foreground mt-0.5">{r.location.name}</p>}
                </td>
                <td className="p-3 text-sm">{r.customer?.name || ' '}</td>
                <td className="p-3 text-sm">{staffLabel(r.assignedStaff) !== 'Staff' ? staffLabel(r.assignedStaff) : <span className="text-muted-foreground">Unassigned</span>}</td>
                <td className="p-3 text-sm">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : ' '}</td>
                <td className="p-3"><span className={`text-xs font-semibold ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span></td>
                <td className="p-3">
                  <select className={`text-xs rounded px-2 py-1 border-0 ${STATUS_COLORS[r.status] || 'bg-gray-100'}`} value={r.status} onChange={(e) => changeStatus(r.id, e.target.value)}>
                    {CRM_TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" title="Edit" onClick={() => openEdit(r)}><Pencil className="w-4 h-4 text-gray-500" /></Button>
                  <Button variant="ghost" size="sm" title="Delete" onClick={() => del(r)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{loading ? 'Loading…' : 'No tasks.'}</td></tr>}
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
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {staffLabel(r.assignedStaff) !== 'Staff' && (
                        <span className="text-[10px] text-muted-foreground">{staffLabel(r.assignedStaff)}</span>
                      )}
                      {relatedLabel(r.relatedType) && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px]">
                          <Link2 className="w-2.5 h-2.5" /> {relatedLabel(r.relatedType)}
                        </span>
                      )}
                      {r.dueDate && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <CalendarClock className="w-2.5 h-2.5" /> {new Date(r.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
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

      {/* Edit an existing task */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div><Label>Title *</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Customer</Label>
                  <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editing.customerId} onChange={(e) => setEditing({ ...editing, customerId: e.target.value })}>
                    <option value="">  None  </option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Assign to</Label>
                  <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editing.assignedStaffId} onChange={(e) => setEditing({ ...editing, assignedStaffId: e.target.value })}>
                    <option value="">  Unassigned  </option>
                    {staffList.map((s) => <option key={s.id} value={s.id}>{staffLabel(s)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Due Date</Label><Input type="datetime-local" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} /></div>
                <div>
                  <Label>Priority</Label>
                  <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })}>
                    {CRM_TASK_PRIORITIES.map((pr) => <option key={pr} value={pr}>{pr}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving || !editing?.title}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <option value="">  None  </option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                </select>
              </div>
              <div>
                <Label>Assign to</Label>
                <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.assignedStaffId} onChange={(e) => setForm({ ...form, assignedStaffId: e.target.value })}>
                  <option value="">  Unassigned  </option>
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
