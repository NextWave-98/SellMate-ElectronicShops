/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { X, Package, TrendingUp, TrendingDown, MapPin, Tag } from 'lucide-react';
import { useProduct, type ProductItem } from '../../../hooks/useProduct';
import LoadingSpinner from '../../common/LoadingSpinner';
import toast from 'react-hot-toast';

interface ViewStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItem: ProductItem | null;
}

interface InventoryLocation {
  locationId: string;
  locationName: string;
  locationCode: string;
  locationType: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
}

interface ProductDetail extends ProductItem {
  totalInventory?: number;
  totalReserved?: number;
  totalAvailable?: number;
  inventorySummary?: {
    totalQuantity: number;
    totalAvailable: number;
    locations: InventoryLocation[];
  };
}

export default function ViewStockModal({ isOpen, onClose, stockItem }: ViewStockModalProps) {
  const productHook = useProduct();
  const [loading, setLoading] = useState(false);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);

  useEffect(() => {
    if (stockItem && isOpen) {
      loadProductDetails();
    }
    return () => {
      setProductDetail(null);
    };
  }, [stockItem, isOpen]);

  const loadProductDetails = async () => {
    if (!stockItem?.id) return;

    setLoading(true);
    try {
      const response = await productHook.getProductById(stockItem.id);
      if (response?.data) {
        setProductDetail(response.data as unknown as ProductDetail);
      } else {
        // Fall back to the data we already have from the list
        setProductDetail(stockItem as ProductDetail);
      }
    } catch (error) {
      console.error('Error loading product details:', error);
      toast.error('Failed to load product details');
      // Fall back to list data
      setProductDetail(stockItem as ProductDetail);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return 'N/A';
    return `LKR ${Number(value).toLocaleString()}`;
  };

  const getStockStatusLabel = (
    totalQty: number,
    reorderLevel?: number | null,
    minLevel?: number | null,
    maxLevel?: number | null
  ) => {
    if (totalQty === 0) return { label: 'Out of Stock', color: 'red' };
    if (reorderLevel && totalQty <= reorderLevel) return { label: 'Low Stock', color: 'yellow' };
    if (minLevel && totalQty <= minLevel) return { label: 'Low Stock', color: 'yellow' };
    if (maxLevel && totalQty >= maxLevel) return { label: 'Overstocked', color: 'orange' };
    return { label: 'In Stock', color: 'green' };
  };

  if (!isOpen) return null;

  const data = productDetail;
  const totalQty =
    data?.totalInventory ??
    data?.inventorySummary?.totalQuantity ??
    0;
  const totalAvailable =
    data?.totalAvailable ??
    data?.inventorySummary?.totalAvailable ??
    totalQty;
  const locations = data?.inventorySummary?.locations ?? [];
  const status = data
    ? getStockStatusLabel(totalQty, data.reorderLevel, data.minStockLevel, data.maxStockLevel)
    : { label: 'Unknown', color: 'gray' };

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-3xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Product Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : data ? (
          <div className="glass-modal-scroll min-h-0 flex-1">
            {/* Product Header */}
            <div className="bg-orange-50 rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {data.primaryImage ? (
                    <img
                      src={data.primaryImage}
                      alt={data.name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{data.name}</h3>
                    <p className="text-sm text-gray-600">Code: {data.productCode}</p>
                    {data.sku && <p className="text-sm text-gray-600">SKU: {data.sku}</p>}
                    {data.barcode && (
                      <p className="text-sm text-gray-600">Barcode: {data.barcode}</p>
                    )}
                    {data.category && (
                      <p className="text-sm text-gray-600">Category: {data.category.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-[12px] font-medium ${
                      status.color === 'green'
                        ? 'bg-green-100 text-green-800'
                        : status.color === 'yellow'
                        ? 'bg-yellow-100 text-yellow-800'
                        : status.color === 'orange'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {status.label}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      data.isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {data.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {data.isDiscontinued && (
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                      Discontinued
                    </span>
                  )}
                </div>
              </div>
              {data.description && (
                <p className="mt-3 text-sm text-gray-600">{data.description}</p>
              )}
            </div>

            {/* Stock Summary */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Stock Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Qty</p>
                  <p className="text-2xl font-bold text-gray-900">{totalQty}</p>
                </div> */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-1">Available</p>
                  <p className="text-2xl font-bold text-green-700">{totalAvailable}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-500" /> Min Level
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.minStockLevel ?? ' '}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-1">Reorder At</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.reorderLevel ?? ' '}
                  </p>
                </div>
              </div>

              {/* Stock Health Bar */}
              {data.maxStockLevel && data.maxStockLevel > 0 && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Current: {totalQty}</span>
                    <span>Max: {data.maxStockLevel}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        totalQty === 0
                          ? 'bg-red-500'
                          : data.reorderLevel && totalQty <= data.reorderLevel
                          ? 'bg-yellow-500'
                          : totalQty >= data.maxStockLevel
                          ? 'bg-orange-400'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min((totalQty / data.maxStockLevel) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  {data.reorderLevel && totalQty <= data.reorderLevel && (
                    <p className="text-sm text-yellow-700 mt-2">
                      ⚠️ Below reorder level. Consider restocking
                      {data.reorderQuantity ? ` ${data.reorderQuantity} units.` : ' soon.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Inventory by Location */}
            {locations.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  Inventory by Location
                </h4>
                <div className="space-y-3">
                  {locations.map((loc) => (
                    <div
                      key={loc.locationId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{loc.locationName}</p>
                        <p className="text-xs text-gray-500">
                          {loc.locationCode} · {loc.locationType}
                        </p>
                      </div>
                      <div className="flex gap-6 text-right">
                        <div>
                          <p className="text-xs text-gray-500">Qty</p>
                          <p className="font-semibold text-gray-900">{loc.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Available</p>
                          <p className="font-semibold text-green-700">{loc.availableQuantity}</p>
                        </div>
                        {loc.reservedQuantity > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">Reserved</p>
                            <p className="font-semibold text-orange-600">
                              {loc.reservedQuantity}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-orange-600" />
                Pricing
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Unit Price</label>
                  <p className="text-gray-900 font-semibold">{formatCurrency(data.unitPrice)}</p>
                </div>
                {data.costPrice !== undefined && data.costPrice !== null && (
                  <div>
                    <label className="text-xs text-gray-500">Cost Price</label>
                    <p className="text-gray-900 font-semibold">
                      {formatCurrency(data.costPrice)}
                    </p>
                  </div>
                )}
                {(data as any).wholesalePrice !== undefined && (data as any).wholesalePrice !== null && (
                  <div>
                    <label className="text-xs text-gray-500">Wholesale Price</label>
                    <p className="text-gray-900 font-semibold">
                      {formatCurrency((data as any).wholesalePrice)}
                    </p>
                  </div>
                )}
                {totalQty > 0 && data.costPrice !== undefined && data.costPrice !== null && (
                  <div>
                    <label className="text-xs text-gray-500">Total Stock Value (Cost)</label>
                    <p className="text-gray-900 font-semibold">
                      {formatCurrency(Number(data.costPrice) * totalQty)}
                    </p>
                  </div>
                )}
                {totalQty > 0 && (
                  <div>
                    <label className="text-xs text-gray-500">Total Stock Value (Retail)</label>
                    <p className="text-gray-900 font-semibold">
                      {formatCurrency(Number(data.unitPrice) * totalQty)}
                    </p>
                  </div>
                )}
              </div>

              {/* Active Discount */}
              {data.discountInfo && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    Active Discount: {data.discountInfo.discountName}
                  </p>
                  <p className="text-sm text-green-700">
                    {data.discountInfo.discountType === 'PERCENTAGE'
                      ? `${data.discountInfo.discountValue}% off`
                      : `LKR ${data.discountInfo.discountValue} off`}{' '}
                    → Effective Price: {formatCurrency(data.discountInfo.effectivePrice)}
                  </p>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                {data.brand && (
                  <div>
                    <label className="text-xs text-gray-500">Brand</label>
                    <p className="text-gray-900 font-medium">{data.brand}</p>
                  </div>
                )}
                {data.model && (
                  <div>
                    <label className="text-xs text-gray-500">Model</label>
                    <p className="text-gray-900 font-medium">{data.model}</p>
                  </div>
                )}
                {data.qualityGrade && (
                  <div>
                    <label className="text-xs text-gray-500">Quality Grade</label>
                    <p className="text-gray-900 font-medium">{data.qualityGrade}</p>
                  </div>
                )}
                {data.warrantyMonths !== undefined && data.warrantyMonths !== null && (
                  <div>
                    <label className="text-xs text-gray-500">Warranty</label>
                    <p className="text-gray-900 font-medium">
                      {data.warrantyMonths} months
                      {(data as any).warrantyType ? ` (${(data as any).warrantyType})` : ''}
                    </p>
                  </div>
                )}
                {(data as any).weight !== undefined && (data as any).weight !== null && (
                  <div>
                    <label className="text-xs text-gray-500">Weight</label>
                    <p className="text-gray-900 font-medium">{(data as any).weight} kg</p>
                  </div>
                )}
                {(data as any).dimensions && (
                  <div>
                    <label className="text-xs text-gray-500">Dimensions</label>
                    <p className="text-gray-900 font-medium">{(data as any).dimensions}</p>
                  </div>
                )}
                {(data as any).taxRate !== undefined && (data as any).taxRate !== null && (
                  <div>
                    <label className="text-xs text-gray-500">Tax Rate</label>
                    <p className="text-gray-900 font-medium">{(data as any).taxRate}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {data.tags && data.tags.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 block mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500">Created</label>
                  <p className="text-gray-900">{formatDate(data.createdAt)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Last Updated</label>
                  <p className="text-gray-900">{formatDate(data.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-600">No product data available.</div>
        )}

        <div className="sticky bottom-0 z-10 shrink-0 bg-transparent px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
