/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, AlertTriangle, Trash2, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useRental, type DriverLicenseRecord } from '../../../hooks/useRental';
import { selectCls } from './shared';

const today = () => new Date().toISOString().slice(0, 10);

/** Standalone review of all driving licenses / NICs on file across customers. */
export default function RentalDriverLicensesPage() {
  const rental = useRental();
  const { getDriverLicenses } = rental;

  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<DriverLicenseRecord[]>([]);
  const [search, setSearch] = useState('');
  const [expiringInDays, setExpiringInDays] = useState('');
  const [detail, setDetail] = useState<DriverLicenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriverLicenseRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDriverLicenses(
        expiringInDays ? { expiringInDays: Number(expiringInDays) } : undefined
      );
      setLicenses(((res?.data as any) ?? []) as DriverLicenseRecord[]);
    } finally {
      setLoading(false);
    }
  }, [getDriverLicenses, expiringInDays]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return licenses;
    return licenses.filter((l) =>
      String(l.licenseNo || '').toLowerCase().includes(q) ||
      String(l.nicNo || '').toLowerCase().includes(q) ||
      String(l.customer?.name || '').toLowerCase().includes(q) ||
      String(l.customer?.phone || '').toLowerCase().includes(q)
    );
  }, [licenses, search]);

  const toggleVerify = async (l: DriverLicenseRecord) => {
    await rental.updateDriverLicense(l.id, { isVerified: !l.isVerified });
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await rental.deleteDriverLicense(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const isExpired = (l: DriverLicenseRecord) => Boolean(l.licenseExpiry && l.licenseExpiry < today());

  if (loading && licenses.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search license / NIC / customer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${selectCls} max-w-48`} value={expiringInDays} onChange={(e) => setExpiringInDays(e.target.value)}>
          <option value="">All licenses</option>
          <option value="30">Expiring in 30 days</option>
          <option value="60">Expiring in 60 days</option>
          <option value="90">Expiring in 90 days</option>
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} on file</span>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Customer</th><th className="p-3">License No</th><th className="p-3">NIC</th>
              <th className="p-3">Expiry</th><th className="p-3">Years Held</th><th className="p-3">Verified</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">
                  <p className="font-medium">{l.customer?.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{l.customer?.phone || ''}</p>
                </td>
                <td className="p-3 font-mono">{l.licenseNo}</td>
                <td className="p-3">{l.nicNo || '—'}</td>
                <td className="p-3">
                  {l.licenseExpiry || '—'}
                  {isExpired(l) && <Badge className="ml-1.5 bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>}
                </td>
                <td className="p-3">{l.yearsHeld != null ? `${l.yearsHeld}y` : '—'}</td>
                <td className="p-3">
                  {l.isVerified
                    ? <Badge className="bg-green-100 text-green-800"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge>
                    : <Badge variant="outline">Unverified</Badge>}
                </td>
                <td className="p-3 space-x-1 whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => setDetail(l)}><IdCard className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toggleVerify(l)}>{l.isVerified ? 'Unverify' : 'Verify'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(l)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">
                {licenses.length === 0 ? 'No licenses on file yet — captured during bookings.' : 'No licenses match your filters'}
              </td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>License — {detail?.licenseNo}</DialogTitle></DialogHeader>
          <DialogBody>
            {detail && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-muted-foreground">Customer:</span> {detail.customer?.name || '—'}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {detail.customer?.phone || '—'}</p>
                  <p><span className="text-muted-foreground">NIC:</span> {detail.nicNo || '—'}</p>
                  <p><span className="text-muted-foreground">DOB:</span> {detail.dateOfBirth || '—'}</p>
                  <p><span className="text-muted-foreground">Issued:</span> {detail.licenseIssueDate || '—'}</p>
                  <p><span className="text-muted-foreground">Expires:</span> {detail.licenseExpiry || '—'}</p>
                  <p><span className="text-muted-foreground">Years held:</span> {detail.yearsHeld ?? '—'}</p>
                </div>
                {detail.notes && <p className="text-xs bg-muted/40 rounded p-2">{detail.notes}</p>}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['License front', detail.licenseFrontUrl],
                    ['License back', detail.licenseBackUrl],
                    ['NIC front', detail.nicFrontUrl],
                    ['NIC back', detail.nicBackUrl],
                  ].filter(([, url]) => url).map(([label, url]) => (
                    <div key={label as string}>
                      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                      <a href={url as string} target="_blank" rel="noreferrer">
                        <img src={url as string} alt={label as string} className="w-full h-28 object-cover rounded border" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove license {deleteTarget?.licenseNo}?</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">This removes the license/NIC record from {deleteTarget?.customer?.name || 'this customer'}'s file.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
