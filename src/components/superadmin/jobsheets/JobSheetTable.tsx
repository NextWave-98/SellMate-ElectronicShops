import type { JobSheet } from '../../../types/jobsheet.types';
import JobSheetStatusBadge from './JobSheetStatusBadge';
import JobSheetPriorityBadge from './JobSheetPriorityBadge';
import { FileText, Eye, Edit, User, Smartphone, MapPin, DollarSign, Download, Printer } from 'lucide-react';
import { useState } from 'react';
import Pagination from '../../common/Pagination';
import { formatDate } from '../../../utils/dateUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface JobSheetTableProps {
  jobSheets: JobSheet[];
  onView?: (jobSheet: JobSheet) => void;
  onEdit?: (jobSheet: JobSheet) => void;
  onCancel?: (jobSheet: JobSheet) => void;
  onPayment?: (jobSheet: JobSheet) => void;
  onDownloadPDF?: (jobSheet: JobSheet) => void;
  onPrintCard?: (jobSheet: JobSheet) => void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export default function JobSheetTable({
  jobSheets,
  onView,
  onEdit,
  onPayment,
  currentPage,
  itemsPerPage,
  totalItems,
  totalPages,
  onPageChange,
  onDownloadPDF,
  onPrintCard,
  onItemsPerPageChange
}: JobSheetTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null) return 'LKR 0.00';
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(jobSheets.map(js => js.id.toString())));
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
    return jobSheets.filter(js => selectedRows.has(js.id.toString()));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const isOverdue = (jobSheet: JobSheet) => {
    if (jobSheet.status === 'completed' || jobSheet.status === 'cancelled') {
      return false;
    }
    if (!jobSheet.expectedCompletionDate) {
      return false;
    }
    const today = new Date().toISOString().split('T')[0];
    return jobSheet.expectedCompletionDate < today;
  };

  if (jobSheets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <FileText className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No job sheets found</h3>
        <p className="text-gray-600">Try adjusting your filters or search query</p>
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
                    onView(selectedJobSheets[0]);
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
                    onEdit(selectedJobSheets[0]);
                    clearSelection();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              {selectedRows.size === 1 && onPayment && selectedJobSheets[0]?.balanceAmount > 0 && (
                <button
                  onClick={() => {
                    onPayment(selectedJobSheets[0]);
                    clearSelection();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <DollarSign className="w-4 h-4" />
                  Add Payment
                </button>
              )}
              {selectedRows.size === 1  && onDownloadPDF && (
                <button
                  onClick={() => {
                    onDownloadPDF(selectedJobSheets[0]);
                    clearSelection();
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </button>
              )}
              {selectedRows.size === 1 && onPrintCard && (
                <button
                  onClick={() => {
                    onPrintCard(selectedJobSheets[0]);
                    clearSelection();
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="!overflow-x-auto">
        <Table className="min-w-[100px] !overflow-x-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(c) => handleSelectAll(!!c)}
                />
              </TableHead>
              <TableHead>Job Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobSheets.map((jobSheet) => (
              <TableRow
                key={jobSheet.id}
                className={isOverdue(jobSheet) ? 'bg-red-50' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedRows.has(jobSheet.id.toString())}
                    onCheckedChange={(c) => handleSelectRow(jobSheet.id.toString(), !!c)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{jobSheet.jobNumber}</div>
                      <div className="text-xs text-gray-500">ID: {jobSheet.id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{jobSheet.customerName}</div>
                      <div className="text-xs text-gray-500">{jobSheet.customerPhone}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Smartphone className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-900">{jobSheet.deviceBrand} {jobSheet.deviceModel}</div>
                      <div className="text-xs text-gray-500">{jobSheet.deviceType}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-900">{jobSheet.location?.name}</div>
                      {/* <div className="text-xs text-gray-500">{jobSheet.location?.locationCode || ''}</div> */}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900 max-w-xs truncate" title={jobSheet.issueDescription}>
                    {jobSheet.issueDescription}
                  </div>
                  {jobSheet.assignedTo && (
                    <div className="text-xs text-gray-500 mt-1">Assigned: {jobSheet.assignedTo}</div>
                  )}
                </TableCell>
                <TableCell>
                  <JobSheetPriorityBadge priority={jobSheet.priority} />
                </TableCell>
                <TableCell>
                  <JobSheetStatusBadge status={jobSheet.status} />
                </TableCell>
                <TableCell>
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(jobSheet.totalCost)}</div>
                  {jobSheet.balanceAmount > 0 && (
                    <div className="text-xs text-orange-600">Bal: {formatCurrency(jobSheet.balanceAmount)}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className={`text-sm ${isOverdue(jobSheet) ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                    {formatDate(jobSheet.expectedCompletionDate)}
                  </div>
                  {isOverdue(jobSheet) && <div className="text-xs text-red-600">Overdue!</div>}
                </TableCell>
              </TableRow>
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
