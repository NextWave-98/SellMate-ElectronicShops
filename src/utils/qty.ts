/**
 * Quantity formatting and parsing for products sold by weight, volume or length.
 *
 * The rule the whole feature rests on: `quantity` is always expressed in the
 * product's own `unitOfMeasure`, and `unitPrice` is the price of ONE of that
 * unit. A 250 g sale of a per-kilo product is quantity 0.250 at the per-kg
 * price. Grams only exist in the UI   there is no conversion in the database.
 */

export type SellBy = 'UNIT' | 'WEIGHT' | 'VOLUME' | 'LENGTH';
export type UnitOfMeasure = 'PCS' | 'KG' | 'G' | 'L' | 'ML' | 'M' | 'CM';

export interface UomProduct {
  sellBy?: SellBy | string | null;
  unitOfMeasure?: UnitOfMeasure | string | null;
  qtyStep?: number | string | null;
  minSaleQty?: number | string | null;
  qtyDecimals?: number | string | null;
}

export const UNITS_FOR_SELL_BY: Record<SellBy, UnitOfMeasure[]> = {
  UNIT: ['PCS'],
  WEIGHT: ['KG', 'G'],
  VOLUME: ['L', 'ML'],
  LENGTH: ['M', 'CM'],
};

export const SELL_BY_LABELS: Record<SellBy, string> = {
  UNIT: 'By piece',
  WEIGHT: 'By weight',
  VOLUME: 'By volume',
  LENGTH: 'By length',
};

/** Sensible defaults when a shop switches a product to a new selling mode. */
export const SELL_BY_DEFAULTS: Record<
  SellBy,
  { unitOfMeasure: UnitOfMeasure; qtyStep: number; minSaleQty: number; qtyDecimals: number }
> = {
  UNIT:   { unitOfMeasure: 'PCS', qtyStep: 1,     minSaleQty: 1,     qtyDecimals: 0 },
  WEIGHT: { unitOfMeasure: 'KG',  qtyStep: 0.01,  minSaleQty: 0.01,  qtyDecimals: 3 },
  VOLUME: { unitOfMeasure: 'L',   qtyStep: 0.01,  minSaleQty: 0.01,  qtyDecimals: 3 },
  LENGTH: { unitOfMeasure: 'M',   qtyStep: 0.1,   minSaleQty: 0.1,   qtyDecimals: 2 },
};

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const isWeighted = (p?: UomProduct | null): boolean =>
  !!p && (p.sellBy ?? 'UNIT') !== 'UNIT';

export const unitOf = (p?: UomProduct | null): UnitOfMeasure =>
  ((p?.unitOfMeasure as UnitOfMeasure) ?? 'PCS');

export const stepOf = (p?: UomProduct | null): number => {
  const s = num(p?.qtyStep, 1);
  return s > 0 ? s : 1;
};

export const minQtyOf = (p?: UomProduct | null): number => {
  const m = num(p?.minSaleQty, 0);
  return m > 0 ? m : stepOf(p);
};

export const decimalsOf = (p?: UomProduct | null): number => {
  const d = num(p?.qtyDecimals, 0);
  return Math.min(3, Math.max(0, Math.round(d)));
};

/** The smaller sibling unit, used to show "250 g" instead of "0.250 kg". */
const SUB_UNIT: Partial<Record<UnitOfMeasure, { unit: string; factor: number }>> = {
  KG: { unit: 'g', factor: 1000 },
  L: { unit: 'ml', factor: 1000 },
  M: { unit: 'cm', factor: 100 },
};

/**
 * Display a quantity the way a shopkeeper would say it.
 *
 * 0.25 kg reads as "250 g", 1.5 kg as "1.500 kg", 3 pieces as just "3". Below one
 * whole unit people think in the smaller unit, so that is what is shown.
 */
export function formatQty(quantity: number, p?: UomProduct | null): string {
  const q = num(quantity);
  const unit = unitOf(p);

  if (!isWeighted(p) || unit === 'PCS') {
    return String(Math.round(q));
  }

  const sub = SUB_UNIT[unit];
  if (sub && q > 0 && q < 1) {
    const small = Math.round(q * sub.factor * 1000) / 1000;
    return `${small} ${sub.unit}`;
  }

  return `${q.toFixed(decimalsOf(p))} ${unit.toLowerCase()}`;
}

/** "Rs. 1,250.00 / kg"   the label a weighted product needs on its price. */
export function formatUnitPrice(price: number, p?: UomProduct | null): string {
  const amount = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(num(price));
  return isWeighted(p) ? `${amount} / ${unitOf(p).toLowerCase()}` : amount;
}

/** Round to the 3 decimals the quantity columns store. */
export const roundQty = (q: number): number => Math.round(num(q) * 1000) / 1000;

/** Snap a typed quantity to the product's step, never below its minimum. */
export function snapQty(quantity: number, p?: UomProduct | null): number {
  const step = stepOf(p);
  const min = minQtyOf(p);
  const q = Math.max(num(quantity), 0);
  if (q <= 0) return 0;
  const snapped = roundQty(Math.round(q / step) * step);
  return Math.max(snapped, min);
}

/**
 * Convert a value typed in the smaller unit (grams) to the product's unit (kg).
 * Used by the POS keypad, which lets the cashier type "250" for 250 g.
 */
export function fromSubUnit(value: number, p?: UomProduct | null): number {
  const sub = SUB_UNIT[unitOf(p)];
  return sub ? roundQty(num(value) / sub.factor) : num(value);
}

/** The name of the smaller unit, or null when the unit has none. */
export function subUnitName(p?: UomProduct | null): string | null {
  return SUB_UNIT[unitOf(p)]?.unit ?? null;
}

/** Validation message, or null when the quantity is acceptable. */
export function validateQty(quantity: number, p?: UomProduct | null): string | null {
  const q = num(quantity);
  if (q <= 0) return 'Quantity must be greater than 0';

  if (!isWeighted(p)) {
    return Number.isInteger(q) ? null : 'This product is sold by the piece';
  }

  const unit = unitOf(p).toLowerCase();
  const min = minQtyOf(p);
  if (q < min) return `Minimum is ${min} ${unit}`;

  const step = stepOf(p);
  if (Math.round(q * 1000) % Math.round(step * 1000) !== 0) {
    return `Must be a multiple of ${step} ${unit}`;
  }
  return null;
}
