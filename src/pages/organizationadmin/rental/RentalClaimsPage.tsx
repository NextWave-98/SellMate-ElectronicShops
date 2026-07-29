/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useRental } from '../../../hooks/useRental';
import { selectCls, statusColor } from './shared';

const CLAIM_STATUSES = ['OPEN', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'];

/** Insurance claims tracking. */
export default function RentalClaimsPage() {
  const rental = useRental();
  const { getClaims, getVehicles } = rental;

  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ vehicleId: '', claimNo: '', insurer: '', incidentDate: '', description: '', claimedAmount: '' });

  // Approve dialog (replaces window.prompt)
  const [approveTarget, setApproveTarget] = useState<{ claim: any; nextStatus: string } | null>(null);
  const [approvedAmount, setApprovedAmount] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getClaims();
      setClaims((res?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [getClaims]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVehicles = async () => {
    const res = await getVehicles({ limit: 100 });
    setVehicles((res?.data as any)?.vehicles ?? []);
  };

  const openModal = async () => {
    setEditingId(null);
    setForm({ vehicleId: '', claimNo: '', insurer: '', incidentDate: '', description: '', claimedAmount: '' });
    setShowModal(true);
    await loadVehicles();
  };

  const openEdit = async (c: any) => {
    setEditingId(c.id);
    setForm({
      vehicleId: c.vehicleId ?? '', claimNo: c.claimNo ?? '', insurer: c.insurer ?? '',
      incidentDate: c.incidentDate ?? '', description: c.description ?? '',
      claimedAmount: c.claimedAmount != null ? String(c.claimedAmount) : '',
    });
    setShowModal(true);
    await loadVehicles();
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        claimedAmount: Number(form.claimedAmount || 0),
        incidentDate: form.incidentDate || null,
        description: form.description || null,
      };
      const res = editingId
        ? await rental.updateClaim(editingId, payload)
        : await rental.createClaim(payload);
      if (res?.success || res?.status) { setShowModal(false); setEditingId(null); load(); }
    } finally { setSaving(false); }
  };

  const changeStatus = async (claim: any, nextStatus: string) => {
    if (nextStatus === 'APPROVED' && claim.approvedAmount == null) {
      setApprovedAmount(String(claim.claimedAmount ?? ''));
      setApproveTarget({ claim, nextStatus });
      return;
    }
    await rental.updateClaim(claim.id, { status: nextStatus });
    load();
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setSaving(true);
    try {
      await rental.updateClaim(approveTarget.claim.id, {
        status: approveTarget.nextStatus,
        approvedAmount: Number(approvedAmount || 0),
      });
      setApproveTarget(null);
      load();
    } finally { setSaving(false); }
  };

  if (loading && claims.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openModal}><Plus className="w-4 h-4 mr-1" /> New Claim</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Claim #</th><th className="p-3">Vehicle</th><th className="p-3">Insurer</th>
              <th className="p-3">Incident</th><th className="p-3">Claimed</th><th className="p-3">Approved</th>
              <th className="p-3">Status</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.claimNo}</td>
                <td className="p-3">{c.vehicle?.registrationNo || '—'}</td>
                <td className="p-3">{c.insurer}</td>
                <td className="p-3">{c.incidentDate || '—'}</td>
                <td className="p-3">Rs {Number(c.claimedAmount).toLocaleString()}</td>
                <td className="p-3">{c.approvedAmount != null ? `Rs ${Number(c.approvedAmount).toLocaleString()}` : '—'}</td>
                <td className="p-3"><Badge className={statusColor[c.status] || 'bg-gray-100 text-gray-700'}>{c.status}</Badge></td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <select className={selectCls} value={c.status} onChange={(e) => changeStatus(c, e.target.value)}>
                      {CLAIM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => openEdit(c)} title="Edit"><Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No insurance claims</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>

      {/* New claim dialog */}
      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Insurance Claim' : 'New Insurance Claim'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Vehicle *</Label>
              <select className={selectCls} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNo} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div><Label>Claim No *</Label><Input value={form.claimNo} onChange={(e) => setForm({ ...form, claimNo: e.target.value })} /></div>
            <div><Label>Insurer *</Label><Input value={form.insurer} onChange={(e) => setForm({ ...form, insurer: e.target.value })} /></div>
            <div><Label>Incident Date</Label><Input type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} /></div>
            <div><Label>Claimed Amount (Rs)</Label><Input type="number" value={form.claimedAmount} onChange={(e) => setForm({ ...form, claimedAmount: e.target.value })} /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.vehicleId || !form.claimNo || !form.insurer}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Claim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve amount dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Approve Claim {approveTarget?.claim?.claimNo}</DialogTitle></DialogHeader>
          <div>
            <Label>Approved amount (Rs)</Label>
            <Input type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={confirmApprove} disabled={saving || approvedAmount === ''}>{saving ? 'Saving...' : 'Approve'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
