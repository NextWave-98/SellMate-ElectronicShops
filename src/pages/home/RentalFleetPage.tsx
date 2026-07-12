/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Car, CalendarDays, CheckCircle2, Users, Fuel, Settings2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

/**
 * PUBLIC customer-facing rental fleet page — /rent/:businessId
 * Browse available vehicles for a date range and place a booking request.
 * No login required.
 */
export default function RentalFleetPage() {
  const { businessId } = useParams();

  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [business, setBusiness] = useState<any>(null);
  const [fleet, setFleet] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', nic: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  const days =
    startAt && endAt
      ? Math.max(1, Math.ceil((new Date(endAt).getTime() - new Date(startAt).getTime()) / 86400000))
      : 1;

  const searchFleet = async () => {
    if (!startAt || !endAt) { setError('Please select pickup and return dates'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE_URL}/public/rental/${businessId}/fleet?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load fleet');
      setBusiness(json.data?.business ?? null);
      setFleet(json.data?.vehicles ?? []);
      setSearched(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/public/rental/${businessId}/booking-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selected.id,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          customer: { name: form.name, phone: form.phone, email: form.email || null, nic: form.nic || null },
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to submit request');
      setConfirmation(json.data);
      setSelected(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Car className="w-8 h-8" /> {business?.name || 'Vehicle Rental'}
          </h1>
          <p className="text-blue-100 text-sm mt-1">Choose your dates, pick a vehicle, and request a booking — we'll confirm by phone.</p>

          {/* Date search */}
          <div className="bg-white rounded-2xl p-4 mt-5 shadow-lg flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Label className="text-gray-700">Pickup</Label>
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="text-gray-900" />
            </div>
            <div className="flex-1 w-full">
              <Label className="text-gray-700">Return</Label>
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="text-gray-900" />
            </div>
            <Button onClick={searchFleet} disabled={loading} className="w-full sm:w-auto">
              <Search className="w-4 h-4 mr-1" /> {loading ? 'Searching…' : 'Search Vehicles'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {error && <p className="text-red-600 text-sm text-center my-4">{error}</p>}

        {/* Confirmation */}
        {confirmation && (
          <Card className="my-6 border-green-300 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-green-800">Booking Request Received!</h2>
              <p className="text-sm text-green-700 mt-1">
                Reference: <span className="font-mono font-bold">{confirmation.bookingNumber}</span>
              </p>
              {confirmation.estimatedTotal > 0 && (
                <p className="text-sm text-green-700">Estimated total: Rs {Number(confirmation.estimatedTotal).toLocaleString()} ({confirmation.days} day{confirmation.days > 1 ? 's' : ''})</p>
              )}
              <p className="text-xs text-green-600 mt-2">We will call you shortly to confirm. {business?.telephone && `Hotline: ${business.telephone}`}</p>
            </CardContent>
          </Card>
        )}

        {/* Fleet grid */}
        {searched && !confirmation && (
          <>
            <p className="text-sm text-muted-foreground my-4">
              {fleet.length} vehicle{fleet.length !== 1 ? 's' : ''} available · {days} day{days > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
              {fleet.map((v) => (
                <Card key={v.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {v.photos?.[0]
                      ? <img src={v.photos[0]} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover" />
                      : <Car className="w-16 h-16 text-gray-300" />}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{v.make} {v.model} {v.year ? `(${v.year})` : ''}</p>
                        <p className="text-xs text-muted-foreground">{v.vehicleClass}</p>
                      </div>
                      {v.rate && (
                        <div className="text-right">
                          <p className="font-extrabold text-blue-700">Rs {Number(v.rate.amount).toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">per day</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                      {v.seats && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{v.seats}</span>}
                      {v.transmission && <span className="flex items-center gap-1"><Settings2 className="w-3 h-3" />{v.transmission}</span>}
                      {v.fuelType && <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{v.fuelType}</span>}
                    </div>
                    {(v.features ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {v.features.slice(0, 4).map((f: string) => (
                          <Badge key={f} variant="outline" className="text-[10px]">{f.replace(/_/g, ' ')}</Badge>
                        ))}
                      </div>
                    )}
                    {v.rate && days > 1 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Est. total: <span className="font-semibold text-gray-800">Rs {(Number(v.rate.amount) * days).toLocaleString()}</span>
                      </p>
                    )}
                    <Button className="w-full mt-3" onClick={() => setSelected(v)}>
                      <CalendarDays className="w-4 h-4 mr-1" /> Request Booking
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {fleet.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-10">
                  No vehicles available for the selected dates. Try different dates or call us{business?.telephone ? ` on ${business.telephone}` : ''}.
                </p>
              )}
            </div>
          </>
        )}

        {!searched && !confirmation && (
          <p className="text-center text-muted-foreground py-16">Select your pickup & return dates to see available vehicles.</p>
        )}
      </div>

      {/* Booking request dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Booking — {selected?.make} {selected?.model}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              {startAt && new Date(startAt).toLocaleString()} → {endAt && new Date(endAt).toLocaleString()} ({days} day{days > 1 ? 's' : ''})
              {selected?.rate && <> · Est. Rs {(Number(selected.rate.amount) * days).toLocaleString()}</>}
            </p>
            <div><Label>Your Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone *</Label><Input placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>NIC</Label><Input value={form.nic} onChange={(e) => setForm({ ...form, nic: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Input placeholder="e.g. airport pickup needed" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={submitting || !form.name || !form.phone}>
              {submitting ? 'Submitting…' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
