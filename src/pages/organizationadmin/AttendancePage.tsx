/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from 'react';

import { Calendar, Users, CheckCircle, RefreshCw, Edit, Search, Plus, Upload, Monitor, Trash2, AlertCircle, CheckSquare, XSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import { useAuthRedux } from '../../hooks/useAuthRedux';

interface AttendanceLog {
  id: string;
  staffId: string;
  attendanceDate: string;
  dayInTime: string;
  dayOffTime: string | null;
  hoursWorked: number | null;
  status: 'checked_in' | 'checked_out' | 'admin_override';
  adminNote: string | null;
  correctionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  correctionReason?: string;
  correctionRequestedAt?: string;
  correctionAdminNote?: string;
  staff?: { staffId: string; user?: { name: string; email: string } };
}

interface StaffItem {
  id: string;
  staffId: string;
  user?: { name: string; email: string };
}

interface RawStaffItem {
  id: string;
  name?: string;
  email?: string;
  staff?: { id?: string; staffId?: string };
  user?: { name?: string; email?: string };
  staffId?: string;
}

interface RegisteredDevice {
  id: string;
  deviceName: string;
  deviceFingerprint: string;
  ipAddress?: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  staff?: { staffId: string; user?: { name: string } };
}

const statusColors: Record<string, string> = {
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-blue-100 text-blue-800',
  admin_override: 'bg-yellow-100 text-yellow-800',
};

function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fp', 2, 2);
  }
  const canvasData = canvas.toDataURL();

  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    new Date().getTimezoneOffset(),
    canvasData,
    navigator.hardwareConcurrency || '',
    navigator.platform || '',
  ];

  let hash = 0;
  const str = components.join('##');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const h1 = Math.abs(hash).toString(16).padStart(16, '0');
  const h2 = Math.abs(hash ^ 0xdeadbeef).toString(16).padStart(16, '0');
  return (h1 + h2).slice(0, 32);
}

