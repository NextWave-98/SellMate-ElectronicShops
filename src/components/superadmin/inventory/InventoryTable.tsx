import type { InventoryItem } from '../../../hooks/useInventory';
import InventoryStatusBadge from './InventoryStatusBadge';
import { getInventoryStatus, resolveInventoryMinStock } from '../../../utils/productListFilters';
import { Package, MapPin, Edit, Trash2, MoreVertical, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import Pagination from '../../common/Pagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InventoryTableProps {
  inventory: InventoryItem[];
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  onView?: (item: InventoryItem) => void;
  onAdjustStock?: (item: InventoryItem) => void;
  onTransferStock?: (item: InventoryItem) => void;
  onEditProduct?: (item: InventoryItem) => void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export default function InventoryTable({
  inventory,
  onEdit,
  onDelete,
  onView,
  onAdjustStock,
  onTransferStock,
  onEditProduct,
  currentPage,
  itemsPerPage,
  totalItems,
  totalPages,
  onPageChange,
  onItemsPerPageChange,
}: InventoryTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'LKR 0';
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(inventory.map(item => item.id)));
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
    return inventory.filter(item => selectedRows.has(item.id));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const getStockHealthColor = (quantity: number, minStock: number, maxStock: number) => {
    if (quantity === 0) return 'bg-red-500';
    if (quantity < minStock) return 'bg-yellow-500';
    if (quantity > maxStock) return 'bg-orange-400';
    return 'bg-green-500';
  };

  const calculateStockPercentage = (quantity: number, maxStock: number) => {
    if (!maxStock || maxStock <= 0) return 100;
    return Math.min(100, (quantity / maxStock) * 100);
  };

  // Controlled: parent provides paginated inventory
  const currentInventory = inventory;

  if (inventory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Package className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No inventory items found</h3>
        <p className="text-gray-600">Try adjusting your filters or search query</p>
      </div>
    );
  }

  const selectedItems = getSelectedItems();
  const hasSelection = selectedRows.size > 0;
  const isAllSelected = inventory.length > 0 && selectedRows.size === inventory.length;

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
              <Button variant="ghost" size="sm" onClick={clearSelection} className="text-orange-600 hover:text-orange-800">
                Clear selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {selectedRows.size === 1 && onView && (
                <Button variant="outline" size="sm" onClick={() => { onView(selectedItems[0]); clearSelection(); }}>
                  <Eye className="w-4 h-4" /> View
                </Button>
              )}
              {selectedRows.size === 1 && onEdit && (
                <Button variant="outline" size="sm" onClick={() => { onEdit(selectedItems[0]); clearSelection(); }}>
                  <Edit className="w-4 h-4" /> Edit
                </Button>
              )}
              {onDelete && (
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                    selectedItems.forEach(item => onDelete(item));
                    clearSelection();
                  }}>
                  <Trash2 className="w-4 h-4" />
                  Delete {selectedRows.size === 1 ? 'Item' : 'Items'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead>Product Details</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stock Level</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Pricing &amp; Profit</TableHead>
            <TableHead>Last Restocked</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentInventory.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={selectedRows.has(item.id)}
                  onCheckedChange={(checked) => handleSelectRow(item.id, !!checked)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{item.product?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{item.product?.productCode || item.product?.sku || 'N/A'}</div>
                    <div className="text-xs text-gray-400">{item.product?.category?.name || 'N/A'}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-gray-900">{item.location?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{item.location?.locationCode || 'N/A'}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <InventoryStatusBadge status={getInventoryStatus({
                  quantity: item.quantity,
                  minStockLevel: item.minStockLevel,
                  maxStockLevel: item.maxStockLevel,
                  product: item.product,
                })} />
              </TableCell>
              <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.quantity} units</span>
                      <span className="text-xs text-gray-500">
                        {calculateStockPercentage(item.quantity, (item.maxStockLevel ?? 0)).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${getStockHealthColor(
                          item.quantity,
                          resolveInventoryMinStock(item),
                          (item.maxStockLevel ?? 0)
                        )}`}
                        style={{
                          width: `${calculateStockPercentage(item.quantity, (item.maxStockLevel ?? 0))}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Min: {resolveInventoryMinStock(item) || 'N/A'} | Max: {item.maxStockLevel ?? 'N/A'}
                    </div>
                  </div>
              </TableCell>
              <TableCell>
                  <div className="text-xs font-semibold text-gray-900">
                    {formatCurrency(item.quantity * (Number(item.product?.unitPrice) || 0))}
                  </div>
                  <div className="text-xs text-gray-500">
                    @{formatCurrency(Number(item.product?.unitPrice) || 0)}/unit
                  </div>
              </TableCell>
              <TableCell>
                  {(() => {
                    const sellPrice = Number(item.product?.unitPrice) || 0;
                    const costPrice = item.product?.costPrice != null ? Number(item.product.costPrice) : null;
                    const hasCost = costPrice !== null && costPrice > 0;
                    const profitPerUnit = hasCost ? sellPrice - costPrice! : null;
                    const totalProfit = hasCost ? profitPerUnit! * item.quantity : null;
                    const margin = hasCost && sellPrice > 0 ? ((profitPerUnit! / sellPrice) * 100) : null;
                    return (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">Sell:</span>
                          <span className="text-xs font-semibold text-gray-800">{formatCurrency(sellPrice)}</span>
                        </div>
                        {hasCost ? (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">Cost:</span>
                              <span className="text-xs font-medium text-gray-600">{formatCurrency(costPrice!)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">Profit:</span>
                              <span className={`text-xs font-semibold ${profitPerUnit! >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {formatCurrency(profitPerUnit!)}/unit
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">Total:</span>
                              <span className={`text-xs font-bold ${totalProfit! >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {formatCurrency(totalProfit!)}
                              </span>
                            </div>
                            {margin !== null && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400">Margin:</span>
                                <span className={`text-xs font-medium ${margin >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                  {margin.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                              ⚠ Please add cost price
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </TableCell>
              <TableCell>
                  <div className="text-xs text-gray-900">{formatDate(item.lastRestocked)}</div>
                  <div className="text-xs text-gray-500">
                    Updated: {formatDate(item.updatedAt)}
                  </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onView && (
                      <DropdownMenuItem onClick={() => { onView(item); }}>
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </DropdownMenuItem>
                    )}
                    {onEditProduct && (
                      <DropdownMenuItem onClick={() => { onEditProduct(item); }} className="text-blue-700">
                        <Edit className="w-4 h-4 mr-2" /> Edit Product
                      </DropdownMenuItem>
                    )}
                    {onEdit && (
                      <DropdownMenuItem onClick={() => { onEdit(item); }}>
                        <Edit className="w-4 h-4 mr-2" /> Edit Inventory
                      </DropdownMenuItem>
                    )}
                    {onAdjustStock && (
                      <DropdownMenuItem onClick={() => { onAdjustStock(item); }} className="text-green-700">
                        <TrendingUp className="w-4 h-4 mr-2" /> Adjust Stock
                      </DropdownMenuItem>
                    )}
                    {onTransferStock && (
                      <DropdownMenuItem onClick={() => { onTransferStock(item); }} className="text-purple-700">
                        <TrendingDown className="w-4 h-4 mr-2" /> Transfer Stock
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { onDelete(item); }} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Item
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
