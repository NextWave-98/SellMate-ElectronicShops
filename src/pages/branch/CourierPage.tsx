/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Package, Truck, MapPin, Search, Eye, Plus, Clock, CheckCircle,
  XCircle, AlertCircle, Download, FileText, Printer, RefreshCw,
  DollarSign, ArrowUpRight, CheckSquare, Square, X, Phone, Upload, Trash2, Pencil, ScanLine
} from 'lucide-react';
import useFetch  from '../../hooks/useFetch';
import { useAppSelector } from '../../store/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { formatCurrency } from '@/utils/currency';
import useCourier, {
  type CourierShipment,
  CourierShipmentStatus,
  ALL_COURIER_SHIPMENT_STATUSES,
  getBulkStatusOptions,
  FARDAR_BULK_SYNC_MAX,
  canBulkSyncFromFardar,
} from '../../hooks/useCourier';
import toast from 'react-hot-toast';
import { todayColombo } from '@/utils/dateUtils';
import { printPdfBlob } from '@/utils/printPdf';
import { CourierShipmentModal, TrackingModal, LabelDownloadModal, BulkLabelModal, ScanBulkStatusModal } from '../../components/courier/modals';
import BulkImportCustomerReview, {
  type BulkImportPreviewResult,
  buildImportExclusionPayload,
} from '../../components/courier/BulkImportCustomerReview';
import { useLocation as useLocationHook } from '../../hooks/useLocation';

type DatePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const getColomboDateString = () => todayColombo();

