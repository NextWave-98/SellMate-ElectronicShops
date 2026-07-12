/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Car, CalendarDays, Wrench, RefreshCw, Plus, Search, AlertTriangle, Fuel, ShieldAlert, Trash2, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PhotoUploadInput from '../../components/common/PhotoUploadInput';
import SignaturePad from '../../components/common/SignaturePad';
import { useRental, VEHICLE_CLASSES, VEHICLE_FEATURES } from '../../hooks/useRental';
import { useCustomer } from '../../hooks';

const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

const statusColor: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  RESERVED: 'bg-amber-100 text-amber-800',
  RENTED: 'bg-blue-100 text-blue-800',
  MAINTENANCE: 'bg-orange-100 text-orange-800',
  RETIRED: 'bg-gray-200 text-gray-600',
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-sky-100 text-sky-800',
  CHECKED_OUT: 'bg-blue-100 text-blue-800',
  RETURNED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-red-100 text-red-800',
  SCHEDULED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  ACCIDENT: 'bg-red-100 text-red-800',
  SOLD: 'bg-gray-200 text-gray-600',
  OPEN: 'bg-amber-100 text-amber-800',
  SUBMITTED: 'bg-sky-100 text-sky-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-gray-200 text-gray-700',
};

export default function RentalPage() {
  const rental = useRental();
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // dialogs
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [agreementText, setAgreementText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Check-out / check-in condition report dialog
  const [conditionTarget, setConditionTarget] = useState<{ booking: any; action: 'checkout' | 'checkin' } | null>(null);
  const [conditionForm, setConditionForm] = useState<any>({
    odometer: '', fuelLevel: '', notes: '', photos: [] as string[], customerSignature: null as string | null, paidAmount: '',
  });

  const [vehicleForm, setVehicleForm] = useState<any>({
    registrationNo: '', make: '', model: '', year: '', vehicleClass: 'SEDAN',
    fuelType: '', transmission: '', seats: '', currentOdometer: 0,
    insuranceExpiry: '', licenseExpiry: '', emissionTestExpiry: '',
    features: [] as string[],
  });

  // Fuel & claims
  const [fuelData, setFuelData] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [fuelForm, setFuelForm] = useState<any>({ vehicleId: '', filledAt: '', odometer: '', liters: '', cost: '', station: '' });
  const [claimForm, setClaimForm] = useState<any>({ vehicleId: '', claimNo: '', insurer: '', incidentDate: '', description: '', claimedAmount: '' });
  const [bookingForm, setBookingForm] = useState<any>({
    vehicleId: '', customerId: '', startAt: '', endAt: '',
    baseAmount: 0, depositAmount: 0, withDriver: false, notes: '',
    extraFeeIds: [] as string[], couponCode: '',
  });
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);

  // Pricing engine data
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [extraFees, setExtraFees] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [ruleForm, setRuleForm] = useState<any>({ name: '', ruleType: 'WEEKEND', vehicleClass: '', multiplier: '', flatAddition: '', startDate: '', endDate: '' });
  const [feeForm, setFeeForm] = useState<any>({ name: '', amount: '', perDay: false });
  const [couponForm, setCouponForm] = useState<any>({ code: '', discountType: 'PERCENT', value: '', validFrom: '', validTo: '', maxUses: '' });
  const [maintenanceForm, setMaintenanceForm] = useState<any>({
    vehicleId: '', title: '', scheduledDate: '', cost: 0, serviceProvider: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, vehiclesRes, bookingsRes, maintRes, fuelRes, claimsRes] = await Promise.all([
        rental.getStats(),
        rental.getVehicles({ search, limit: 100 }),
        rental.getBookings({ limit: 100 }),
        rental.getMaintenances(),
        rental.getFuelLogs(),
        rental.getClaims(),
      ]);
      setStats(statsRes?.data ?? null);
      setVehicles((vehiclesRes?.data as any)?.vehicles ?? []);
      setBookings((bookingsRes?.data as any)?.bookings ?? []);
      setMaintenances((maintRes?.data as any) ?? []);
      setFuelData(fuelRes?.data ?? null);
      setClaims((claimsRes?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [rental, search]);

  const loadPricing = useCallback(async () => {
    const [rulesRes, feesRes, couponsRes] = await Promise.all([
      rental.getPricingRules(), rental.getExtraFees(), rental.getCoupons(),
    ]);
    setPricingRules((rulesRes?.data as any) ?? []);
    setExtraFees((feesRes?.data as any) ?? []);
    setCoupons((couponsRes?.data as any) ?? []);
  }, [rental]);

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

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = useCallback(async () => {
    const res = await getCustomers({ limit: 200 } as any);
    const list = (res?.data as any)?.customers ?? (Array.isArray(res?.data) ? res?.data : []);
    setCustomers(list);
  }, [getCustomers]);

  const submitVehicle = async () => {
    setSaving(true);
    try {
      const res = await rental.createVehicle({
        ...vehicleForm,
        year: vehicleForm.year ? Number(vehicleForm.year) : null,
        seats: vehicleForm.seats ? Number(vehicleForm.seats) : null,
        currentOdometer: Number(vehicleForm.currentOdometer || 0),
        insuranceExpiry: vehicleForm.insuranceExpiry || null,
        licenseExpiry: vehicleForm.licenseExpiry || null,
        emissionTestExpiry: vehicleForm.emissionTestExpiry || null,
      });
      if (res?.success || res?.status) {
        setShowVehicleModal(false);
        loadAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const submitBooking = async () => {
    setSaving(true);
    try {
      const useQuote = Boolean(quote);
      const res = await rental.createBooking({
        ...bookingForm,
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
        loadAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const submitPricingRule = async () => {
    setSaving(true);
    try {
      const res = await rental.createPricingRule({
        name: ruleForm.name,
        ruleType: ruleForm.ruleType,
        vehicleClass: ruleForm.vehicleClass || null,
        multiplier: ruleForm.multiplier ? Number(ruleForm.multiplier) : null,
        flatAddition: ruleForm.flatAddition ? Number(ruleForm.flatAddition) : null,
        startDate: ruleForm.startDate || null,
        endDate: ruleForm.endDate || null,
      });
      if (res?.success || res?.status) { setShowRuleModal(false); loadPricing(); }
    } finally { setSaving(false); }
  };

  const submitFee = async () => {
    setSaving(true);
    try {
      const res = await rental.createExtraFee({ name: feeForm.name, amount: Number(feeForm.amount || 0), perDay: feeForm.perDay });
      if (res?.success || res?.status) { setShowFeeModal(false); loadPricing(); }
    } finally { setSaving(false); }
  };

  const submitCoupon = async () => {
    setSaving(true);
    try {
      const res = await rental.createCoupon({
        code: couponForm.code,
        discountType: couponForm.discountType,
        value: Number(couponForm.value || 0),
        validFrom: couponForm.validFrom || null,
        validTo: couponForm.validTo || null,
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : null,
      });
      if (res?.success || res?.status) { setShowCouponModal(false); loadPricing(); }
    } finally { setSaving(false); }
  };

  const submitFuelLog = async () => {
    setSaving(true);
    try {
      const res = await rental.createFuelLog({
        ...fuelForm,
        odometer: Number(fuelForm.odometer || 0),
        liters: Number(fuelForm.liters || 0),
        cost: Number(fuelForm.cost || 0),
        station: fuelForm.station || null,
      });
      if (res?.success || res?.status) { setShowFuelModal(false); loadAll(); }
    } finally { setSaving(false); }
  };

  const submitClaim = async () => {
    setSaving(true);
    try {
      const res = await rental.createClaim({
        ...claimForm,
        claimedAmount: Number(claimForm.claimedAmount || 0),
        incidentDate: claimForm.incidentDate || null,
        description: claimForm.description || null,
      });
      if (res?.success || res?.status) { setShowClaimModal(false); loadAll(); }
    } finally { setSaving(false); }
  };

  const submitMaintenance = async () => {
    setSaving(true);
    try {
      const res = await rental.createMaintenance({
        ...maintenanceForm,
        cost: Number(maintenanceForm.cost || 0),
        scheduledDate: maintenanceForm.scheduledDate || null,
      });
      if (res?.success || res?.status) {
        setShowMaintenanceModal(false);
        loadAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const doBookingAction = async (id: string, action: any) => {
    await rental.bookingAction(id, action, {});
    loadAll();
  };

  const openConditionDialog = (booking: any, action: 'checkout' | 'checkin') => {
    setConditionForm({
      odometer: booking.vehicle?.currentOdometer != null ? String(booking.vehicle.currentOdometer) : '',
      fuelLevel: '', notes: '', photos: [], customerSignature: null, paidAmount: '',
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
        customerSignature: conditionForm.customerSignature,
        paidAmount: conditionForm.paidAmount !== '' ? Number(conditionForm.paidAmount) : null,
      });
      if (res?.success || res?.status) {
        setConditionTarget(null);
        loadAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const [agreementBookingId, setAgreementBookingId] = useState<string | null>(null);

  const viewAgreement = async (id: string) => {
    const res = await rental.generateAgreement(id);
    const text = (res?.data as any)?.agreementText;
    if (text) { setAgreementText(text); setAgreementBookingId(id); }
  };

  const downloadAgreementPdf = async () => {
    if (!agreementBookingId) return;
    const { getAccessToken } = await import('../../utils/tokenStorage');
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

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Car className="w-6 h-6" /> Vehicle Rental</h1>
          <p className="text-sm text-muted-foreground">Fleet, bookings, agreements & maintenance</p>
        </div>
        <Button variant="outline" onClick={loadAll}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Fleet', value: stats?.totalVehicles ?? 0 },
          { label: 'Available', value: stats?.available ?? 0 },
          { label: 'Rented', value: stats?.rented ?? 0 },
          { label: 'Maintenance', value: stats?.maintenance ?? 0 },
          { label: 'Active Bookings', value: stats?.activeBookings ?? 0 },
          { label: 'Utilization', value: `${stats?.utilizationPercent ?? 0}%` },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Expiring documents warning */}
      {(stats?.expiringDocuments?.length ?? 0) > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <p className="font-semibold flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4" /> Documents expiring within 30 days
            </p>
            <ul className="text-sm mt-1 text-amber-900">
              {stats.expiringDocuments.map((v: any) => (
                <li key={v.id}>
                  {v.registrationNo} ({v.make} {v.model}) — Insurance: {v.insuranceExpiry || '—'} | License: {v.licenseExpiry || '—'} | Emission: {v.emissionTestExpiry || '—'}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="fleet">
        <TabsList>
          <TabsTrigger value="fleet"><Car className="w-4 h-4 mr-1" /> Fleet</TabsTrigger>
          <TabsTrigger value="bookings"><CalendarDays className="w-4 h-4 mr-1" /> Bookings</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="w-4 h-4 mr-1" /> Maintenance</TabsTrigger>
          <TabsTrigger value="fuel"><Fuel className="w-4 h-4 mr-1" /> Fuel</TabsTrigger>
          <TabsTrigger value="claims"><ShieldAlert className="w-4 h-4 mr-1" /> Claims</TabsTrigger>
          <TabsTrigger value="pricing" onClick={loadPricing}><Tags className="w-4 h-4 mr-1" /> Pricing</TabsTrigger>
        </TabsList>

        {/* FLEET */}
        <TabsContent value="fleet" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search reg no / make / model" value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadAll()} />
            </div>
            <Button onClick={() => setShowVehicleModal(true)}><Plus className="w-4 h-4 mr-1" /> Add Vehicle</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Reg No</th><th className="p-3">Vehicle</th><th className="p-3">Class</th>
                  <th className="p-3">Odometer</th><th className="p-3">Insurance</th><th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="p-3 font-medium">{v.registrationNo}</td>
                    <td className="p-3">{v.make} {v.model} {v.year ? `(${v.year})` : ''}</td>
                    <td className="p-3">{v.vehicleClass}</td>
                    <td className="p-3">{Number(v.currentOdometer).toLocaleString()} km</td>
                    <td className="p-3">{v.insuranceExpiry || '—'}</td>
                    <td className="p-3"><Badge className={statusColor[v.status] || ''}>{v.status}</Badge></td>
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No vehicles in the fleet yet</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* BOOKINGS */}
        <TabsContent value="bookings" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { loadCustomers(); loadPricing(); setQuote(null); setShowBookingModal(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New Booking
            </Button>
          </div>
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
                    <td className="p-3 font-medium">{b.bookingNumber}</td>
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
        </TabsContent>

        {/* MAINTENANCE */}
        <TabsContent value="maintenance" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowMaintenanceModal(true)}><Plus className="w-4 h-4 mr-1" /> Schedule Maintenance</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Vehicle</th><th className="p-3">Title</th><th className="p-3">Scheduled</th>
                  <th className="p-3">Cost</th><th className="p-3">Status</th><th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {maintenances.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">{m.vehicle ? `${m.vehicle.registrationNo}` : '—'}</td>
                    <td className="p-3">{m.title}</td>
                    <td className="p-3">{m.scheduledDate || '—'}</td>
                    <td className="p-3">Rs {Number(m.cost).toLocaleString()}</td>
                    <td className="p-3"><Badge className={statusColor[m.status] || ''}>{m.status}</Badge></td>
                    <td className="p-3 space-x-1">
                      {m.status === 'SCHEDULED' && (
                        <Button size="sm" variant="outline" onClick={async () => { await rental.updateMaintenance(m.id, { status: 'IN_PROGRESS' }); loadAll(); }}>Start</Button>
                      )}
                      {m.status === 'IN_PROGRESS' && (
                        <Button size="sm" onClick={async () => { await rental.updateMaintenance(m.id, { status: 'COMPLETED', completedDate: new Date().toISOString().slice(0, 10) }); loadAll(); }}>Complete</Button>
                      )}
                    </td>
                  </tr>
                ))}
                {maintenances.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No maintenance records</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
        {/* FUEL LOGS */}
        <TabsContent value="fuel" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total: Rs {Number(fuelData?.totalCost ?? 0).toLocaleString()} · {Number(fuelData?.totalLiters ?? 0).toLocaleString()} L
            </p>
            <Button onClick={() => setShowFuelModal(true)}><Plus className="w-4 h-4 mr-1" /> Add Fuel Log</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Date</th><th className="p-3">Vehicle</th><th className="p-3">Odometer</th>
                  <th className="p-3">Liters</th><th className="p-3">Cost</th><th className="p-3">Efficiency</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(fuelData?.logs ?? []).map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3">{l.filledAt}</td>
                    <td className="p-3">{l.vehicle?.registrationNo || '—'}</td>
                    <td className="p-3">{Number(l.odometer).toLocaleString()} km</td>
                    <td className="p-3">{l.liters} L</td>
                    <td className="p-3">Rs {Number(l.cost).toLocaleString()}</td>
                    <td className="p-3">{l.kmPerLiter != null ? <Badge className="bg-green-100 text-green-800">{l.kmPerLiter} km/L</Badge> : '—'}</td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={async () => { await rental.deleteFuelLog(l.id); loadAll(); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(fuelData?.logs ?? []).length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No fuel logs yet</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* INSURANCE CLAIMS */}
        <TabsContent value="claims" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowClaimModal(true)}><Plus className="w-4 h-4 mr-1" /> New Claim</Button>
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
                      <select className={selectCls} value={c.status}
                        onChange={async (e) => {
                          const updates: any = { status: e.target.value };
                          if (e.target.value === 'APPROVED' && c.approvedAmount == null) {
                            const amt = window.prompt('Approved amount (Rs):', String(c.claimedAmount));
                            if (amt != null) updates.approvedAmount = Number(amt);
                          }
                          await rental.updateClaim(c.id, updates);
                          loadAll();
                        }}>
                        {['OPEN', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {claims.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No insurance claims</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
        {/* PRICING ENGINE */}
        <TabsContent value="pricing" className="space-y-4">
          {/* Rules */}
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm">Price Rules (weekend / holiday / seasonal)</p>
              <Button size="sm" onClick={() => setShowRuleModal(true)}><Plus className="w-3 h-3 mr-1" /> Rule</Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr><th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Class</th><th className="p-2">Adjustment</th><th className="p-2">Period</th><th className="p-2">Active</th></tr>
              </thead>
              <tbody>
                {pricingRules.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2"><Badge variant="outline">{r.ruleType}</Badge></td>
                    <td className="p-2">{r.vehicleClass || 'All'}</td>
                    <td className="p-2">{r.multiplier ? `× ${r.multiplier}` : ''} {r.flatAddition ? `+Rs ${Number(r.flatAddition).toLocaleString()}/day` : ''}</td>
                    <td className="p-2">{r.ruleType === 'WEEKEND' ? 'Sat & Sun' : `${r.startDate || '—'} → ${r.endDate || '—'}`}</td>
                    <td className="p-2">
                      <input type="checkbox" checked={r.isActive} onChange={async () => { await rental.updatePricingRule(r.id, { isActive: !r.isActive }); loadPricing(); }} />
                    </td>
                  </tr>
                ))}
                {pricingRules.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No price rules</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>

          {/* Fees */}
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm">Extra Fees (airport pickup, delivery, baby seat...)</p>
              <Button size="sm" onClick={() => setShowFeeModal(true)}><Plus className="w-3 h-3 mr-1" /> Fee</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {extraFees.map((f) => (
                <Badge key={f.id} variant="outline" className="text-xs py-1.5 px-3">
                  {f.name}: Rs {Number(f.amount).toLocaleString()}{f.perDay ? '/day' : ''}
                </Badge>
              ))}
              {extraFees.length === 0 && <p className="text-sm text-muted-foreground">No extra fees configured</p>}
            </div>
          </CardContent></Card>

          {/* Coupons */}
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm">Coupons</p>
              <Button size="sm" onClick={() => setShowCouponModal(true)}><Plus className="w-3 h-3 mr-1" /> Coupon</Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr><th className="p-2">Code</th><th className="p-2">Discount</th><th className="p-2">Valid</th><th className="p-2">Used</th><th className="p-2">Active</th></tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2 font-mono font-bold">{c.code}</td>
                    <td className="p-2">{c.discountType === 'PERCENT' ? `${c.value}%` : `Rs ${Number(c.value).toLocaleString()}`}</td>
                    <td className="p-2">{c.validFrom || '—'} → {c.validTo || '—'}</td>
                    <td className="p-2">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                    <td className="p-2">
                      <input type="checkbox" checked={c.isActive} onChange={async () => { await rental.updateCoupon(c.id, { isActive: !c.isActive }); loadPricing(); }} />
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No coupons</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Pricing rule dialog */}
      <Dialog open={showRuleModal} onOpenChange={setShowRuleModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Price Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name *</Label><Input placeholder="e.g. Weekend surcharge / December season" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} /></div>
            <div><Label>Type</Label>
              <select className={selectCls} value={ruleForm.ruleType} onChange={(e) => setRuleForm({ ...ruleForm, ruleType: e.target.value })}>
                <option value="WEEKEND">Weekend (Sat/Sun)</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="SEASONAL">Seasonal</option>
              </select>
            </div>
            <div><Label>Vehicle Class</Label>
              <select className={selectCls} value={ruleForm.vehicleClass} onChange={(e) => setRuleForm({ ...ruleForm, vehicleClass: e.target.value })}>
                <option value="">All classes</option>
                {VEHICLE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Multiplier (e.g. 1.25 = +25%)</Label><Input type="number" step="0.05" value={ruleForm.multiplier} onChange={(e) => setRuleForm({ ...ruleForm, multiplier: e.target.value })} /></div>
            <div><Label>OR Flat addition (Rs/day)</Label><Input type="number" value={ruleForm.flatAddition} onChange={(e) => setRuleForm({ ...ruleForm, flatAddition: e.target.value })} /></div>
            {ruleForm.ruleType !== 'WEEKEND' && (
              <>
                <div><Label>Start Date *</Label><Input type="date" value={ruleForm.startDate} onChange={(e) => setRuleForm({ ...ruleForm, startDate: e.target.value })} /></div>
                <div><Label>End Date *</Label><Input type="date" value={ruleForm.endDate} onChange={(e) => setRuleForm({ ...ruleForm, endDate: e.target.value })} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleModal(false)}>Cancel</Button>
            <Button onClick={submitPricingRule} disabled={saving || !ruleForm.name || (!ruleForm.multiplier && !ruleForm.flatAddition)}>
              {saving ? 'Saving...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee dialog */}
      <Dialog open={showFeeModal} onOpenChange={setShowFeeModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Extra Fee</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input placeholder="e.g. Airport Pickup / Baby Seat" value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} /></div>
            <div><Label>Amount (Rs) *</Label><Input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="perDay" checked={feeForm.perDay} onChange={(e) => setFeeForm({ ...feeForm, perDay: e.target.checked })} />
              <Label htmlFor="perDay">Charge per day (otherwise one-time)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeeModal(false)}>Cancel</Button>
            <Button onClick={submitFee} disabled={saving || !feeForm.name || !feeForm.amount}>{saving ? 'Saving...' : 'Create Fee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coupon dialog */}
      <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Coupon</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code *</Label><Input placeholder="NEWYEAR25" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Type</Label>
              <select className={selectCls} value={couponForm.discountType} onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}>
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Fixed (Rs)</option>
              </select>
            </div>
            <div><Label>Value *</Label><Input type="number" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} /></div>
            <div><Label>Max Uses</Label><Input type="number" value={couponForm.maxUses} onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })} /></div>
            <div><Label>Valid From</Label><Input type="date" value={couponForm.validFrom} onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })} /></div>
            <div><Label>Valid To</Label><Input type="date" value={couponForm.validTo} onChange={(e) => setCouponForm({ ...couponForm, validTo: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCouponModal(false)}>Cancel</Button>
            <Button onClick={submitCoupon} disabled={saving || !couponForm.code || !couponForm.value}>{saving ? 'Saving...' : 'Create Coupon'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fuel log dialog */}
      <Dialog open={showFuelModal} onOpenChange={setShowFuelModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Fuel Log</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Vehicle *</Label>
              <select className={selectCls} value={fuelForm.vehicleId} onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNo} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div><Label>Date *</Label><Input type="date" value={fuelForm.filledAt} onChange={(e) => setFuelForm({ ...fuelForm, filledAt: e.target.value })} /></div>
            <div><Label>Odometer (km) *</Label><Input type="number" value={fuelForm.odometer} onChange={(e) => setFuelForm({ ...fuelForm, odometer: e.target.value })} /></div>
            <div><Label>Liters *</Label><Input type="number" value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} /></div>
            <div><Label>Cost (Rs) *</Label><Input type="number" value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} /></div>
            <div className="col-span-2"><Label>Station</Label><Input value={fuelForm.station} onChange={(e) => setFuelForm({ ...fuelForm, station: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFuelModal(false)}>Cancel</Button>
            <Button onClick={submitFuelLog} disabled={saving || !fuelForm.vehicleId || !fuelForm.filledAt || !fuelForm.odometer || !fuelForm.liters}>
              {saving ? 'Saving...' : 'Add Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim dialog */}
      <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Insurance Claim</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Vehicle *</Label>
              <select className={selectCls} value={claimForm.vehicleId} onChange={(e) => setClaimForm({ ...claimForm, vehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNo} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div><Label>Claim No *</Label><Input value={claimForm.claimNo} onChange={(e) => setClaimForm({ ...claimForm, claimNo: e.target.value })} /></div>
            <div><Label>Insurer *</Label><Input value={claimForm.insurer} onChange={(e) => setClaimForm({ ...claimForm, insurer: e.target.value })} /></div>
            <div><Label>Incident Date</Label><Input type="date" value={claimForm.incidentDate} onChange={(e) => setClaimForm({ ...claimForm, incidentDate: e.target.value })} /></div>
            <div><Label>Claimed Amount (Rs)</Label><Input type="number" value={claimForm.claimedAmount} onChange={(e) => setClaimForm({ ...claimForm, claimedAmount: e.target.value })} /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={claimForm.description} onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClaimModal(false)}>Cancel</Button>
            <Button onClick={submitClaim} disabled={saving || !claimForm.vehicleId || !claimForm.claimNo || !claimForm.insurer}>
              {saving ? 'Saving...' : 'Create Claim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vehicle dialog */}
      <Dialog open={showVehicleModal} onOpenChange={setShowVehicleModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Vehicle to Fleet</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Registration No *</Label><Input value={vehicleForm.registrationNo} onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNo: e.target.value })} /></div>
            <div><Label>Class</Label>
              <select className={selectCls} value={vehicleForm.vehicleClass} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleClass: e.target.value })}>
                {VEHICLE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Make *</Label><Input value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} /></div>
            <div><Label>Model *</Label><Input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} /></div>
            <div><Label>Year</Label><Input type="number" value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} /></div>
            <div><Label>Seats</Label><Input type="number" value={vehicleForm.seats} onChange={(e) => setVehicleForm({ ...vehicleForm, seats: e.target.value })} /></div>
            <div><Label>Fuel Type</Label><Input value={vehicleForm.fuelType} onChange={(e) => setVehicleForm({ ...vehicleForm, fuelType: e.target.value })} /></div>
            <div><Label>Transmission</Label><Input value={vehicleForm.transmission} onChange={(e) => setVehicleForm({ ...vehicleForm, transmission: e.target.value })} /></div>
            <div><Label>Current Odometer (km)</Label><Input type="number" value={vehicleForm.currentOdometer} onChange={(e) => setVehicleForm({ ...vehicleForm, currentOdometer: e.target.value })} /></div>
            <div><Label>Insurance Expiry</Label><Input type="date" value={vehicleForm.insuranceExpiry} onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceExpiry: e.target.value })} /></div>
            <div><Label>Revenue License Expiry</Label><Input type="date" value={vehicleForm.licenseExpiry} onChange={(e) => setVehicleForm({ ...vehicleForm, licenseExpiry: e.target.value })} /></div>
            <div><Label>Emission Test Expiry</Label><Input type="date" value={vehicleForm.emissionTestExpiry} onChange={(e) => setVehicleForm({ ...vehicleForm, emissionTestExpiry: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Features</Label>
              <div className="grid grid-cols-3 gap-1 mt-1 border rounded-md p-2">
                {VEHICLE_FEATURES.map((f) => (
                  <label key={f} className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={(vehicleForm.features ?? []).includes(f)}
                      onChange={() => setVehicleForm((prev: any) => ({
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVehicleModal(false)}>Cancel</Button>
            <Button onClick={submitVehicle} disabled={saving || !vehicleForm.registrationNo || !vehicleForm.make || !vehicleForm.model}>
              {saving ? 'Saving...' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Booking dialog */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Rental Booking</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
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
            <div><Label>Start *</Label><Input type="datetime-local" value={bookingForm.startAt} onChange={(e) => setBookingForm({ ...bookingForm, startAt: e.target.value })} /></div>
            <div><Label>End *</Label><Input type="datetime-local" value={bookingForm.endAt} onChange={(e) => setBookingForm({ ...bookingForm, endAt: e.target.value })} /></div>
            <div><Label>Base Amount (Rs)</Label><Input type="number" value={bookingForm.baseAmount} onChange={(e) => setBookingForm({ ...bookingForm, baseAmount: e.target.value })} /></div>
            <div><Label>Deposit (Rs)</Label><Input type="number" value={bookingForm.depositAmount} onChange={(e) => setBookingForm({ ...bookingForm, depositAmount: e.target.value })} /></div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="withDriver" checked={bookingForm.withDriver} onChange={(e) => setBookingForm({ ...bookingForm, withDriver: e.target.checked })} />
              <Label htmlFor="withDriver">With driver</Label>
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
                <p>Base ({quote.days} day{quote.days > 1 ? 's' : ''} × Rs {Number(quote.dayRate).toLocaleString()}): <b>Rs {Number(quote.baseAmount).toLocaleString()}</b></p>
                {(quote.pricingAdjustments ?? []).map((a: any) => (
                  <p key={a.name} className="text-xs text-blue-700">↳ {a.name} ({a.ruleType}): +Rs {Number(a.amount).toLocaleString()}</p>
                ))}
                {quote.extrasAmount > 0 && <p>Extras: Rs {Number(quote.extrasAmount).toLocaleString()}</p>}
                {quote.discountAmount > 0 && <p className="text-green-700">Coupon {quote.coupon?.code}: −Rs {Number(quote.discountAmount).toLocaleString()}</p>}
                <p className="font-bold mt-1">TOTAL: Rs {Number(quote.totalAmount).toLocaleString()} {quote.depositAmount > 0 && <span className="font-normal text-xs">(+ deposit Rs {Number(quote.depositAmount).toLocaleString()})</span>}</p>
              </div>
            )}
          </div>
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
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {conditionTarget?.action === 'checkout' ? 'Vehicle Check-Out (Handover)' : 'Vehicle Check-In (Return)'} — {conditionTarget?.booking?.bookingNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Odometer (km)</Label><Input type="number" value={conditionForm.odometer} onChange={(e) => setConditionForm({ ...conditionForm, odometer: e.target.value })} /></div>
              <div><Label>Fuel Level</Label>
                <select className={selectCls} value={conditionForm.fuelLevel} onChange={(e) => setConditionForm({ ...conditionForm, fuelLevel: e.target.value })}>
                  <option value="">Select</option>
                  {['FULL', '3/4', '1/2', '1/4', 'EMPTY'].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Notes / Damage remarks</Label><Input value={conditionForm.notes} onChange={(e) => setConditionForm({ ...conditionForm, notes: e.target.value })} /></div>
            <div><Label>Payment collected now (Rs)</Label><Input type="number" value={conditionForm.paidAmount} onChange={(e) => setConditionForm({ ...conditionForm, paidAmount: e.target.value })} /></div>
            <PhotoUploadInput
              label="Condition Photos (before/after evidence)"
              folder="condition-reports"
              photos={conditionForm.photos}
              onChange={(photos) => setConditionForm({ ...conditionForm, photos })}
            />
            <SignaturePad
              value={conditionForm.customerSignature}
              onChange={(sig) => setConditionForm({ ...conditionForm, customerSignature: sig })}
            />
          </div>
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
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader><DialogTitle>Rental Agreement</DialogTitle></DialogHeader>
          <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 rounded-md p-4 max-h-[55vh] overflow-y-auto">
            {agreementText}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgreementText(null)}>Close</Button>
            <Button variant="outline" onClick={() => agreementBookingId && rental.sendAgreement(agreementBookingId, 'SMS')}>Send SMS</Button>
            <Button variant="outline" onClick={() => agreementBookingId && rental.sendAgreement(agreementBookingId, 'WHATSAPP')}>WhatsApp</Button>
            <Button variant="outline" onClick={downloadAgreementPdf}>Download PDF</Button>
            <Button onClick={printAgreement}>Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance dialog */}
      <Dialog open={showMaintenanceModal} onOpenChange={setShowMaintenanceModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Maintenance</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Vehicle *</Label>
              <select className={selectCls} value={maintenanceForm.vehicleId} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNo} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div><Label>Title *</Label><Input value={maintenanceForm.title} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })} placeholder="e.g. 5000km service" /></div>
            <div><Label>Scheduled Date</Label><Input type="date" value={maintenanceForm.scheduledDate} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduledDate: e.target.value })} /></div>
            <div><Label>Estimated Cost (Rs)</Label><Input type="number" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} /></div>
            <div><Label>Service Provider</Label><Input value={maintenanceForm.serviceProvider} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceProvider: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintenanceModal(false)}>Cancel</Button>
            <Button onClick={submitMaintenance} disabled={saving || !maintenanceForm.vehicleId || !maintenanceForm.title}>
              {saving ? 'Saving...' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
