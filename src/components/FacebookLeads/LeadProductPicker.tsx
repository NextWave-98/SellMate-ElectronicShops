import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Search, Trash2, Replace } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import type { LeadProduct } from '../../services/facebookLeadsService';
import {
  mapInventoryRowsToProducts,
  parseInventoryList,
  type InventoryProduct,
} from '../../utils/inventoryProducts';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Props {
  value: LeadProduct[];
  onChange: (next: LeadProduct[]) => void;
  disabled?: boolean;
  /** Lead branch — scopes stock so OOS is accurate for that location. */
  locationId?: string;
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

const exactCodeMatch = (products: InventoryProduct[], term: string) => {
  const q = norm(term);
  return products.find((p) => [p.productCode, p.sku, p.barcode].some((c) => c && norm(c) === q));
};

const toLeadProduct = (p: InventoryProduct, quantity = 1): LeadProduct => ({
  productId: p.id,
  code: p.productCode || p.sku || p.barcode || '',
  name: p.name,
  quantity,
  unitPrice: p.price,
});

/**
 * Search inventory by name, product code, SKU or barcode and keep a list of
 * products with quantities. Zero-stock products stay selectable (Out of stock
 * badge) so staff can capture customer demand and mark the lead OOS.
 */
const LeadProductPicker: React.FC<Props> = ({ value, onChange, disabled, locationId }) => {
  const { getAllInventory } = useInventory();
  const getAllInventoryRef = useRef(getAllInventory);
  getAllInventoryRef.current = getAllInventory;

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  /** productId → stock at last add/search (UI only). */
  const [stockByProductId, setStockByProductId] = useState<Record<string, number>>({});
  const requestId = useRef(0);

  const search = async (q: string): Promise<InventoryProduct[]> => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await getAllInventoryRef.current({
        search: q,
        limit: 20,
        includeDiscount: true,
        sortBy: 'name',
        sortOrder: 'asc',
        ...(locationId ? { locationId, exactLocation: true } : {}),
      });
      const mapped = mapInventoryRowsToProducts(parseInventoryList(res));
      if (id === requestId.current) {
        setResults(mapped);
        setStockByProductId((prev) => {
          const next = { ...prev };
          for (const p of mapped) next[p.id] = p.stock;
          return next;
        });
      }
      return mapped;
    } catch {
      if (id === requestId.current) setResults([]);
      return [];
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      requestId.current += 1;
      setResults([]);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => void search(q), 350);
    return () => clearTimeout(t);
  }, [term, locationId]);

  const addProduct = (p: InventoryProduct) => {
    setStockByProductId((prev) => ({ ...prev, [p.id]: p.stock }));
    if (replaceIndex !== null && value[replaceIndex]) {
      const keepQty = value[replaceIndex].quantity;
      const rest = value.filter((_, i) => i !== replaceIndex);
      const dup = rest.findIndex((x) => x.productId === p.id);
      onChange(
        dup >= 0
          ? rest.map((x, i) => (i === dup ? { ...x, quantity: x.quantity + keepQty } : x))
          : value.map((x, i) => (i === replaceIndex ? toLeadProduct(p, keepQty) : x)),
      );
    } else {
      const dup = value.findIndex((x) => x.productId === p.id);
      onChange(
        dup >= 0
          ? value.map((x, i) => (i === dup ? { ...x, quantity: x.quantity + 1 } : x))
          : [...value, toLeadProduct(p)],
      );
    }
    setReplaceIndex(null);
    setTerm('');
    setResults([]);
    setOpen(false);
  };

  const handleEnter = async () => {
    const q = term.trim();
    if (!q) return;
    const list = await search(q);
    const match = exactCodeMatch(list, q) ?? (list.length === 1 ? list[0] : undefined);
    if (match) addProduct(match);
    else setOpen(true);
  };

  const setQuantity = (index: number, quantity: number) =>
    onChange(value.map((x, i) => (i === index ? { ...x, quantity: Math.max(1, quantity || 1) } : x)));

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    if (replaceIndex === index) setReplaceIndex(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-8"
          disabled={disabled}
          placeholder={
            replaceIndex !== null
              ? `Search a product to replace "${value[replaceIndex]?.code}"`
              : 'Search product by name, code or barcode, Enter to add'
          }
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleEnter();
            } else if (e.key === 'Escape') {
              setOpen(false);
              setReplaceIndex(null);
            }
          }}
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
        {open && term.trim().length >= 2 && (
          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-background shadow-lg">
            {results.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                {loading ? 'Searching…' : `No products found for "${term.trim()}"`}
              </div>
            ) : (
              results.map((p) => {
                const oos = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="block w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addProduct(p)}
                  >
                    <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                      <span>{p.name}</span>
                      {oos && (
                        <Badge variant="outline" className="border-rose-400 text-rose-700 text-[10px] px-1.5 py-0">
                          Out of stock
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                      {p.productCode && <span>Code: {p.productCode}</span>}
                      {p.sku && p.sku !== p.productCode && <span>SKU: {p.sku}</span>}
                      {p.barcode && <span>Barcode: {p.barcode}</span>}
                      <span>LKR {p.price.toLocaleString()}</span>
                      <span className={oos ? 'text-rose-600 font-medium' : ''}>
                        Stock: {p.stock}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((p, i) => {
            const unmatched = !p.productId;
            const stock =
              p.productId != null && stockByProductId[p.productId] != null
                ? stockByProductId[p.productId]
                : null;
            const oos = stock != null && stock <= 0;
            return (
              <div
                key={`${p.productId ?? 'code'}-${p.code}-${i}`}
                className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
                  unmatched ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : ''
                } ${oos ? 'border-rose-300 bg-rose-50/50 dark:bg-rose-950/20' : ''} ${
                  replaceIndex === i ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  {unmatched ? (
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      <span className="truncate">Code "{p.code}" not found, search and replace</span>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium truncate flex items-center gap-2">
                        <span className="truncate">{p.name || p.code}</span>
                        {oos && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-rose-400 text-rose-700 text-[10px] px-1.5 py-0"
                          >
                            Out of stock
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.code}
                        {p.unitPrice != null ? ` · LKR ${Number(p.unitPrice).toLocaleString()}` : ''}
                        {stock != null ? ` · Stock: ${stock}` : ''}
                      </div>
                    </>
                  )}
                </div>
                {unmatched && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={disabled}
                    onClick={() => setReplaceIndex(replaceIndex === i ? null : i)}
                    title="Replace with a searched product"
                  >
                    <Replace className="size-3.5" />
                  </Button>
                )}
                <Input
                  type="number"
                  min={1}
                  className="w-16 h-8"
                  disabled={disabled}
                  value={p.quantity}
                  onChange={(e) => setQuantity(i, parseInt(e.target.value, 10))}
                  aria-label="Quantity"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-red-600"
                  disabled={disabled}
                  onClick={() => remove(i)}
                  aria-label="Remove product"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeadProductPicker;
