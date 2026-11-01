import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Truck } from 'lucide-react';
import useCourier, { type BusinessCourierPreference } from '../../../hooks/useCourier';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type VehicleType = 'Bike' | 'Three wheel' | 'Lorry';

interface KoombiyoPickupDefaults {
  pickup_address?: string;
  phone?: string;
  latitude?: number | string;
  longitude?: number | string;
  vehicleType?: VehicleType;
}

interface KoombiyoPickupModalProps {
  open: boolean;
  onClose: () => void;
  courierServiceId?: string;
  businessPreferences?: BusinessCourierPreference[];
  onSuccess?: () => void;
}

export function KoombiyoPickupModal({
  open,
  onClose,
  courierServiceId,
  businessPreferences,
  onSuccess,
}: KoombiyoPickupModalProps) {
  const { createKoombiyoPickup } = useCourier();
  const [saving, setSaving] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>('Bike');
  const [pickupAddress, setPickupAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [qty, setQty] = useState('1');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [pickupRemark, setPickupRemark] = useState('-');

  useEffect(() => {
    if (!open || !courierServiceId) return;
    const existing = businessPreferences?.find((p) => p.courierServiceId === courierServiceId);
    const pickup = (existing?.customConfig?.additionalConfig?.pickup || {}) as KoombiyoPickupDefaults;
    setVehicleType(pickup.vehicleType || 'Bike');
    setPickupAddress(pickup.pickup_address || '');
    setPhone(pickup.phone || '');
    setLatitude(pickup.latitude != null ? String(pickup.latitude) : '');
    setLongitude(pickup.longitude != null ? String(pickup.longitude) : '');
    setQty('1');
    setPickupRemark('-');
  }, [open, courierServiceId, businessPreferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupAddress.trim() || !phone.trim()) {
      toast.error('Pickup address and phone are required');
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    const parcelQty = Number(qty);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Valid latitude and longitude are required');
      return;
    }
    if (!Number.isFinite(parcelQty) || parcelQty < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    setSaving(true);
    try {
      const result = await createKoombiyoPickup({
        courierServiceId,
        vehicleType,
        pickupAddress: pickupAddress.trim(),
        phone: phone.trim(),
        qty: parcelQty,
        latitude: lat,
        longitude: lng,
        pickupRemark: pickupRemark.trim() || '-',
      });
      if (!result) {
        toast.error('Failed to book Koombiyo pickup');
        return;
      }
      toast.success('Koombiyo pickup request sent');
      onSuccess?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600" />
            Book Koombiyo Pickup
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1">Vehicle type</Label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="Bike">Bike</option>
              <option value="Three wheel">Three wheel</option>
              <option value="Lorry">Lorry</option>
            </select>
          </div>
          <div>
            <Label className="mb-1">Pickup address *</Label>
            <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1">Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label className="mb-1">Parcel qty *</Label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1">Latitude *</Label>
              <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="6.872916" required />
            </div>
            <div>
              <Label className="mb-1">Longitude *</Label>
              <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="79.888634" required />
            </div>
          </div>
          <div>
            <Label className="mb-1">Remark</Label>
            <Input value={pickupRemark} onChange={(e) => setPickupRemark(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Sending...' : 'Request Pickup'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
