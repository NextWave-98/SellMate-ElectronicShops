/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus, List, CalendarDays, ChevronLeft, ChevronRight, Search, Eye, Pencil, Trash2, AlertTriangle,
} from 'lucide-react';
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

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_OUT', 'RETURNED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const CHARGE_TYPES = ['DAMAGE', 'CLEANING', 'FINE', 'EXCESS_KM', 'FUEL_DIFFERENCE', 'LATE_RETURN', 'EXTRA', 'OTHER'];
const textareaCls = 'w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm';
const PAY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CHECK', 'OTHER'];
const PAY_TYPES: Record<string, string> = {
  RENT: 'Rent payment', DEPOSIT: 'Deposit taken', DEPOSIT_REFUND: 'Deposit refunded',
  DEPOSIT_DEDUCTION: 'Deposit applied', REFUND: 'Refund',
};

const emptyBookingForm = {
  vehicleId: '', customerId: '', ratePlanId: '', startAt: '', endAt: '',
  baseAmount: 0, depositAmount: 0, withDriver: false, isLoanVehicle: false, notes: '',
  renterNic: '', renterLicenseNo: '', driverLicenseId: '', identityPhotos: [] as string[],
  extraFeeIds: [] as string[], couponCode: '',
  // Equipment lines: { rentalItemId | assetId, quantity }
  items: [] as any[],
};

