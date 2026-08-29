/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Package,
  Search,
  Plus,
  Grid,
  List,
  Clock,
  Truck,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Printer,
  Download,
  Calendar,
  DollarSign,
  User,
  Phone,
  Edit,
  Bell,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  Trash2,
  Pencil,
  ScanLine,
  RefreshCw,
} from 'lucide-react';
import useCourier, {
  type CourierShipment,
  CourierShipmentStatus,
  DeliveryMethod,
  type CourierService,
  ALL_COURIER_SHIPMENT_STATUSES,
  getBulkStatusOptions,
  isStaffCourierPermissionsLimited,
  FARDAR_BULK_SYNC_MAX,
  canBulkSyncFromFardar,
} from '../../hooks/useCourier';
import useFetch from '../../hooks/useFetch';
import { useAppSelector } from '../../store/hooks';
import { useLocation } from '../../hooks/useLocation';
import { todayColombo } from '@/utils/dateUtils';
// import { useBusinessProfile, useProduct } from '../../hooks';
// import useCustomer, { type Customer as CustomerType } from '../../hooks/useCustomer';
import toast from 'react-hot-toast';
import { printPdfBlob, ensurePdfBlob } from '@/utils/printPdf';
import { CourierShipmentModal, TrackingModal, LabelDownloadModal, BulkLabelModal, StatusUpdateModal, ScanBulkStatusModal } from '../../components/courier/modals';
import PendingApprovalShipments from '../../components/courier/PendingApprovalShipments';
import { formatCurrency } from '@/utils/currency';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '@/components/ui/button';
import { useCourierModalVariant } from '@/hooks/useCourierModalVariant';
import {
  formatCourierImportErrorToast,
  normalizeCourierImportRowErrors,
  type CourierImportRowError,
} from '@/utils/courierImportErrors';
import BulkImportCustomerReview, {
  type BulkImportPreviewResult,
  buildImportExclusionPayload,
} from '../../components/courier/BulkImportCustomerReview';

type DatePeriod = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const getColomboDateString = () => todayColombo();

