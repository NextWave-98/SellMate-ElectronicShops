/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, MapPin, Loader2, AlertCircle, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useProductUsage,
  type CreateProductUsagePayload,
  type UsageType,
  type LossBucket,
  defaultLossBucket,
  ALREADY_COUNTED_TYPES,
} from '../../../hooks/useProductUsage';
import { useInventory } from '../../../hooks/useInventory';
import useBarcode, { type ScannedProduct } from '../../../hooks/useBarcode';
import BarcodeScannerModal from '../../common/BarcodeScannerModal';
import BarcodeProductSelectModal from '../../common/BarcodeProductSelectModal';

interface Location {
  id: string;
  name: string;
  locationCode: string;
  locationType: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  availableQuantity: number;
  product?: {
    id: string;
    name: string;
    productCode: string;
    sku: string;
    primaryImage?: string;
    costPrice?: number;
  };
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
}

function parseInventoryItems(apiData: any): InventoryItem[] {
  if (!apiData) return [];
  if (Array.isArray(apiData?.inventory)) return apiData.inventory;
  if (Array.isArray(apiData)) return apiData;
  if (Array.isArray(apiData?.data?.inventory)) return apiData.data.inventory;
  if (Array.isArray(apiData?.data)) return apiData.data;
  if (Array.isArray(apiData?.items)) return apiData.items;
  return [];
}

interface LogProductUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill from inventory row click */
  inventoryItem?: InventoryItem | null;
  /** Available locations */
  locations: Location[];
  onSuccess?: () => void;
}

/**
 * Grouped by what the entry does to the books, because that is the decision the
 * person logging it is actually making:
 *
 *   LOSS      the goods are gone and nothing was earned -> cost of goods sold,
 *             so gross profit drops.
 *   INTERNAL  the business used its own stock -> operating expense, only net
 *             profit drops.
 *   COSTED    already priced into a job sheet or a sale. Logged for traceability
 *             but never counted again, or the same cost is charged twice.
 *   NEUTRAL   only the person logging it knows   they choose below.
 */
type UsageGroup = 'LOSS' | 'INTERNAL' | 'COSTED' | 'NEUTRAL';

const USAGE_TYPE_OPTIONS: {
  value: UsageType;
  label: string;
  description: string;
  group: UsageGroup;
}[] = [
  { value: 'DAMAGED',   label: 'Damaged',            description: 'Broken, dented or unsellable', group: 'LOSS' },
  { value: 'EXPIRED',   label: 'Expired',            description: 'Past its usable or sell-by date', group: 'LOSS' },
  { value: 'LOST',      label: 'Lost',               description: 'Missing at stock count, unaccounted for', group: 'LOSS' },
  { value: 'THEFT',     label: 'Theft',              description: 'Shoplifting or internal theft', group: 'LOSS' },
  { value: 'WRITE_OFF', label: 'Write-off',          description: 'Deliberately written off the books', group: 'LOSS' },
  { value: 'INTERNAL',  label: 'Internal Use',       description: 'Office supplies, packaging, operations', group: 'INTERNAL' },
  { value: 'DEMO',      label: 'Demo / Display',     description: 'Showroom or demonstration unit', group: 'INTERNAL' },
  { value: 'SAMPLE',    label: 'Sample / Giveaway',  description: 'Given to a customer free of charge', group: 'INTERNAL' },
  { value: 'JOB_SHEET', label: 'Job Sheet',          description: 'Used during a repair job', group: 'COSTED' },
  { value: 'REPAIR',    label: 'Repair',             description: 'Used in repair/service', group: 'COSTED' },
  { value: 'MANUAL',    label: 'Manual Usage',       description: 'General manual deduction', group: 'NEUTRAL' },
  { value: 'OTHER',     label: 'Other',              description: 'Any other reason', group: 'NEUTRAL' },
];

const GROUP_LABELS: Record<UsageGroup, string> = {
  LOSS: 'Stock loss   reduces gross profit',
  INTERNAL: 'Internal use   operating expense',
  COSTED: 'Already costed elsewhere',
  NEUTRAL: 'Other',
};

const money = (v: number) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0);

/** Today as yyyy-mm-dd for the date input's max attribute. */
const todayISO = () => new Date().toISOString().split('T')[0];