const BranchCourierPage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const branchShipmentScope = { scope: 'branch' as const };
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<CourierShipment | null>(null);
  const [editingShipment, setEditingShipment] = useState<CourierShipment | null>(null);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentNumberFrom, setShipmentNumberFrom] = useState('');
  const [shipmentNumberTo, setShipmentNumberTo] = useState('');
  const [trackingSearch, setTrackingSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('week');
  const [customStartDate, setCustomStartDate] = useState(getColomboDateString);
  const [customEndDate, setCustomEndDate] = useState(getColomboDateString);
  const [filterCreatedFrom, setFilterCreatedFrom] = useState('');
  const [filterCreatedTo, setFilterCreatedTo] = useState('');
  const [filterUpdatedFrom, setFilterUpdatedFrom] = useState('');
  const [filterUpdatedTo, setFilterUpdatedTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
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
  const [refreshing, setRefreshing] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkNumberModal, setShowBulkNumberModal] = useState(false);
  const [showBulkLabelModal, setShowBulkLabelModal] = useState(false);
  const [showScanBulkModal, setShowScanBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<CourierShipmentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [itemsModal, setItemsModal] = useState<{ label: string; loading: boolean; items: any[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CourierShipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { fetchData } = useFetch('');

  const {
    courierServices,
    courierShipments,
    loading,
    shipmentsTotal,
    shipmentsTotalPages,
    fetchCourierServices,
    fetchCourierShipments,
    createCourierShipment,
    updateCourierShipment,
    bulkUpdateShipmentStatus,
    bulkSyncFromFardar,
    bulkSyncSaleLocationFromPickup,
    bulkUpdateShipmentNumbers,
    courierSettings,
    fetchCourierSettings,
  } = useCourier();

  const bulkStatusOptions = useMemo(
    () => getBulkStatusOptions(courierSettings, user?.role?.name),
    [courierSettings, user?.role?.name],
  );

  const buildShipmentFilters = useCallback(() => {
    const filters: Record<string, any> = { page, limit: pageSize };
    if (statusFilter) filters.status = statusFilter;

    const hasCreated = !!(appliedSearch.createdFrom || appliedSearch.createdTo);
    const hasUpdated = !!(appliedSearch.updatedFrom || appliedSearch.updatedTo);

    if (hasCreated) {
      if (appliedSearch.createdFrom) filters.createdAtFrom = appliedSearch.createdFrom;
      if (appliedSearch.createdTo) filters.createdAtTo = appliedSearch.createdTo;
    } else if (hasUpdated) {
      // Updated-only: skip created/period constraint
    } else if (datePeriod === 'custom') {
      filters.period = 'custom';
      if (appliedSearch.customStartDate) filters.startDate = appliedSearch.customStartDate;
      if (appliedSearch.customEndDate) filters.endDate = appliedSearch.customEndDate;
    } else {
      filters.period = datePeriod;
    }

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
    if (timeFrom) filters.startTime = timeFrom;
    if (timeTo) filters.endTime = timeTo;
    return filters;
  }, [page, pageSize, statusFilter, datePeriod, appliedSearch, timeFrom, timeTo]);

  const isSingleDayPeriod =
    !appliedSearch.createdFrom && !appliedSearch.createdTo && (
      datePeriod === 'today' ||
      datePeriod === 'yesterday' ||
      (datePeriod === 'custom' && appliedSearch.customStartDate && appliedSearch.customEndDate && appliedSearch.customStartDate === appliedSearch.customEndDate)
    );

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
    setPage(1);
  };

  const handleDateRangeChange = (setter: (val: string) => void) => (val: string) => {
    setter(val);
    setDatePeriod('custom');
  };

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

  const reloadShipments = useCallback(
    () => fetchCourierShipments(buildShipmentFilters(), branchShipmentScope),
    [fetchCourierShipments, buildShipmentFilters],
  );

  useEffect(() => {
    setPage(1);
  }, [statusFilter, datePeriod, appliedSearch, timeFrom, timeTo, pageSize]);

  useEffect(() => {
    fetchCourierShipments(buildShipmentFilters(), branchShipmentScope);
  }, [statusFilter, datePeriod, appliedSearch, timeFrom, timeTo, page, pageSize, buildShipmentFilters, branchShipmentScope]);

  // Fetch courier services on component mount for shipment modal dropdown
  useEffect(() => {
    fetchCourierServices();
    if (user?.businessId) {
      fetchCourierSettings(user.businessId);
    }
  }, [user?.businessId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reloadShipments();
      toast.success('Refreshed');
    } catch { /* ignore */ } finally {
      setRefreshing(false);
    }
  };

  // Stats computed from shipments
  const stats = useMemo(() => {
    const all = courierShipments;
    const pending = all.filter(s => s.status === CourierShipmentStatus.PENDING || s.status === CourierShipmentStatus.PENDING_PICKUP);
    const inTransit = all.filter(s => s.status === CourierShipmentStatus.IN_TRANSIT || s.status === CourierShipmentStatus.OUT_FOR_DELIVERY || s.status === CourierShipmentStatus.PICKED_UP);
    const delivered = all.filter(s => s.status === CourierShipmentStatus.DELIVERED);
    const totalRevenue = all.reduce((sum, s) => sum + (s.codAmount || s.declaredValue || 0), 0);
    return { total: shipmentsTotal, pending: pending.length, inTransit: inTransit.length, delivered: delivered.length, totalRevenue };
  }, [courierShipments, shipmentsTotal]);

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
        reloadShipments();
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

  const handlePrintLabel = async (
    shipment: CourierShipment,
    size: 'xsm' | 'sm' | 'md' = 'md',
    format: 'standard' | 'fragile' = 'standard'
  ) => {
    try {
      const labelIdentifier = encodeURIComponent(shipment.shipmentNumber || shipment.id);
      const response = await fetchData({
        endpoint: `/courier/shipments/${labelIdentifier}/label/print?size=${size}&format=${format}`,
        responseType: 'blob',
        method: 'GET'
      });

      if (response) {
        const blob = response as Blob;
        try {
          printPdfBlob(blob, format === 'fragile' ? { pageSize: 'A5-landscape' } : undefined);
        } catch {
          toast.error('Please allow popups to print labels');
        }
      }
    } catch (error) {
      console.error('Failed to print label:', error);
      toast.error('Failed to print label');
    }
  };

  const getStatusBadge = (status: CourierShipmentStatus) => {
    const badges: Partial<Record<CourierShipmentStatus, { color: string; icon: any; text: string }>> = {
      [CourierShipmentStatus.PROCESSING]: { color: 'bg-slate-100 text-slate-800 border border-slate-200', icon: Clock, text: 'Processing' },
      [CourierShipmentStatus.PACKAGING]: { color: 'bg-slate-100 text-slate-800 border border-slate-200', icon: Package, text: 'Packaging' },
      [CourierShipmentStatus.WAITING_COURIER_PICKUP]: { color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: Clock, text: 'Waiting Pickup' },
      [CourierShipmentStatus.RELEASED_TO_COURIER]: { color: 'bg-cyan-100 text-cyan-800 border border-cyan-200', icon: Truck, text: 'Released to Courier' },
      [CourierShipmentStatus.RESCHEDULED]: { color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: Clock, text: 'Rescheduled' },
      [CourierShipmentStatus.DAMAGED]: { color: 'bg-red-100 text-red-800 border border-red-200', icon: AlertCircle, text: 'Damaged' },
      [CourierShipmentStatus.RETURN_PENDING]: { color: 'bg-orange-100 text-orange-800 border border-orange-200', icon: AlertCircle, text: 'Return Pending' },
      [CourierShipmentStatus.RETURN_COMPLETE]: { color: 'bg-orange-100 text-orange-800 border border-orange-200', icon: AlertCircle, text: 'Return Complete' },
      [CourierShipmentStatus.RETURNED_TO_LOCATION]: { color: 'bg-teal-100 text-teal-800 border border-teal-200', icon: Package, text: 'Returned to Location' },
      [CourierShipmentStatus.PENDING]: { color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: Clock, text: 'Pending' },
      [CourierShipmentStatus.PENDING_PICKUP]: { color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: Clock, text: 'Pending Pickup' },
      [CourierShipmentStatus.PICKED_UP]: { color: 'bg-blue-100 text-blue-800 border border-blue-200', icon: Package, text: 'Picked Up' },
      [CourierShipmentStatus.IN_TRANSIT]: { color: 'bg-purple-100 text-purple-800 border border-purple-200', icon: Truck, text: 'In Transit' },
      [CourierShipmentStatus.OUT_FOR_DELIVERY]: { color: 'bg-indigo-100 text-indigo-800 border border-indigo-200', icon: MapPin, text: 'Out for Delivery' },
      [CourierShipmentStatus.DELIVERED]: { color: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: CheckCircle, text: 'Delivered' },
      [CourierShipmentStatus.FAILED_DELIVERY]: { color: 'bg-red-100 text-red-800 border border-red-200', icon: XCircle, text: 'Failed Delivery' },
      [CourierShipmentStatus.DELIVERY_FAILED]: { color: 'bg-red-100 text-red-800 border border-red-200', icon: XCircle, text: 'Delivery Failed' },
      [CourierShipmentStatus.RETURNED_TO_SENDER]: { color: 'bg-orange-100 text-orange-800 border border-orange-200', icon: AlertCircle, text: 'Returned to Sender' },
      [CourierShipmentStatus.RETURNED]: { color: 'bg-orange-100 text-orange-800 border border-orange-200', icon: AlertCircle, text: 'Returned' },
      [CourierShipmentStatus.CANCELLED]: { color: 'bg-gray-100 text-gray-800 border border-gray-200', icon: XCircle, text: 'Cancelled' },
      [CourierShipmentStatus.ON_HOLD]: { color: 'bg-yellow-100 text-yellow-800 border border-yellow-200', icon: Clock, text: 'On Hold' }
    };

    const badge = badges[status] || {
      color: 'bg-gray-100 text-gray-800 border border-gray-200',
      icon: Package,
      text: String(status || '').replace(/_/g, ' '),
    };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  // Server-side pagination: data already filtered and paginated by API
  const paginatedShipments = courierShipments;
  const totalPages = Math.max(1, shipmentsTotalPages);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const visibleIds = paginatedShipments.map(s => s.id);
      if (visibleIds.length === 0) return prev;
      const allVisibleSelected = visibleIds.every(id => prev.has(id));
      if (allVisibleSelected) {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach(id => next.add(id));
      return next;
    });
  }, [paginatedShipments]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);


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
        fetchCourierShipments(buildShipmentFilters(), branchShipmentScope);
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
        reloadShipments();
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
    format: 'standard' | 'fragile' = 'fragile'
  ) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const response = await fetchData({
        endpoint: `/courier/shipments/bulk-labels/download`,
        method: 'POST',
        data: { shipmentIds: Array.from(selectedIds), size, format },
        responseType: 'blob'
      });
      if (response) {
        const blob = response as Blob;
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
      }
    } catch {
      toast.error('Failed to download bulk labels');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPrint = async (
    size: 'xsm' | 'sm' | 'md' = 'md',
    format: 'standard' | 'fragile' = 'fragile'
  ) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const response = await fetchData({
        endpoint: `/courier/shipments/bulk-labels/print`,
        method: 'POST',
        data: { shipmentIds: Array.from(selectedIds), size, format },
        responseType: 'blob'
      });
      if (response) {
        const blob = response as Blob;
        try {
          printPdfBlob(blob, format === 'fragile' ? { pageSize: 'A5-landscape' } : undefined);
          setShowBulkLabelModal(false);
        } catch {
          toast.error('Please allow popups to print labels');
        }
      }
    } catch {
      toast.error('Failed to print bulk labels');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkNumberUpdate = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const response = await bulkUpdateShipmentNumbers(Array.from(selectedIds));
      if (response?.success) {
        const { updated, errors } = response.data as {
          updated: Array<{ id: string; shipmentNumber: string }>;
          errors: Array<{ id: string; message: string }>;
        };
        if (errors.length === 0) {
          toast.success(`Updated numbers for ${updated.length} shipment${updated.length !== 1 ? 's' : ''}`);
        } else {
          toast.success(`Updated ${updated.length}, failed ${errors.length}`);
        }
        setSelectedIds(new Set());
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

  // Quick filter buttons
  const quickFilters = [
    { label: 'All', value: '', count: stats.total },
    { label: 'Pending', value: CourierShipmentStatus.PENDING, count: stats.pending },
    { label: 'In Transit', value: CourierShipmentStatus.IN_TRANSIT, count: stats.inTransit },
    { label: 'Delivered', value: CourierShipmentStatus.DELIVERED, count: stats.delivered },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-600" />
            Courier Sales
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage shipments, track deliveries & courier orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCsvModal(true)}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowScanBulkModal(true)}
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <ScanLine className="w-4 h-4" />
            Scan &amp; Bulk Update
          </Button>
          <Button
            onClick={() => setShowShipmentModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Shipment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shipments */}
        <Card className="p-5 rounded-xl hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Pending - highlighted */}
        <div className={`rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
          stats.pending > 0 
            ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200' 
            : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pending</p>
              <p className={`text-2xl font-bold mt-1 ${stats.pending > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                {stats.pending}
              </p>
              {stats.pending > 0 && (
                <p className="text-xs text-amber-600 mt-1 font-medium">Needs attention</p>
              )}
            </div>
            <div className={`p-2.5 rounded-lg ${stats.pending > 0 ? 'bg-amber-100' : 'bg-gray-50'}`}>
              <Clock className={`w-5 h-5 ${stats.pending > 0 ? 'text-amber-600 animate-pulse' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>

        {/* In Transit */}
        <Card className="p-5 rounded-xl hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">In Transit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inTransit}</p>
            </div>
            <div className="bg-purple-50 p-2.5 rounded-lg">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </Card>

        {/* Revenue */}
        <Card className="p-5 rounded-xl hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                Rs.{stats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Alert Banner */}
      {stats.pending > 0 && statusFilter !== CourierShipmentStatus.PENDING && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {stats.pending} shipment{stats.pending > 1 ? 's' : ''} pending
              </p>
              <p className="text-xs text-amber-600 mt-0.5">These orders are waiting to be processed</p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter(CourierShipmentStatus.PENDING)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
          >
            View Pending
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters & Table */}
      <Card className="rounded-xl overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {/* Quick Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {quickFilters.map(qf => (
                <button
                  key={qf.label}
                  onClick={() => setStatusFilter(qf.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    statusFilter === qf.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {qf.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    statusFilter === qf.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {qf.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search shipment #..."
                  value={shipmentSearch}
                  onChange={(e) => setShipmentSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 pr-4 text-sm"
                />
              </div>
              <div className="relative w-full sm:w-48">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Tracking #..."
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 pr-4 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700"
              >
                <option value="">All Status</option>
                {ALL_COURIER_SHIPMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 items-center mt-2">
              {([
                { value: 'today' as DatePeriod, label: 'Today' },
                { value: 'yesterday' as DatePeriod, label: 'Yesterday' },
                { value: 'week' as DatePeriod, label: 'This Week' },
                { value: 'month' as DatePeriod, label: 'This Month' },
                { value: 'custom' as DatePeriod, label: 'Pick Date' },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setDatePeriod(value);
                    if (value !== 'custom') {
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
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    datePeriod === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
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
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                    title="From date"
                  />
                  <span className="text-xs text-gray-500">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                    title="To date"
                  />
                </>
              )}
              {isSingleDayPeriod && (
                <>
                  <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-2 py-1" />
                  <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-2 py-1" />
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center mt-2">
              <span className="text-xs text-gray-500">Created</span>
              <input type="date" value={filterCreatedFrom} onChange={(e) => handleDateRangeChange(setFilterCreatedFrom)(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="text-sm border border-gray-300 rounded-lg px-2 py-1" />
              <span className="text-xs text-gray-500">to</span>
              <input type="date" value={filterCreatedTo} onChange={(e) => handleDateRangeChange(setFilterCreatedTo)(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="text-sm border border-gray-300 rounded-lg px-2 py-1" />
              <span className="text-xs text-gray-500 ml-2">Updated</span>
              <input type="date" value={filterUpdatedFrom} onChange={(e) => handleDateRangeChange(setFilterUpdatedFrom)(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="text-sm border border-gray-300 rounded-lg px-2 py-1" />
              <span className="text-xs text-gray-500">to</span>
              <input type="date" value={filterUpdatedTo} onChange={(e) => handleDateRangeChange(setFilterUpdatedTo)(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="text-sm border border-gray-300 rounded-lg px-2 py-1" />
              {(filterCreatedFrom || filterCreatedTo || filterUpdatedFrom || filterUpdatedTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterCreatedFrom('');
                    setFilterCreatedTo('');
                    setFilterUpdatedFrom('');
                    setFilterUpdatedTo('');
                    setDatePeriod('week');
                    setAppliedSearch((prev) => ({
                      ...prev,
                      createdFrom: '',
                      createdTo: '',
                      updatedFrom: '',
                      updatedTo: '',
                    }));
                    setPage(1);
                  }}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear dates
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Package className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs text-gray-600">Shipment #:</span>
              <Input
                type="text"
                placeholder="From"
                value={shipmentNumberFrom}
                onChange={(e) => setShipmentNumberFrom(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="text-sm w-28 h-9"
              />
              <span className="text-xs text-gray-500">to</span>
              <Input
                type="text"
                placeholder="To"
                value={shipmentNumberTo}
                onChange={(e) => setShipmentNumberTo(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="text-sm w-28 h-9"
              />
            </div>

            <div className="flex flex-col items-start gap-1 mt-3 pt-3 border-t border-gray-100">
              <Button
                type="button"
                onClick={handleSearch}
                className={`bg-blue-600 hover:bg-blue-700 text-white ${hasUnappliedSearch ? 'animate-pulse' : ''}`}
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <p className="text-xs text-gray-500">Click here to get actual result</p>
              {hasUnappliedSearch && (
                <p className="text-xs text-blue-600 font-medium">Filters changed — click Search to apply</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {selectedIds.size} shipment{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              {selectedIds.size > FARDAR_BULK_SYNC_MAX && (
                <span className="text-xs text-amber-700 font-medium">
                  Fardar sync: max {FARDAR_BULK_SYNC_MAX} at a time
                </span>
              )}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-1 p-0.5 text-blue-400 hover:text-blue-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSaleLocationSync}
                disabled={bulkLoading}
                className="border-teal-300 text-teal-700 hover:bg-teal-100"
              >
                <MapPin className="w-3.5 h-3.5" />
                Fix Sale Branch
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkNumberModal(true)}
                disabled={bulkLoading}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <FileText className="w-3.5 h-3.5" />
                Update Numbers
              </Button>
              {canBulkSyncFromFardar(selectedIds.size) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkFardarSync}
                disabled={bulkLoading}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${bulkLoading ? 'animate-spin' : ''}`} />
                Sync from Fardar ({selectedIds.size}/{FARDAR_BULK_SYNC_MAX})
              </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setBulkStatus(''); setShowBulkStatusModal(true); }}
                disabled={bulkLoading}
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                <Truck className="w-3.5 h-3.5" />
                Update Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkLabelModal(true)}
                disabled={bulkLoading}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Printer className="w-3.5 h-3.5" />
                Bulk Labels
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Loading shipments...</p>
          </div>
        ) : (
          <div>
            <CourierShipmentsTable
              shipments={paginatedShipments}
              onViewTracking={handleViewTracking}
              onDownloadLabel={handleDownloadLabel}
              onViewItems={handleViewItems}
              onDelete={(shipment) => setDeleteConfirm(shipment)}
              onEditShipment={(shipment) => setEditingShipment(shipment)}
              getStatusBadge={getStatusBadge}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              page={page}
              pageSize={pageSize}
              totalCount={shipmentsTotal}
            />

            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Rows:</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded bg-white border text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded bg-white border text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ---- Bulk Status Update Dialog ---- */}
      <Dialog open={showBulkStatusModal} onOpenChange={(o) => { if (!o && !bulkLoading) { setShowBulkStatusModal(false); setBulkStatus(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Truck className="w-4 h-4 text-purple-600" />
              Update Status — {selectedIds.size} Shipment{selectedIds.size !== 1 ? 's' : ''}
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

      <Dialog open={showBulkNumberModal} onOpenChange={(o) => { if (!o && !bulkLoading) setShowBulkNumberModal(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-blue-600" />
              Update Shipment Numbers — {selectedIds.size} Shipment{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              New shipment numbers will be auto-generated for all selected shipments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkNumberModal(false)} disabled={bulkLoading}>
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
              <Package className="w-4 h-4 text-blue-500" />
              Sale Items — {itemsModal?.label}
            </DialogTitle>
          </DialogHeader>
          {itemsModal?.loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
                        <div className="font-medium">{item.product?.name || item.productName || '—'}</div>
                        {(item.product?.sku || item.sku) && (
                          <div className="text-xs text-gray-400">{item.product?.sku || item.sku}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-sm text-right">
                        {item.discount > 0 ? formatCurrency(item.discount) : '—'}
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
            const response = await createCourierShipment(data);
            if (!response?.success) {
              toast.error(response?.message || 'Failed to create shipment');
            }
            return response;
          }}
          courierServices={courierServices}
          variant="blue"
        />
      )}

      {editingShipment && (
        <CourierShipmentModal
          onClose={() => setEditingShipment(null)}
          onSave={async (data) => {
            const response = await updateCourierShipment(editingShipment.id, data);
            if (!response?.success) {
              toast.error(response?.message || 'Failed to update shipment');
            }
            return response;
          }}
          courierServices={courierServices}
          variant="blue"
          initialData={editingShipment}
        />
      )}

      {showTrackingModal && selectedShipment && (
        <TrackingModal
          shipment={selectedShipment}
          onClose={() => setShowTrackingModal(false)}
          variant="blue"
        />
      )}

      {showLabelModal && selectedShipment && (
        <LabelDownloadModal
          shipment={selectedShipment}
          onClose={() => setShowLabelModal(false)}
          onPrint={(size, format) => handlePrintLabel(selectedShipment, size, format)}
          variant="blue"
        />
      )}

      {showBulkLabelModal && (
        <BulkLabelModal
          shipmentCount={selectedIds.size}
          onClose={() => { if (!bulkLoading) setShowBulkLabelModal(false); }}
          onPrint={handleBulkPrint}
          onDownload={handleBulkDownload}
          variant="blue"
          loading={bulkLoading}
        />
      )}

      {showScanBulkModal && (
        <ScanBulkStatusModal
          courierSettings={courierSettings}
          onClose={() => setShowScanBulkModal(false)}
          onComplete={() => reloadShipments()}
        />
      )}

      {showCsvModal && (
        <BranchCsvImportModal
          courierServices={courierServices}
          onClose={() => setShowCsvModal(false)}
          onImported={() => {
            setShowCsvModal(false);
            setPage(1);
            reloadShipments();
          }}
          fetchData={fetchData}
        />
      )}
    </div>
  );
};

// ─── CSV Import Modal ─────────────────────────────────────────────────────────
const BranchCsvImportModal = ({
  courierServices,
  onClose,
  onImported,
  fetchData
}: {
  courierServices: any[];
  onClose: () => void;
  onImported: () => void;
  fetchData: (opts: any) => Promise<any>;
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const { getBranches } = useLocationHook();
  const [courierServiceId, setCourierServiceId] = useState('');
  const [pickupLocationId, setPickupLocationId] = useState(user?.locationId || '');
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importPreview, setImportPreview] = useState<BulkImportPreviewResult | null>(null);
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.locationId && !pickupLocationId) {
      setPickupLocationId(user.locationId);
    }
  }, [user?.locationId]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await getBranches();
        const list: any[] = (res as any)?.data?.locations || (res as any)?.data?.branches || (res as any)?.data || [];
        const mapped = list.map((b: any) => ({ id: b.id, name: b.name }));
        setBranches(mapped);
        if (mapped.length === 1 && !pickupLocationId) {
          setPickupLocationId(mapped[0].id);
        }
      } catch {
        // silent
      }
    };
    loadBranches();
  }, []);

  const resolvedPickupLocationId = pickupLocationId || user?.locationId || '';

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
    if (!resolvedPickupLocationId) {
      toast.error('Please select a pickup branch.');
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
    if (!resolvedPickupLocationId) {
      toast.error('Please select a pickup branch.');
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courierServiceId', courierServiceId);
      formData.append('pickupLocationId', resolvedPickupLocationId);
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
        contentType: 'multipart/form-data'
      });
      if (res?.success) {
        const createdCount = Array.isArray(res.data.created) ? res.data.created.length : Number(res.data.created) || 0;
        setResult({ created: createdCount, errors: res.data.errors || [] });
        if ((res.data.errors || []).length === 0) {
          toast.success(`Imported ${createdCount} shipments`);
        }
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={importPreview ? 'max-w-2xl sm:max-w-2xl overflow-hidden flex flex-col' : 'max-w-lg'}>
        <DialogHeader className={importPreview ? 'shrink-0' : undefined}>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Courier Service *</label>
              <select
                value={courierServiceId}
                onChange={(e) => setCourierServiceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select courier service...</option>
                {courierServices.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Branch (stock &amp; sale) *</label>
              <select
                value={pickupLocationId}
                onChange={(e) => setPickupLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CSV or Excel File *</label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <FileText className="w-5 h-5 text-blue-500" />
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
              <span>Use Fardar-format CSV/Excel. Repeat the same Order ID on multiple rows for multi-product orders. </span>
              <button onClick={handleDownloadSample} className="underline font-medium hover:text-blue-900">
                Download sample
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">{result.created} shipments imported</p>
                {result.errors.length > 0 && (
                  <p className="text-sm text-yellow-700 mt-0.5">{result.errors.length} rows had errors</p>
                )}
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs p-2 bg-red-50 text-red-700 rounded">
                    Row {e.row}: {e.message}
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
                  !courierServiceId
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {previewing ? 'Checking customers...' : 'Review & Import'}
              </Button>
            </>
          ) : (
            <Button onClick={onImported} className="bg-blue-600 hover:bg-blue-700">Done</Button>
          )}
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Courier Shipments Table Component
const CourierShipmentsTable = ({
  shipments,
  onViewTracking,
  onDownloadLabel,
  onViewItems,
  onDelete,
  onEditShipment,
  getStatusBadge,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  page,
  pageSize,
  totalCount
}: {
  shipments: CourierShipment[];
  onViewTracking: (shipment: CourierShipment) => void;
  onDownloadLabel: (shipment: CourierShipment) => void;
  onViewItems: (shipment: CourierShipment) => void;
  onDelete: (shipment: CourierShipment) => void;
  onEditShipment: (shipment: CourierShipment) => void;
  getStatusBadge: (status: CourierShipmentStatus) => React.ReactElement;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  page?: number;
  pageSize?: number;
  totalCount?: number;
}) => {
 
  const allSelected = shipments.length > 0 && shipments.every(s => selectedIds.has(s.id));

  if (shipments.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium">No shipments found</p>
        <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or create a new shipment</p>
      </div>
    );
  }

  const isPending = (status: CourierShipmentStatus) =>
    status === CourierShipmentStatus.PENDING || status === CourierShipmentStatus.PENDING_PICKUP;

  const isFailed = (status: CourierShipmentStatus) =>
    status === CourierShipmentStatus.FAILED_DELIVERY || status === CourierShipmentStatus.DELIVERY_FAILED;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-3 py-3 w-10">
              <button onClick={onToggleSelectAll} className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors">
                {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
              </button>
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Shipment
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Recipient
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Courier
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Tracking
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {shipments.map((shipment) => (
            <tr 
              key={shipment.id} 
              className={`transition-colors ${
                isPending(shipment.status)
                  ? 'bg-amber-50/60 hover:bg-amber-50'
                  : isFailed(shipment.status)
                  ? 'bg-red-50/40 hover:bg-red-50/60'
                  : 'hover:bg-gray-50/80'
              }`}
            >
              <td className="px-3 py-3.5 w-10">
                <button onClick={() => onToggleSelect(shipment.id)} className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors">
                  {selectedIds.has(shipment.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                </button>
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">{shipment.shipmentNumber}</span>
              </td>
              <td className="px-5 py-3.5">
                <div className="text-sm font-medium text-gray-900">{shipment.recipientName}</div>
                <div className="text-xs text-gray-400 mt-0.5">{shipment.recipientCity}</div>
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                <span className="text-sm text-gray-700">{shipment.courier?.name || 'N/A'}</span>
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                {(() => {
                  const tracking = shipment.trackingNumber?.trim();
                  const awb = shipment.awb_number?.trim();
                  if (!tracking && !awb) return <span className="text-sm text-gray-400">—</span>;
                  const showBoth = !!(tracking && awb && tracking !== awb);
                  return (
                    <div className="space-y-0.5">
                      {tracking && (
                        <div className="text-sm text-gray-600 font-mono">{tracking}</div>
                      )}
                      {showBoth && (
                        <div className="text-xs text-gray-500 font-mono">AWB: {awb}</div>
                      )}
                      {!tracking && awb && (
                        <div className="text-sm text-gray-600 font-mono">{awb}</div>
                      )}
                    </div>
                  );
                })()}
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                {getStatusBadge(shipment.status)}
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">
                  Rs. {(shipment.codAmount || shipment.declaredValue || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-1">
                  {shipment.saleId && (
                    <button
                      onClick={() => onViewItems(shipment)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Sale Items"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEditShipment(shipment)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Shipment"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onViewTracking(shipment)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Tracking"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDownloadLabel(shipment)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Download Label"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(shipment)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30">
        <p className="text-xs text-gray-400">
          {totalCount && page && pageSize
            ? `Showing ${(page - 1) * pageSize + 1}-${(page - 1) * pageSize + shipments.length} of ${totalCount}`
            : `Showing ${shipments.length} shipment${shipments.length !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  );
};

export default BranchCourierPage;
