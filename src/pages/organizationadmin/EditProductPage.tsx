import { useState, useCallback, useEffect, useRef } from 'react';
import type { DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { compressImageToWebP } from '../../utils/compressImage';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Image,
  Star,
  X,
  ChevronDown,
  ChevronUp,
  Package,
  DollarSign,
  Tag,
  Layers,
  BarChart2,
  Upload,
  Link,
  Wrench,
  Smartphone,
} from 'lucide-react';
import { useProduct } from '../../hooks/useProduct';
import { useProductCategory } from '../../hooks/useProductCategory';
import { useProductVariantType } from '../../hooks/useProductVariantType';
import { useLocation } from '../../hooks/useLocation';
import type { ProductVariantType } from '../../hooks/useProductVariantType';
import AsyncSearchSelect from '../../components/common/AsyncSearchSelect';
import { toCategoryOptions } from '../../utils/productListFilters';
import { formatCurrency } from '../../utils/currency';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantRow {
  id: string;
  existingId?: string;          // set when editing an existing variant
  attrValues: Record<string, string>;
  unitPrice: string;
  costPrice: string;
  sku: string;
  initQty: string;              // only used when creating new variants
  locationId: string;           // only used when creating new variants
  images: ImageEntry[];          // variant-specific images
  primaryImageId: string | null; // which image is primary
}

interface ImageEntry {
  id: string;
  url: string;
  preview: string;
  isLocal: boolean;
  isUploading?: boolean;
}

interface Location {
  id: string;
  name: string;
  code?: string;
  type?: string;
}

