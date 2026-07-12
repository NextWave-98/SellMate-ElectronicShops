/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Search, Wrench, Package, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LocationSelector from '../../components/common/LocationSelector';
import usePart, {
  PART_CATEGORIES,
  type PartRecord,
  type CreatePartData,
  type PartCategory,
} from '../../hooks/usePart';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';
import { useAuth } from '../../context/AuthContext';
import { Label } from '@/components/ui/label';

interface PartsPageProps {
  lockedLocationId?: string;
}

const emptyForm: CreatePartData = {
  name: '',
  category: 'OTHER',
  unitPrice: 0,
  costPrice: 0,
  minStockLevel: 5,
  reorderLevel: 10,
  warrantyMonths: 0,
  isActive: true,
};

export default function PartsPage({ lockedLocationId }: PartsPageProps) {
  const { getParts, getPartStats, createPart, updatePart, deletePart, adjustPartStock } = usePart();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const canCreate = hasPermission(PERMISSIONS.PARTS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PARTS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.PARTS_DELETE);

  const [parts, setParts] = useState<PartRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, lowStock: 0, totalStock: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PartCategory | ''>('');

  const [showForm, setShowForm] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [editingPart, setEditingPart] = useState<PartRecord | null>(null);
  const [stockPart, setStockPart] = useState<PartRecord | null>(null);
  const [form, setForm] = useState<CreatePartData>(emptyForm);
  const [stockLocationId, setStockLocationId] = useState(lockedLocationId || user?.locationId || '');
  const [stockQty, setStockQty] = useState(1);
  const [stockType, setStockType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [stockNotes, setStockNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      const [partsRes, statsRes] = await Promise.all([
        getParts({
          page: 1,
          limit: 500,
          search: search || undefined,
          category: categoryFilter || undefined,
        }),
        getPartStats(),
      ]);

      const payload = partsRes?.data as { data?: PartRecord[] } | PartRecord[];
      const list = Array.isArray(payload) ? payload : payload?.data || [];
      setParts(list);

      if (statsRes?.data) {
        setStats(statsRes.data as typeof stats);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load parts');
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [getParts, getPartStats, search, categoryFilter]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditingPart(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (part: PartRecord) => {
    setEditingPart(part);
    setForm({
      name: part.name,
      description: part.description,
      category: part.category,
      brand: part.brand,
      model: part.model,
      compatibility: part.compatibility,
      unitPrice: Number(part.unitPrice),
      costPrice: Number(part.costPrice),
      minStockLevel: part.minStockLevel,
      reorderLevel: part.reorderLevel,
      supplier: part.supplier,
      supplierContact: part.supplierContact,
      warrantyMonths: part.warrantyMonths,
      isActive: part.isActive,
    });
    setShowForm(true);
  };

  const openStock = (part: PartRecord) => {
    setStockPart(part);
    setStockLocationId(lockedLocationId || user?.locationId || '');
    setStockQty(1);
    setStockType('IN');
    setStockNotes('');
    setShowStock(true);
  };

  const handleSavePart = async () => {
    if (!form.name.trim()) {
      toast.error('Part name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingPart) {
        await updatePart(editingPart.id, form);
      } else {
        await createPart(form);
      }
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (part: PartRecord) => {
    if (!window.confirm(`Delete part "${part.name}"?`)) return;
    try {
      await deletePart(part.id);
      await loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleStockUpdate = async () => {
    if (!stockPart || !stockLocationId) {
      toast.error('Select a branch/location');
      return;
    }
    setSubmitting(true);
    try {
      await adjustPartStock(stockPart.id, {
        locationId: stockLocationId,
        quantity: stockQty,
        movementType: stockType,
        notes: stockNotes || null,
      });
      setShowStock(false);
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (n: number) =>
    `LKR ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-7 h-7 text-orange-600" />
            Parts Catalog &amp; Stock
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Create repair parts and set branch stock. Used on job sheets under Parts &amp; Products tab.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadData()} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCreate && (
            <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-1" />
              Add Part
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Parts', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Low Stock', value: stats.lowStock },
          { label: 'Total Units', value: stats.totalStock },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search part name or number..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as PartCategory | '')}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All categories</option>
          {PART_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => loadData()}>
          Search
        </Button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Part</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Sell Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Stock</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {parts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  No parts yet. Click &quot;Add Part&quot; to create your catalog.
                </td>
              </tr>
            ) : (
              parts.map((part) => (
                <tr key={part.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{part.name}</p>
                    <p className="text-xs text-gray-500">{part.partNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{part.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(Number(part.unitPrice))}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={
                        (part.totalStock || 0) <= part.minStockLevel
                          ? 'text-red-600 font-medium'
                          : 'text-gray-900'
                      }
                    >
                      {part.totalStock ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {canUpdate && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openStock(part)}>
                          <Package className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(part)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDelete(part)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPart ? 'Edit Part' : 'Add Part'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            <Label
              htmlFor="part-name"
              className="text-sm font-medium text-black/70"
            >
              Part name *
            </Label>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Part name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
            <Label
              htmlFor="part-category"
              className="text-sm font-medium text-black/70"
            >
              Category *
            </Label>
            <select
              className="w-full px-3 py-2 border rounded-lg"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as PartCategory })}
            >
              {PART_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            </div>
           
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="part-brand"
                  className="text-sm font-medium text-black/70"
                >
                  Brand
                </Label>
                <input
                className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Model"
                  value={form.model || ''}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="part-unit-price"
                  className="text-sm font-medium text-black/70"
                >
                  Unit price
                </Label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Unit price"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })}
              />
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="part-cost-price"
                  className="text-sm font-medium text-black/70"
                >
                  Cost price
                </Label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Cost price"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <textarea
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Compatibility notes"
              rows={2}
              value={form.compatibility || ''}
              onChange={(e) => setForm({ ...form, compatibility: e.target.value })}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePart} disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
              {editingPart ? 'Save' : 'Create Part'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStock} onOpenChange={setShowStock}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stock — {stockPart?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {!lockedLocationId && (
              <LocationSelector
                value={stockLocationId}
                onChange={setStockLocationId}
                label="Branch / Location"
              />
            )}
            <select
              className="w-full px-3 py-2 border rounded-lg"
              value={stockType}
              onChange={(e) => setStockType(e.target.value as 'IN' | 'OUT' | 'ADJUSTMENT')}
            >
              <option value="IN">Receive stock (IN)</option>
              <option value="OUT">Remove stock (OUT)</option>
              <option value="ADJUSTMENT">Set exact quantity (ADJUST)</option>
            </select>
            <input
              type="number"
              min={1}
              className="w-full px-3 py-2 border rounded-lg"
              value={stockQty}
              onChange={(e) => setStockQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
            <input
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Notes (optional)"
              value={stockNotes}
              onChange={(e) => setStockNotes(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStock(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockUpdate} disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
