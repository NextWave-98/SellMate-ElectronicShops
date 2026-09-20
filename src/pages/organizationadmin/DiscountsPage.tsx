import { useEffect, useState, useCallback } from 'react';

import { Plus, RefreshCw, Search, Pencil, Trash2, Tag, Calendar, X, ChevronDown, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';
import useDiscount, { type DiscountItem, type DiscountType } from '../../hooks/useDiscount';
import useProductCategory from '../../hooks/useProductCategory';
import useProduct from '../../hooks/useProduct';

type DiscountScope = 'product' | 'category';

interface FormState {
  name: string;
  discountType: DiscountType;
  discountValue: string;
  scope: DiscountScope;
  productId: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface BulkFormState {
  name: string;
  discountType: DiscountType;
  discountValue: string;
  productIds: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  bulkSearch: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  scope: 'product',
  productId: '',
  categoryId: '',
  startDate: '',
  endDate: '',
  isActive: true,
};

const EMPTY_BULK_FORM: BulkFormState = {
  name: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  productIds: [],
  startDate: '',
  endDate: '',
  isActive: true,
  bulkSearch: '',
};

export default function DiscountsPage() {
  const discountHook = useDiscount();
  const categoryHook = useProductCategory();
  const productHook = useProduct();

  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // filters
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(15);

  // modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<DiscountItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [bulkForm, setBulkForm] = useState<BulkFormState>(EMPTY_BULK_FORM);

  // lookup lists for selects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [categories, setCategories] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([]);

  // load lookup data once
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categoryHook.getAllCategories({ limit: 200, isActive: true }).then((res: any) => {
      // API returns { success: true, data: [...], pagination: {...} }
      if (Array.isArray(res?.data)) setCategories(res.data);
      else if (Array.isArray(res?.categories)) setCategories(res.categories);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    productHook.getAllProducts({ limit: 500, isActive: true }).then((res: any) => {
      if (Array.isArray(res?.data)) setProducts(res.data);
      else if (Array.isArray(res?.products)) setProducts(res.products);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDiscounts = useCallback(
    async (page = currentPage) => {
      try {
        setLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filters: any = { page, limit: limit };
        if (search) filters.search = search;
        if (filterActive === 'active') filters.isActive = true;
        else if (filterActive === 'inactive') filters.isActive = false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await discountHook.getAllDiscounts(filters);
        if (res?.discounts) {
          setDiscounts(res.discounts);
          setTotalPages(res.pagination?.totalPages ?? 1);
          setTotalItems(res.pagination?.totalItems ?? 0);
        }
      } catch {
        toast.error('Failed to load discounts');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, search, filterActive, limit],
  );

  useEffect(() => {
    loadDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterActive, limit]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadDiscounts(1);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDiscounts(currentPage);
  };

  // ─── Add Single ─────────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setIsAddOpen(true);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error('Discount name is required');
    if (!form.discountValue || isNaN(Number(form.discountValue))) return toast.error('Enter a valid discount value');

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        isActive: form.isActive,
      };
      if (form.startDate) payload.startDate = form.startDate;
      if (form.endDate) payload.endDate = form.endDate;

      if (form.scope === 'product') {
        if (!form.productId) return toast.error('Select a product');
        payload.productId = form.productId;
      } else {
        // category
        if (!form.categoryId) return toast.error('Select a category');
        payload.categoryId = form.categoryId;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await discountHook.createDiscount(payload as any);
      if (res) {
        toast.success('Discount created');
        setIsAddOpen(false);
        loadDiscounts(1);
        setCurrentPage(1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Add Bulk ───────────────────────────────────────────────────────────────

  const openBulk = () => {
    setBulkForm(EMPTY_BULK_FORM);
    setIsBulkOpen(true);
  };

  const handleBulkAdd = async () => {
    if (!bulkForm.name.trim()) return toast.error('Discount name is required');
    if (!bulkForm.discountValue || isNaN(Number(bulkForm.discountValue))) return toast.error('Enter a valid discount value');
    if (bulkForm.productIds.length === 0) return toast.error('Select at least one product');

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: bulkForm.name.trim(),
        discountType: bulkForm.discountType,
        discountValue: Number(bulkForm.discountValue),
        isActive: bulkForm.isActive,
        productIds: bulkForm.productIds,
      };
      if (bulkForm.startDate) payload.startDate = bulkForm.startDate;
      if (bulkForm.endDate) payload.endDate = bulkForm.endDate;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await discountHook.createDiscount(payload as any);
      if (res) {
        toast.success(`Bulk discount created for ${bulkForm.productIds.length} product(s)`);
        setIsBulkOpen(false);
        loadDiscounts(1);
        setCurrentPage(1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBulkProduct = (pid: string) => {
    setBulkForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(pid)
        ? prev.productIds.filter((id) => id !== pid)
        : [...prev.productIds, pid],
    }));
  };



  // ─── Edit ───────────────────────────────────────────────────────────────────

  const openEdit = (item: DiscountItem) => {
    setSelected(item);
    const scope: DiscountScope = item.productId ? 'product' : item.categoryId ? 'category' : 'product';
    setForm({
      name: item.name,
      discountType: item.discountType,
      discountValue: String(item.discountValue),
      scope,
      productId: item.productId ?? '',
      categoryId: item.categoryId ?? '',
      startDate: item.startDate ?? '',
      endDate: item.endDate ?? '',
      isActive: item.isActive,
    });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selected) return;
    if (!form.name.trim()) return toast.error('Discount name is required');
    if (!form.discountValue || isNaN(Number(form.discountValue))) return toast.error('Enter a valid discount value');

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        id: selected.id,
        name: form.name.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        isActive: form.isActive,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      if (form.scope === 'product' && form.productId) payload.productId = form.productId;
      if (form.scope === 'category' && form.categoryId) payload.categoryId = form.categoryId;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await discountHook.updateDiscount(payload as any);
      if (res) {
        toast.success('Discount updated');
        setIsEditOpen(false);
        loadDiscounts(currentPage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const openDelete = (item: DiscountItem) => {
    setSelected(item);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await discountHook.deleteDiscount(selected.id);
      toast.success('Discount deleted');
      setIsDeleteOpen(false);
      loadDiscounts(currentPage);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatScope = (item: DiscountItem) => {
    if (item.product) return `Product: ${item.product.name}`;
    if (item.category) return `Category: ${item.category.name}`;
    return 'Multiple Products (Bulk)';
  };

  const formatValue = (item: DiscountItem) => {
    if (item.discountType === 'PERCENTAGE') return `${item.discountValue}%`;
    return `৳${Number(item.discountValue).toFixed(2)}`;
  };

  const formatDate = (d?: string | null) => (d ? d.slice(0, 10) : ' ');

  const isExpired = (item: DiscountItem) => {
    if (!item.endDate) return false;
    return new Date(item.endDate) < new Date();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const renderForm = (mode: 'add' | 'edit') => (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <Label>Discount Name *</Label>
        <Input
          placeholder="e.g. Summer Sale 10% OFF"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
      </div>

      {/* Scope (only editable on add) */}
      {mode === 'add' && (
        <div>
          <Label>Apply to</Label>
          <Select
            value={form.scope}
            onValueChange={(v) => setForm((p) => ({ ...p, scope: v as DiscountScope, productId: '', categoryId: '' }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Single Product</SelectItem>
              <SelectItem value="category">Product Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Product selector */}
      {form.scope === 'product' && (
        <div>
          <Label>Product *</Label>
          <Select value={form.productId} onValueChange={(v) => setForm((p) => ({ ...p, productId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} ({p.productCode})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Category selector */}
      {form.scope === 'category' && (
        <div>
          <Label>Category *</Label>
          <Select value={form.categoryId} onValueChange={(v) => setForm((p) => ({ ...p, categoryId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {categories.length === 0 ? (
                <SelectItem value="_none" disabled>No categories found</SelectItem>
              ) : (
                categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Discount type + value */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Label>Type *</Label>
          <Select value={form.discountType} onValueChange={(v) => setForm((p) => ({ ...p, discountType: v as DiscountType }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
              <SelectItem value="FIXED">Fixed Amount (৳)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label>Value *</Label>
          <Input
            type="number"
            min={0}
            max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
            step="0.01"
            placeholder={form.discountType === 'PERCENTAGE' ? '0–100' : '0.00'}
            value={form.discountValue}
            onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
          />
        </div>
      </div>

      {/* Date range */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Label>Start Date</Label>
          <Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
        </div>
        <div className="flex-1">
          <Label>End Date</Label>
          <Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-2">
        <Switch checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
        <Label>{form.isActive ? 'Active' : 'Inactive'}</Label>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{totalItems} discount{totalItems !== 1 ? 's' : ''} configured</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Discount
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openAdd}>
                <Tag className="w-4 h-4 mr-2" />
                Single Discount
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openBulk}>
                <Layers className="w-4 h-4 mr-2" />
                Bulk Discount (Multiple Products)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <Label className="text-xs mb-1 block">Search</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button size="sm" variant="outline" onClick={handleSearch}>
                  <Search className="w-4 h-4" />
                </Button>
                {search && (
                  <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setCurrentPage(1); loadDiscounts(1); }}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={filterActive} onValueChange={(v) => { setFilterActive(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/30 backdrop-blur-sm border-b border-white/20">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Scope</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Discount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date Range</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">Loading…</td>
                  </tr>
                ) : discounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No discounts found
                    </td>
                  </tr>
                ) : (
                  discounts.map((item) => (
                    <tr key={item.id} className="border-b border-white/20 hover:bg-white/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{formatScope(item)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.discountType === 'PERCENTAGE' ? 'default' : 'secondary'}>
                          {formatValue(item)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.startDate)} → {formatDate(item.endDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {!item.isActive ? (
                          <Badge variant="outline" className="text-gray-400">Inactive</Badge>
                        ) : isExpired(item) ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openDelete(item)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>Page {currentPage} of {totalPages}</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setCurrentPage(1); }}
                  className="text-sm border border-white/40 rounded bg-white/30 backdrop-blur-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {[5, 10, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
       <DialogContent className="xl:!max-w-7xl  md:!max-w-6xl sm:!max-w-5xl max-h-[90vh]  ">
          <DialogHeader>
            <DialogTitle>Add Discount</DialogTitle>
          </DialogHeader>
          {renderForm('add')}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>{submitting ? 'Creating…' : 'Create Discount'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
       <DialogContent className="xl:!max-w-7xl  md:!max-w-6xl sm:!max-w-5xl max-h-[90vh]  ">
          <DialogHeader>
            <DialogTitle>Edit Discount</DialogTitle>
          </DialogHeader>
          {renderForm('edit')}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>{submitting ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
     <DialogContent className="xl:!max-w-7xl  md:!max-w-6xl sm:!max-w-5xl max-h-[90vh]  ">
          <DialogHeader>
            <DialogTitle>Delete Discount</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{selected?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Discount Modal */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen} >
        <DialogContent className="xl:!max-w-7xl  md:!max-w-6xl sm:!max-w-5xl max-h-[90vh]  ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Add Bulk Discount
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Apply one discount setting to multiple products at once.
            </p>

            {/* Name */}
            <div>
              <Label>Discount Name *</Label>
              <Input
                placeholder="e.g. Clearance Sale 20%"
                value={bulkForm.name}
                onChange={(e) => setBulkForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Discount type + value */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Type *</Label>
                <Select value={bulkForm.discountType} onValueChange={(v) => setBulkForm((p) => ({ ...p, discountType: v as DiscountType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Value *</Label>
                <Input
                  type="number"
                  min={0}
                  max={bulkForm.discountType === 'PERCENTAGE' ? 100 : undefined}
                  step="0.01"
                  placeholder={bulkForm.discountType === 'PERCENTAGE' ? '0–100' : '0.00'}
                  value={bulkForm.discountValue}
                  onChange={(e) => setBulkForm((p) => ({ ...p, discountValue: e.target.value }))}
                />
              </div>
            </div>

            {/* Date range */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Start Date</Label>
                <Input type="date" value={bulkForm.startDate} onChange={(e) => setBulkForm((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="flex-1">
                <Label>End Date</Label>
                <Input type="date" value={bulkForm.endDate} onChange={(e) => setBulkForm((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={bulkForm.isActive} onCheckedChange={(v) => setBulkForm((p) => ({ ...p, isActive: v }))} />
              <Label>{bulkForm.isActive ? 'Active' : 'Inactive'}</Label>
            </div>

            {/* Product multi-select */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Select Products * <span className="text-muted-foreground font-normal">({bulkForm.productIds.length} selected)</span></Label>
                {bulkForm.productIds.length > 0 && (
                  <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => setBulkForm((p) => ({ ...p, productIds: [] }))}>
                    Clear all
                  </Button>
                )}
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search products…"
                  value={bulkForm.bulkSearch}
                  onChange={(e) => setBulkForm((p) => ({ ...p, bulkSearch: e.target.value }))}
                />
              </div>
              <div className="border rounded-md max-h-56 overflow-y-auto p-2 space-y-0.5">
                {products
                  .filter((p) =>
                    !bulkForm.bulkSearch ||
                    p.name?.toLowerCase().includes(bulkForm.bulkSearch.toLowerCase()) ||
                    p.productCode?.toLowerCase().includes(bulkForm.bulkSearch.toLowerCase()),
                  )
                  .map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted px-2 py-1 rounded text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={bulkForm.productIds.includes(p.id)}
                        onChange={() => toggleBulkProduct(p.id)}
                        className="rounded"
                      />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-muted-foreground text-xs shrink-0">{p.productCode}</span>
                      <span className="text-muted-foreground text-xs shrink-0">৳{Number(p.unitPrice).toFixed(2)}</span>
                    </label>
                  ))}
                {products.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No products found</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsBulkOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleBulkAdd} disabled={submitting}>
              {submitting ? 'Creating…' : `Apply to ${bulkForm.productIds.length} Product(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
