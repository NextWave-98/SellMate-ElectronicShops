/** Round to 2 decimal places (POS money columns). */
export const roundMoney = (value: number): number =>
  Math.round((Number(value) || 0) * 100) / 100;

/**
 * Normalize cashier-entered percents: 2dp, clamp 0..100, snap near-integers
 * (9.99 → 10) so "20 + 10" displays as 30%, not 29.99%.
 */
export function normalizeDiscountPercent(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const clamped = Math.min(100, Math.max(0, n));
  const rounded = roundMoney(clamped);
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return Math.round(rounded);
  }
  return rounded;
}

export type SequentialPercentDiscountResult = {
  discountLkr: number;
  displayPercentSum: number;
  afterFirst: number;
  afterSecond: number;
  amount1: number;
  amount2: number;
  percent1: number;
  percent2: number;
};

/**
 * Sequential bill percentages. Display sum is p1+p2 (business display);
 * payable uses afterSecond / discountLkr.
 */
export function computeSequentialPercentDiscount(
  subtotal: number,
  percent1: unknown,
  percent2: unknown = 0,
): SequentialPercentDiscountResult {
  const base = Math.max(0, roundMoney(Number(subtotal) || 0));
  const p1 = normalizeDiscountPercent(percent1);
  const p2 = normalizeDiscountPercent(percent2);
  const afterFirst = roundMoney(base * (1 - p1 / 100));
  const afterSecond = roundMoney(afterFirst * (1 - p2 / 100));
  const amount1 = roundMoney(Math.max(0, base - afterFirst));
  const amount2 = roundMoney(Math.max(0, afterFirst - afterSecond));
  const discountLkr = roundMoney(Math.max(0, base - afterSecond));
  return {
    discountLkr: Math.min(discountLkr, base),
    displayPercentSum: roundMoney(p1 + p2),
    afterFirst,
    afterSecond: Math.min(afterSecond, base),
    amount1,
    amount2,
    percent1: p1,
    percent2: p2,
  };
}

export function formatDiscountPercentLabel(percent: number): string {
  const n = normalizeDiscountPercent(percent) || roundMoney(Number(percent) || 0);
  if (Number.isInteger(n)) return String(n);
  if (Math.abs(n - Math.round(n)) < 0.015) return String(Math.round(n));
  return String(roundMoney(n));
}