interface Category {
  id: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

type SectionId = 'basic' | 'pricing' | 'images' | 'inventory' | 'variants';

const SECTION_LABELS: Record<SectionId, { label: string; icon: React.ReactNode }> = {
  basic:     { label: 'Basic Info',   icon: <Package className="w-4 h-4" /> },
  pricing:   { label: 'Pricing',      icon: <DollarSign className="w-4 h-4" /> },
  images:    { label: 'Images',       icon: <Image className="w-4 h-4" /> },
  inventory: { label: 'Inventory',    icon: <BarChart2 className="w-4 h-4" /> },
  variants:  { label: 'Variants',     icon: <Layers className="w-4 h-4" /> },
};

// ─── Shared form sub-components (module-level to avoid focus loss on re-render) ─

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent';

const Field = ({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const Section = ({
  id,
  collapsed,
  onToggle,
  children,
}: {
  id: SectionId;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => {
  const { label, icon } = SECTION_LABELS[id];
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-2.5 font-semibold text-gray-800">
          <span className="text-orange-500">{icon}</span>
          {label}
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {!collapsed && (
        <div className="px-5 pb-5 border-t border-gray-100">{children}</div>
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const productHook = useProduct();
  const { uploadProductImages } = productHook;
  const categoryHook = useProductCategory();
  const variantTypeHook = useProductVariantType();
  const locationHook = useLocation();

  // ── Reference data ──────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [variantTypes, setVariantTypes] = useState<ProductVariantType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // ── Section collapse state ───────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState<Record<SectionId, boolean>>({
    basic: false, pricing: false, images: false, inventory: true, variants: false,
  });

  // ── Basic Info ───────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // ── Pricing ──────────────────────────────────────────────────────────────────
  const [unitPrice, setUnitPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');

  // ── Images ───────────────────────────────────────────────────────────────────
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [primaryImageId, setPrimaryImageId] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Inventory ────────────────────────────────────────────────────────────────
  const [minStockLevel, setMinStockLevel] = useState('');
  const [maxStockLevel, setMaxStockLevel] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [reorderQuantity, setReorderQuantity] = useState('');

  // ── Add stock (increment on-hand quantity for a location) ─────────────────────
  const [addStockQty, setAddStockQty] = useState('');
  const [addStockLocationId, setAddStockLocationId] = useState('');
  const [addStockNote, setAddStockNote] = useState('');
  const [addingStock, setAddingStock] = useState(false);

  // ── Product type ──────────────────────────────────────────────────────────────
  const [isService, setIsService] = useState(false);
  const [isReload, setIsReload] = useState(false);

  // ── Variants ─────────────────────────────────────────────────────────────────
  const [hasVariants, setHasVariants] = useState(false);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);

  // ── Page state ───────────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load reference data + product ───────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;
    const load = async () => {
      setPageLoading(true);
      const [vtRes, locRes, productRes] = await Promise.all([
        variantTypeHook.getAllVariantTypes({ isActive: true }),
        locationHook.getAllLocations(),
        productHook.getProductById(productId),
      ]);
      if (vtRes?.data) {
        setVariantTypes(Array.isArray(vtRes.data) ? (vtRes.data as ProductVariantType[]) : []);
      }
      if (locRes?.data) {
        const raw = locRes.data as unknown;
        let locList: Location[] = [];
        if (Array.isArray(raw)) locList = raw as Location[];
        else if ((raw as { locations?: Location[] })?.locations && Array.isArray((raw as { locations: Location[] }).locations)) {
          locList = (raw as { locations: Location[] }).locations;
        }
        setLocations(locList);
        // Default the Add-Stock location to a warehouse, else the first location
        const warehouse = locList.find(
          (l) => (((l as { locationType?: string; type?: string }).locationType || (l as { type?: string }).type || '') as string).toUpperCase() === 'WAREHOUSE'
        );
        setAddStockLocationId(warehouse?.id || locList[0]?.id || '');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (productRes as any)?.data;
      if (p) {
        setName(p.name ?? '');
        setDescription(p.description ?? '');
        setCategoryId(p.categoryId ?? '');
        if (p.category?.id) {
          setSelectedCategory({ id: p.category.id, name: p.category.name ?? '' });
        } else if (p.categoryId && p.categoryName) {
          setSelectedCategory({ id: p.categoryId, name: p.categoryName });
        } else {
          setSelectedCategory(null);
        }
        setBrand(p.brand ?? '');
        setModel(p.model ?? '');
        setTags(Array.isArray(p.tags) ? p.tags : []);
        setUnitPrice(p.unitPrice != null ? String(p.unitPrice) : '');
        setCostPrice(p.costPrice != null ? String(p.costPrice) : '');
        setWholesalePrice(p.wholesalePrice != null ? String(p.wholesalePrice) : '');
        setSku(p.sku ?? '');
        setBarcode(p.barcode ?? '');
        setMinStockLevel(p.minStockLevel != null ? String(p.minStockLevel) : '');
        setMaxStockLevel(p.maxStockLevel != null ? String(p.maxStockLevel) : '');
        setReorderLevel(p.reorderLevel != null ? String(p.reorderLevel) : '');
        setReorderQuantity(p.reorderQuantity != null ? String(p.reorderQuantity) : '');
        setHasVariants(p.hasVariants ?? false);
        setIsService(p.isService ?? false);
        setIsReload(p.isReload ?? false);

        // Pre-fill images — merge images array + primaryImage (API may return images:null with primaryImage set)
        const rawImages: string[] = Array.isArray(p.images) ? p.images : [];
        const primaryUrl: string | null = p.primaryImage ?? null;
        const allImageUrls = primaryUrl && !rawImages.includes(primaryUrl)
          ? [...rawImages, primaryUrl]
          : rawImages;
        if (allImageUrls.length > 0) {
          const imageEntries: ImageEntry[] = allImageUrls.map((url: string) => ({
            id: uid(), url, preview: url, isLocal: false,
          }));
          setImages(imageEntries);
          const primaryEntry = primaryUrl
            ? imageEntries.find((e: ImageEntry) => e.url === primaryUrl) ?? imageEntries[0]
            : imageEntries[0];
          if (primaryEntry) setPrimaryImageId(primaryEntry.id);
        }

        // Extract variant type IDs from customAttributes
        const typeIds: string[] = p.customAttributes?.variantTypeIds ?? [];
        setSelectedTypeIds(typeIds);

        // Load existing variants
        if (p.hasVariants) {
          const varRes = await productHook.getProductVariants(productId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const existingVariants = (varRes as any)?.data;
          const variantList = Array.isArray(existingVariants) ? existingVariants : [];
          setVariantRows(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            variantList.map((v: any) => {
              const imgUrls: string[] = Array.isArray(v.images) ? v.images : (v.primaryImage ? [v.primaryImage] : []);
              const imageEntries: ImageEntry[] = imgUrls.map((url: string) => ({ id: uid(), url, preview: url, isLocal: false }));
              const primaryEntry = imageEntries.find(e => e.url === v.primaryImage) ?? imageEntries[0];
              return {
                id: uid(),
                existingId: v.id,
                attrValues: v.variantAttributes ?? {},
                unitPrice: v.unitPrice != null ? String(v.unitPrice) : '',
                costPrice: v.costPrice != null ? String(v.costPrice) : '',
                sku: v.sku ?? '',
                initQty: '',
                locationId: '',
                images: imageEntries,
                primaryImageId: primaryEntry?.id ?? null,
              };
            })
          );
        }
      } else {
        toast.error('Product not found');
        navigate(-1);
      }
      setPageLoading(false);
    };
    load();
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedTypes = variantTypes.filter(vt => selectedTypeIds.includes(vt.id));

  const searchCategories = useCallback(async (search: string) => {
    const q = search.trim();
    if (!q) return [];
    const response = await categoryHook.getAllCategories({
      search: q,
      limit: 20,
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    return toCategoryOptions(response?.data);
  }, [categoryHook]);

  // ─── Section helpers ─────────────────────────────────────────────────────────
  const toggle = (id: SectionId) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── Tag helpers ─────────────────────────────────────────────────────────────
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,$/, '');
      if (newTag && !tags.includes(newTag)) setTags(prev => [...prev, newTag]);
      setTagInput('');
    }
  };
  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  // ─── Image helpers ────────────────────────────────────────────────────────────
  const addImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    try { new URL(url); } catch { toast.error('Please enter a valid URL'); return; }
    const entry: ImageEntry = { id: uid(), url, preview: url, isLocal: false };
    setImages(prev => {
      const next = [...prev, entry];
      if (!primaryImageId) setPrimaryImageId(entry.id);
      return next;
    });
    setImageUrlInput('');
  };

  const handleFileDrop = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const available = 5 - images.length;
    if (available <= 0) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    const incoming = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, available);
    if (incoming.length === 0) return;

    const placeholders: ImageEntry[] = incoming.map(f => ({
      id: uid(),
      url: '',
      preview: URL.createObjectURL(f),
      isLocal: true,
      isUploading: true,
    }));
    setImages(prev => {
      const next = [...prev, ...placeholders];
      if (!primaryImageId) setPrimaryImageId(placeholders[0].id);
      return next;
    });

    try {
      const compressed = await Promise.all(incoming.map(f => compressImageToWebP(f)));
      const urls = await uploadProductImages(compressed);

      setImages(prev =>
        prev.map(img => {
          const idx = placeholders.findIndex(p => p.id === img.id);
          if (idx === -1 || urls[idx] === undefined) return img;
          URL.revokeObjectURL(img.preview);
          return { ...img, url: urls[idx], preview: urls[idx], isLocal: false, isUploading: false };
        })
      );
    } catch {
      toast.error('Failed to upload image(s). Please try again.');
      setImages(prev => {
        const ids = new Set(placeholders.map(p => p.id));
        prev.filter(img => ids.has(img.id)).forEach(img => URL.revokeObjectURL(img.preview));
        return prev.filter(img => !ids.has(img.id));
      });
    }
  }, [images.length, primaryImageId, uploadProductImages]);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileDrop(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const next = prev.filter(img => img.id !== id);
      if (primaryImageId === id) setPrimaryImageId(next[0]?.id ?? null);
      return next;
    });
  };

