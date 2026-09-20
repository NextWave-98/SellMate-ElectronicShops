import { useCallback, useEffect, useState } from 'react';
import { X, Search, Loader2, ShieldPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import useWarranty from '../../../hooks/useWarranty';

/** A sale line that has no warranty card yet. */
interface WarrantableSaleItem {
  saleItemId: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  warrantyMonths: number | null;
  saleNumber: string;
  soldAt: string;
  locationName: string | null;
  customerName: string;
  customerPhone: string | null;
  productWarrantyMonths: number | null;
  productWarrantyType: string | null;
}

interface AddWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Add a warranty card by hand, from the warranty page.
 *
 * A warranty card is never free-floating: it belongs to the sale line that
 * produced it, which is what lets a claim be traced back to a customer, a price
 * and a date. So "add a warranty" means *find the sale line that has not got one
 * yet*   which is what the picker below does   and then choose how long it runs.
 *
 * The length defaults to whatever the product carries, so the common case is two
 * clicks; override it when somebody is granting a warranty to something that did
 * not come with one.
 */
export function AddWarrantyModal({ isOpen, onClose, onCreated }: AddWarrantyModalProps) {
  const { getWarrantableSaleItems, createWarrantyCard } = useWarranty();

  const [search, setSearch] = useState('');
  const [items, setItems] = useState<WarrantableSaleItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selected, setSelected] = useState<WarrantableSaleItem | null>(null);

  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [customTerms, setCustomTerms] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (term: string) => {
    setLoadingItems(true);
    try {
      const res: any = await getWarrantableSaleItems({ search: term || undefined, limit: 25 });
      const rows = res?.data ?? res ?? [];
      setItems(Array.isArray(rows) ? rows : []);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [getWarrantableSaleItems]);

  // Debounced so typing a customer name does not fire a query per keystroke.
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => { void load(search); }, 300);
    return () => clearTimeout(t);
  }, [isOpen, search, load]);

  useEffect(() => {
    if (isOpen) return;
    // Reset on close so reopening never shows the last person's selection.
    setSearch('');
    setItems([]);
    setSelected(null);
    setWarrantyMonths('');
    setSerialNumber('');
    setCustomTerms('');
  }, [isOpen]);

  const choose = (item: WarrantableSaleItem) => {
    setSelected(item);
    // Default to the product's own warranty length   the usual reason a line has
    // no card is that warranty was switched off when it sold, not that the
    // product never had one.
    const months = item.productWarrantyMonths ?? item.warrantyMonths ?? 0;
    setWarrantyMonths(months > 0 ? String(months) : '12');
  };

  const submit = async () => {
    if (!selected) return;
    const months = Number(warrantyMonths);
    if (!Number.isInteger(months) || months <= 0) {
      toast.error('Enter a whole number of months greater than zero');
      return;
    }

    setSaving(true);
    try {
      const res: any = await createWarrantyCard({
        saleId: selected.saleId,
        saleItemId: selected.saleItemId,
        warrantyMonths: months,
        ...(serialNumber.trim() && { serialNumber: serialNumber.trim() }),
        ...(customTerms.trim() && { customTerms: customTerms.trim() }),
      } as any);

      if (res?.success === false) {
        toast.error(res?.message || 'Could not create the warranty card');
        return;
      }
      toast.success(`Warranty card created for ${selected.productName}`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Could not create the warranty card');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShieldPlus className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">Add Warranty</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!selected ? (
            <>
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Pick the sale this warranty belongs to. Only lines that do not
                  already have a warranty card are listed.
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by sale number, product, customer name or phone…"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  />
                </div>
              </div>

              {loadingItems ? (
                <div className="flex items-center justify-center py-10 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Looking…
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-500">
                  {search
                    ? 'No sale line matches that, or they all already have a warranty card.'
                    : 'Every sale line already has a warranty card.'}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {items.map((item) => (
                    <button
                      key={item.saleItemId}
                      onClick={() => choose(item)}
                      className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.saleNumber} · {item.customerName}
                            {item.customerPhone ? ` · ${item.customerPhone}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500">
                            {new Date(item.soldAt).toLocaleDateString()}
                          </p>
                          {(item.productWarrantyMonths ?? 0) > 0 && (
                            <p className="text-xs text-teal-600 font-medium mt-0.5">
                              {item.productWarrantyMonths} mo
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{selected.productName}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {selected.saleNumber} · {selected.customerName}
                      {selected.locationName ? ` · ${selected.locationName}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sold {new Date(selected.soldAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-xs text-teal-700 hover:underline shrink-0"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warranty Months <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Runs from today. Defaulted to the product's own warranty length.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial / IMEI <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Device serial number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={customTerms}
                  onChange={(e) => setCustomTerms(e.target.value)}
                  placeholder="Leave empty to use the product's own warranty terms"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!selected || saving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Warranty
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddWarrantyModal;
