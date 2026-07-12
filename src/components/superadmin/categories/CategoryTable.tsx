import { Edit, Trash2, Eye, Package, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import Pagination from '../../common/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CategoryTableProps {
  items: CategoryItem[];
  onEdit: (item: CategoryItem) => void;
  onDelete: (item: CategoryItem) => void;
  onView: (item: CategoryItem) => void;
  // Controlled pagination props
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  parent?: {
    name: string;
  };
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function CategoryTable({
  items,
  onEdit,
  onDelete,
  onView,
  currentPage,
  itemsPerPage,
  totalItems,
  totalPages,
  onPageChange,
  onItemsPerPageChange,
}: CategoryTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  // Items are provided by parent; this component is controlled for pagination.
  const currentItems = items;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Found</h3>
          <p className="text-gray-600">
            Get started by creating your first product category.
          </p>
        </div>
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
              <Button variant="ghost" size="sm" onClick={clearSelection} className="text-orange-600 hover:text-orange-800">Clear selection</Button>
            </div>
            <div className="flex items-center gap-2">
              {selectedRows.size === 1 && (
                <Button variant="outline" size="sm" onClick={() => { onView(selectedItems[0]); clearSelection(); }}>
                  <Eye className="w-4 h-4" /> View
                </Button>
              )}
              {selectedRows.size === 1 && (
                <Button variant="outline" size="sm" onClick={() => { onEdit(selectedItems[0]); clearSelection(); }}>
                  <Edit className="w-4 h-4" /> Edit
                </Button>
              )}
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { selectedItems.forEach(item => onDelete(item)); clearSelection(); }}>
                <Trash2 className="w-4 h-4" /> Delete {selectedRows.size === 1 ? 'Item' : 'Items'}
              </Button>
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
            <TableHead>Category</TableHead>
            <TableHead>Parent Category</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Display Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={selectedRows.has(item.id)}
                  onCheckedChange={(checked) => handleSelectRow(item.id, !!checked)}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium text-gray-900">{item.name}</div>
                {item.description && (
                  <div className="text-xs text-gray-500 max-w-xs truncate">{item.description}</div>
                )}
              </TableCell>
              <TableCell>{item.parent ? item.parent.name : '-'}</TableCell>
              <TableCell>
                {item.productCount !== undefined ? (
                  <Badge className="bg-orange-100 text-orange-800">{item.productCount}</Badge>
                ) : '0'}
              </TableCell>
              <TableCell>{item.displayOrder}</TableCell>
              <TableCell>
                {item.isActive ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">
                    <XCircle className="w-3 h-3 mr-1" /> Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-gray-500">{formatDate(item.createdAt)}</TableCell>
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
