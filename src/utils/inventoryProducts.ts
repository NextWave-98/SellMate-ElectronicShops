/* eslint-disable @typescript-eslint/no-explicit-any */

/** A sellable product flattened from inventory rows (stock summed across locations). */
export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  productCode: string;
  price: number;
  originalPrice?: number;
  discountInfo: any;
  costPrice: number;
  stock: number;
  isActive: boolean;
}

/** The inventory API has returned its rows under several shapes over time. */
export const parseInventoryList = (response: any): any[] => {
  const candidates = [
    response?.data?.inventory,
    response?.data?.items,
    response?.data?.data?.inventory,
    response?.inventory,
    response?.data?.data,
    response?.data,
    response,
  ];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    if (
      candidate.length === 0 ||
      candidate[0]?.productId ||
      candidate[0]?.product_id ||
      candidate[0]?.product ||
      candidate[0]?.id
    ) {
      return candidate;
    }
  }
  return [];
};

export const mapInventoryRowsToProducts = (inventoryList: any[]): InventoryProduct[] => {
  const productMap = new Map<string, InventoryProduct>();
  for (const item of inventoryList) {
    if (!item || typeof item !== 'object') continue;
    const nestedProduct = item.product && typeof item.product === 'object' ? item.product : null;
    const productId = item.productId || item.product_id || nestedProduct?.id || (nestedProduct ? null : item.id);
    if (!productId) continue;
    if (nestedProduct?.isActive === false || item.isActive === false) continue;
    const qty = Number(item.availableQuantity ?? item.quantity ?? nestedProduct?.stock ?? 0) || 0;
    const existing = productMap.get(productId);
    if (existing) {
      existing.stock += qty;
      continue;
    }
    const unitPrice = Number(nestedProduct?.unitPrice ?? item.unitPrice ?? item.price) || 0;
    const discountInfo = nestedProduct?.discountInfo ?? item.discountInfo ?? null;
    productMap.set(productId, {
      id: productId,
      name: nestedProduct?.name || item.name || 'Unknown Product',
      sku: nestedProduct?.sku || item.sku || nestedProduct?.productCode || item.productCode || '',
      barcode: nestedProduct?.barcode || item.barcode || '',
      productCode: nestedProduct?.productCode || item.productCode || '',
      price: discountInfo ? discountInfo.effectivePrice : unitPrice,
      originalPrice: discountInfo ? unitPrice : undefined,
      discountInfo,
      costPrice: Number(nestedProduct?.costPrice ?? item.costPrice) || 0,
      stock: qty,
      isActive: nestedProduct?.isActive ?? item.isActive ?? true,
    });
  }
  return [...productMap.values()];
};
