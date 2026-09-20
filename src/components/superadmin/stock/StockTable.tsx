import { Package, Edit, Trash2, Eye, Layers, ChevronDown, ChevronRight, MapPin, Tag } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { ProductItem } from '../../../hooks/useProduct';
import { useProduct } from '../../../hooks/useProduct';
import Pagination from '../../common/Pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface StockTableProps {
  items: ProductItem[];
  onEdit?: (item: ProductItem) => void;
  onDelete?: (item: ProductItem) => void;
  onView?: (item: ProductItem) => void;
  onRestock?: (item: ProductItem) => void;
  onManageVariants?: (item: ProductItem) => void;
  // Controlled pagination props
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export default function StockTable({ items, onEdit, onDelete, onView, onRestock, onManageVariants, currentPage, itemsPerPage, totalItems, totalPages, onPageChange, onItemsPerPageChange }: StockTableProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [variantData, setVariantData] = useState<Record<string, ProductItem[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set());
  const productHook = useProduct();

  const toggleVariantRow = useCallback(async (item: ProductItem) => {
    const id = item.id;
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
      setExpandedRows(newExpanded);
      return;
    }
    newExpanded.add(id);
    setExpandedRows(newExpanded);
    if (!variantData[id]) {
      setLoadingVariants(prev => new Set(prev).add(id));
      try {
        const res = await productHook.getProductVariants(id);
        if (res?.data) {
          setVariantData(prev => ({ ...prev, [id]: res.data as ProductItem[] }));
        }
      } finally {
        setLoadingVariants(prev => { const s = new Set(prev); s.delete(id); return s; });
      }
    }
  }, [expandedRows, variantData, productHook]);

  const formatCurrency = (amount: number) => {
    console.log('Formatting amount:', amount);
    return `LKR ${amount}`;
  };

  const toggleMenu = (itemId: string) => {
    setActiveMenu(activeMenu === itemId ? null : itemId);
  };
  
  const getStatus = (item: ProductItem) => {
    if (item.isDiscontinued) return 'discontinued';
    if (!item.isActive) return 'inactive';
    return 'active';
  };
  
  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      discontinued: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || styles.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(items.map(item => item.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (itemId: string, checked: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(itemId);
    } else {
      newSelectedRows.delete(itemId);
    }
    setSelectedRows(newSelectedRows);
  };

  const getSelectedItems = () => {
    return items.filter(item => selectedRows.has(item.id));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  // Controlled: parent provides paginated items
  const currentItems = items;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Package className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No stock items found</h3>
        <p className="text-gray-600">Try adjusting your filters or search query</p>
      </div>
    );
  }

  const selectedItems = getSelectedItems();
  const hasSelection = selectedRows.size > 0;
  const isAllSelected = items.length > 0 && selectedRows.size === items.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Action Menu - Shows when rows are selected */}
      {hasSelection && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-orange-900">
                {selectedRows.size} {selectedRows.size === 1 ? 'item' : 'items'} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-orange-600 hover:text-orange-800 font-medium"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              {selectedRows.size === 1 && onView && (
                <button
                  onClick={() => {
                    onView(selectedItems[0]);
                    clearSelection();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
              )}
              {selectedRows.size === 1 && onEdit && (
                <button
                  onClick={() => {
                    onEdit(selectedItems[0]);
                    clearSelection();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              {selectedRows.size === 1 && onManageVariants && selectedItems[0]?.hasVariants && (
                <button
                  onClick={() => {
                    onManageVariants(selectedItems[0]);
                    clearSelection();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700"
                >
                  <Layers className="w-4 h-4" />
                  Manage Variants
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    selectedItems.forEach(item => onDelete(item));
                    clearSelection();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete {selectedRows.size === 1 ? 'Item' : 'Items'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(c) => handleSelectAll(!!c)}
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock Levels</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.map((item) => (
              <>
              <TableRow
                key={item.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedRows.has(item.id)}
                    onCheckedChange={(c) => handleSelectRow(item.id, !!c)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center w-[250px]">
                    <div className="shrink-0 h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      {item.hasVariants ? (
                        <Layers className="h-5 w-5 text-orange-600" />
                      ) : (
                        <Package className="h-5 w-5 text-orange-600" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.sku}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.brand} {item.model && `- ${item.model}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Model: {item.model || 'N/A'}
                      </div>
                      {/* Variant attribute badges for variant items */}
                      {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(item.variantAttributes).map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full"
                            >
                              <Tag className="w-2.5 h-2.5 text-orange-400" />
                              <span className="capitalize text-orange-400">{k}:</span>
                              <span className="font-medium">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{item.category?.name || 'N/A'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600 max-w-xs truncate" title={item.description || ''}>
                    {item.description || ' '}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="text-gray-900">Min: {item.minStockLevel}</div>
                    <div className="text-gray-900">Max: {item.maxStockLevel}</div>
                    <div className="text-orange-600 text-xs">Reorder: {item.reorderLevel}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="text-gray-900">Cost: {formatCurrency(item.costPrice)}</div>
                    {item.discountInfo ? (
                      <div className="flex flex-col mt-0.5">
                        <span className="line-through text-gray-400 text-xs">Unit: {formatCurrency(item.unitPrice)}</span>
                        <span className="font-semibold text-green-600">LKR {Number(item.discountInfo.effectivePrice).toFixed(2)}</span>
                        <span className="inline-flex items-center text-xs mt-0.5 w-fit bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                          {item.discountInfo.discountType === 'PERCENTAGE'
                            ? `${item.discountInfo.discountValue}% OFF`
                            : `-LKR ${item.discountInfo.discountAmount.toFixed(2)}`}
                        </span>
                      </div>
                    ) : (
                      <div className="font-semibold text-green-600">Unit: {formatCurrency(item.unitPrice)}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(getStatus(item))}
                </TableCell>
                <TableCell>
                  {item.hasVariants ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleVariantRow(item); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full hover:bg-purple-100 transition-colors"
                    >
                      {expandedRows.has(item.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <Layers className="w-3.5 h-3.5" />
                      {loadingVariants.has(item.id) ? 'Loading...' : `${(variantData[item.id] ?? []).length > 0 ? (variantData[item.id] ?? []).length : ''} Variants`}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400"> </span>
                  )}
                </TableCell>
                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onView && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onView(item); }}
                        title="View"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                        title="Edit"
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {/* {onManageVariants && item.hasVariants && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onManageVariants(item); }}
                        title="Manage Variants"
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                    )} */}
                    {onDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                        title="Delete"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {/* Expanded variant rows */}
              {item.hasVariants && expandedRows.has(item.id) && (
                <TableRow key={`${item.id}-variants`} className="bg-purple-50">
                  <TableCell colSpan={8} className="px-6 py-3">
                    {loadingVariants.has(item.id) ? (
                      <p className="text-xs text-gray-500 py-2">Loading variants...</p>
                    ) : (variantData[item.id] ?? []).length === 0 ? (
                      <p className="text-xs text-gray-500 py-2">No variants found. Add variants via Manage Variants.</p>
                    ) : (
                      <div className="space-y-2">
                        {(variantData[item.id] ?? []).map(v => {
                          const inv = v.inventorySummary;
                          const totalQty = inv?.totalQuantity ?? 0;
                          const stockColor = totalQty === 0 ? 'text-red-600' : totalQty <= (v.minStockLevel ?? 5) ? 'text-amber-600' : 'text-green-700';
                          return (
                            <div key={v.id} className="flex items-start gap-4 bg-white border border-purple-100 rounded-lg px-4 py-2.5">
                              {/* Attributes */}
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                                {v.variantAttributes && Object.entries(v.variantAttributes).map(([k, val]) => (
                                  <span key={k} className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                                    <span className="text-orange-400 capitalize">{k}:</span> {String(val)}
                                  </span>
                                ))}
                                {v.sku && <span className="text-xs text-gray-400">SKU: {v.sku}</span>}
                              </div>
                              {/* Price */}
                              {v.discountInfo ? (
                                <div className="flex flex-col">
                                  <span className="line-through text-gray-400 text-xs">LKR {v.unitPrice}</span>
                                  <span className="text-sm font-medium text-green-600 whitespace-nowrap">LKR {Number(v.discountInfo.effectivePrice).toFixed(2)}</span>
                                  <span className="inline-flex items-center text-xs mt-0.5 w-fit bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                                    {v.discountInfo.discountType === 'PERCENTAGE'
                                      ? `${v.discountInfo.discountValue}% OFF`
                                      : `-LKR ${v.discountInfo.discountAmount.toFixed(2)}`}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-sm font-medium text-green-600 whitespace-nowrap">LKR {v.unitPrice}</div>
                              )}
                              {/* Total stock */}
                              <div className={`text-sm font-semibold whitespace-nowrap ${stockColor}`}>
                                {totalQty} in stock
                              </div>
                              {/* Per-location */}
                              {inv && inv.locations.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {inv.locations.map(loc => (
                                    <span key={loc.locationId} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md">
                                      <MapPin className="w-3 h-3 text-gray-400" />
                                      {loc.locationName}: <span className={loc.quantity === 0 ? 'text-red-600 font-semibold ml-0.5' : 'text-gray-800 font-semibold ml-0.5'}>{loc.quantity}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onItemsPerPageChange={(v) => onItemsPerPageChange(v)}
      />
    </div>
  );
}
