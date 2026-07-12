import { Clock, User, MapPin, DollarSign, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface RecentSale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  locationName: string;
  totalAmount: number;
  paymentStatus: string;
  date: string;
}

interface RecentSalesCardProps {
  sales?: RecentSale[];
  maxItems?: number;
}

export default function RecentSalesCard({ sales = [], maxItems = 5 }: RecentSalesCardProps) {
  const displaySales = sales.slice(0, maxItems);

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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
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
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'PENDING':
      case 'PARTIAL':
        return <Clock className="w-3.5 h-3.5" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  if (!sales || sales.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <Clock className="w-10 h-10 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">No recent sales</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
          <p className="text-sm text-gray-500 mt-0.5">Latest transactions</p>
        </div>
        {sales.length > maxItems && (
          <button className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {displaySales.map((sale) => (
          <div key={sale.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-orange-600">
                    {sale.invoiceNumber}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                      sale.paymentStatus
                    )}`}
                  >
                    {getPaymentStatusIcon(sale.paymentStatus)}
                    {sale.paymentStatus}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{sale.customerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{sale.locationName}</span>
                  </div>
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(sale.totalAmount)}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(sale.date)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sales.length > maxItems && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            Showing {maxItems} of {sales.length} sales
          </p>
        </div>
      )}
    </div>
  );
}
