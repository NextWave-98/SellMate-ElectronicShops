import { useEffect, useState } from 'react';
import type { Staff } from '../../types/staff.types';
import { StaffStatus, StaffRole, Department } from '../../types/staff.types';
import StaffStatsCards from '../../components/superadmin/staff/StaffStatsCards';
import StaffTable from '../../components/superadmin/staff/StaffTable';
import StaffFilters from '../../components/superadmin/staff/StaffFilters';
import AddStaffModal from '../../components/superadmin/staff/AddStaffModal';
import EditStaffModal from '../../components/superadmin/staff/EditStaffModal';
import AssignBranchModal from '../../components/superadmin/staff/AssignBranchModal';
import StaffIdCardModal from '../../components/superadmin/staff/StaffIdCardModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import { Plus, RefreshCw, Eye, Edit, Building2, UserCheck, UserX, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useStaff } from '../../hooks/useStaff';
import useFetch from '../../hooks/useFetch';
import useOrgFeatures from '../../hooks/useOrgFeatures';

interface StaffIdCardData {
  mode: 'qr-only' | 'id-card';
  qrToken: string;
  qrPayload: string;
  expiresIn: string;
  qrImageDataUrl: string;
  organization?: {
    name: string;
    logo: string | null;
  };
  staff: {
    userId: string;
    staffId: string;
    name: string;
    email: string;
    roleName: string;
    locationName: string;
    locationCode: string | null;
    phoneNumber: string | null;
    profileImage: string | null;
  };
}

