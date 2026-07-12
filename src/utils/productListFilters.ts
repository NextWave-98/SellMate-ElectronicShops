export interface CategoryOption {
  id: string;
  name: string;
}

/** Normalize list API payloads that may return a bare array or paginated wrapper. */
export function asApiList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.items)) return record.items as T[];
  }
  return [];
}

export function toCategoryOptions(value: unknown): CategoryOption[] {
  return asApiList<{ id: string; name: string }>(value)
    .filter((c) => c?.id && c?.name)
    .map((c) => ({ id: c.id, name: c.name }));
}

/** Treat empty / "all" as no location filter (avoids sending locationId=all to the API). */
export function normalizeLocationFilter(locationId?: string): string | undefined {
  if (!locationId || locationId === 'all') return undefined;
  return locationId;
}

export function resolveInventoryMinStock(item: {
  minStockLevel?: number | null;
  product?: { minStockLevel?: number | null };
}): number {
  return item.minStockLevel ?? item.product?.minStockLevel ?? 0;
}

export function getInventoryStatus(item: {
  quantity: number;
  minStockLevel?: number | null;
  maxStockLevel?: number | null;
  product?: { minStockLevel?: number | null };
}): 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' {
  const qty = item.quantity ?? 0;
  const minStock = resolveInventoryMinStock(item);
  const maxStock = item.maxStockLevel ?? 0;
  if (qty === 0) return 'out_of_stock';
  if (qty > 0 && qty <= minStock) return 'low_stock';
  if (maxStock > 0 && qty > maxStock) return 'overstocked';
  return 'in_stock';
}

/** Map stock management UI status values to product API query params. */
export function mapStockProductStatusFilter(status: string): Record<string, string> {
  switch (status) {
    case 'active':
      return { isActive: 'true' };
    case 'inactive':
      return { isActive: 'false' };
    case 'discontinued':
      return { isDiscontinued: 'true' };
    case 'lowstock':
      return { lowStock: 'true' };
    default:
      return {};
  }
}