  // ─── Variant type toggle ──────────────────────────────────────────────────────
  const toggleVariantType = (id: string) => {
    setSelectedTypeIds(prev => {
      if (prev.includes(id)) {
        const removed = variantTypes.find(vt => vt.id === id);
        if (removed) {
          setVariantRows(rows =>
            rows.map(r => {
              const a = { ...r.attrValues };
              delete a[removed.name];
              return { ...r, attrValues: a };
            })
          );
        }
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  // ─── Variant row helpers ──────────────────────────────────────────────────────
  const addVariantRow = () => {
    const row: VariantRow = {
      id: uid(),
      attrValues: {},
      unitPrice: unitPrice || '',
      costPrice: costPrice || '',
      sku: '',
      initQty: '',
      locationId: locations[0]?.id || '',
      images: [],
      primaryImageId: null,
    };
    setVariantRows(prev => [...prev, row]);
  };

  const updateVariantRow = (id: string, patch: Partial<VariantRow>) => {
    setVariantRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const updateVariantAttr = (rowId: string, attrName: string, value: string) => {
    setVariantRows(prev =>
      prev.map(r =>
        r.id === rowId
          ? { ...r, attrValues: { ...r.attrValues, [attrName]: value } }
          : r
      )
    );
  };

  const removeVariantRow = (id: string) => {
    setVariantRows(prev => prev.filter(r => r.id !== id));
  };

  const removeVariantImage = (rowId: string, imgId: string) => {
    setVariantRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const next = r.images.filter(img => img.id !== imgId);
      return { ...r, images: next, primaryImageId: r.primaryImageId === imgId ? (next[0]?.id ?? null) : r.primaryImageId };
    }));
  };

  const handleVariantFileDrop = useCallback(async (rowId: string, files: FileList | null) => {
    if (!files) return;
    const row = variantRows.find(r => r.id === rowId);
    if (!row) return;
    const available = 5 - row.images.length;
    if (available <= 0) { toast.error('Maximum 5 images per variant'); return; }
    const incoming = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, available);
    if (incoming.length === 0) return;

    const placeholders: ImageEntry[] = incoming.map(f => ({
      id: uid(), url: '', preview: URL.createObjectURL(f), isLocal: true, isUploading: true,
    }));
    setVariantRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const newImages = [...r.images, ...placeholders];
      return { ...r, images: newImages, primaryImageId: r.primaryImageId ?? (placeholders[0]?.id ?? null) };
    }));