const formatColomboDateTime = (value?: string | Date | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Stable identity — must not be recreated each render. */
const ORG_SHIPMENT_SCOPE = { scope: 'org' as const };

const ShipmentTrackingPage = () => {
  const { fetchData } = useFetch('');
  const { getAllLocations } = useLocation();
  const courierVariant = useCourierModalVariant();
  const { user } = useAppSelector((state) => state.auth);
  const showBranchFilter = true;

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<CourierShipment | null>(null);
  const [editingShipment, setEditingShipment] = useState<CourierShipment | null>(null);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentNumberFrom, setShipmentNumberFrom] = useState('');
  const [shipmentNumberTo, setShipmentNumberTo] = useState('');
  const [trackingSearch, setTrackingSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('today');
  const [customStartDate, setCustomStartDate] = useState(getColomboDateString);
  const [customEndDate, setCustomEndDate] = useState(getColomboDateString);
  const [filterCreatedFrom, setFilterCreatedFrom] = useState('');
  const [filterCreatedTo, setFilterCreatedTo] = useState('');
  const [filterUpdatedFrom, setFilterUpdatedFrom] = useState('');
  const [filterUpdatedTo, setFilterUpdatedTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  // Draft text/date inputs only take effect when the user clicks "Search".
  // Quick filters (status, branch, date presets, tracking toggle) still apply instantly.
  const [appliedSearch, setAppliedSearch] = useState(() => ({
    shipmentSearch: '',
    shipmentNumberFrom: '',
    shipmentNumberTo: '',
    trackingSearch: '',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
    customStartDate: getColomboDateString(),
    customEndDate: getColomboDateString(),
  }));
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkNumberModal, setShowBulkNumberModal] = useState(false);
  const [showBulkLabelModal, setShowBulkLabelModal] = useState(false);
  const [showScanBulkModal, setShowScanBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<CourierShipmentStatus | ''>('');
  const [bulkShipmentNumbers, setBulkShipmentNumbers] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [itemsModal, setItemsModal] = useState<{ label: string; loading: boolean; items: any[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CourierShipment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'shipments' | 'pending-approval'>('shipments');
  const [trackingFilter, setTrackingFilter] = useState<'all' | 'with' | 'without'>('all');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  const {
    courierShipments,
    courierServices,
    loading,
    shipmentsTotal,
    shipmentsTotalPages,
    fetchCourierShipments,
    fetchCourierServices,
    createCourierShipment,
    updateCourierShipment,
    updateShipmentStatus,
    bulkUpdateShipmentStatus,
    bulkSyncFromFardar,
    bulkSyncSaleLocationFromPickup,
    bulkUpdateShipmentNumbers,
    getShipmentTracking,
    courierSettings,
    fetchCourierSettings,
  } = useCourier();

  const staffPermissionsLimited = isStaffCourierPermissionsLimited(courierSettings, user?.role?.name);
  const bulkStatusOptions = useMemo(
    () => getBulkStatusOptions(courierSettings, user?.role?.name),
    [courierSettings, user?.role?.name],
  );

  const buildShipmentFilters = useCallback(() => {
    const filters: Record<string, any> = { page: currentPage, limit: pageSize };
    if (statusFilter) filters.status = statusFilter;

    const hasCreated = !!(appliedSearch.createdFrom || appliedSearch.createdTo);
    const hasUpdated = !!(appliedSearch.updatedFrom || appliedSearch.updatedTo);

    if (hasCreated) {
      // Explicit created-date range wins over any preset/period.
      if (appliedSearch.createdFrom) filters.createdAtFrom = appliedSearch.createdFrom;
      if (appliedSearch.createdTo) filters.createdAtTo = appliedSearch.createdTo;
    } else if (hasUpdated) {
      // Updated-only filter: do NOT apply any created/period constraint,
      // otherwise the default preset silently limits results to the wrong range.
    } else if (datePeriod === 'custom') {
      filters.period = 'custom';
      if (appliedSearch.customStartDate) filters.startDate = appliedSearch.customStartDate;
      if (appliedSearch.customEndDate) filters.endDate = appliedSearch.customEndDate;
    } else if (datePeriod !== 'all') {
      filters.period = datePeriod;
    }
    // datePeriod === 'all' → no period/date constraint: every shipment (paginated)

    if (hasUpdated) {
      if (appliedSearch.updatedFrom) filters.updatedAtFrom = appliedSearch.updatedFrom;
      if (appliedSearch.updatedTo) filters.updatedAtTo = appliedSearch.updatedTo;
    }

    if (appliedSearch.shipmentNumberFrom) filters.shipmentNumberFrom = appliedSearch.shipmentNumberFrom;
    if (appliedSearch.shipmentNumberTo) filters.shipmentNumberTo = appliedSearch.shipmentNumberTo;
    if (!appliedSearch.shipmentNumberFrom && !appliedSearch.shipmentNumberTo && appliedSearch.shipmentSearch) {
      filters.search = appliedSearch.shipmentSearch;
    }
    if (appliedSearch.trackingSearch) filters.trackingNumber = appliedSearch.trackingSearch;
    else if (trackingFilter === 'with') filters.hasTracking = 'true';
    else if (trackingFilter === 'without') filters.hasTracking = 'false';
    if (timeFrom) filters.startTime = timeFrom;
    if (timeTo) filters.endTime = timeTo;
    if (branchFilter) filters.locationId = branchFilter;
    return filters;
  }, [currentPage, pageSize, statusFilter, datePeriod, appliedSearch, trackingFilter, timeFrom, timeTo, branchFilter]);

  const isSingleDayPeriod =
    !appliedSearch.createdFrom && !appliedSearch.createdTo && (
      datePeriod === 'today' ||
      datePeriod === 'yesterday' ||
      (datePeriod === 'custom' && appliedSearch.customStartDate && appliedSearch.customEndDate && appliedSearch.customStartDate === appliedSearch.customEndDate)
    );

  // Commit the current draft text/date inputs and run the search.
  const handleSearch = () => {
    setAppliedSearch({
      shipmentSearch,
      shipmentNumberFrom,
      shipmentNumberTo,
      trackingSearch,
      createdFrom: filterCreatedFrom,
      createdTo: filterCreatedTo,
      updatedFrom: filterUpdatedFrom,
      updatedTo: filterUpdatedTo,
      customStartDate,
      customEndDate,
    });
    setCurrentPage(1);
  };

  // "All Shipments": clear EVERY filter (search boxes, ranges, status, branch,
  // tracking, dates, times) and list all shipments with pagination only.
  const handleShowAllShipments = () => {
    // Draft inputs
    setShipmentSearch('');
    setShipmentNumberFrom('');
    setShipmentNumberTo('');
    setTrackingSearch('');
    setFilterCreatedFrom('');
    setFilterCreatedTo('');
    setFilterUpdatedFrom('');
    setFilterUpdatedTo('');
    // Instant filters
    setStatusFilter('');
    setBranchFilter('');
    setTrackingFilter('all');
    setTimeFrom('');
    setTimeTo('');
    setDatePeriod('all');
    // Applied (committed) search
    setAppliedSearch({
      shipmentSearch: '',
      shipmentNumberFrom: '',
      shipmentNumberTo: '',
      trackingSearch: '',
      createdFrom: '',
      createdTo: '',
      updatedFrom: '',
      updatedTo: '',
      customStartDate: getColomboDateString(),
      customEndDate: getColomboDateString(),
    });
    setCurrentPage(1);
  };

  // Selecting a Created/Updated date should switch the preset to "Pick Date"
  // so the default period (Today) no longer constrains the query.
  const handleDateRangeChange = (setter: (val: string) => void) => (val: string) => {
    setter(val);
    setDatePeriod('custom');
  };

  // Are there draft filter edits that haven't been applied via Search yet?
  const hasUnappliedSearch =
    shipmentSearch !== appliedSearch.shipmentSearch ||
    shipmentNumberFrom !== appliedSearch.shipmentNumberFrom ||
    shipmentNumberTo !== appliedSearch.shipmentNumberTo ||
    trackingSearch !== appliedSearch.trackingSearch ||
    filterCreatedFrom !== appliedSearch.createdFrom ||
    filterCreatedTo !== appliedSearch.createdTo ||
    filterUpdatedFrom !== appliedSearch.updatedFrom ||
    filterUpdatedTo !== appliedSearch.updatedTo ||
    (datePeriod === 'custom' && (customStartDate !== appliedSearch.customStartDate || customEndDate !== appliedSearch.customEndDate));

  // Reset to page 1 when a live (instantly-applied) filter changes.
  // Draft text/date inputs reset the page inside handleSearch instead.
  const handleBranchFilterChange = (locationId: string) => {
    setCurrentPage(1);
    setBranchFilter(locationId);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, datePeriod, appliedSearch, timeFrom, timeTo, trackingFilter, pageSize]);

  useEffect(() => {
    if (!showBranchFilter) return;
    getAllLocations().then((res: any) => {
      const list: any[] =
        res?.data?.locations ??
        res?.data?.branches ??
        (Array.isArray(res?.data) ? res.data : []);
      setBranches(
        list
          .filter((l) => l.locationType !== 'WAREHOUSE')
          .map((l) => ({
            id: l.id,
            name: l.name || l.locationCode || 'Unnamed',
          })),
      );
    });
  }, [showBranchFilter]);

  // Fetch from API when a live filter, the applied search, or the page changes.
  // Draft text/date edits are held until the user clicks "Search".
  useEffect(() => {
    fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE);
  }, [statusFilter, datePeriod, appliedSearch, timeFrom, timeTo, trackingFilter, currentPage, pageSize, branchFilter, buildShipmentFilters]);

  useEffect(() => {
    fetchCourierServices();
    if (user?.businessId) {
      fetchCourierSettings(user.businessId);
    }
  }, [user?.businessId]);

  const handleViewItems = async (shipment: CourierShipment) => {
    if (!shipment.saleId) return;
    const label = shipment.shipmentNumber || shipment.id;
    setItemsModal({ label, loading: true, items: [] });
    try {
      const res = await fetchData({ endpoint: `/sales/${shipment.saleId}`, method: 'GET' });
      if (res?.success && res?.data) {
        const items = (res.data as any).saleItems || (res.data as any).items || [];
        setItemsModal({ label, loading: false, items });
      } else {
        toast.error('Failed to load sale items');
        setItemsModal(null);
      }
    } catch {
      toast.error('Failed to load sale items');
      setItemsModal(null);
    }
  };

  const handleCreateShipment = () => {
    setShowShipmentModal(true);
  };

  const handleDeleteShipment = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetchData({
        endpoint: `/courier/shipments/${deleteConfirm.id}`,
        method: 'DELETE'
      });
      if (res?.success || res === null || res === undefined) {
        toast.success('Shipment deleted successfully');
        setDeleteConfirm(null);
        fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE);
      } else {
        toast.error(res?.message || 'Failed to delete shipment');
      }
    } catch {
      toast.error('Failed to delete shipment');
    } finally {
      setDeleting(false);
    }
  };

  const handleViewTracking = (shipment: CourierShipment) => {
    setSelectedShipment(shipment);
    setShowTrackingModal(true);
  };

  const handleDownloadLabel = (shipment: CourierShipment) => {
    setSelectedShipment(shipment);
    setShowLabelModal(true);
  };

  const handleUpdateStatus = (shipment: CourierShipment) => {
    setSelectedShipment(shipment);
    setShowStatusModal(true);
  };

  const handlePrintLabel = async (
    shipment: CourierShipment,
    size: 'xsm' | 'sm' | 'md' = 'md',
    format: 'standard' | 'fragile' | 'normal_post' = 'standard'
  ) => {
    try {
      const labelIdentifier = encodeURIComponent(shipment.shipmentNumber || shipment.id);
      const response = await fetchData({
        endpoint: `/courier/shipments/${labelIdentifier}/label/print?size=${size}&format=${format}`,
        method: 'GET',
        responseType: 'blob',
        silent: true,
        showToastOnError: false,
      });

      if (response instanceof Blob) {
        const blob = await ensurePdfBlob(response);
        try {
          printPdfBlob(blob, format === 'fragile' ? { pageSize: 'A5-landscape' } : undefined);
        } catch (err) {
          toast.error(err instanceof Error && err.message.includes('popup')
            ? 'Please allow popups to print labels'
            : (err instanceof Error ? err.message : 'Failed to print label'));
        }
      } else {
        toast.error((response as { message?: string })?.message || 'Failed to print label');
      }
    } catch (error) {
      console.error('Error printing label:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to print label');
    }
  };

  const getStatusBadge = (status: CourierShipmentStatus) => {
    const badges: Partial<Record<CourierShipmentStatus, { color: string; icon: any; text: string }>> = {
      [CourierShipmentStatus.PENDING_APPROVAL]: { color: 'bg-amber-100 text-amber-800 border border-amber-400', icon: AlertCircle, text: 'Pending Approval' },
      [CourierShipmentStatus.PROCESSING]: { color: 'bg-slate-100 text-slate-800', icon: Clock, text: 'Processing' },
      [CourierShipmentStatus.PACKAGING]: { color: 'bg-slate-100 text-slate-800', icon: Package, text: 'Packaging' },
      [CourierShipmentStatus.WAITING_COURIER_PICKUP]: { color: 'bg-amber-100 text-amber-800', icon: Clock, text: 'Waiting Pickup' },
      [CourierShipmentStatus.RELEASED_TO_COURIER]: { color: 'bg-cyan-100 text-cyan-800', icon: Truck, text: 'Released to Courier' },
      [CourierShipmentStatus.RESCHEDULED]: { color: 'bg-amber-100 text-amber-800', icon: Clock, text: 'Rescheduled' },
      [CourierShipmentStatus.DATE_CHANGED]: { color: 'bg-amber-100 text-amber-800', icon: Clock, text: 'Date Changed' },
      [CourierShipmentStatus.REARRANGED]: { color: 'bg-amber-100 text-amber-800', icon: Clock, text: 'Rearranged' },
      [CourierShipmentStatus.DAMAGED]: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Damaged' },
      [CourierShipmentStatus.RETURN_PENDING]: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, text: 'Return Pending' },
      [CourierShipmentStatus.RETURN_COMPLETE]: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, text: 'Return Complete' },
      [CourierShipmentStatus.RETURNED_TO_LOCATION]: { color: 'bg-teal-100 text-teal-800', icon: Package, text: 'Returned to Location' },
      [CourierShipmentStatus.PENDING]: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      [CourierShipmentStatus.PENDING_PICKUP]: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending Pickup' },
      [CourierShipmentStatus.PICKED_UP]: { color: 'bg-blue-100 text-blue-800', icon: Package, text: 'Picked Up' },
      [CourierShipmentStatus.IN_TRANSIT]: { color: 'bg-purple-100 text-purple-800', icon: Truck, text: 'In Transit' },
      [CourierShipmentStatus.OUT_FOR_DELIVERY]: { color: 'bg-indigo-100 text-indigo-800', icon: MapPin, text: 'Out for Delivery' },
      [CourierShipmentStatus.DELIVERED]: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Delivered' },
      [CourierShipmentStatus.FAILED_DELIVERY]: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Failed Delivery' },
      [CourierShipmentStatus.DELIVERY_FAILED]: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Delivery Failed' },
      [CourierShipmentStatus.RETURNED_TO_SENDER]: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, text: 'Returned to Sender' },
      [CourierShipmentStatus.RETURNED]: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, text: 'Returned' },
      [CourierShipmentStatus.CANCELLED]: { color: 'bg-gray-100 text-gray-800', icon: XCircle, text: 'Cancelled' },
      [CourierShipmentStatus.ON_HOLD]: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'On Hold' }
    };

    const badge = badges[status] || {
      color: 'bg-gray-100 text-gray-800',
      icon: Package,
      text: String(status || '').replace(/_/g, ' '),
    };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  // Server-side pagination: data already filtered and paginated by API
  const totalPages = Math.max(1, shipmentsTotalPages);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (courierShipments.every(s => prev.has(s.id))) {
        const next = new Set(prev);
        courierShipments.forEach(s => next.delete(s.id));
        return next;
      }
      const next = new Set(prev);
      courierShipments.forEach(s => next.add(s.id));
      return next;
    });
  }, [courierShipments]);

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const updates = Array.from(selectedIds).map(id => ({ id, status: bulkStatus as CourierShipmentStatus }));
      const response = await bulkUpdateShipmentStatus(updates);
      if (response?.success) {
        const { updated, errors } = response.data as { updated: string[]; errors: Array<{ id: string; message: string }> };
        if (errors.length === 0) {
          toast.success(`Updated ${updated.length} shipment${updated.length !== 1 ? 's' : ''}`);
        } else {
          toast.success(`Updated ${updated.length}, failed ${errors.length}`);
        }
        setSelectedIds(new Set());
        setShowBulkStatusModal(false);
        setBulkStatus('');
      } else {
        toast.error(response?.message || 'Bulk update failed');
      }
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkFardarSync = async () => {
    if (!canBulkSyncFromFardar(selectedIds.size)) return;
    setBulkLoading(true);
    try {
      const response = await bulkSyncFromFardar(Array.from(selectedIds));
      if (response?.success) {
        const data = response.data as {
          updated: Array<{ id: string; fardarStatus: string; mappedStatus: string }>;
          skipped: Array<{ id: string; message: string }>;
          trackedOnly?: Array<{ id: string; fardarStatus: string; message: string }>;
          errors: Array<{ id: string; message: string }>;
        };
        const parts = [
          data.updated.length ? `${data.updated.length} updated` : '',
          data.skipped.length ? `${data.skipped.length} skipped` : '',
          data.trackedOnly?.length ? `${data.trackedOnly.length} tracked only` : '',
          data.errors.length ? `${data.errors.length} failed` : '',
        ].filter(Boolean);
        toast.success(`Fardar sync: ${parts.join(', ') || 'done'}`);
        setSelectedIds(new Set());
        fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE);
      } else {
        toast.error(response?.message || 'Fardar sync failed');
      }
    } catch {
      toast.error('Fardar sync failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSaleLocationSync = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const response = await bulkSyncSaleLocationFromPickup(Array.from(selectedIds));
      if (response?.success) {
        const data = response.data as {
          updated: Array<{ id: string; saleId: string }>;
          skipped: Array<{ id: string; reason: string }>;
          errors: Array<{ id: string; message: string }>;
        };
        const parts = [
          data.updated.length ? `${data.updated.length} sale location(s) fixed` : '',
          data.skipped.length ? `${data.skipped.length} skipped` : '',
          data.errors.length ? `${data.errors.length} failed` : '',
        ].filter(Boolean);
        toast.success(parts.join(', ') || 'Location sync done');
        setSelectedIds(new Set());
        fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE);
      } else {
        toast.error(response?.message || 'Failed to sync sale location');
      }
    } catch {
      toast.error('Failed to sync sale location');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDownload = async (
    size: 'xsm' | 'sm' | 'md' = 'md',
    format: 'standard' | 'fragile' | 'normal_post' = 'fragile'
  ) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const response = await fetchData({
        endpoint: `/courier/shipments/bulk-labels/download`,
        method: 'POST',
        data: { shipmentIds: Array.from(selectedIds), size, format },
        responseType: 'blob',
        silent: true,
        showToastOnError: false,
      });
      if (!(response instanceof Blob)) {
        toast.error((response as { message?: string })?.message || 'Failed to download bulk labels');
        return;
      }
      const blob = await ensurePdfBlob(response);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-labels-${selectedIds.size}-${format}-${size}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${selectedIds.size} labels`);
      setShowBulkLabelModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download bulk labels');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPrint = async (
    size: 'xsm' | 'sm' | 'md' = 'md',
    format: 'standard' | 'fragile' | 'normal_post' = 'fragile'
  ) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const response = await fetchData({
        endpoint: `/courier/shipments/bulk-labels/print`,
        method: 'POST',
        data: { shipmentIds: Array.from(selectedIds), size, format },
        responseType: 'blob',
        silent: true,
        showToastOnError: false,
      });
      if (!(response instanceof Blob)) {
        toast.error((response as { message?: string })?.message || 'Failed to print bulk labels');
        return;
      }
      const blob = await ensurePdfBlob(response);
      try {
        printPdfBlob(blob, format === 'fragile' ? { pageSize: 'A5-landscape' } : undefined);
        setShowBulkLabelModal(false);
      } catch (err) {
        toast.error(err instanceof Error && err.message.includes('popup')
          ? 'Please allow popups to print labels'
          : (err instanceof Error ? err.message : 'Failed to print bulk labels'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to print bulk labels');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkNumberUpdate = async () => {
    if (selectedIds.size === 0) return;

    // Validate all selected shipments have a shipment number
    const missingNumbers: string[] = [];
    for (const id of Array.from(selectedIds)) {
      const num = bulkShipmentNumbers[id];
      if (!num || num.trim() === '') {
        missingNumbers.push(id);
      }
    }

    if (missingNumbers.length > 0) {
      toast.error(`Please enter shipment numbers for all selected shipments`);
      return;
    }

    setBulkLoading(true);
    try {
      const updates = Array.from(selectedIds).map(id => ({
        id,
        shipmentNumber: bulkShipmentNumbers[id].trim()
      }));

      const response = await bulkUpdateShipmentNumbers(updates);
      if (response?.success) {
        const { updated, errors } = response.data as {
          updated: Array<{ id: string; shipmentNumber: string }>;
          errors: Array<{ id: string; message: string }>;
        };
        if (errors.length === 0) {
          toast.success(`Updated numbers for ${updated.length} shipment${updated.length !== 1 ? 's' : ''}`);
        } else {
          const errorMessages = errors.map(e => e.message).join(', ');
          toast.error(`Updated ${updated.length}, failed ${errors.length}: ${errorMessages}`);
        }
        setSelectedIds(new Set());
        setBulkShipmentNumbers({});
        setShowBulkNumberModal(false);
      } else {
        toast.error(response?.message || 'Bulk shipment number update failed');
      }
    } catch {
      toast.error('Bulk shipment number update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    total: shipmentsTotal,
    pending: courierShipments.filter(s => s.status === CourierShipmentStatus.PENDING || s.status === CourierShipmentStatus.PENDING_PICKUP || s.status === CourierShipmentStatus.PENDING_APPROVAL).length,
    pendingApproval: courierShipments.filter(s => s.status === CourierShipmentStatus.PENDING_APPROVAL).length,
    inTransit: courierShipments.filter(s => s.status === CourierShipmentStatus.IN_TRANSIT || s.status === CourierShipmentStatus.OUT_FOR_DELIVERY).length,
    delivered: courierShipments.filter(s => s.status === CourierShipmentStatus.DELIVERED).length,
    totalValue: courierShipments.reduce((sum, s) => sum + (s.totalCharge || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Package className="w-8 h-8 text-orange-600" />
          Shipment Tracking & Management
        </h1>
        <p className="text-gray-500 mt-2">Track and manage all your shipments in real-time</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
        <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)] ring-1 ring-inset ring-white/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Shipments</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/15 rounded-xl flex items-center justify-center ring-1 ring-blue-400/30">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)] ring-1 ring-inset ring-white/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-400/15 rounded-xl flex items-center justify-center ring-1 ring-yellow-400/30">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)] ring-1 ring-inset ring-white/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Transit</p>
              <p className="text-2xl font-bold text-purple-600">{stats.inTransit}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/15 rounded-xl flex items-center justify-center ring-1 ring-purple-400/30">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)] ring-1 ring-inset ring-white/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/15 rounded-xl flex items-center justify-center ring-1 ring-green-400/30">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

          <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)] ring-1 ring-inset ring-white/40 p-6">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-sm text-gray-500"> Total Courier Fees </p>
              <p className="text-xl font-bold text-orange-600"> {formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="w-12 h-12 bg-orange-500/15 rounded-xl flex items-center justify-center ring-1 ring-orange-400/30">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/40 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)] ring-1 ring-inset ring-amber-300/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium">Pending Approval</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pendingApproval}</p>
            </div>
            <div className="w-12 h-12 bg-amber-400/20 rounded-xl flex items-center justify-center ring-1 ring-amber-400/40">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('shipments')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'shipments'
              ? 'bg-orange-500 text-white shadow-[0_2px_12px_0_rgba(249,115,22,0.35)]'
              : 'bg-white/40 border border-white/50 text-gray-600 hover:bg-white/60 backdrop-blur-sm'
          }`}
        >
          All Shipments
        </button>
        <button
          onClick={() => setActiveTab('pending-approval')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'pending-approval'
              ? 'bg-amber-500 text-white shadow-[0_2px_12px_0_rgba(245,158,11,0.35)]'
              : 'bg-white/40 border border-white/50 text-gray-600 hover:bg-white/60 backdrop-blur-sm'
          }`}
        >
          Pending Approval
          {stats.pendingApproval > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'pending-approval' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'}`}>
              {stats.pendingApproval}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'pending-approval' ? (
        <PendingApprovalShipments />
      ) : (<>

      {/* Tracking filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { value: 'all' as const, label: 'All' },
          { value: 'with' as const, label: 'With Tracking' },
          { value: 'without' as const, label: 'Without Tracking' },
        ]).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTrackingFilter(value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              trackingFilter === value
                ? 'bg-indigo-600 text-white shadow-[0_2px_10px_0_rgba(79,70,229,0.35)]'
                : 'bg-white/40 border border-white/50 text-gray-600 hover:bg-white/60 backdrop-blur-sm'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)] ring-1 ring-inset ring-white/40 p-6 mb-6">
        <div className="flex flex-col md:flex-col gap-4">
                 {/* Actions */}
          <div className="flex gap-2 items-end flex-wrap justify-end">
       

            <button
              onClick={handleCreateShipment}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-[0_2px_12px_0_rgba(249,115,22,0.35)] font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Shipment
            </button>

            <button
              onClick={() => setShowScanBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-[0_2px_12px_0_rgba(37,99,235,0.35)] font-medium"
            >
              <ScanLine className="w-5 h-5" />
              Scan &amp; Bulk Update
            </button>

            <button
              onClick={() => setShowCsvModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/40 border border-white/50 text-gray-700 rounded-xl hover:bg-white/60 backdrop-blur-sm transition-colors font-medium"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>

            {!staffPermissionsLimited && (
            <button
              onClick={() => setShowExcelModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl hover:bg-orange-100 backdrop-blur-sm transition-colors font-medium shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Import Excel Tracker
            </button>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-4 flex-1 w-full flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search shipment number..."
                value={shipmentSearch}
                onChange={(e) => setShipmentSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-white/40 bg-white/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:text-gray-400"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="From #"
                value={shipmentNumberFrom}
                onChange={(e) => setShipmentNumberFrom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-white/40 bg-white/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-orange-400 w-28 placeholder:text-gray-400"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="To #"
                value={shipmentNumberTo}
                onChange={(e) => setShipmentNumberTo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-white/40 bg-white/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-orange-400 w-28 placeholder:text-gray-400"
              />
            </div>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by tracking #..."
                value={trackingSearch}
                onChange={(e) => setTrackingSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 pr-4 py-2 border border-white/40 bg-white/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent w-56 placeholder:text-gray-400"
              />
              {trackingSearch && (
                <button
                  onClick={() => {
                    setTrackingSearch('');
                    setAppliedSearch((prev) => ({ ...prev, trackingSearch: '' }));
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showBranchFilter && (
              <select
                value={branchFilter}
                onChange={(e) => handleBranchFilterChange(e.target.value)}
                className="px-4 py-2 border border-white/40 bg-white/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-orange-400 min-w-[150px]"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-white/40 bg-white/40 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            >
              <option value="">All Status</option>
              {ALL_COURIER_SHIPMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={handleShowAllShipments}
              title="Clear every filter and show all shipments"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                datePeriod === 'all'
                  ? 'bg-orange-500 text-white shadow-[0_2px_8px_0_rgba(249,115,22,0.35)]'
                  : 'bg-white/40 border border-orange-300/60 text-orange-600 hover:bg-orange-50'
              }`}
            >
              All Shipments
            </button>
            {([
              { value: 'today' as DatePeriod, label: 'Today' },
              { value: 'yesterday' as DatePeriod, label: 'Yesterday' },
              { value: 'week' as DatePeriod, label: 'This Week' },
              { value: 'month' as DatePeriod, label: 'This Month' },
              { value: 'custom' as DatePeriod, label: 'Custom' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setDatePeriod(value);
                  if (value !== 'custom') {
                    // A preset takes over: drop any created/updated date-range
                    // overrides so the preset actually filters the results.
                    setFilterCreatedFrom('');
                    setFilterCreatedTo('');
                    setFilterUpdatedFrom('');
                    setFilterUpdatedTo('');
                    setAppliedSearch((prev) => ({
                      ...prev,
                      createdFrom: '',
                      createdTo: '',
                      updatedFrom: '',
                      updatedTo: '',
                    }));
                  }
                  if (value === 'week' || value === 'month') {
                    setTimeFrom('');
                    setTimeTo('');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  datePeriod === value
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/40 border border-white/50 text-gray-600 hover:bg-white/60'
                }`}
              >
                {label}
              </button>
            ))}
            {datePeriod === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="px-3 py-1.5 border border-white/40 bg-white/40 backdrop-blur-sm rounded-lg text-sm"
                  title="From date"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="px-3 py-1.5 border border-white/40 bg-white/40 backdrop-blur-sm rounded-lg text-sm"
                  title="To date"
                />
              </>
            )}
            {isSingleDayPeriod && (
              <>
                <input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  className="px-3 py-1.5 border border-white/40 bg-white/40 backdrop-blur-sm rounded-lg text-sm"
                  title="From time"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="time"
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  className="px-3 py-1.5 border border-white/40 bg-white/40 backdrop-blur-sm rounded-lg text-sm"
                  title="To time"
                />
                {([
                  { from: '08:00', to: '12:00', label: '8 AM – 12 PM' },
                  { from: '12:00', to: '17:00', label: '12 PM – 5 PM' },
                  { from: '17:00', to: '20:00', label: '5 PM – 8 PM' },
                ] as const).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setTimeFrom(preset.from);
                      setTimeTo(preset.to);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      timeFrom === preset.from && timeTo === preset.to
                        ? 'bg-orange-100 text-orange-800 border border-orange-300'
                        : 'border border-white/40 bg-white/30 text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                {(timeFrom || timeTo) && (
                  <button
                    type="button"
                    onClick={() => { setTimeFrom(''); setTimeTo(''); }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear time
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center mt-2">
            <span className="text-xs text-gray-500 shrink-0">Created</span>
            <input
              type="date"
              value={filterCreatedFrom}
              onChange={(e) => handleDateRangeChange(setFilterCreatedFrom)(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-1.5 border border-white/40 bg-white/40 backdrop-blur-sm rounded-lg text-sm"
              title="Created from"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={filterCreatedTo}
              onChange={(e) => handleDateRangeChange(setFilterCreatedTo)(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-1.5 border border-white/40 bg-white/40 backdrop-blur-sm rounded-lg text-sm"
              title="Created to"
            />
            <span className="text-xs text-gray-500 shrink-0 ml-2">Updated</span>
            <input
              type="date"
              value={filterUpdatedFrom}
              onChange={(e) => handleDateRangeChange(setFilterUpdatedFrom)(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-1.5 border border-white/40 bg-white/40 backdrop-blur-sm rounded-lg text-sm"
              title="Updated from"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={filterUpdatedTo}
              onChange={(e) => handleDateRangeChange(setFilterUpdatedTo)(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-1.5 border border-white/40 bg-white/40 backdrop-blur-sm rounded-lg text-sm"
              title="Updated to"
            />
            {(filterCreatedFrom || filterCreatedTo || filterUpdatedFrom || filterUpdatedTo) && (
              <button
                type="button"
                onClick={() => {
                  setFilterCreatedFrom('');
                  setFilterCreatedTo('');
                  setFilterUpdatedFrom('');
                  setFilterUpdatedTo('');
                  setDatePeriod('today');
                  setAppliedSearch((prev) => ({
                    ...prev,
                    createdFrom: '',
                    createdTo: '',
                    updatedFrom: '',
                    updatedTo: '',
                  }));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear dates
              </button>
            )}
          </div>

          <div className="flex flex-col items-start gap-1 mt-3 pt-3 border-t border-white/30">
            <button
              type="button"
              onClick={handleSearch}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-colors shrink-0 bg-orange-500 text-white hover:bg-orange-600 ${
                hasUnappliedSearch
                  ? 'shadow-[0_2px_12px_0_rgba(249,115,22,0.4)] animate-pulse'
                  : 'shadow-[0_2px_8px_0_rgba(249,115,22,0.35)]'
              }`}
              title="Apply the search and date filters"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <p className="text-xs text-gray-500">Click here to get actual result</p>
            {hasUnappliedSearch && (
              <p className="text-xs text-orange-600 font-medium">Filters changed — click Search to apply</p>
            )}
          </div>

   
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="rounded-2xl border border-orange-300/50 bg-orange-400/10 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-inset ring-orange-300/30 p-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              {selectedIds.size} shipment{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            {selectedIds.size > FARDAR_BULK_SYNC_MAX && (
              <span className="text-xs text-amber-700 font-medium">
                Fardar sync: max {FARDAR_BULK_SYNC_MAX} at a time
              </span>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 p-0.5 text-orange-400 hover:text-orange-600 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkSaleLocationSync}
              disabled={bulkLoading}
              className="px-4 py-2 text-sm font-medium border border-teal-300/60 bg-white/30 backdrop-blur-sm text-teal-700 rounded-xl hover:bg-teal-100/60 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <MapPin className="w-3.5 h-3.5" />
              Fix Sale Branch
            </button>
            <button
              onClick={() => setShowBulkNumberModal(true)}
              disabled={bulkLoading}
              className="px-4 py-2 text-sm font-medium border border-blue-300/60 bg-white/30 backdrop-blur-sm text-blue-700 rounded-xl hover:bg-blue-100/60 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              Update Numbers
            </button>
            {canBulkSyncFromFardar(selectedIds.size) && (
            <button
              onClick={handleBulkFardarSync}
              disabled={bulkLoading}
              className="px-4 py-2 text-sm font-medium border border-emerald-300/60 bg-white/30 backdrop-blur-sm text-emerald-700 rounded-xl hover:bg-emerald-100/60 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${bulkLoading ? 'animate-spin' : ''}`} />
              Sync from Fardar ({selectedIds.size}/{FARDAR_BULK_SYNC_MAX})
            </button>
            )}
            <button
              onClick={() => { setBulkStatus(''); setShowBulkStatusModal(true); }}
              disabled={bulkLoading}
              className="px-4 py-2 text-sm font-medium border border-purple-300/60 bg-white/30 backdrop-blur-sm text-purple-700 rounded-xl hover:bg-purple-100/60 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Truck className="w-3.5 h-3.5" />
              Update Status
            </button>
            <button
              onClick={() => setShowBulkLabelModal(true)}
              disabled={bulkLoading}
              className="px-4 py-2 text-sm font-medium border border-orange-300/60 bg-white/30 backdrop-blur-sm text-orange-700 rounded-xl hover:bg-orange-100/60 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Bulk Labels
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <>
          <ShipmentsTable
            shipments={courierShipments}
            onViewTracking={handleViewTracking}
            onDownloadLabel={handleDownloadLabel}
            onUpdateStatus={handleUpdateStatus}
            onViewItems={handleViewItems}
            onDelete={(shipment) => setDeleteConfirm(shipment)}
            onEditShipment={(shipment) => setEditingShipment(shipment)}
            getStatusBadge={getStatusBadge}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
          <div className="flex items-center justify-between rounded-2xl border border-white/30 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] ring-1 ring-inset ring-white/40 px-6 py-4 mt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Showing {shipmentsTotal === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, shipmentsTotal)}?{Math.min(currentPage * pageSize, shipmentsTotal)} of {shipmentsTotal} shipments
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-sm border border-white/40 bg-white/40 backdrop-blur-sm rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {[5, 10, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm text-gray-600 hover:bg-white/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = i + 1;
                  } else if (currentPage <= 4) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    page = totalPages - 6 + i;
                  } else {
                    page = currentPage - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-orange-500 text-white shadow-[0_2px_8px_0_rgba(249,115,22,0.4)]'
                          : 'border border-white/40 bg-white/30 backdrop-blur-sm text-gray-600 hover:bg-white/50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm text-gray-600 hover:bg-white/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
        </>
      )}
      </>) /* end activeTab === 'shipments' */}

      {/* ---- Bulk Status Update Dialog ---- */}
      <Dialog open={showBulkStatusModal} onOpenChange={(o) => { if (!o && !bulkLoading) { setShowBulkStatusModal(false); setBulkStatus(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Truck className="w-4 h-4 text-purple-600" />
              Update Status ? {selectedIds.size} Shipment{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Select a new status to apply to all selected shipments.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">New Status *</label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as CourierShipmentStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-700 text-sm"
            >
              <option value="">Select status...</option>
              {bulkStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkStatusModal(false); setBulkStatus(''); }} disabled={bulkLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusUpdate}
              disabled={bulkLoading || !bulkStatus}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {bulkLoading ? 'Updating...' : `Update ${selectedIds.size} Shipment${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkNumberModal} onOpenChange={(o) => {
        if (!o && !bulkLoading) {
          setShowBulkNumberModal(false);
          setBulkShipmentNumbers({});
        }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]  ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-blue-600" />
              Update Shipment Numbers ? {selectedIds.size} Shipment{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Enter shipment numbers for each selected shipment below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {Array.from(selectedIds).map(id => {
              const shipment = courierShipments.find(s => s.id === id);
              return (
                <div key={id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {shipment?.recipientName || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {shipment?.recipientPhone || 'No phone'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Current: {shipment?.shipmentNumber || 'None'}
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter number..."
                    value={bulkShipmentNumbers[id] || ''}
                    onChange={(e) => {
                      setBulkShipmentNumbers(prev => ({ ...prev, [id]: e.target.value }));
                    }}
                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={bulkLoading}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBulkNumberModal(false);
              setBulkShipmentNumbers({});
            }} disabled={bulkLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkNumberUpdate}
              disabled={bulkLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {bulkLoading ? 'Updating...' : `Update ${selectedIds.size} Number${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirm Dialog ---- */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o && !deleting) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-red-600">
              <Trash2 className="w-4 h-4" />
              Delete Shipment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete shipment <strong>{deleteConfirm?.shipmentNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteShipment}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Sale Items Dialog ---- */}
      <Dialog open={!!itemsModal} onOpenChange={(o) => { if (!o) setItemsModal(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-orange-500" />
              Sale Items ? {itemsModal?.label}
            </DialogTitle>
          </DialogHeader>
          {itemsModal?.loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
            </div>
          ) : (itemsModal?.items?.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No items found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">#</TableHead>
                    <TableHead className="text-xs font-semibold">Product</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Unit Price</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Discount</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsModal!.items.map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-gray-400">{i + 1}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{item.product?.name || item.productName || '?'}</div>
                        {(item.product?.sku || item.sku) && (
                          <div className="text-xs text-gray-400">{item.product?.sku || item.sku}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-sm text-right">
                        {item.discount > 0 ? formatCurrency(item.discount) : '?'}
                      </TableCell>
                      <TableCell className="text-sm text-right font-semibold">
                        {formatCurrency(item.totalPrice ?? (item.unitPrice * item.quantity))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemsModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      {showShipmentModal && (
        <CourierShipmentModal
          onClose={() => setShowShipmentModal(false)}
          onSave={async (data) => {
            try {
              const response = await createCourierShipment(data);
              if (!response?.success) {
                toast.error(response?.message || 'Failed to create shipment');
              }
              return response;
            } catch (error) {
              console.error('Error creating shipment:', error);
            }
          }}
          courierServices={courierServices}
          variant={courierVariant}
        />
      )}

      {editingShipment && (
        <CourierShipmentModal
          onClose={() => setEditingShipment(null)}
          onSave={async (data) => {
            try {
              const response = await updateCourierShipment(editingShipment.id, data);
              if (!response?.success) {
                toast.error(response?.message || 'Failed to update shipment');
              }
              return response;
            } catch (error) {
              console.error('Error updating shipment:', error);
            }
          }}
          courierServices={courierServices}
          initialData={editingShipment}
          variant={courierVariant}
        />
      )}

      {showTrackingModal && selectedShipment && (
        <TrackingModal
          shipment={selectedShipment}
          onClose={() => setShowTrackingModal(false)}
          variant={courierVariant}
        />
      )}

      {showLabelModal && selectedShipment && (
        <LabelDownloadModal
          shipment={selectedShipment}
          onClose={() => setShowLabelModal(false)}
          onPrint={(size, format) => handlePrintLabel(selectedShipment, size, format)}
          variant={courierVariant}
        />
      )}

      {showBulkLabelModal && (
        <BulkLabelModal
          shipmentCount={selectedIds.size}
          onClose={() => { if (!bulkLoading) setShowBulkLabelModal(false); }}
          onPrint={handleBulkPrint}
          onDownload={handleBulkDownload}
          variant={courierVariant}
          loading={bulkLoading}
        />
      )}

      {showStatusModal && selectedShipment && (
        <StatusUpdateModal
          shipment={selectedShipment}
          courierSettings={courierSettings}
          onClose={() => setShowStatusModal(false)}
          onSave={async (status, remarks) => {
            try {
              await updateShipmentStatus(selectedShipment.id, status, remarks);
              setShowStatusModal(false);
              fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE);
            } catch (error) {
              console.error('Error updating status:', error);
            }
          }}
        />
      )}

      {showScanBulkModal && (
        <ScanBulkStatusModal
          courierSettings={courierSettings}
          onClose={() => setShowScanBulkModal(false)}
          onComplete={() => fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE)}
        />
      )}

      {showCsvModal && (
        <CsvImportModal
          courierServices={courierServices}
          onClose={() => setShowCsvModal(false)}
          onImported={() => {
            setShowCsvModal(false);
            fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE);
          }}
          fetchData={fetchData}
        />
      )}

      {showExcelModal && (
        <ExcelTrackingImportModal
          onClose={() => setShowExcelModal(false)}
          onImported={() => {
            setShowExcelModal(false);
            fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE);
          }}
          fetchData={fetchData}
        />
      )}
    </div>
  );
};

// Grid View Component
// const ShipmentsGrid = ({
//   shipments,
//   onViewTracking,
//   onDownloadLabel,
//   onUpdateStatus,
//   getStatusBadge
// }: {
//   shipments: CourierShipment[];
//   onViewTracking: (shipment: CourierShipment) => void;
//   onDownloadLabel: (shipment: CourierShipment) => void;
//   onUpdateStatus: (shipment: CourierShipment) => void;
//   getStatusBadge: (status: CourierShipmentStatus) => React.ReactElement;
// }) => {
//   if (shipments.length === 0) {
//     return (
//       <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
//         <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//         <p className="text-gray-600">No shipments found</p>
//       </div>
//     );
//   }

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//       {shipments.map((shipment) => (
//         <div
//           key={shipment.id}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
//         >
//           {/* Card Header */}
//           <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4">
//             <div className="flex items-start justify-between">
//               <div>
//                 <p className="text-white text-sm font-medium">Shipment #{shipment.shipmentNumber}</p>
//                 {shipment.trackingNumber && (
//                   <p className="text-white text-xs opacity-90 mt-1">
//                     Tracking: {shipment.trackingNumber}
//                   </p>
//                 )}
//               </div>
//               <div>{getStatusBadge(shipment.status)}</div>
//             </div>
//           </div>

//           {/* Card Body */}
//           <div className="p-4 space-y-3">
//             {/* Recipient Info */}
//             <div className="space-y-2">
//               <div className="flex items-center gap-2">
//                 <User className="w-4 h-4 text-gray-400" />
//                 <span className="font-medium text-gray-900">{shipment.recipientName}</span>
//               </div>
//               {shipment.recipientPhone && (
//                 <div className="flex items-center gap-2 text-sm text-gray-600">
//                   <Phone className="w-4 h-4 text-gray-400" />
//                   <span>{shipment.recipientPhone}</span>
//                 </div>
//               )}
//               {shipment.recipientAddress && (
//                 <div className="flex items-start gap-2 text-sm text-gray-600">
//                   <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
//                   <span className="line-clamp-2">
//                     {shipment.recipientAddress}, {shipment.recipientCity}
//                   </span>
//                 </div>
//               )}
//             </div>

//             {/* Delivery Info */}
//             <div className="bg-gray-50 rounded-lg p-3 space-y-2">
//               <div className="flex justify-between text-sm">
//                 <span className="text-gray-600">Delivery Method:</span>
//                 <span className="font-semibold">{shipment.deliveryMethod}</span>
//               </div>
//               {shipment.weight && (
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">Weight:</span>
//                   <span className="font-semibold">{shipment.weight} kg</span>
//                 </div>
//               )}
//               {shipment.numberOfPieces && (
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">Pieces:</span>
//                   <span className="font-semibold">{shipment.numberOfPieces}</span>
//                 </div>
//               )}
//             </div>

//             {/* Charges */}
//             <div className="bg-orange-50 rounded-lg p-3">
//               <div className="flex justify-between items-center">
//                 <span className="text-sm text-gray-600">Total Charges:</span>
//                 <span className="text-lg font-bold text-orange-600">
//                   Rs. {(shipment.totalCharge || 0)}
//                 </span>
//               </div>
//               {shipment.codEnabled && shipment.codAmount && (
//                 <div className="flex justify-between items-center mt-2 pt-2 border-t border-orange-200">
//                   <span className="text-sm text-gray-600">COD Amount:</span>
//                   <span className="text-sm font-semibold text-green-600">
//                     Rs. {shipment.codAmount}
//                   </span>
//                 </div>
//               )}
//             </div>

//             {/* Dates */}
//             {shipment.estimatedDeliveryDate && (
//               <div className="flex items-center gap-2 text-sm text-gray-600">
//                 <Calendar className="w-4 h-4 text-gray-400" />
//                 <span>Est. Delivery: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}</span>
//               </div>
//             )}
//           </div>

//           {/* Card Footer */}
//           <div className="border-t border-gray-200 p-4 flex gap-2">
//             <button
//               onClick={() => onViewTracking(shipment)}
//               className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
//             >
//               <Eye className="w-4 h-4" />
//               Track
//             </button>
//             <button
//               onClick={() => onUpdateStatus(shipment)}
//               className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//               title="Update Status"
//             >
//               <Edit className="w-4 h-4" />
//               Status
//             </button>
//             <button
//               onClick={() => onDownloadLabel(shipment)}
//               className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
//               title="Download Label"
//             >
//               <Download className="w-4 h-4" />
//             </button>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// };

// --- CSV Import Modal ---------------------------------------------------------
const CsvImportModal = ({
  courierServices,
  onClose,
  onImported,
  fetchData
}: {
  courierServices: CourierService[];
  onClose: () => void;
  onImported: () => void;
  fetchData: (opts: any) => Promise<any>;
}) => {
  const courierVariant = useCourierModalVariant();
  const { user } = useAppSelector((state) => state.auth);
  const { getBranches } = useLocation();
  const needsBranchPicker = courierVariant === 'orange' || !user?.locationId;
  const [courierServiceId, setCourierServiceId] = useState('');
  const [pickupLocationId, setPickupLocationId] = useState(user?.locationId || '');
  const [branches, setBranches] = useState<Array<{ id: string; name: string; locationCode?: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importPreview, setImportPreview] = useState<BulkImportPreviewResult | null>(null);
  const [result, setResult] = useState<{ created: number; errors: CourierImportRowError[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!needsBranchPicker) return;
    const loadBranches = async () => {
      setLoadingBranches(true);
      try {
        const res = await getBranches();
        const list: any[] = (res as any)?.data?.locations || (res as any)?.data?.branches || (res as any)?.data || [];
        const mapped = Array.isArray(list) ? list.map((b: any) => ({
          id: b.id,
          name: b.name,
          locationCode: b.locationCode,
        })) : [];
        setBranches(mapped);
        if (mapped.length === 1 && !pickupLocationId) {
          setPickupLocationId(mapped[0].id);
        }
      } catch {
        toast.error('Failed to load branches');
      } finally {
        setLoadingBranches(false);
      }
    };
    loadBranches();
  }, [needsBranchPicker]);

  const handleDownloadSample = async () => {
    try {
      const res = await fetchData({
        endpoint: '/courier/shipments/sample-csv/fardar',
        method: 'GET',
        responseType: 'blob',
        silent: true
      });
      if (res) {
        const blob = new Blob([res as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fardar-sample.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      toast.error('Failed to download sample Excel');
    }
  };

  const handlePreview = async () => {
    if (!file) { toast.error('Please select a CSV or Excel file'); return; }
    if (!courierServiceId) { toast.error('Please select a courier service'); return; }
    const branchId = pickupLocationId || user?.locationId || '';
    if (needsBranchPicker && !branchId) {
      toast.error('Please select a branch for stock and shipment pickup');
      return;
    }
    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetchData({
        endpoint: '/courier/shipments/import-preview',
        method: 'POST',
        data: formData,
        contentType: 'multipart/form-data',
        silent: true,
        showToastOnError: false,
      });
      if (res?.success && res.data) {
        setImportPreview(res.data as BulkImportPreviewResult);
      } else {
        toast.error(res?.message || 'Failed to preview import file');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to preview import file');
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async (excludeGroupKeys: string[] = []) => {
    if (!file) { toast.error('Please select a CSV or Excel file'); return; }
    if (!courierServiceId) { toast.error('Please select a courier service'); return; }
    const branchId = pickupLocationId || user?.locationId || '';
    if (needsBranchPicker && !branchId) {
      toast.error('Please select a branch for stock and shipment pickup');
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courierServiceId', courierServiceId);
      if (branchId) formData.append('pickupLocationId', branchId);
      if (excludeGroupKeys.length > 0 && importPreview) {
        const exclusion = buildImportExclusionPayload(importPreview, excludeGroupKeys);
        if (exclusion.excludeGroupKeys.length > 0) {
          formData.append('excludeGroupKeys', JSON.stringify(exclusion.excludeGroupKeys));
        }
        if (exclusion.excludeRows.length > 0) {
          formData.append('excludeRows', JSON.stringify(exclusion.excludeRows));
        }
      } else if (excludeGroupKeys.length > 0) {
        formData.append('excludeGroupKeys', JSON.stringify(excludeGroupKeys));
      }
      const res = await fetchData({
        endpoint: '/courier/shipments/import-csv',
        method: 'POST',
        data: formData,
        contentType: 'multipart/form-data',
        silent: true,
        showToastOnError: false,
      });

      const errors = normalizeCourierImportRowErrors(res?.data?.errors);
      const createdCount = Array.isArray(res?.data?.created)
        ? res.data.created.length
        : Number(res?.data?.created) || 0;

      if (res?.success) {
        setResult({ created: createdCount, errors });
        if (errors.length === 0) {
          toast.success(`Imported ${createdCount} shipments`);
        } else if (createdCount > 0) {
          toast.success(`Imported ${createdCount} shipment${createdCount !== 1 ? 's' : ''}`);
          toast.error(formatCourierImportErrorToast(errors), { duration: 10000 });
        } else {
          toast.error(formatCourierImportErrorToast(errors), { duration: 10000 });
        }
      } else if (errors.length > 0) {
        setResult({ created: 0, errors });
        toast.error(formatCourierImportErrorToast(errors), { duration: 10000 });
      } else {
        toast.error(res?.message || 'Import failed');
      }
    } catch (err: any) {
      const fallbackErrors = normalizeCourierImportRowErrors(err?.response?.data?.data?.errors);
      if (fallbackErrors.length > 0) {
        setResult({ created: 0, errors: fallbackErrors });
        toast.error(formatCourierImportErrorToast(fallbackErrors), { duration: 10000 });
      } else {
        toast.error(
          err?.response?.data?.message || err?.message || 'Import failed',
        );
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={importPreview ? 'max-w-2xl sm:max-w-2xl overflow-hidden flex flex-col' : 'max-w-lg'}>
        <DialogHeader className={importPreview ? 'shrink-0' : undefined}>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-orange-600" />
            {importPreview
              ? 'Review Customers Before Import'
              : 'Import Shipments from CSV/Excel'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {importPreview
              ? 'Review customer order history and success rates before creating bulk shipments.'
              : 'Upload a Fardar-format CSV or Excel file to bulk import shipments.'}
          </DialogDescription>
        </DialogHeader>

        {importPreview ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <BulkImportCustomerReview
              preview={importPreview}
              onCancel={() => setImportPreview(null)}
              onAccept={handleImport}
              loading={importing}
            />
          </div>
        ) : !result ? (
          <div className="space-y-4">
            {/* Courier Service */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Courier Service *</label>
              <select
                value={courierServiceId}
                onChange={(e) => setCourierServiceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select courier service...</option>
                {courierServices.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {needsBranchPicker && (
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  Branch (stock & pickup) *
                </label>
                {loadingBranches ? (
                  <p className="text-sm text-gray-500 py-2">Loading branches...</p>
                ) : (
                  <select
                    value={pickupLocationId}
                    onChange={(e) => setPickupLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}{b.locationCode ? ` (${b.locationCode})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Required for organization admin imports so product stock deducts from the correct branch.
                </p>
              </div>
            )}

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CSV or Excel File *</label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <FileText className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Click to select a CSV or Excel file</p>
                    <p className="text-xs text-gray-400 mt-1">Max 10 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <FileText className="w-4 h-4 shrink-0" />
              <span>Use Fardar-format CSV/Excel. Include <strong>Courier Delivery Charge</strong> per order, or leave blank to use the selected courier&apos;s default rate. Repeat the same Order ID on multiple rows for multi-product orders. </span>
              <button onClick={handleDownloadSample} className="underline font-medium hover:text-blue-900">
                Download sample
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              result.errors.length > 0 && result.created === 0
                ? 'bg-red-50'
                : result.errors.length > 0
                  ? 'bg-amber-50'
                  : 'bg-green-50'
            }`}>
              {result.errors.length > 0 && result.created === 0 ? (
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
              ) : result.errors.length > 0 ? (
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
              )}
              <div>
                {result.created > 0 ? (
                  <p className="font-semibold text-green-800">{result.created} shipments imported</p>
                ) : result.errors.length > 0 ? (
                  <p className="font-semibold text-red-800">No shipments imported</p>
                ) : (
                  <p className="font-semibold text-green-800">Import complete</p>
                )}
                {result.errors.length > 0 && (
                  <p className="text-sm text-red-700 mt-0.5">
                    {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed — see details below
                  </p>
                )}
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1 border border-red-100 rounded-lg p-1">
                {result.errors.map((e, i) => (
                  <div key={`${e.row}-${i}`} className="text-sm p-2 bg-red-50 text-red-800 rounded break-words border border-red-100">
                    <span className="font-semibold">Row {e.row}:</span> {e.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!importPreview && (
        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handlePreview}
                disabled={
                  previewing ||
                  importing ||
                  !file ||
                  !courierServiceId ||
                  (needsBranchPicker && !pickupLocationId)
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                {previewing ? 'Checking customers...' : 'Review & Import'}
              </Button>
            </>
          ) : (
            <Button onClick={onImported} className="bg-orange-600 hover:bg-orange-700">Done</Button>
          )}
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Table View Component
const ShipmentsTable = ({
  shipments,
  onViewTracking,
  onDownloadLabel,
  onUpdateStatus,
  onViewItems,
  onDelete,
  onEditShipment,
  getStatusBadge,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll
}: {
  shipments: CourierShipment[];
  onViewTracking: (shipment: CourierShipment) => void;
  onDownloadLabel: (shipment: CourierShipment) => void;
  onUpdateStatus: (shipment: CourierShipment) => void;
  onViewItems: (shipment: CourierShipment) => void;
  onDelete: (shipment: CourierShipment) => void;
  onEditShipment: (shipment: CourierShipment) => void;
  getStatusBadge: (status: CourierShipmentStatus) => React.ReactElement;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) => {
  const allSelected = shipments.length > 0 && selectedIds.size === shipments.length;

  if (shipments.length === 0) {
    return (
      <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)] ring-1 ring-inset ring-white/40 p-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No shipments found</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)] ring-1 ring-inset ring-white/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/30 backdrop-blur-sm border-b border-white/30">
            <tr>
              <th className="px-3 py-4 w-10">
                <button onClick={onToggleSelectAll} className="p-0.5 text-gray-400 hover:text-orange-600 transition-colors">
                  {allSelected ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Shipment Details
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Branch / Staff
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tracking #
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Recipient
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Delivery Info
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Charges
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {shipments.map((shipment) => (
              <tr key={shipment.id} className="hover:bg-white/20 transition-colors">
                <td className="px-3 py-4 w-10">
                  <button onClick={() => onToggleSelect(shipment.id)} className="p-0.5 text-gray-400 hover:text-orange-600 transition-colors">
                    {selectedIds.has(shipment.id) ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">#{shipment.shipmentNumber}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatColomboDateTime(shipment.createdAt)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm space-y-1">
                    {shipment.branchName ? (
                      <div className="flex items-center gap-1.5 text-gray-800">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="font-medium">{shipment.branchName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    {shipment.staffName && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs">{shipment.staffName}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const tracking = shipment.trackingNumber?.trim();
                    const awb = shipment.awb_number?.trim();
                    if (!tracking && !awb) {
                      return <span className="text-xs text-gray-400">—</span>;
                    }
                    const showBoth = !!(tracking && awb && tracking !== awb);
                    return (
                      <div className="space-y-1">
                        {tracking && (
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span className="text-sm font-mono font-semibold text-orange-700 select-all">
                              {tracking}
                            </span>
                          </div>
                        )}
                        {showBoth && (
                          <div className="text-xs font-mono text-gray-600 select-all pl-5">
                            AWB: {awb}
                          </div>
                        )}
                        {!tracking && awb && (
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span className="text-sm font-mono font-semibold text-orange-700 select-all">
                              {awb}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{shipment.recipientName}</div>
                    <div className="text-sm text-gray-500">{shipment.recipientPhone}</div>
                    <div className="text-xs text-gray-400 line-clamp-1">
                      {shipment.recipientCity}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-600">Method:</span>{' '}
                      <span className="font-semibold">{shipment.deliveryMethod}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Weight:</span>{' '}
                      <span className="font-semibold">{shipment.weight} kg</span>
                    </div>
                    {shipment.estimatedDeliveryDate && (
                      <div className="text-xs text-gray-500">
                        Est: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm space-y-1">
                    <div className="font-semibold text-orange-600">
                      Rs. {(shipment.totalCharge || 0)}
                    </div>
                    {shipment.codEnabled && Number(shipment.codAmount) > 0 && (
                      <div className="text-xs">
                        <span className="text-gray-600">COD:</span>{' '}
                        <span className="text-green-600 font-semibold">
                          Rs. {shipment.codAmount}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">{getStatusBadge(shipment.status)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {shipment.saleId && (
                      <button
                        onClick={() => onViewItems(shipment)}
                        className="p-2 text-green-600 hover:bg-green-400/15 rounded-xl transition-colors"
                        title="View Sale Items"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                    )}
                    {/* <button
                      onClick={() => onEditShipment(shipment)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Edit Shipment"
                    >
                      <Pencil className="w-4 h-4" />
                    </button> */}
                    <button
                      onClick={() => onViewTracking(shipment)}
                      className="p-2 text-orange-600 hover:bg-orange-400/15 rounded-xl transition-colors"
                      title="View Tracking"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onUpdateStatus(shipment)}
                      className="p-2 text-blue-600 hover:bg-blue-400/15 rounded-xl transition-colors"
                      title="Update Status"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDownloadLabel(shipment)}
                      className="p-2 text-gray-600 hover:bg-gray-400/15 rounded-xl transition-colors"
                      title="Download Label"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(shipment)}
                      className="p-2 text-red-600 hover:bg-red-400/15 rounded-xl transition-colors"
                      title="Delete Shipment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShipmentTrackingPage;

// --- Excel Tracking Import Modal --------------------------------------------------
interface ExcelPreviewItem {
  rowNumber: number;
  waybillNumber: string;
  orderNumber: string;
  customerName: string;
  fullPayment: number;
  collected: number;
  deliveryCharge: number;
  weight: number;
  destination: string;
  description: string;
  excelStatus: string;
  mappedStatus: string;
  matched: boolean;
  shipmentId?: string;
  shipmentNumber?: string;
  dbTrackingNumber?: string;
  currentStatus?: string;
  saleId?: string;
  saleNumber?: string;
  saleTotalAmount?: number;
  salePaymentStatus?: string;
}

const ExcelTrackingImportModal = ({
  onClose,
  onImported,
  fetchData
}: {
  onClose: () => void;
  onImported: () => void;
  fetchData: (opts: any) => Promise<any>;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewItems, setPreviewItems] = useState<ExcelPreviewItem[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownloadSample = () => {
    const headers = [
      'Waybill Number',
      'Order Number',
      'Customer Name',
      'Full Payment',
      'Collected',
      'Delivery Charge',
      'Weight',
      'Destination',
      'Description',
      'Status'
    ];
    const rows = [
      ['RA03523173', '4.06-19', 'Kasuna', '2425', '0', '0', '1', 'Chillaw', '36-1', 'RETURNED TO MERCHANT'],
      ['RA03704857', 'SHP-260500019', 'Abulkalam aazath', '6425', '6425', '425', '1', 'Ampara', '36-3', 'DELIVERED']
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'shipment_tracker_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded sample tracker sheet');
  };

  const handleUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetchData({
        endpoint: '/courier/shipments/excel-preview',
        method: 'POST',
        data: formData,
        contentType: 'multipart/form-data'
      });
      if (res?.success && res.data) {
        setPreviewItems(res.data);
        // Automatically check matched shipments
        const matchedRowNumbers = res.data
          .filter((item: ExcelPreviewItem) => item.matched)
          .map((item: ExcelPreviewItem) => item.rowNumber);
        setSelectedRows(new Set(matchedRowNumbers));
        toast.success(`Parsed ${res.data.length} rows from Excel`);
      } else {
        toast.error('Failed to parse Excel file');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to preview Excel file');
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedRows.size === 0) {
      toast.error('Please select at least one shipment to confirm');
      return;
    }
    setConfirming(true);
    try {
      const selectedItems = previewItems
        .filter(item => selectedRows.has(item.rowNumber))
        .map(item => ({
          shipmentId: item.shipmentId,
          excelStatus: item.excelStatus,
          waybillNumber: item.waybillNumber,
          collected: item.collected,
          fullPayment: item.fullPayment
        }));

      const res = await fetchData({
        endpoint: '/courier/shipments/excel-confirm',
        method: 'POST',
        data: { items: selectedItems }
      });

      if (res?.success) {
        toast.success(`Successfully updated ${res.data.updated.length} shipments`);
        if (res.data.errors && res.data.errors.length > 0) {
          toast.error(`${res.data.errors.length} rows had errors during confirmation`);
        }
        onImported();
      } else {
        toast.error('Failed to confirm updates');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to confirm updates');
    } finally {
      setConfirming(false);
    }
  };

  const toggleSelectRow = (rowNumber: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber); else next.add(rowNumber);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === previewItems.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(previewItems.map(i => i.rowNumber)));
    }
  };

  const handleRemoveRow = (rowNumber: number) => {
    setPreviewItems(prev => prev.filter(i => i.rowNumber !== rowNumber));
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.delete(rowNumber);
      return next;
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Upload className="w-6 h-6 text-orange-600" />
            Excel Shipment Status Tracker Import
          </DialogTitle>
          <DialogDescription>
            Upload your courier dispatch spreadsheet to automatically search, preview, and update shipment delivery statuses and sale payment records.
          </DialogDescription>
        </DialogHeader>

        {previewing ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 font-medium">Analyzing Excel columns and searching database matches...</p>
          </div>
        ) : previewItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-12">
            <div
              className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-orange-400 transition-all bg-white/40 backdrop-blur-sm max-w-xl w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-bounce" />
              <p className="text-lg font-semibold text-gray-700">Drag & Drop or click to upload</p>
              <p className="text-sm text-gray-500 mt-2">Supports .xlsx, .xls and .csv tracker sheets</p>
              <p className="text-xs text-gray-400 mt-1">Waybill No, Order No, Customer, Total/Collected, Status columns are parsed.</p>
            </div>
            
            <div className="flex items-center justify-center gap-2 p-3 bg-blue-50/60 rounded-xl text-sm text-blue-700 max-w-xl mx-auto w-full border border-blue-100">
              <FileText className="w-4 h-4 shrink-0 text-blue-500" />
              <span>Don't have a spreadsheet template? </span>
              <button onClick={handleDownloadSample} className="underline font-semibold hover:text-blue-900 transition-colors cursor-pointer">
                Download Sample Tracker Sheet
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleUpload(selectedFile);
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden py-4">
            <div className="flex items-center justify-between mb-4 bg-orange-50 p-3 rounded-xl border border-orange-200">
              <span className="text-sm text-orange-800 font-medium">
                File: {file?.name || 'Uploaded File'} | Matches found: {previewItems.filter(i => i.matched).length} / {previewItems.length} rows | Selected: {selectedRows.size}
              </span>
              <button
                onClick={() => {
                  setPreviewItems([]);
                  setSelectedRows(new Set());
                  setFile(null);
                }}
                className="text-sm text-orange-600 font-semibold hover:underline"
              >
                Upload different file
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-gray-200 rounded-xl bg-white/50">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-100 z-10">
                  <TableRow>
                    <TableHead className="w-12 px-3 py-3">
                      <button onClick={toggleSelectAll} className="p-0.5 text-gray-400 hover:text-orange-600 transition-colors">
                        {selectedRows.size === previewItems.length && previewItems.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-orange-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-xs font-bold text-gray-700">Row</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700">Waybill / Tracking No</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700">Order No</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700">Customer</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700">Full / Collected (Rs)</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700">Excel Status</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700">DB Match / Status</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewItems.map((item) => (
                    <TableRow key={item.rowNumber} className={`hover:bg-gray-50/50 ${!item.matched ? 'opacity-60 bg-red-50/20' : ''}`}>
                      <TableCell className="w-12 px-3 py-2.5">
                        <button
                          disabled={!item.matched}
                          onClick={() => toggleSelectRow(item.rowNumber)}
                          className="p-0.5 text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {selectedRows.has(item.rowNumber) ? (
                            <CheckSquare className="w-4 h-4 text-orange-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{item.rowNumber}</TableCell>
                      <TableCell className="text-sm font-mono text-gray-600">{item.waybillNumber || '?'}</TableCell>
                      <TableCell className="text-sm font-mono font-medium">{item.orderNumber || '?'}</TableCell>
                      <TableCell className="text-sm text-gray-700">{item.customerName || '?'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-semibold text-gray-800">
                          {item.fullPayment ? `Rs. ${item.fullPayment}` : '?'}
                        </div>
                        {item.collected > 0 && (
                          <div className="text-xs text-green-600 font-medium">
                            Coll: Rs. {item.collected}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.excelStatus.toUpperCase().includes('DELIVERED')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {item.excelStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.matched ? (
                          <div>
                            <div className="flex items-center gap-1 text-xs text-green-700 font-bold">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                              Matched #{item.shipmentNumber}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Current Status: <span className="font-bold">{item.currentStatus}</span>
                            </div>
                            {item.saleNumber && (
                              <div className="text-[11px] text-blue-600">
                                Sale: {item.saleNumber} ({item.salePaymentStatus})
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5 text-gray-400" />
                            No Database Match
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleRemoveRow(item.rowNumber)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Remove Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          {previewItems.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={confirming || selectedRows.size === 0}
              className="bg-orange-600 hover:bg-orange-700 font-medium px-6 shadow-[0_2px_12px_0_rgba(249,115,22,0.35)]"
            >
              {confirming ? 'Processing Updates...' : `Confirm ${selectedRows.size} Status Updates`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
