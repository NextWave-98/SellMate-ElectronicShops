import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

// Job Sheet Types
export interface JobSheet {
  id: string;
  jobNumber: string;
  customerId: string;
  deviceId: string;
  locationId: string; // Changed from branchId
  issueDescription: string;
  diagnosisNotes?: string | null;
  repairNotes?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'WAITING_APPROVAL' | 'QUALITY_CHECK' | 'COMPLETED' | 'READY_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: string | null;
  labourCost: number;
  partsCost: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  warrantyPeriod?: number | null;
  warrantyExpiry?: string | null;
  receivedDate: string;
  expectedCompletionDate?: string | null;
  completedDate?: string | null;
  deliveredDate?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    customerId: string;
    name: string;
    phone: string;
    email?: string;
  };
  device?: {
    id: string;
    deviceType: string;
    brand: string;
    model: string;
    serialNumber?: string;
    imei?: string;
  };
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
  assignedTo?: {
    id: string;
    staffId: string;
    name: string;
  };
}

export interface CreateJobSheetData {
  customerId: string;
  /** Electronics jobs. Garage jobs send customerVehicleId instead. */
  deviceId?: string;
  customerVehicleId?: string;
  serviceBayId?: string | null;
  locationId: string; // Changed from branchId
  issueDescription: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'WAITING_APPROVAL' | 'QUALITY_CHECK' | 'COMPLETED' | 'READY_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: string | null;
  labourCost?: number;
  partsCost?: number;
  discountAmount?: number;
  paidAmount?: number;
  warrantyPeriod?: number;
  expectedCompletionDate?: string;
  diagnosisNotes?: string;
  accessories?: string;
}

export interface UpdateJobSheetData {
  issueDescription?: string;
  diagnosisNotes?: string | null;
  repairNotes?: string | null;
  status?: 'PENDING' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'WAITING_APPROVAL' | 'QUALITY_CHECK' | 'COMPLETED' | 'READY_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: string | null;
  labourCost?: number;
  partsCost?: number;
  discountAmount?: number;
  paidAmount?: number;
  warrantyPeriod?: number;
  expectedCompletionDate?: string;
  completedDate?: string;
  deliveredDate?: string;
}

export interface UpdateJobStatLKRata {
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'WAITING_APPROVAL' | 'QUALITY_CHECK' | 'COMPLETED' | 'READY_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';
  remarks?: string;
}

export interface AddPartToJobData {
  partId: string;
  quantity: number;
  unitPrice: number;
  warrantyMonths?: number;
}

export interface AddProductToJobData {
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  warrantyMonths?: number;
  serialNumber?: string;
  batchNumber?: string;
  notes?: string;
}

export interface CreatePaymentData {
  jobSheetId: string;
  customerId: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'CHECK' | 'OTHER';
  reference?: string;
  notes?: string;
}

