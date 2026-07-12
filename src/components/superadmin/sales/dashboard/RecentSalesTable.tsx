import { Clock, User, MapPin, DollarSign, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RecentSale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  locationName: string;
  totalAmount: number;
  paymentStatus: string;
  date: string;
}

interface RecentSalesTableProps {
  sales?: RecentSale[];
  onViewDetails?: (saleId: string) => void;
}

export default function RecentSalesTable({ sales = [], onViewDetails }: RecentSalesTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PARTIAL':
        return 'bg-orange-100 text-orange-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'PENDING':
      case 'PARTIAL':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (!sales || sales.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sales</h2>
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <Clock className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-500">No recent sales found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Recent Sales</h2>
        <p className="text-sm text-gray-500 mt-1">Latest transactions from all locations</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-orange-600">
                      {sale.invoiceNumber}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">{sale.customerName}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-700">{sale.locationName}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(sale.totalAmount)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                      sale.paymentStatus
                    )}`}
                  >
                    {getPaymentStatusIcon(sale.paymentStatus)}
                    {sale.paymentStatus}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-500">{formatDate(sale.date)}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(sale.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-xs font-medium">View</span>
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer with count */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing {sales.length} recent {sales.length === 1 ? 'sale' : 'sales'}
        </p>
      </div>
    </div>
  );
}
