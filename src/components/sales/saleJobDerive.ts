// Auto-derive Sale Job fields from the POS cart for the advance-payment flow.
// The advance-payment path never asks "is this a job?"   job type, title and
// due date are inferred; the user only chooses priority.

import type { SaleJobType } from '../../types/saleJob.types';

export interface CartLike {
  name: string;
  quantity: number;
  category?: string;
  isService?: boolean;
}

/**
 * Map cart product/service categories to a Sale Job type.
 * Matches on category keywords; falls back to PHOTO_FRAME when nothing matches
 * (e.g. the graphic-design / printing service line was removed from the cart).
 */
export function deriveJobTypeFromCart(cart: CartLike[]): SaleJobType {
  const cats = cart.map((c) => (c.category || '').toLowerCase());
  const hasAny = (kw: string) => cats.some((c) => c.includes(kw));

  if (hasAny('graphic') || hasAny('design')) return 'GRAPHIC_DESIGN';
  if (hasAny('print')) return 'PRINTING';
  if (hasAny('photo') || hasAny('frame')) return 'PHOTO_FRAME';
  if (hasAny('custom')) return 'CUSTOM';
  return 'PHOTO_FRAME'; // default
}

/** Build a job title from the cart: "<first item> x<qty>" (+N more). */
export function deriveJobTitleFromCart(cart: CartLike[]): string {
  if (cart.length === 0) return 'POS Job';
  const first = cart[0];
  const base = `${first.name} x${first.quantity}`;
  return cart.length > 1 ? `${base} +${cart.length - 1} more` : base;
}

/** Default job due date = today + 7 days, as YYYY-MM-DD (user may override). */
export function defaultJobDueDate(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}
