/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FaceCaptureModal } from '@/components/attendance/FaceCaptureModal';
import { enrollStaffFace } from '@/services/attendanceBiometricService';
import { getAccessToken } from '@/utils/tokenStorage';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

function authHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface StaffItem {
  id: string;
  staffId: string;
  user?: { name: string };
}

interface FallbackRow {
  id: string;
  staffId: string;
  action: string;
  claimedAt: string;
  attendanceDate: string;
  reason?: string;
  staff?: { staffId: string; user?: { name: string } };
}

export function BiometricAttendanceAdmin({ staffList }: { staffList: StaffItem[] }) {
  const [settings, setSettings] = useState({
    enabled: false,
    enforceCheckIn: false,
    enforceCheckOut: false,
    maxRetries: 3,
  });
  const [fallbacks, setFallbacks] = useState<FallbackRow[]>([]);
  const [enrollStaffId, setEnrollStaffId] = useState('');
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, fRes] = await Promise.all([
        axios.get(`${BASE_URL}/attendance/biometric/settings`, { headers: authHeaders(), withCredentials: true }),
        axios.get(`${BASE_URL}/attendance/biometric/fallbacks/pending`, { headers: authHeaders(), withCredentials: true }),
      ]);
      setSettings(sRes.data?.data ?? sRes.data);
      const fd = fRes.data?.data?.data ?? fRes.data?.data ?? [];
      setFallbacks(Array.isArray(fd) ? fd : []);
    } catch {
      toast.error('Could not load biometric settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    await axios.patch(`${BASE_URL}/attendance/biometric/settings`, settings, {
      headers: authHeaders(),
      withCredentials: true,
    });
    toast.success('Biometric settings saved');
  };

  const reviewFallback = async (requestId: string, approve: boolean) => {
    await axios.post(
      `${BASE_URL}/attendance/biometric/fallbacks/${requestId}/review`,
      { approve, reviewerNote: approve ? 'Approved' : 'Rejected' },
      { headers: authHeaders(), withCredentials: true },
    );
    toast.success(approve ? 'Approved' : 'Rejected');
    load();
  };

  const handleEnrollCapture = async (blobs: Blob[]) => {
    if (!enrollStaffId) return;
    await enrollStaffFace(enrollStaffId, blobs.slice(0, 5));
    toast.success('Face enrollment saved');
    setEnrollOpen(false);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Face attendance rollout</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable face attendance (pilot)</Label>
            <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enforce check-in verification</Label>
            <Switch checked={settings.enforceCheckIn} onCheckedChange={(v) => setSettings((s) => ({ ...s, enforceCheckIn: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enforce check-out verification</Label>
            <Switch checked={settings.enforceCheckOut} onCheckedChange={(v) => setSettings((s) => ({ ...s, enforceCheckOut: v }))} />
          </div>
          <Button onClick={saveSettings} disabled={loading}>Save settings</Button>
          <p className="text-xs text-gray-500">Start with enabled=false, enroll staff, then enable enforce per pilot branch.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Enroll staff face</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[200px]">
            <Label>Staff</Label>
            <Select value={enrollStaffId} onValueChange={setEnrollStaffId}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.user?.name ?? s.staffId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!enrollStaffId} onClick={() => setEnrollOpen(true)}>Capture enrollment</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">PIN fallback approvals</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fallbacks.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-400">No pending requests</TableCell></TableRow>
              ) : fallbacks.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.staff?.user?.name ?? r.staffId}</TableCell>
                  <TableCell>{r.action}</TableCell>
                  <TableCell>{r.attendanceDate}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.reason ?? '—'}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" onClick={() => reviewFallback(r.id, true)}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => reviewFallback(r.id, false)}>Reject</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FaceCaptureModal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        livenessPrompt="blink"
        onCapture={handleEnrollCapture}
        title="Staff face enrollment"
        frameCount={3}
      />
    </div>
  );
}
