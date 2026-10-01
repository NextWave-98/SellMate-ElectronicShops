import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useFreeOffer, {
  type CreateFreeOfferData,
  type FreeOfferItem,
} from '../../hooks/useFreeOffer';
import useProduct from '../../hooks/useProduct';

interface FormState {
  name: string;
  triggerProductId: string;
  buyQuantity: string;
  freeQuantity: string;
  eligibleProductIds: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  productSearch: string;
}

const EMPTY: FormState = {
  name: '',
  triggerProductId: '',
  buyQuantity: '5',
  freeQuantity: '5',
  eligibleProductIds: [],
  startDate: '',
  endDate: '',
  isActive: true,
  productSearch: '',
};

export default function FreeOffersPage() {
  const { getAllFreeOffers, createFreeOffer, updateFreeOffer, deleteFreeOffer } =
    useFreeOffer();
  const { getAllProducts } = useProduct();

  const [offers, setOffers] = useState<FreeOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<FreeOfferItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FreeOfferItem | null>(null);

  // Load product lookup once on mount (do not depend on hook object identity).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAllProducts({ limit: 500, isActive: true }).then((res: any) => {
      if (Array.isArray(res?.data)) setProducts(res.data);
      else if (Array.isArray(res?.products)) setProducts(res.products);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllFreeOffers({
        limit: 100,
        search: search.trim() || undefined,
        isActive: filterActive === 'all' ? undefined : filterActive,
      });
      const list = res?.data || res?.offers || [];
      setOffers(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Failed to load free offers');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterActive, search]);

  // Single loader: filter immediate, search debounced (avoids products/API loops).
  useEffect(() => {
    const delay = search.trim() ? 350 : 0;
    const t = setTimeout(() => {
      void loadOffers();
    }, delay);
    return () => clearTimeout(t);
  }, [loadOffers, search]);

  const sellableProducts = useMemo(
    () =>
      products.filter(
        (p) => p && !p.isService && !p.isReload && p.isActive !== false,
      ),
    [products],
  );

  const filteredForChecklist = useMemo(() => {
    const q = form.productSearch.trim().toLowerCase();
    if (!q) return sellableProducts.slice(0, 80);
    return sellableProducts
      .filter(
        (p) =>
          String(p.name || '')
            .toLowerCase()
            .includes(q) ||
          String(p.sku || '')
            .toLowerCase()
            .includes(q) ||
          String(p.productCode || '')
            .toLowerCase()
            .includes(q),
      )
      .slice(0, 80);
  }, [sellableProducts, form.productSearch]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setIsOpen(true);
  };

  const openEdit = (offer: FreeOfferItem) => {
    setEditing(offer);
    setForm({
      name: offer.name,
      triggerProductId: offer.triggerProductId,
      buyQuantity: String(offer.buyQuantity),
      freeQuantity: String(offer.freeQuantity),
      eligibleProductIds: (offer.eligibleItems || []).map((i) => i.productId),
      startDate: offer.startDate || '',
      endDate: offer.endDate || '',
      isActive: offer.isActive,
      productSearch: '',
    });
    setIsOpen(true);
  };

  const toggleEligible = (productId: string) => {
    setForm((prev) => {
      const has = prev.eligibleProductIds.includes(productId);
      return {
        ...prev,
        eligibleProductIds: has
          ? prev.eligibleProductIds.filter((id) => id !== productId)
          : [...prev.eligibleProductIds, productId],
      };
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!form.triggerProductId) {
      toast.error('Select a buy / trigger product');
      return;
    }
    const buyQuantity = Number(form.buyQuantity);
    const freeQuantity = Number(form.freeQuantity);
    if (!(buyQuantity > 0) || !(freeQuantity > 0)) {
      toast.error('Buy and free quantities must be positive');
      return;
    }
    if (form.eligibleProductIds.length === 0) {
      toast.error('Select at least one free product option');
      return;
    }

    const payload: CreateFreeOfferData = {
      name: form.name.trim(),
      triggerProductId: form.triggerProductId,
      buyQuantity,
      freeQuantity,
      eligibleProductIds: form.eligibleProductIds,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isActive: form.isActive,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateFreeOffer({ id: editing.id, ...payload });
      } else {
        await createFreeOffer(payload);
      }
      setIsOpen(false);
      await loadOffers();
    } catch {
      /* toast from hook */
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteFreeOffer(deleteTarget.id);
      setDeleteTarget(null);
      await loadOffers();
    } catch {
      /* toast from hook */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="h-6 w-6 text-emerald-600" />
            Free Offers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Buy N get M free — cashier picks free items from an eligible pool
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadOffers()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Offer
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search offers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
          >
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : offers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No free offers yet. Create one to get started.
            </div>
          ) : (
            <div className="divide-y">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{offer.name}</span>
                      <Badge variant={offer.isActive ? 'default' : 'secondary'}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Buy{' '}
                      <strong>{offer.buyQuantity}</strong>{' '}
                      {offer.triggerProduct?.name || 'product'} → Get{' '}
                      <strong>{offer.freeQuantity}</strong> free from pool
                    </p>
                    <p className="text-xs text-gray-500">
                      Options:{' '}
                      {(offer.eligibleItems || [])
                        .map((i) => i.product?.name || i.productId)
                        .join(', ') || '—'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(offer)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(offer)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Free Offer' : 'New Free Offer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Koturulu 5+5 pool"
              />
            </div>
            <div>
              <Label>Buy product (trigger)</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.triggerProductId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, triggerProductId: e.target.value }))
                }
              >
                <option value="">Select product…</option>
                {sellableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Buy quantity</Label>
                <Input
                  type="number"
                  min={0.001}
                  step="any"
                  value={form.buyQuantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, buyQuantity: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Free quantity (pool)</Label>
                <Input
                  type="number"
                  min={0.001}
                  step="any"
                  value={form.freeQuantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, freeQuantity: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>End date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
            <div>
              <Label>Free product options</Label>
              <p className="text-xs text-gray-500 mb-2">
                Customer/cashier can split free qty across these products
              </p>
              <Input
                className="mb-2"
                placeholder="Search products…"
                value={form.productSearch}
                onChange={(e) =>
                  setForm((f) => ({ ...f, productSearch: e.target.value }))
                }
              />
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                {filteredForChecklist.map((p) => {
                  const checked = form.eligibleProductIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEligible(p.id)}
                      />
                      <span className="flex-1 truncate">{p.name}</span>
                      {checked && (
                        <button
                          type="button"
                          className="text-gray-400"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleEligible(p.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Selected: {form.eligibleProductIds.length}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete free offer?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Historical sales keep their FREE flags. This only removes the offer
            configuration.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
