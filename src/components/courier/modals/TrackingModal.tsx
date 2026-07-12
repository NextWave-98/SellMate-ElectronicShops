/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import {
  Package,
  Clock,
  Truck,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
  User,
  Phone
} from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import useCourier, { type CourierShipment } from '../../../hooks/useCourier';
import useFetch from '../../../hooks/useFetch';
import { formatDate, formatDateTime } from '@/utils/dateUtils';

type Variant = 'orange' | 'blue';

/** Prefer Fardar/courier event time over local sync time for "Last Updated". */
const getShipmentLastUpdatedDisplay = (shipment: CourierShipment): string => {
  if (shipment.status === 'DELIVERED' && shipment.actualDeliveryDate) {
    return formatDateTime(shipment.actualDeliveryDate);
  }
  const fardarLastUpdate = (shipment.lastTrackingData as { last_update?: string } | undefined)
    ?.last_update;
  if (fardarLastUpdate) {
    return formatDateTime(fardarLastUpdate);
  }
  if (shipment.lastTrackedAt) {
    return formatDateTime(shipment.lastTrackedAt);
  }
  if (shipment.updatedAt) {
    return formatDateTime(shipment.updatedAt);
  }
  return '—';
};

const formatRecipientAddress = (shipment: CourierShipment) => {
  const parts = [
    shipment.recipientAddress,
    shipment.recipientCity,
    shipment.recipientDistrict,
    shipment.recipientPostalCode,
  ].filter((part) => Boolean(part && String(part).trim()));
  return parts.join(', ') || '—';
};

const extractSaleItems = (shipment: CourierShipment) => {
  const sale = shipment.sale;
  if (!sale) return [];
  return sale.saleItems || sale.items || [];
};

const getThemeClasses = (variant: Variant) => {
  if (variant === 'blue') {
    return {
      headerIcon: 'text-blue-600',
      trackingNumber: 'text-blue-600',
      summaryBg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
      summaryIcon: 'text-blue-600',
      spinnerBorder: 'border-blue-600',
      closeButton: 'bg-blue-600 hover:bg-blue-700',
    };
  }
  return {
    headerIcon: 'text-orange-600',
    trackingNumber: 'text-orange-600',
    summaryBg: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
    summaryIcon: 'text-orange-600',
    spinnerBorder: 'border-orange-600',
    closeButton: 'bg-orange-600 hover:bg-orange-700',
  };
};

const getEventIcon = (eventType: string) => {
  const iconMap: Record<string, any> = {
    'BOOKING_CREATED': Package,
    'CREATED': Package,
    'PICKUP_SCHEDULED': Clock,
    'PICKED_UP': CheckCircle,
    'AT_HUB': MapPin,
    'IN_TRANSIT': Truck,
    'OUT_FOR_DELIVERY': Truck,
    'DELIVERED': CheckCircle,
    'DELIVERY_FAILED': XCircle,
    'RETURNED': AlertCircle,
    'CANCELLED': XCircle,
    'STATUS_UPDATED': Bell,
    'UPDATED': Bell
  };
  return iconMap[eventType] || Package;
};