const useJobSheet = () => {
  const getJobSheetsFetch = useFetch();
  const getJobSheetByIdFetch = useFetch();
  const getJobSheetByNumberFetch = useFetch();
  const createJobSheetFetch = useFetch();
  const updateJobSheetFetch = useFetch();
  const updateJobStatusFetch = useFetch();
  const deleteJobSheetFetch = useFetch();
  const getJobSheetStatsFetch = useFetch();
  const getOverdueJobsFetch = useFetch();
  const addPartToJobFetch = useFetch();
  const removePartFromJobFetch = useFetch();
  const addProductToJobFetch = useFetch();
  const removeProductFromJobFetch = useFetch();
  const createPaymentFetch = useFetch();
  const getJobPaymentsFetch = useFetch();
  const getStatusHistoryFetch = useFetch();
  
  const { user } = useAuth();
  const businessId = user?.businessId;

  // Get all job sheets with pagination and filters
  const getJobSheets = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      priority?: string;
      branchId?: string;
      locationId?: string;
      customerId?: string;
      assignedToId?: string;
      myJobs?: boolean;
      dateFilter?: string;
      fromDate?: string;
      toDate?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.priority) queryParams.append('priority', params.priority);
      if (params?.locationId) queryParams.append('locationId', params.locationId);
      if (params?.customerId) queryParams.append('customerId', params.customerId);
      if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId);
      if (params?.myJobs) queryParams.append('myJobs', 'true');
      if (params?.dateFilter) queryParams.append('dateFilter', params.dateFilter);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);

      return getJobSheetsFetch.fetchData({
        endpoint: `/jobsheets?${queryParams.toString()}`,
        method: 'GET',
        silent: true,
      });
    },
    [getJobSheetsFetch]
  );

  // Get job sheet by ID
  const getJobSheetById = useCallback(
    async (id: string) => {
      return getJobSheetByIdFetch.fetchData({
        endpoint: `/jobsheets/${id}`,
        method: 'GET',
        silent: true,
      });
    },
    [getJobSheetByIdFetch]
  );

  // Get job sheet by job number
  const getJobSheetByNumber = useCallback(
    async (jobNumber: string) => {
      return getJobSheetByNumberFetch.fetchData({
        endpoint: `/jobsheets/number/${jobNumber}`,
        method: 'GET',
        silent: true,
      });
    },
    [getJobSheetByNumberFetch]
  );

  // Create job sheet
  const createJobSheet = useCallback(
    async (data: CreateJobSheetData) => {
      return createJobSheetFetch.fetchData({
        endpoint: '/jobsheets',
        method: 'POST',
        data: { ...data, businessId },
        successMessage: 'Job sheet created successfully!',
      });
    },
    [createJobSheetFetch, businessId]
  );

  // Update job sheet
  const updateJobSheet = useCallback(
    async (id: string, data: UpdateJobSheetData) => {
      return updateJobSheetFetch.fetchData({
        endpoint: `/jobsheets/${id}`,
        method: 'PUT',
        data: { ...data, businessId },
        successMessage: 'Job sheet updated successfully!',
      });
    },
    [updateJobSheetFetch, businessId]
  );

  // Update job status
  const updateJobStatus = useCallback(
    async (id: string, data: UpdateJobStatLKRata) => {
      return updateJobStatusFetch.fetchData({
        endpoint: `/jobsheets/${id}/status`,
        method: 'PATCH',
        data: { ...data, businessId },
        successMessage: 'Job status updated successfully!',
      });
    },
    [updateJobStatusFetch, businessId]
  );

  // Delete job sheet
  const deleteJobSheet = useCallback(
    async (id: string) => {
      return deleteJobSheetFetch.fetchData({
        endpoint: `/jobsheets/${id}`,
        method: 'DELETE',
        successMessage: 'Job sheet deleted successfully!',
      });
    },
    [deleteJobSheetFetch]
  );

  // Get job sheet statistics
  const getJobSheetStats = useCallback(
    async (params?: { locationId?: string; dateFilter?: string; fromDate?: string; toDate?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.locationId) queryParams.append('locationId', params.locationId);
      if (params?.dateFilter) queryParams.append('dateFilter', params.dateFilter);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);

      return getJobSheetStatsFetch.fetchData({
        endpoint: `/jobsheets/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
        method: 'GET',
        silent: true,
      });
    },
    [getJobSheetStatsFetch]
  );

  // Get overdue jobs
  const getOverdueJobs = useCallback(
    async () => {
      return getOverdueJobsFetch.fetchData({
        endpoint: '/jobsheets/overdue',
        method: 'GET',
        silent: true,
      });
    },
    [getOverdueJobsFetch]
  );

  // Add part to job sheet
  const addPartToJob = useCallback(
    async (jobSheetId: string, data: AddPartToJobData) => {
      return addPartToJobFetch.fetchData({
        endpoint: `/jobsheets/${jobSheetId}/parts`,
        method: 'POST',
        data: { ...data, businessId },
        successMessage: 'Part added to job sheet!',
      });
    },
    [addPartToJobFetch, businessId]
  );

  // Remove part from job sheet
  const removePartFromJob = useCallback(
    async (jobSheetId: string, partId: string) => {
      return removePartFromJobFetch.fetchData({
        endpoint: `/jobsheets/${jobSheetId}/parts/${partId}`,
        method: 'DELETE',
        successMessage: 'Part removed from job sheet!',
      });
    },
    [removePartFromJobFetch]
  );

  // Add product to job sheet
  const addProductToJob = useCallback(
    async (jobSheetId: string, data: AddProductToJobData) => {
      return addProductToJobFetch.fetchData({
        endpoint: `/jobsheets/${jobSheetId}/products`,
        method: 'POST',
        data: { ...data, businessId },
        successMessage: 'Product added to job sheet!',
      });
    },
    [addProductToJobFetch, businessId]
  );

  // Remove product from job sheet
  const removeProductFromJob = useCallback(
    async (jobSheetId: string, productId: string) => {
      return removeProductFromJobFetch.fetchData({
        endpoint: `/jobsheets/${jobSheetId}/products/${productId}`,
        method: 'DELETE',
        successMessage: 'Product removed from job sheet!',
      });
    },
    [removeProductFromJobFetch]
  );

  // Create payment
  const createPayment = useCallback(
    async (data: CreatePaymentData) => {
      return createPaymentFetch.fetchData({
        endpoint: '/payments',
        method: 'POST',
        data: { ...data, businessId },
        successMessage: 'Payment recorded successfully!',
      });
    },
    [createPaymentFetch, businessId]
  );

  // Get job payments
  const getJobPayments = useCallback(
    async (jobSheetId: string) => {
      return getJobPaymentsFetch.fetchData({
        endpoint: `/jobsheets/${jobSheetId}/payments`,
        method: 'GET',
        silent: true,
      });
    },
    [getJobPaymentsFetch]
  );

  // Get status history
  const getStatusHistory = useCallback(
    async (jobSheetId: string) => {
      return getStatusHistoryFetch.fetchData({
        endpoint: `/jobsheets/${jobSheetId}/status-history`,
        method: 'GET',
        silent: true,
      });
    },
    [getStatusHistoryFetch]
  );

  const downloadJobsheetCard = useCallback(
    async (jobsheetId: string, options: { includeTerms?: boolean; includeConditions?: boolean } = {}) => {
      try {
        const queryParams = new URLSearchParams({
          format: 'pdf',
          includeTerms: (options.includeTerms ?? true).toString(),
          includeConditions: (options.includeConditions ?? true).toString(),
        });

        const result = await getJobSheetsFetch.fetchData({
          method: 'GET',
          endpoint: `/jobsheets/${jobsheetId}/download?${queryParams}`,
          responseType: 'blob',
          silent: true,
        });

        if (!result || !(result instanceof Blob)) {
          throw new Error('Failed to download jobsheet card');
        }

        const blob = result as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `jobsheet_${jobsheetId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading warranty card:', error);
        throw error;
      }
    },
    [getJobSheetsFetch]
  );

  const printJobSheet = useCallback(
    async (jobsheetId: string, options: { copies?: number; includeTerms?: boolean; includeConditions?: boolean } = {}) => {
      try {
        const queryParams = new URLSearchParams({
          copies: (options.copies ?? 1).toString(),
          includeTerms: (options.includeTerms ?? true).toString(),
          includeConditions: (options.includeConditions ?? true).toString(),
        });

        const result = await getJobSheetsFetch.fetchData({
          method: 'GET',
          endpoint: `/jobsheets/${jobsheetId}/print?${queryParams}`,
          responseType: 'blob',
          silent: true,
        });

        if (!result || !(result instanceof Blob)) {
          throw new Error('Failed to generate jobsheet for printing');
        }

        const blob = result as Blob;
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');

        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          // Fallback: download the file if popup is blocked
          const link = document.createElement('a');
          link.href = url;
          link.download = `jobsheet_${jobsheetId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        // Clean up the URL object after a delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
      } catch (error) {
        console.error('Error printing warranty card:', error);
        throw error;
      }
    },
    [getJobSheetsFetch]
  );

  return {
    getJobSheets,
    getJobSheetById,
    getJobSheetByNumber,
    createJobSheet,
    updateJobSheet,
    updateJobStatus,
    deleteJobSheet,
    getJobSheetStats,
    getOverdueJobs,
    addPartToJob,
    removePartFromJob,
    addProductToJob,
    removeProductFromJob,
    createPayment,
    getJobPayments,
    getStatusHistory,
    downloadJobsheetCard,
    printJobSheet,
    loading: createJobSheetFetch.loading || updateJobSheetFetch.loading || deleteJobSheetFetch.loading,
  };
};

export default useJobSheet;

