import { Package } from 'lucide-react';
import type { ProductPerformance } from '../../../../hooks/useSales';
import { formatCurrency } from '../../../../utils/currency';

interface TopProductsCardProps {
  products?: ProductPerformance[];
}

export default function TopProductsCard({ products }: TopProductsCardProps) {
  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          Top Products
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-purple-600" />
        Top Products
      </h3>
      
      <div className="space-y-4">
        {products.slice(0, 5).map((product, index) => (
          <div key={product.productId} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-gray-900">{product.productName}</p>
                <p className="text-sm text-gray-500">{product.quantitySold} units sold</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
              <p className="text-xs text-green-600">
                Profit: {formatCurrency(product.profit)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {products.length > 5 && (
        <button className="mt-4 w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium">
          View All Products
        </button>
      )}
    </div>
  );
}
