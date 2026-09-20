import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScanLine, CheckCircle, XCircle, Trash2, Package, Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import useCourier, {
  type BusinessCourierSettings,
  CourierShipmentStatus,
  isStaffCourierPermissionsLimited,
  STAFF_ALLOWED_COURIER_STATUSES,
} from '../../../hooks/useCourier';
import { useAppSelector } from '../../../store/hooks';
import BarcodeScannerModal from '../../common/BarcodeScannerModal';

/** A shipment collected via scanning. Fields come back snake_case from the API. */
interface ScannedShipment {
  id: string;
  shipment_number?: string;
  tracking_number?: string;
  recipient_name?: string;
  recipient_city?: string;
  status?: CourierShipmentStatus | string;
}

const STATUS_OPTIONS: { value: CourierShipmentStatus; label: string; color: string }[] = [
  { value: CourierShipmentStatus.PROCESSING, label: 'Processing', color: 'bg-slate-100 text-slate-800' },
  { value: CourierShipmentStatus.PACKAGING, label: 'Packaging Process', color: 'bg-slate-100 text-slate-800' },
  { value: CourierShipmentStatus.WAITING_COURIER_PICKUP, label: 'Waiting Courier Pickup', color: 'bg-amber-100 text-amber-800' },
  { value: CourierShipmentStatus.RELEASED_TO_COURIER, label: 'Released to Courier', color: 'bg-cyan-100 text-cyan-800' },
  { value: CourierShipmentStatus.PICKED_UP, label: 'Picked Up', color: 'bg-blue-100 text-blue-800' },
  { value: CourierShipmentStatus.IN_TRANSIT, label: 'In Transit', color: 'bg-purple-100 text-purple-800' },
  { value: CourierShipmentStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-800' },
  { value: CourierShipmentStatus.DELIVERED, label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: CourierShipmentStatus.FAILED_DELIVERY, label: 'Failed Delivery', color: 'bg-red-100 text-red-800' },
  { value: CourierShipmentStatus.RESCHEDULED, label: 'Rescheduled', color: 'bg-amber-100 text-amber-800' },
  { value: CourierShipmentStatus.DAMAGED, label: 'Damaged', color: 'bg-red-100 text-red-800' },
  { value: CourierShipmentStatus.RETURN_PENDING, label: 'Return Pending', color: 'bg-orange-100 text-orange-800' },
  { value: CourierShipmentStatus.RETURN_COMPLETE, label: 'Return Complete', color: 'bg-orange-100 text-orange-800' },
  { value: CourierShipmentStatus.RETURNED_TO_SENDER, label: 'Returned to Sender', color: 'bg-orange-100 text-orange-800' },
  { value: CourierShipmentStatus.RETURNED, label: 'Returned', color: 'bg-orange-100 text-orange-800' },
  { value: CourierShipmentStatus.RETURNED_TO_LOCATION, label: 'Returned to Location', color: 'bg-teal-100 text-teal-800' },
  { value: CourierShipmentStatus.CANCELLED, label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  { value: CourierShipmentStatus.ON_HOLD, label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' },
];

const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/**
 * Scan multiple parcels one-by-one into a list, then apply a single status to all
 * of them in one bulk update. Designed for a barcode scanner (which types the code
 * and submits Enter) but also works by typing manually or using the phone camera.
 */
export const ScanBulkStatusModal = ({
  onClose,
  onComplete,
  courierSettings: courierSettingsProp,
}: {
  onClose: () => void;
  onComplete?: () => void;
  courierSettings?: BusinessCourierSettings | null;
}) => {
  const {
    lookupShipmentByCode,
    bulkUpdateShipmentStatus,
    courierSettings: hookCourierSettings,
    fetchCourierSettings,
  } = useCourier();
  const { user } = useAppSelector((state) => state.auth);
  const effectiveSettings = courierSettingsProp ?? hookCourierSettings;

  useEffect(() => {
    if (!effectiveSettings && user?.businessId) {
      void fetchCourierSettings(user.businessId);
    }
  }, [effectiveSettings, user?.businessId, fetchCourierSettings]);

  const statusOptions = isStaffCourierPermissionsLimited(effectiveSettings, user?.role?.name)
    ? STATUS_OPTIONS.filter((o) => STAFF_ALLOWED_COURIER_STATUSES.includes(o.value))
    : STATUS_OPTIONS;

  const [scanValue, setScanValue] = useState('');
  const [scanned, setScanned] = useState<ScannedShipment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<CourierShipmentStatus>(
    CourierShipmentStatus.RELEASED_TO_COURIER,
  );
  const [remarks, setRemarks] = useState('');
  const [looking, setLooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isStaffCourierPermissionsLimited(effectiveSettings, user?.role?.name)) return;
    if (!STAFF_ALLOWED_COURIER_STATUSES.includes(selectedStatus)) {
      setSelectedStatus(STAFF_ALLOWED_COURIER_STATUSES[0]);
    }
  }, [effectiveSettings, user?.role?.name, selectedStatus]);

  const addScannedCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    setLooking(true);
    try {
      let alreadyListed = false;
      setScanned((prev) => {
        alreadyListed = prev.some((s) => s.shipment_number === code || s.tracking_number === code);
        return prev;
      });
      if (alreadyListed) {
        toast('Already in the list', { icon: 'ℹ️' });
        return;
      }

      const result = await lookupShipmentByCode(code);
      if (!result || !result.id) {
        toast.error(`Not found: ${code}`);
        return;
      }

      let duplicateId = false;
      setScanned((prev) => {
        if (prev.some((s) => s.id === result.id)) {
          duplicateId = true;
          return prev;
        }
        toast.success(`Added ${result.shipment_number || code}`);
        return [result as ScannedShipment, ...prev];
      });
      if (duplicateId) {
        toast('Already in the list', { icon: 'ℹ️' });
      }
    } finally {
      setLooking(false);
      setScanValue('');
      inputRef.current?.focus();
    }
  }, [lookupShipmentByCode]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    await addScannedCode(scanValue);
  };

  const handleCameraScan = async (value: string) => {
    await addScannedCode(value);
    setShowCameraScanner(false);
  };

  const removeOne = (id: string) => setScanned((prev) => prev.filter((s) => s.id !== id));

  const handleApply = async () => {
    if (scanned.length === 0) {
      toast.error('Scan at least one parcel first');
      return;
    }
    setSubmitting(true);
    try {
      const updates = scanned.map((s) => ({
        id: s.id,
        status: selectedStatus,
        remarks: remarks || undefined,
      }));
      const res = await bulkUpdateShipmentStatus(updates);
      if (res?.success) {
        toast.success(`Updated ${scanned.length} shipment${scanned.length > 1 ? 's' : ''}`);
        onComplete?.();
        onClose();
      } else {
        toast.error('Bulk update failed');
      }
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-6 h-6 text-blue-600" />
              Scan &amp; Bulk Update
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Scan parcels one by one, then apply a status to all of them.
            </p>
          </DialogHeader>

          <div className="p-6 space-y-5">
            {/* Scan input */}
            <form onSubmit={handleScan}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scan / enter tracking, waybill or shipment number
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  placeholder="Scan a barcode or type a number, then press Enter"
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCameraScanner(true)}
                  className="px-3"
                  title="Open camera scanner"
                >
                  <Camera className="w-4 h-4" />
                </Button>
                <Button type="submit" disabled={looking || !scanValue.trim()}>
                  {looking ? 'Looking…' : 'Add'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                On mobile, tap the camera button to scan with your phone.
              </p>
            </form>

            {/* Scanned list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Scanned ({scanned.length})
                </span>
                {scanned.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setScanned([])}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {scanned.length === 0 ? (
                <div className="text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg py-6">
                  <Package className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  No parcels scanned yet
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {scanned.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          #{s.shipment_number || s.tracking_number}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {s.recipient_name || ' '}
                          {s.status ? ` · ${String(s.status).replace(/_/g, ' ')}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOne(s.id)}
                        className="text-gray-400 hover:text-red-600 flex-shrink-0"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Set status to</label>
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedStatus(option.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedStatus === option.value
                        ? `${option.color} ring-2 ring-offset-1 ring-blue-500`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Applied to all scanned shipments"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                <XCircle className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button type="button" onClick={handleApply} disabled={submitting || scanned.length === 0}>
                <CheckCircle className="w-4 h-4 mr-1" />
                {submitting ? 'Updating…' : `Update ${scanned.length || ''} ${scanned.length === 1 ? 'parcel' : 'parcels'}`.trim()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BarcodeScannerModal
        open={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleCameraScan}
        title="Scan Parcel"
        defaultMode={isMobileDevice() ? 'camera' : 'keyboard'}
      />
    </>
  );
};

export default ScanBulkStatusModal;