const getEventColor = (eventType: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'BOOKING_CREATED': { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    'CREATED': { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    'PICKUP_SCHEDULED': { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
    'PICKED_UP': { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    'AT_HUB': { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
    'IN_TRANSIT': { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    'OUT_FOR_DELIVERY': { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    'DELIVERED': { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    'DELIVERY_FAILED': { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
    'RETURNED': { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    'CANCELLED': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    'STATUS_UPDATED': { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    'UPDATED': { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' }
  };
  return colorMap[eventType] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
};

export const TrackingModal = ({
  shipment,
  onClose,
  variant = 'orange'
}: {
  shipment: CourierShipment;
  onClose: () => void;
  variant?: Variant;
}) => {
  const theme = getThemeClasses(variant);
  const { getShipmentTracking } = useCourier();
  const { fetchData } = useFetch('');
  const [trackingHistory, setTrackingHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);
  const [saleItems, setSaleItems] = React.useState<any[]>([]);
  const [loadingItems, setLoadingItems] = React.useState(false);

  React.useEffect(() => {
    const fetchTracking = async () => {
      setLoadingHistory(true);
      try {
        if (shipment.trackingHistory && shipment.trackingHistory.length > 0) {
          setTrackingHistory(shipment.trackingHistory);
        } else {
          const history = await getShipmentTracking(shipment.id as unknown as number);
          setTrackingHistory(history || []);
        }
      } catch (error) {
        console.error('Error fetching tracking history:', error);
        setTrackingHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchTracking();
  }, [shipment.id]);

  React.useEffect(() => {
    const embedded = extractSaleItems(shipment);
    if (embedded.length > 0) {
      setSaleItems(embedded);
      return;
    }
    if (!shipment.saleId) {
      setSaleItems([]);
      return;
    }

    const loadSaleItems = async () => {
      setLoadingItems(true);
      try {
        const res = await fetchData({ endpoint: `/sales/${shipment.saleId}`, method: 'GET' });
        if (res?.success && res?.data) {
          const items = (res.data as any).saleItems || (res.data as any).items || [];
          setSaleItems(items);
        } else {
          setSaleItems([]);
        }
      } catch {
        setSaleItems([]);
      } finally {
        setLoadingItems(false);
      }
    };
    loadSaleItems();
  }, [shipment.id, shipment.saleId, shipment.sale]);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(90vh,100dvh)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader>
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Package className={`w-6 h-6 ${theme.headerIcon}`} />
              Shipment Tracking
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              {shipment.trackingNumber ? (
                <span className="flex items-center gap-2">
                  <span>Tracking #</span>
                  <span className={`font-mono font-semibold ${theme.trackingNumber}`}>{shipment.trackingNumber}</span>
                </span>
              ) : (
                <span>Shipment #{shipment.shipmentNumber}</span>
              )}
            </p>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 pb-4">
          <div className={`rounded-lg p-4 border ${theme.summaryBg}`}>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className={`w-4 h-4 ${theme.summaryIcon}`} />
              Customer Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-600">Customer Name</span>
                <p className="font-semibold text-gray-900">{shipment.recipientName || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-600">Phone</span>
                <p className="font-semibold text-gray-900 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {shipment.recipientPhone || '—'}
                </p>
                {shipment.recipientPhone2 && (
                  <p className="text-sm text-gray-600 mt-0.5">{shipment.recipientPhone2}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs text-gray-600">Delivery Address</span>
                <p className="font-semibold text-gray-900 flex items-start gap-1.5 mt-0.5">
                  <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${theme.summaryIcon}`} />
                  <span>{formatRecipientAddress(shipment)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4 border border-gray-200 bg-white">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-600" />
              Products
            </h3>
            {loadingItems ? (
              <div className="flex items-center justify-center py-6">
                <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${theme.spinnerBorder}`} />
              </div>
            ) : saleItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No products linked to this shipment</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold">#</TableHead>
                      <TableHead className="text-xs font-semibold">Product</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((item: any, index: number) => (
                      <TableRow key={item.id || index}>
                        <TableCell className="text-xs text-gray-400">{index + 1}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium text-gray-900">
                            {item.product?.name || item.productName || '—'}
                          </div>
                          {(item.product?.sku || item.sku) && (
                            <div className="text-xs text-gray-400">{item.product?.sku || item.sku}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-right font-semibold">{item.quantity ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Truck className={`w-4 h-4 ${theme.summaryIcon}`} />
              Shipment Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-600">Delivery Method</span>
                <p className="font-semibold text-gray-900">{shipment.deliveryMethod}</p>
              </div>
              {shipment.weight != null && (
                <div>
                  <span className="text-xs text-gray-600">Weight</span>
                  <p className="font-semibold text-gray-900">{shipment.weight} kg</p>
                </div>
              )}
              {shipment.codEnabled && Number(shipment.codAmount) > 0 && (
                <div>
                  <span className="text-xs text-gray-600">COD Amount</span>
                  <p className="font-semibold text-green-700">Rs. {shipment.codAmount}</p>
                </div>
              )}
              {shipment.estimatedDeliveryDate && (
                <div>
                  <span className="text-xs text-gray-600">Estimated Delivery</span>
                  <p className="font-semibold text-gray-900">
                    {formatDate(shipment.estimatedDeliveryDate)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              Tracking History
            </h3>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme.spinnerBorder}`}></div>
              </div>
            ) : trackingHistory.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No tracking history available yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {trackingHistory.map((event, index) => {
                  const EventIcon = getEventIcon(event.eventType);
                  const colors = getEventColor(event.eventType);
                  const isLast = index === trackingHistory.length - 1;

                  return (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center flex-shrink-0`}>
                          <EventIcon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        {!isLast && (
                          <div className="w-0.5 h-full min-h-[40px] bg-gray-200 my-1"></div>
                        )}
                      </div>

                      <div className={`flex-1 ${!isLast ? 'pb-6' : 'pb-2'}`}>
                        <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
                          <p className="font-semibold text-gray-900">
                            {event.eventDescription || event.eventType.replace(/_/g, ' ')}
                          </p>
                          {event.location && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                          )}
                          {event.remarks && (
                            <p className="text-sm text-gray-600 mt-1 italic">
                              Note: {event.remarks}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(event.eventTimestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Status</p>
                <p className="text-lg font-bold text-gray-900">{shipment.status.replace(/_/g, ' ')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm font-semibold text-gray-900">
                  {getShipmentLastUpdatedDisplay(shipment)}
                </p>
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="border-t border-gray-200">
          <Button type="button" className={`w-full text-white font-semibold ${theme.closeButton}`} onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrackingModal;
