import { useState } from 'react';
import { MoreVertical, Eye, CheckCircle, Trash2, CheckCircle2 } from 'lucide-react';
import type { GoodsReceipt } from '../../../hooks/useGoodsReceipt';
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

interface GoodsReceiptTableProps {
  receipts: GoodsReceipt[];
  onView: (receipt: GoodsReceipt) => void;
  onApprove: (receipt: GoodsReceipt) => void;
  onDelete: (receiptId: string) => void;
  loading?: boolean;
  // Controlled pagination props
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  // Selection props
  selectable?: boolean;
  selectedReceipts?: GoodsReceipt[];
  onSelectionChange?: (receipts: GoodsReceipt[]) => void;
}

const GoodsReceiptStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    PENDING_QC: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending QC' },
    QC_PASSED: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Approved' },
    APPROVED: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Approved' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  };

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default function GoodsReceiptTable({
  receipts,
  onView,
  onApprove,
  onDelete,
  loading = false,
  currentPage,
  itemsPerPage,
  totalItems,
  totalPages,
  onPageChange,
  onItemsPerPageChange,
  selectable = false,
  selectedReceipts = [],
  onSelectionChange,
}: GoodsReceiptTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isSelected = (receipt: GoodsReceipt) => {
    return selectedReceipts.some(selected => selected.id === receipt.id);
  };

  const handleSelectReceipt = (receipt: GoodsReceipt) => {
    if (!onSelectionChange) return;

    if (isSelected(receipt)) {
      onSelectionChange(selectedReceipts.filter(selected => selected.id !== receipt.id));
    } else {
      onSelectionChange([...selectedReceipts, receipt]);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedReceipts.length === receipts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(receipts);
    }
  };

  const getTotalQuantity = (receipt: GoodsReceipt) => {
    return receipt.items?.reduce((sum, item) => sum + item.receivedQuantity, 0) || 0;
  };

  const getAcceptedQuantity = (receipt: GoodsReceipt) => {
    return receipt.items?.reduce((sum, item) => sum + item.acceptedQuantity, 0) || 0;
  };

  const getRejectedQuantity = (receipt: GoodsReceipt) => {
    return receipt.items?.reduce((sum, item) => sum + item.rejectedQuantity, 0) || 0;
  };

  // Controlled: parent supplies paginated receipts
  const currentReceipts = receipts;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!receipts || receipts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Goods Receipts</h3>
        <p className="text-gray-500 mt-1">Create goods receipts from confirmed purchase orders</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto min-h-96">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedReceipts.length === receipts.length && receipts.length > 0}
                  onCheckedChange={() => handleSelectAll()}
                />
              </TableHead>
            )}
            <TableHead>Receipt #</TableHead>
            <TableHead>PO Number</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Receipt Date</TableHead>
            <TableHead>Quantities</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentReceipts.map((receipt) => (
            <TableRow key={receipt.id}>
              {selectable && (
                <TableCell>
                  <Checkbox
                    checked={isSelected(receipt)}
                    onCheckedChange={() => handleSelectReceipt(receipt)}
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="text-sm font-medium text-gray-900">{receipt.receiptNumber}</div>
                {receipt.invoiceNumber && (
                  <div className="text-xs text-gray-500">Invoice: {receipt.invoiceNumber}</div>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-900">
                  {receipt.purchaseOrder?.poNumber || 'N/A'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium text-gray-900">
                  {receipt.purchaseOrder?.supplier?.name || 'Unknown'}
                </div>
                <div className="text-xs text-gray-500">
                  {receipt.purchaseOrder?.supplier?.supplierCode || ''}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-900">{formatDate(receipt.receiptDate)}</div>
                {receipt.invoiceDate && (
                  <div className="text-xs text-gray-500">Inv: {formatDate(receipt.invoiceDate)}</div>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getTotalQuantity(receipt)}</span>
                    <span className="text-gray-400">received</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <span className="text-green-600">✓ {getAcceptedQuantity(receipt)}</span>
                    {getRejectedQuantity(receipt) > 0 && (
                      <span className="text-red-600">✗ {getRejectedQuantity(receipt)}</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <GoodsReceiptStatusBadge status={receipt.status} />
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
