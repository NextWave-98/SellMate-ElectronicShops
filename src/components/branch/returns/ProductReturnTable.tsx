/* eslint-disable @typescript-eslint/no-explicit-any */
import { FileText, Eye, CheckCircle, XCircle, Clock, Package, User, Smartphone } from 'lucide-react';
import { useState } from 'react';
import Pagination from '../../common/Pagination';
import type { ProductReturn } from '../../../hooks/useProductReturn';
import { formatDateTime } from '../../../utils/dateUtils';
import { formatCurrency } from '../../../utils/currency';
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

interface ProductReturnTableProps {
  returns: ProductReturn[];
  onView?: (returnItem: ProductReturn) => void;
  onInspect?: (returnItem: ProductReturn) => void;
  onApprove?: (returnItem: ProductReturn) => void;
  onReject?: (returnItem: ProductReturn) => void;
  onProcess?: (returnItem: ProductReturn) => void;
  // Server-side pagination props (optional)
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  isAdmin?: boolean;
}

export default function ProductReturnTable({
  returns,
  onView,
  onInspect,
  onApprove,
  onReject,
  onProcess,
  pagination,
  onPageChange,
  onLimitChange,
  isAdmin,
}: ProductReturnTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());



  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      RECEIVED: 'bg-orange-100 text-orange-800 border-orange-200',
      INSPECTING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PENDING_APPROVAL: 'bg-orange-100 text-orange-800 border-orange-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      PROCESSING: 'bg-purple-100 text-purple-800 border-purple-200',
      COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
      REPLACEMENT_SENT: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      CUSTOMER_RETURN: 'bg-orange-100 text-orange-800',
      WARRANTY_RETURN: 'bg-green-100 text-green-800',
      DEFECTIVE: 'bg-red-100 text-red-800',
      EXCESS_STOCK: 'bg-yellow-100 text-yellow-800',
      QUALITY_FAILURE: 'bg-orange-100 text-orange-800',
      DAMAGED: 'bg-red-100 text-red-800',
      INTERNAL_TRANSFER: 'bg-purple-100 text-purple-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getSourceTypeIcon = (sourceType: string) => {
    const icons: Record<string, any> = {
      SALE: <Package className="w-4 h-4" />,
      WARRANTY_CLAIM: <CheckCircle className="w-4 h-4" />,
      JOB_SHEET: <FileText className="w-4 h-4" />,
      STOCK_CHECK: <Package className="w-4 h-4" />,
      DIRECT: <User className="w-4 h-4" />,
      GOODS_RECEIPT: <Package className="w-4 h-4" />,
    };
    return icons[sourceType] || <Package className="w-4 h-4" />;
  };

  const canInspect = (returnItem: ProductReturn) => {
    return ['RECEIVED', 'INSPECTING'].includes(returnItem.status);
  };

  const canApprove = (returnItem: ProductReturn) => {
    return ['PENDING_APPROVAL', 'INSPECTING','PENDING'].includes(returnItem.status);
  };

  const canReject = (returnItem: ProductReturn) => {
    return ['RECEIVED', 'INSPECTING', 'PENDING_APPROVAL'].includes(returnItem.status);
  };

  const canProcess = (returnItem: ProductReturn) => {
    return returnItem.status === 'APPROVED';
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(returns.map(r => r.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (returnId: string, checked: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(returnId);
    } else {
      newSelectedRows.delete(returnId);
    }
    setSelectedRows(newSelectedRows);
  };

  const getSelectedReturns = () => {
    return returns.filter(r => selectedRows.has(r.id));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const selectedReturns = getSelectedReturns();
  const hasSelection = selectedRows.size > 0;
  const isAllSelected = returns.length > 0 && selectedRows.size === returns.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                <Button variant="outline" size="sm" onClick={() => { onView(selectedReturns[0]); clearSelection(); }}>
                  <Eye className="w-4 h-4" /> View
                </Button>
              )}
              {selectedRows.size === 1 && onInspect && canInspect(selectedReturns[0]) && (
                <Button variant="outline" size="sm" onClick={() => { onInspect(selectedReturns[0]); clearSelection(); }}>
                  <Clock className="w-4 h-4" /> Inspect
                </Button>
              )}
              {selectedRows.size === 1 && onApprove && canApprove(selectedReturns[0]) && isAdmin && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { onApprove(selectedReturns[0]); clearSelection(); }}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
              )}
              {selectedRows.size === 1 && onReject && canReject(selectedReturns[0]) && isAdmin && (
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { onReject(selectedReturns[0]); clearSelection(); }}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              )}
              {selectedRows.size === 1 && onProcess && canProcess(selectedReturns[0]) && (
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => { onProcess(selectedReturns[0]); clearSelection(); }}>
                  <Package className="w-4 h-4" /> Process
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
            <TableHead>Return Details</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returns.map((returnItem) => (
            <TableRow key={returnItem.id}>
              <TableCell>
                <Checkbox
                  checked={selectedRows.has(returnItem.id)}
                  onCheckedChange={(checked) => handleSelectRow(returnItem.id, !!checked)}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium text-gray-900">{returnItem.returnNumber}</div>
                <div className="text-xs text-gray-500">{returnItem.returnReason}</div>
                <Badge className={`mt-1 ${getCategoryColor(returnItem.returnCategory)}`}>
                  {returnItem.returnCategory.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{returnItem?.product?.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-gray-900">{returnItem.customerName || 'N/A'}</div>
                <div className="text-xs text-gray-500">{returnItem.customerPhone || ''}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getSourceTypeIcon(returnItem.sourceType)}
                  <span>{returnItem.sourceType.replace('_', ' ')}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(returnItem.status)}>
                  {returnItem.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div>{formatCurrency(returnItem.productValue)}</div>
                {returnItem.refundAmount && (
                  <div className="text-xs text-gray-500">Refund: {formatCurrency(returnItem.refundAmount)}</div>
                )}
              </TableCell>
              <TableCell className="text-gray-500">{formatDateTime(returnItem.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination && (
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={onPageChange!}
            onItemsPerPageChange={onLimitChange!}
          />
        </div>
      )}
    </div>
  );
}