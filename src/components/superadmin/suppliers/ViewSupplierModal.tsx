import { useState, useEffect } from 'react';
import { X, Building2, Phone, MapPin, CreditCard, Star, Calendar, Trash2, Edit, Eye } from 'lucide-react';
import useSupplier from '../../../hooks/useSupplier';
import usePurchaseOrder, { type PurchaseOrder } from '../../../hooks/usePurchaseOrder';
import LoadingSpinner from '../../common/LoadingSpinner';
import toast from 'react-hot-toast';
import ViewPurchaseOrderModal from '../purchaseorders/ViewPurchaseOrderModal';
import EditPurchaseOrderModal from '../purchaseorders/EditPurchaseOrderModal';
import DeletePurchaseOrderModal from '../purchaseorders/DeletePurchaseOrderModal';
import Pagination from '../../common/Pagination';

interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  fax?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  taxId?: string;
  registrationNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
  creditDays: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  swiftCode?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  contactPersonDesignation?: string;
  rating?: number;
  supplierType: string;
  status: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ViewSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export default function ViewSupplierModal({ isOpen, onClose, supplier }: ViewSupplierModalProps) {
  const supplierHook = useSupplier();
  const purchaseOrderHook = usePurchaseOrder();
  const [loading, setLoading] = useState(false);
  const [supplierData, setSupplierData] = useState<Supplier | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Purchase Order Modal states
  const [isViewPOModalOpen, setIsViewPOModalOpen] = useState(false);
  const [isEditPOModalOpen, setIsEditPOModalOpen] = useState(false);
  const [isDeletePOModalOpen, setIsDeletePOModalOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);

  const loadPurchaseOrders = async (page = currentPage, limit = itemsPerPage) => {
    if (!supplier?.id) return;
    
    try {
      const ordersResponse = await purchaseOrderHook.getAllPurchaseOrders({ 
        supplierId: supplier.id, 
        page,
        limit
      });
      if (ordersResponse?.data) {
        setPurchaseOrders(ordersResponse.data as PurchaseOrder[]);
        
        // Extract pagination info if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagination = (ordersResponse as any).pagination;
        if (pagination) {
          setTotalItems(pagination.total || 0);
          setTotalPages(pagination.totalPages || 0);
        } else {
          // Fallback for backward compatibility
          const orders = ordersResponse.data as PurchaseOrder[];
          setTotalItems(orders.length);
          setTotalPages(Math.ceil(orders.length / limit));
        }
      }
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    }
  };

  useEffect(() => {
    if (supplier && isOpen) {
      loadSupplierDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier, isOpen]);

  // Reload purchase orders when pagination changes
  useEffect(() => {
    if (supplier && isOpen) {
      loadPurchaseOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  const loadSupplierDetails = async () => {
    if (!supplier?.id) return;
    
    setLoading(true);
    try {
      const response = await supplierHook.getSupplierById(supplier.id);
      if (response?.data) {
        setSupplierData(response.data as typeof supplierData);
      }

      // Load purchase orders for this supplier with pagination
      await loadPurchaseOrders();
    } catch (error) {
      console.error('Error loading supplier details:', error);
      toast.error('Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Render star rating (supports 0-5 scale, shows numeric value)
  const renderRating = (rating?: number | null) => {
    if (rating === undefined || rating === null) return null;
    const rounded = Math.max(0, Math.min(5, Math.round(rating)));
    const stars = Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rounded ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));

    return (
      <div className="flex items-center gap-2">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600">{rating}</span>
      </div>
    );
  };


  const handleViewPurchaseOrder = (order: PurchaseOrder) => {
    setSelectedPurchaseOrder(order);
    setIsViewPOModalOpen(true);
  };

  const handleEditPurchaseOrder = (order: PurchaseOrder) => {
    setSelectedPurchaseOrder(order);
    setIsEditPOModalOpen(true);
  };

  const handleDeletePurchaseOrderModal = (order: PurchaseOrder) => {
    setSelectedPurchaseOrder(order);
    setIsDeletePOModalOpen(true);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!isOpen) return null;

  const data = supplierData || supplier;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="glass-modal-panel max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-modal-header flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Supplier Details</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="glass-modal-scroll flex flex-1 items-center justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : data ? (
          <div className="glass-modal-scroll px-6 py-6 space-y-6">
            {/* Header Section */}
            <div className="bg-orange-50 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{data.name}</h3>
                    <p className="text-sm text-gray-600">Code: {data.supplierCode}</p>
                    {data.companyName && (
                      <p className="text-sm text-gray-600">{data.companyName}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    data.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    data.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                    data.status === 'BLACKLISTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {data.status}
                  </span>
                  {data.rating && (
                    <div className="mt-2">
                      {renderRating(data.rating)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Contact Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Phone</label>
                    <p className="text-gray-900">{data.phone}</p>
                  </div>
                  {data.alternatePhone && (
                    <div>
                      <label className="text-sm text-gray-600">Alternate Phone</label>
                      <p className="text-gray-900">{data.alternatePhone}</p>
                    </div>
                  )}
                  {data.email && (
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="text-gray-900">{data.email}</p>
                    </div>
                  )}
                  {data.website && (
                    <div>
                      <label className="text-sm text-gray-600">Website : </label>
                      <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                        {data.website}
                      </a>
                    </div>
                  )}
                  {data.fax && (
                    <div>
                      <label className="text-sm text-gray-600">Fax</label>
                      <p className="text-gray-900">{data.fax}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Address
                </h4>
                <div className="space-y-3">
                  {data.address && (
                    <div>
                      <label className="text-sm text-gray-600">Street Address</label>
                      <p className="text-gray-900">{data.address}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {data.city && (
                      <div>
                        <label className="text-sm text-gray-600">City</label>
                        <p className="text-gray-900">{data.city}</p>
                      </div>
                    )}
                    {data.state && (
                      <div>
                        <label className="text-sm text-gray-600">State</label>
                        <p className="text-gray-900">{data.state}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {data.postalCode && (
                      <div>
                        <label className="text-sm text-gray-600">Postal Code</label>
                        <p className="text-gray-900">{data.postalCode}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-gray-600">Country</label>
                      <p className="text-gray-900">{data.country}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Business Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Supplier Type</label>
                  <p className="text-gray-900">{data.supplierType}</p>
                </div>
                {data.taxId && (
                  <div>
                    <label className="text-sm text-gray-600">Tax ID</label>
                    <p className="text-gray-900">{data.taxId}</p>
                  </div>
                )}
                {data.registrationNumber && (
                  <div>
                    <label className="text-sm text-gray-600">Registration Number</label>
                    <p className="text-gray-900">{data.registrationNumber}</p>
                  </div>
                )}
                {data.paymentTerms && (
                  <div>
                    <label className="text-sm text-gray-600">Payment Terms</label>
                    <p className="text-gray-900">{data.paymentTerms}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-600">Credit Days</label>
                  <p className="text-gray-900">{data.creditDays} days</p>
                </div>
                {data.creditLimit && (
                  <div>
                    <label className="text-sm text-gray-600">Credit Limit</label>
                    <p className="text-gray-900">LKR {data.creditLimit.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Banking Information */}
            {(data.bankName || data.accountNumber) && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Banking Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.bankName && (
                    <div>
                      <label className="text-sm text-gray-600">Bank Name</label>
                      <p className="text-gray-900">{data.bankName}</p>
                    </div>
                  )}
                  {data.accountName && (
                    <div>
                      <label className="text-sm text-gray-600">Account Name</label>
                      <p className="text-gray-900">{data.accountName}</p>
                    </div>
                  )}
                  {data.accountNumber && (
                    <div>
                      <label className="text-sm text-gray-600">Account Number</label>
                      <p className="text-gray-900">{data.accountNumber}</p>
                    </div>
                  )}
                  {data.swiftCode && (
                    <div>
                      <label className="text-sm text-gray-600">SWIFT Code</label>
                      <p className="text-gray-900">{data.swiftCode}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Person */}
            {data.contactPersonName && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Person</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Name</label>
                    <p className="text-gray-900">{data.contactPersonName}</p>
                  </div>
                  {data.contactPersonDesignation && (
                    <div>
                      <label className="text-sm text-gray-600">Designation</label>
                      <p className="text-gray-900">{data.contactPersonDesignation}</p>
                    </div>
                  )}
                  {data.contactPersonPhone && (
                    <div>
                      <label className="text-sm text-gray-600">Phone</label>
                      <p className="text-gray-900">{data.contactPersonPhone}</p>
                    </div>
                  )}
                  {data.contactPersonEmail && (
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="text-gray-900">{data.contactPersonEmail}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {data.notes && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Notes</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}

            {/* Purchase Orders */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Purchase Orders</h4>
              {purchaseOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchaseOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                              order.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'RECEIVED' ? 'bg-orange-100 text-orange-800' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.priority}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Rs. {order.totalAmount || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewPurchaseOrder(order)}
                                className="text-orange-600 hover:text-orange-900"
                                title="View Purchase Order"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditPurchaseOrder(order)}
                                className="text-green-600 hover:text-green-900"
                                title="Edit Purchase Order"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {(order.status === 'DRAFT' || order.status === 'CANCELLED') && (
                                <button
                                  onClick={() => handleDeletePurchaseOrderModal(order)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Purchase Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalItems > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      itemsPerPage={itemsPerPage}
                      totalItems={totalItems}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No purchase orders found for this supplier.</p>
              )}
            </div>

            {/* Timestamps */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Created: {formatDate(data.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Updated: {formatDate(data.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-modal-scroll flex flex-1 items-center justify-center p-12 text-center text-gray-600">
            No supplier data available
          </div>
        )}

        <div className="glass-modal-footer flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>

      {/* Purchase Order Modals */}
      <ViewPurchaseOrderModal
        isOpen={isViewPOModalOpen}
        onClose={() => {
          setIsViewPOModalOpen(false);
          setSelectedPurchaseOrder(null);
        }}
        purchaseOrder={selectedPurchaseOrder}
      />
      <EditPurchaseOrderModal
        isOpen={isEditPOModalOpen}
        onClose={() => {
          setIsEditPOModalOpen(false);
          setSelectedPurchaseOrder(null);
        }}
        onSuccess={() => {
          // Reload purchase orders
          loadPurchaseOrders();
        }}
        purchaseOrder={selectedPurchaseOrder}
      />
      <DeletePurchaseOrderModal
        isOpen={isDeletePOModalOpen}
        onClose={() => {
          setIsDeletePOModalOpen(false);
          setSelectedPurchaseOrder(null);
        }}
        onSuccess={() => {
          // Reload purchase orders
          loadPurchaseOrders();
        }}
        purchaseOrder={selectedPurchaseOrder}
      />
    </div>
  );
}
