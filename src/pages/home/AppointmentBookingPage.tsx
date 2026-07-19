/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

/**
 * PUBLIC online service booking — /book/:businessId
 * Customer picks a preferred date/time and submits a service request. No login.
 */
export default function AppointmentBookingPage() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', reg: '', make: '', complaint: '', scheduledAt: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/public/appointment/${businessId}/info`);
        const json = await res.json();
        if (res.ok) setBusiness(json.data);
      } catch { /* ignore */ }
    })();
  }, [businessId]);

  const submit = async () => {
    if (!form.name || !form.phone || !form.scheduledAt) { setError('Name, phone and preferred time are required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/public/appointment/${businessId}/booking-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          customer: { name: form.name, phone: form.phone, email: form.email || null },
          vehicle: form.reg || form.make ? { registrationNo: form.reg || null, make: form.make || null } : null,
          complaint: form.complaint || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to submit request');
      setConfirmation(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Wrench className="w-7 h-7" /> {business?.name || 'Book a Service'}
          </h1>
          <p className="text-blue-100 text-sm mt-1">Request a service appointment — we'll confirm the slot by phone.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {confirmation ? (
          <Card className="my-6 border-green-300 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-green-800">Request Received!</h2>
              <p className="text-sm text-green-700 mt-1">Reference: <span className="font-mono font-bold">{confirmation.appointmentNo}</span></p>
              <p className="text-xs text-green-600 mt-2">We'll call you shortly to confirm your appointment. {business?.telephone && `Hotline: ${business.telephone}`}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="my-6">
            <CardContent className="p-6 grid gap-3">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Your Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Phone *</Label><Input placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Vehicle Reg No</Label><Input value={form.reg} onChange={(e) => setForm({ ...form, reg: e.target.value })} /></div>
                <div><Label>Vehicle Make / Model</Label><Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
              </div>
              <div><Label>Preferred Date & Time *</Label><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
              <div><Label>What do you need? (complaint / service)</Label><Input placeholder="e.g. engine noise, full service, brake check" value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} /></div>
              <Button className="mt-2" onClick={submit} disabled={submitting || !form.name || !form.phone || !form.scheduledAt}>
                <CalendarDays className="w-4 h-4 mr-1" /> {submitting ? 'Submitting…' : 'Request Appointment'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
