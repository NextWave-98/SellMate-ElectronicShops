/* eslint-disable @typescript-eslint/no-explicit-any */
import AllOrdersTab from '../../components/common/AllOrdersTab';
import useOrgSales from '../../hooks/useOrgSales';
import toast from 'react-hot-toast';

export default function AllOrdersPage() {
  const { getOrgAllOrders, deleteSale } = useOrgSales();

  const handleDeleteOrder = async (order: any) => {
    if (!window.confirm(`Permanently delete sale ${order.orderNumber}? This action cannot be undone.`)) return;
    const result = await deleteSale(order.id);
    if (result?.success) {
      toast.success('Sale deleted successfully');
    }
  };

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

      <AllOrdersTab fetchOrders={getOrgAllOrders} variant="admin" onDeleteOrder={handleDeleteOrder} />
    </div>
  );
}
