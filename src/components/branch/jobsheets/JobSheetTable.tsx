import { FileText, Eye, Edit, DollarSign, User, Smartphone, Download, Printer } from 'lucide-react';
import { useState } from 'react';
import Pagination from '../../common/Pagination';
import type { JobSheet } from '../../../hooks/useJobSheet';
import { formatDateTime } from '../../../utils/dateUtils';
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

interface JobSheetTableProps {
  jobSheets: JobSheet[];
  onView?: (jobSheet: JobSheet) => void;
  onEdit?: (jobSheet: JobSheet) => void;
  onPayment?: (jobSheet: JobSheet) => void;
  onDownloadPDF?: (jobSheet: JobSheet) => void;
  onPrintCard?: (jobSheet: JobSheet) => void;
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

export default function JobSheetTable({
  jobSheets,
  onView,
  onEdit,
  onPayment,
  pagination,
  onPageChange,
  onDownloadPDF,
  onPrintCard,
  onLimitChange
}: JobSheetTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null) return 'LKR 0.00';
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(jobSheets.map(js => js.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (jobSheetId: string, checked: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(jobSheetId);
    } else {
      newSelectedRows.delete(jobSheetId);
    }
    setSelectedRows(newSelectedRows);
  };

  const getSelectedJobSheets = () => {
    return jobSheets.filter(js => selectedRows.has(js.id));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      IN_PROGRESS: 'bg-orange-100 text-orange-800 border-orange-200',
      WAITING_FOR_PARTS: 'bg-orange-100 text-orange-800 border-orange-200',
      READY_FOR_PICKUP: 'bg-purple-100 text-purple-800 border-purple-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      ON_HOLD: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-700',
      MEDIUM: 'bg-orange-100 text-orange-700',
      HIGH: 'bg-orange-100 text-orange-700',
      URGENT: 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  if (jobSheets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <FileText className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No job sheets found</h3>
        <p className="text-gray-600">Try adjusting your filters or create a new job sheet</p>
      </div>
    );
  }

  const selectedJobSheets = getSelectedJobSheets();
  const hasSelection = selectedRows.size > 0;
  const isAllSelected = jobSheets.length > 0 && selectedRows.size === jobSheets.length;

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
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-orange-600 hover:text-orange-800"
              >
                Clear selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {selectedRows.size === 1 && onView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onView(selectedJobSheets[0]); clearSelection(); }}
                >
                  <Eye className="w-4 h-4" /> View
                </Button>
              )}
              {selectedRows.size === 1 && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onEdit(selectedJobSheets[0]); clearSelection(); }}
                >
                  <Edit className="w-4 h-4" /> Edit
                </Button>
              )}
              {selectedRows.size === 1 && onPayment && selectedJobSheets[0]?.balanceAmount > 0 && (
                <Button
                  size="sm"
                  onClick={() => { onPayment(selectedJobSheets[0]); clearSelection(); }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <DollarSign className="w-4 h-4" /> Add Payment
                </Button>
              )}
              {selectedRows.size === 1 && onDownloadPDF && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onDownloadPDF(selectedJobSheets[0]); clearSelection(); }}
                  className="text-orange-700 border-orange-300 hover:bg-orange-50"
                >
                  <Download className="w-4 h-4" /> Download
                </Button>
              )}
              {selectedRows.size === 1 && onPrintCard && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onPrintCard(selectedJobSheets[0]); clearSelection(); }}
                  className="text-orange-700 border-orange-300 hover:bg-orange-50"
                >
                  <Printer className="w-4 h-4" /> Print
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead>Job Number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Shop</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobSheets.map((jobSheet) => (
            <TableRow key={jobSheet.id}>
              <TableCell>
                <Checkbox
                  checked={selectedRows.has(jobSheet.id)}
                  onCheckedChange={(checked) => handleSelectRow(jobSheet.id, !!checked)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{jobSheet.jobNumber}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{jobSheet.customer?.name}</div>
                    <div className="text-xs text-gray-500">{jobSheet.customer?.phone}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-gray-900">{jobSheet.device?.brand}</div>
                    <div className="text-xs text-gray-500">{jobSheet.device?.model}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{jobSheet.location?.name}</TableCell>
              <TableCell>
                <div className="max-w-xs truncate">{jobSheet.issueDescription}</div>
              </TableCell>
              <TableCell>
                <Badge className={getPriorityColor(jobSheet.priority)}>
                  {jobSheet.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(jobSheet.status)}>
                  {jobSheet.status.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">Total: {formatCurrency(jobSheet.totalAmount)}</div>
                  <div className="text-xs text-green-600">Paid: {formatCurrency(jobSheet.paidAmount)}</div>
                  {jobSheet.balanceAmount > 0 && (
                    <div className="text-xs text-red-600 font-semibold">Balance: {formatCurrency(jobSheet.balanceAmount)}</div>
                  )}
                  {jobSheet.balanceAmount === 0 && (
                    <div className="text-xs text-gray-500">Balance: {formatCurrency(0)}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatDateTime(jobSheet.completedDate ?? '')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

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
