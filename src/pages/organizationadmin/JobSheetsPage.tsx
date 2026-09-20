/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { JobSheet, JobSheetStatus, JobPriority } from '../../types/jobsheet.types';
import JobSheetStatsCards from '../../components/superadmin/jobsheets/JobSheetStatsCards';
import JobSheetTable from '../../components/superadmin/jobsheets/JobSheetTable';
import JobSheetFilters from '../../components/superadmin/jobsheets/JobSheetFilters';
import type { DateFilter } from '../../components/superadmin/jobsheets/JobSheetFilters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { RefreshCw, Plus, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';
import DataRawModal from '../../components/common/DataRawModal';
import useJobSheet from '../../hooks/useJobSheet';
import AddJobSheetModal from '../../components/superadmin/jobsheets/AddJobSheetModal';
import ViewJobSheetModal from '../../components/superadmin/jobsheets/ViewJobSheetModal';
import AddPaymentModal from '../../components/superadmin/jobsheets/AddPaymentModal';
import EditJobSheetModal from '../../components/superadmin/jobsheets/EditJobSheetModal';
import { formatCurrency } from '../../utils/currency';

export default function JobSheetsPage() {
  const { user } = useAuth();
  const { getJobSheets: fetchJobSheets, createJobSheet, updateJobSheet, createPayment, downloadJobsheetCard,
    printJobSheet, getJobSheetStats: fetchStats } = useJobSheet();
  const [searchParams, setSearchParams] = useSearchParams();
  
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
    monthlyRevenue: 0,
    totalAdvancePayments: 0,
    monthlyAdvancePayments: 0,
    totalDueBalance: 0,
    monthlyDueBalance: 0,
    averageCompletionTime: 0,
    totalBalance: 0,
    averageJobValue: 0,

    topShops: [] as any[],

    deviceBreakdown: [] as any[],
    priorityBreakdown: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    },

    dailyJobSheets: [] as any[],

    topTechnicians: [] as any[],
  });
  const [summary, setSummary] = useState({
    todayJobs: 0,
    yesterdayJobs: 0,
    weekJobs: 0,
    monthJobs: 0,
    pendingJobs: 0,
    overdueJobs: 0,
    completionRate: 0,
    avgCompletionTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [rawData, setRawData] = useState<unknown | null>(null);

  // Modal states
  const [showAddJobSheet, setShowAddJobSheet] = useState(false);
  const [showViewJobSheet, setShowViewJobSheet] = useState(false);
  const [showEditJobSheet, setShowEditJobSheet] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedJobSheetId, setSelectedJobSheetId] = useState<string | null>(null);
  const [selectedJobSheetForEdit, setSelectedJobSheetForEdit] = useState<JobSheet | null>(null);
   
  const [selectedJobSheetForPayment, setSelectedJobSheetForPayment] = useState<any | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  // Debounced copy of searchQuery   API calls react to THIS, so typing doesn't
  // fire a request (plus a stats request) on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState<JobSheetStatus | ''>(searchParams.get('status') as JobSheetStatus || '');
  const [selectedPriority, setSelectedPriority] = useState<JobPriority | ''>(searchParams.get('priority') as JobPriority || '');
  const [dateFilter, setDateFilter] = useState<DateFilter>(searchParams.get('dateFilter') as DateFilter || 'today');
  const [startDate, setStartDate] = useState(searchParams.get('fromDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('toDate') || '');
  const [myJobsOnly, setMyJobsOnly] = useState(searchParams.get('myJobs') === 'true');

  // Pagination states - initialize from URL params
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get('limit') || '10'));
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadJobSheets =  useCallback(async (page?: number, limit?: number) => {
    const actualPage = page ?? currentPage;
    const actualLimit = limit ?? itemsPerPage;
    
    try {
      // Try API first, fallback to mock data
      const queryParams: any = { 
        page: actualPage, 
        limit: actualLimit,
      };

      // Add search filter if present (debounced   server-side search)
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

      const response = await fetchJobSheets(queryParams);
      if (response?.data) {
        // API returns an object like { jobSheets: [...], pagination: { ... } }
        // Map API job objects to the UI shape expected by JobSheetTable
         
        const payload: any = response.data;
        const apiList = Array.isArray(payload.jobSheets) ? payload.jobSheets : Array.isArray(payload) ? payload : [];

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

          // Flattened customer fields for compatibility
          customerName: j.customer?.name || '',
          customerPhone: j.customer?.phone || '',
          customerEmail: j.customer?.email || '',

          // Device nested object
          device: j.device ? {
            id: j.device.id,
            deviceType: j.device.device_type,
            brand: j.device.brand,
            model: j.device.model,
            serialNumber: j.device.serial_number,
            imei: j.device.imei,
          } : null,

          // Flattened device fields for compatibility
          deviceType: j.device?.device_type || '',
          deviceBrand: j.device?.brand || '',
          deviceModel: j.device?.model || '',
          serialNumber: j.device?.serial_number || '',
          imeiNumber: j.device?.imei || '',

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

          // Costs (normalize to numbers)
          diagnosisFee: Number(j.labourCost || 0),
          laborCost: Number(j.labourCost || 0),
          partsCost: Number(j.partsCost || 0),
          totalCost: Number(j.totalAmount || j.totalCost || 0),
          advancePayment: Number(j.paidAmount || j.advancePayment || 0),
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

        const pagination = (response as any).pagination;
        if (pagination) {
          setTotalItems(pagination.total || 0);
          setTotalPages(pagination.totalPages || 0);
        } else {
          // Fallback if pagination info not in response
          setTotalItems(mapped.length);
          setTotalPages(Math.ceil(mapped.length / actualLimit));
        }

        setJobSheets(mapped as JobSheet[]);
      }
    } catch (error) {
      console.error('Failed to load job sheets from API, using mock data:', error);
      // Use mock data as fallback
    
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, totalPages, dateFilter, startDate, endDate, debouncedSearch, selectedStatus, selectedPriority, myJobsOnly, fetchJobSheets]);

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
    params.set('page', currentPage.toString());
    params.set('limit', itemsPerPage.toString());
    
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedStatus, selectedPriority, dateFilter, startDate, endDate, myJobsOnly, currentPage, itemsPerPage, setSearchParams]);

  // Update URL when filter states change
  useEffect(() => {
    updateURLParams();
  }, [updateURLParams]);

  // Fetch initial data (list + stats are loaded by the effects below, which
  // also run on mount   calling them here too would double-load everything)
  useEffect(() => {
    loadSummary();
  }, []);

  // Debounce the search input (350ms) so we don't hit the API per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reload the LIST when filters change (search is debounced).
  // Skipped on mount   the pagination effect below does the initial load and
  // honours the page number restored from the URL.
  const filtersMountedRef = useRef(false);
  useEffect(() => {
    if (!filtersMountedRef.current) {
      filtersMountedRef.current = true;
      return;
    }
    // Reset to first page; if we're already on page 1 the pagination effect
    // won't re-fire, so load explicitly. (Avoids double API calls either way.)
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadJobSheets(1, itemsPerPage);
    }
  }, [debouncedSearch, selectedStatus, selectedPriority, dateFilter, startDate, endDate, myJobsOnly]);

  // Reload STATS only when the date scope changes   stats ignore text search,
  // so reloading them per keystroke was pure waste (2 aggregate calls per key).
  useEffect(() => {
    loadStats();
  }, [dateFilter, startDate, endDate]);

  // Reload data when pagination changes
  useEffect(() => {
    loadJobSheets();
  }, [currentPage, itemsPerPage]);

  const loadStats = useCallback(async () => {
    try {
      // Try API first, fallback to mock data
      const statsParams: any = {};

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

      const response = await fetchStats(statsParams);
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
          monthlyRevenue: summary.monthlyRevenue || 0,
          totalAdvancePayments: summary.totalAdvancePayments || 0,
          monthlyAdvancePayments: summary.monthlyAdvancePayments || 0,
          totalDueBalance: summary.totalDueBalance || 0,
          monthlyDueBalance: summary.monthlyDueBalance || 0,
          averageCompletionTime: summary.averageCompletionTime || 0,
          averageJobValue: summary.totalJobSheets > 0 ? summary.totalRevenue / summary.totalJobSheets : 0,
          totalBalance: summary.totalDueBalance || 0,

          // Status distribution
          pending: statLKRist.find((s: any) => s.status === 'PENDING')?.count || 0,
          inProgress: statLKRist.find((s: any) => s.status === 'IN_PROGRESS')?.count || 0,
          completed: statLKRist.find((s: any) => s.status === 'COMPLETED')?.count || 0,
          cancelled: statLKRist.find((s: any) => s.status === 'CANCELLED')?.count || 0,
          waitingForParts: statLKRist.find((s: any) => s.status === 'WAITING_PARTS')?.count || 0,
          readyForPickup: statLKRist.find((s: any) => s.status === 'READY_DELIVERY')?.count || 0,
          onHold: statLKRist.find((s: any) => s.status === 'ON_HOLD')?.count || 0,

          // Priority distribution
          priorityBreakdown: {
            low: priorityDist.find((p: any) => p.priority === 'LOW')?.count || 0,
            medium: priorityDist.find((p: any) => p.priority === 'MEDIUM')?.count || 0,
            high: priorityDist.find((p: any) => p.priority === 'HIGH')?.count || 0,
            urgent: priorityDist.find((p: any) => p.priority === 'URGENT')?.count || 0,
          },

          // Additional breakdowns
          topShops: apiData.topShops || [],
          deviceBreakdown: apiData.deviceBreakdown || [],
          dailyJobSheets: apiData.monthlyTrends || [], // Using monthlyTrends as dailyJobSheets
          topTechnicians: apiData.topTechnicians || [],
        }));
      }
    } catch (error) {
      console.error('Failed to load stats from API, using mock data:', error);
    }
  }, [fetchStats, dateFilter, startDate, endDate]);

  const loadSummary = async () => {
    // Calculate summary from jobSheets data
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const todayJobs = jobSheets.filter(js => js.createdAt?.startsWith(today)).length;
    const yesterdayJobs = jobSheets.filter(js => js.createdAt?.startsWith(yesterday)).length;
    const pendingJobs = jobSheets.filter(js => js.status === 'pending').length;
    const overdueJobs = jobSheets.filter(js => {
      if (!js.expectedCompletionDate) return false;
      return new Date(js.expectedCompletionDate) < new Date() && js.status !== 'completed';
    }).length;
    const completedJobs = jobSheets.filter(js => js.status === 'completed').length;
    const totalJobs = jobSheets.length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    
    setSummary({
      todayJobs,
      yesterdayJobs,
      weekJobs: jobSheets.filter(js => {
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        return new Date(js.createdAt || '') > weekAgo;
      }).length,
      monthJobs: jobSheets.filter(js => {
        const monthAgo = new Date(Date.now() - 30 * 86400000);
        return new Date(js.createdAt || '') > monthAgo;
      }).length,
      pendingJobs,
      overdueJobs,
      completionRate,
      avgCompletionTime: 0, // TODO: calculate average completion time
    });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
    loadJobSheets(1, value); // Immediately load with new pagination
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadJobSheets(page, itemsPerPage); // Immediately load with new page
  };


  // NOTE: search/status/priority/date filtering is done SERVER-SIDE in
  // loadJobSheets. The old client-side applyFilters() was dead code (never
  // called, referenced an undefined setter) and re-filtering the current page
  // would hide rows the server matched on fields the client doesn't check.

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadJobSheets(), loadStats() ]);
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedPriority('');
    setDateFilter('today');
    setStartDate('');
    setEndDate('');
    setMyJobsOnly(false);
  };

  const handleView = (jobSheet: JobSheet) => {
    setSelectedJobSheetId(jobSheet.id.toString());
    setShowViewJobSheet(true);
  };

  const handleEdit = (jobSheet: JobSheet) => {
    setSelectedJobSheetForEdit(jobSheet);
    setShowEditJobSheet(true);
  };

  const handleCancel = async (jobSheet: JobSheet) => {
    console.log(jobSheet);
  };

   
  const handleAddJobSheet = async (data: any) => {
    try {
     const res= await createJobSheet(data);
     
     if(res?.success===true){
      setShowAddJobSheet(false)
      await loadJobSheets();
      await loadStats();
       
    }
    } catch (error) {
      console.error('Failed to create job sheet:', error);
      throw error;
    }
  };

   
  const handleUpdateJobSheet = async (id: string, data: any) => {
    try {
      await updateJobSheet(id, data);
      await loadJobSheets();
      await loadStats();
      setShowEditJobSheet(false);
      setSelectedJobSheetForEdit(null);
    } catch (error) {
      console.error('Failed to update job sheet:', error);
      throw error;
    }
  };

   
  const handleAddPayment = (jobSheet: any) => {
    setSelectedJobSheetForPayment({
      id: jobSheet.id.toString(),
      jobNumber: jobSheet.jobNumber,
      customerId: jobSheet.customerId?.toString() || '',
      customerName: jobSheet.customerName,
      totalAmount: jobSheet.totalCost,
      paidAmount: jobSheet.advancePayment,
      balanceAmount: jobSheet.balanceAmount,
    });
    setShowPaymentModal(true);
  };

  const handleDownloadPDF = async (jobSheet: JobSheet) => {
      try {
        await downloadJobsheetCard(jobSheet.id.toString(), { includeTerms: true, includeConditions: true });
        toast.success('Jobsheet card download started');
      } catch (error) {
        toast.error('Failed to download jobsheet card');
        console.error('Download error:', error);
      }
    };
  
    const handlePrintCard = async (jobSheet: JobSheet) => {
      try {
        await printJobSheet(jobSheet.id.toString(), { copies: 1, includeTerms: true, includeConditions: true });
        toast.success('Jobsheet card opened for printing');
      } catch (error) {
        toast.error('Failed to print jobsheet card');
        console.error('Print error:', error);
      }
    };

   
  const handlePaymentSubmit = async (data: any) => {
    try {
     const res= await createPayment(data);
      if(res?.success===true){
      await loadJobSheets();
      setShowPaymentModal(false);
      setSelectedJobSheetForPayment(null);}
    } catch (error) {
      console.error('Failed to record payment:', error);
      throw error;
    }
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
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Job Sheets Monitor</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Track and manage repair job sheets across all branches
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => setShowAddJobSheet(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Job Sheet
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

    

      {/* Stats Cards */}
      <JobSheetStatsCards stats={stats} />

   

      {/* Filters */}
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
        onReset={handleResetFilters}
        showMyJobsToggle={!!user?.id}
        myJobsOnly={myJobsOnly}
        onMyJobsChange={setMyJobsOnly}
      />

      {/* Job Sheets Table */}
      <Card>
        <div className="px-6 py-4 border-b border-white/20 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">All Job Sheets</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const jobsWithBalance = jobSheets.filter(j => j.balanceAmount > 0);
                console.log('Jobs with pending balance:', jobsWithBalance);
                toast.success(`${jobsWithBalance.length} jobs with pending balance`);
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-orange-100/60 backdrop-blur-sm text-orange-700 rounded-lg hover:bg-orange-200/60 cursor-pointer border border-orange-200/40"
            >
              Pending: {jobSheets.filter(j => j.status==="pending").length}
            </button>
          </div>
        </div>
        <JobSheetTable
          jobSheets={jobSheets}
          onView={handleView}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onPayment={handleAddPayment}
          onDownloadPDF={handleDownloadPDF}
          onPrintCard={handlePrintCard}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
         
        />
      </Card>

      {/* Modals */}
      <AddJobSheetModal
        isOpen={showAddJobSheet}
        onClose={() => setShowAddJobSheet(false)}
        onSubmit={handleAddJobSheet}
      />

      {selectedJobSheetId && (
        <ViewJobSheetModal
          isOpen={showViewJobSheet}
          onClose={() => {
            setShowViewJobSheet(false);
            setSelectedJobSheetId(null);
          }}
          jobSheetId={selectedJobSheetId}
        />
      )}

      {selectedJobSheetForEdit && (
        <EditJobSheetModal
          isOpen={showEditJobSheet}
          onClose={() => {
            setShowEditJobSheet(false);
            setSelectedJobSheetForEdit(null);
          }}
          onSubmit={handleUpdateJobSheet}
          jobSheet={selectedJobSheetForEdit}
        />
      )}

      {selectedJobSheetForPayment && (
        <AddPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedJobSheetForPayment(null);
          }}
          onSubmit={handlePaymentSubmit}
          jobSheet={selectedJobSheetForPayment}
        />
      )}

      <DataRawModal
        isOpen={isRawModalOpen}
        onClose={() => {
          setIsRawModalOpen(false);
          setRawData(null);
        }}
        data={rawData}
        title="Job Sheet Raw Data"
      />

      {/* Results count */}
      {jobSheets.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {jobSheets.length} of {totalItems} job sheets
          <span className="ml-2 text-gray-500">
            | Total Balance: {formatCurrency(jobSheets.reduce((sum, job) => sum + job.balanceAmount, 0))}
          </span>
        </div>
      )}
    </div>
  );
}
