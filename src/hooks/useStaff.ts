import { useState, useCallback } from 'react';
import useFetch from './useFetch';

// Backend API response types
interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    description: string;
  };
  locationId?: string | null;
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
    isActive?: boolean;
  } | null;
  branch?: {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  } | null;
}

interface StaffMember {
  id: string;
  staffId: string;
  userId: string;
  nicNumber: string;
  dateOfBirth: string | null;
  address: string | null;
  phoneNumber: string | null;
  additionalPhone: string | null;
  emergencyContact: string | null;
  emergencyName: string | null;
  emergencyRelation: string | null;
  qualifications: string | null;
  experience: string | null;
  joiningDate: string;
  notes: string | null;
  profileImageUrl: string | null;
  cloudinaryPublicId: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
}

interface StaffDashboardStats {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
}

interface StaffDashboard {
  stats: StaffDashboardStats;
  recentStaff: StaffMember[];
}

interface StaffListResponse {
  staff: StaffMember[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AllStaffFilters {
  search?: string;
  branchId?: string;
  roleId?: string;
  isActive?: boolean;
}

interface StaffIdCardResponse {
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

// Create/Update DTOs
interface CreateStaffPayload {
  email: string;
  name: string;
  password: string;
  roleId: string;
  branchId?: string;
  nicNumber: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  additionalPhone?: string;
  emergencyContact?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  qualifications?: string;
  experience?: string;
  joiningDate?: string;
  notes?: string;
}

interface UpdateStaffPayload {
  email?: string;
  name?: string;
  password?: string;
  roleId?: string;
  branchId?: string | null;
  isActive?: boolean;
  nicNumber?: string;
  dateOfBirth?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  additionalPhone?: string | null;
  emergencyContact?: string | null;
  emergencyName?: string | null;
  emergencyRelation?: string | null;
  qualifications?: string | null;
  experience?: string | null;
  joiningDate?: string | null;
  notes?: string | null;
}

interface BranchInfo {
  user: {
    id: string;
    email: string;
    name: string;
    role: {
      id: string;
      name: string;
    };
  };
  branch: {
    id: string;
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    isActive: boolean;
  } | null;
  message?: string;
}

export const useStaff = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardFetch = useFetch<StaffDashboard>('/staff/dashboard');
  const staffListFetch = useFetch<StaffListResponse>('/staff');
  const staffByIdFetch = useFetch<User>('/staff/:id');
  const branchInfoFetch = useFetch<BranchInfo>('/staff/my-branch');
  const createStaffFetch = useFetch<StaffMember>('/staff/create');
  const allStaffFetch = useFetch<StaffListResponse>('/staff/all');
  const staffDetailsFetch = useFetch<StaffMember>('/staff/details/:id');
  const updateStaffFetch = useFetch<StaffMember>('/staff/update/:id');
  const uploadImageFetch = useFetch<StaffMember>('/staff/upload-image/:id');
  const deleteStaffFetch = useFetch<{ message: string }>('/staff/delete/:id');
  const activateStaffFetch = useFetch<StaffMember>('/staff/activate/:id');
  const deactivateStaffFetch = useFetch<StaffMember>('/staff/deactivate/:id');
  const staffIdCardFetch = useFetch<StaffIdCardResponse>('/staff/id-card/:id');

  /**
   * Get staff dashboard statistics
   * Scoped by branch for Manager/Staff, all for Admin
   */
  const getDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardFetch.fetchData({
       method: 'GET',  silent: true,
       
        endpoint: '/staff/dashboard',
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch dashboard';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStaffIdCard = useCallback(async (id: string, mode: 'qr-only' | 'id-card' = 'id-card') => {
    setLoading(true);
    setError(null);
    try {
      const response = await staffIdCardFetch.fetchData({
        method: 'GET',
        silent: true,
        endpoint: `/staff/id-card/${id}?mode=${mode}`,
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch staff ID card data';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Get staff list with pagination
   */
  const getStaffList = useCallback(async (page = 1, limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const response = await staffListFetch.fetchData({
       method: 'GET',  silent: true,
        endpoint: `/staff?page=${page}&limit=${limit}`,
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch staff list';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Get staff member by ID
   */
  const getStaffById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await staffByIdFetch.fetchData({
       method: 'GET',  silent: true,
        endpoint: `/staff/${id}`,
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch staff member';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Get current user's branch information
   */
  const getMyBranchInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await branchInfoFetch.fetchData({
       method: 'GET',  silent: true,
        endpoint: '/staff/my-branch',
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch branch info';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Create new staff member
   */
  const createStaff = useCallback(async (payload: CreateStaffPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await createStaffFetch.fetchData({
        method: 'POST',
        endpoint: '/staff/create',
        data: payload,
        successMessage: 'Staff member created successfully',
      });
      if (!response || response.success === false) {
        return null;
      }
      if (response.success === true || response.data) {
        return response.data ?? true;
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create staff member';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Get all staff with filters and pagination
   */
  const getAllStaff = useCallback(
    async (page = 1, limit = 10, filters?: AllStaffFilters) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (filters?.search) queryParams.append('search', filters.search);
        if (filters?.branchId) queryParams.append('branchId', filters.branchId);
        if (filters?.roleId) queryParams.append('roleId', filters.roleId);
        if (filters?.isActive !== undefined)
          queryParams.append('isActive', filters.isActive.toString());

        const response = await allStaffFetch.fetchData({
         method: 'GET',  silent: true,
          endpoint: `/staff/all?${queryParams.toString()}`,
        });
        return response?.data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch all staff';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Get detailed staff information by user ID
   */
  const getStaffDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await staffDetailsFetch.fetchData({
       method: 'GET',  silent: true,
        endpoint: `/staff/details/${id}`,
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch staff details';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Update staff member
   */
  const updateStaff = useCallback(async (id: string, payload: UpdateStaffPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await updateStaffFetch.fetchData({
        method: 'PUT',
        endpoint: `/staff/update/${id}`,
        data: payload,
        successMessage: 'Staff member updated successfully',
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update staff member';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Upload staff profile image
   */
  const uploadStaffImage = useCallback(async (id: string, imageFile: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await uploadImageFetch.fetchData({
        method: 'POST',
        endpoint: `/staff/upload-image/${id}`,
        data: formData,
        contentType: 'multipart/form-data',
        successMessage: 'Profile image uploaded successfully',
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Delete staff member (soft delete)
   */
  const deleteStaff = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await deleteStaffFetch.fetchData({
        method: 'DELETE',
        endpoint: `/staff/delete/${id}`,
        successMessage: 'Staff member deleted successfully',
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete staff member';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Activate staff member (set isActive = true)
   */
  const activateStaff = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await activateStaffFetch.fetchData({
        method: 'PATCH',
        endpoint: `/staff/activate/${id}`,
        successMessage: 'Staff member activated successfully',
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to activate staff member';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Deactivate staff member (set isActive = false)
   */
  const deactivateStaff = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await deactivateStaffFetch.fetchData({
        method: 'PATCH',
        endpoint: `/staff/deactivate/${id}`,
        successMessage: 'Staff member deactivated successfully',
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to deactivate staff member';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getDashboard,
    getStaffList,
    getStaffById,
    getMyBranchInfo,
    createStaff,
    getAllStaff,
    getStaffDetails,
    updateStaff,
    uploadStaffImage,
    deleteStaff,
    activateStaff,
    deactivateStaff,
    getStaffIdCard,
  };
};
