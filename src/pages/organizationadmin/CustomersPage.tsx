/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { RefreshCw, UserPlus, Search, Eye, Edit, Trash2, MessageSquare } from 'lucide-react';
import type { Customer, CustomerStats } from '../../types/customer.types';
import CustomerStatsCards from '../../components/superadmin/customers/CustomerStatsCards';
import CustomerTable from '../../components/superadmin/customers/CustomerTable';
import AddCustomerModal from '../../components/superadmin/customers/AddCustomerModal';
import EditCustomerModal from '../../components/superadmin/customers/EditCustomerModal';
import BulkSMSSameModal from '../../components/superadmin/customers/BulkSMSSameModal';
import BulkSMSDifferentModal from '../../components/superadmin/customers/BulkSMSDifferentModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import toast from 'react-hot-toast';
import CustomerInfoModal from '../../components/superadmin/customers/CustomerInfoModal';
import useCustomer, { type Customer as ApiCustomer, type CustomerStats as ApiCustomerStats } from '../../hooks/useCustomer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function CustomersPage() {
  const {
    getCustomers,
    getCustomerStats,
    deleteCustomer,
    searchCustomers,
    createCustomer,
    updateCustomer,
  } = useCustomer();

  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    active: 0,
    inactive: 0,
  
    walkin: 0,
    vip: 0,
    regular:0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [isCustomerInfoModalOpen, setIsCustomerInfoModalOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [isBulkSMSSameModalOpen, setIsBulkSMSSameModalOpen] = useState(false);
  const [isBulkSMSDifferentModalOpen, setIsBulkSMSDifferentModalOpen] = useState(false);

 

  const mapApiCustomersToLocal = (apiCustomers: ApiCustomer[]): Customer[] => {
    return apiCustomers.map((customer) => {
      console.log('Mapping customer:', {
        apiId: customer.id,
        apiIdType: typeof customer.id,
        customerId: customer.customerId
      });

      return {
        id: customer.id || "",
        customerId: customer.customerId,
        firstName: customer.name.split(' ')[0] || customer.name,
        lastName: customer.name.split(' ').slice(1).join(' ') || '',
        email: customer.email || '',
        phone: customer.phone,
        alternatePhone: customer.alternatePhone || '',
        address: customer.address || '',
        city: customer.city || '',
        postalCode: '',
        nic: customer.nicNumber || '',
        dateOfBirth: '',
        tier: mapCustomerTypeTier(customer.customerType),
        status: customer.isActive ? 'active' : 'inactive',
        loyaltyPoints: customer.loyaltyPoints,
        totalPurchases: customer.totalPurchases || 0,
        totalSpent: customer.totalSales || 0,
        registeredDate: customer.createdAt,
        lastPurchaseDate: '',
        notes: customer.notes || '',
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        location: (customer as any).location ? {
          id: (customer as any).location.id,
          name: (customer as any).location.name,
          address: (customer as any).location.address,
        } : undefined,
      };
    });
  };

  const mapCustomerTypeTier = (type: 'WALK_IN' | 'REGULAR' | 'VIP'): 'bronze' | 'silver' | 'gold' | 'platinum' => {
    switch (type) {
      case 'VIP':
        return 'gold';
      case 'REGULAR':
        return 'silver';
      case 'WALK_IN':
      default:
        return 'bronze';
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await getCustomers({
        page: currentPage,
        limit: itemsPerPage,
      });

      if (response?.success && response?.data) {
        const responseData = response.data as { customers?: ApiCustomer[]; pagination?: { totalPages: number; total: number } };
        const apiCustomers = responseData.customers || [];
        const mappedCustomers = mapApiCustomersToLocal(apiCustomers);
        setFilteredCustomers(mappedCustomers);
        
        if (responseData.pagination) {
          setTotalPages(responseData.pagination.totalPages);
          setTotalCustomers(responseData.pagination.total);
        }
      }
    } catch (error) {
      toast.error('Failed to load customers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getCustomerStats();
        console.log(response)
      if (response?.success && response?.data) {
        const apiStats = response.data as ApiCustomerStats;
      
        setStats({
          total: apiStats.total || 0,
          active: apiStats.active || 0,
          inactive: apiStats.inactive || 0,
        
          walkin: apiStats.walkIn || 0,
          vip: apiStats.vip || 0,
          regular: apiStats.regular || 0,
        
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCustomers();
      return;
    }

    try {
      setSearchLoading(true);
      const response = await searchCustomers(searchQuery, 100);
      
      if (response?.success && response?.data) {
        const apiCustomers = Array.isArray(response.data) ? response.data : [];
        const mappedCustomers = mapApiCustomersToLocal(apiCustomers);
        setFilteredCustomers(mappedCustomers);
      }
    } catch (error) {
      toast.error('Search failed');
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        loadCustomers();
      }
    }, 300);

    return () => clearTimeout(delaySearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);



  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCustomers(), loadStats()]);
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleView = (customer: Customer) => {
    setSelectedCustomerInfo(customer);
    setIsCustomerInfoModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleAddCustomer = () => {
    setIsAddModalOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    
    console.log("Deleting customer:", {
      fullCustomer: customerToDelete,
      customerId: customerToDelete.id,
      customerIdType: typeof customerToDelete.id,
      customerCode: customerToDelete.customerId
    });

    try {
      const response = await deleteCustomer(customerToDelete.id);
      
      if (response?.success) {
        toast.success('Customer deleted successfully');
        await loadCustomers();
        await loadStats();
      } else {
        toast.error(response?.message || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Delete customer error:', error);
      toast.error('Failed to delete customer');
    } finally {
      setIsConfirmModalOpen(false);
      setCustomerToDelete(null);
    }
  };

  const handleAddCustomerSubmit = async (data: Parameters<typeof createCustomer>[0]) => {
    const result = await createCustomer(data);
  
    if(result?.success===false){
      setIsAddModalOpen(true);
      console.log("failed to add customer");
    }else{
      setIsAddModalOpen(false);
       await loadCustomers();
    await loadStats();
    }

   
  };

  const handleEditCustomerSubmit = async (customerId: string, data: Parameters<typeof updateCustomer>[1]) => {
    const result = await updateCustomer(customerId, data);
    if(result?.success===false){
      setIsEditModalOpen(true);
     
    }else{
      
    setIsEditModalOpen(false);
    setSelectedCustomer(null);
    await loadCustomers();
    await loadStats();
    }
   
  };

  const handleBulkSMSSame = () => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }
    setIsBulkSMSSameModalOpen(true);
  };

  const handleBulkSMSDifferent = () => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }
    setIsBulkSMSDifferentModalOpen(true);
  };

  const handleSelectionChange = (customers: Customer[]) => {
    setSelectedCustomers(customers);
  };

  if (loading) {
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
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage customer database, loyalty points, and purchase history
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleAddCustomer}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <CustomerStatsCards stats={stats} />
     

   

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              {searchLoading && (
                <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
              )}
              <Input
                type="text"
                placeholder="Search by customer ID, name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar - Shown when customers are selected */}
      {selectedCustomers.length > 0 && (
        <Card className="bg-orange-50/40 backdrop-blur-sm border-orange-200/40">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-orange-900">
                  {selectedCustomers.length} customer{selectedCustomers.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedCustomers.length === 1 && (
                  <>
                    <Button
                      onClick={() => handleView(selectedCustomers[0])}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      onClick={() => handleEdit(selectedCustomers[0])}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(selectedCustomers[0])}
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleBulkSMSSame}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Bulk SMS (Same)
                </Button>
                <Button
                  onClick={handleBulkSMSDifferent}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Bulk SMS (Different)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Table */}
      <CustomerTable
        customers={filteredCustomers}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={totalCustomers}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          selectable={true}
          selectedCustomers={selectedCustomers}
          onSelectionChange={handleSelectionChange}
      />

      <CustomerInfoModal
        isOpen={isCustomerInfoModalOpen}
        onClose={() => {
          setIsCustomerInfoModalOpen(false);
          setSelectedCustomerInfo(null);
        }}
        customer={selectedCustomerInfo}
      />

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddCustomerSubmit}
      />

      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSubmit={handleEditCustomerSubmit}
        customer={selectedCustomer}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customerToDelete?.firstName} ${customerToDelete?.lastName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <BulkSMSSameModal
        isOpen={isBulkSMSSameModalOpen}
        onClose={() => setIsBulkSMSSameModalOpen(false)}
        selectedCustomers={selectedCustomers}
        onSuccess={() => {
          setSelectedCustomers([]);
          toast.success('Bulk SMS sent successfully');
        }}
      />

      <BulkSMSDifferentModal
        isOpen={isBulkSMSDifferentModalOpen}
        onClose={() => setIsBulkSMSDifferentModalOpen(false)}
        selectedCustomers={selectedCustomers}
        onSuccess={() => {
          setSelectedCustomers([]);
          toast.success('Bulk SMS sent successfully');
        }}
      />

      {/* Results count */}
      {filteredCustomers.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredCustomers.length} of {totalCustomers} customers
        </div>
      )}
    </div>
  );
}
