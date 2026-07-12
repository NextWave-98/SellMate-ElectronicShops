/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useCallback } from 'react';
import { Plus, Eye, Edit, Trash2, ShoppingCart, CheckCircle, XCircle, PackageCheck, RefreshCcw, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import type { SupplierStats } from '../../types/supplier.types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import useSupplier from '../../hooks/useSupplier';
import usePurchaseOrder from '../../hooks/usePurchaseOrder';
import SupplierStatsCards from '../../components/superadmin/suppliers/SupplierStatsCards';
import SupplierTable from '../../components/superadmin/suppliers/SupplierTable';
import PurchaseOrderTable from '../../components/superadmin/suppliers/PurchaseOrderTable';
import AddSupplierModal from '../../components/superadmin/suppliers/AddSupplierModal';
import EditSupplierModal from '../../components/superadmin/suppliers/EditSupplierModal';
import ViewSupplierModal from '../../components/superadmin/suppliers/ViewSupplierModal';
import DeleteSupplierModal from '../../components/superadmin/suppliers/DeleteSupplierModal';
import AddPurchaseOrderModal from '../../components/superadmin/purchaseorders/AddPurchaseOrderModal';
import EditPurchaseOrderModal from '../../components/superadmin/purchaseorders/EditPurchaseOrderModal';
import ViewPurchaseOrderModal from '../../components/superadmin/purchaseorders/ViewPurchaseOrderModal';
import DeletePurchaseOrderModal from '../../components/superadmin/purchaseorders/DeletePurchaseOrderModal';
import ReceivePurchaseOrderModal from '../../components/superadmin/suppliers/ReceivePurchaseOrderModal';
import UpdatePOStatusModal from '../../components/superadmin/suppliers/UpdatePOStatusModal';
import CreateGoodsReceiptModal from '../../components/superadmin/suppliers/CreateGoodsReceiptModal';
import ApproveGoodsReceiptModal from '../../components/superadmin/suppliers/ApproveGoodsReceiptModal';
import AddPurchaseOrderPaymentModal from '../../components/superadmin/purchaseorders/AddPurchaseOrderPaymentModal';
import type { GoodsReceipt } from '../../hooks/useGoodsReceipt';
import { usePermissions } from '../../hooks/usePermissions';
import useOrgFeatures from '../../hooks/useOrgFeatures';
import { PERMISSIONS } from '../../store/types';

// Use API types from hooks
type Supplier = ReturnType<typeof useSupplier>['suppliers'] extends (infer T)[] | undefined ? T : never;
type PurchaseOrder = ReturnType<typeof usePurchaseOrder>['purchaseOrders'] extends (infer T)[] | undefined ? T : never;

export default function SuppliersPage() {
  const {
    canViewPurchaseOrderCosts,
    canAccessModule,
    hasPermission,
  } = usePermissions();
  const { supplierOrdersEnabled, loading: loadingOrgFeatures } = useOrgFeatures();
  const hideFinancials = !canViewPurchaseOrderCosts();
  const canManageSuppliers = canAccessModule('suppliers');
  const canCreatePurchaseOrders = hasPermission(PERMISSIONS.PURCHASEORDERS_CREATE);
  const canReadPurchaseOrders = hasPermission(PERMISSIONS.PURCHASEORDERS_READ);
  const purchaseOrdersOnly = !canManageSuppliers && (canCreatePurchaseOrders || canReadPurchaseOrders);
  const showSuppliersTab = canManageSuppliers;
  const showPurchaseOrdersTab = canManageSuppliers || canCreatePurchaseOrders || canReadPurchaseOrders;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliersPagination, setSuppliersPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>(
    purchaseOrdersOnly ? 'orders' : 'suppliers'
  );

  // Pagination states
  const [suppliersCurrentPage, setSuppliersCurrentPage] = useState(1);
  const [suppliersItemsPerPage, setSuppliersItemsPerPage] = useState(10);
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const [ordersItemsPerPage, setOrdersItemsPerPage] = useState(10);

  // Supplier Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Purchase Order Modal states
  const [isAddPOModalOpen, setIsAddPOModalOpen] = useState(false);
  const [isEditPOModalOpen, setIsEditPOModalOpen] = useState(false);
  const [isViewPOModalOpen, setIsViewPOModalOpen] = useState(false);
  const [isDeletePOModalOpen, setIsDeletePOModalOpen] = useState(false);
  const [isReceivePOModalOpen, setIsReceivePOModalOpen] = useState(false);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [initialSupplierId, setInitialSupplierId] = useState<string | undefined>();

  // Goods Receipt Modal states
  const [isCreateGRNModalOpen, setIsCreateGRNModalOpen] = useState(false);
  const [isApproveGRNModalOpen, setIsApproveGRNModalOpen] = useState(false);
  const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState<GoodsReceipt | null>(null);

  // Payment Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPOForPayment, setSelectedPOForPayment] = useState<PurchaseOrder | null>(null);

  // Selection states
  const [selectedSuppliers, setSelectedSuppliers] = useState<Supplier[]>([]);
  const [selectedPurchaseOrders, setSelectedPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Import hooks
  const supplierHook = useSupplier();
  const purchaseOrderHook = usePurchaseOrder();

  // Helper to parse list responses with various shapes
  const parseListResponse = (response: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = response as any;
    if (!r) return { items: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } };

    // If response has top-level pagination and a list field
    if (r.pagination && (r.branches || r.suppliers || r.purchaseOrders)) {
      const items = r.branches || r.suppliers || r.purchaseOrders;
      return {
        items,
        pagination: {
          page: r.pagination.page ,
          limit: r.pagination.limit || items.length || 0,
          total: r.pagination.total || items.length || 0,
          totalPages: r.pagination.totalPages || Math.ceil((r.pagination.total || items.length || 0) / (r.pagination.limit || items.length || 1)),
        },
      };
    }

    // If response has data property that is array and pagination
    if (Array.isArray(r?.data) && r.pagination) {
      return {
        items: r.data,
        pagination: {
          page: r.pagination.page ,
          limit: r.pagination.limit || r.data.length || 0,
          total: r.pagination.total || r.data.length || 0,
          totalPages: r.pagination.totalPages || Math.ceil((r.pagination.total || r.data.length || 0) / (r.pagination.limit || r.data.length || 1)),
        },
      };
    }

    // If response has data property that is array (non-paginated)
    if (Array.isArray(r?.data)) {
      return { items: r.data, pagination: { page: 1, limit: r.data.length, total: r.data.length, totalPages: 1 } };
    }

    // If response.data is object with items + pagination
    if (r?.data && (Array.isArray(r.data.items) || Array.isArray(r.data.suppliers) || Array.isArray(r.data.purchaseOrders))) {
      const items = r.data.items || r.data.suppliers || r.data.purchaseOrders;
      const pagination = r.data.pagination || r.pagination || {};
      return {
        items,
        pagination: {
          page: pagination.page ,
          limit: pagination.limit || items.length || 0,
          total: pagination.total || items.length || 0,
          totalPages: pagination.totalPages || Math.ceil((pagination.total || items.length || 0) / (pagination.limit || items.length)),
        },
      };
    }

    // Fallback: if response is an array
    if (Array.isArray(r)) {
      return { items: r, pagination: { page: 1, limit: r.length, total: r.length, totalPages: 1 } };
    }

    // Default fallback: no items
    return { items: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } };
  };

  const loadSuppliers = useCallback(async (page = suppliersCurrentPage, limit = suppliersItemsPerPage) => {
    try {
      setLoading(true);
      const response = await supplierHook.getAllSuppliers({ page, limit });
      const parsed = parseListResponse(response);
      setSuppliers(parsed.items as Supplier[]);
      setSuppliersPagination({ page: parsed.pagination.page, limit: parsed.pagination.limit, total: parsed.pagination.total, totalPages: parsed.pagination.totalPages });
    } catch (err) {
      console.error('Failed to load suppliers', err);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [supplierHook, suppliersCurrentPage, suppliersItemsPerPage]);

  const loadPurchaseOrders = useCallback(async (page = ordersCurrentPage, limit = ordersItemsPerPage) => {
    try {
      setLoading(true);
      const response = await purchaseOrderHook.getAllPurchaseOrders({ page, limit });
      const parsed = parseListResponse(response);
      setPurchaseOrders(parsed.items as PurchaseOrder[]);
      setOrdersPagination({ page: parsed.pagination.page, limit: parsed.pagination.limit, total: parsed.pagination.total, totalPages: parsed.pagination.totalPages });
    } catch (err) {
      console.error('Failed to load purchase orders', err);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [purchaseOrderHook, ordersCurrentPage, ordersItemsPerPage]);

  const loadData = useCallback(async () => {
    await Promise.all([loadSuppliers(), loadPurchaseOrders()]);
    try {
      const statsResponse = await supplierHook.getSupplierStats();
      if (statsResponse?.data) {
        setStats(statsResponse.data as unknown as SupplierStats);
      }
    } catch (err) {
      console.error('Failed to load stats', err);
    }
    // Clear selections after loading data (e.g., after actions)
    setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
  }, [loadSuppliers, loadPurchaseOrders, supplierHook]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!showSuppliersTab && showPurchaseOrdersTab) {
      setActiveTab('orders');
    }
  }, [showSuppliersTab, showPurchaseOrdersTab]);

  // Load suppliers when pagination changes
  useEffect(() => {
    if (activeTab === 'suppliers') {
      loadSuppliers();
    }
  }, [suppliersCurrentPage, suppliersItemsPerPage,  activeTab]);

  // Load purchase orders when pagination changes
  useEffect(() => {
    if (activeTab === 'orders') {
      loadPurchaseOrders();
    }
  }, [ordersCurrentPage, ordersItemsPerPage,  activeTab]);

  if (loading || loadingOrgFeatures) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!supplierOrdersEnabled) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Supplier Orders Disabled</h1>
          <p className="text-gray-600">
            Supplier and purchase order features are not enabled for this organization.
            Ask an admin to enable them in POS Settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {purchaseOrdersOnly ? 'Create and manage purchase orders' : 'Manage suppliers and purchase orders'}
          </p>
        </div>
        {canManageSuppliers && hasPermission(PERMISSIONS.SUPPLIERS_CREATE) && (
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && canManageSuppliers && <SupplierStatsCards stats={stats} hideFinancials={hideFinancials} />}

      {/* Tabs */}
      <Card>
        <div className="">
          <nav className="flex -mb-px">
            {showSuppliersTab && (
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`px-6 py-3 text-sm font-medium cursor-pointer ${
                  activeTab === 'suppliers'
                    ? 'border-b-2 border-orange-400 text-orange-600'
                    : 'text-gray-500'
                }`}
              >
                Suppliers ({suppliers.length})
              </button>
            )}
            {showPurchaseOrdersTab && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-3 text-sm font-medium cursor-pointer ${
                  activeTab === 'orders'
                    ? 'border-b-2 border-orange-400 text-orange-600'
                    : 'text-gray-500'
                }`}
              >
                Purchase Orders ({purchaseOrders.length})
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'suppliers' ? (
            <>
              {/* Action Bar - Shown when suppliers are selected */}
              {selectedSuppliers.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg shadow-sm p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-orange-900">
                        {selectedSuppliers.length} supplier{selectedSuppliers.length > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedSuppliers.length === 1 && (
                        <>
                          <Button
                            onClick={() => {
                              setSelectedSupplier(selectedSuppliers[0]);
                              setIsViewModalOpen(true);
                            }}
                            className="bg-orange-600 hover:bg-orange-700"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedSupplier(selectedSuppliers[0]);
                              setIsEditModalOpen(true);
                            }}
                            className="bg-yellow-600 hover:bg-yellow-700"
                            size="sm"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedSupplier(selectedSuppliers[0]);
                              setInitialSupplierId(selectedSuppliers[0].id);
                              setIsAddPOModalOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add Purchase Order
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedSupplier(selectedSuppliers[0]);
                              setIsDeleteModalOpen(true);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <SupplierTable
              suppliers={suppliers || []}
              currentPage={suppliersCurrentPage}
              itemsPerPage={suppliersItemsPerPage}
              totalItems={suppliersPagination.total}
              onPageChange={setSuppliersCurrentPage}
              onItemsPerPageChange={(limit) => {
                setSuppliersItemsPerPage(limit);
                setSuppliersCurrentPage(1);
              }}
              onView={(supplier) => {
                setSelectedSupplier(supplier as Supplier);
                setIsViewModalOpen(true);
              }}
              onEdit={(supplier) => {
                setSelectedSupplier(supplier as Supplier);
                setIsEditModalOpen(true);
              }}
              onAddPO={(supplier) => {
                setSelectedSupplier(supplier as Supplier);
                setInitialSupplierId(supplier.id);
                setIsAddPOModalOpen(true);
              }}
              onDelete={(supplier) => {
                setSelectedSupplier(supplier as Supplier);
                setIsDeleteModalOpen(true);
              }}
              selectable={true}
              selectedSuppliers={selectedSuppliers}
              onSelectionChange={setSelectedSuppliers}
            />
            </>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                {canCreatePurchaseOrders && (
                  <Button
                    onClick={() => {
                      setInitialSupplierId(undefined);
                      setIsAddPOModalOpen(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Purchase Order
                  </Button>
                )}
              </div>

              {/* Action Bar - Shown when purchase orders are selected */}
              {selectedPurchaseOrders.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg shadow-sm p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-orange-900">
                        {selectedPurchaseOrders.length} order{selectedPurchaseOrders.length > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedPurchaseOrders.length === 1 && (
                        <>
                          <Button
                            onClick={() => {
                              setSelectedPurchaseOrder(selectedPurchaseOrders[0]);
                              setIsViewPOModalOpen(true);
                            }}
                            className="bg-orange-600 hover:bg-orange-700"
                            size="sm"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            View
                          </Button>

                          {/* Edit - Only for DRAFT or SUBMITTED */}
                          {(selectedPurchaseOrders[0].status === 'DRAFT' || selectedPurchaseOrders[0].status === 'SUBMITTED') && (
                            <Button
                              onClick={() => {
                                setSelectedPurchaseOrder(selectedPurchaseOrders[0]);
                                setIsEditPOModalOpen(true);
                              }}
                              className="bg-yellow-600 hover:bg-yellow-700"
                              size="sm"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1.5" />
                              Edit
                            </Button>
                          )}

                          {/* Approve - Only for SUBMITTED */}
                          {/* {selectedPurchaseOrders[0].status === 'SUBMITTED' && (
                            <button
                              onClick={async () => {
                                try {
                                  await purchaseOrderHook.approvePurchaseOrder(selectedPurchaseOrders[0].id);
                                  toast.success('Purchase order approved successfully');
                                  loadData();
                                  setSelectedPurchaseOrders([]);
                                } catch {
                                  toast.error('Failed to approve purchase order');
                                }
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                              Approve
                            </button>
                          )} */}
                          {/* {console.log('Selected PO for actions:', Number(selectedPurchaseOrders[0].balanceAmount || 0))} */}
                          {/* Record Payment - When balance > 0 and status is CONFIRMED, PARTIALLY_RECEIVED, COMPLETED, or RECEIVED */}
                          {!hideFinancials && Number(selectedPurchaseOrders[0].balanceAmount || 0) > 0 && 
                           ['CONFIRMED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'RECEIVED'].includes(selectedPurchaseOrders[0].status) && (
                            <Button
                              onClick={() => {
                                setSelectedPOForPayment(selectedPurchaseOrders[0]);
                                setIsPaymentModalOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              size="sm"
                            >
                              <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                              Payment
                            </Button>
                          )}

                          {/* Create Goods Receipt - For CONFIRMED or PARTIALLY_RECEIVED */}
                          {(selectedPurchaseOrders[0].status === 'CONFIRMED' || selectedPurchaseOrders[0].status === 'PARTIALLY_RECEIVED') && (
                            <>
                              <Button
                                onClick={async () => {
                                  try {
                                    const fullPO = await purchaseOrderHook.getPurchaseOrderById(selectedPurchaseOrders[0].id);
                                    if (fullPO?.data) {
                                      setSelectedPurchaseOrder(fullPO.data as unknown as PurchaseOrder);
                                      setIsCreateGRNModalOpen(true);
                                    } else {
                                      toast.error('Failed to load purchase order details');
                                    }
                                  } catch (error) {
                                    console.error('Error loading PO details:', error);
                                    toast.error('Failed to load purchase order details');
                                  }
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700"
                                size="sm"
                              >
                                <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                                Create GRN
                              </Button>
                              <Button
                                onClick={async () => {
                                  try {
                                    const fullPO = await purchaseOrderHook.getPurchaseOrderById(selectedPurchaseOrders[0].id);
                                    if (fullPO?.data) {
                                      setSelectedPurchaseOrder(fullPO.data as unknown as PurchaseOrder);
                                      setIsReceivePOModalOpen(true);
                                    } else {
                                      toast.error('Failed to load purchase order details');
                                    }
                                  } catch (error) {
                                    console.error('Error loading PO details:', error);
                                    toast.error('Failed to load purchase order details');
                                  }
                                }}
                                className="bg-purple-600 hover:bg-purple-700"
                                size="sm"
                              >
                                <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                                Quick Receive
                              </Button>
                            </>
                          )}

                          <Button
                            onClick={() => {
                              setSelectedPurchaseOrder(selectedPurchaseOrders[0]);
                              setIsUpdateStatusModalOpen(true);
                            }}
                            className="bg-cyan-600 hover:bg-cyan-700"
                            size="sm"
                          >
                            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                            Update Status
                          </Button>

                          {/* Cancel - Only for DRAFT or SUBMITTED */}
                          {(selectedPurchaseOrders[0].status === 'DRAFT' || selectedPurchaseOrders[0].status === 'SUBMITTED') && (
                            <Button
                              onClick={async () => {
                                try {
                                  await purchaseOrderHook.cancelPurchaseOrder(selectedPurchaseOrders[0].id);
                                  toast.success('Purchase order cancelled successfully');
                                  loadData();
                                  setSelectedPurchaseOrders([]);
                                } catch {
                                  toast.error('Failed to cancel purchase order');
                                }
                              }}
                              className="bg-orange-600 hover:bg-orange-700"
                              size="sm"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Cancel
                            </Button>
                          )}

                          {/* Delete - Only for DRAFT */}
                          {selectedPurchaseOrders[0].status === 'DRAFT' && (
                            <Button
                              onClick={() => {
                                setSelectedPurchaseOrder(selectedPurchaseOrders[0]);
                                setIsDeletePOModalOpen(true);
                              }}
                              className="bg-red-600 hover:bg-red-700"
                              size="sm"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <PurchaseOrderTable
                orders={purchaseOrders || []}
                hideFinancials={hideFinancials}
                currentPage={ordersCurrentPage}
                itemsPerPage={ordersItemsPerPage}
                totalItems={ordersPagination.total}
                onPageChange={setOrdersCurrentPage}
                onItemsPerPageChange={(limit) => {
                  setOrdersItemsPerPage(limit);
                  setOrdersCurrentPage(1);
                }}
                onView={(order) => {
                  setSelectedPurchaseOrder(order as PurchaseOrder);
                  setIsViewPOModalOpen(true);
                }}
                onEdit={(order) => {
                  setSelectedPurchaseOrder(order as PurchaseOrder);
                  setIsEditPOModalOpen(true);
                }}
                onDelete={(order) => {
                  setSelectedPurchaseOrder(order as PurchaseOrder);
                  setIsDeletePOModalOpen(true);
                }}
                onPayment={(order) => {
                  setSelectedPOForPayment(order as PurchaseOrder);
                  setIsPaymentModalOpen(true);
                }}
                onApprove={async (order) => {
                  try {
                    await purchaseOrderHook.approvePurchaseOrder(order.id);
                    toast.success('Purchase order approved successfully');
                    loadData();
                  } catch {
                    toast.error('Failed to approve purchase order');
                  }
                }}
                onCancel={async (order) => {
                  try {
                    await purchaseOrderHook.cancelPurchaseOrder(order.id);
                    toast.success('Purchase order cancelled successfully');
                    loadData();
                  } catch {
                    toast.error('Failed to cancel purchase order');
                  }
                }}

                onCreateGRN={async (order) => {
                  try {
                    // Fetch full PO details including items
                    const fullPO = await purchaseOrderHook.getPurchaseOrderById(order.id);
                    if (fullPO?.data) {
                      setSelectedPurchaseOrder(fullPO.data as unknown as PurchaseOrder);
                      setIsCreateGRNModalOpen(true);
                    } else {
                      toast.error('Failed to load purchase order details');
                    }
                  } catch (error) {
                    console.error('Error loading PO details:', error);
                    toast.error('Failed to load purchase order details');
                  }
                }}
                onReceive={async (order) => {
                  try {
                    // Fetch full PO details including items
                    const fullPO = await purchaseOrderHook.getPurchaseOrderById(order.id);
                    if (fullPO?.data) {
                      setSelectedPurchaseOrder(fullPO.data as unknown as PurchaseOrder);
                      setIsReceivePOModalOpen(true);
                    } else {
                      toast.error('Failed to load purchase order details');
                    }
                  } catch (error) {
                    console.error('Error loading PO details:', error);
                    toast.error('Failed to load purchase order details');
                  }
                }}
                onUpdateStatus={(order) => {
                  setSelectedPurchaseOrder(order as PurchaseOrder);
                  setIsUpdateStatusModalOpen(true);
                }}

                selectable={true}
                selectedOrders={selectedPurchaseOrders}
                onSelectionChange={setSelectedPurchaseOrders}
              />
            </>
          )}
        </div>
      </Card>

      {/* Modals */}
      <AddSupplierModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadData}
      />
      <EditSupplierModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSupplier(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSuccess={loadData}
        supplier={selectedSupplier}
      />
      <ViewSupplierModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedSupplier(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        supplier={selectedSupplier}
      />
      <DeleteSupplierModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSupplier(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSuccess={loadData}
        supplier={selectedSupplier}
      />

      {/* Purchase Order Modals */}
      <AddPurchaseOrderModal
        isOpen={isAddPOModalOpen}
        onClose={() => {
          setIsAddPOModalOpen(false);
          setInitialSupplierId(undefined);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSuccess={loadData}
        initialSupplierId={initialSupplierId}
      />
      <EditPurchaseOrderModal
        isOpen={isEditPOModalOpen}
        onClose={() => {
          setIsEditPOModalOpen(false);
          setSelectedPurchaseOrder(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSuccess={loadData}
        purchaseOrder={selectedPurchaseOrder}
      />
      <ViewPurchaseOrderModal
        isOpen={isViewPOModalOpen}
        onClose={() => {
          setIsViewPOModalOpen(false);
          setSelectedPurchaseOrder(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        purchaseOrder={selectedPurchaseOrder}
      />
      <DeletePurchaseOrderModal
        isOpen={isDeletePOModalOpen}
        onClose={() => {
          setIsDeletePOModalOpen(false);
          setSelectedPurchaseOrder(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSuccess={loadData}
        purchaseOrder={selectedPurchaseOrder}
      />
      <ReceivePurchaseOrderModal
        isOpen={isReceivePOModalOpen}
        onClose={() => {
          setIsReceivePOModalOpen(false);
          setSelectedPurchaseOrder(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSuccess={loadData}
        purchaseOrder={selectedPurchaseOrder}
      />
      <UpdatePOStatusModal
        isOpen={isUpdateStatusModalOpen}
        onClose={() => {
          setIsUpdateStatusModalOpen(false);
          setSelectedPurchaseOrder(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSuccess={loadData}
        purchaseOrder={selectedPurchaseOrder}
      />


{/* add purchase Payment Modal */}
<AddPurchaseOrderPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPOForPayment(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSubmit={async (data) => {
          try {
            const payload = {
              purchaseOrderId: data.purchaseOrderId,
              supplierId: data.supplierId,
              amount: Number(data.amount) || 0,
              paymentMethod: data.paymentMethod,
              paymentDate: data.paymentDate,
              reference: data.reference,
              bankName: data.bankName,
              checkNumber: data.checkNumber,
              transactionId: data.transactionId,
              notes: data.notes,
            };

            const res = await purchaseOrderHook.createSupplierPayment(payload);
            if (res?.success) {
              toast.success('Payment recorded successfully');
              await loadData();
            } else {
              const msg = res?.message || 'Failed to record payment';
              toast.error(msg);
              // Throw to prevent modal from auto-closing
              throw new Error(msg);
            }
          } catch (error) {
            console.error('Error recording supplier payment:', error);
            // rethrow so modal can handle it (it will not close)
            throw error;
          }
        }}
        purchaseOrder={selectedPOForPayment}
      />
      {/* Goods Receipt Modals */}
      <CreateGoodsReceiptModal
        isOpen={isCreateGRNModalOpen}
        onClose={() => {
          setIsCreateGRNModalOpen(false);
          setSelectedPurchaseOrder(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSuccess={async () => {
          await loadData();
          // After creating GRN, fetch it and open approve modal
          // For now, just reload data
        }}
        purchaseOrder={selectedPurchaseOrder}
      />
      <ApproveGoodsReceiptModal
        isOpen={isApproveGRNModalOpen}
        onClose={() => {
          setIsApproveGRNModalOpen(false);
          setSelectedGoodsReceipt(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSuccess={loadData}
        goodsReceipt={selectedGoodsReceipt}
      />

      {/* Payment Modal */}
      <AddPurchaseOrderPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPOForPayment(null);
           setSelectedSuppliers([]);
    setSelectedPurchaseOrders([]);
        }}
        onSubmit={async (data) => {
          try {
            const payload = {
              purchaseOrderId: data.purchaseOrderId,
              supplierId: data.supplierId,
              amount: Number(data.amount) || 0,
              paymentMethod: data.paymentMethod,
              paymentDate: data.paymentDate,
              reference: data.reference,
              bankName: data.bankName,
              checkNumber: data.checkNumber,
              transactionId: data.transactionId,
              notes: data.notes,
            };

            const res = await purchaseOrderHook.createSupplierPayment(payload);
            if (res?.success) {
              toast.success('Payment recorded successfully');
              await loadData();
            } else {
              const msg = res?.message || 'Failed to record payment';
              toast.error(msg);
              // Throw to prevent modal from auto-closing
              throw new Error(msg);
            }
          } catch (error) {
            console.error('Error recording supplier payment:', error);
            // rethrow so modal can handle it (it will not close)
            throw error;
          }
        }}
        purchaseOrder={selectedPOForPayment}
      />
    </div>
  );
}
