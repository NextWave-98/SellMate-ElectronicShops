/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import PhotoUploadInput from '../../../components/common/PhotoUploadInput';
import { useRental, VEHICLE_CLASSES, VEHICLE_FEATURES } from '../../../hooks/useRental';
import { selectCls, type RentalOutletContext } from './shared';

const FUEL_TYPES = ['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'GAS'];
const TRANSMISSIONS = ['AUTOMATIC', 'MANUAL', 'CVT', 'SEMI_AUTOMATIC'];

const emptyForm = {
  registrationNo: '', make: '', model: '', year: '', vehicleClass: 'SEDAN',
  fuelType: '', transmission: '', seats: '', color: '', chassisNo: '',
  currentOdometer: 0,
  insuranceExpiry: '', licenseExpiry: '', emissionTestExpiry: '', insuranceProvider: '',
  serviceIntervalKm: '', nextServiceOdometer: '',
  gpsDeviceId: '', notes: '',
  photos: [] as string[],
  features: [] as string[],
};

/** Full-page vehicle create / edit (replaces the old cramped modal). */
export default function VehicleFormPage() {
  const { refreshStats } = useOutletContext<RentalOutletContext>();
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const rental = useRental();
  const isEdit = Boolean(vehicleId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  // Master data: makes & models (managed dropdowns with inline add)
  const [makes, setMakes] = useState<any[]>([]);
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');

  const loadMakes = async () => {
    const res = await rental.getMakes();
    setMakes((res?.data as any) ?? []);
  };
  useEffect(() => { loadMakes(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMake = makes.find((m) => m.name === form.make);

  const addMake = async () => {
    if (!newMake.trim()) return;
    const res = await rental.createMake(newMake.trim());
    if (res?.success || res?.status) {
      setForm((prev: any) => ({ ...prev, make: newMake.trim(), model: '' }));
      setNewMake('');
      loadMakes();
    }
  };

  const addModel = async () => {
    if (!newModel.trim() || !selectedMake) return;
    const res = await rental.createVehicleModel(selectedMake.id, newModel.trim());
    if (res?.success || res?.status) {
      setForm((prev: any) => ({ ...prev, model: newModel.trim() }));
      setNewModel('');
      loadMakes();
    }
  };

  useEffect(() => {
    if (!vehicleId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await rental.getVehicleById(vehicleId);
        const v = (res?.data as any)?.vehicle ?? res?.data;
        if (v) {
          setForm({
            registrationNo: v.registrationNo ?? '', make: v.make ?? '', model: v.model ?? '',
            year: v.year ?? '', vehicleClass: v.vehicleClass ?? 'SEDAN',
            fuelType: v.fuelType ?? '', transmission: v.transmission ?? '', seats: v.seats ?? '',
            color: v.color ?? '', chassisNo: v.chassisNo ?? '',
            currentOdometer: v.currentOdometer ?? 0,
            insuranceExpiry: v.insuranceExpiry ?? '', licenseExpiry: v.licenseExpiry ?? '',
            emissionTestExpiry: v.emissionTestExpiry ?? '', insuranceProvider: v.insuranceProvider ?? '',
            serviceIntervalKm: v.serviceIntervalKm ?? '', nextServiceOdometer: v.nextServiceOdometer ?? '',
            gpsDeviceId: v.gpsDeviceId ?? '', notes: v.notes ?? '',
            photos: v.photos ?? [],
            features: v.features ?? [],
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const set = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : null,
        seats: form.seats ? Number(form.seats) : null,
        currentOdometer: Number(form.currentOdometer || 0),
        insuranceExpiry: form.insuranceExpiry || null,
        licenseExpiry: form.licenseExpiry || null,
        emissionTestExpiry: form.emissionTestExpiry || null,
        insuranceProvider: form.insuranceProvider || null,
        fuelType: form.fuelType || null,
        transmission: form.transmission || null,
        color: form.color || null,
        chassisNo: form.chassisNo || null,
        gpsDeviceId: form.gpsDeviceId || null,
        notes: form.notes || null,
        serviceIntervalKm: form.serviceIntervalKm ? Number(form.serviceIntervalKm) : null,
        nextServiceOdometer: form.nextServiceOdometer ? Number(form.nextServiceOdometer) : null,
      };
      const res = isEdit
        ? await rental.updateVehicle(vehicleId!, payload)
        : await rental.createVehicle(payload);
      if (res?.success || res?.status) {
        refreshStats();
        navigate(isEdit ? '../..' : '..', { relative: 'path' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground" onClick={() => navigate(isEdit ? '../..' : '..', { relative: 'path' })}>
            <ArrowLeft className="w-4 h-4" /> Back to Fleet
          </button>
          <h2 className="text-xl font-bold flex items-center gap-2 mt-1">
            <Car className="w-5 h-5" /> {isEdit ? `Edit Vehicle — ${form.registrationNo}` : 'Add Vehicle to Fleet'}
          </h2>
        </div>
        <Button onClick={submit} disabled={saving || !form.registrationNo || !form.make || !form.model}>
          <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vehicle'}
        </Button>
      </div>

      {/* Identity */}
      <Card><CardContent className="p-5">
        <p className="font-semibold text-sm mb-3">Vehicle Identity</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div><Label>Registration No *</Label><Input value={form.registrationNo} onChange={(e) => set('registrationNo', e.target.value.toUpperCase())} placeholder="CAB-1234" /></div>
          <div>
            <Label>Make *</Label>
            {makes.length > 0 ? (
              <select className={selectCls} value={form.make}
                onChange={(e) => setForm((prev: any) => ({ ...prev, make: e.target.value, model: '' }))}>
                <option value="">Select make</option>
                {makes.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            ) : (
              <Input value={form.make} onChange={(e) => set('make', e.target.value)} placeholder="Toyota" />
            )}
            <div className="flex gap-1 mt-1">
              <Input className="h-7 text-xs" placeholder="+ new make" value={newMake} onChange={(e) => setNewMake(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMake()} />
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addMake} disabled={!newMake.trim()}>Add</Button>
            </div>
          </div>
          <div>
            <Label>Model *</Label>
            {selectedMake && (selectedMake.models?.length ?? 0) > 0 ? (
              <select className={selectCls} value={form.model} onChange={(e) => set('model', e.target.value)}>
                <option value="">Select model</option>
                {selectedMake.models.map((m: any) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            ) : (
              <Input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Aqua" />
            )}
            {selectedMake && (
              <div className="flex gap-1 mt-1">
                <Input className="h-7 text-xs" placeholder={`+ new ${selectedMake.name} model`} value={newModel} onChange={(e) => setNewModel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addModel()} />
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addModel} disabled={!newModel.trim()}>Add</Button>
              </div>
            )}
          </div>
          <div><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} /></div>
          <div><Label>Class</Label>
            <select className={selectCls} value={form.vehicleClass} onChange={(e) => set('vehicleClass', e.target.value)}>
              {VEHICLE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><Label>Color</Label><Input value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="White" /></div>
          <div><Label>Chassis No</Label><Input value={form.chassisNo} onChange={(e) => set('chassisNo', e.target.value)} /></div>
          <div><Label>GPS Device ID</Label><Input value={form.gpsDeviceId} onChange={(e) => set('gpsDeviceId', e.target.value)} /></div>
        </div>
      </CardContent></Card>

      {/* Specs */}
      <Card><CardContent className="p-5">
        <p className="font-semibold text-sm mb-3">Specifications</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div><Label>Fuel Type</Label>
            <select className={selectCls} value={form.fuelType} onChange={(e) => set('fuelType', e.target.value)}>
              <option value="">Select fuel type</option>
              {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div><Label>Transmission</Label>
            <select className={selectCls} value={form.transmission} onChange={(e) => set('transmission', e.target.value)}>
              <option value="">Select transmission</option>
              {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div><Label>Seats</Label><Input type="number" value={form.seats} onChange={(e) => set('seats', e.target.value)} /></div>
          <div><Label>Current Odometer (km)</Label><Input type="number" value={form.currentOdometer} onChange={(e) => set('currentOdometer', e.target.value)} /></div>
        </div>
        <div className="mt-4">
          <Label>Features</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 mt-1 border rounded-md p-3">
            {VEHICLE_FEATURES.map((f) => (
              <label key={f} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={(form.features ?? []).includes(f)}
                  onChange={() => setForm((prev: any) => ({
                    ...prev,
                    features: prev.features?.includes(f)
                      ? prev.features.filter((x: string) => x !== f)
                      : [...(prev.features ?? []), f],
                  }))} />
                {f.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>
      </CardContent></Card>

      {/* Photos */}
      <Card><CardContent className="p-5">
        <p className="font-semibold text-sm mb-3">Vehicle Photos</p>
        <PhotoUploadInput
          label=""
          folder="rental-vehicles"
          photos={form.photos}
          onChange={(photos) => set('photos', photos)}
        />
        <p className="text-[11px] text-muted-foreground mt-2">First photo is shown in the fleet list and on the public website.</p>
      </CardContent></Card>

      {/* Compliance & service */}
      <Card><CardContent className="p-5">
        <p className="font-semibold text-sm mb-3">Compliance & Service</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div><Label>Insurance Provider</Label><Input value={form.insuranceProvider} onChange={(e) => set('insuranceProvider', e.target.value)} placeholder="e.g. Ceylinco / SLIC / Allianz" /></div>
          <div><Label>Insurance Expiry</Label><Input type="date" value={form.insuranceExpiry} onChange={(e) => set('insuranceExpiry', e.target.value)} /></div>
          <div><Label>Revenue License Expiry</Label><Input type="date" value={form.licenseExpiry} onChange={(e) => set('licenseExpiry', e.target.value)} /></div>
          <div><Label>Emission Test Expiry</Label><Input type="date" value={form.emissionTestExpiry} onChange={(e) => set('emissionTestExpiry', e.target.value)} /></div>
          <div><Label>Service Interval (km)</Label><Input type="number" placeholder="e.g. 5000" value={form.serviceIntervalKm} onChange={(e) => set('serviceIntervalKm', e.target.value)} /></div>
          <div><Label>Next Service At (km)</Label><Input type="number" placeholder="auto = odometer + interval" value={form.nextServiceOdometer} onChange={(e) => set('nextServiceOdometer', e.target.value)} /></div>
        </div>
        <div className="mt-3">
          <Label>Notes</Label>
          <textarea className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any special remarks about this vehicle…" />
        </div>
      </CardContent></Card>

      {/* Bottom actions (page scrolls naturally — no more cramped modal) */}
      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={() => navigate(isEdit ? '../..' : '..', { relative: 'path' })}>Cancel</Button>
        <Button onClick={submit} disabled={saving || !form.registrationNo || !form.make || !form.model}>
          <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vehicle'}
        </Button>
      </div>
    </div>
  );
}
