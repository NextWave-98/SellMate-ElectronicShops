/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, List, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import PhotoUploadInput from '../../../components/common/PhotoUploadInput';
import SignaturePad from '../../../components/common/SignaturePad';
import VehicleDamageDiagram from '../../../components/common/VehicleDamageDiagram';
import { useRental } from '../../../hooks/useRental';
import { useCustomer } from '../../../hooks';
import DriverLicensePicker from './DriverLicensePicker';
import { selectCls, statusColor, type RentalOutletContext } from './shared';

/** Bookings: list, quote-driven creation, check-out / check-in condition reports, agreements. */
export default function RentalBookingsPage() {
  const { refreshStats } = useOutletContext<RentalOutletContext>();
  const rental = useRental();
  const { getBookings, getVehicles, getExtraFees, getRatePlans } = rental;
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [extraFees, setExtraFees] = useState<any[]>([]);
  const [ratePlans, setRatePlans] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState<any>({
    vehicleId: '', customerId: '', ratePlanId: '', startAt: '', endAt: '',
    baseAmount: 0, depositAmount: 0, withDriver: false, isLoanVehicle: false, notes: '',
    renterNic: '', renterLicenseNo: '', driverLicenseId: '', identityPhotos: [] as string[],
    extraFeeIds: [] as string[], couponCode: '',
  });
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);

  // Check-out / check-in condition report dialog
  const [conditionTarget, setConditionTarget] = useState<{ booking: any; action: 'checkout' | 'checkin' } | null>(null);
  const [conditionForm, setConditionForm] = useState<any>({
    odometer: '', fuelLevel: '', notes: '', photos: [] as string[], damageMarkers: [] as any[], customerSignature: null as string | null, paidAmount: '',
  });

  // Agreement dialog
  const [agreementText, setAgreementText] = useState<string | null>(null);
  const [agreementBookingId, setAgreementBookingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBookings({ limit: 100 });
      setBookings((res?.data as any)?.bookings ?? []);
    } finally {
      setLoading(false);
    }
  }, [getBookings]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openBookingModal = async () => {
    setQuote(null);
    setShowBookingModal(true);
    const [vehiclesRes, customersRes, feesRes, plansRes] = await Promise.all([
      getVehicles({ limit: 100 }),
      getCustomers({ limit: 200 } as any),
      getExtraFees(),
      getRatePlans(),
    ]);
    setVehicles((vehiclesRes?.data as any)?.vehicles ?? []);
    const list = (customersRes?.data as any)?.customers ?? (Array.isArray(customersRes?.data) ? customersRes?.data : []);
    setCustomers(list);
    setExtraFees((feesRes?.data as any) ?? []);
    setRatePlans(((plansRes?.data as any) ?? []).filter((p: any) => p.isActive));
  };

  const fetchQuote = async (form: any) => {
    if (!form.vehicleId || !form.startAt || !form.endAt) { setQuote(null); return; }
    setQuoting(true);
    try {
      const res = await rental.getBookingQuote({
        vehicleId: form.vehicleId,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        withDriver: Boolean(form.withDriver),
        extraFeeIds: form.extraFeeIds ?? [],
        couponCode: form.couponCode || null,
      });
      setQuote(res?.data ?? null);
    } catch { setQuote(null); } finally { setQuoting(false); }
  };

  const submitBooking = async () => {
    setSaving(true);
    try {
      const useQuote = Boolean(quote);
      const res = await rental.createBooking({
        ...bookingForm,
        ratePlanId: bookingForm.ratePlanId || null,
        renterNic: bookingForm.renterNic || null,
        renterLicenseNo: bookingForm.renterLicenseNo || null,
        driverLicenseId: bookingForm.driverLicenseId || null,
        identityPhotos: bookingForm.identityPhotos ?? [],
        baseAmount: Number(bookingForm.baseAmount || 0),
        depositAmount: Number(bookingForm.depositAmount || 0),
        startAt: new Date(bookingForm.startAt).toISOString(),
        endAt: new Date(bookingForm.endAt).toISOString(),
        extraFeeIds: bookingForm.extraFeeIds ?? [],
        couponCode: bookingForm.couponCode || null,
        useQuote,
      });
      if (res?.success || res?.status) {
        setShowBookingModal(false);
        setQuote(null);
        load();
        refreshStats();
      }
    } finally {
      setSaving(false);
    }
  };

  const doBookingAction = async (id: string, action: any) => {
    await rental.bookingAction(id, action, {});
    load();
    refreshStats();
  };

  const openConditionDialog = (booking: any, action: 'checkout' | 'checkin') => {
    setConditionForm({
      odometer: booking.vehicle?.currentOdometer != null ? String(booking.vehicle.currentOdometer) : '',
      fuelLevel: '', notes: '', photos: [], damageMarkers: [], customerSignature: null, paidAmount: '',
    });
    setConditionTarget({ booking, action });
  };

  const submitCondition = async () => {
    if (!conditionTarget) return;
    setSaving(true);
    try {
      const res = await rental.bookingAction(conditionTarget.booking.id, conditionTarget.action, {
        odometer: conditionForm.odometer !== '' ? Number(conditionForm.odometer) : null,
        fuelLevel: conditionForm.fuelLevel || null,
        notes: conditionForm.notes || null,
        photos: conditionForm.photos,
        damageMarkers: conditionForm.damageMarkers,
        customerSignature: conditionForm.customerSignature,
        paidAmount: conditionForm.paidAmount !== '' ? Number(conditionForm.paidAmount) : null,
      });
      if (res?.success || res?.status) {
        setConditionTarget(null);
        load();
        refreshStats();
      }
    } finally {
      setSaving(false);
    }
  };

  const viewAgreement = async (id: string) => {
    const res = await rental.generateAgreement(id);
    const text = (res?.data as any)?.agreementText;
    if (text) { setAgreementText(text); setAgreementBookingId(id); }
  };

  const downloadAgreementPdf = async () => {
    if (!agreementBookingId) return;
    const { getAccessToken } = await import('../../../utils/tokenStorage');
    const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';
    const token = getAccessToken();
    const res = await fetch(`${BASE_URL}/rental/bookings/${agreementBookingId}/agreement/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rental-agreement-${agreementBookingId.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printAgreement = () => {
    if (!agreementText) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<pre style="font-family: monospace; white-space: pre-wrap; padding: 24px;">${agreementText
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`);
    w.document.close();
    w.print();
  };

  // Availability calendar: bookings overlapping each day of the shown month
  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const active = bookings.filter((b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW' && b.startAt && b.endAt);
    const days: { date: Date | null; items: any[] }[] = [];
    for (let i = 0; i < firstWeekday; i++) days.push({ date: null, items: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStart = new Date(year, month, d, 0, 0, 0);
      const dayEnd = new Date(year, month, d, 23, 59, 59);
      const items = active.filter((b) => new Date(b.startAt) <= dayEnd && new Date(b.endAt) >= dayStart);
      days.push({ date: dayStart, items });
    }
    return days;
  }, [bookings, calMonth]);

  const shiftMonth = (delta: number) =>
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  if (loading && bookings.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* View toggle */}
        <div className="inline-flex rounded-md border overflow-hidden">
          <button
            className={`px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            onClick={() => setView('list')}>
            <List className="w-4 h-4" /> List
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 border-l ${view === 'calendar' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            onClick={() => setView('calendar')}>
            <CalendarDays className="w-4 h-4" /> Calendar
          </button>
        </div>
        <Button onClick={openBookingModal}><Plus className="w-4 h-4 mr-1" /> New Booking</Button>
      </div>

      {/* Availability calendar */}
      {view === 'calendar' && (
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
                      {day.items.slice(0, 3).map((b: any) => (
                        <div key={b.id}
                          title={`${b.bookingNumber} — ${b.customer?.name || ''} (${b.status})`}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${statusColor[b.status] || 'bg-gray-100 text-gray-700'}`}>
                          {b.vehicle?.registrationNo || b.bookingNumber}
                        </div>
                      ))}
                      {day.items.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">+{day.items.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
            {['PENDING', 'CONFIRMED', 'CHECKED_OUT', 'RETURNED', 'COMPLETED'].map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className={`inline-block w-3 h-3 rounded ${statusColor[s]?.split(' ')[0] || 'bg-gray-200'}`} /> {s.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </CardContent></Card>
      )}

      {view === 'list' && (
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Booking #</th><th className="p-3">Vehicle</th><th className="p-3">Customer</th>
              <th className="p-3">Period</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3 font-medium">
                  {b.bookingNumber}
                  {b.isLoanVehicle && <Badge variant="outline" className="ml-1.5 text-[10px]">LOAN</Badge>}
                </td>
                <td className="p-3">{b.vehicle ? `${b.vehicle.registrationNo}` : '—'}</td>
                <td className="p-3">{b.customer?.name || '—'}</td>
                <td className="p-3">{new Date(b.startAt).toLocaleDateString()} → {new Date(b.endAt).toLocaleDateString()}</td>
                <td className="p-3">Rs {Number(b.totalAmount).toLocaleString()}</td>
                <td className="p-3"><Badge className={statusColor[b.status] || ''}>{b.status}</Badge></td>
                <td className="p-3 space-x-1">
                  {b.status === 'PENDING' && (
                    <Button size="sm" variant="outline" onClick={() => doBookingAction(b.id, 'confirm')}>Confirm</Button>
                  )}
                  {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                    <>
                      <Button size="sm" onClick={() => openConditionDialog(b, 'checkout')}>Check-Out</Button>
                      <Button size="sm" variant="destructive" onClick={() => doBookingAction(b.id, 'cancel')}>Cancel</Button>
                    </>
                  )}
                  {b.status === 'CHECKED_OUT' && (
                    <Button size="sm" onClick={() => openConditionDialog(b, 'checkin')}>Check-In</Button>
                  )}
                  {b.status === 'RETURNED' && (
                    <Button size="sm" onClick={() => doBookingAction(b.id, 'complete')}>Complete</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => viewAgreement(b.id)}>Agreement</Button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No bookings yet</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>
      )}

      {/* New Booking dialog */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader><DialogTitle>New Rental Booking</DialogTitle></DialogHeader>
          <DialogBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>Vehicle *</Label>
              <select className={selectCls} value={bookingForm.vehicleId} onChange={(e) => setBookingForm({ ...bookingForm, vehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.filter((v) => v.isActive && v.status !== 'RETIRED').map((v) => (
                  <option key={v.id} value={v.id}>{v.registrationNo} — {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div><Label>Customer *</Label>
              <select className={selectCls} value={bookingForm.customerId} onChange={(e) => setBookingForm({ ...bookingForm, customerId: e.target.value })}>
                <option value="">Select customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
              </select>
            </div>
            {ratePlans.length > 0 && (
              <div className="col-span-2"><Label>Rate Plan (enables auto excess-km & late fees)</Label>
                <select className={selectCls} value={bookingForm.ratePlanId} onChange={(e) => setBookingForm({ ...bookingForm, ratePlanId: e.target.value })}>
                  <option value="">— No rate plan —</option>
                  {ratePlans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Rs {Number(p.baseRate).toLocaleString()}/{String(p.rateType).toLowerCase()}
                      {p.includedKm != null ? ` · ${p.includedKm} km incl.` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div><Label>Start *</Label><Input type="datetime-local" value={bookingForm.startAt} onChange={(e) => setBookingForm({ ...bookingForm, startAt: e.target.value })} /></div>
            <div><Label>End *</Label><Input type="datetime-local" value={bookingForm.endAt} onChange={(e) => setBookingForm({ ...bookingForm, endAt: e.target.value })} /></div>
            <div><Label>Base Amount (Rs)</Label><Input type="number" value={bookingForm.baseAmount} onChange={(e) => setBookingForm({ ...bookingForm, baseAmount: e.target.value })} /></div>
            <div><Label>Deposit (Rs)</Label><Input type="number" value={bookingForm.depositAmount} onChange={(e) => setBookingForm({ ...bookingForm, depositAmount: e.target.value })} /></div>
            <div className="col-span-2 flex items-center gap-5">
              <span className="flex items-center gap-2">
                <input type="checkbox" id="withDriver" checked={bookingForm.withDriver} onChange={(e) => setBookingForm({ ...bookingForm, withDriver: e.target.checked })} />
                <Label htmlFor="withDriver">With driver</Label>
              </span>
              <span className="flex items-center gap-2">
                <input type="checkbox" id="isLoanVehicle" checked={bookingForm.isLoanVehicle} onChange={(e) => setBookingForm({ ...bookingForm, isLoanVehicle: e.target.checked })} />
                <Label htmlFor="isLoanVehicle">Loan / replacement vehicle (garage customer)</Label>
              </span>
            </div>
            {/* Renter identity (SL compliance: NIC + driving license) */}
            <div className="col-span-2">
              <DriverLicensePicker
                customerId={bookingForm.customerId}
                value={bookingForm.driverLicenseId}
                onChange={(driverLicenseId, license) =>
                  setBookingForm((prev: any) => ({
                    ...prev,
                    driverLicenseId,
                    // Keep the flat agreement fields in sync with the license on file
                    renterLicenseNo: license?.licenseNo ?? prev.renterLicenseNo,
                    renterNic: license?.nicNo ?? prev.renterNic,
                  }))
                }
              />
            </div>
            <div><Label>Renter NIC</Label><Input placeholder="200012345678 / 991234567V" value={bookingForm.renterNic} onChange={(e) => setBookingForm({ ...bookingForm, renterNic: e.target.value })} /></div>
            <div><Label>Driving License No</Label><Input placeholder="B1234567" value={bookingForm.renterLicenseNo} onChange={(e) => setBookingForm({ ...bookingForm, renterLicenseNo: e.target.value })} /></div>
            <div className="col-span-2">
              <PhotoUploadInput
                label="NIC / License Photos (front & back)"
                folder="renter-identity"
                photos={bookingForm.identityPhotos}
                onChange={(identityPhotos) => setBookingForm({ ...bookingForm, identityPhotos })}
              />
            </div>
            <div className="col-span-2"><Label>Notes</Label><Input value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} /></div>

            {/* Pricing engine: extras + coupon + live quote */}
            {extraFees.filter((f: any) => f.isActive).length > 0 && (
              <div className="col-span-2">
                <Label>Extras</Label>
                <div className="grid grid-cols-2 gap-1 mt-1 border rounded-md p-2">
                  {extraFees.filter((f: any) => f.isActive).map((f: any) => (
                    <label key={f.id} className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={bookingForm.extraFeeIds.includes(f.id)}
                        onChange={() => {
                          const next = {
                            ...bookingForm,
                            extraFeeIds: bookingForm.extraFeeIds.includes(f.id)
                              ? bookingForm.extraFeeIds.filter((x: string) => x !== f.id)
                              : [...bookingForm.extraFeeIds, f.id],
                          };
                          setBookingForm(next); fetchQuote(next);
                        }} />
                      {f.name} (Rs {Number(f.amount).toLocaleString()}{f.perDay ? '/day' : ''})
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-2 flex gap-2 items-end">
              <div className="flex-1">
                <Label>Coupon Code</Label>
                <Input value={bookingForm.couponCode} onChange={(e) => setBookingForm({ ...bookingForm, couponCode: e.target.value.toUpperCase() })} />
              </div>
              <Button type="button" variant="outline" disabled={quoting} onClick={() => fetchQuote(bookingForm)}>
                {quoting ? 'Calculating…' : 'Get Quote'}
              </Button>
            </div>
            {quote && (
              <div className="col-span-2 bg-blue-50 rounded-md p-3 text-sm">
                <p>
                  Base ({quote.days} day{quote.days > 1 ? 's' : ''} × Rs {Number(quote.dayRate).toLocaleString()}): <b>Rs {Number(quote.baseAmount).toLocaleString()}</b>
                  {quote.durationTier && <span className="text-xs text-blue-700"> · {quote.durationTier} tier</span>}
                </p>
                {(quote.pricingAdjustments ?? []).map((a: any) => (
                  <p key={a.name} className="text-xs text-blue-700">↳ {a.name} ({a.ruleType}): +Rs {Number(a.amount).toLocaleString()}</p>
                ))}
                {quote.extrasAmount > 0 && <p>Extras: Rs {Number(quote.extrasAmount).toLocaleString()}</p>}
                {quote.discountAmount > 0 && <p className="text-green-700">Coupon {quote.coupon?.code}: −Rs {Number(quote.discountAmount).toLocaleString()}</p>}
                <p className="font-bold mt-1">TOTAL: Rs {Number(quote.totalAmount).toLocaleString()} {quote.depositAmount > 0 && <span className="font-normal text-xs">(+ deposit Rs {Number(quote.depositAmount).toLocaleString()})</span>}</p>
              </div>
            )}
          </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingModal(false)}>Cancel</Button>
            <Button onClick={submitBooking} disabled={saving || !bookingForm.vehicleId || !bookingForm.customerId || !bookingForm.startAt || !bookingForm.endAt}>
              {saving ? 'Saving...' : quote ? `Book — Rs ${Number(quote.totalAmount).toLocaleString()}` : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-out / check-in condition report dialog */}
      <Dialog open={!!conditionTarget} onOpenChange={(open) => !open && setConditionTarget(null)}>
        <DialogContent className="max-w-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {conditionTarget?.action === 'checkout' ? 'Vehicle Check-Out (Handover)' : 'Vehicle Check-In (Return)'} — {conditionTarget?.booking?.bookingNumber}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Odometer (km)</Label><Input type="number" value={conditionForm.odometer} onChange={(e) => setConditionForm({ ...conditionForm, odometer: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Fuel Level</Label>
                <select className={selectCls} value={conditionForm.fuelLevel} onChange={(e) => setConditionForm({ ...conditionForm, fuelLevel: e.target.value })}>
                  <option value="">Select</option>
                  {['FULL', '3/4', '1/2', '1/4', 'EMPTY'].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Notes / Damage remarks</Label><Input value={conditionForm.notes} onChange={(e) => setConditionForm({ ...conditionForm, notes: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Payment collected now (Rs)</Label><Input type="number" value={conditionForm.paidAmount} onChange={(e) => setConditionForm({ ...conditionForm, paidAmount: e.target.value })} /></div>
            <PhotoUploadInput
              label="Condition Photos (before/after evidence)"
              folder="condition-reports"
              photos={conditionForm.photos}
              onChange={(photos) => setConditionForm({ ...conditionForm, photos })}
            />
            <div className="space-y-2">
              <Label>Damage Diagram (tap the car to mark damage)</Label>
              <VehicleDamageDiagram value={conditionForm.damageMarkers} onChange={(damageMarkers) => setConditionForm({ ...conditionForm, damageMarkers })} />
            </div>
            <SignaturePad
              value={conditionForm.customerSignature}
              onChange={(sig) => setConditionForm({ ...conditionForm, customerSignature: sig })}
            />
          </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConditionTarget(null)}>Cancel</Button>
            <Button onClick={submitCondition} disabled={saving}>
              {saving ? 'Saving...' : conditionTarget?.action === 'checkout' ? 'Confirm Check-Out' : 'Confirm Check-In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agreement dialog */}
      <Dialog open={!!agreementText} onOpenChange={(open) => !open && setAgreementText(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader><DialogTitle>Rental Agreement</DialogTitle></DialogHeader>
          <DialogBody>
          <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 rounded-md p-4">
            {agreementText}
          </pre>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgreementText(null)}>Close</Button>
            <Button variant="outline" onClick={() => agreementBookingId && rental.sendAgreement(agreementBookingId, 'SMS')}>Send SMS</Button>
            <Button variant="outline" onClick={() => agreementBookingId && rental.sendAgreement(agreementBookingId, 'WHATSAPP')}>WhatsApp</Button>
            <Button variant="outline" onClick={downloadAgreementPdf}>Download PDF</Button>
            <Button onClick={printAgreement}>Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
