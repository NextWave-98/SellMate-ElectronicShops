/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import { DollarSign, RefreshCw, Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import { formatCurrency, formatLargeCurrency } from '../../utils/currency';

type PaymentType = 'INCOMING' | 'OUTGOING';

type DateFilter = '' | 'today' | 'yesterday' | 'this_week' | 'this_year' | 'custom';

interface Payment {
  id: string;
  paymentNumber?: string;
  refundNumber?: string;
  amount: number;
  paymentMethod?: string;
  refundMethod?: string;
  paymentDate?: string;
  refundDate?: string;
  reference?: string;
  notes?: string;
  paymentType: PaymentType;
  paymentCategory: string;
  flow: 'INCOME' | 'EXPENSE';
  
  // For incoming payments
  customerId?: string;
  customer?: {
    id: string;
    name: string;
    customerId: string;
    phone?: string;
  };
  jobSheetId?: string;
  jobSheet?: {
    id: string;
    jobNumber: string;
  };
  receivedBy?: {
    id: string;
    name: string;
  };
  
  // For outgoing payments
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
    supplierCode: string;
    contactPersonName?: string;
  };
  purchaseOrderId?: string;
  purchaseOrder?: {
    id: string;
    poNumber: string;
  };
  
  // For refunds
  saleId?: string;
  sale?: {
    id: string;
    saleNumber: string;
    customer?: {
      id: string;
      name: string;
      customerId: string;
      phone?: string;
    };
    saleItems?: {
      id: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
  };
  reason?: string;
  processedById?: string;
  processedBy?: {
    id: string;
    name: string;
  };
  
  bankName?: string;
  checkNumber?: string;
  transactionId?: string;
  createdAt: string;
}

interface PaymentStats {
  summary: {
    totalTransactions: number;
    netCashFlow: number;
    incomingAmount: number;
    outgoingAmount: number;
  };
  incoming: {
    label: string;
    count: number;
    amount: number;
    description: string;
  };
  outgoing: {
    label: string;
    count: number;
    amount: number;
    description: string;
  };
  thisMonth: {
    transactions: number;
    netCashFlow: number;
    incoming: number;
    outgoing: number;
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [selectedPaymentType, setSelectedPaymentType] = useState<'' | 'INCOMING' | 'OUTGOING'>('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Only auto-populate start/end dates when switching to custom range
  useEffect(() => {
    if (dateFilter === 'custom' && !startDate && !endDate) {
      const today = new Date();
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      setStartDate(formatDate(today));
      setEndDate(formatDate(today));
    } else if (dateFilter !== 'custom') {
      // Clear custom dates when switching to a preset filter
      setStartDate('');
      setEndDate('');
    }
  }, [dateFilter]);

  // useFetch hooks
  const { fetchData: fetchPayments, loading: paymentsLoading } = useFetch();
  const { fetchData: fetchStats, loading: statsLoading } = useFetch();
  
  const loading = paymentsLoading || statsLoading;

  const loadPayments = useCallback(async () => {
    try {
      const params: any = {
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      };
      
      if (selectedPaymentType) params.paymentType = selectedPaymentType;
      if (selectedMethod) params.paymentMethod = selectedMethod;

      // Pass date filter to API instead of filtering client-side
      if (dateFilter && dateFilter !== 'custom') {
        params.dateFilter = dateFilter;
      } else if (dateFilter === 'custom') {
        if (startDate) params.fromDate = startDate;
        if (endDate) params.toDate = endDate;
      }

      const result = await fetchPayments({
        endpoint: '/admin/payments/all',
        method: 'GET',
        data: params,
        silent: true,
      });

      if (result?.success && result.data) {
        const data = result.data as any;
        if (data.payments) {
          setPayments(data.payments);

          // Extract pagination info
          if (data.pagination) {
            setTotalItems(data.pagination.total || 0);
            setTotalPages(data.pagination.totalPages || 0);
          } else {
            setTotalItems(data.payments.length);
            setTotalPages(Math.ceil(data.payments.length / itemsPerPage));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
      toast.error('Failed to load payments');
    }
  }, [currentPage, itemsPerPage, selectedPaymentType, searchQuery, selectedMethod, dateFilter, startDate, endDate, fetchPayments]);

  const loadStats = useCallback(async () => {
    try {
      const result = await fetchStats({
        endpoint: '/admin/payments/stats',
        method: 'GET',
        data: {},
        silent: true,
      });

      if (result?.success && result.data) {
        setStats(result.data as PaymentStats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [fetchStats]);

  const applyFilters = useCallback(() => {
    let filtered = [...payments];

    // Search filter (client-side   backend /admin/payments/all does not support search param)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.paymentNumber?.toLowerCase().includes(query) ||
          payment.refundNumber?.toLowerCase().includes(query) ||
          payment.customer?.name.toLowerCase().includes(query) ||
          payment.supplier?.name.toLowerCase().includes(query) ||
          payment.sale?.customer?.name.toLowerCase().includes(query) ||
          payment.sale?.saleNumber?.toLowerCase().includes(query) ||
          payment.jobSheet?.jobNumber?.toLowerCase().includes(query) ||
          payment.purchaseOrder?.poNumber?.toLowerCase().includes(query) ||
          payment.reference?.toLowerCase().includes(query) ||
          payment.referenceNumber?.toLowerCase().includes(query)
      );
    }

    setFilteredPayments(filtered);
  }, [payments, searchQuery]);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, selectedPaymentType, selectedMethod, dateFilter, startDate, endDate]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPayments(), loadStats()]);
    setRefreshing(false);
    toast.success('Payments refreshed');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // loadPayments will be triggered by useEffect watching currentPage
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    // loadPayments will be triggered by useEffect watching itemsPerPage
  };

  const handleResetFilters = () => {
    setSelectedPaymentType('');
    setSelectedMethod('');
    setDateFilter('this_year');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Reset to page 1 whenever filters change (so pagination reflects new filtered results)
  const handleFilterChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setCurrentPage(1);
  };

  const handleExport = () => {
    // Export to CSV
    const csvData = filteredPayments.map((payment) => ({
      'Payment Number': payment.paymentNumber || payment.refundNumber || '',
      'Type': payment.paymentType,
      'Category': payment.paymentCategory,
      'Customer/Supplier': payment.customer?.name || payment.supplier?.name || payment.sale?.customer?.name || '',
      'Job/PO/Sale Number': payment.jobSheet?.jobNumber || payment.purchaseOrder?.poNumber || payment.sale?.saleNumber || 'N/A',
      'Amount': payment.amount,
      'Payment Method': payment.paymentMethod || payment.refundMethod || '',
      'Payment Date': payment.paymentDate || payment.refundDate || payment.createdAt,
      'Reference': payment.reference || '',
      'Bank': payment.bankName || '',
      'Transaction ID': payment.transactionId || '',
      'Check Number': payment.checkNumber || '',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Payments exported successfully');
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Track and manage supplier payments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredPayments.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.summary.totalTransactions}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            </CardContent>
          </Card>

          <Card><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Incoming (Revenue)</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.summary.incomingAmount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats.incoming.count} payments</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Outgoing (Expenses)</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.summary.outgoingAmount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats.outgoing.count} payments</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${stats.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.summary.netCashFlow)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This Month: {formatCurrency(stats.thisMonth.netCashFlow)}
                </p>
              </div>
              <div className={`${stats.summary.netCashFlow >= 0 ? 'bg-green-50' : 'bg-red-50'} p-3 rounded-lg`}>
                <DollarSign className={`w-6 h-6 ${stats.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <Input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />

          {/* Payment Type Filter */}
          <select
            value={selectedPaymentType}
            onChange={(e) => handleFilterChange(setSelectedPaymentType)(e.target.value as '' | 'INCOMING' | 'OUTGOING')}
            className="px-4 py-2 border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          >
            <option value="">All Payment Types</option>
            <option value="INCOMING">Incoming (Revenue)</option>
            <option value="OUTGOING">Outgoing (Expenses)</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={selectedMethod}
            onChange={(e) => handleFilterChange(setSelectedMethod)(e.target.value)}
            className="px-4 py-2 border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          >
            <option value="">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="MINTPAY">MintPay</option>
            <option value="KOKO">KOKO</option>
            <option value="MOBILE_PAYMENT">Mobile Payment</option>
            <option value="CHECK">Check</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={dateFilter}
            onChange={(e) => handleFilterChange(setDateFilter)(e.target.value as DateFilter)}
            className="px-4 py-2 border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
     

        {/* Custom Date Range - Only show when Custom is selected */}
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="px-4 py-2 border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="px-4 py-2 border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
          </div>
        )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            onClick={handleResetFilters}
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-white/20">
          <h3 className="text-lg font-semibold text-gray-900">
            All Payments ({filteredPayments.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/20">
            <thead className="bg-white/30 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer/Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job/PO/Sale #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-white/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2  py-1 text-xs font-medium rounded-full ${
                        payment.paymentType === 'INCOMING' 
                          ? ' text-green-800' 
                          : ' text-red-800'
                      }`}>
                        {payment.paymentType === 'INCOMING' ? (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Income
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Expense
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                      {payment.paymentNumber || payment.refundNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.customer?.name || payment.supplier?.name || payment.sale?.customer?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.customer?.customerId || payment.supplier?.supplierCode || payment.sale?.customer?.customerId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {payment.jobSheet?.jobNumber || payment.purchaseOrder?.poNumber || payment.sale?.saleNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-45">
                      {payment.sale?.saleItems && payment.sale.saleItems.length > 0 ? (
                        <div>
                          {payment.sale.saleItems.slice(0, 2).map((item, i) => (
                            <div key={i} className="truncate text-xs text-gray-700">
                              {item.productName} <span className="text-gray-400">×{item.quantity}</span>
                            </div>
                          ))}
                          {payment.sale.saleItems.length > 2 && (
                            <div className="text-xs text-gray-400">+{payment.sale.saleItems.length - 2} more</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400"> </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        payment.paymentType === 'INCOMING' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {payment.paymentType === 'INCOMING' ? '+' : '-'}
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                        {(payment.paymentMethod || payment.refundMethod || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(payment.paymentDate || payment.refundDate || payment.createdAt).toLocaleDateString()}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{payment.reference || '-'}</div>
                      {payment.transactionId && (
                        <div className="text-xs text-gray-500">TXN: {payment.transactionId}</div>
                      )}
                      {payment.checkNumber && (
                        <div className="text-xs text-gray-500">CHK: {payment.checkNumber}</div>
                      )}
                      {payment.receivedBy && (
                        <div className="text-xs text-gray-500">By: {payment.receivedBy.name}</div>
                      )}
                    </td> */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {filteredPayments.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredPayments.length} of {totalItems} payments
          <span className="ml-2 text-gray-500">
            | Total: {formatCurrency(filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0))}
          </span>
        </div>
      )}
    </div>
  );
}
