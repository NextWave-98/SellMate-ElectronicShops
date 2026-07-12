import AllOrdersTab from '../../components/common/AllOrdersTab';
import useBranchSales from '../../hooks/useBranchSales';

export default function BranchAllOrdersPage() {
  const { getBranchAllOrders } = useBranchSales();

  return (
    <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-2 pb-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">All Orders</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Unified view of POS sales, courier shipments, and WooCommerce orders
          </p>
        </div>
      </div>

      <AllOrdersTab fetchOrders={getBranchAllOrders} variant="branch" />
    </div>
  );
}