function datetimeLocalToIso(value: string): string | undefined {
  if (!value?.trim()) return undefined;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function buildAttendanceTimePayload(dayInTime: string, dayOffTime: string) {
  const payload: { dayInTime: string; dayOffTime?: string } = {
    dayInTime: datetimeLocalToIso(dayInTime) || '',
  };
  const checkout = datetimeLocalToIso(dayOffTime);
  if (checkout) payload.dayOffTime = checkout;
  return payload;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = 'Browser';
  let os = 'Unknown';

  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}

export default function AttendancePage() {
  const logsApi = useFetch();
  const summaryApi = useFetch();
  const overrideApi = useFetch();
  const manualApi = useFetch();
  const bulkApi = useFetch();
  const devicesApi = useFetch();
  const staffApi = useFetch();
  const regDeviceApi = useFetch();
  const delDeviceApi = useFetch();
  const pendingCorrectionsApi = useFetch();
  const reviewCorrectionApi = useFetch();

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [attendanceLimit, setAttendanceLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ staffId: string; name: string; daysPresent: number; totalHours: number }[]>([]);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [staffIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Staff list
  const [staffList, setStaffList] = useState<StaffItem[]>([]);

  // Override modal
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideLogId, setOverrideLogId] = useState('');
  const [overrideStaffId, setOverrideStaffId] = useState('');
  const [overrideStaffName, setOverrideStaffName] = useState('');
  const [overrideForm, setOverrideForm] = useState({ attendanceDate: today, dayInTime: '', dayOffTime: '', adminNote: '' });

  // Manual entry modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ staffId: '', attendanceDate: today, dayInTime: '', dayOffTime: '', adminNote: '' });
  const [manualLoading, setManualLoading] = useState(false);

  // Bulk CSV upload modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{ staffId: string; attendanceDate: string; dayInTime: string; dayOffTime: string; adminNote: string }[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Devices tab
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [registerDeviceOpen, setRegisterDeviceOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ staffId: '', deviceName: '', deviceFingerprint: '', userAgent: '' });

  // Auth
  const { user: currentUser } = useAuthRedux();

  // Corrections tab
  const [pendingCorrections, setPendingCorrections] = useState<AttendanceLog[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLog, setReviewLog] = useState<AttendanceLog | null>(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', dayInTime: '', dayOffTime: '', adminNote: '' });
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(attendanceLimit) });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (staffIdFilter) params.set('staffId', staffIdFilter);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    const res = await logsApi.execute(`/attendance?${params}`, { method: 'GET', silent: true });
    setLoading(false);
    if (res?.data) {
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 0);
    }
  }, [page, startDate, endDate, staffIdFilter, statusFilter, attendanceLimit]);

  const fetchSummary = useCallback(async () => {
    const res = await summaryApi.execute(`/attendance/summary?startDate=${startDate}&endDate=${endDate}`, { method: 'GET', silent: true });
    if (res?.data) setSummary(Array.isArray(res.data) ? res.data : []);
  }, [startDate, endDate]);

  const fetchDevices = useCallback(async () => {
    setDevicesLoading(true);
    const res = await devicesApi.execute('/attendance/devices', { method: 'GET', silent: true });
    setDevicesLoading(false);
    if (res?.data) setDevices(res.data);
  }, []);

  const fetchStaff = useCallback(async () => {
    const res = await staffApi.execute('/staff', { method: 'GET', silent: true });
    if (res?.data) {
      const responseData = res.data.data ?? res.data;
      const staffArray = responseData?.staff ?? (Array.isArray(responseData) ? responseData : []);
      const mapped = staffArray.map((s: RawStaffItem) => ({
        id: s.staff?.id ?? s.id,
        staffId: s.staff?.staffId ?? s.staffId ?? '',
        user: {
          name: s.name ?? s.user?.name ?? '',
          email: s.email ?? s.user?.email ?? '',
        },
      }));
      setStaffList(mapped);
    }
  }, []);

  useEffect(() => { fetchLogs(); fetchSummary(); }, [fetchLogs, fetchSummary]);
  useEffect(() => { fetchStaff(); fetchDevices(); fetchPendingCorrections(); }, []);

  const fetchPendingCorrections = useCallback(async () => {
    setPendingLoading(true);
    const res = await pendingCorrectionsApi.execute('/attendance/corrections/pending', { method: 'GET', silent: true });
    setPendingLoading(false);
    if (res?.data) {
      setPendingCorrections(res.data.data || []);
      setPendingTotal(res.data.total || 0);
    }
  }, []);

  const openReviewModal = (log: AttendanceLog) => {
    setReviewLog(log);
    setReviewForm({
      status: 'approved',
      dayInTime: toDatetimeLocalValue(log.dayInTime),
      dayOffTime: toDatetimeLocalValue(log.dayOffTime),
      adminNote: log.correctionReason ?? '',
    });
    setReviewOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!reviewLog) return;
    setReviewLoading(true);
    const payload = {
      ...reviewForm,
      dayInTime: datetimeLocalToIso(reviewForm.dayInTime),
      dayOffTime: datetimeLocalToIso(reviewForm.dayOffTime),
    };
    const res = await reviewCorrectionApi.execute(`/attendance/corrections/${reviewLog.id}/review`, {
      method: 'POST',
      data: payload,
    });
    setReviewLoading(false);
    if (res?.success !== false) {
      toast.success(`Correction request ${reviewForm.status}`);
      setReviewOpen(false);
      fetchPendingCorrections();
      fetchLogs();
    }
  };

  const handleOverrideSubmit = async () => {
    if (!overrideLogId) {
      toast.error('No attendance record selected');
      return;
    }
    if (!overrideForm.dayInTime) {
      toast.error('Check-in time is required');
      return;
    }
    const times = buildAttendanceTimePayload(overrideForm.dayInTime, overrideForm.dayOffTime);
    if (!times.dayInTime) {
      toast.error('Invalid check-in time');
      return;
    }
    const payload: Record<string, string> = {
      attendanceDate: overrideForm.attendanceDate,
      dayInTime: times.dayInTime,
    };
    if (times.dayOffTime) payload.dayOffTime = times.dayOffTime;
    if (overrideForm.adminNote?.trim()) payload.adminNote = overrideForm.adminNote.trim();

    const res = await overrideApi.execute(`/attendance/logs/${overrideLogId}`, {
      method: 'PATCH',
      data: payload,
      showToastOnError: true,
    });
    if (res?.success !== false) {
      toast.success('Attendance updated');
      setOverrideOpen(false);
      fetchLogs();
    }
  };

  const openOverride = (log: AttendanceLog) => {
    setOverrideLogId(log.id);
    setOverrideStaffId(log.staffId);
    setOverrideStaffName(log.staff?.user?.name ?? log.staffId);
    setOverrideForm({
      attendanceDate: log.attendanceDate,
      dayInTime: toDatetimeLocalValue(log.dayInTime),
      dayOffTime: toDatetimeLocalValue(log.dayOffTime),
      adminNote: log.adminNote ?? '',
    });
    setOverrideOpen(true);
  };

  const handleManualSubmit = async () => {
    if (!manualForm.staffId || !manualForm.attendanceDate || !manualForm.dayInTime) {
      toast.error('Staff, date, and check-in time are required');
      return;
    }
    setManualLoading(true);
    const times = buildAttendanceTimePayload(manualForm.dayInTime, manualForm.dayOffTime);
    const payload = {
      ...manualForm,
      dayInTime: times.dayInTime,
      ...(times.dayOffTime ? { dayOffTime: times.dayOffTime } : {}),
    };
    const res = await manualApi.execute('/attendance/manual', { method: 'POST', data: payload });
    setManualLoading(false);
    if (res?.success !== false) {
      toast.success('Attendance record created');
      setManualOpen(false);
      setManualForm({ staffId: '', attendanceDate: today, dayInTime: '', dayOffTime: '', adminNote: '' });
      fetchLogs();
    }
  };

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
      const records = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
        return {
          staffId: row['staffid'] ?? row['staff_id'] ?? '',
          attendanceDate: row['attendancedate'] ?? row['attendance_date'] ?? row['date'] ?? '',
          dayInTime: row['dayintime'] ?? row['day_in_time'] ?? row['checkin'] ?? row['check_in'] ?? '',
          dayOffTime: row['dayofftime'] ?? row['day_off_time'] ?? row['checkout'] ?? row['check_out'] ?? '',
          adminNote: row['adminnote'] ?? row['admin_note'] ?? row['note'] ?? '',
        };
      }).filter(r => r.staffId && r.attendanceDate);
      setBulkPreview(records);
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (bulkPreview.length === 0) { toast.error('No valid records to upload'); return; }
    setBulkLoading(true);
    const res = await bulkApi.execute('/attendance/bulk-upload', { method: 'POST', data: { records: bulkPreview } });
    setBulkLoading(false);
    if (res?.success !== false) {
      const d = res?.data;
      toast.success(`Imported ${d?.success ?? bulkPreview.length} records${d?.errors?.length ? `, ${d.errors.length} failed` : ''}`);
      setBulkOpen(false);
      setBulkPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchLogs();
    }
  };

  const handleRegisterDevice = async () => {
    if (!deviceForm.staffId || !deviceForm.deviceName || !deviceForm.deviceFingerprint) {
      toast.error('Staff, device name, and fingerprint are required');
      return;
    }
    const res = await regDeviceApi.execute(`/attendance/staff/${deviceForm.staffId}/devices/register`, {
      method: 'POST',
      data: { deviceName: deviceForm.deviceName, deviceFingerprint: deviceForm.deviceFingerprint, userAgent: deviceForm.userAgent },
    });
    if (res?.success !== false) {
      toast.success('Device registered');
      setRegisterDeviceOpen(false);
      setDeviceForm({ staffId: '', deviceName: '', deviceFingerprint: '', userAgent: '' });
      fetchDevices();
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    const res = await delDeviceApi.execute(`/attendance/devices/${deviceId}`, { method: 'DELETE', data: {} });
    if (res?.success !== false) { toast.success('Device removed'); fetchDevices(); }
  };

  const formatTime = (dt: string | null) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const csvTemplate = `staffId,attendanceDate,dayInTime,dayOffTime,adminNote\n<uuid>,2026-05-01,2026-05-01T08:00:00,2026-05-01T17:00:00,Optional note`;

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track staff attendance, bulk upload, and manage registered devices</p>
        </div>
        <Button onClick={() => { fetchLogs(); fetchSummary(); }} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div><p className="text-sm text-gray-500">Total Logs</p><p className="text-2xl font-bold">{total}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div><p className="text-sm text-gray-500">Staff Present (period)</p><p className="text-2xl font-bold">{summary.length}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="logs">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <TabsList className="w-max min-w-full sm:w-auto">
          <TabsTrigger value="logs"><Calendar className="h-4 w-4 mr-2" />Attendance Logs</TabsTrigger>
          <TabsTrigger value="corrections"><AlertCircle className="h-4 w-4 mr-2" />Pending Fixes {pendingTotal > 0 ? `(${pendingTotal})` : ''}</TabsTrigger>
          <TabsTrigger value="devices"><Monitor className="h-4 w-4 mr-2" />Registered Devices</TabsTrigger>
        </TabsList>
        </div>

        {/* ── Attendance Logs ── */}
        <TabsContent value="logs" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="checked_in">Checked In</SelectItem>
                      <SelectItem value="checked_out">Checked Out</SelectItem>
                      <SelectItem value="admin_override">Admin Override</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => { setPage(1); fetchLogs(); }} className="w-full">
                    <Search className="h-4 w-4 mr-2" /> Search
                  </Button>
                </div>
                <div className="flex items-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setManualOpen(true)} className="flex-1">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="flex-1">
                    <Upload className="h-4 w-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">Loading...</TableCell></TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">No attendance records found</TableCell></TableRow>
                  ) : logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.staff?.user?.name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{log.staff?.staffId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{log.attendanceDate}</TableCell>
                      <TableCell>{formatTime(log.dayInTime)}</TableCell>
                      <TableCell>{formatTime(log.dayOffTime)}</TableCell>
                      <TableCell>{log.hoursWorked != null ? `${Number(log.hoursWorked).toFixed(1)}h` : '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[log.status] ?? 'bg-gray-100 text-gray-700'}>{log.status.replace(/_/g, ' ')}</Badge>
                        {log.correctionStatus && log.correctionStatus !== 'none' && (
                          <Badge className={
                            log.correctionStatus === 'pending' ? 'bg-amber-100 text-amber-700 ml-1' :
                            log.correctionStatus === 'approved' ? 'bg-green-100 text-green-700 ml-1' :
                            'bg-red-100 text-red-700 ml-1'
                          }>{log.correctionStatus}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openOverride(log)}>
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>Page {page} of {totalPages}</span>
                <select
                  value={attendanceLimit}
                  onChange={e => { setAttendanceLimit(Number(e.target.value)); setPage(1); }}
                  className="text-sm border border-white/40 rounded bg-white/30 backdrop-blur-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ── Pending Corrections Tab ── */}
        <TabsContent value="corrections" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pending Correction Requests</CardTitle>
              <Button size="sm" variant="outline" onClick={fetchPendingCorrections}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Loading...</TableCell></TableRow>
                  ) : pendingCorrections.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No pending correction requests</TableCell></TableRow>
                  ) : pendingCorrections.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.staff?.user?.name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{log.staff?.staffId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{log.attendanceDate}</TableCell>
                      <TableCell>{formatTime(log.dayInTime)}</TableCell>
                      <TableCell>{formatTime(log.dayOffTime)}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-700 truncate" title={log.correctionReason}>{log.correctionReason}</p>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openReviewModal(log)}>
                          <Edit className="h-3 w-3 mr-1" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Devices Tab ── */}
        <TabsContent value="devices" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registered Devices</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={fetchDevices}><RefreshCw className="h-4 w-4" /></Button>
                <Button size="sm" onClick={() => {
                  const fingerprint = generateDeviceFingerprint();
                  const deviceName = getDeviceName();
                  const userAgent = navigator.userAgent;
                  let matchedStaffId = '';
                  if (currentUser?.email) {
                    const matched = staffList.find(s => s.user?.email === currentUser.email);
                    if (matched) matchedStaffId = matched.id;
                  }
                  setDeviceForm({ staffId: matchedStaffId, deviceName, deviceFingerprint: fingerprint, userAgent });
                  setRegisterDeviceOpen(true);
                }}><Plus className="h-4 w-4 mr-1" /> Register Device</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Device Name</TableHead>
                    <TableHead>Fingerprint</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devicesLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">Loading...</TableCell></TableRow>
                  ) : devices.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">No devices registered yet</TableCell></TableRow>
                  ) : devices.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{d.staff?.user?.name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{d.staff?.staffId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{d.deviceName}</TableCell>
                      <TableCell className="font-mono text-xs">{d.deviceFingerprint.slice(0, 12)}…</TableCell>
                      <TableCell>{d.ipAddress ?? '—'}</TableCell>
                      <TableCell>{d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Badge className={d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {d.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteDevice(d.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit / Override Modal ── */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Attendance — {overrideStaffName}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Attendance Date</Label>
              <Input type="date" value={overrideForm.attendanceDate} onChange={e => setOverrideForm(f => ({ ...f, attendanceDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Check-In Time</Label>
              <Input type="datetime-local" value={overrideForm.dayInTime} onChange={e => setOverrideForm(f => ({ ...f, dayInTime: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Check-Out Time (optional)</Label>
              <Input type="datetime-local" value={overrideForm.dayOffTime} onChange={e => setOverrideForm(f => ({ ...f, dayOffTime: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Admin Note</Label>
              <Input value={overrideForm.adminNote} onChange={e => setOverrideForm(f => ({ ...f, adminNote: e.target.value }))} placeholder="Reason for change" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button onClick={handleOverrideSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual Entry Modal ── */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Attendance Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Staff Member</Label>
              <Select value={manualForm.staffId} onValueChange={v => setManualForm(f => ({ ...f, staffId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.user?.name ?? s.staffId} ({s.staffId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Attendance Date</Label>
              <Input type="date" value={manualForm.attendanceDate} onChange={e => setManualForm(f => ({ ...f, attendanceDate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Check-In Time</Label>
                <Input type="datetime-local" value={manualForm.dayInTime} onChange={e => setManualForm(f => ({ ...f, dayInTime: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Check-Out Time (optional)</Label>
                <Input type="datetime-local" value={manualForm.dayOffTime} onChange={e => setManualForm(f => ({ ...f, dayOffTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Input value={manualForm.adminNote} onChange={e => setManualForm(f => ({ ...f, adminNote: e.target.value }))} placeholder="e.g. Manual entry for field visit" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button onClick={handleManualSubmit} disabled={manualLoading}>
              {manualLoading ? 'Saving…' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk CSV Upload Modal ── */}
      <Dialog open={bulkOpen} onOpenChange={open => { setBulkOpen(open); if (!open) { setBulkPreview([]); if (fileInputRef.current) fileInputRef.current.value = ''; } }}>
        <DialogContent className="max-w-3xl max-h-[80vh]  ">
          <DialogHeader><DialogTitle>Bulk Attendance Upload (CSV)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 text-xs font-mono text-gray-600 whitespace-pre-wrap border border-white/20">{csvTemplate}</div>
            <p className="text-xs text-gray-500">
              Required columns: <strong>staffId</strong> (UUID from Staff table), <strong>attendanceDate</strong> (YYYY-MM-DD), <strong>dayInTime</strong> (ISO datetime). Optional: dayOffTime, adminNote.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => {
                const blob = new Blob([csvTemplate], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'attendance_template.csv'; a.click();
                URL.revokeObjectURL(url);
              }}>Download Template</Button>
              <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVFile} className="flex-1" />
            </div>
            {bulkPreview.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{bulkPreview.length} records ready to import:</p>
                <div className="border rounded overflow-auto max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkPreview.slice(0, 20).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{r.staffId.slice(0, 8)}…</TableCell>
                          <TableCell>{r.attendanceDate}</TableCell>
                          <TableCell>{r.dayInTime}</TableCell>
                          <TableCell>{r.dayOffTime || '—'}</TableCell>
                        </TableRow>
                      ))}
                      {bulkPreview.length > 20 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-gray-400 text-xs">… and {bulkPreview.length - 20} more</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkSubmit} disabled={bulkLoading || bulkPreview.length === 0}>
              {bulkLoading ? 'Uploading…' : `Import ${bulkPreview.length} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Review Correction Modal ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Correction Request</DialogTitle></DialogHeader>
          {reviewLog && (
            <div className="space-y-4 py-2">
              <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 text-sm border border-white/20">
                <p><strong>Staff:</strong> {reviewLog.staff?.user?.name ?? '—'} ({reviewLog.staff?.staffId})</p>
                <p><strong>Date:</strong> {reviewLog.attendanceDate}</p>
                <p><strong>Current Check-In:</strong> {formatTime(reviewLog.dayInTime)}</p>
                <p><strong>Current Check-Out:</strong> {formatTime(reviewLog.dayOffTime)}</p>
                <p className="mt-2"><strong>Staff Reason:</strong></p>
                <p className="text-gray-700">{reviewLog.correctionReason}</p>
              </div>
              <div className="space-y-1">
                <Label>Decision</Label>
                <Select value={reviewForm.status} onValueChange={v => setReviewForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved"><CheckSquare className="h-4 w-4 inline mr-1 text-green-600" /> Approve & Fix</SelectItem>
                    <SelectItem value="rejected"><XSquare className="h-4 w-4 inline mr-1 text-red-600" /> Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reviewForm.status === 'approved' && (
                <>
                  <div className="space-y-1">
                    <Label>New Check-In Time</Label>
                    <Input type="datetime-local" value={reviewForm.dayInTime} onChange={e => setReviewForm(f => ({ ...f, dayInTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>New Check-Out Time</Label>
                    <Input type="datetime-local" value={reviewForm.dayOffTime} onChange={e => setReviewForm(f => ({ ...f, dayOffTime: e.target.value }))} />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label>Admin Note</Label>
                <Input value={reviewForm.adminNote} onChange={e => setReviewForm(f => ({ ...f, adminNote: e.target.value }))} placeholder="Optional note" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleReviewSubmit} disabled={reviewLoading}>
              {reviewLoading ? 'Saving…' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Register Device Modal ── */}
      <Dialog open={registerDeviceOpen} onOpenChange={setRegisterDeviceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register Device for Staff</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Staff Member</Label>
              <Select value={deviceForm.staffId} onValueChange={v => setDeviceForm(f => ({ ...f, staffId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.user?.name ?? s.staffId} ({s.staffId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Device Name</Label>
              <Input value={deviceForm.deviceName} onChange={e => setDeviceForm(f => ({ ...f, deviceName: e.target.value }))} placeholder="e.g. John's iPhone 14" />
            </div>
            <div className="space-y-1">
              <Label>Device Fingerprint</Label>
              <Input value={deviceForm.deviceFingerprint} onChange={e => setDeviceForm(f => ({ ...f, deviceFingerprint: e.target.value }))} className="font-mono text-xs" placeholder="Paste staff's device ID here" />
              <p className="text-xs text-gray-500">Auto-detected from this browser. Override with the staff member's device ID if they are on a different device/profile.</p>
            </div>
            <div className="space-y-1">
              <Label>User Agent (optional)</Label>
              <Input value={deviceForm.userAgent} onChange={e => setDeviceForm(f => ({ ...f, userAgent: e.target.value }))} placeholder="Browser or app info" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterDeviceOpen(false)}>Cancel</Button>
            <Button onClick={handleRegisterDevice}>Register Device</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
