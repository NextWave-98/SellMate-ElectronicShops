import PurchaseOrderStatusBadge from './PurchaseOrderStatusBadge';
import { FileText, Eye, Edit, Trash2, CheckCircle, XCircle, PackageCheck, RefreshCcw, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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

// API PurchaseOrder type matching backend response
interface PurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDate?: string;
  totalAmount: number;
  paidAmount?: number;
  balanceAmount?: number;
  dueAmount: number;
  status: string;
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID';
  items?: unknown[];
  supplier?: {
    name: string;
    supplierCode: string;
  };
}

interface PurchaseOrderTableProps {
  orders: PurchaseOrder[];
  onView?: (order: PurchaseOrder) => void;
  onEdit?: (order: PurchaseOrder) => void;
  onDelete?: (order: PurchaseOrder) => void;
  onPayment?: (order: PurchaseOrder) => void;
  onApprove?: (order: PurchaseOrder) => void;
  onCancel?: (order: PurchaseOrder) => void;
  onReceive?: (order: PurchaseOrder) => void;
  onCreateGRN?: (order: PurchaseOrder) => void;
  onUpdateStatus?: (order: PurchaseOrder) => void;
  // Pagination (controlled)
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  hideFinancials?: boolean;
  // Selection props
  selectable?: boolean;
  selectedOrders?: PurchaseOrder[];
  onSelectionChange?: (orders: PurchaseOrder[]) => void;
}

export default function PurchaseOrderTable({
  orders,
  currentPage = 1,
  itemsPerPage = 10,
  totalItems = orders.length,
  onPageChange = () => {},
  onItemsPerPageChange = () => {},
  hideFinancials = false,
  selectable = false,
  selectedOrders = [],
  onSelectionChange,
}: PurchaseOrderTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Pagination (controlled)
  const totalPages = Math.ceil((totalItems || orders.length) / itemsPerPage);
  const currentOrders = orders;

  const handleItemsPerPageChange = (value: number) => {
    onItemsPerPageChange(value);
    onPageChange(1);
  };

  console.log(currentOrders)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (orderId: string) => {
    setOpenMenuId(openMenuId === orderId ? null : orderId);
  };

  const isSelected = (order: PurchaseOrder) => {
    return selectedOrders.some(selected => selected.id === order.id);
  };

  const handleSelectOrder = (order: PurchaseOrder) => {
    if (!onSelectionChange) return;

    if (isSelected(order)) {
      onSelectionChange(selectedOrders.filter(selected => selected.id !== order.id));
    } else {
      onSelectionChange([...selectedOrders, order]);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedOrders.length === orders.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(orders);
    }
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <FileText className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No purchase orders found</h3>
        <p className="text-gray-600">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto min-h-96">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onCheckedChange={() => handleSelectAll()}
                  />
                </TableHead>
              )}
              <TableHead>Order #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Expected Date</TableHead>
              {!hideFinancials && <TableHead>Total Amount</TableHead>}
              <TableHead>Status</TableHead>
              {!hideFinancials && <TableHead>Payment Status</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentOrders.map((order) => (
              <TableRow key={order.id}>
                {selectable && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected(order)}
                      onCheckedChange={() => handleSelectOrder(order)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">
                        {order.items?.length || 0} items
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-gray-900">
                    {order.supplier?.name || 'Unknown Supplier'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {order.supplier?.supplierCode || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>{formatDate(order.orderDate)}</TableCell>
                <TableCell>{order.expectedDate ? formatDate(order.expectedDate) : 'N/A'}</TableCell>
                {!hideFinancials && (
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    {(order.balanceAmount ?? order.dueAmount ?? 0) > 0 && (
                      <div className="text-xs text-red-600">
                        Due: {formatCurrency(order.balanceAmount ?? order.dueAmount ?? 0)}
                      </div>
                    )}
                    {(order.paidAmount ?? 0) > 0 && (
                      <div className="text-xs text-green-600">
                        Paid: {formatCurrency(order.paidAmount ?? 0)}
                      </div>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <PurchaseOrderStatusBadge status={order.status as 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'} />
                </TableCell>
                {!hideFinancials && (
                <TableCell>
                  {order.paymentStatus ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : order.paymentStatus === 'PARTIALLY_PAID'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.paymentStatus === 'UNPAID'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {order.paymentStatus === 'PAID'
                        ? 'Paid'
                        : order.paymentStatus === 'PARTIALLY_PAID'
                        ? 'Partially Paid'
                        : order.paymentStatus === 'UNPAID'
                        ? 'Unpaid'
                        : 'Overpaid'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      N/A
                    </span>
                  )}
                </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems || orders.length}
        onPageChange={onPageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
