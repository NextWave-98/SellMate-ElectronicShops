/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScannedProduct {
  id: string;
  productId: string;
  productCode: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  unitPrice: number;
  brand?: string;
  model?: string;
  category?: string;
  warrantyMonths?: number;
  stock: number;
  isService?: boolean;
}

export interface PrintLabelItem {
  productId: string;
  quantity?: number; // how many label copies to print
}

export interface BarcodeProductSuggestion {
  name?: string;
  brand?: string;
  model?: string;
  description?: string;
  imageUrl?: string;
}

export type BarcodeLookupSource = 'catalog' | 'external' | 'barcode_only';

export interface BarcodeLookupResult {
  barcode: string;
  source: BarcodeLookupSource;
  catalogMatches: ScannedProduct[];
  suggestion?: BarcodeProductSuggestion;
}

export interface BarcodeLabelOptions {
  width?: number;          // label width in mm (default 50)
  height?: number;         // label height in mm (default 25)
  columns?: number;        // labels per row (default 2)
  barcodeType?: string;    // symbology: 'code128' | 'qrcode' | 'ean13' etc.
  showProductName?: boolean;
  showPrice?: boolean;
  showProductCode?: boolean;
  showBrand?: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useBarcode = () => {
  const { fetchData } = useFetch();
  const { user } = useAuth();
  const locationId = user?.locationId || user?.branchId;

  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [generating, setGenerating] = useState(false);

  /**
   * scanProduct – look up a product by barcode / SKU / product-code.
   * Pass `withLocation = true` to restrict stock count to the user's branch.
   */
  const scanProduct = useCallback(
    async (
      query: string,
      withLocation = false,
      overrideLocationId?: string
    ): Promise<ScannedProduct[] | null> => {
      if (!query.trim()) return null;
      setScanning(true);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        const loc = overrideLocationId ?? (withLocation ? locationId : undefined);
        if (loc) params.append('locationId', loc);
        const res = await fetchData({
          endpoint: `/products/barcode/scan?${params.toString()}`,
          method: 'GET',
          silent: true,
        });
        if (!res?.data) return null;
        // Backend always returns an array now
        const data = res.data;
        return Array.isArray(data) ? (data as ScannedProduct[]) : [data as ScannedProduct];
      } finally {
        setScanning(false);
      }
    },
    [fetchData, locationId]
  );

  /**
   * lookupBarcodeForProduct – resolve a barcode when creating a new product.
   * Checks your catalog first, then external product databases (e.g. Open Food Facts).
   */
  const lookupBarcodeForProduct = useCallback(
    async (query: string): Promise<BarcodeLookupResult | null> => {
      if (!query.trim()) return null;
      setLookingUp(true);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        const res = await fetchData({
          endpoint: `/products/barcode/lookup?${params.toString()}`,
          method: 'GET',
          silent: true,
        });
        return (res?.data as BarcodeLookupResult) ?? null;
      } finally {
        setLookingUp(false);
      }
    },
    [fetchData]
  );

  /**
   * autoGenerateBarcode – ask the backend to create and save a barcode for
   * the given product if it doesn't have one yet.
   */
  const autoGenerateBarcode = useCallback(
    async (productId: string): Promise<string | null> => {
      setGenerating(true);
      try {
        const res = await fetchData({
          endpoint: `/products/${productId}/barcode/generate`,
          method: 'POST',
          successMessage: 'Barcode generated',
        });
        return (res?.data as any)?.barcode ?? null;
      } finally {
        setGenerating(false);
      }
    },
    [fetchData]
  );

  /**
   * getBarcodeImageUrl – returns a URL that renders a barcode image.
   * Use directly in an <img src={...} /> tag.
   */
  const getBarcodeImageUrl = useCallback(
    (productId: string, symbology = 'code128', format: 'png' | 'svg' = 'png'): string => {
      const base =
        import.meta.env.VITE_BASE_URL ||
        'https://gadget-chain-manager-backend.vercel.app/api';
      return `${base}/products/${productId}/barcode?symbology=${symbology}&format=${format}`;
    },
    []
  );

  /**
   * printLabels – calls the backend to generate a PDF of barcode labels and
   * opens it in a new tab (browser print dialog will appear).
   */
  const printLabels = useCallback(
    async (items: PrintLabelItem[], options: BarcodeLabelOptions = {}): Promise<void> => {
      if (items.length === 0) return;
      setPrinting(true);
      try {
        const res = await fetchData({
          endpoint: '/products/barcode/print-labels',
          method: 'POST',
          data: { items, options },
          silent: true,
          responseType: 'blob',
        });

        // The response is a PDF blob – open in a new tab so the browser's
        // native print dialog is triggered.
        const blob = res as unknown as Blob;
        if (blob && blob instanceof Blob) {
          const url = URL.createObjectURL(blob);
          const win = window.open(url, '_blank');
          if (win) {
            win.addEventListener('load', () => {
              setTimeout(() => {
                win.print();
              }, 500);
            });
          }
          setTimeout(() => URL.revokeObjectURL(url), 30_000);
        }
      } finally {
        setPrinting(false);
      }
    },
    [fetchData]
  );

  /**
   * downloadLabels – same as printLabels but triggers a file download instead.
   */
  const downloadLabels = useCallback(
    async (items: PrintLabelItem[], options: BarcodeLabelOptions = {}): Promise<void> => {
      if (items.length === 0) return;
      setPrinting(true);
      try {
        const res = await fetchData({
          endpoint: '/products/barcode/print-labels',
          method: 'POST',
          data: { items, options },
          silent: true,
          responseType: 'blob',
        });

        const blob = res as unknown as Blob;
        if (blob && blob instanceof Blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'barcode-labels.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10_000);
        }
      } finally {
        setPrinting(false);
      }
    },
    [fetchData]
  );

  return {
    scanning,
    lookingUp,
    printing,
    generating,
    scanProduct,
    lookupBarcodeForProduct,
    autoGenerateBarcode,
    getBarcodeImageUrl,
    printLabels,
    downloadLabels,
  };
};

export default useBarcode;
