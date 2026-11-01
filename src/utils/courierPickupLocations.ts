export type CourierPickupPage = {
  id: string;
  name: string;
  locationCode?: string;
  isWholesalePricing?: boolean;
};

/** All sellable pages for courier pickup (branches + dropshipper pages; excludes warehouses). */
export function mapCourierPickupPages(res: unknown): CourierPickupPage[] {
  const data = (res as { data?: Record<string, unknown> })?.data;
  const list: unknown[] =
    (data?.locations as unknown[]) ??
    (data?.branches as unknown[]) ??
    (Array.isArray(data) ? data : []);

  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter((l) => l.locationType !== 'WAREHOUSE' && l.isActive !== false)
    .map((l) => ({
      id: String(l.id),
      name: String(l.name || l.locationCode || 'Unnamed'),
      locationCode: l.locationCode ? String(l.locationCode) : undefined,
      isWholesalePricing: l.isWholesalePricing === true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function formatCourierPickupPageLabel(page: CourierPickupPage): string {
  const code = page.locationCode ? ` (${page.locationCode})` : '';
  const tag = page.isWholesalePricing ? ' · Dropshipper' : '';
  return `${page.name}${code}${tag}`;
}