export default function LogProductUsageModal({
  isOpen,
  onClose,
  inventoryItem,
  locations,
  onSuccess,
}: LogProductUsageModalProps) {
  const { logUsage, loading } = useProductUsage();
  const { getAllInventory } = useInventory();
  const { scanProduct, scanning } = useBarcode();

  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showBarcodeSelect, setShowBarcodeSelect] = useState(false);
  const [barcodeMatches, setBarcodeMatches] = useState<ScannedProduct[]>([]);
  const [lastScannedValue, setLastScannedValue] = useState('');
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [usageType, setUsageType] = useState<UsageType>('INTERNAL');
  const [reason, setReason] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  // Stock-loss accounting
  const [occurredOn, setOccurredOn] = useState(todayISO());
  const [recoveredAmount, setRecoveredAmount] = useState(0);
  const [manualBucket, setManualBucket] = useState<LossBucket | ''>('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const searchRequestId = useRef(0);
  const getAllInventoryRef = useRef(getAllInventory);
  getAllInventoryRef.current = getAllInventory;

  // Debounced backend search   only depends on productSearch/isOpen to avoid API loops
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = productSearch.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      const requestId = ++searchRequestId.current;
      setSearchLoading(true);

      void (async () => {
        try {
          const invRes = await getAllInventoryRef.current({
            search: trimmed,
            limit: 50,
            availableOnly: true,
          });
          if (requestId !== searchRequestId.current) return;
          setSearchResults(parseInventoryItems(invRes?.data));
        } catch {
          if (requestId === searchRequestId.current) setSearchResults([]);
        } finally {
          if (requestId === searchRequestId.current) setSearchLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [productSearch, isOpen]);

  // Pre-fill when opened from inventory row
  useEffect(() => {
    if (inventoryItem && isOpen) {
      setSelectedInventory(inventoryItem);
      setLocationId(inventoryItem.locationId);
      setProductSearch(inventoryItem.product?.name ?? '');
      setProductDropdownOpen(false);
    }
  }, [inventoryItem, isOpen]);

  // Reset when closed
  const handleClose = () => {
    setProductSearch('');
    setSearchResults([]);
    setSearchLoading(false);
    searchRequestId.current += 1;
    setSelectedInventory(null);
    setLocationId('');
    setQuantity(1);
    setUsageType('INTERNAL');
    setReason('');
    setReferenceNumber('');
    setNotes('');
    setOccurredOn(todayISO());
    setRecoveredAmount(0);
    setManualBucket('');
    setError('');
    setShowScanner(false);
    setShowBarcodeSelect(false);
    setBarcodeMatches([]);
    setLastScannedValue('');
    onClose();
  };

  const searchQuery = productSearch.trim();
  const filteredItems = searchQuery ? searchResults : [];

  // When product selected, also auto-set location if only one option
  const handleSelectInventoryItem = (item: InventoryItem) => {
    setSelectedInventory(item);
    setLocationId(item.locationId);
    setProductSearch(item.product?.name ?? '');
    setProductDropdownOpen(false);
  };

  const applyInventoryMatches = (items: InventoryItem[], label?: string) => {
    const available = items.filter((i) => i.availableQuantity > 0);
    if (available.length === 0) {
      toast.error(label ? `${label} has no available stock` : 'No available stock found');
      return;
    }
    if (available.length === 1) {
      handleSelectInventoryItem(available[0]);
      toast.success(`Selected: ${available[0].product?.name}`);
      return;
    }
    setProductSearch(label ?? productSearch);
    setSearchResults(available);
    setProductDropdownOpen(true);
    toast.success(`${available.length} locations found   select one`);
  };

  const loadInventoryForProduct = async (productId: string, label?: string) => {
    const invRes = await getAllInventoryRef.current({
      productId,
      availableOnly: true,
      limit: 50,
    });
    applyInventoryMatches(parseInventoryItems(invRes?.data), label);
  };

  const handleBarcodeScan = async (value: string) => {
    setShowScanner(false);
    const trimmed = value.trim();
    if (!trimmed) return;

    setSelectedInventory(null);
    setProductSearch(trimmed);
    setProductDropdownOpen(true);

    try {
      const invRes = await getAllInventoryRef.current({
        search: trimmed,
        availableOnly: true,
        limit: 50,
      });
      const directMatches = parseInventoryItems(invRes?.data).filter((i) => i.availableQuantity > 0);
      if (directMatches.length > 0) {
        applyInventoryMatches(directMatches);
        return;
      }

      const scanned = await scanProduct(trimmed, false);
      if (!scanned || scanned.length === 0) {
        toast.error(`No product found for: ${trimmed}`);
        setSearchResults([]);
        return;
      }

      const availableScanned = scanned.filter((m) => m.isService || (m.stock ?? 0) > 0);
      if (availableScanned.length === 0) {
        toast.error(`Products are out of stock for: ${trimmed}`);
        return;
      }

      if (availableScanned.length > 1) {
        setLastScannedValue(trimmed);
        setBarcodeMatches(availableScanned);
        setShowBarcodeSelect(true);
        return;
      }

      await loadInventoryForProduct(
        availableScanned[0].productId || availableScanned[0].id,
        availableScanned[0].name,
      );
    } catch {
      toast.error('Barcode scan failed');
    }
  };

  const handleBarcodeProductSelect = async (scanned: ScannedProduct) => {
    setShowBarcodeSelect(false);
    setBarcodeMatches([]);
    await loadInventoryForProduct(scanned.productId || scanned.id, scanned.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedInventory) { setError('Please select a product'); return; }
    if (!locationId) { setError('Please select a location'); return; }
    if (quantity <= 0) { setError('Quantity must be at least 1'); return; }
    if (!reason.trim()) { setError('Please enter a reason'); return; }

    const available = selectedInventory.availableQuantity;
    if (quantity > available) {
      setError(`Only ${available} unit(s) available at this location`);
      return;
    }

    if (recoveredAmount > grossCost) {
      setError('Recovered amount cannot be more than the cost of the goods');
      return;
    }

    const payload: CreateProductUsagePayload = {
      productId: selectedInventory.productId,
      locationId,
      quantity,
      usageType,
      reason: reason.trim(),
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      // Back-date so a write-off entered late still lands in the month it happened.
      occurredAt: new Date(`${occurredOn}T12:00:00`).toISOString(),
      recoveredAmount: recoveredAmount > 0 ? recoveredAmount : undefined,
      // Only MANUAL / OTHER need an explicit bucket; everything else is implied
      // by the usage type and the backend decides.
      ...(isNeutralType
        ? { isLoss: manualBucket !== '', lossBucket: manualBucket || null }
        : {}),
    };

    const result = await logUsage(payload);
    if (result) {
      // A write-off priced at zero saves fine and then changes nothing in any
      // report. Saying "logged" alone would be technically true and completely
      // misleading, so the warning takes over the toast.
      if ((result as any).warning) {
        toast((result as any).warning, { icon: '\u26A0\uFE0F', duration: 9000 });
      } else {
        toast.success(`Usage logged   ${quantity} × ${selectedInventory.product?.name}`);
      }
      onSuccess?.();
      handleClose();
    }
  };

  // Available qty at selected location
  const availableQty = selectedInventory?.availableQuantity ?? null;

  // ---- Live profit impact --------------------------------------------------
  // The whole point of the feature: show the rupee figure before saving, so the
  // person logging it understands they are writing money off, not just stock.
  const unitCost = Number(selectedInventory?.product?.costPrice ?? 0);
  const grossCost = unitCost * (Number(quantity) || 0);
  const netLoss = Math.max(0, grossCost - (Number(recoveredAmount) || 0));
  const isNeutralType = usageType === 'MANUAL' || usageType === 'OTHER';
  const isAlreadyCosted = ALREADY_COUNTED_TYPES.includes(usageType);
  const effectiveBucket: LossBucket | null = isAlreadyCosted
    ? null
    : isNeutralType
      ? (manualBucket || null)
      : defaultLossBucket(usageType);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="!max-w-4xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Package className="h-5 w-5 text-orange-600" />
            Log Product Usage
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Manually record product consumption (packaging, internal use, demos, etc.) and deduct from inventory.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Product Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedInventory(null);
                    setProductDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = productSearch.trim();
                      if (trimmed && !selectedInventory) void handleBarcodeScan(trimmed);
                    }
                  }}
                  onFocus={() => searchQuery && setProductDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setProductDropdownOpen(false), 150)}
                  placeholder="Search name, SKU, code, barcode, category…"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScanner(true)}
                disabled={scanning || loading}
                className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50"
                title="Scan barcode"
              >
                {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanLine className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">Scan</span>
              </Button>
            </div>
            {productDropdownOpen && searchQuery && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchLoading ? (
                  <p className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                  </p>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => handleSelectInventoryItem(item)}
                      className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm flex items-center justify-between"
                    >
                      <span>
                        <span className="font-medium text-gray-900">{item.product?.name}</span>
                        <span className="ml-2 text-gray-400 text-xs">{item.product?.productCode}</span>
                      </span>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        {item.location?.name} · {item.availableQuantity} avail
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-gray-500">No products found</p>
                )}
              </div>
            )}
            {selectedInventory && (
              <div className="mt-1 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                <MapPin className="h-3 w-3" />
                {selectedInventory.location?.name}   {availableQty} units available
              </div>
            )}
          </div>

          {/* Location (editable if product selected) */}
          {selectedInventory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select location…</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.locationCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Usage Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usage Type <span className="text-red-500">*</span>
            </label>
            {(['LOSS', 'INTERNAL', 'COSTED', 'NEUTRAL'] as const).map((group) => (
              <div key={group} className="mb-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {GROUP_LABELS[group]}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {USAGE_TYPE_OPTIONS.filter((o) => o.group === group).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUsageType(opt.value)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        usageType === opt.value
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* MANUAL / OTHER carry no inherent meaning   only the person logging
                the entry knows whether the stock was genuinely lost. */}
            {isNeutralType && (
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  How should this affect profit?
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {([
                    { v: '', label: 'No effect', hint: 'Stock moved, nothing written off' },
                    { v: 'COGS', label: 'Stock loss', hint: 'Reduces gross profit' },
                    { v: 'OPEX', label: 'Business expense', hint: 'Reduces net profit' },
                  ] as const).map((o) => (
                    <button
                      key={o.v || 'none'}
                      type="button"
                      onClick={() => setManualBucket(o.v as LossBucket | '')}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        manualBucket === o.v
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{o.label}</div>
                      <div className="mt-0.5 text-xs text-gray-400">{o.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isAlreadyCosted && (
              <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Job sheet and repair usage is already costed against the job, so this
                entry is recorded for traceability but will not be counted again in
                profit reports.
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
              {availableQty !== null && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  (max {availableQty})
                </span>
              )}
            </label>
            <input
              type="number"
              min={1}
              max={availableQty ?? undefined}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Used for courier packaging, Showroom display unit…"
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* When it happened + what was recovered ------------------------------
              Back-dating matters: a write-off entered a week late must still land
              in the month it happened, or the P&L moves the loss to the wrong
              period. Recovery matters because scrap sales and supplier credits
              genuinely reduce what the business lost. */}
          {effectiveBucket !== null && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  When did this happen?
                </label>
                <input
                  type="date"
                  value={occurredOn}
                  max={todayISO()}
                  onChange={(e) => setOccurredOn(e.target.value || todayISO())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Reports group on this date, not on when you entered it.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recovered amount
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  max={grossCost || undefined}
                  value={recoveredAmount || ''}
                  onChange={(e) => setRecoveredAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Sold as scrap or credited by the supplier? Enter it here.
                </p>
              </div>
            </div>
          )}

          {/* Live profit impact - the number this whole feature exists for.
              The zero-cost case gets its own branch below. It used to sit inside
              this `grossCost > 0` gate, which can never be true when the unit
              cost is zero   so the one case that needed a warning was the one
              case that showed nothing, and the entry saved as a silent LKR 0.00
              write-off that no report could ever deduct. */}
          {selectedInventory && effectiveBucket !== null && grossCost > 0 && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                effectiveBucket === 'COGS'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <p className="font-semibold">
                This will reduce {effectiveBucket === 'COGS' ? 'gross' : 'net'} profit by{' '}
                {money(netLoss)}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {quantity} x {money(unitCost)} cost = {money(grossCost)}
                {recoveredAmount > 0 && ` - ${money(recoveredAmount)} recovered`}
                {effectiveBucket === 'COGS'
                  ? ' - charged to cost of goods sold.'
                  : ' - recorded as an operating expense.'}
              </p>
            </div>
          )}

          {selectedInventory && effectiveBucket !== null && unitCost === 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">
                &ldquo;{selectedInventory.product?.name}&rdquo; has no cost price
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                The stock will be deducted, but the write-off is worth LKR 0.00, so it
                will not reduce profit in the Sales, Profit &amp; Loss or Inventory
                reports. Set a cost price on the product first if you want this loss to
                count. If the product has been received through a purchase before, the
                system will use that cost automatically.
              </p>
            </div>
          )}

          {/* Reference Number (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference No. <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. JS-2026-0042, Job ticket number…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details…"
              rows={2}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedInventory || !reason.trim()}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Logging…</>
              ) : (
                'Log Usage & Deduct Stock'
              )}
            </Button>
          </div>
        </form>

        <BarcodeScannerModal
          open={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleBarcodeScan}
          title="Scan Product Barcode"
        />

        <BarcodeProductSelectModal
          open={showBarcodeSelect}
          onClose={() => {
            setShowBarcodeSelect(false);
            setBarcodeMatches([]);
          }}
          matches={barcodeMatches}
          onSelect={handleBarcodeProductSelect}
          scannedValue={lastScannedValue}
        />
      </DialogContent>
    </Dialog>
  );
}
