/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Barcode,
  Tag,
  FileText,
  Download,
  Printer,
  RefreshCw,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckSquare,
  Square,
  Settings2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import useProduct from '../../hooks/useProduct';
import type { ProductItem } from '../../hooks/useProduct';

// ── Types ──────────────────────────────────────────────────────────────────

type LabelMode =
  | 'barcode-only'
  | 'label-only'
  | 'label-with-barcode'
  | 'label-with-qr'
  | 'label-with-both'
  | 'label-with-barcode-styled';

type PageSize = 'A4' | 'A5' | 'letter' | 'custom';

interface LabelOptions {
  labelMode: LabelMode;
  pageSize: PageSize;
  width: number;
  height: number;
  columns: number;
  barcodeType: string;
  showProductName: boolean;
  showPrice: boolean;
  showProductCode: boolean;
  showBrand: boolean;
  showWooCommerceId: boolean;
}

interface SelectedProduct {
  product: ProductItem;
  quantity: number;
}

// ── Preset sizes (mm) ──────────────────────────────────────────────────────

const SIZE_PRESETS: { label: string; width: number; height: number; columns: number }[] = [
  { label: '70×25 mm (Print Barcode)', width: 70, height: 25, columns: 1 },
  { label: '35×20 mm (Short Code)', width: 35, height: 20, columns: 1 },
  { label: '30×20 mm (Compact)', width: 30, height: 20, columns: 1 },
  { label: '20×30 mm (Thermal Roll)', width: 20, height: 30, columns: 1 },
  { label: '50×25 mm (Standard)', width: 50, height: 25, columns: 2 },
  { label: '40×25 mm (Small)',    width: 40, height: 25, columns: 3 },
  { label: '100×50 mm (Large)',   width: 100, height: 50, columns: 1 },
  { label: '4×6 in (Large Label)', width: 152.4, height: 101.6, columns: 1 },
  { label: '38×19 mm (Tiny)',     width: 38, height: 19, columns: 3 },
  { label: 'Custom',              width: 0,  height: 0,  columns: 1 },
];

const CUSTOM_PRESET_IDX = SIZE_PRESETS.length - 1;

/** Ensure API payload uses valid numeric dimensions from the current UI state. */
function normalizePrintOptions(
  options: LabelOptions,
  extra?: { labelSpacing?: number }
): LabelOptions & { labelSpacing?: number } {
  const width = Math.max(10, Math.min(300, Number(options.width) || 70));
  const height = Math.max(10, Math.min(300, Number(options.height) || 25));
  const columns = Math.max(1, Math.min(10, Number(options.columns) || 1));
  return { ...options, ...extra, width, height, columns };
}

const LABEL_MODE_OPTIONS: { value: LabelMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'barcode-only',
    label: 'Barcode Only',
    icon: <Barcode className="w-4 h-4" />,
    description: 'Just the barcode image, no text',
  },
  {
    value: 'label-only',
    label: 'Label Only',
    icon: <Tag className="w-4 h-4" />,
    description: 'Text info, no barcode image',
  },
  {
    value: 'label-with-barcode',
    label: 'Label + Barcode',
    icon: <FileText className="w-4 h-4" />,
    description: 'Text with Code128 barcode',
  },
  {
    value: 'label-with-barcode-styled',
    label: 'Label + Barcode + Style',
    icon: <Zap className="w-4 h-4" />,
    description: 'Styled label with branding header & price band',
  },
  // {
  //   value: 'label-with-qr',
  //   label: 'Label + QR Code',
  //   icon: <QrCode className="w-4 h-4" />,
  //   description: 'Text with QR code',
  // },
  // {
  //   value: 'label-with-both',
  //   label: 'Label + Barcode + QR',
  //   icon: <Layers className="w-4 h-4" />,
  //   description: 'Text with both barcode and QR',
  // },
];

const BARCODE_TYPES = [
  { value: 'code128', label: 'Code 128 (recommended)' },
  { value: 'code39',  label: 'Code 39' },
  { value: 'ean13',   label: 'EAN-13' },
  { value: 'upca',    label: 'UPC-A' },
  { value: 'qrcode',  label: 'QR Code (as 1D)' },
];

