/**
 * Per-element type control for printed product labels.
 *
 * Shared by the org-admin and branch copies of the barcode generator. These two
 * pages have drifted apart over time; the fit estimate in particular has to stay
 * identical to the PDF generator's stacking in `barcode.service.ts`, and keeping
 * one copy is the only way that stays true.
 */

/** One controllable text element on the label. */
export interface LabelElementStyle {
  /** PDF points. Absolute   overrides the size auto-derived from label height. */
  size: number;
  bold: boolean;
}

export type TypographyKey = 'name' | 'brand' | 'code' | 'price' | 'barcodeText';

export type LabelTypography = Record<TypographyKey, LabelElementStyle>;

/**
 * Defaults mirror what the PDF generator produces with no overrides, so opening
 * the panel and changing nothing keeps the previous output byte for byte.
 */
export const DEFAULT_TYPOGRAPHY: LabelTypography = {
  name:        { size: 8.5, bold: true },
  brand:       { size: 5,   bold: true },
  code:        { size: 6,   bold: true },
  price:       { size: 9,   bold: true },
  barcodeText: { size: 14,  bold: true },
};

export const TYPOGRAPHY_FIELDS: {
  key: TypographyKey;
  label: string;
  hint: string;
  min: number;
  max: number;
}[] = [
  { key: 'name',        label: 'Product name',   hint: 'Top line',                  min: 3, max: 40 },
  { key: 'brand',       label: 'Brand',          hint: 'Under the name',            min: 3, max: 30 },
  { key: 'code',        label: 'Product code',   hint: 'SKU / code line',           min: 3, max: 30 },
  { key: 'price',       label: 'Price',          hint: 'The number customers read', min: 3, max: 48 },
  { key: 'barcodeText', label: 'Barcode digits', hint: 'Numbers under the bars',    min: 6, max: 40 },
];

/** The shape estimateLabelFit needs   both pages' LabelOptions satisfy it. */
export interface FitInput {
  width: number;
  height: number;
  labelMode: string;
  typography: LabelTypography;
  showProductName: boolean;
  showPrice: boolean;
  showProductCode: boolean;
  showBrand: boolean;
  showWooCommerceId: boolean;
}

export interface LabelFit {
  used: number;
  available: number;
  overflow: boolean;
  overflowBy: number;
}

const MM_TO_PT = 2.834645669;

/** PDF points to preview pixels, given the preview's px-per-mm scale. */
export const ptToPx = (points: number, scale: number): number =>
  Math.max(4, (points / MM_TO_PT) * scale);

/**
 * Will the chosen text sizes fit the chosen label?
 *
 * Mirrors the stacking in barcode.service.ts: every visible element costs its
 * font size plus a small gap, and the barcode takes a share of the height.
 * Someone can happily set 30 pt on a 20 mm label and only discover it at the
 * printer   a wasted roll of label stock   so the preview says so first.
 */
export function estimateLabelFit(options: FitInput): LabelFit {
  const labelH = (Number(options.height) || 25) * MM_TO_PT;
  const labelW = (Number(options.width) || 50) * MM_TO_PT;
  const padding = 6;
  const available = labelH - padding;

  const t = options.typography ?? DEFAULT_TYPOGRAPHY;
  const mode = options.labelMode;
  const showText = mode !== 'barcode-only';
  const showBarcode =
    mode === 'barcode-only' ||
    mode === 'label-with-barcode' ||
    mode === 'label-with-both' ||
    mode === 'label-with-barcode-styled';
  const showQR = mode === 'label-with-qr' || mode === 'label-with-both';
  const isStyled = mode === 'label-with-barcode-styled';

  const gap = Math.max(2, Math.min(8, labelH * 0.025));
  let used = 0;

  if (isStyled) used += Math.max(16, labelH * 0.18); // navy header band

  if (showText && options.showProductName) used += t.name.size + gap;
  if (showText && options.showBrand) used += t.brand.size + gap;
  if (showText && options.showWooCommerceId) used += t.brand.size + gap;

  if (showBarcode) {
    used +=
      (mode === 'barcode-only'
        ? available * 0.7
        : Math.max(14, Math.min(42, labelH * 0.42))) + gap;
  }
  if (showQR) used += Math.min(labelW / 2, labelH * 0.6) + 2;

  if (showText && options.showProductCode) used += t.code.size + gap;
  // The styled layout prints the price in a fixed-height band.
  if (showText && options.showPrice) used += isStyled ? 14 : t.price.size;

  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    used: round(used),
    available: round(available),
    overflow: used > available,
    overflowBy: round(used - available),
  };
}

/** True when nothing has been changed from the defaults. */
export const isDefaultTypography = (t: LabelTypography): boolean =>
  TYPOGRAPHY_FIELDS.every(
    (f) => t[f.key].size === DEFAULT_TYPOGRAPHY[f.key].size && t[f.key].bold === DEFAULT_TYPOGRAPHY[f.key].bold,
  );
