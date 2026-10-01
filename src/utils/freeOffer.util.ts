/**
 * Repeating buy/get free entitlement: floor(paid / buy) * free
 */
export function computeFreeEntitlement(
  paidQty: number,
  buyQty: number,
  freeQty: number,
): number {
  const paid = Number(paidQty) || 0;
  const buy = Number(buyQty) || 0;
  const free = Number(freeQty) || 0;
  if (paid <= 0 || buy <= 0 || free <= 0) return 0;
  return Math.floor(paid / buy) * free;
}
