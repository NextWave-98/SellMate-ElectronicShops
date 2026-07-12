import type { Inventory } from '../../../types/inventory.types';
import Pagination from '../../common/Pagination';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProductsTableProps {
  items: Inventory[];
  selectedProducts: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  // Server-side pagination props (optional)
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export default function ProductsTable({ 
  items, 
  selectedProducts, 
  onSelectionChange,
  pagination,
  onPageChange,
  onLimitChange
}: ProductsTableProps) {
  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      case 'overstocked':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'In Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      case 'overstocked':
        return 'Overstocked';
      default:
        return status;
    }
  };

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = items.map(item => item.id);
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      onSelectionChange(selectedProducts.filter(id => id !== productId));
    } else {
      onSelectionChange([...selectedProducts, productId]);
    }
  };

  const isAllSelected = items.length > 0 && items.every(item => selectedProducts.includes(item.id));
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-600">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={(checked) =>
                  handleSelectAll({ target: { checked: !!checked } } as React.ChangeEvent<HTMLInputElement>)
                }
              />
            </TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-center">Quantity</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={selectedProducts.includes(item.id)}
                  onCheckedChange={() => handleSelectProduct(item.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell className="font-medium text-gray-900">{item.productName}</TableCell>
              <TableCell className="text-gray-700">{item.productCode}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.category}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="font-semibold text-gray-900">{item.quantity}</div>
                <div className="text-xs text-gray-500">{item.minStockLevel} - {item.maxStockLevel}</div>
              </TableCell>
              <TableCell className="text-right font-medium text-gray-900">
                {formatCurrency(item.unitPrice)}
              </TableCell>
              <TableCell className="text-center">
                <Badge className={getStatusColor(item.status)}>{getStatusText(item.status)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {pagination && onPageChange && onLimitChange && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          itemsPerPage={pagination.limit}
          totalItems={pagination.total}
          onPageChange={onPageChange}
          onItemsPerPageChange={onLimitChange}
        />
      )}
    </div>
  );
}