/** Bookings: list, quote-driven creation, edit, detail, check-out / check-in, charges, agreements. */
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
  const [rentalItems, setRentalItems] = useState<any[]>([]);
  const [equipmentUnits, setEquipmentUnits] = useState<any[]>([]);
  const [itemsDirty, setItemsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // Payments + settlement
  const [payForm, setPayForm] = useState<any>({ paymentType: 'RENT', paymentMethod: 'CASH', amount: '', referenceNumber: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [settleTarget, setSettleTarget] = useState<any>(null);
  const [settleForm, setSettleForm] = useState<any>({ amount: '', paymentMethod: 'CASH', refundMethod: 'CASH', allowOutstanding: false });

  // List filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState<any>({ ...emptyBookingForm });
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);

  // Check-out / check-in condition report dialog
  const [conditionTarget, setConditionTarget] = useState<{ booking: any; action: 'checkout' | 'checkin' } | null>(null);
  const [conditionForm, setConditionForm] = useState<any>({
    odometer: '', fuelLevel: '', notes: '', photos: [] as string[], damageMarkers: [] as any[], customerSignature: null as string | null, paidAmount: '',
    paymentMethod: 'CASH', depositCollected: '', depositMethod: 'CASH', itemReturns: {} as Record<string, { lost: string; damaged: string }>,
  });

  // Agreement dialog
  const [agreementText, setAgreementText] = useState<string | null>(null);
  const [agreementBookingId, setAgreementBookingId] = useState<string | null>(null);

  // Booking detail dialog
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [chargeForm, setChargeForm] = useState<any>({ chargeType: 'DAMAGE', description: '', amount: '' });
  const [chargeSaving, setChargeSaving] = useState(false);

  // Cancel confirmation
  const [cancelTarget, setCancelTarget] = useState<any>(null);

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

  const loadLookups = async () => {
    const [vehiclesRes, customersRes, feesRes, plansRes, itemsRes, unitsRes] = await Promise.all([
      getVehicles({ limit: 200, assetType: 'VEHICLE' }),
      getCustomers({ limit: 200 } as any),
      getExtraFees(),
      getRatePlans(),
      rental.getRentalItems(),
      getVehicles({ limit: 200, assetType: 'EQUIPMENT' }),
    ]);
    setVehicles((vehiclesRes?.data as any)?.vehicles ?? []);
    setRentalItems(Array.isArray(itemsRes?.data) ? (itemsRes?.data as any[]) : []);
    setEquipmentUnits((unitsRes?.data as any)?.vehicles ?? []);
    const list = (customersRes?.data as any)?.customers ?? (Array.isArray(customersRes?.data) ? customersRes?.data : []);
    setCustomers(list);
    setExtraFees((feesRes?.data as any) ?? []);
    setRatePlans(((plansRes?.data as any) ?? []).filter((p: any) => p.isActive));
  };

  const openBookingModal = async () => {
    setEditingId(null);
    setBookingForm({ ...emptyBookingForm, items: [] });
    setItemsDirty(false);
    setQuote(null);
    setShowBookingModal(true);
    await loadLookups();
  };

  const openEditModal = async (b: any) => {
    setEditingId(b.id);
    setQuote(null);
    setBookingForm({
      vehicleId: b.vehicleId ?? '', customerId: b.customerId ?? '', ratePlanId: b.ratePlanId ?? '',
      startAt: b.startAt ? new Date(b.startAt).toISOString().slice(0, 16) : '',
      endAt: b.endAt ? new Date(b.endAt).toISOString().slice(0, 16) : '',
      baseAmount: b.baseAmount ?? 0, depositAmount: b.depositAmount ?? 0,
      withDriver: Boolean(b.withDriver), isLoanVehicle: Boolean(b.isLoanVehicle), notes: b.notes ?? '',
      renterNic: b.renterNic ?? '', renterLicenseNo: b.renterLicenseNo ?? '', driverLicenseId: b.driverLicenseId ?? '',
      identityPhotos: b.identityPhotos ?? [], extraFeeIds: [], couponCode: '', items: [],
    });
    setItemsDirty(false);
    setShowBookingModal(true);
    await loadLookups();
    // Current equipment lines (the list row does not carry them)
    const res = await rental.getBookingById(b.id);
    const lines = ((res?.data as any)?.items ?? []).map((l: any) => ({
      rentalItemId: l.rentalItemId, assetId: l.assetId, quantity: l.quantity, unitRate: Number(l.unitRate),
    }));
    setBookingForm((prev: any) => ({ ...prev, items: lines }));
  };

  /** Bookings that overlap [start,end] on the same vehicle (active statuses only). */
  const conflictFor = useCallback((vehicleId: string, startAt: string, endAt: string): any[] => {
    if (!vehicleId || !startAt || !endAt) return [];
    const s = new Date(startAt).getTime();
    const e = new Date(endAt).getTime();
    if (!(s < e)) return [];
    return bookings.filter((b) =>
      b.id !== editingId &&
      b.vehicleId === vehicleId &&
      !['CANCELLED', 'NO_SHOW', 'COMPLETED', 'RETURNED'].includes(b.status) &&
      new Date(b.startAt).getTime() < e && new Date(b.endAt).getTime() > s
    );
  }, [bookings, editingId]);

  const bookingConflicts = useMemo(
    () => conflictFor(bookingForm.vehicleId, bookingForm.startAt, bookingForm.endAt),
    [conflictFor, bookingForm.vehicleId, bookingForm.startAt, bookingForm.endAt]
  );

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
      const items = (bookingForm.items ?? [])
        .filter((l: any) => l.rentalItemId || l.assetId)
        .map((l: any) => ({
          rentalItemId: l.rentalItemId || null,
          assetId: l.assetId || null,
          quantity: l.assetId ? 1 : Math.max(1, Number(l.quantity || 1)),
          unitRate: l.unitRate !== '' && l.unitRate != null ? Number(l.unitRate) : null,
        }));
      const { items: _formItems, ...formRest } = bookingForm;
      const payload = {
        ...formRest,
        vehicleId: bookingForm.vehicleId || null,
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
      };
      let res: any = editingId
        ? await rental.updateBooking(editingId, payload)
        : await rental.createBooking({ ...payload, items, useQuote: Boolean(quote) && Boolean(payload.vehicleId) });
      if (editingId && (res?.success || res?.status) && itemsDirty) {
        res = await rental.setBookingItems(editingId, items);
      }
      if (res?.success || res?.status) {
        setShowBookingModal(false);
        setEditingId(null);
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

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    await rental.bookingAction(cancelTarget.id, 'cancel', {});
    setCancelTarget(null);
    load();
    refreshStats();
  };

  const openConditionDialog = async (booking: any, action: 'checkout' | 'checkin') => {
    // Full booking: equipment lines + deposit figures are not on the list row
    const res = await rental.getBookingById(booking.id);
    const full = (res?.data as any) ?? booking;
    const held = Number(full.depositHeld ?? 0);
    setConditionForm({
      odometer: full.vehicle?.currentOdometer != null ? String(full.vehicle.currentOdometer) : '',
      fuelLevel: '', notes: '', photos: [], damageMarkers: [], customerSignature: null, paidAmount: '',
      paymentMethod: 'CASH',
      depositCollected: action === 'checkout' && held <= 0 && Number(full.depositAmount) > 0 ? String(full.depositAmount) : '',
      depositMethod: 'CASH',
      itemReturns: {},
    });
    setConditionTarget({ booking: full, action });
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
        paymentMethod: conditionForm.paymentMethod,
        depositCollected: conditionTarget.action === 'checkout' && conditionForm.depositCollected !== ''
          ? Number(conditionForm.depositCollected) : null,
        depositMethod: conditionForm.depositMethod,
        items: conditionTarget.action === 'checkin'
          ? (conditionTarget.booking.items ?? []).map((l: any) => ({
              bookingItemId: l.id,
              lostQuantity: Number(conditionForm.itemReturns[l.id]?.lost || 0),
              damagedQuantity: Number(conditionForm.itemReturns[l.id]?.damaged || 0),
            }))
          : undefined,
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

  // ---- Booking detail ----
  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail({ id });
    try {
      const res = await rental.getBookingById(id);
      setDetail((res?.data as any) ?? null);
    } finally {
      setDetailLoading(false);
    }
  };

  const reloadDetail = async () => {
    if (!detail?.id) return;
    const res = await rental.getBookingById(detail.id);
    setDetail((res?.data as any) ?? null);
    load();
    refreshStats();
  };

  const submitCharge = async () => {
    if (!detail?.id || !chargeForm.description || chargeForm.amount === '') return;
    setChargeSaving(true);
    try {
      const res = await rental.addCharge(detail.id, {
        chargeType: chargeForm.chargeType,
        description: chargeForm.description,
        amount: Number(chargeForm.amount || 0),
      });
      if (res?.success || res?.status) {
        setChargeForm({ chargeType: 'DAMAGE', description: '', amount: '' });
        await reloadDetail();
      }
    } finally {
      setChargeSaving(false);
    }
  };

  const submitPayment = async () => {
    if (!detail?.id || !payForm.amount) return;
    setPaySaving(true);
    try {
      const res = await rental.addBookingPayment(detail.id, {
        paymentType: payForm.paymentType,
        paymentMethod: payForm.paymentMethod,
        amount: Number(payForm.amount),
        referenceNumber: payForm.referenceNumber || null,
      });
      if (res?.success || res?.status) {
        setPayForm({ paymentType: 'RENT', paymentMethod: 'CASH', amount: '', referenceNumber: '' });
        await reloadDetail();
      }
    } finally { setPaySaving(false); }
  };

  const voidPayment = async (paymentId: string) => {
    if (!detail?.id) return;
    await rental.voidBookingPayment(detail.id, paymentId, 'Entered by mistake');
    await reloadDetail();
  };

  // ---- Settlement (complete) ----
  const openSettle = async (b: any) => {
    const res = await rental.getBookingById(b.id);
    const full = (res?.data as any) ?? b;
    setSettleForm({ amount: '', paymentMethod: 'CASH', refundMethod: 'CASH', allowOutstanding: false });
    setSettleTarget(full);
  };

  const settlePreview = useMemo(() => {
    if (!settleTarget) return null;
    const total = Number(settleTarget.totalAmount || 0);
    const paid = Number(settleTarget.paidAmount || 0) + Number(settleForm.amount || 0);
    const held = Number(settleTarget.depositHeld || 0);
    const owedBefore = Math.max(total - paid, 0);
    const deduct = Math.min(held, owedBefore);
    const refund = held - deduct;
    const owed = Math.round((owedBefore - deduct) * 100) / 100;
    return { total, paid, held, deduct, refund, owed };
  }, [settleTarget, settleForm.amount]);

  const submitSettle = async () => {
    if (!settleTarget) return;
    setSaving(true);
    try {
      const res = await rental.bookingAction(settleTarget.id, 'complete', {
        paidAmount: settleForm.amount !== '' ? Number(settleForm.amount) : null,
        paymentMethod: settleForm.paymentMethod,
        refundMethod: settleForm.refundMethod,
        allowOutstanding: Boolean(settleForm.allowOutstanding),
      });
      if (res?.success || res?.status) {
        setSettleTarget(null);
        load();
        refreshStats();
      }
    } finally { setSaving(false); }
  };

  const removeCharge = async (chargeId: string) => {
    if (!detail?.id) return;
    await rental.deleteCharge(detail.id, chargeId);
    await reloadDetail();
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

  // Filtered list
  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(b.bookingNumber || '').toLowerCase().includes(q) ||
        String(b.vehicle?.registrationNo || '').toLowerCase().includes(q) ||
        String(b.customer?.name || '').toLowerCase().includes(q) ||
        String(b.customer?.phone || '').toLowerCase().includes(q)
      );
    });
  }, [bookings, statusFilter, search]);

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

  const money = (n: any) => `Rs ${Number(n || 0).toLocaleString()}`;

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

      {/* Filters (list view) */}
      {view === 'list' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search booking # / vehicle / customer / phone"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${selectCls} max-w-44`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filteredBookings.length} of {bookings.length}</span>
        </div>
      )}

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
                          onClick={() => openDetail(b.id)}
                          title={`${b.bookingNumber}   ${b.customer?.name || ''} (${b.status})`}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer ${statusColor[b.status] || 'bg-gray-100 text-gray-700'}`}>
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
              <th className="p-3">Period</th><th className="p-3">Total</th><th className="p-3">Balance</th><th className="p-3">Status</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b) => {
              const balance = Number(b.totalAmount || 0) - Number(b.paidAmount || 0);
              return (
              <tr key={b.id} className="border-t">
                <td className="p-3 font-medium">
                  <button className="hover:underline text-primary" onClick={() => openDetail(b.id)}>{b.bookingNumber}</button>
                  {b.isLoanVehicle && <Badge variant="outline" className="ml-1.5 text-[10px]">LOAN</Badge>}
                </td>
                <td className="p-3">
                  {b.vehicle ? `${b.vehicle.registrationNo}` : ''}
                  {b.itemSummary && <span className="block text-xs text-muted-foreground max-w-56 truncate" title={b.itemSummary}>{b.itemSummary}</span>}
                  {!b.vehicle && !b.itemSummary && ' '}
                </td>
                <td className="p-3">{b.customer?.name || ' '}</td>
                <td className="p-3">{new Date(b.startAt).toLocaleDateString()} → {new Date(b.endAt).toLocaleDateString()}</td>
                <td className="p-3">{money(b.totalAmount)}</td>
                <td className="p-3">
                  {balance > 0
                    ? <span className="text-red-600 font-medium">{money(balance)}</span>
                    : <span className="text-green-600">Paid</span>}
                </td>
                <td className="p-3"><Badge className={statusColor[b.status] || ''}>{b.status}</Badge></td>
                <td className="p-3 space-x-1 whitespace-nowrap">
                  <Button size="sm" variant="ghost" title="Details" onClick={() => openDetail(b.id)}><Eye className="w-4 h-4" /></Button>
                  {b.status === 'PENDING' && (
                    <>
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => openEditModal(b)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => doBookingAction(b.id, 'confirm')}>Confirm</Button>
                    </>
                  )}
                  {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                    <>
                      <Button size="sm" onClick={() => openConditionDialog(b, 'checkout')}>Check-Out</Button>
                      <Button size="sm" variant="destructive" onClick={() => setCancelTarget(b)}>Cancel</Button>
                    </>
                  )}
                  {b.status === 'CHECKED_OUT' && (
                    <Button size="sm" onClick={() => openConditionDialog(b, 'checkin')}>Check-In</Button>
                  )}
                  {b.status === 'RETURNED' && (
                    <Button size="sm" onClick={() => openSettle(b)}>Settle & Complete</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => viewAgreement(b.id)}>Agreement</Button>
                </td>
              </tr>
              );
            })}
            {filteredBookings.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">
                {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}
              </td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>
      )}

      {/* New / Edit Booking dialog */}
      <Dialog open={showBookingModal} onOpenChange={(open) => { setShowBookingModal(open); if (!open) setEditingId(null); }}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Booking' : 'New Rental Booking'}</DialogTitle></DialogHeader>
          <DialogBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>Vehicle {(bookingForm.items ?? []).length > 0 ? '(optional)' : '*'}</Label>
              <select className={selectCls} value={bookingForm.vehicleId} onChange={(e) => setBookingForm({ ...bookingForm, vehicleId: e.target.value })}>
                <option value="">{(bookingForm.items ?? []).length > 0 ? 'No vehicle   equipment only' : 'Select vehicle'}</option>
                {vehicles.filter((v) => v.isActive && v.status !== 'RETIRED').map((v) => (
                  <option key={v.id} value={v.id}>{v.registrationNo}   {v.make} {v.model}</option>
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
                  <option value="">  No rate plan  </option>
                  {ratePlans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}   Rs {Number(p.baseRate).toLocaleString()}/{String(p.rateType).toLowerCase()}
                      {p.includedKm != null ? ` · ${p.includedKm} km incl.` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div><Label>Start *</Label><Input type="datetime-local" value={bookingForm.startAt} onChange={(e) => setBookingForm({ ...bookingForm, startAt: e.target.value })} /></div>
            <div><Label>End *</Label><Input type="datetime-local" value={bookingForm.endAt} onChange={(e) => setBookingForm({ ...bookingForm, endAt: e.target.value })} /></div>

            {/* Availability conflict warning */}
            {bookingConflicts.length > 0 && (
              <div className="col-span-2 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-2.5 text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">This vehicle is already booked for that period:</p>
                  <ul className="text-xs mt-0.5">
                    {bookingConflicts.map((c) => (
                      <li key={c.id}>{c.bookingNumber} · {new Date(c.startAt).toLocaleString()} → {new Date(c.endAt).toLocaleString()} ({c.status})</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Equipment lines: quantity items (chairs, tents) and serial-tracked units (generators) */}
            {(rentalItems.length > 0 || equipmentUnits.length > 0) && (
              <div className="col-span-2 rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Equipment</Label>
                  <div className="flex gap-1">
                    {rentalItems.length > 0 && (
                      <Button type="button" size="sm" variant="outline" onClick={() => { setItemsDirty(true); setBookingForm({ ...bookingForm, items: [...(bookingForm.items ?? []), { rentalItemId: '', quantity: 1, unitRate: '' }] }); }}>
                        <Plus className="w-3 h-3 mr-1" /> Item (qty)
                      </Button>
                    )}
                    {equipmentUnits.length > 0 && (
                      <Button type="button" size="sm" variant="outline" onClick={() => { setItemsDirty(true); setBookingForm({ ...bookingForm, items: [...(bookingForm.items ?? []), { assetId: '', quantity: 1, unitRate: '' }] }); }}>
                        <Plus className="w-3 h-3 mr-1" /> Unit (serial)
                      </Button>
                    )}
                  </div>
                </div>
                {(bookingForm.items ?? []).length === 0 && <p className="text-xs text-muted-foreground">No equipment on this booking.</p>}
                {(bookingForm.items ?? []).map((line: any, idx: number) => {
                  const setLine = (patch: any) => {
                    const items = [...bookingForm.items];
                    items[idx] = { ...line, ...patch };
                    setItemsDirty(true);
                    setBookingForm({ ...bookingForm, items });
                  };
                  const isUnit = 'assetId' in line && !('rentalItemId' in line && line.rentalItemId);
                  const item = rentalItems.find((i: any) => i.id === line.rentalItemId);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      {isUnit ? (
                        <select className={`${selectCls} col-span-7`} value={line.assetId || ''} onChange={(e) => setLine({ assetId: e.target.value })}>
                          <option value="">Select unit</option>
                          {equipmentUnits.filter((u: any) => u.isActive).map((u: any) => (
                            <option key={u.id} value={u.id}>{u.registrationNo}   {u.make} {u.model}{u.unitRate != null ? ` · Rs ${Number(u.unitRate).toLocaleString()}/${String(u.rateType || 'DAILY').toLowerCase()}` : ''}</option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <select className={`${selectCls} col-span-5`} value={line.rentalItemId || ''} onChange={(e) => setLine({ rentalItemId: e.target.value })}>
                            <option value="">Select item</option>
                            {rentalItems.map((i: any) => (
                              <option key={i.id} value={i.id}>{i.name} · Rs {Number(i.unitRate).toLocaleString()}/{String(i.rateType).toLowerCase()} ({i.totalQuantity} total)</option>
                            ))}
                          </select>
                          <Input className="col-span-2" type="number" min={1} placeholder="Qty" value={line.quantity}
                            onChange={(e) => setLine({ quantity: e.target.value })} />
                        </>
                      )}
                      <Input className="col-span-3" type="number" placeholder={item ? `Rate ${Number(item.unitRate)}` : 'Rate (default)'} value={line.unitRate ?? ''}
                        onChange={(e) => setLine({ unitRate: e.target.value })} />
                      <Button type="button" size="sm" variant="ghost" className="col-span-2"
                        onClick={() => { setItemsDirty(true); setBookingForm({ ...bookingForm, items: bookingForm.items.filter((_: any, i: number) => i !== idx) }); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground">Prices per period from the item; availability for the dates is checked when you save.</p>
              </div>
            )}

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
            <div className="col-span-2"><Label>Notes</Label>
              <textarea className={textareaCls} value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} />
            </div>

            {/* Pricing engine: extras + coupon + live quote (create only) */}
            {!editingId && extraFees.filter((f: any) => f.isActive).length > 0 && (
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
            {!editingId && (
              <div className="col-span-2 flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Coupon Code</Label>
                  <Input value={bookingForm.couponCode} onChange={(e) => setBookingForm({ ...bookingForm, couponCode: e.target.value.toUpperCase() })} />
                </div>
                <Button type="button" variant="outline" disabled={quoting} onClick={() => fetchQuote(bookingForm)}>
                  {quoting ? 'Calculating…' : 'Get Quote'}
                </Button>
              </div>
            )}
            {!editingId && quote && (
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
            <Button variant="outline" onClick={() => { setShowBookingModal(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={submitBooking} disabled={saving || (!bookingForm.vehicleId && !(bookingForm.items ?? []).some((l: any) => l.rentalItemId || l.assetId)) || !bookingForm.customerId || !bookingForm.startAt || !bookingForm.endAt}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : quote ? `Book   Rs ${Number(quote.totalAmount).toLocaleString()}` : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-out / check-in condition report dialog */}
      <Dialog open={!!conditionTarget} onOpenChange={(open) => !open && setConditionTarget(null)}>
        <DialogContent className="max-w-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {conditionTarget?.action === 'checkout' ? 'Vehicle Check-Out (Handover)' : 'Vehicle Check-In (Return)'}   {conditionTarget?.booking?.bookingNumber}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
          <div className="grid gap-4">
            {conditionTarget?.action === 'checkin' && conditionTarget?.booking?.ratePlan && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800">
                Auto-charges may apply from rate plan <b>{conditionTarget.booking.ratePlan.name}</b> if the vehicle is returned over the km allowance, with less fuel, or late. Review them in the booking details after check-in.
              </div>
            )}
            {conditionTarget?.booking?.vehicleId && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Odometer (km)</Label><Input type="number" value={conditionForm.odometer} onChange={(e) => setConditionForm({ ...conditionForm, odometer: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Fuel Level</Label>
                <select className={selectCls} value={conditionForm.fuelLevel} onChange={(e) => setConditionForm({ ...conditionForm, fuelLevel: e.target.value })}>
                  <option value="">Select</option>
                  {['FULL', '3/4', '1/2', '1/4', 'EMPTY'].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            )}
            {/* Equipment on this booking */}
            {(conditionTarget?.booking?.items?.length ?? 0) > 0 && (
              <div className="rounded-md border p-3 space-y-2">
                <Label>Equipment {conditionTarget?.action === 'checkin' ? '  mark anything lost or damaged' : ''}</Label>
                {conditionTarget!.booking.items.map((l: any) => (
                  <div key={l.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                    <span className="col-span-6">{l.quantity} x {l.description}</span>
                    {conditionTarget?.action === 'checkin' && (
                      <>
                        <Input className="col-span-3" type="number" min={0} max={l.quantity} placeholder="Lost"
                          value={conditionForm.itemReturns[l.id]?.lost ?? ''}
                          onChange={(e) => setConditionForm({ ...conditionForm, itemReturns: { ...conditionForm.itemReturns, [l.id]: { ...(conditionForm.itemReturns[l.id] || {}), lost: e.target.value } } })} />
                        <Input className="col-span-3" type="number" min={0} max={l.quantity} placeholder="Damaged"
                          value={conditionForm.itemReturns[l.id]?.damaged ?? ''}
                          onChange={(e) => setConditionForm({ ...conditionForm, itemReturns: { ...conditionForm.itemReturns, [l.id]: { ...(conditionForm.itemReturns[l.id] || {}), damaged: e.target.value } } })} />
                      </>
                    )}
                  </div>
                ))}
                {conditionTarget?.action === 'checkin' && (
                  <p className="text-[11px] text-muted-foreground">Lost units are removed from stock and charged at replacement cost. Add damage charges in the booking details.</p>
                )}
              </div>
            )}
            <div className="space-y-1.5"><Label>Notes / Damage remarks</Label>
              <textarea className={textareaCls} value={conditionForm.notes} onChange={(e) => setConditionForm({ ...conditionForm, notes: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Rent collected now (Rs)</Label><Input type="number" value={conditionForm.paidAmount} onChange={(e) => setConditionForm({ ...conditionForm, paidAmount: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Paid by</Label>
                <select className={selectCls} value={conditionForm.paymentMethod} onChange={(e) => setConditionForm({ ...conditionForm, paymentMethod: e.target.value })}>
                  {PAY_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              {conditionTarget?.action === 'checkout' && (
                <>
                  <div className="space-y-1.5"><Label>Security deposit taken (Rs)</Label><Input type="number" value={conditionForm.depositCollected} onChange={(e) => setConditionForm({ ...conditionForm, depositCollected: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Deposit paid by</Label>
                    <select className={selectCls} value={conditionForm.depositMethod} onChange={(e) => setConditionForm({ ...conditionForm, depositMethod: e.target.value })}>
                      {PAY_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <PhotoUploadInput
              label="Condition Photos (before/after evidence)"
              folder="condition-reports"
              photos={conditionForm.photos}
              onChange={(photos) => setConditionForm({ ...conditionForm, photos })}
            />
            {conditionTarget?.booking?.vehicleId && (
            <div className="space-y-2">
              <Label>Damage Diagram (tap the car to mark damage)</Label>
              <VehicleDamageDiagram value={conditionForm.damageMarkers} onChange={(damageMarkers) => setConditionForm({ ...conditionForm, damageMarkers })} />
            </div>
            )}
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

      {/* Booking detail dialog */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Booking {detail?.bookingNumber || ''}
              {detail?.status && <Badge className={statusColor[detail.status] || ''}>{detail.status}</Badge>}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {detailLoading || !detail?.bookingNumber ? (
              <div className="py-10"><LoadingSpinner /></div>
            ) : (
              <div className="space-y-4 text-sm">
                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-md border p-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Vehicle & Customer</p>
                    {detail.vehicle ? (
                      <p><b>{detail.vehicle?.registrationNo}</b>   {detail.vehicle?.make} {detail.vehicle?.model}</p>
                    ) : <p className="text-muted-foreground">Equipment rental</p>}
                    <p>{detail.customer?.name} {detail.customer?.phone ? `· ${detail.customer.phone}` : ''}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(detail.startAt).toLocaleString()} → {new Date(detail.endAt).toLocaleString()}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {detail.withDriver && <Badge variant="outline" className="text-[10px]">With driver</Badge>}
                      {detail.isLoanVehicle && <Badge variant="outline" className="text-[10px]">Loan vehicle</Badge>}
                      {detail.ratePlan && <Badge variant="outline" className="text-[10px]">{detail.ratePlan.name}</Badge>}
                    </div>
                  </div>
                  <div className="rounded-md border p-3 space-y-0.5">
                    <p className="text-xs font-semibold text-muted-foreground">Money</p>
                    <div className="flex justify-between"><span>Base</span><span>{money(detail.baseAmount)}</span></div>
                    <div className="flex justify-between"><span>Extras</span><span>{money(detail.extrasAmount)}</span></div>
                    {Number(detail.itemsAmount) > 0 && <div className="flex justify-between"><span>Equipment</span><span>{money(detail.itemsAmount)}</span></div>}
                    <div className="flex justify-between"><span>Charges</span><span>{money(detail.chargesAmount)}</span></div>
                    {Number(detail.discountAmount) > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>−{money(detail.discountAmount)}</span></div>}
                    <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total</span><span>{money(detail.totalAmount)}</span></div>
                    <div className="flex justify-between"><span>Paid</span><span>{money(detail.paidAmount)}</span></div>
                    <div className="flex justify-between"><span>Balance</span>
                      <span className={Number(detail.totalAmount) - Number(detail.paidAmount) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {money(Number(detail.totalAmount) - Number(detail.paidAmount))}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground border-t pt-1 mt-1"><span>Deposit agreed</span><span>{money(detail.depositAmount)}</span></div>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Deposit taken / applied / refunded</span>
                      <span>{money(detail.depositPaid)} / {money(detail.depositDeducted)} / {money(detail.depositRefunded)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium"><span>Deposit held now</span><span>{money(detail.depositHeld)}</span></div>
                  </div>
                </div>

                {/* Identity */}
                {(detail.renterNic || detail.renterLicenseNo || (detail.identityPhotos?.length ?? 0) > 0) && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Renter Identity</p>
                    <p className="text-xs">NIC: {detail.renterNic || ' '} · License: {detail.renterLicenseNo || ' '}</p>
                    {(detail.identityPhotos?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {detail.identityPhotos.map((p: string, i: number) => (
                          <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" className="w-20 h-14 object-cover rounded border" /></a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Condition reports */}
                {(detail.conditionReports?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Condition Reports</p>
                    {detail.conditionReports.map((r: any) => (
                      <div key={r.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px]">{r.reportType}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {r.odometer != null ? `${Number(r.odometer).toLocaleString()} km` : ''} {r.fuelLevel ? `· ${r.fuelLevel}` : ''}
                          </span>
                        </div>
                        {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
                        {(r.damageMarkers?.length ?? 0) > 0 && <p className="text-[11px] text-amber-700 mt-1">{r.damageMarkers.length} damage marker(s)</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(r.photos ?? []).map((p: string, i: number) => (
                            <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" className="w-20 h-14 object-cover rounded border" /></a>
                          ))}
                          {r.customerSignature && <img src={r.customerSignature} alt="signature" className="h-14 rounded border bg-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Equipment lines */}
                {(detail.items?.length ?? 0) > 0 && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Equipment</p>
                    <table className="w-full text-xs">
                      <tbody>
                        {detail.items.map((l: any) => (
                          <tr key={l.id} className="border-t first:border-t-0">
                            <td className="py-1.5">{l.quantity} x {l.description}</td>
                            <td className="py-1.5 text-muted-foreground">{money(l.unitRate)}/{String(l.rateType).toLowerCase()} x {l.periods}</td>
                            <td className="py-1.5">
                              {Number(l.lostQuantity) > 0 && <Badge variant="destructive" className="text-[10px] mr-1">{l.lostQuantity} lost</Badge>}
                              {Number(l.damagedQuantity) > 0 && <Badge variant="outline" className="text-[10px]">{l.damagedQuantity} damaged</Badge>}
                            </td>
                            <td className="py-1.5 text-right font-medium">{money(l.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Payments ledger */}
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Payments</p>
                  {(detail.payments?.length ?? 0) > 0 ? (
                    <table className="w-full text-xs">
                      <tbody>
                        {detail.payments.map((p: any) => (
                          <tr key={p.id} className={`border-t first:border-t-0 ${p.voidedAt ? 'line-through text-muted-foreground' : ''}`}>
                            <td className="py-1.5">{p.paymentNumber}</td>
                            <td className="py-1.5">{PAY_TYPES[p.paymentType] || p.paymentType}</td>
                            <td className="py-1.5">{String(p.paymentMethod).replace(/_/g, ' ')}{p.referenceNumber ? ` · ${p.referenceNumber}` : ''}</td>
                            <td className="py-1.5 text-muted-foreground">{new Date(p.paidAt).toLocaleString()}</td>
                            <td className="py-1.5 text-right font-medium">{money(p.amount)}</td>
                            <td className="py-1.5 text-right w-12">
                              {!p.voidedAt && detail.status !== 'COMPLETED' && p.paymentType !== 'DEPOSIT_DEDUCTION' && (
                                <button className="text-red-500 text-[11px]" onClick={() => voidPayment(p.id)}>Void</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="text-xs text-muted-foreground">No payments recorded.</p>}
                  <div className="flex flex-wrap items-end gap-2 mt-3 border-t pt-3">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <select className={`${selectCls} h-8 w-36`} value={payForm.paymentType} onChange={(e) => setPayForm({ ...payForm, paymentType: e.target.value })}>
                        {detail.status !== 'CANCELLED' && <option value="RENT">Rent payment</option>}
                        {detail.status !== 'CANCELLED' && <option value="DEPOSIT">Deposit taken</option>}
                        <option value="DEPOSIT_REFUND">Deposit refund</option>
                        <option value="REFUND">Refund</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Method</Label>
                      <select className={`${selectCls} h-8 w-36`} value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}>
                        {PAY_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                    <div className="w-28">
                      <Label className="text-xs">Amount (Rs)</Label>
                      <Input className="h-8" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                    </div>
                    <div className="flex-1 min-w-28">
                      <Label className="text-xs">Reference</Label>
                      <Input className="h-8" value={payForm.referenceNumber} onChange={(e) => setPayForm({ ...payForm, referenceNumber: e.target.value })} placeholder="Slip / txn no" />
                    </div>
                    <Button size="sm" onClick={submitPayment} disabled={paySaving || !payForm.amount || Number(payForm.amount) <= 0}>
                      {paySaving ? 'Saving…' : 'Record'}
                    </Button>
                  </div>
                </div>

                {/* Charges */}
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Charges</p>
                  {(detail.charges?.length ?? 0) > 0 ? (
                    <table className="w-full text-xs">
                      <tbody>
                        {detail.charges.map((c: any) => (
                          <tr key={c.id} className="border-t first:border-t-0">
                            <td className="py-1.5"><Badge variant="outline" className="text-[10px]">{c.chargeType}</Badge></td>
                            <td className="py-1.5">{c.description}</td>
                            <td className="py-1.5 text-right font-medium">{money(c.amount)}</td>
                            <td className="py-1.5 text-right w-8">
                              {detail.status !== 'COMPLETED' && detail.status !== 'CANCELLED' && (
                                <button onClick={() => removeCharge(c.id)} title="Remove"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="text-xs text-muted-foreground">No charges added.</p>}

                  {/* Add charge */}
                  {detail.status !== 'COMPLETED' && detail.status !== 'CANCELLED' && (
                    <div className="flex flex-wrap items-end gap-2 mt-3 border-t pt-3">
                      <div>
                        <Label className="text-xs">Type</Label>
                        <select className={`${selectCls} h-8 w-36`} value={chargeForm.chargeType} onChange={(e) => setChargeForm({ ...chargeForm, chargeType: e.target.value })}>
                          {CHARGE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 min-w-40">
                        <Label className="text-xs">Description</Label>
                        <Input className="h-8" value={chargeForm.description} onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })} placeholder="e.g. Scratch on rear bumper" />
                      </div>
                      <div className="w-28">
                        <Label className="text-xs">Amount (Rs)</Label>
                        <Input className="h-8" type="number" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} />
                      </div>
                      <Button size="sm" onClick={submitCharge} disabled={chargeSaving || !chargeForm.description || chargeForm.amount === ''}>
                        <Plus className="w-3 h-3 mr-1" /> {chargeSaving ? 'Adding…' : 'Add'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            {detail?.bookingNumber && (
              <Button variant="outline" onClick={() => viewAgreement(detail.id)}>Agreement</Button>
            )}
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle & complete */}
      <Dialog open={!!settleTarget} onOpenChange={(open) => !open && setSettleTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Settle {settleTarget?.bookingNumber}</DialogTitle></DialogHeader>
          <DialogBody>
            {settlePreview && (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border p-3 space-y-0.5">
                  <div className="flex justify-between"><span>Total (incl. charges)</span><span>{money(settlePreview.total)}</span></div>
                  <div className="flex justify-between"><span>Paid (incl. now)</span><span>{money(settlePreview.paid)}</span></div>
                  <div className="flex justify-between"><span>Deposit held</span><span>{money(settlePreview.held)}</span></div>
                  <div className="flex justify-between text-amber-700"><span>Deposit applied to balance</span><span>{money(settlePreview.deduct)}</span></div>
                  <div className="flex justify-between text-green-700"><span>Deposit to refund</span><span>{money(settlePreview.refund)}</span></div>
                  <div className={`flex justify-between font-bold border-t pt-1 mt-1 ${settlePreview.owed > 0 ? 'text-red-600' : ''}`}><span>Still owed</span><span>{money(settlePreview.owed)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Collect now (Rs)</Label><Input type="number" value={settleForm.amount} onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })} /></div>
                  <div><Label>Paid by</Label>
                    <select className={selectCls} value={settleForm.paymentMethod} onChange={(e) => setSettleForm({ ...settleForm, paymentMethod: e.target.value })}>
                      {PAY_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  {settlePreview.refund > 0 && (
                    <div className="col-span-2"><Label>Refund deposit by</Label>
                      <select className={selectCls} value={settleForm.refundMethod} onChange={(e) => setSettleForm({ ...settleForm, refundMethod: e.target.value })}>
                        {PAY_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {settlePreview.owed > 0 && (
                  <label className="flex items-start gap-2 text-xs">
                    <input type="checkbox" className="mt-0.5" checked={settleForm.allowOutstanding} onChange={(e) => setSettleForm({ ...settleForm, allowOutstanding: e.target.checked })} />
                    <span>Close the booking with {money(settlePreview.owed)} still owed by the customer</span>
                  </label>
                )}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleTarget(null)}>Cancel</Button>
            <Button onClick={submitSettle} disabled={saving || (!!settlePreview && settlePreview.owed > 0 && !settleForm.allowOutstanding)}>
              {saving ? 'Saving...' : 'Settle & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel booking {cancelTarget?.bookingNumber}?</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">This releases the reserved vehicle. This cannot be undone.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep booking</Button>
            <Button variant="destructive" onClick={confirmCancel}>Cancel booking</Button>
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