    try {
      const compressed = await Promise.all(incoming.map(f => compressImageToWebP(f)));
      const urls = await uploadProductImages(compressed);
      setVariantRows(prev => prev.map(r => {
        if (r.id !== rowId) return r;
        const updatedImages = r.images.map(img => {
          const idx = placeholders.findIndex(p => p.id === img.id);
          if (idx === -1 || urls[idx] === undefined) return img;
          URL.revokeObjectURL(img.preview);
          return { ...img, url: urls[idx], preview: urls[idx], isLocal: false, isUploading: false };
        });
        return { ...r, images: updatedImages };
      }));
    } catch {
      toast.error('Failed to upload variant image(s). Please try again.');
      setVariantRows(prev => prev.map(r => {
        if (r.id !== rowId) return r;
        const ids = new Set(placeholders.map(p => p.id));
        r.images.filter(img => ids.has(img.id)).forEach(img => URL.revokeObjectURL(img.preview));
        return { ...r, images: r.images.filter(img => !ids.has(img.id)) };
      }));
    }
  }, [variantRows, uploadProductImages]);

  // ─── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!unitPrice || isNaN(Number(unitPrice)) || Number(unitPrice) < 0)
      errs.unitPrice = 'Valid unit price is required';
    if (hasVariants && variantRows.length === 0)
      errs.variants = 'Add at least one variant or disable the variants toggle';
    variantRows.forEach((row, i) => {
      if (!row.unitPrice || isNaN(Number(row.unitPrice)))
        errs[`variant_${i}_price`] = `Variant ${i + 1}: unit price required`;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!productId) return;
    if (!validate()) {
      toast.error('Please fix the errors before saving');
      return;
    }
    setSaving(true);
    try {
      if (images.some(i => i.isUploading) || variantRows.some(r => r.images.some(i => i.isUploading))) {
        toast.error('Please wait for images to finish uploading');
        setSaving(false);
        return;
      }
      const imageUrls = images.filter(i => !i.isLocal && i.url).map(i => i.url);
      const primaryEntry = images.find(i => i.id === primaryImageId);
      const primaryUrl = primaryEntry && !primaryEntry.isLocal ? primaryEntry.url : imageUrls[0];

      // 1. Update parent product
      await productHook.updateProduct({
        id: productId,
        name: name.trim(),
        unitPrice: Number(unitPrice),
        ...(description && { description }),
        ...(categoryId && { categoryId }),
        ...(brand && { brand }),
        ...(model && { model }),
        ...(sku && { sku }),
        ...(barcode && { barcode }),
        ...(costPrice && { costPrice: Number(costPrice) }),
        ...(wholesalePrice && { wholesalePrice: Number(wholesalePrice) }),
        ...(minStockLevel && { minStockLevel: Number(minStockLevel) }),
        ...(maxStockLevel && { maxStockLevel: Number(maxStockLevel) }),
        ...(reorderLevel && { reorderLevel: Number(reorderLevel) }),
        ...(reorderQuantity && { reorderQuantity: Number(reorderQuantity) }),
        ...(tags.length > 0 && { tags }),
        ...(imageUrls.length > 0 && { images: imageUrls }),
        ...(primaryUrl && { primaryImage: primaryUrl }),
        hasVariants: hasVariants && variantRows.length > 0 && !isReload,
        isService,
        isReload,
        ...(hasVariants && selectedTypeIds.length > 0 && {
          customAttributes: { variantTypeIds: selectedTypeIds },
        }),
      });

      // 2. Update existing variants / create new ones
      if (hasVariants && variantRows.length > 0) {
        for (const row of variantRows) {
          const variantName = Object.values(row.attrValues).filter(Boolean).join(' / ') || 'Variant';
          if (row.existingId) {
            const varImgUrls = row.images.filter(i => !i.isLocal && i.url).map(i => i.url);
            const varPrimaryEntry = row.images.find(i => i.id === row.primaryImageId);
            const varPrimaryUrl = (varPrimaryEntry && !varPrimaryEntry.isLocal) ? varPrimaryEntry.url : varImgUrls[0];
            await productHook.updateProduct({
              id: row.existingId,
              name: `${name.trim()} - ${variantName}`,
              unitPrice: Number(row.unitPrice),
              ...(row.costPrice && { costPrice: Number(row.costPrice) }),
              ...(row.sku && { sku: row.sku }),
              variantAttributes: row.attrValues,
              ...(varImgUrls.length > 0 && { images: varImgUrls }),
              ...(varPrimaryUrl && { primaryImage: varPrimaryUrl }),
            });
          } else {
            const varImgUrls = row.images.filter(i => !i.isLocal && i.url).map(i => i.url);
            const varPrimaryEntry = row.images.find(i => i.id === row.primaryImageId);
            const varPrimaryUrl = (varPrimaryEntry && !varPrimaryEntry.isLocal) ? varPrimaryEntry.url : varImgUrls[0];
            const variantRes = await productHook.createProduct({
              name: `${name.trim()} - ${variantName}`,
              unitPrice: Number(row.unitPrice),
              ...(row.costPrice && { costPrice: Number(row.costPrice) }),
              ...(row.sku && { sku: row.sku }),
              parentProductId: productId,
              variantAttributes: row.attrValues,
              hasVariants: false,
              ...(categoryId && { categoryId }),
              ...(brand && { brand }),
              ...(model && { model }),
              isActive: true,
              ...(varImgUrls.length > 0 && { images: varImgUrls }),
              ...(varPrimaryUrl && { primaryImage: varPrimaryUrl }),
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const variantId = (variantRes as any)?.data?.id;
            if (variantId && row.locationId && Number(row.initQty) > 0) {
              await productHook.adjustProductStock({
                productId: variantId,
                branchId: row.locationId,
                quantity: Number(row.initQty),
                type: 'IN',
                reason: 'Initial stock',
              });
            }
          }
        }
      }

      toast.success('Product updated successfully!');
      navigate(-1);
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Add stock handler ────────────────────────────────────────────────────────
  const handleAddStock = async () => {
    const qty = Number(addStockQty);
    if (!productId) {
      toast.error('Save the product before adding stock');
      return;
    }
    if (!addStockLocationId) {
      toast.error('Select a location to add stock to');
      return;
    }
    if (!qty || qty <= 0) {
      toast.error('Enter a quantity greater than 0');
      return;
    }
    setAddingStock(true);
    try {
      const res = await productHook.adjustProductStock({
        productId,
        branchId: addStockLocationId,
        quantity: qty,
        type: 'IN',
        reason: addStockNote.trim() || 'Stock added',
      });
      if (res?.success) {
        toast.success(`Added ${qty} unit(s) to stock`);
        setAddStockQty('');
        setAddStockNote('');
      }
    } catch (err) {
      console.error('Failed to add stock:', err);
      toast.error('Could not add stock. Please try again.');
    } finally {
      setAddingStock(false);
    }
  };

  // ─── Attr input renderer ──────────────────────────────────────────────────────
  const renderAttrInput = (vt: ProductVariantType, row: VariantRow) => {
    const val = row.attrValues[vt.name] || '';
    const options = Array.isArray(vt.options) ? vt.options : [];
    if (vt.inputType === 'select' && options.length) {
      return (
        <select
          value={val}
          onChange={e => updateVariantAttr(row.id, vt.name, e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">{vt.displayName}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (vt.inputType === 'color_picker') {
      return options.length ? (
        <select
          value={val}
          onChange={e => updateVariantAttr(row.id, vt.name, e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">Color</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type="text"
          value={val}
          onChange={e => updateVariantAttr(row.id, vt.name, e.target.value)}
          placeholder={vt.displayName}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      );
    }
    return (
      <input
        type="text"
        value={val}
        onChange={e => updateVariantAttr(row.id, vt.name, e.target.value)}
        placeholder={vt.displayName}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <span className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading product…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Edit Product</h1>
            {name && <p className="text-xs text-gray-500 truncate max-w-xs">{name}</p>}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Update Product
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left: form sections ── */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* ── Basic Info ── */}
          <Section id="basic" collapsed={collapsed.basic} onToggle={() => toggle('basic')}>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Product Name" required error={errors.name}>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Samsung Galaxy S24"
                    className={inputCls + (errors.name ? ' border-red-400' : '')}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Optional product description…"
                    className={inputCls + ' resize-none'}
                  />
                </Field>
              </div>
              <Field label="Category">
                <AsyncSearchSelect<Category>
                  value={selectedCategory}
                  onSelect={(cat) => {
                    setSelectedCategory(cat);
                    setCategoryId(cat?.id ?? '');
                  }}
                  fetcher={searchCategories}
                  getOptionLabel={(c) => c.name}
                  getOptionKey={(c) => c.id}
                  placeholder="Type to search category..."
                  minChars={1}
                  minCharsMessage="Type a category name to search"
                  emptyMessage="No categories found"
                />
              </Field>
              <Field label="Brand">
                <input
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  placeholder="e.g. Samsung"
                  className={inputCls}
                />
              </Field>
              <Field label="Model">
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="e.g. S24 Ultra"
                  className={inputCls}
                />
              </Field>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsService(false);
                      setIsReload(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      !isService && !isReload
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    Physical Product
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsService(true);
                      setIsReload(false);
                      setHasVariants(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isService
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    Service
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsService(false);
                      setIsReload(true);
                      setHasVariants(false);
                      if (!unitPrice) setUnitPrice('1');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isReload
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-300'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Reload
                  </button>
                  {isService && (
                    <span className="text-xs text-indigo-600 font-medium">
                      No inventory tracking — always available in POS
                    </span>
                  )}
                  {isReload && (
                    <span className="text-xs text-emerald-700 font-medium">
                      Credit balance pool — inventory amount is LKR balance
                    </span>
                  )}
                </div>
              </div>

              <Field label="Tags">
                <div className="flex flex-wrap gap-1.5 items-center min-h-9.5 px-3 py-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-400 bg-white">
                  {tags.map(t => (
                    <span
                      key={t}
                      className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {t}
                      <button type="button" onClick={() => removeTag(t)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? 'Type a tag, press Enter…' : ''}
                    className="flex-1 min-w-30 text-sm outline-none bg-transparent"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a tag</p>
              </Field>
            </div>
          </Section>

          {/* ── Pricing & Identifiers ── */}
          <Section id="pricing" collapsed={collapsed.pricing} onToggle={() => toggle('pricing')}>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label={isReload ? 'Price per LKR (usually 1)' : 'Unit Price (Selling)'} required error={errors.unitPrice}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={e => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className={inputCls + ' pl-7' + (errors.unitPrice ? ' border-red-400' : '')}
                  />
                </div>
              </Field>
              <Field label="Cost Price">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className={inputCls + ' pl-7'}
                  />
                </div>
              </Field>
              <Field label="Wholesale Price">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={wholesalePrice}
                    onChange={e => setWholesalePrice(e.target.value)}
                    placeholder="0.00"
                    className={inputCls + ' pl-7'}
                  />
                </div>
              </Field>
              <Field label="SKU">
                <input
                  type="text"
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  placeholder="Stock Keeping Unit"
                  className={inputCls}
                />
              </Field>
              <Field label="Barcode">
                <input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  placeholder="Scan or type barcode"
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* ── Images ── */}
          <Section id="images" collapsed={collapsed.images} onToggle={() => toggle('images')}>
            <div className="mt-4 space-y-4">
              {/* Drag & Drop area */}
              <div
                onDragOver={images.length < 5 ? onDragOver : undefined}
                onDragLeave={images.length < 5 ? onDragLeave : undefined}
                onDrop={images.length < 5 ? onDrop : undefined}
                onClick={() => images.length < 5 && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 transition-colors ${
                  images.length >= 5
                    ? 'border-white/20 bg-white/20 opacity-50 cursor-not-allowed'
                    : isDragOver
                    ? 'border-orange-400 bg-orange-50/60 cursor-pointer'
                    : 'border-white/40 bg-white/20 hover:border-orange-400 hover:bg-orange-50/30 cursor-pointer'
                }`}
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <p className="text-sm text-gray-600 font-medium">
                  {images.length >= 5
                    ? 'Maximum 5 images reached'
                    : <>Drop images here or <span className="text-orange-500">click to browse</span></>}
                </p>
                <p className="text-xs text-gray-400">
                  {images.length < 5
                    ? `${images.length}/5 images · JPEG, PNG, WebP — compressed to WebP before upload`
                    : `Remove an image to add more`}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={images.length >= 5}
                onChange={e => { handleFileDrop(e.target.files); e.target.value = ''; }}
              />

              {/* URL input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={e => setImageUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addImageUrl()}
                    placeholder="Paste image URL (https://…)"
                    className={inputCls + ' pl-9'}
                  />
                </div>
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Add URL
                </button>
              </div>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {images.map(img => (
                    <div
                      key={img.id}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-colors ${
                        primaryImageId === img.id
                          ? 'border-orange-400'
                          : 'border-white/30 hover:border-orange-200'
                      }`}
                    >
                      <img
                        src={img.preview}
                        alt=""
                        className="w-full aspect-square object-cover"
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://placehold.co/100x100?text=No+Preview';
                        }}
                      />
                      {img.isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                          <svg className="animate-spin w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span className="text-[10px] text-white font-medium">Uploading…</span>
                        </div>
                      )}
                      {primaryImageId === img.id && !img.isUploading && (
                        <span className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] rounded px-1 py-0.5 font-medium">
                          Primary
                        </span>
                      )}
                      {!img.isUploading && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setPrimaryImageId(img.id)}
                            title="Set as primary"
                            className="p-1.5 bg-white/90 rounded-full text-orange-600 hover:bg-white"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            title="Remove"
                            className="p-1.5 bg-white/90 rounded-full text-red-500 hover:bg-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* ── Inventory Settings ── */}
          <Section id="inventory" collapsed={collapsed.inventory} onToggle={() => toggle('inventory')}>
            {isService ? (
              <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                <Wrench className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Service Product — No Inventory Required</p>
                  <p className="text-xs text-indigo-600 mt-0.5">Service products are always considered available and do not consume physical stock.</p>
                </div>
              </div>
            ) : isReload ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <Smartphone className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Reload Product — Credit Balance Pool</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Inventory stores whole-LKR credit. POS reload sales deduct the sold amount from this balance.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label="Min Balance (LKR)">
                    <input
                      type="number"
                      min="0"
                      value={minStockLevel}
                      onChange={e => setMinStockLevel(e.target.value)}
                      placeholder="0"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Reorder Level (LKR)">
                    <input
                      type="number"
                      min="0"
                      value={reorderLevel}
                      onChange={e => setReorderLevel(e.target.value)}
                      placeholder="0"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            ) : (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Min Stock Level">
                <input
                  type="number"
                  min="0"
                  value={minStockLevel}
                  onChange={e => setMinStockLevel(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </Field>
              <Field label="Max Stock Level">
                <input
                  type="number"
                  min="0"
                  value={maxStockLevel}
                  onChange={e => setMaxStockLevel(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </Field>
              <Field label="Reorder Level">
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={e => setReorderLevel(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </Field>
              <Field label="Reorder Qty">
                <input
                  type="number"
                  min="0"
                  value={reorderQuantity}
                  onChange={e => setReorderQuantity(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </Field>
            </div>
            )}

            {/* ── Add Stock ── */}
            {!isService && (
              <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                <p className="text-sm font-semibold text-gray-800">
                  {isReload ? 'Add Credit Amount' : 'Add Stock'}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {isReload
                    ? 'Add reload credit (LKR) for a location. This records a stock-in movement immediately.'
                    : 'Add on-hand quantity for a location. This records a stock-in movement immediately.'}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <Field label="Store at (Warehouse / Branch)">
                    <select
                      value={addStockLocationId}
                      onChange={e => setAddStockLocationId(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select location</option>
                      {locations.map(l => {
                        const t = (((l as any).locationType || (l as any).type || '') as string).toUpperCase();
                        const label = t === 'WAREHOUSE' ? 'Warehouse' : t === 'BRANCH' ? 'Branch' : ((l as any).locationType || (l as any).type || 'Location');
                        return (
                          <option key={l.id} value={l.id}>
                            {l.name}{l.code ? ` (${l.code})` : ''} — {label}
                          </option>
                        );
                      })}
                    </select>
                  </Field>
                  <Field label={isReload ? 'Amount to add (LKR)' : 'Quantity to add'}>
                    <input
                      type="number"
                      min="1"
                      value={addStockQty}
                      onChange={e => setAddStockQty(e.target.value)}
                      placeholder="0"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Note (optional)">
                    <input
                      type="text"
                      value={addStockNote}
                      onChange={e => setAddStockNote(e.target.value)}
                      placeholder="e.g. Supplier delivery"
                      className={inputCls}
                    />
                  </Field>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddStock}
                      disabled={addingStock}
                      className="h-[42px] w-full rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingStock ? 'Adding…' : isReload ? 'Add Credit' : 'Add Stock'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* ── Variants ── */}
          {!isReload && (
          <Section id="variants" collapsed={collapsed.variants} onToggle={() => toggle('variants')}>
            <div className="mt-4 space-y-5">
              {/* Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setHasVariants(v => !v);
                    if (hasVariants) {
                      setVariantRows([]);
                      setSelectedTypeIds([]);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    hasVariants ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      hasVariants ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  This product has variants (e.g. different colors or sizes)
                </span>
              </div>

              {hasVariants && (
                <>
                  {/* Variant type chips */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Select variant types:
                    </p>
                    {variantTypes.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        No variant types configured. Go to{' '}
                        <span className="text-orange-500 font-medium">Variant Types</span>{' '}
                        to create them.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {variantTypes.map(vt => (
                          <button
                            key={vt.id}
                            type="button"
                            onClick={() => toggleVariantType(vt.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                              selectedTypeIds.includes(vt.id)
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-orange-400'
                            }`}
                          >
                            <Tag className="w-3 h-3" />
                            {vt.displayName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {errors.variants && (
                    <p className="text-sm text-red-500">{errors.variants}</p>
                  )}

                  {/* Variant rows */}
                  {selectedTypeIds.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">
                          Variant rows ({variantRows.length})
                        </p>
                        <button
                          type="button"
                          onClick={addVariantRow}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg border border-orange-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Variant
                        </button>
                      </div>

                      {variantRows.length === 0 && (
                        <div className="text-center py-8 bg-white/20 backdrop-blur-sm rounded-xl border border-dashed border-white/40">
                          <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Click <strong>Add Variant</strong> to create a variant row
                          </p>
                        </div>
                      )}

                      {variantRows.map((row, rowIdx) => (
                        <div
                          key={row.id}
                          className="bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Variant {rowIdx + 1}
                              {row.existingId
                                ? <span className="ml-1.5 text-blue-500 normal-case font-normal">(existing)</span>
                                : <span className="ml-1.5 text-green-500 normal-case font-normal">(new)</span>
                              }
                            </span>
                            <button
                              type="button"
                              onClick={() => removeVariantRow(row.id)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Attribute inputs */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {selectedTypes.map(vt => (
                              <div key={vt.id}>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  {vt.displayName}
                                </label>
                                {renderAttrInput(vt, row)}
                              </div>
                            ))}
                          </div>

                          {/* Price / SKU */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Unit Price <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.unitPrice}
                                  onChange={e => updateVariantRow(row.id, { unitPrice: e.target.value })}
                                  placeholder="0.00"
                                  className="w-full pl-5 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                              </div>
                              {errors[`variant_${rowIdx}_price`] && (
                                <p className="text-xs text-red-500 mt-0.5">
                                  {errors[`variant_${rowIdx}_price`]}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Cost Price</label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.costPrice}
                                  onChange={e => updateVariantRow(row.id, { costPrice: e.target.value })}
                                  placeholder="0.00"
                                  className="w-full pl-5 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">SKU</label>
                              <input
                                type="text"
                                value={row.sku}
                                onChange={e => updateVariantRow(row.id, { sku: e.target.value })}
                                placeholder="Optional"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                              />
                            </div>
                            {!row.existingId && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Initial Stock Qty</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={row.initQty}
                                  onChange={e => updateVariantRow(row.id, { initQty: e.target.value })}
                                  placeholder="0"
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                              </div>
                            )}
                          </div>

                          {/* Location for initial stock (new variants only) */}
                          {!row.existingId && Number(row.initQty) > 0 && (
                            <div className="max-w-xs">
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Stock Location
                              </label>
                              <select
                                value={row.locationId}
                                onChange={e => updateVariantRow(row.id, { locationId: e.target.value })}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                              >
                                <option value="">Select location</option>
                                {locations.map(l => (
                                  <option key={l.id} value={l.id}>
                                    {l.name}{l.code ? ` (${l.code})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Variant Images */}
                          <div className="space-y-2 pt-1 border-t border-white/20">
                            <div className="flex items-center gap-1.5">
                              <Image className="w-3.5 h-3.5 text-gray-400" />
                              <label className="text-xs font-medium text-gray-500">
                                Variant Images ({row.images.length}/5)
                              </label>
                            </div>

                            {row.images.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {row.images.map(img => (
                                  <div key={img.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/30 bg-white/20 shrink-0">
                                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                                    {img.isUploading ? (
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => removeVariantImage(row.id, img.id)}
                                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                        {row.primaryImageId === img.id ? (
                                          <div className="absolute bottom-0 left-0 right-0 bg-orange-500/80 text-white text-[8px] text-center py-0.5 leading-tight">
                                            Primary
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setVariantRows(prev => prev.map(r => r.id === row.id ? { ...r, primaryImageId: img.id } : r))}
                                            className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] text-center py-0.5 leading-tight opacity-0 hover:opacity-100 transition-opacity"
                                          >
                                            Set primary
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {row.images.length < 5 && (
                              <>
                                <div
                                  onClick={() => document.getElementById(`variant-file-${row.id}`)?.click()}
                                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50/30 cursor-pointer transition-colors"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  Click to upload images ({5 - row.images.length} remaining)
                                </div>
                                <input
                                  id={`variant-file-${row.id}`}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={e => { handleVariantFileDrop(row.id, e.target.files); e.target.value = ''; }}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {variantRows.length > 0 && (
                        <button
                          type="button"
                          onClick={addVariantRow}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-orange-600 border border-dashed border-orange-300 rounded-xl hover:bg-orange-50 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Another Variant
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </Section>
          )}
        </div>

        {/* ── Right: summary card ── */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0">
          <div className="sticky top-20 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 text-sm">Product Summary</h3>

            {/* Preview image */}
            {images.length > 0 ? (
              <img
                src={images.find(i => i.id === primaryImageId)?.preview || images[0]?.preview}
                alt="Product preview"
                className="w-full aspect-square object-cover rounded-lg border border-white/30"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://placehold.co/300x300?text=No+Preview';
                }}
              />
            ) : (
              <div className="w-full aspect-square bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
                <Image className="w-10 h-10 text-gray-300" />
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium text-gray-800 text-right max-w-40 truncate">
                  {name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unit Price</span>
                <span className="font-medium text-gray-800">
                  {unitPrice ? formatCurrency(Number(unitPrice)) : '—'}
                </span>
              </div>
              {costPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cost Price</span>
                  <span className="font-medium text-gray-800">{formatCurrency(Number(costPrice))}</span>
                </div>
              )}
              {categoryId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium text-gray-800 text-right max-w-35 truncate">
                    {selectedCategory?.name || '—'}
                  </span>
                </div>
              )}
              {brand && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Brand</span>
                  <span className="font-medium text-gray-800">{brand}</span>
                </div>
              )}
              {hasVariants && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Variants</span>
                  <span className="font-medium text-orange-600">{variantRows.length} row(s)</span>
                </div>
              )}
              {images.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Images</span>
                  <span className="font-medium text-gray-800">{images.length}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating…
                  </>
                ) : (
                  'Update Product'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