// ── Label Preview (visual mock) ─────────────────────────────────────────────

function LabelPreview({ options, product }: { options: LabelOptions; product?: ProductItem | null }) {
  const isStyled    = options.labelMode === 'label-with-barcode-styled';
  const showBarcode = options.labelMode === 'label-with-barcode' || options.labelMode === 'barcode-only' || options.labelMode === 'label-with-both' || options.labelMode === 'label-with-barcode-styled';
  const showQR      = options.labelMode === 'label-with-qr' || options.labelMode === 'label-with-both';
  const showText    = options.labelMode !== 'barcode-only';

  // Scale the label preview to fit the card (max 280px wide)
  const scale = Math.min(280 / (options.width || 50), 200 / (options.height || 25));
  const previewW = (options.width || 50) * scale;
  const previewH = (options.height || 25) * scale;
  const headerH  = Math.max(16, previewH * 0.18);

  if (isStyled) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-gray-500">Label Preview ({options.width}×{options.height} mm)</p>
        <div
          style={{ width: previewW, height: previewH, minHeight: 64 }}
          className="border-2 border-blue-900 rounded-sm bg-white flex flex-col overflow-hidden shadow-md"
        >
          <div
            className="flex items-center justify-between px-1 bg-blue-900 shrink-0"
            style={{ height: headerH }}
          >
            <div className="w-3.5 h-3.5 rounded-sm bg-white flex items-center justify-center shrink-0">
              <span className="text-blue-900 font-bold leading-none" style={{ fontSize: 6 }}>B</span>
            </div>
            <span className="text-white font-bold truncate ml-1" style={{ fontSize: 6 }}>Your Business</span>
          </div>
          <div className="flex flex-col flex-1 px-1 py-0.5 gap-0.5 overflow-hidden items-center">
            {showText && (
              <>
                {options.showProductName && (
                  <p className="text-[8px] font-bold text-gray-800 truncate leading-tight text-center w-full">
                    {product?.name || 'Product Name'}
                  </p>
                )}
                {options.showBrand && (
                  <p className="text-[7px] text-gray-400 truncate leading-tight text-center w-full">
                    {product?.brand || 'Brand'}
                  </p>
                )}
              </>
            )}
            {showBarcode && (
              <div className="flex items-end gap-px my-0.5 justify-center">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} style={{ width: i % 3 === 0 ? 2 : 1, height: 10 }}
                    className={`${[0, 3, 6, 11, 16, 21, 26].includes(i) ? 'bg-white' : 'bg-gray-900'} shrink-0`} />
                ))}
              </div>
            )}
            {showText && options.showProductCode && (
              <p className="text-[5px] text-gray-400 truncate leading-tight text-center w-full mt-auto">
                SKU: {product?.productCode || 'PRD-001'}
              </p>
            )}
          </div>
          {options.showPrice && (
            <div
              className="flex items-center justify-center shrink-0 bg-amber-400"
              style={{ height: Math.max(14, previewH * 0.18) }}
            >
              <p className="text-white font-bold leading-tight text-center" style={{ fontSize: 9 }}>
                Rs. {product?.unitPrice || '0.00'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-gray-500">Label Preview ({options.width}×{options.height} mm)</p>
      <div
        style={{ width: previewW, height: previewH, minHeight: 64 }}
        className="border border-gray-300 rounded bg-white flex flex-col overflow-hidden shadow"
      >
        {/* Label body */}
        <div className="flex flex-col flex-1 px-1 py-0.5 gap-0.5 overflow-hidden">
          {showText && (
            <>
              {options.showProductName && (
                <p className="text-[8px] font-bold text-gray-800 truncate leading-tight">
                  {product?.name || 'Product Name'}
                </p>
              )}
              {options.showBrand && (
                <p className="text-[7px] text-gray-500 truncate leading-tight">
                  {product?.brand || 'Brand'}
                </p>
              )}
              {options.showWooCommerceId && (
                <p className="text-[6px] text-orange-700 truncate leading-tight">
                  WC#{(product as any)?.woocommerceId || '12345'}
                </p>
              )}
            </>
          )}

          {showBarcode && (
            <div className="flex items-end gap-px my-0.5 w-full justify-center">
              {Array.from({ length: 46 }).map((_, i) => (
                <div
                  key={i}
                  style={{ width: i % 3 === 0 ? 2 : 1, height: options.labelMode === 'barcode-only' ? previewH * 0.7 : Math.max(18, previewH * 0.32) }}
                  className={`${[0, 3, 6, 11, 16, 21, 26].includes(i) ? 'bg-white' : 'bg-gray-900'} shrink-0`}
                />
              ))}
            </div>
          )}

          {showQR && (
            <div
              style={{ width: 18, height: 18 }}
              className="bg-gray-800 inline-flex items-center justify-center shrink-0 self-start"
            >
              <div className="grid grid-cols-3 gap-0.5 p-0.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-800'} w-1 h-1`} />
                ))}
              </div>
            </div>
          )}

          {showText && (
            <div className="flex flex-col mt-auto gap-0.5">
              {options.showProductCode && (
                <p className="text-[6px] text-gray-600 truncate leading-tight">
                  Code: {product?.productCode || 'PRD-001'}
                </p>
              )}
              {options.showPrice && (
                <p className="text-[10px] font-bold text-gray-900 text-center leading-tight">
                  Rs. {product?.unitPrice || '0.00'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function BarcodeGeneratorPage() {
  const productHook = useProduct();

  const [allProducts, setAllProducts]         = useState<ProductItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductItem[]>([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [selected, setSelected]               = useState<SelectedProduct[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [initialLoaded, setInitialLoaded]     = useState(false);
  const [generating, setGenerating]           = useState(false);
  const [printing, setPrinting]               = useState(false);
  const [noGapGenerating, setNoGapGenerating] = useState(false);
  const [selectedPage, setSelectedPage]       = useState(1);
  const SELECTED_PER_PAGE = 8;
  const [activePreset, setActivePreset]       = useState(0);
  const [page, setPage]                       = useState(1);
  const [totalPages, setTotalPages]           = useState(1);
  const [perPage, setPerPage]                 = useState(20);

  const [options, setOptions] = useState<LabelOptions>({
    labelMode: 'label-with-barcode',
    pageSize: 'custom',
    width: 70,
    height: 25,
    columns: 1,
    barcodeType: 'code128',
    showProductName: true,
    showPrice: true,
    showProductCode: true,
    showBrand: false,
    showWooCommerceId: false,
  });

  // ── Load products ──────────────────────────────────────────────────────

  const loadProducts = useCallback(async (search = '', pg = 1) => {
    setLoading(true);
    try {
      const res = await productHook.getAllProducts({
        page: pg,
        limit: perPage,
        search: search || undefined,
        isActive: true,
      });
      const respData = (res as any)?.data;
      const list: ProductItem[] = Array.isArray(respData?.products)
        ? respData.products
        : Array.isArray(respData)
        ? respData
        : [];
      setAllProducts(list);
      setFilteredProducts(list);
      const pagination = (res as any)?.pagination;
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
      }
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [productHook, perPage]);

  useEffect(() => {
    loadProducts('', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadProducts(searchQuery, 1);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, perPage]);

  // ── Product selection ──────────────────────────────────────────────────

  const isSelected = (id: string) => selected.some((s) => s.product.id === id);

  const toggleSelect = (product: ProductItem) => {
    if (isSelected(product.id)) {
      setSelected((prev) => prev.filter((s) => s.product.id !== product.id));
    } else {
      setSelected((prev) => [...prev, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelected((prev) =>
      prev.map((s) =>
        s.product.id === productId
          ? { ...s, quantity: Math.max(1, s.quantity + delta) }
          : s
      )
    );
  };

  const setQuantityDirect = (productId: string, val: string) => {
    const n = parseInt(val, 10);
    setSelected((prev) =>
      prev.map((s) =>
        s.product.id === productId
          ? { ...s, quantity: isNaN(n) || n < 1 ? 1 : n }
          : s
      )
    );
  };

  const removeSelected = (productId: string) => {
    setSelected((prev) => prev.filter((s) => s.product.id !== productId));
  };

  const selectAll = () => {
    const newItems = filteredProducts
      .filter((p) => !isSelected(p.id))
      .map((p) => ({ product: p, quantity: 1 }));
    setSelected((prev) => [...prev, ...newItems]);
  };

  const clearAll = () => setSelected([]);

  // ── Preset size handler ────────────────────────────────────────────────

  const applyPreset = (idx: number) => {
    setActivePreset(idx);
    const preset = SIZE_PRESETS[idx];
    if (preset.width <= 0) {
      // Custom: keep user width/height; thermal roll = one label per page
      setOptions((prev) => ({
        ...prev,
        pageSize: 'custom',
        columns: Math.max(1, prev.columns || 1),
      }));
      return;
    }
    const pageSize: PageSize = preset.columns > 1 ? 'A4' : 'custom';
    setOptions((prev) => ({
      ...prev,
      pageSize,
      width: preset.width,
      height: preset.height,
      columns: preset.columns,
    }));
  };

  // ── Generate PDF ───────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (selected.length === 0) {
      toast.error('Select at least one product');
      return;
    }
    setGenerating(true);
    try {
      const items = selected.map((s) => ({ productId: s.product.id, quantity: s.quantity }));
      const modeLabel = LABEL_MODE_OPTIONS.find((m) => m.value === options.labelMode)?.label || 'labels';
      const ok = await productHook.printBarcodeLabels(
        items,
        normalizePrintOptions(options),
        `${modeLabel.replace(/ /g, '-').toLowerCase()}.pdf`
      );
      if (ok) {
        toast.success('PDF downloaded successfully');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ── Print PDF (open in browser tab) ────────────────────────────────────

  const handlePrint = async () => {
    if (selected.length === 0) {
      toast.error('Select at least one product');
      return;
    }
    setPrinting(true);
    try {
      const items = selected.map((s) => ({ productId: s.product.id, quantity: s.quantity }));
      const ok = await productHook.openBarcodeLabelsForPrint(items, normalizePrintOptions(options));
      if (!ok) toast.error('Failed to open PDF for printing');
    } catch {
      toast.error('Failed to open PDF for printing');
    } finally {
      setPrinting(false);
    }
  };

  // ── Download No-Gap PDF ──────────────────────────────────────────────────

  const handleGenerateNoGap = async () => {
    if (selected.length === 0) {
      toast.error('Select at least one product');
      return;
    }
    setNoGapGenerating(true);
    try {
      const items = selected.map((s) => ({ productId: s.product.id, quantity: s.quantity }));
      const ok = await productHook.printBarcodeLabels(
        items,
        normalizePrintOptions(options, { labelSpacing: 0 }),
        'barcode-labels-compact.pdf'
      );
      if (ok) {
        toast.success('Compact PDF downloaded');
      } else {
        toast.error('Failed to generate compact PDF');
      }
    } catch {
      toast.error('Failed to generate compact PDF');
    } finally {
      setNoGapGenerating(false);
    }
  };

  if (!initialLoaded) return <LoadingSpinner />;

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-5 mb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Barcode className="w-6 h-6 text-blue-600" />
            Barcode &amp; Label Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate barcodes, QR codes, and printable labels for your products
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left column: Product selection ─────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Search + select all */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products by name, SKU, barcode…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={selectAll} className="gap-1 whitespace-nowrap">
                  <CheckSquare className="w-4 h-4" /> Select All
                </Button>
                <Button variant="outline" onClick={clearAll} className="gap-1 whitespace-nowrap">
                  <Square className="w-4 h-4" /> Clear
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {selected.length} selected · {filteredProducts.length} products shown
              </p>
            </CardContent>
          </Card>

          {/* Product list */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Barcode</th>
                    <th className="px-3 py-2 hidden sm:table-cell">WC ID</th>
                    <th className="px-3 py-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">No products found</td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const sel = isSelected(product.id);
                      return (
                        <tr
                          key={product.id}
                          onClick={() => toggleSelect(product)}
                          className={`border-b cursor-pointer transition-colors ${
                            sel ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-2">
                            {sel
                              ? <CheckSquare className="w-4 h-4 text-blue-600" />
                              : <Square className="w-4 h-4 text-gray-400" />
                            }
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-900 truncate max-w-45">{product.name}</p>
                            {product.brand && (
                              <p className="text-xs text-gray-500">{product.brand}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">{product.productCode}</td>
                          <td className="px-3 py-2">
                            {product.barcode ? (
                              <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                {product.barcode}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">none</span>
                            )}
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell text-xs text-blue-600">
                            {(product as any).woocommerceId || ' '}
                          </td>
                          <td className="px-3 py-2 text-xs font-medium">
                            Rs.{product.unitPrice}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex flex-wrap justify-between items-center gap-2 p-3 border-t">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Show</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPage(1);
                    setPerPage(Number(e.target.value));
                  }}
                  className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {[5, 10, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => { setPage(page - 1); loadProducts(searchQuery, page - 1); }}
                  >
                    Prev
                  </Button>
                  <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => { setPage(page + 1); loadProducts(searchQuery, page + 1); }}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Selected products with quantities + pagination */}
          {selected.length > 0 && (() => {
            const totalSelPages = Math.ceil(selected.length / SELECTED_PER_PAGE);
            const selStart = (selectedPage - 1) * SELECTED_PER_PAGE;
            const selSlice = selected.slice(selStart, selStart + SELECTED_PER_PAGE);
            return (
              <Card>
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Selected Products ({selected.length})
                    {totalSelPages > 1 && (
                      <span className="text-xs text-gray-400 font-normal ml-2">
                        page {selectedPage}/{totalSelPages}
                      </span>
                    )}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4 mr-1" /> Clear All
                  </Button>
                </div>
                <div className="divide-y">
                  {selSlice.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center gap-3 px-4 py-2">
                      <p className="flex-1 text-sm font-medium truncate">{product.name}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1); }}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantityDirect(product.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-12 text-center text-sm font-medium border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, 1); }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); removeSelected(product.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {totalSelPages > 1 && (
                  <div className="flex justify-center items-center gap-2 px-4 py-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedPage <= 1}
                      onClick={() => setSelectedPage((p) => p - 1)}
                    >
                      Prev
                    </Button>
                    <span className="text-xs text-gray-500">{selectedPage} / {totalSelPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedPage >= totalSelPages}
                      onClick={() => setSelectedPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </Card>
            );
          })()}
        </div>

        {/* ── Right column: Options + Preview + Generate ─────────────── */}
        <div className="space-y-4">

          {/* Label Mode */}
          <Card>
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Label Mode
              </h3>
            </div>
            <CardContent className="p-3 grid grid-cols-1 gap-2">
              {LABEL_MODE_OPTIONS.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setOptions((prev) => ({ ...prev, labelMode: mode.value }))}
                  className={`flex items-center gap-3 p-2 rounded border text-left transition-colors ${
                    options.labelMode === mode.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className={options.labelMode === mode.value ? 'text-blue-600' : 'text-gray-500'}>
                    {mode.icon}
                  </span>
                  <div>
                    <p className="text-xs font-semibold">{mode.label}</p>
                    <p className="text-xs text-gray-500">{mode.description}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Size & Layout */}
          <Card>
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Size &amp; Layout</h3>
            </div>
            <CardContent className="p-3 space-y-3">
              {/* Page size */}
              <div>
                <Label className="text-xs mb-1">Paper Size</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {(['A4', 'A5', 'letter', 'custom'] as PageSize[]).map((ps) => (
                    <button
                      key={ps}
                      onClick={() => {
                        setActivePreset(CUSTOM_PRESET_IDX);
                        setOptions((prev) => ({ ...prev, pageSize: ps }));
                      }}
                      className={`py-1 text-xs rounded border font-medium transition-colors ${
                        options.pageSize === ps
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {ps.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* A4 quick column selector */}
              <div>
                <Label className="text-xs mb-1">A4 Columns (Quick Select)</Label>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((col) => (
                    <button
                      key={col}
                      onClick={() => {
                        setActivePreset(CUSTOM_PRESET_IDX);
                        setOptions((prev) => ({ ...prev, pageSize: 'A4', columns: col }));
                      }}
                      className={`py-1 text-xs rounded border font-medium transition-colors ${
                        options.pageSize === 'A4' && options.columns === col
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {col} {col === 1 ? 'Column' : 'Columns'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size presets */}
              <div>
                <Label className="text-xs mb-1">Label Size Preset</Label>
                <div className="space-y-1">
                  {SIZE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPreset(idx)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded border transition-colors ${
                        activePreset === idx
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom W/H/Columns */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Width (mm)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={options.width}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      setActivePreset(CUSTOM_PRESET_IDX);
                      setOptions((prev) => ({
                        ...prev,
                        pageSize: 'custom',
                        width: Number.isFinite(n) ? n : prev.width,
                      }));
                    }}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height (mm)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={options.height}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      setActivePreset(CUSTOM_PRESET_IDX);
                      setOptions((prev) => ({
                        ...prev,
                        pageSize: 'custom',
                        height: Number.isFinite(n) ? n : prev.height,
                      }));
                    }}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Columns</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={options.columns}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setActivePreset(CUSTOM_PRESET_IDX);
                      setOptions((prev) => ({
                        ...prev,
                        columns: Number.isFinite(n) && n >= 1 ? n : prev.columns,
                      }));
                    }}
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              {/* Barcode type */}
              {(options.labelMode === 'label-with-barcode' ||
                options.labelMode === 'barcode-only' ||
                options.labelMode === 'label-with-both' ||
                options.labelMode === 'label-with-barcode-styled') && (
                <div>
                  <Label className="text-xs mb-1">Barcode Symbology</Label>
                  <select
                    value={options.barcodeType}
                    onChange={(e) => setOptions((prev) => ({ ...prev, barcodeType: e.target.value }))}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {BARCODE_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card>
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Display Options</h3>
            </div>
            <CardContent className="p-3 space-y-2">
              {(
                [
                  { key: 'showProductName',   label: 'Product Name' },
                  { key: 'showBrand',         label: 'Brand' },
                  { key: 'showPrice',         label: 'Price' },
                  { key: 'showProductCode',   label: 'Product Code' },
                  { key: 'showWooCommerceId', label: 'WooCommerce ID' },
                ] as { key: keyof LabelOptions; label: string }[]
              ).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!options[key]}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="rounded"
                    disabled={options.labelMode === 'barcode-only'}
                  />
                  <span className={`text-sm ${options.labelMode === 'barcode-only' ? 'text-gray-400' : 'text-gray-700'}`}>
                    {label}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Label Preview */}
          <Card>
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Preview</h3>
            </div>
            <CardContent className="p-4 flex justify-center">
              <LabelPreview
                options={options}
                product={selected[0]?.product ?? filteredProducts[0] ?? null}
              />
            </CardContent>
          </Card>

          {/* Generate / Print / No-Gap PDF Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || printing || noGapGenerating || selected.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2 py-3 text-sm"
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              onClick={handlePrint}
              disabled={generating || printing || noGapGenerating || selected.length === 0}
              variant="outline"
              className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 gap-2 py-3 text-sm"
            >
              {printing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {printing ? 'Opening...' : 'Print PDF'}
            </Button>
          </div>
          <Button
            onClick={handleGenerateNoGap}
            disabled={generating || printing || noGapGenerating || selected.length === 0}
            variant="outline"
            className="w-full border-green-600 text-green-700 hover:bg-green-50 gap-2 py-2.5 text-sm"
          >
            {noGapGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {noGapGenerating ? 'Generating...' : 'Download PDF (No Gap)'}
          </Button>
          {selected.length > 0 && (
            <p className="text-xs text-center text-gray-500">
              {selected.reduce((s, x) => s + x.quantity, 0)} label{selected.reduce((s, x) => s + x.quantity, 0) !== 1 ? 's' : ''} total
            </p>
          )}
          {selected.length === 0 && (
            <p className="text-xs text-center text-gray-400">Select products from the list to generate labels</p>
          )}
        </div>
      </div>
    </div>
  );
}
