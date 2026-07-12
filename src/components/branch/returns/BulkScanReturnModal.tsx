/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { ScanLine, Trash2, Package, AlertTriangle, PackageCheck, Truck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import useFetch from '../../../hooks/useFetch';
import useBarcode from '../../../hooks/useBarcode';
import { useLocation } from '../../../hooks/useLocation';
import BarcodeScannerModal from '../../common/BarcodeScannerModal';

interface ScannedItem {
  productId: string;
  productName: string;
  productCode?: string;
  quantity: number;
  isDamaged: boolean;
  unitPrice?: number;
}

interface BulkScanReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  createdById?: string;
  /** Pre-selected branch; when set, the branch picker is hidden. */
  locationId?: string;
}

export default function BulkScanReturnModal({
  isOpen,
  onClose,
  onSuccess,
  createdById,
  locationId,
}: BulkScanReturnModalProps) {
  const [branches, setBranches] = useState<{ id: string; name: string; locationCode: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(locationId || '');
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [scanAsDamaged, setScanAsDamaged] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  // Shipment / sale lookup
  const [lookupInput, setLookupInput] = useState('');
  const [looking, setLooking] = useState(false);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [saleNumber, setSaleNumber] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showLabelScanner, setShowLabelScanner] = useState(false);

  const { fetchData: bulkFetch } = useFetch();
  const { fetchData: lookupFetch } = useFetch();
  const { scanProduct } = useBarcode();
  const { getBranches } = useLocation();

  useEffect(() => {
    if (!isOpen) return;
    setSelectedLocationId(locationId || '');
    setItems([]);
    setScanInput('');
    setScanAsDamaged(false);
    setReason('');
    setLookupInput('');
    setSaleId(null);
    setSaleNumber('');
    setCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setTrackingNumber('');

    getBranches().then((res: any) => {
      if (!res) return;
      if (res?.success && Array.isArray(res.data)) {
        setBranches(res.data.map((l: any) => ({ id: l.id, name: l.name, locationCode: l.locationCode || '' })));
      } else if (Array.isArray(res?.data?.locations)) {
        setBranches(res.data.locations.map((l: any) => ({ id: l.id, name: l.name, locationCode: l.locationCode || '' })));
      } else if (Array.isArray(res?.locations)) {
        setBranches(res.locations.map((l: any) => ({ id: l.id, name: l.name, locationCode: l.locationCode || '' })));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const addScannedProduct = (scanned: any, damaged: boolean) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === scanned.productId && it.isDamaged === damaged);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: scanned.productId,
          productName: scanned.name,
          productCode: scanned.productCode,
          quantity: 1,
          isDamaged: damaged,
          unitPrice: scanned.unitPrice && scanned.unitPrice > 0 ? scanned.unitPrice : undefined,
        },
      ];
    });
  };

  // Look up a courier shipment (tracking/shipment number) or sale number and pull in all its products
  const handleLookup = async (value?: string) => {
    const v = (value ?? lookupInput).trim();
    if (!v) {
      toast.error('Enter a tracking, shipment, or sale number');
      return;
    }
    setLooking(true);
    try {
      let sale: any = null;
      let shipment: any = null;

      // 1) Shipment lookup — matches tracking number, shipment number (SHP-…), or AWB
      const trackRes = await lookupFetch({
        method: 'GET',
        silent: true,
        showToastOnError: false,
        endpoint: `/courier/shipments/tracking/${encodeURIComponent(v)}`,
      });
      shipment = trackRes?.success ? trackRes.data : null;

      if (shipment) {
        sale = shipment.sale || null;
        const saleIdFromShipment = shipment.saleId || shipment.sale_id || null;
        if (!sale && saleIdFromShipment) {
          const saleRes = await lookupFetch({
            method: 'GET',
            silent: true,
            showToastOnError: false,
            endpoint: `/sales/${saleIdFromShipment}`,
          });
          sale = saleRes?.success ? saleRes.data : null;
        }
      }

      // 2) Search by sale number (GET — POST /sales/pos creates a sale, not search)
      if (!sale) {
        const searchRes = await lookupFetch({
          method: 'GET',
          silent: true,
          showToastOnError: false,
          endpoint: '/sales/pos',
          data: { search: v, limit: 5 },
        });
        const list = (searchRes as any)?.data?.data;
        if (Array.isArray(list) && list.length > 0) sale = list[0];
      }

      if (!sale) {
        if (shipment) {
          toast.error('Shipment found but has no linked sale — cannot load products');
        } else {
          toast.error('No shipment or sale found for that number');
        }
        return;
      }

      const saleItems: any[] = sale.saleItems || sale.items || [];
      const newItems: ScannedItem[] = saleItems
        .map((it: any) => ({
          productId: it.productId || it.product_id || it.product?.id,
          productName: it.productName || it.product?.name || 'Product',
          productCode: it.product?.productCode,
          quantity: Number(it.quantity || 1),
          isDamaged: false,
          unitPrice: Number(it.unit_price ?? it.unitPrice ?? 0) || undefined,
        }))
        .filter((x: ScannedItem) => !!x.productId);

      if (newItems.length === 0) {
        toast.error('No products found on that order');
        return;
      }

      setItems(newItems);
      setSaleId(sale.id);
      setSaleNumber(sale.saleNumber || '');
      setCustomerId(sale.customerId || sale.customer?.id || null);
      setCustomerName(sale.customerName || sale.customer?.name || shipment?.recipientName || shipment?.recipient_name || '');
      setCustomerPhone(sale.customerPhone || sale.customer?.phone || shipment?.recipientPhone || shipment?.recipient_phone || '');
      setTrackingNumber(
        shipment?.trackingNumber ||
        shipment?.tracking_number ||
        sale.shipment?.trackingNumber ||
        sale.shipment?.tracking_number ||
        (trackRes?.success ? v : '')
      );
      if (!locationId && sale.location?.id) setSelectedLocationId(sale.location.id);
      const loadedFrom = shipment?.shipmentNumber || shipment?.shipment_number || sale.saleNumber || 'order';
      toast.success(`Loaded ${newItems.length} product(s) from ${loadedFrom}`);
    } catch (err) {
      console.error('Shipment/sale lookup failed:', err);
      toast.error('Lookup failed');
    } finally {
      setLooking(false);
    }
  };

  const handleScanValue = async (value: string) => {
    const v = value.trim();
    if (!v) return;
    const scanned = await scanProduct(v, false);
    if (!scanned || !scanned.productId) {
      toast.error(`No product found for: ${v}`);
      return;
    }
    addScannedProduct(scanned, scanAsDamaged);
    toast.success(`${scanAsDamaged ? 'Damaged: ' : ''}${scanned.name}`);
    setScanInput('');
  };

  const updateQty = (index: number, qty: number) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: Math.max(1, qty) } : it)));
  };

  const toggleDamaged = (index: number) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, isDamaged: !it.isDamaged } : it)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const goodCount = items.filter((i) => !i.isDamaged).reduce((a, i) => a + i.quantity, 0);
  const damagedCount = items.filter((i) => i.isDamaged).reduce((a, i) => a + i.quantity, 0);

  const handleConfirm = async () => {
    if (!selectedLocationId) {
      toast.error('Select a branch to return to');
      return;
    }
    if (items.length === 0) {
      toast.error('Scan at least one product');
      return;
    }
    if (!createdById) {
      toast.error('User not identified');
      return;
    }

    setSubmitting(true);
    try {
      const res = await bulkFetch({
        method: 'POST',
        endpoint: '/returns/bulk-scan',
        data: {
          locationId: selectedLocationId,
          returnReason: reason.trim() || undefined,
          createdById,
          ...(saleId && { sourceType: 'SALE', sourceId: saleId }),
          ...(customerId && { customerId }),
          ...(customerName && { customerName }),
          ...(customerPhone && { customerPhone }),
          ...(trackingNumber && { courierTrackingNumber: trackingNumber }),
          items: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            isDamaged: it.isDamaged,
            productValue: it.unitPrice,
          })),
        },
      });

      if (res?.success) {
        toast.success(res?.message || 'Return processed');
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error('Bulk scan return failed:', err);
      toast.error('Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="!max-w-3xl max-h-[90vh] !overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-orange-600" />
              Bulk Scan Return
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 p-1">
            {/* Branch */}
            {!locationId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return to Branch *</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">-- Select Branch --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}{b.locationCode ? ` (${b.locationCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Auto-fill from courier shipment / sale */}
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-900">
                <Truck className="w-4 h-4" />
                Auto-fill from Shipment / Sale
                <span className="text-xs font-normal text-sky-600">(Optional)</span>
              </h3>
              <p className="text-xs text-sky-700">Scan a courier label or enter a tracking / shipment (SHP-…) / sale number to load all the order's products.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                  placeholder="Tracking, shipment (SHP-…), or sale number"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleLookup()}
                  disabled={looking}
                  className="px-4 py-2 bg-sky-600 text-white text-sm rounded-md hover:bg-sky-700 disabled:opacity-50"
                >
                  {looking ? 'Looking up…' : 'Lookup'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLabelScanner(true)}
                  title="Scan courier label"
                  className="px-3 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700"
                >
                  <ScanLine className="w-4 h-4" />
                </button>
              </div>
              {saleId && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1">
                  ✓ Linked to sale {saleNumber || saleId}. On confirm, its status updates (fully returned → Refunded).
                </p>
              )}
            </div>

            {/* Scan input */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-orange-900">
                <input
                  type="checkbox"
                  checked={scanAsDamaged}
                  onChange={(e) => setScanAsDamaged(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400"
                />
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Damaged parcel — scan items as damaged (won't restock)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleScanValue(scanInput); } }}
                  placeholder="Scan or type barcode, then press Enter"
                  autoFocus
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  title="Scan with camera"
                  className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  <ScanLine className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                <div className="col-span-5">Product</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3 text-center">Damaged</div>
                <div className="col-span-2 text-right">Remove</div>
              </div>
              {items.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                  <Package className="w-6 h-6" />
                  No items scanned yet
                </div>
              ) : (
                items.map((it, index) => (
                  <div key={`${it.productId}-${index}`} className={`grid grid-cols-12 gap-2 items-center px-3 py-2 border-t border-gray-100 ${it.isDamaged ? 'bg-red-50' : ''}`}>
                    <div className="col-span-5 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{it.productName}</p>
                      {it.productCode && <p className="text-xs text-gray-400">{it.productCode}</p>}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => updateQty(index, parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                    </div>
                    <div className="col-span-3 flex justify-center">
                      <input
                        type="checkbox"
                        checked={it.isDamaged}
                        onChange={() => toggleDamaged(index)}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button type="button" onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary */}
            {items.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1 text-green-700">
                  <PackageCheck className="w-4 h-4" /> Restock: <strong>{goodCount}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-red-700">
                  <AlertTriangle className="w-4 h-4" /> Damaged: <strong>{damagedCount}</strong>
                </span>
              </div>
            )}

            {/* Reason (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Optional note for this return"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || items.length === 0}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {submitting ? 'Processing…' : 'Confirm Return & Restock'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(value: string) => { setShowScanner(false); handleScanValue(value); }}
        title="Scan Product Barcode"
      />

      <BarcodeScannerModal
        open={showLabelScanner}
        onClose={() => setShowLabelScanner(false)}
        onScan={(value: string) => { setShowLabelScanner(false); setLookupInput(value); handleLookup(value); }}
        title="Scan Courier Label"
      />
    </>
  );
}
