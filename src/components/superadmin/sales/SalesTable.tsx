import type { Sale } from '../../../types/sales.types';
import SalesStatusBadge from './SalesStatusBadge';
import PaymentMethodBadge from './PaymentMethodBadge';
import { Receipt, Eye, X, RotateCcw, MoreVertical, User, MapPin, Download, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Pagination from '../../common/Pagination';
import SaleInvoiceFormatModal, { type InvoiceAction } from '../../sales/SaleInvoiceFormatModal';
import type { PaperFormat } from '../../branch/pos/PrintOptionsModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface SalesTableProps {
  sales: Sale[];
  onView?: (sale: Sale) => void;
  onCancel?: (sale: Sale) => void;
  onRefund?: (sale: Sale) => void;
  onDelete?: (sale: Sale) => void;
  onDownload?: (sale: Sale, format: PaperFormat) => void | Promise<void>;
  onPrint?: (sale: Sale, format: PaperFormat) => void | Promise<void>;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export default function SalesTable({ sales, onView, onCancel, onRefund, onDelete, onDownload, onPrint, currentPage, itemsPerPage, totalItems, totalPages, onPageChange, onItemsPerPageChange }: SalesTableProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [formatModal, setFormatModal] = useState<{
    sale: Sale;
    action: InvoiceAction;
  } | null>(null);

  const openFormatModal = (sale: Sale, action: InvoiceAction) => {
    setActiveMenu(null);
    setFormatModal({ sale, action });
  };

  const handleFormatConfirm = async (format: PaperFormat) => {
    if (!formatModal) return;
    const { sale, action } = formatModal;
    if (action === 'print') {
      await onPrint?.(sale, format);
    } else {
      await onDownload?.(sale, format);
    }
    setSelectedSales(new Set());
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleMenu = (saleId: string) => {
    setActiveMenu(activeMenu === saleId ? null : saleId);
  };

  const getTotalItems = (sale: Sale) => {
    return sale.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleSelectAllSales = (checked: boolean) => {
    if (checked) {
      const allSaleIds = sales.map(sale => sale.id);
      setSelectedSales(new Set(allSaleIds));
    } else {
      setSelectedSales(new Set());
    }
  };

  const handleSelectSale = (saleId: string, checked: boolean) => {
    const newSelectedSales = new Set(selectedSales);
    if (checked) {
      newSelectedSales.add(saleId);
    } else {
      newSelectedSales.delete(saleId);
    }
    setSelectedSales(newSelectedSales);
  };

  const handleViewSelectedSale = () => {
    const selectedSaleIds = Array.from(selectedSales);
    console.log('handleViewSelectedSale - selectedSaleIds:', selectedSaleIds);
    if (selectedSaleIds.length === 1) {
      const selectedSale = sales.find(sale => sale.id === selectedSaleIds[0]);
      if (selectedSale) {
        onView?.(selectedSale);
        setSelectedSales(new Set()); // Clear selection after action
      }
    }
  };

  const handleDownloadSelectedSale = () => {
    const selectedSaleIds = Array.from(selectedSales);
    if (selectedSaleIds.length === 1) {
      const selectedSale = sales.find(sale => sale.id === selectedSaleIds[0]);
      if (selectedSale) openFormatModal(selectedSale, 'download');
    }
  };

  const handlePrintSelectedSale = () => {
    const selectedSaleIds = Array.from(selectedSales);
    if (selectedSaleIds.length === 1) {
      const selectedSale = sales.find(sale => sale.id === selectedSaleIds[0]);
      if (selectedSale) openFormatModal(selectedSale, 'print');
    }
  };

  const clearSelection = () => {
    setSelectedSales(new Set());
  };

  // Controlled: parent provides paginated sales
  const currentSales = sales;

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Receipt className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No sales found</h3>
        <p className="text-gray-600">Try adjusting your filters or search query</p>
      </div>
    );
  }
  return (
    <>
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Bulk Actions */}
      {selectedSales.size > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-orange-900">
                {selectedSales.size} sale{selectedSales.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleViewSelectedSale}
                  disabled={selectedSales.size !== 1}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </button>
                <button
                  onClick={handleDownloadSelectedSale}
                  disabled={selectedSales.size !== 1}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </button>
                <button
                  onClick={handlePrintSelectedSale}
                  disabled={selectedSales.size !== 1}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </button>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="text-sm text-orange-600 hover:text-orange-800 font-medium"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedSales.size === sales.length && sales.length > 0}
                  onCheckedChange={(checked) => handleSelectAllSales(!!checked)}
                />
              </TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedSales.has(sale.id)}
                    onCheckedChange={(checked) => handleSelectSale(sale.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{sale.invoiceNumber}</div>
                      {/* <div className="text-xs text-gray-500">ID: {sale.id}</div> */}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{sale.customerName}</div>
                      {sale.customerPhone && (
                        <div className="text-xs text-gray-500">{sale.customerPhone}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-900">{sale.location.name}</div>
                      <div className="text-xs text-gray-500">{sale.location?.locationCode}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{getTotalItems(sale)} item{getTotalItems(sale) !== 1 ? 's' : ''}</div>
                  {sale.items.length > 0 && (
                    <div className="text-xs text-gray-500 mt-0.5 max-w-[140px]">
                      {sale.items.slice(0, 2).map((item, i) => (
                        <div key={i} className="truncate">{item.productName || ' '}</div>
                      ))}
                      {sale.items.length > 2 && (
                        <div className="text-gray-400">+{sale.items.length - 2} more</div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(sale.totalAmount)}
                  </div>
                  {sale.discount > 0 && (
                    <div className="text-xs text-green-600">-{formatCurrency(sale.discount)} disc</div>
                  )}
                </TableCell>
                <TableCell>
                  <PaymentMethodBadge method={sale.paymentMethod} />
                </TableCell>
                <TableCell>
                  <SalesStatusBadge status={sale.status} />
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{formatDate(sale.saleDate)}</div>
                  <div className="text-xs text-gray-500">{formatTime(sale.createdAt)}</div>
                </TableCell>
                <TableCell className="text-right text-sm font-medium relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMenu(sale.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {activeMenu === sale.id && (
                    <div className="absolute right-0 mt-2 mr-2 w-48 rounded-md shadow-lg bg-white z-10">
                      <div className="py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onView?.(sale);
                            setActiveMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFormatModal(sale, 'download');
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFormatModal(sale, 'print');
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </button>
                        {sale.status !== 'cancelled' && sale.status !== 'refunded' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCancel?.(sale);
                                setActiveMenu(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel Sale
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRefund?.(sale);
                                setActiveMenu(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Refund Sale
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(sale);
                            setActiveMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 border-t border-gray-100"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Sale
                        </button>
                      </div>
                    </div>
                  )}
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

    <SaleInvoiceFormatModal
      isOpen={formatModal !== null}
      onClose={() => setFormatModal(null)}
      action={formatModal?.action ?? 'download'}
      invoiceLabel={formatModal?.sale.invoiceNumber}
      onConfirm={handleFormatConfirm}
    />
    </>
  );
}
