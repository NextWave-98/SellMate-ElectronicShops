import React, { useState, useEffect } from 'react';
import { Edit, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  type CourierShipment,
  type BusinessCourierSettings,
  CourierShipmentStatus,
  isStaffCourierPermissionsLimited,
  STAFF_ALLOWED_COURIER_STATUSES,
} from '../../../hooks/useCourier';
import useCourier from '../../../hooks/useCourier';
import { useAppSelector } from '../../../store/hooks';

export const StatusUpdateModal = ({
  shipment,
  onClose,
  onSave,
  courierSettings: courierSettingsProp,
}: {
  shipment: CourierShipment;
  onClose: () => void;
  onSave: (status: CourierShipmentStatus, remarks?: string) => Promise<void>;
  courierSettings?: BusinessCourierSettings | null;
}) => {
  const { courierSettings: hookCourierSettings, fetchCourierSettings } = useCourier();
  const { user } = useAppSelector((state) => state.auth);
  const effectiveSettings = courierSettingsProp ?? hookCourierSettings;

  useEffect(() => {
    if (!effectiveSettings && user?.businessId) {
      void fetchCourierSettings(user.businessId);
    }
  }, [effectiveSettings, user?.businessId, fetchCourierSettings]);

  const [selectedStatus, setSelectedStatus] = useState<CourierShipmentStatus>(shipment.status);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: CourierShipmentStatus.PROCESSING, label: 'Processing', color: 'bg-slate-100 text-slate-800' },
    { value: CourierShipmentStatus.PACKAGING, label: 'Packaging Process', color: 'bg-slate-100 text-slate-800' },
    { value: CourierShipmentStatus.WAITING_COURIER_PICKUP, label: 'Waiting Courier Pickup', color: 'bg-amber-100 text-amber-800' },
    { value: CourierShipmentStatus.RELEASED_TO_COURIER, label: 'Released to Courier', color: 'bg-cyan-100 text-cyan-800' },
    { value: CourierShipmentStatus.PENDING, label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: CourierShipmentStatus.PENDING_PICKUP, label: 'Pending Pickup', color: 'bg-yellow-100 text-yellow-800' },
    { value: CourierShipmentStatus.PICKED_UP, label: 'Picked Up', color: 'bg-blue-100 text-blue-800' },
    { value: CourierShipmentStatus.IN_TRANSIT, label: 'In Transit', color: 'bg-purple-100 text-purple-800' },
    { value: CourierShipmentStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-800' },
    { value: CourierShipmentStatus.DELIVERED, label: 'Delivered', color: 'bg-green-100 text-green-800' },
    { value: CourierShipmentStatus.FAILED_DELIVERY, label: 'Failed Delivery', color: 'bg-red-100 text-red-800' },
    { value: CourierShipmentStatus.DELIVERY_FAILED, label: 'Delivery Failed', color: 'bg-red-100 text-red-800' },
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

  const RETURNED_FAMILY = [
    CourierShipmentStatus.RETURNED,
    CourierShipmentStatus.RETURNED_TO_SENDER,
    CourierShipmentStatus.RETURN_PENDING,
    CourierShipmentStatus.RETURN_COMPLETE,
  ];
  const FULLY_TERMINAL = [
    CourierShipmentStatus.RETURNED_TO_LOCATION,
    CourierShipmentStatus.CANCELLED,
  ];
  const isReturnedFamily = RETURNED_FAMILY.includes(shipment.status);
  const isTerminal = FULLY_TERMINAL.includes(shipment.status);
  const visibleOptions = (() => {
    let options = isReturnedFamily
      ? statusOptions.filter(
          (o) =>
            o.value === CourierShipmentStatus.RETURNED_TO_LOCATION ||
            o.value === CourierShipmentStatus.CANCELLED,
        )
      : statusOptions;

    if (isStaffCourierPermissionsLimited(effectiveSettings, user?.role?.name)) {
      options = options.filter((o) => STAFF_ALLOWED_COURIER_STATUSES.includes(o.value));
    }
    return options;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(selectedStatus, remarks || undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-6 h-6 text-blue-600" />
            Update Shipment Status
          </DialogTitle>
          <p className="text-sm text-gray-600">Shipment #{shipment.shipmentNumber}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {isTerminal ? (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
              This shipment is <span className="font-semibold">{String(shipment.status).replace(/_/g, ' ').toLowerCase()}</span> and
              can no longer be changed.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Status
              </label>
              {isReturnedFamily && (
                <p className="text-xs text-amber-600 mb-2">
                  Courier marked this as returned. It can only be set to “Returned to Location” (scan-in restocks
                  inventory) or “Cancelled”.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {visibleOptions.map((option) => (
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
          )}

          {!isTerminal && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Add any notes about this status change..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            {!isTerminal && (
              <Button type="submit" disabled={loading}>
                <CheckCircle className="w-4 h-4 mr-1" />
                {loading ? 'Updating…' : 'Update Status'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StatusUpdateModal;
