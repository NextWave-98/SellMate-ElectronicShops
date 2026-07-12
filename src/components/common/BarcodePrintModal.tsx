/**
 * BarcodePrintModal
 *
 * Lets the user configure label options and then:
 *  - Print (opens PDF in new tab, browser print dialog fires)
 *  - Download (saves PDF to disk)
 *
 * Usage:
 *   <BarcodePrintModal
 *     open={showPrintModal}
 *     onClose={() => setShowPrintModal(false)}
 *     products={selectedProducts}   // array of { productId, name, barcode, productCode, unitPrice }
 *   />
 */
import React, { useState } from 'react';
import { Printer, Download, Settings, Package, Tag } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import useBarcode, { type BarcodeLabelOptions, type PrintLabelItem } from '../../hooks/useBarcode';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintProduct {
  productId: string;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  productCode: string;
  unitPrice: number;
  brand?: string;
}

interface BarcodePrintModalProps {
  open: boolean;
  onClose: () => void;
  products: PrintProduct[];
}

// ─── Preset label sizes ───────────────────────────────────────────────────────

const SIZE_PRESETS = [
  { label: 'Small  (40 × 20 mm)', width: 40, height: 20 },
  { label: 'Medium (50 × 25 mm)', width: 50, height: 25 },
  { label: 'Large  (70 × 35 mm)', width: 70, height: 35 },
  { label: 'Extra Large (100 × 50 mm)', width: 100, height: 50 },
];

const BARCODE_TYPES = [
  { value: 'code128', label: 'Code 128 (default)' },
  { value: 'code39',  label: 'Code 39' },
  { value: 'ean13',   label: 'EAN-13 (13 digits)' },
  { value: 'ean8',    label: 'EAN-8  (8 digits)' },
  { value: 'qrcode',  label: 'QR Code' },
  { value: 'upca',    label: 'UPC-A  (12 digits)' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({ open, onClose, products }) => {
  const { printLabels, downloadLabels, printing } = useBarcode();

  // Per-product quantity
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(products.map((p) => [p.productId, 1]))
  );

  // Label options
  const [selectedSize, setSelectedSize] = useState(1);   // index into SIZE_PRESETS
  const [barcodeType, setBarcodeType]   = useState('code128');
  const [columns, setColumns]           = useState(2);
  const [showName, setShowName]         = useState(true);
  const [showPrice, setShowPrice]       = useState(true);
  const [showCode, setShowCode]         = useState(true);
  const [showBrand, setShowBrand]       = useState(false);


  const buildItems = (): PrintLabelItem[] =>
    products.map((p) => ({
      productId: p.productId,
      quantity: quantities[p.productId] ?? 1,
    }));

  const buildOptions = (): BarcodeLabelOptions => ({
    width:           SIZE_PRESETS[selectedSize].width,
    height:          SIZE_PRESETS[selectedSize].height,
    columns,
    barcodeType,
    showProductName: showName,
    showPrice,
    showProductCode: showCode,
    showBrand,
  });

  const totalLabels = Object.values(quantities).reduce((s, q) => s + q, 0);

  const handlePrint = async () => {
    const items = buildItems();
    if (items.length === 0) return;
    try {
      await printLabels(items, buildOptions());
    } catch {
      toast.error('Failed to generate labels');
    }
  };

  const handleDownload = async () => {
    const items = buildItems();
    if (items.length === 0) return;
    try {
      await downloadLabels(items, buildOptions());
    } catch {
      toast.error('Failed to download labels');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-linear-to-r from-purple-600 to-purple-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Printer className="h-5 w-5" />
            <h2 className="text-base font-semibold">Print Barcode Labels</h2>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Product list */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">
                Products ({products.length}) · {totalLabels} labels total
              </h3>
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {products.map((p) => (
                <div
                  key={p.productId}
                  className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2 bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {p.barcode || p.sku || p.productCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Tag className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Copies:</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={quantities[p.productId] ?? 1}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [p.productId]: Math.max(1, parseInt(e.target.value) || 1),
                        }))
                      }
                      className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Label options */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Label Options</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">

              {/* Size */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Label size</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {SIZE_PRESETS.map((s, i) => (
                    <option key={i} value={i}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Barcode type */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Barcode type</label>
                <select
                  value={barcodeType}
                  onChange={(e) => setBarcodeType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {BARCODE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Columns */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Labels per row</label>
                <select
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-col gap-1.5 justify-center">
                {[
                  { id: 'showName',  label: 'Product name',  value: showName,  set: setShowName },
                  { id: 'showPrice', label: 'Price',         value: showPrice, set: setShowPrice },
                  { id: 'showCode',  label: 'Product code',  value: showCode,  set: setShowCode },
                  { id: 'showBrand', label: 'Brand',         value: showBrand, set: setShowBrand },
                ].map(({ id, label, value, set }) => (
                  <div key={id} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={value}
                      onCheckedChange={(checked) => set(checked === true)}
                    />
                    <label htmlFor={id} className="text-xs text-gray-600 cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t bg-gray-50 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={printing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={printing || totalLabels === 0}
            className="flex items-center justify-center gap-2 flex-1 border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-700"
          >
            <Download className="h-4 w-4" />
            {printing ? 'Generating…' : 'Download PDF'}
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printing || totalLabels === 0}
            className="flex items-center justify-center gap-2 flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Printer className="h-4 w-4" />
            {printing ? 'Generating…' : 'Print'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodePrintModal;
