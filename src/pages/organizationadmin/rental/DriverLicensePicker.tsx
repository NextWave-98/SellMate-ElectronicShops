/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { IdCard, Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import PhotoUploadInput from '../../../components/common/PhotoUploadInput';
import { useRental, type DriverLicenseRecord } from '../../../hooks/useRental';
import { selectCls } from './shared';

const today = () => new Date().toISOString().slice(0, 10);

const emptyLicense = {
  licenseNo: '', licenseIssueDate: '', licenseExpiry: '',
  nicNo: '', dateOfBirth: '', yearsHeld: '',
  licenseFrontUrl: '', licenseBackUrl: '', nicFrontUrl: '', nicBackUrl: '',
  notes: '',
};

interface Props {
  customerId: string;
  /** Currently selected license id ('' = none). */
  value: string;
  onChange: (licenseId: string, license: DriverLicenseRecord | null) => void;
  /** Minimum years the license must have been held (SL rentals often require 1–2). */
  minYearsHeld?: number;
}

/**
 * Driver license + NIC on file for a rental customer.
 * Picks an existing license or captures a new one inline (photos, expiry, NIC).
 * Warns on expired licenses and on insufficient years held.
 */
export default function DriverLicensePicker({ customerId, value, onChange, minYearsHeld = 0 }: Props) {
  const rental = useRental();
  const { getDriverLicenses } = rental;

  const [licenses, setLicenses] = useState<DriverLicenseRecord[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(emptyLicense);

  const load = useCallback(async () => {
    if (!customerId) { setLicenses([]); return; }
    const res = await getDriverLicenses({ customerId });
    setLicenses(((res?.data as any) ?? []) as DriverLicenseRecord[]);
  }, [customerId, getDriverLicenses]);

  useEffect(() => { load(); }, [load]);

  // Auto-select the only license on file so staff don't have to
  useEffect(() => {
    if (!value && licenses.length === 1) onChange(licenses[0].id, licenses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenses]);

  const selected = licenses.find((l) => l.id === value) ?? null;
  const isExpired = Boolean(selected?.licenseExpiry && selected.licenseExpiry < today());
  const yearsShort = Boolean(
    minYearsHeld > 0 && selected && (selected.yearsHeld ?? 0) < minYearsHeld
  );

  const save = async () => {
    if (!customerId || !form.licenseNo.trim()) return;
    setSaving(true);
    try {
      const res = await rental.createDriverLicense({
        customerId,
        licenseNo: form.licenseNo.trim().toUpperCase(),
        licenseIssueDate: form.licenseIssueDate || null,
        licenseExpiry: form.licenseExpiry || null,
        nicNo: form.nicNo.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        yearsHeld: form.yearsHeld ? Number(form.yearsHeld) : null,
        licenseFrontUrl: form.licenseFrontUrl || null,
        licenseBackUrl: form.licenseBackUrl || null,
        nicFrontUrl: form.nicFrontUrl || null,
        nicBackUrl: form.nicBackUrl || null,
        notes: form.notes || null,
      });
      const saved = (res?.data as any) as DriverLicenseRecord | undefined;
      if (saved?.id) {
        setForm(emptyLicense);
        setAdding(false);
        await load();
        onChange(saved.id, saved);
      }
    } finally {
      setSaving(false);
    }
  };

  /** PhotoUploadInput works on arrays; these slots hold a single image each. */
  const photoSlot = (key: string, label: string) => (
    <div key={key}>
      <PhotoUploadInput
        label={label}
        folder="driver-licenses"
        max={1}
        photos={form[key] ? [form[key]] : []}
        onChange={(photos) => setForm((prev: any) => ({ ...prev, [key]: photos[0] ?? '' }))}
      />
    </div>
  );

  if (!customerId) {
    return (
      <div className="border rounded-md p-3 text-sm text-muted-foreground">
        Select a customer first to attach their driving license.
      </div>
    );
  }

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5"><IdCard className="w-3.5 h-3.5" /> Driving License on File</Label>
        {!adding && (
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3 mr-1" /> Capture new
          </Button>
        )}
      </div>

      {!adding && (
        <>
          <select
            className={selectCls}
            value={value}
            onChange={(e) => {
              const next = licenses.find((l) => l.id === e.target.value) ?? null;
              onChange(e.target.value, next);
            }}
          >
            <option value="">— No license attached —</option>
            {licenses.map((l) => (
              <option key={l.id} value={l.id}>
                {l.licenseNo}
                {l.nicNo ? ` · NIC ${l.nicNo}` : ''}
                {l.licenseExpiry ? ` · exp ${l.licenseExpiry}` : ''}
              </option>
            ))}
          </select>

          {licenses.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              No license on file for this customer yet — capture one before handover.
            </p>
          )}

          {selected && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {selected.isVerified
                ? <Badge variant="outline" className="text-[10px] text-green-700 border-green-300"><ShieldCheck className="w-3 h-3 mr-1" /> Verified</Badge>
                : <Badge variant="outline" className="text-[10px]">Not verified</Badge>}
              {isExpired && (
                <Badge variant="outline" className="text-[10px] text-red-700 border-red-300">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Expired {selected.licenseExpiry}
                </Badge>
              )}
              {yearsShort && (
                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Held {selected.yearsHeld ?? 0}y — {minYearsHeld}y required
                </Badge>
              )}
            </div>
          )}
          {isExpired && (
            <p className="text-[11px] text-red-600">
              Check-out will be blocked until a renewed license is captured.
            </p>
          )}
        </>
      )}

      {adding && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">License No *</Label>
              <Input className="h-8" placeholder="B1234567" value={form.licenseNo}
                onChange={(e) => setForm({ ...form, licenseNo: e.target.value.toUpperCase() })} /></div>
            <div><Label className="text-xs">NIC No</Label>
              <Input className="h-8" placeholder="200012345678 / 991234567V" value={form.nicNo}
                onChange={(e) => setForm({ ...form, nicNo: e.target.value.toUpperCase() })} /></div>
            <div><Label className="text-xs">Issued On</Label>
              <Input className="h-8" type="date" value={form.licenseIssueDate}
                onChange={(e) => setForm({ ...form, licenseIssueDate: e.target.value })} /></div>
            <div><Label className="text-xs">Expires On</Label>
              <Input className="h-8" type="date" value={form.licenseExpiry}
                onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} /></div>
            <div><Label className="text-xs">Date of Birth</Label>
              <Input className="h-8" type="date" value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
            <div><Label className="text-xs">Years Held</Label>
              <Input className="h-8" type="number" min={0} placeholder="e.g. 5" value={form.yearsHeld}
                onChange={(e) => setForm({ ...form, yearsHeld: e.target.value })} /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {photoSlot('licenseFrontUrl', 'License — front')}
            {photoSlot('licenseBackUrl', 'License — back')}
            {photoSlot('nicFrontUrl', 'NIC — front')}
            {photoSlot('nicBackUrl', 'NIC — back')}
          </div>

          <div><Label className="text-xs">Notes</Label>
            <Input className="h-8" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => { setAdding(false); setForm(emptyLicense); }}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving || !form.licenseNo.trim()}>
              {saving ? 'Saving…' : 'Save License'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