export default function StaffPage() {
  const { getAllStaff, getDashboard, deleteStaff: deleteStaffAPI, createStaff, updateStaff, activateStaff, deactivateStaff, getStaffIdCard } = useStaff();
  const { staffManagementEnabled, loading: loadingOrgFeatures } = useOrgFeatures();
  const assignBranchFetch = useFetch('/staff/assign-branches/:id');
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isAssignBranchModalOpen, setIsAssignBranchModalOpen] = useState(false);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffToAssign, setStaffToAssign] = useState<Staff | null>(null);
  const [staffIdCardData, setStaffIdCardData] = useState<StaffIdCardData | null>(null);
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    onLeave: 0,
    byRole: {
      superAdmins: 0,
      admins: 0,
      managers: 0,
      technicians: 0,
      salesPersons: 0,
      others: 0,
    },
    byDepartment: {
      management: 0,
      sales: 0,
      technical: 0,
      inventory: 0,
      finance: 0,
      customerService: 0,
    },
    averagePerformanceRating: 0,
    totalSalaryExpense: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalStaff, setTotalStaff] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<StaffRole | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<StaffStatus | ''>('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | ''>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selection state
  const [selectedStaffMembers, setSelectedStaffMembers] = useState<Staff[]>([]);

  const loadStaff = async (page = currentPage, limit = itemsPerPage) => {
    try {
      setLoading(true);
      const response = await getAllStaff(page, limit, {
        search: debouncedSearchQuery || undefined,
        isActive: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
        roleId: selectedRole ? mapFrontendRoleToBackend(selectedRole) : undefined,
      });

      if (response) {
        // Update pagination info
        setTotalStaff(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
       
        // Map backend response to frontend Staff type
        const mappedStaff = response.staff.map((member: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          id: member.userId, // Use database UUID directly
          firstName: member.user.name.split(' ')[0] || '',
          lastName: member.user.name.split(' ').slice(1).join(' ') || '',
          email: member.user.email,
          phone: member.phoneNumber || 'N/A',
          role: member.user.role.name,
          roleId: parseInt(member.user.role.id) || 0,
          employeeId: member.staffId,
          locationId: member.user.location?.id || null,
          location: member.user.location ? {
            id: member.user.location.id,
            name: member.user.location.name,
            locationCode: member.user.location.locationCode,
            locationType: member.user.location.locationType || 'branch',
          } : undefined,
          department: Department.MANAGEMENT, // Default, adjust as needed
          status: member.user.isActive ? StaffStatus.ACTIVE : StaffStatus.INACTIVE,
          joiningDate: member.joiningDate,
          salary: 0, // Not available from backend
          address: member.address ,
          city: 'N/A',
          emergencyContact: {
            name: member.emergencyName ,
            phone: member.emergencyContact,
            relationship: member.emergencyRelation ,
          },
          skills: [],
          performanceRating: 0,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        }));

       

        setStaff(mappedStaff);
      }
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
      // Clear selections after loading (e.g., after actions)
      setSelectedStaffMembers([]);
    }
  };

  const loadStats = async () => {
    try {
      const dashboardData = await getDashboard();
      if (dashboardData) {
        setStats({
          totalStaff: dashboardData.stats.totalStaff,
          activeStaff: dashboardData.stats.activeStaff,
          onLeave: dashboardData.stats.totalStaff - dashboardData.stats.activeStaff,
          byRole: {
            superAdmins: 0,
            admins: 0,
            managers: 0,
            technicians: 0,
            salesPersons: 0,
            others: 0,
          },
          byDepartment: {
            management: 0,
            sales: 0,
            technical: 0,
            inventory: 0,
            finance: 0,
            customerService: 0,
          },
          averagePerformanceRating: 0,
          totalSalaryExpense: 0,
        });
      }
    } catch {
      console.error('Failed to load stats:');
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 900); // 900ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch initial data
  useEffect(() => {
    loadStaff();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchQuery, selectedStatus, selectedRole]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedStatus, selectedRole]);

  // Update filtered staff when staff changes
  useEffect(() => {
    setFilteredStaff(staff);
  }, [staff]);

  // Helper function to map backend roles to frontend
  // const mapBackendRoleToFrontend = (roleName: string): StaffRole => {
  //   const roleMap: Record<string, StaffRole> = {
  //     'ADMIN': StaffRole.ADMIN,
  //     'MANAGER': StaffRole.MANAGER,
  //     'STAFF': StaffRole.SALES_PERSON,
  //   };
  //   return roleMap[roleName] || StaffRole.SALES_PERSON;
  // };

  // Helper function to map frontend roles to backend
  const mapFrontendRoleToBackend = (role: StaffRole): string => {
    const roleMap: Record<StaffRole, string> = {
      [StaffRole.ADMIN]: 'ADMIN',
      [StaffRole.MANAGER]: 'MANAGER',
      [StaffRole.TECHNICIAN]: 'STAFF', // Map technician to STAFF
      [StaffRole.SALES_PERSON]: 'STAFF', // Map sales_person to STAFF
      [StaffRole.CASHIER]: 'STAFF', // Map cashier to STAFF
      [StaffRole.STOCK_KEEPER]: 'STAFF', // Map stock_keeper to STAFF
      [StaffRole.SUPER_ADMIN]: 'SUPER_ADMIN',
    };
    return roleMap[role] || 'STAFF';
  };



  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStaff(), loadStats()]);
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedRole('');
    setSelectedStatus('');
    setSelectedDepartment('');
    setCurrentPage(1);
  };

  const handleEdit = (member: Staff) => {
    setSelectedStaff(member);
    setIsEditModalOpen(true);
  };

  const handleDelete = (member: Staff) => {
    setStaffToDelete(member);
    setIsConfirmModalOpen(true);
  };

  const handleActivate = async (member: Staff) => {
    try {
      await activateStaff(member.id);
      toast.success('Staff member activated');
      await loadStaff();
      setSelectedStaffMembers([]); // Clear selection after action
    } catch {
      toast.error('Failed to activate staff member');
    }
  };

  const handleDeactivate = async (member: Staff) => {
    try {
      await deactivateStaff(member.id);
      toast.success('Staff member deactivated');
      await loadStaff();
      setSelectedStaffMembers([]); // Clear selection after action
    } catch {
      toast.error('Failed to deactivate staff member');
    }
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    
    try {
      await deleteStaffAPI(staffToDelete.id);
     
      await loadStaff();
    } catch {
      toast.error('Failed to delete staff member');
    } finally {
      setIsConfirmModalOpen(false);
      setStaffToDelete(null);
    }
  };

  const handleView = (member: Staff) => {
    // View functionality - open edit modal in view mode or navigate to details page
    setSelectedStaff(member);
    setIsEditModalOpen(true);
  };

  const handleAddStaff = () => {
    setIsAddModalOpen(true);
  };

  const handleAddStaffSubmit = async (data: Parameters<typeof createStaff>[0]) => {
    const response = await createStaff(data);
    if (!response) {
      return;
    }
    setIsAddModalOpen(false);
    await loadStaff();
    await loadStats();
  };

  const handleEditStaffSubmit = async (userId: string, data: Parameters<typeof updateStaff>[1]) => {
   const res= await updateStaff(userId, data);
   if(res){
    setIsEditModalOpen(false);
    setSelectedStaff(null);
    await loadStaff();}
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // loadStaff will be triggered by useEffect watching currentPage
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    // loadStaff will be triggered by useEffect watching itemsPerPage
  };

  const handleAssignBranch = (member: Staff) => {
    setStaffToAssign(member);
    setIsAssignBranchModalOpen(true);
  };

  const handleAssignBranchSubmit = async (
    staffId: string,
    branchIds: string[],
    primaryBranchId: string | null
  ) => {
    try {
      const response = await assignBranchFetch.fetchData({
        method: 'PUT',
        endpoint: `/staff/assign-branches/${staffId}`,
        data: { branchIds, primaryBranchId },
      });

      if (response?.success) {
        await loadStaff();
        setSelectedStaffMembers([]); // Clear selection after action
      }
    } catch (error) {
      console.error('Error assigning branches:', error);
      throw error;
    }
  };

  const handleSelectionChange = (staff: Staff[]) => {
    setSelectedStaffMembers(staff);
  };

  const handleGenerateStaffCard = async (member: Staff, mode: 'qr-only' | 'id-card') => {
    try {
      const data = await getStaffIdCard(member.id, mode);
      if (!data) {
        toast.error('Failed to generate staff QR');
        return;
      }
      setStaffIdCardData(data as StaffIdCardData);
      setIsIdCardModalOpen(true);
    } catch {
      toast.error('Failed to generate staff QR');
    }
  };

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <LoadingSpinner size="lg" />
  //     </div>
  //   );
  // }

  if (loadingOrgFeatures) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!staffManagementEnabled) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Management Disabled</h1>
          <p className="text-gray-600">
            Staff management is not enabled for this organization.
            Ask an admin to enable it in POS Settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage all your staff members, roles, and permissions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAddStaff} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Staff Member</span>
            <span className="sm:hidden">Add Staff</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StaffStatsCards stats={stats} />


      {/* Filters */}
      <StaffFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
        onReset={handleResetFilters}
      />

      {/* Action Bar - Shown when staff members are selected */}
      {selectedStaffMembers.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-900">
                  {selectedStaffMembers.length} staff member{selectedStaffMembers.length > 1 ? 's' : ''} selected
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedStaffMembers.length === 1 && (
                  <>
                    <Button onClick={() => handleView(selectedStaffMembers[0])} className="bg-orange-600 hover:bg-orange-700">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button onClick={() => handleEdit(selectedStaffMembers[0])} className="bg-yellow-600 hover:bg-yellow-700">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button onClick={() => handleAssignBranch(selectedStaffMembers[0])} className="bg-indigo-600 hover:bg-indigo-700">
                      <Building2 className="w-4 h-4 mr-2" />
                      Assign Branch
                    </Button>
                    <Button onClick={() => handleGenerateStaffCard(selectedStaffMembers[0], 'qr-only')} className="bg-blue-600 hover:bg-blue-700">
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Only
                    </Button>
                    {/* <Button onClick={() => handleGenerateStaffCard(selectedStaffMembers[0], 'id-card')} className="bg-sky-700 hover:bg-sky-800">
                      <QrCode className="w-4 h-4 mr-2" />
                      ID Card + QR
                    </Button> */}
                    {selectedStaffMembers[0].status === StaffStatus.ACTIVE ? (
                      <Button variant="destructive" onClick={() => handleDelete(selectedStaffMembers[0])}>
                        <UserX className="w-4 h-4 mr-2" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button onClick={() => handleActivate(selectedStaffMembers[0])} className="bg-green-600 hover:bg-green-700">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Activate
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center ">
          <LoadingSpinner size="lg" />
          </div>
      ) :
          <>

      {/* Staff Table */}
      <StaffTable
        staff={filteredStaff}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onAssignBranch={handleAssignBranch}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalStaff}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        selectable={true}
        selectedStaff={selectedStaffMembers}
        onSelectionChange={handleSelectionChange}
      />
      </>}

      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddStaffSubmit}
      />

      <EditStaffModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStaff(null);
           setSelectedStaffMembers([]);
        }}
        onSubmit={handleEditStaffSubmit}
        staff={selectedStaff}
      />

      <AssignBranchModal
        isOpen={isAssignBranchModalOpen}
        onClose={() => {
          setIsAssignBranchModalOpen(false);
          setStaffToAssign(null);
          setSelectedStaffMembers([]);
        }}
        onSubmit={handleAssignBranchSubmit}
        staffId={staffToAssign?.id || ''}
        staffName={staffToAssign ? `${staffToAssign.firstName} ${staffToAssign.lastName}` : ''}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setStaffToDelete(null);
           setSelectedStaffMembers([]);
        }}
        onConfirm={handleConfirmDelete}
        title="Deactivate Staff Member"
        message={`Are you sure you want to deactivate ${staffToDelete?.firstName} ${staffToDelete?.lastName}? `}
        confirmText="Deactivate"
        cancelText="Cancel"
      />

      <StaffIdCardModal
        isOpen={isIdCardModalOpen}
        onClose={() => {
          setIsIdCardModalOpen(false);
          setStaffIdCardData(null);
        }}
        data={staffIdCardData}
      />

      {/* Results count */}
      {filteredStaff.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredStaff.length} of {staff.length} staff members
        </div>
      )}
    </div>
  );
}
