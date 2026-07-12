/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useJobSheet from '../../hooks/useJobSheet';
import { useDebounce } from '../../hooks/useDebounce';
import type { JobSheet, CreateJobSheetData, CreatePaymentData, UpdateJobSheetData } from '../../hooks/useJobSheet';
import { Plus, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';
import JobSheetFilters from '../../components/branch/jobsheets/JobSheetFilters.tsx';
import type { JobSheetStatus, JobPriority, DateFilter } from '../../components/branch/jobsheets/JobSheetFilters.tsx';
import JobSheetTable from '../../components/branch/jobsheets/JobSheetTable.tsx';
import JobSheetStatsCards from '../../components/branch/jobsheets/JobSheetStatsCards.tsx';
import AddJobSheetModal from '../../components/branch/jobsheets/AddJobSheetModal.tsx';
import ViewJobSheetModal from '../../components/branch/jobsheets/ViewJobSheetModal.tsx';
import EditJobSheetModal from '../../components/branch/jobsheets/EditJobSheetModal.tsx';
import AddPaymentModal from '../../components/branch/jobsheets/AddPaymentModal.tsx';

export default function BranchJobSheetsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    getJobSheets, 
    createJobSheet, 
    updateJobSheet, 
    createPayment,
    getJobSheetStats,
    downloadJobsheetCard,
    printJobSheet,
  } = useJobSheet();
  
  // Data states
  const [jobSheets, setJobSheets] = useState<JobSheet[]>([]);
  const [stats, setStats] = useState({
    totalJobSheets: 0,
    pending: 0,
    inProgress: 0,
    waitingForParts: 0,
    readyForPickup: 0,
    completed: 0,
    cancelled: 0,
    onHold: 0,
    totalRevenue: 0,
    totalAdvancePayments: 0,
    totalBalance: 0,
    averageJobValue: 0,
  });
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state - initialize from URL params
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    total: 0,
    totalPages: 0,
  });
  
  // Modal states
  const [showAddJobSheet, setShowAddJobSheet] = useState(false);
  const [showViewJobSheet, setShowViewJobSheet] = useState(false);
  const [showEditJobSheet, setShowEditJobSheet] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedJobSheetId, setSelectedJobSheetId] = useState<string | null>(null);
  const [selectedJobSheetForEdit, setSelectedJobSheetForEdit] = useState<JobSheet | null>(null);
  const [selectedJobSheetForPayment, setSelectedJobSheetForPayment] = useState<(JobSheet & { customerName: string }) | null>(null);

  // Filter states - initialize from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [selectedStatus, setSelectedStatus] = useState<JobSheetStatus | ''>(searchParams.get('status') as JobSheetStatus || '');
  const [selectedPriority, setSelectedPriority] = useState<JobPriority | ''>(searchParams.get('priority') as JobPriority || '');
  const [dateFilter, setDateFilter] = useState<DateFilter>(searchParams.get('dateFilter') as DateFilter || 'today');
  const [startDate, setStartDate] = useState(searchParams.get('fromDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('toDate') || '');
  const [myJobsOnly, setMyJobsOnly] = useState(searchParams.get('myJobs') === 'true');
  const updateURLParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('search', searchQuery);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedPriority) params.set('priority', selectedPriority);
    if (dateFilter !== 'today') params.set('dateFilter', dateFilter);
    if (startDate) params.set('fromDate', startDate);
    if (endDate) params.set('toDate', endDate);
    if (myJobsOnly) params.set('myJobs', 'true');
    
    // Always include page and limit
    params.set('page', pagination.page.toString());
    params.set('limit', pagination.limit.toString());
    
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedStatus, selectedPriority, dateFilter, startDate, endDate, myJobsOnly, pagination.page, pagination.limit, setSearchParams]);

  // Update URL when filter states change
  useEffect(() => {
    updateURLParams();
  }, [updateURLParams]);

  // Apply filters whenever data or filter states change
  
  // Load stats from API
  const loadStats = useCallback(async () => {
    if (!user?.locationId) return;
    
    try {
      const statsParams: any = {
        locationId: user.locationId,
      };

      // Add date filters
      if (dateFilter) {
        statsParams.dateFilter = dateFilter;
      }

      // Add custom date range if selected
      if (dateFilter === 'custom') {
        if (startDate) {
          statsParams.fromDate = startDate;
        }
        if (endDate) {
          statsParams.toDate = endDate;
        }
      }

      const response = await getJobSheetStats(statsParams);
      if (response?.data) {
        const apiData = response.data as any;
        const summary = apiData.summary || {};
        const statLKRist = apiData.statLKRistribution || [];
        const priorityDist = apiData.priorityDistribution || [];

        setStats(prevStats => ({
          ...prevStats,
          // Summary stats from API
          totalJobSheets: summary.totalJobSheets || 0,
          totalRevenue: summary.totalRevenue || 0,
          totalAdvancePayments: summary.totalAdvancePayments || 0,
          totalBalance: summary.totalDueBalance || 0,
          averageJobValue: summary.totalJobSheets > 0 ? summary.totalRevenue / summary.totalJobSheets : 0,

          // Status distribution
          pending: statLKRist.find((s: any) => s.status === 'PENDING')?.count || 0,
          inProgress: statLKRist.find((s: any) => s.status === 'IN_PROGRESS')?.count || 0,
          completed: statLKRist.find((s: any) => s.status === 'COMPLETED')?.count || 0,
          cancelled: statLKRist.find((s: any) => s.status === 'CANCELLED')?.count || 0,
          waitingForParts: statLKRist.find((s: any) => s.status === 'WAITING_PARTS')?.count || 0,
          readyForPickup: statLKRist.find((s: any) => s.status === 'READY_DELIVERY')?.count || 0,
          onHold: statLKRist.find((s: any) => s.status === 'ON_HOLD')?.count || 0,
        }));
      }
    } catch (err) {
      console.error('Failed to load job sheet stats:', err);
    }
  }, [user?.locationId, dateFilter, startDate, endDate,]);

  const loadJobSheets = useCallback(async (page = pagination.page, limit = pagination.limit) => {
    if (!user?.locationId) return;
    
    try {
      setLoading(true);
      const queryParams: any = {
        locationId: user.locationId,  // Filter by user's branch
        page,
        limit,
      };

      // Add search filter if present
      if (debouncedSearch) {
        queryParams.search = debouncedSearch;
      }

      // Add status filter if present
      if (selectedStatus) {
        queryParams.status = selectedStatus;
      }

      // Add priority filter if present
      if (selectedPriority) {
        queryParams.priority = selectedPriority;
      }

      // Add date filters
      if (dateFilter) {
        queryParams.dateFilter = dateFilter;
      }

      // Add custom date range if selected
      if (dateFilter === 'custom') {
        if (startDate) {
          queryParams.fromDate = startDate;
        }
        if (endDate) {
          queryParams.toDate = endDate;
        }
      }

      if (myJobsOnly) {
        queryParams.myJobs = true;
      }

      const response = await getJobSheets(queryParams);
      
      if (response?.data) {
        const responseData = response.data as { jobSheets?: JobSheet[], data?: JobSheet[], pagination?: { totalPages: number; total: number; page: number; limit: number } } | JobSheet[];
        const apiList = Array.isArray(responseData) 
          ? responseData 
          : (responseData as { jobSheets?: JobSheet[] }).jobSheets || 
            (responseData as { data?: JobSheet[] }).data || [];

        // Map API job objects to the UI shape expected by JobSheetTable
        const mapped = apiList.map((j: any) => ({
          // Keep id as-is (API uses UUIDs); components sometimes call toString() on id
          id: j.id,
          jobNumber: j.jobNumber || j.job_number || '',
          customerId: j.customerId || j.customer_id || '',
          deviceId: j.deviceId || j.device_id || '',
          locationId: j.locationId || j.location_id || '',

          // Customer nested object
          customer: j.customer ? {
            id: j.customer.id,
            customerId: j.customer.customer_id,
            name: j.customer.name,
            phone: j.customer.phone,
            email: j.customer.email,
          } : null,

          // Device nested object
          device: j.device ? {
            id: j.device.id,
            deviceType: j.device.device_type,
            brand: j.device.brand,
            model: j.device.model,
            serialNumber: j.device.serial_number,
            imei: j.device.imei,
          } : null,

          // Location nested object
          location: j.location ? {
            id: j.location.id,
            name: j.location.name,
            locationCode: j.location.locationCode || '',
            locationType: j.location.locationType || '',
          } : null,

          // Job details
          issueDescription: j.issueDescription || j.issue || '',
          diagnosisNotes: j.diagnosisNotes || null,
          repairNotes: j.technicianRemarks || j.repairNotes || null,
          priority: j.priority || 'MEDIUM',
          status: j.status || 'PENDING',
          assignedToId: j.assignedToId || j.assigned_to_id || null,
          assignedTo: j.assignedTo?.name || j.assignedTo || '',

          // Costs (normalize to numbers)
          labourCost: Number(j.labourCost || j.laborCost || 0),
          partsCost: Number(j.partsCost || 0),
          discountAmount: Number(j.discountAmount || 0),
          totalAmount: Number(j.totalAmount || j.totalCost || 0),
          paidAmount: Number(j.paidAmount || j.advancePayment || 0),
          balanceAmount: Number(j.balanceAmount || 0),

          // Dates
          receivedDate: j.receivedDate || j.createdAt || '',
          expectedCompletionDate: j.expectedDate || j.expectedCompletionDate || '',
          completedDate: j.completedDate || '',
          deliveredDate: j.deliveredDate || '',
          createdAt: j.createdAt || '',
          updatedAt: j.updatedAt || '',

          // Warranty
          warrantyPeriod: j.warrantyPeriod || null,
          warrantyExpiry: j.warrantyExpiry || null,
        } as unknown as JobSheet));

        setJobSheets(mapped);

        // Handle pagination if present
        if ((responseData as any).pagination) {
          const pagData = (responseData as any).pagination;
          setPagination({
            page: pagData.page || page,
            limit: pagData.limit || limit,
            total: pagData.total || mapped.length,
            totalPages: pagData.totalPages || 1,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load job sheets:', err);
     
    } finally {
      setLoading(false);
    }
  }, [user?.locationId, pagination.page, pagination.limit, dateFilter, startDate, endDate, debouncedSearch, selectedStatus, selectedPriority, myJobsOnly, getJobSheets]);

  // Check if user has branch access
  useEffect(() => {
    if (!user?.locationId) {
      toast.error('No branch assigned to your account. Please contact administrator.');
      return;
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadJobSheets(1, pagination.limit);
  }, [user?.locationId, dateFilter, startDate, endDate, debouncedSearch, selectedStatus, selectedPriority, myJobsOnly]);

  // Load stats when component mounts and when filters change
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobSheets();
    await loadStats();
    setRefreshing(false);
   
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const handleAddJobSheet = async (data: CreateJobSheetData) => {
    if (!user?.locationId) {
      toast.error('No branch assigned');
      return;
    }

    try {
      await createJobSheet({
        ...data,
        locationId: user.locationId,  // Automatically use user's branch
      });
    
      setShowAddJobSheet(false);
      await loadJobSheets();
    } catch (err) {
      console.error('Failed to create job sheet:', err);
      // toast.error('Failed to create job sheet');
    }
  };

  const handleUpdateJobSheet = async (id: string, data: UpdateJobSheetData) => {
    try {
     const response = await updateJobSheet(id, data);
     
    if(response?.success === true){
      setShowEditJobSheet(false);
      setSelectedJobSheetForEdit(null);
      await loadJobSheets();}
    } catch (err) {
      console.error('Failed to update job sheet:', err);
      // toast.error('Failed to update job sheet');
    }
  };

  const handleViewJobSheet = (jobSheet: JobSheet) => {
    setSelectedJobSheetId(jobSheet.id);
    setShowViewJobSheet(true);
  };

  const handleEditJobSheet = (jobSheet: JobSheet) => {
    setSelectedJobSheetForEdit(jobSheet);
    setShowEditJobSheet(true);
  };

  const handleAddPayment = (jobSheet: JobSheet) => {
    // Transform to match modal interface
    const paymentJobSheet = {
      ...jobSheet,
      customerName: jobSheet.customer?.name || '',
    } as JobSheet & { customerName: string };
    setSelectedJobSheetForPayment(paymentJobSheet);
    setShowPaymentModal(true);
  };

  const handleDownloadPDF = async (jobSheet: JobSheet) => {
    try {
      await downloadJobsheetCard(jobSheet.id, { includeTerms: true, includeConditions: true });
      toast.success('Jobsheet card download started');
    } catch (error) {
      toast.error('Failed to download jobsheet card');
      console.error('Download error:', error);
    }
  };

  const handlePrintCard = async (jobSheet: JobSheet) => {
    try {
      await printJobSheet(jobSheet.id, { copies: 1, includeTerms: true, includeConditions: true });
      toast.success('Jobsheet card opened for printing');
    } catch (error) {
      toast.error('Failed to print jobsheet card');
      console.error('Print error:', error);
    }
  };

  const handlePaymentSubmit = async (data: CreatePaymentData) => {
    if (!selectedJobSheetForPayment) return;

    try {
      await createPayment(data);
      // toast.success('Payment added successfully');
      setShowPaymentModal(false);
      setSelectedJobSheetForPayment(null);
      await loadJobSheets();
    } catch (err) {
      console.error('Failed to add payment:', err);
      // toast.error('Failed to add payment');
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedPriority('');
    setDateFilter('today');
    setStartDate('');
    setEndDate('');
    setMyJobsOnly(false);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading job sheets...</p>
        </div>
      </div>
    );
  }

  if (!user?.locationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Branch Assigned</h2>
          <p className="text-gray-600">Please contact your administrator to assign you to a branch.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Job Sheets</h1>
            <p className="text-gray-600 mt-1">
              Branch: {user.branch?.name || user.locationId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowAddJobSheet(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4" />
              New Job Sheet
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <JobSheetStatsCards stats={stats} />

        {/* Filters */}
        <Card className="p-6 mb-6">
          <JobSheetFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedPriority={selectedPriority}
            onPriorityChange={setSelectedPriority}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            onReset={handleClearFilters}
            showMyJobsToggle
            myJobsOnly={myJobsOnly}
            onMyJobsChange={setMyJobsOnly}
          />
        </Card>

        {/* Job Sheets Table */}
        <Card>
          <JobSheetTable
            jobSheets={jobSheets}
            onView={handleViewJobSheet}
            onEdit={handleEditJobSheet}
            onPayment={handleAddPayment}
            onDownloadPDF={handleDownloadPDF}
            onPrintCard={handlePrintCard}
            pagination={pagination}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </Card>

        {/* Results count */}
        {jobSheets.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            Showing {jobSheets.length} of {pagination.total} job sheets
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddJobSheet && (
        <AddJobSheetModal
          isOpen={showAddJobSheet}
          onClose={() => setShowAddJobSheet(false)}
          onSubmit={handleAddJobSheet}
          lockLocation
          defaultLocationId={user.locationId}
        />
      )}

      {showViewJobSheet && selectedJobSheetId && (
        <ViewJobSheetModal
          isOpen={showViewJobSheet}
          onClose={() => {
            setShowViewJobSheet(false);
            setSelectedJobSheetId(null);
          }}
          jobSheetId={selectedJobSheetId}
        />
      )}

      {showEditJobSheet && selectedJobSheetForEdit && (
        <EditJobSheetModal
          isOpen={showEditJobSheet}
          onClose={() => {
            setShowEditJobSheet(false);
            setSelectedJobSheetForEdit(null);
          }}
          jobSheet={selectedJobSheetForEdit as unknown as import('../../types/jobsheet.types').JobSheet}
          onSubmit={handleUpdateJobSheet}
        />
      )}

      {showPaymentModal && selectedJobSheetForPayment && (
        <AddPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedJobSheetForPayment(null);
          }}
          jobSheet={selectedJobSheetForPayment}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  );
}
