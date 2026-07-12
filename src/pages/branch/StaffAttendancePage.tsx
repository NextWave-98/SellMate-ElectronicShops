/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { Smartphone, LogIn, LogOut, Clock, RefreshCw, CheckCircle, XCircle, AlertCircle, Send, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';

interface TodayStatus {
  id: string;
  attendanceDate: string;
  dayInTime: string;
  dayOffTime: string | null;
  hoursWorked: number | null;
  status: 'checked_in' | 'checked_out' | 'admin_override';
}

interface AttendanceLog {
  id: string;
  attendanceDate: string;
  dayInTime: string;
  dayOffTime: string | null;
  hoursWorked: number | null;
  status: string;
  correctionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  correctionReason?: string;
  correctionAdminNote?: string;
}

interface Device {
  id: string;
  deviceName: string;
  deviceFingerprint: string;
  isActive: boolean;
  lastUsedAt: string | null;
}

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

function getOrCreateDeviceId(): string {
  const key = 'gcm_device_id_v2';
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateDeviceFingerprint();
    localStorage.setItem(key, id);
  }
  return id;
}

function CopyDeviceId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline"
      type="button"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : 'Copy full device ID'}
    </button>
  );
}

export default function StaffAttendancePage() {
  const todayApi = useFetch();
  const historyApi = useFetch();
  const checkInApi = useFetch();
  const checkOutApi = useFetch();
  const devicesApi = useFetch();
  const correctionApi = useFetch();

  const deviceFingerprint = getOrCreateDeviceId();

  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [history, setHistory] = useState<AttendanceLog[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Correction request modal
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);


  const isDeviceRegistered = devices.some(d => d.deviceFingerprint === deviceFingerprint && d.isActive);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [todayRes, historyRes, devicesRes] = await Promise.all([
      todayApi.execute('/attendance/my/today', { method: 'GET', silent: true }),
      historyApi.execute('/attendance/my/history?limit=30', { method: 'GET', silent: true }),
      devicesApi.execute('/attendance/my/devices', { method: 'GET', silent: true }),
    ]);
    setLoading(false);
    if (todayRes?.data) setTodayStatus(todayRes.data);
    else setTodayStatus(null);
    if (historyRes?.data) setHistory(historyRes.data.data ?? historyRes.data ?? []);
    if (devicesRes?.data) setDevices(devicesRes.data);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const handleCheckIn = async () => {
    if (!isDeviceRegistered) {
      toast.error('This device is not registered. Please register it first.');
      return;
    }
    setActionLoading(true);
    const res = await checkInApi.execute('/attendance/check-in', {
      method: 'POST',
      data: { deviceFingerprint },
    });
    setActionLoading(false);
    if (res?.success !== false) {
      toast.success('Checked in successfully!');
      fetchAll();
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    const res = await checkOutApi.execute('/attendance/check-out', {
      method: 'POST',
      data: { deviceFingerprint },
    });
    setActionLoading(false);
    if (res?.success !== false) {
      toast.success('Checked out successfully!');
      fetchAll();
    }
  };

  const openCorrectionModal = (log: AttendanceLog) => {
    setSelectedLog(log);
    setCorrectionReason('');
    setCorrectionOpen(true);
  };

  const handleSubmitCorrection = async () => {
    if (!selectedLog || !correctionReason.trim()) {
      toast.error('Please provide a reason for the correction request');
      return;
    }
    setSubmittingCorrection(true);
    const res = await correctionApi.execute('/attendance/my/correction-request', {
      method: 'POST',
      data: { logId: selectedLog.id, reason: correctionReason.trim() },
    });
    setSubmittingCorrection(false);
    if (res?.success !== false) {
      toast.success('Correction request submitted for admin review');
      setCorrectionOpen(false);
      fetchAll();
    }
  };

  const correctionStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-700">Pending Review</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default: return null;
    }
  };


  const formatTime = (dt: string | null) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const checkedIn = todayStatus?.status === 'checked_in';
  const checkedOut = todayStatus?.status === 'checked_out' || todayStatus?.status === 'admin_override';

  return (
    <div className="p-6 space-y-6  mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Today's Status Card */}
      <Card className={`border-2 ${checkedIn ? 'border-green-400' : checkedOut ? 'border-blue-400' : 'border-white/30'}`}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today — {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!todayStatus ? (
            <div className="text-center py-4">
              <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Not checked in yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Check In</p>
                <p className="text-xl font-bold text-green-600">{formatTime(todayStatus.dayInTime)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Check Out</p>
                <p className="text-xl font-bold text-blue-600">{formatTime(todayStatus.dayOffTime)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Hours</p>
                <p className="text-xl font-bold">{todayStatus.hoursWorked != null ? `${Number(todayStatus.hoursWorked).toFixed(1)}h` : '—'}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            {!isDeviceRegistered ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-amber-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Device not registered. Contact your administrator.</span>
              </div>
            ) : !todayStatus ? (
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleCheckIn} disabled={actionLoading}>
                <LogIn className="h-4 w-4 mr-2" /> {actionLoading ? 'Processing...' : 'Day In'}
              </Button>
            ) : checkedIn ? (
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleCheckOut} disabled={actionLoading}>
                <LogOut className="h-4 w-4 mr-2" /> {actionLoading ? 'Processing...' : 'Day Off'}
              </Button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Attendance complete for today</span>
              </div>
            )}
          </div>

          {!isDeviceRegistered && (
            <div className="text-center mt-2 space-y-1">
              <p className="text-xs text-amber-600">
                Your device (ID: {deviceFingerprint.slice(0, 8)}…) is not registered. Ask your administrator to register it.
              </p>
              <CopyDeviceId value={deviceFingerprint} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Devices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Registered Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No devices registered yet</p>
          ) : (
            <div className="space-y-2">
              {devices.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-white/20 bg-white/30 backdrop-blur-sm">
                  <div>
                    <p className="font-medium text-sm">{d.deviceName}</p>
                    <p className="text-xs text-gray-500 font-mono">{d.deviceFingerprint.slice(0, 16)}…</p>
                    {d.deviceFingerprint === deviceFingerprint && (
                      <Badge className="mt-1 bg-green-100 text-green-700 text-xs">This Device</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge className={d.isActive ? 'bg-green-100/60 text-green-700 backdrop-blur-sm' : 'bg-white/30 text-gray-500 backdrop-blur-sm'}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {d.lastUsedAt && (
                      <p className="text-xs text-gray-400 mt-1">Last used: {new Date(d.lastUsedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader><CardTitle className="text-base">My Attendance History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-gray-400">No history yet</TableCell></TableRow>
              ) : history.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.attendanceDate}</TableCell>
                  <TableCell>{formatTime(log.dayInTime)}</TableCell>
                  <TableCell>{formatTime(log.dayOffTime)}</TableCell>
                  <TableCell>{log.hoursWorked != null ? `${Number(log.hoursWorked).toFixed(1)}h` : '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge>{log.status.replace('_', ' ')}</Badge>
                      {correctionStatusBadge(log.correctionStatus)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {log.dayOffTime && log.correctionStatus !== 'pending' ? (
                      <Button size="sm" variant="outline" onClick={() => openCorrectionModal(log)}>
                        <AlertCircle className="h-3 w-3 mr-1" /> Request Fix
                      </Button>
                    ) : log.correctionStatus === 'pending' ? (
                      <span className="text-xs text-amber-600">Awaiting admin review</span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Correction Request Modal */}
      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Attendance Fix</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">
              Date: <strong>{selectedLog?.attendanceDate}</strong>
            </p>
            <div className="space-y-1">
              <Label>Reason for correction</Label>
              <Textarea
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                placeholder="Explain why the check-out was incorrect..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitCorrection} disabled={submittingCorrection || !correctionReason.trim()}>
              <Send className="h-4 w-4 mr-2" />
              {submittingCorrection ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
