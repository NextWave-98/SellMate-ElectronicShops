import { Eye, Edit, Trash2 } from 'lucide-react';
import type { Customer } from '../../../types/customer.types';
import { CustomerStatus } from '../../../types/customer.types';
import { formatCurrency } from '../../../utils/currency';
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

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  selectable?: boolean;
  selectedCustomers?: Customer[];
  onSelectionChange?: (customers: Customer[]) => void;
}

export default function CustomerTable({ 
  customers, 
  onView, 
  onEdit, 
  onDelete, 
  currentPage, 
  itemsPerPage, 
  totalItems, 
  totalPages, 
  onPageChange, 
  onItemsPerPageChange,
  selectable = false,
  selectedCustomers = [],
  onSelectionChange
}: CustomerTableProps) {

  const getStatusBadge = (status: CustomerStatus) => {
    const badges = {
      [CustomerStatus.ACTIVE]: 'bg-green-100 text-green-700',
      [CustomerStatus.INACTIVE]: 'bg-gray-100 text-gray-700',
      [CustomerStatus.BLOCKED]: 'bg-red-100 text-red-700',
    };
    return badges[status];
  };

  const isSelected = (customer: Customer) => {
    return selectedCustomers.some(selected => selected.id === customer.id);
  };

  const handleSelectCustomer = (customer: Customer) => {
    if (!onSelectionChange) return;

    if (isSelected(customer)) {
      onSelectionChange(selectedCustomers.filter(selected => selected.id !== customer.id));
    } else {
      onSelectionChange([...selectedCustomers, customer]);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedCustomers.length === customers.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(customers);
    }
  };

  // Controlled: parent provides paginated customers
  const currentCustomers = customers;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedCustomers.length === customers.length && customers.length > 0}
                  onCheckedChange={() => handleSelectAll()}
                />
              </TableHead>
            )}
            <TableHead>Customer ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total Purchases</TableHead>
            <TableHead>Total Spent</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentCustomers.map((customer) => (
            <TableRow key={customer.id}>
              {selectable && (
                <TableCell>
                  <Checkbox
                    checked={isSelected(customer)}
                    onCheckedChange={() => handleSelectCustomer(customer)}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium text-gray-900">{customer.customerId}</TableCell>
              <TableCell>
                <div className="font-medium text-gray-900">{customer.firstName} {customer.lastName}</div>
                <div className="text-xs text-gray-500">{customer.city}</div>
              </TableCell>
              <TableCell>
                <div className="text-gray-900">{customer.phone}</div>
                <div className="text-xs text-gray-500">{customer.email}</div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusBadge(customer.status)}>{customer.status}</Badge>
              </TableCell>
              <TableCell>{customer.totalPurchases}</TableCell>
              <TableCell className="font-medium text-gray-900">{formatCurrency(customer.totalSpent)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onView(customer)} title="View">
                    <Eye className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(customer)} title="Edit">
                    <Edit className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(customer)} title="Delete">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
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
