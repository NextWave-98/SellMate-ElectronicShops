/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Truck, MapPin, Search, Eye, Plus, Clock, CheckCircle,
  XCircle, AlertCircle, Download, FileText, Printer, RefreshCw,
  DollarSign, ArrowUpRight, CheckSquare, Square, X, Pencil, ScanLine, Tag
} from 'lucide-react';
import useFetch  from '../../hooks/useFetch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { formatCurrency } from '@/utils/currency';
import useCourier, {
  type CourierShipment,
  CourierShipmentStatus,
} from '../../hooks/useCourier';
import toast from 'react-hot-toast';
import { printPdfBlob, ensurePdfBlob } from '@/utils/printPdf';
import { CourierShipmentModal, TrackingModal, LabelDownloadModal, BulkLabelModal, ScanBulkStatusModal } from '../../components/courier/modals';
import { useCourierModalVariant } from '@/hooks/useCourierModalVariant';
import PendingApprovalShipments from '../../components/courier/PendingApprovalShipments';

/** Stable identity — must not be recreated each render. */
const ORG_SHIPMENT_SCOPE = { scope: 'org' as const };

const CourierPage = () => {
  const courierVariant = useCourierModalVariant();
  const [activeTab, setActiveTab] = useState<'shipments' | 'pending-approval'>('shipments');
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showBulkLabelModal, setShowBulkLabelModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<CourierShipment | null>(null);
  const [editingShipment, setEditingShipment] = useState<CourierShipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkNumberModal, setShowBulkNumberModal] = useState(false);
  const [showScanBulkModal, setShowScanBulkModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [itemsModal, setItemsModal] = useState<{ label: string; loading: boolean; items: any[] } | null>(null);

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
    bulkUpdateShipmentNumbers,
  } = useCourier();

  const buildShipmentFilters = useCallback(() => {
    const filters: Record<string, any> = { page, limit: pageSize };
    if (statusFilter) filters.status = statusFilter;
    if (searchTerm) filters.search = searchTerm;
    return filters;
  }, [page, pageSize, statusFilter, searchTerm]);

  const reloadShipments = useCallback(
    () => fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE),
    [fetchCourierShipments, buildShipmentFilters],
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourierShipments(buildShipmentFilters(), ORG_SHIPMENT_SCOPE);
    }, searchTerm ? 400 : 0);
    return () => clearTimeout(timer);
  }, [page, pageSize, statusFilter, searchTerm]);

  useEffect(() => {
    fetchCourierServices();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reloadShipments();
      toast.success('Refreshed');
    } catch { /* ignore */ } finally {
      setRefreshing(false);
    }
  };

  const stats = useMemo(() => {
    const pending = courierShipments.filter(s => s.status === CourierShipmentStatus.PENDING || s.status === CourierShipmentStatus.PENDING_PICKUP);
    const inTransit = courierShipments.filter(s => s.status === CourierShipmentStatus.IN_TRANSIT || s.status === CourierShipmentStatus.OUT_FOR_DELIVERY || s.status === CourierShipmentStatus.PICKED_UP);
    const delivered = courierShipments.filter(s => s.status === CourierShipmentStatus.DELIVERED);
    const totalRevenue = courierShipments.reduce((sum, s) => sum + (s.codAmount || s.declaredValue || 0), 0);
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

  const handleEditShipment = (shipment: CourierShipment) => {
    setEditingShipment(shipment);
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
    format: 'standard' | 'fragile' | 'normal_post' = 'standard'
  ) => {
    try {
      const labelIdentifier = encodeURIComponent(shipment.shipmentNumber || shipment.id);
      const response = await fetchData({
        endpoint: `/courier/shipments/${labelIdentifier}/label/print?size=${size}&format=${format}`,
        responseType: 'blob',
        method: 'GET',
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
      console.error('Failed to print label:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to print label');
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

  const totalPages = Math.max(1, shipmentsTotalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedShipments = courierShipments;

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

  const handleBulkDownload = async (
    size: 'xsm' | 'sm' | 'md' = 'md',
    format: 'standard' | 'fragile' | 'normal_post' = 'fragile',
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
    format: 'standard' | 'fragile' | 'normal_post' = 'fragile',
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

  const quickFilters = [
    { label: 'All', value: '', count: statusFilter === '' ? shipmentsTotal : undefined },
    { label: 'Pending', value: CourierShipmentStatus.PENDING, count: statusFilter === CourierShipmentStatus.PENDING ? shipmentsTotal : undefined },
    { label: 'In Transit', value: CourierShipmentStatus.IN_TRANSIT, count: statusFilter === CourierShipmentStatus.IN_TRANSIT ? shipmentsTotal : undefined },
    { label: 'Delivered', value: CourierShipmentStatus.DELIVERED, count: statusFilter === CourierShipmentStatus.DELIVERED ? shipmentsTotal : undefined },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-orange-600" />
            Courier Management
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
            onClick={() => setShowScanBulkModal(true)}
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <ScanLine className="w-4 h-4" />
            Scan &amp; Bulk Update
          </Button>
          <Button
            onClick={() => setShowShipmentModal(true)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" />
            New Shipment
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl p-1 self-start w-fit">
        <button
          onClick={() => setActiveTab('shipments')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'shipments'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-white/60'
          }`}
        >
          <Truck className="w-4 h-4" />
          All Shipments
        </button>
        <button
          onClick={() => setActiveTab('pending-approval')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'pending-approval'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-gray-600 hover:bg-white/60'
          }`}
        >
          <Tag className="w-4 h-4" />
          Pending Approval
        </button>
      </div>

      {/* Pending Approval Panel */}
      {activeTab === 'pending-approval' && (
        <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base font-bold text-gray-800">Discount Orders Awaiting Approval</h2>
              <p className="text-xs text-gray-500">Orders created by staff with a discount — review and approve to send to courier</p>
            </div>
          </div>
          <PendingApprovalShipments />
        </div>
      )}

      {activeTab === 'shipments' && <>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-xl hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-orange-50 p-2.5 rounded-lg">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </Card>

        <div className={`rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
          stats.pending > 0 
            ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200' 
            : 'bg-white/40 backdrop-blur-sm border-white/20'
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
            <div className={`p-2.5 rounded-lg ${stats.pending > 0 ? 'bg-amber-100' : 'bg-white/30'}`}>
              <Clock className={`w-5 h-5 ${stats.pending > 0 ? 'text-amber-600 animate-pulse' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>

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
        <div className="p-4 border-b border-white/20 bg-white/20 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              {quickFilters.map(qf => (
                <button
                  key={qf.label}
                  onClick={() => setStatusFilter(qf.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    statusFilter === qf.value
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-white/40 backdrop-blur-sm text-gray-600 border border-white/40 hover:bg-white/60'
                  }`}
                >
                  {qf.label}
                  {qf.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    statusFilter === qf.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {qf.count}
                  </span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search shipments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {selectedIds.size} shipment{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-1 p-0.5 text-orange-400 hover:text-orange-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkLabelModal(true)}
                disabled={bulkLoading}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <Printer className="w-3.5 h-3.5" />
                Bulk Labels
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Loading shipments...</p>
          </div>
        ) : (
          <div>
            <CourierShipmentsTable
              shipments={paginatedShipments}
              onViewTracking={handleViewTracking}
              onDownloadLabel={handleDownloadLabel}
              onViewItems={handleViewItems}
              onEditShipment={handleEditShipment}
              getStatusBadge={getStatusBadge}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              page={page}
              pageSize={pageSize}
              totalCount={shipmentsTotal}
            />

            <div className="px-4 py-3 border-t border-white/20 bg-white/20 backdrop-blur-sm flex items-center justify-between">
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

      {/* Sale Items Dialog */}
      <Dialog open={!!itemsModal} onOpenChange={(o) => { if (!o) setItemsModal(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-orange-500" />
              Sale Items — {itemsModal?.label}
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
                  <TableRow className="bg-white/30 backdrop-blur-sm">
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
          variant={courierVariant}
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
          variant={courierVariant}
          initialData={editingShipment}
        />
      )}

      {showScanBulkModal && (
        <ScanBulkStatusModal
          onClose={() => setShowScanBulkModal(false)}
          onComplete={() => reloadShipments()}
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

      </> /* end activeTab === 'shipments' */}
    </div>
  );
};

// Courier Shipments Table Component
const CourierShipmentsTable = ({
  shipments,
  onViewTracking,
  onDownloadLabel,
  onViewItems,
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
        <div className="bg-white/30 backdrop-blur-sm w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
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
          <tr className="border-b border-white/20">
            <th className="px-3 py-3 w-10">
              <button onClick={onToggleSelectAll} className="p-0.5 text-gray-400 hover:text-orange-600 transition-colors">
                {allSelected ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4" />}
              </button>
            </th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Shipment</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Recipient</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Courier</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tracking</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/20">
          {shipments.map((shipment) => (
            <tr
              key={shipment.id}
              className={`transition-colors ${
                isPending(shipment.status)
                  ? 'bg-amber-50/60 hover:bg-amber-50'
                  : isFailed(shipment.status)
                  ? 'bg-red-50/40 hover:bg-red-50/60'
                  : 'hover:bg-white/30'
              }`}
            >
              <td className="px-3 py-3.5 w-10">
                <button onClick={() => onToggleSelect(shipment.id)} className="p-0.5 text-gray-400 hover:text-orange-600 transition-colors">
                  {selectedIds.has(shipment.id) ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4" />}
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
                <span className="text-sm text-gray-600 font-mono">{shipment.trackingNumber || (shipment as any).awb_number || '-'}</span>
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
                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="View Tracking"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDownloadLabel(shipment)}
                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Download Label"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-3 border-t border-white/20 bg-white/10 backdrop-blur-sm">
        <p className="text-xs text-gray-400">
          {totalCount && page && pageSize
            ? `Showing ${(page - 1) * pageSize + 1}-${(page - 1) * pageSize + shipments.length} of ${totalCount}`
            : `Showing ${shipments.length} shipment${shipments.length !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  );
};

export default CourierPage;
