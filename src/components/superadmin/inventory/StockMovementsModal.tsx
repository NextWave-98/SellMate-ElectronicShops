import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, PackageX, History, Calendar, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '../../common/LoadingSpinner';

interface StockMovement {
  id: string;
  productId: string;
  movementType: string;
  quantity: number;
  quantityBefore?: number;
  quantityAfter?: number;
  referenceId?: string | null;
  referenceType?: string | null;
  referenceNumber?: string | null;
  notes?: string;
  createdAt?: string | null;
  product?: {
    name: string;
    productCode: string;
    sku: string;
  };
}

interface StockMovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  branchId?: string;
  onLoadMovements: (productId?: string, branchId?: string) => Promise<{ data: StockMovement[] }>;
}

export default function StockMovementsModal({
  isOpen,
  onClose,
  productId,
  branchId,
  onLoadMovements,
}: StockMovementsModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const [searchProduct, setSearchProduct] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productId, branchId]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const response = await onLoadMovements(productId, branchId);
      if (response?.data) {
        setMovements(response.data);
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'TRANSFER_IN':
      case 'ADJUSTMENT_IN':
      case 'RETURN_FROM_CUSTOMER':
      case 'FOUND':
      case 'RELEASE':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'SALES':
      case 'TRANSFER_OUT':
      case 'ADJUSTMENT_OUT':
      case 'RETURN_TO_SUPPLIER':
      case 'USAGE':
      case 'RESERVATION':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'DAMAGED':
      case 'EXPIRED':
      case 'STOLEN':
      case 'WRITE_OFF':
        return <PackageX className="w-5 h-5 text-orange-600" />;
      default:
        return <History className="w-5 h-5 text-gray-600" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'TRANSFER_IN':
      case 'ADJUSTMENT_IN':
      case 'RETURN_FROM_CUSTOMER':
      case 'FOUND':
      case 'RELEASE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'SALES':
      case 'TRANSFER_OUT':
      case 'ADJUSTMENT_OUT':
      case 'RETURN_TO_SUPPLIER':
      case 'USAGE':
      case 'RESERVATION':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'DAMAGED':
      case 'EXPIRED':
      case 'STOLEN':
      case 'WRITE_OFF':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Date unavailable';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReferenceLabel = (referenceType?: string | null): string => {
    switch (referenceType) {
      case 'SALE': return 'Sale';
      case 'RETURN': return 'Return';
      case 'GOODS_RECEIPT': return 'GRN';
      case 'PURCHASE_ORDER': return 'PO';
      case 'TRANSFER':
      case 'STOCK_TRANSFER': return 'Transfer';
      case 'ADJUSTMENT': return 'Adjustment';
      case 'STOCK_RELEASE': return 'Release';
      case 'SALE_REFUND': return 'Refund';
      case 'JOB_SHEET': return 'Job Sheet';
      default: return referenceType?.replace(/_/g, ' ') || 'Ref';
    }
  };

  const filteredMovements = movements.filter((movement) => {
    const matchesType = !filter || movement.movementType === filter;
    const matchesProduct = !searchProduct.trim() ||
      movement.product?.name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
      movement.product?.productCode?.toLowerCase().includes(searchProduct.toLowerCase()) ||
      movement.product?.sku?.toLowerCase().includes(searchProduct.toLowerCase());
    return matchesType && matchesProduct;
  });

  const movementTypes = Array.from(new Set(movements.map((m) => m.movementType)));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]  ">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-indigo-600" />
            <DialogTitle>Stock Movement History</DialogTitle>
          </div>
        </DialogHeader>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Filters and Stats */}
            <div className="mb-4 flex flex-col gap-3">
              {/* Item search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  placeholder="Search by product name, code or SKU..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">All Movements</option>
                    {movementTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={loadMovements}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredMovements.length} movement{filteredMovements.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Movements List */}
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : filteredMovements.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No stock movements found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">{getMovementIcon(movement.movementType)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMovementColor(
                                  movement.movementType
                                )}`}
                              >
                                {movement.movementType.replace(/_/g, ' ')}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {movement.product?.name || 'Unknown Product'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {movement.product?.productCode || 'N/A'} | {movement.product?.sku || 'N/A'}
                            </p>
                            {(movement.quantityBefore !== undefined && movement.quantityAfter !== undefined) && (
                              <p className="text-xs text-gray-500">
                                {movement.quantityBefore} → {movement.quantityAfter} units
                              </p>
                            )}
                            {movement.referenceNumber && (
                              <p className="text-xs font-medium text-indigo-600 mt-1">
                                {getReferenceLabel(movement.referenceType)}: {movement.referenceNumber}
                              </p>
                            )}
                            {movement.notes && (
                              <p className="text-sm text-gray-500 italic mt-1">{movement.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div
                            className={`text-lg font-bold ${
                              ['PURCHASE', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_FROM_CUSTOMER', 'FOUND', 'RELEASE'].includes(movement.movementType)
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {['PURCHASE', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_FROM_CUSTOMER', 'FOUND', 'RELEASE'].includes(movement.movementType)
                              ? '+'
                              : '-'}
                            {Math.abs(movement.quantity)}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(movement.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
