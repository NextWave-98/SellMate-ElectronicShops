/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays, Plus, Bell, Trash2, Clock, User, Car, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAppointment, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '../../hooks/useAppointment';
import useCustomer from '../../hooks/useCustomer';
import { useStaff } from '../../hooks/useStaff';
import { useT } from '../../i18n/useT';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const staffLabel = (s: any) => (s?.user?.name || s?.user?.firstName || s?.name || s?.staffId || 'Staff');

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-indigo-100 text-indigo-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
  NO_SHOW: 'bg-red-100 text-red-800',
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export default function AppointmentsPage() {
  const { list, getStats, create, setStatus: updateAppointmentStatus, remind, remove } = useAppointment();
  const { t } = useT();
  const { getCustomers } = useCustomer();
  const { getAllStaff } = useStaff() as any;
  const [customers, setCustomers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  const [stats, setStats] = useState<any>({ today: 0, pendingRequests: 0, upcoming: 0 });
  const [rows, setRows] = useState<any[]>([]);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(inDays(14));
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'day' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({
    customerId: '', staffId: '', customerName: '', customerPhone: '', vehicleReg: '',
    scheduledAt: '', durationMinutes: 60, type: 'WALK_IN', complaint: '', estimatedCost: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        list({ from: from ? `${from}T00:00:00` : '', to: to ? `${to}T23:59:59` : '', status }),
        getStats(),
      ]);
      setRows((listRes?.data as any) ?? []);
      if (statsRes?.data) setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  }, [list, getStats, from, to, status]);

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
    if (!form.customerName || !form.scheduledAt) return;
    setSaving(true);
    try {
      const res = await create({
        customerId: form.customerId || null,
        staffId: form.staffId || null,
        customerName: form.customerName,
        customerPhone: form.customerPhone || null,
        title: form.complaint || 'Service appointment',
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 60,
        type: form.type,
        complaint: form.complaint || null,
        estimatedCost: Number(form.estimatedCost) || 0,
        ...(form.vehicleReg ? { services: [{ name: `Vehicle: ${form.vehicleReg}`, estimatedCost: 0 }] } : {}),
      });
      if (res?.success || res?.status) {
        setShowCreate(false);
        setForm({ customerName: '', customerPhone: '', vehicleReg: '', scheduledAt: '', durationMinutes: 60, type: 'WALK_IN', complaint: '', estimatedCost: 0 });
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, s: any) => { await updateAppointmentStatus(id, s); load(); };
  const remindOne = async (id: string) => { await remind(id); load(); };
  const del = async (id: string) => { await remove(id); load(); };

  // Calendar helpers: navigating months also widens the from/to filter to the month
  const openCalendar = () => {
    setViewMode('calendar');
    syncMonthRange(calMonth);
  };
  const syncMonthRange = (m: Date) => {
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    setFrom(first.toISOString().slice(0, 10));
    setTo(last.toISOString().slice(0, 10));
  };
  const shiftMonth = (delta: number) => {
    const next = new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1);
    setCalMonth(next);
    syncMonthRange(next);
  };
  const calendarDays = (() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: Date | null; items: any[] }[] = [];
    for (let i = 0; i < firstWeekday; i++) days.push({ date: null, items: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const items = rows.filter((r) => {
        const t2 = new Date(r.scheduledAt);
        return t2.getFullYear() === year && t2.getMonth() === month && t2.getDate() === d;
      }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      days.push({ date: new Date(year, month, d), items });
    }
    return days;
  })();
  const isToday = (d: Date) => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-800">
          <CalendarDays className="w-7 h-7" /> {t('appointments')}
        </h1>
        <div className="flex gap-2 items-center flex-wrap">
          <LanguageSwitcher />
          <div className="inline-flex rounded-md border overflow-hidden">
            {([['list', 'List'], ['day', 'Day'], ['calendar', 'Calendar']] as const).map(([mode, label]) => (
              <button key={mode}
                className={`px-3 py-1.5 text-sm font-medium ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'} ${mode !== 'list' ? 'border-l' : ''}`}
                onClick={() => (mode === 'calendar' ? openCalendar() : setViewMode(mode))}>
                {label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Appointment</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Today</p><p className="text-2xl font-bold text-blue-700">{stats.today ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Online requests (pending)</p><p className="text-2xl font-bold text-amber-600">{stats.pendingRequests ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Upcoming</p><p className="text-2xl font-bold text-indigo-700">{stats.upcoming ?? 0}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div>
          <Label>Status</Label>
          <select className="block w-44 h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Month calendar */}
      {viewMode === 'calendar' && (
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Button size="sm" variant="outline" onClick={() => shiftMonth(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <p className="font-semibold">{calMonth.toLocaleString('en', { month: 'long', year: 'numeric' })}</p>
            <Button size="sm" variant="outline" onClick={() => shiftMonth(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-px text-[11px] font-semibold text-muted-foreground mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="p-1 text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
            {calendarDays.map((day, i) => (
              <div key={i} className={`bg-background min-h-24 p-1 ${day.date && isToday(day.date) ? 'ring-2 ring-primary ring-inset' : ''}`}>
                {day.date && (
                  <>
                    <p className="text-[11px] font-semibold text-muted-foreground">{day.date.getDate()}</p>
                    <div className="space-y-0.5 mt-0.5">
                      {day.items.slice(0, 3).map((r: any) => (
                        <div key={r.id}
                          title={`${new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${r.customer?.name || r.customerName || ''} (${r.status})`}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-default ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>
                          {new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {r.customer?.name || r.customerName || r.appointmentNo}
                        </div>
                      ))}
                      {day.items.length > 3 && <p className="text-[10px] text-muted-foreground">+{day.items.length - 3} more</p>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* List */}
      {viewMode === 'list' && (
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">No.</th><th className="p-3">When</th><th className="p-3">Customer</th>
                <th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{r.appointmentNo}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" />{new Date(r.scheduledAt).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">{r.durationMinutes} min</span>
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1"><User className="w-3 h-3 text-muted-foreground" />{r.customer?.name || r.customerName || '—'}</span>
                    {(r.customer?.phone || r.customerPhone) && <span className="block text-xs text-muted-foreground">{r.customer?.phone || r.customerPhone}</span>}
                    {r.vehicle?.registrationNo && <span className="text-xs text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3" />{r.vehicle.registrationNo}</span>}
                  </td>
                  <td className="p-3"><Badge variant="outline" className="text-[10px]">{r.type}</Badge></td>
                  <td className="p-3">
                    <select
                      className={`text-xs rounded px-2 py-1 border-0 ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}
                      value={r.status}
                      onChange={(e) => changeStatus(r.id, e.target.value)}
                    >
                      {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" title="Send reminder" onClick={() => remindOne(r.id)}><Bell className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" title="Delete" onClick={() => del(r.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{loading ? 'Loading…' : 'No appointments in this range.'}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      )}

      {/* Day-grouped view */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {Object.entries(rows.reduce((acc: Record<string, any[]>, r: any) => { const d = new Date(r.scheduledAt).toLocaleDateString(); (acc[d] = acc[d] || []).push(r); return acc; }, {})).map(([date, items]) => (
            <div key={date}>
              <p className="text-sm font-semibold text-blue-800 mb-2">{date} <span className="text-xs text-muted-foreground">({(items as any[]).length})</span></p>
              <div className="space-y-2">
                {(items as any[]).map((r) => (
                  <Card key={r.id}><CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {r.customer?.name || r.customerName || '—'}</p>
                      {r.title && <p className="text-xs text-muted-foreground">{r.title}</p>}
                    </div>
                    <select className={`text-xs rounded px-2 py-1 border-0 ${STATUS_COLORS[r.status] || 'bg-gray-100'}`} value={r.status} onChange={(e) => changeStatus(r.id, e.target.value)}>
                      {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </CardContent></Card>
                ))}
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-center text-muted-foreground py-8">No appointments in this range.</p>}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Existing Customer (optional)</Label>
              <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.customerId}
                onChange={(e) => {
                  const c = customers.find((x) => x.id === e.target.value);
                  setForm({ ...form, customerId: e.target.value, customerName: c?.name || form.customerName, customerPhone: c?.phone || form.customerPhone });
                }}>
                <option value="">— Walk-in / new (type below) —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
              </select>
            </div>
            <div>
              <Label>Assign Staff (optional)</Label>
              <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
                <option value="">— Unassigned —</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{staffLabel(s)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Customer Name *</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} /></div>
            </div>
            <div><Label>Vehicle Reg No</Label><Input value={form.vehicleReg} onChange={(e) => setForm({ ...form, vehicleReg: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date & Time *</Label><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {APPOINTMENT_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div><Label>Est. Cost (Rs)</Label><Input type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} /></div>
            </div>
            <div><Label>Complaint / Notes</Label><Input value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.customerName || !form.scheduledAt}>{saving ? 'Saving…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
