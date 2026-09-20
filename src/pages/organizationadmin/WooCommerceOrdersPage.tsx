/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, ShoppingBag, Download, CheckCircle, XCircle, Clock, AlertCircle, Search, ChevronLeft, ChevronRight, Truck, Zap, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import useCourier from '../../hooks/useCourier';
import { CourierShipmentModal } from '../../components/courier/modals';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface WooOrderLineItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  total: string;
  // Resolved by the backend against local inventory (same matching as stock deduction)
  localProductId?: string;
  localName?: string;
  localSku?: string;
  localUnitPrice?: number;
  availableStock?: number;
}

type ShipmentPaymentMethod = 'cod' | 'bank' | 'online' | 'koko' | 'mintpay' | 'payzy';

/** Map WooCommerce payment slug + title to our courier shipment payment method. */
const mapWooPaymentMethod = (order: {
  payment_method?: string;
  payment_method_title: string;
}): ShipmentPaymentMethod => {
  const slug = (order.payment_method || '').toLowerCase();
  const title = (order.payment_method_title || '').toLowerCase();
  if (slug.includes('darazbnpl') || slug.includes('koko') || title.includes('koko')) return 'koko';
  if (slug.includes('mintpay') || title.includes('mintpay')) return 'mintpay';
  if (slug.includes('payzy') || title.includes('payzy')) return 'payzy';
  if (slug === 'cod' || title.includes('cash on delivery') || title.includes('cod')) return 'cod';
  if (slug === 'bacs' || title.includes('bank') || title.includes('transfer') || title.includes('wire')) return 'bank';
  if (
    title.includes('card') || title.includes('stripe') || title.includes('paypal') ||
    title.includes('credit') || slug.includes('onepay') || title.includes('onepay')
  ) return 'online';
  return 'cod';
};

const getWooShippingTotal = (order: WooOrder) =>
  (order.shipping_lines || []).reduce((sum, line) => sum + (parseFloat(line.total) || 0), 0);

const getWooRecipient = (order: WooOrder) => {
  const ship = order.shipping;
  const bill = order.billing;
  const useShipping = !!(ship?.address_1 || ship?.city);
  const src = useShipping && ship ? ship : bill;
  const addressParts = [src.address_1, src.address_2].filter(Boolean);
  return {
    recipientName:
      `${src.first_name} ${src.last_name}`.trim() ||
      `${bill.first_name} ${bill.last_name}`.trim() ||
      'Customer',
    recipientPhone: bill.phone || ship?.phone || '',
    recipientEmail: bill.email || '',
    recipientAddress: addressParts.join(', ') || src.city || bill.city || 'N/A',
    recipientCity: src.city || bill.city || 'N/A',
  };
};

const buildWooSaleItems = (order: WooOrder) =>
  order.line_items
    .filter((li) => li.localProductId)
    .map((li) => ({
      productId: li.localProductId!,
      name: li.localName || li.name,
      quantity: li.quantity,
      unitPrice:
        li.quantity > 0
          ? parseFloat(li.total) / li.quantity
          : parseFloat(li.total) || li.localUnitPrice || 0,
      costPrice: 0,
    }));

const buildWooShipmentPayload = (
  order: WooOrder,
  importedSaleId: string | null | undefined,
  defaultService?: { id: string }
) => {
  const paymentMethod = mapWooPaymentMethod(order);
  const isCod = paymentMethod === 'cod';
  const orderTotal = parseFloat(order.total) || 0;
  const shippingTotal = getWooShippingTotal(order);
  const recipient = getWooRecipient(order);
  const saleItems = buildWooSaleItems(order);
  const productsSubtotal = order.line_items.reduce((s, li) => s + (parseFloat(li.total) || 0), 0);
  const txnRef = order.transaction_id || undefined;

  const payload: Record<string, unknown> = {
    saleId: importedSaleId || undefined,
    ...recipient,
    deliveryMethod: 'STANDARD',
    shippingCharge: shippingTotal,
    insuranceCharge: 0,
    additionalCharges: 0,
    totalCharge: shippingTotal,
    declaredValue: productsSubtotal,
    paymentMethod,
    codEnabled: isCod,
    codAmount: isCod ? orderTotal : 0,
    description: `WooCommerce Order #${order.number}`,
    numberOfPieces: order.line_items.reduce((s, li) => s + li.quantity, 0) || 1,
    deliveryInstructions: order.customer_note || undefined,
    notes: `WooCommerce #${order.number} · ${order.payment_method_title}${txnRef ? ` · TXN ${txnRef}` : ''}`,
    paymentDescription: txnRef,
  };

  if (saleItems.length > 0) payload.saleItems = saleItems;
  if (defaultService?.id) payload.courierServiceId = defaultService.id;

  // Bank/online with WooCommerce date_paid → mark payment confirmed
  if (order.date_paid && (paymentMethod === 'bank' || paymentMethod === 'online')) {
    payload.paymentConfirmed = true;
    payload.paymentConfirmedAmount = orderTotal;
  }

  return payload;
};

interface WooOrder {
  id: number;
  number: string;
  status: string;
  systemStatus?: string | null;
  systemStatusSource?: 'shipment' | 'sale' | null;
  shipmentStatus?: string | null;
  date_created: string;
  date_paid?: string | null;
  total: string;
  currency: string;
  payment_method?: string;
  transaction_id?: string;
  customer_note?: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    city: string;
    address_1: string;
    address_2?: string;
  };
  shipping?: {
    first_name: string;
    last_name: string;
    phone?: string;
    city: string;
    address_1: string;
    address_2?: string;
  };
  shipping_lines?: Array<{ total: string; method_title?: string }>;
  line_items: WooOrderLineItem[];
  payment_method_title: string;
  alreadyImported?: boolean;
  importedSaleId?: string | null;
  shipmentCreated?: boolean;
  shipmentNumber?: string | null;
}

interface ImportResult {
  wooOrderId: number;
  wooOrderNumber: string;
  deducted: Array<{ name: string; sku: string; quantity: number }>;
  skipped: Array<{ name: string; sku: string; reason: string }>;
  alreadyImported?: boolean;
  importedSaleId?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  'ready-to-ship': 'bg-teal-100 text-teal-800',
  'on-hold': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PENDING_PICKUP: 'bg-yellow-100 text-yellow-800',
  PICKED_UP: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED_DELIVERY: 'bg-red-100 text-red-800',
  DELIVERY_FAILED: 'bg-red-100 text-red-800',
  RETURNED_TO_SENDER: 'bg-orange-100 text-orange-800',
  RETURNED: 'bg-orange-100 text-orange-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  processing: <RefreshCw className="w-3 h-3" />,
  'ready-to-ship': <Truck className="w-3 h-3" />,
  'on-hold': <AlertCircle className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
  refunded: <XCircle className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  PENDING: <Clock className="w-3 h-3" />,
  PENDING_PICKUP: <Clock className="w-3 h-3" />,
  PICKED_UP: <RefreshCw className="w-3 h-3" />,
  IN_TRANSIT: <RefreshCw className="w-3 h-3" />,
  OUT_FOR_DELIVERY: <Truck className="w-3 h-3" />,
  DELIVERED: <CheckCircle className="w-3 h-3" />,
  FAILED_DELIVERY: <XCircle className="w-3 h-3" />,
  DELIVERY_FAILED: <XCircle className="w-3 h-3" />,
  RETURNED_TO_SENDER: <AlertCircle className="w-3 h-3" />,
  RETURNED: <AlertCircle className="w-3 h-3" />,
  ON_HOLD: <AlertCircle className="w-3 h-3" />,
  CANCELLED: <XCircle className="w-3 h-3" />,
};

const getDisplayStatus = (order: WooOrder) => order.systemStatus ?? order.status;

const getStatusColor = (status: string) =>
  STATUS_COLORS[status] ?? STATUS_COLORS[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600';

const getStatusIcon = (status: string) =>
  STATUS_ICON[status] ?? STATUS_ICON[status.toLowerCase()] ?? <Clock className="w-3 h-3" />;

const canShipWooOrder = (order: WooOrder) =>
  !order.shipmentCreated &&
  (order.alreadyImported || order.status === 'ready-to-ship' || order.status === 'processing');

const WooCommerceOrdersPage = () => {
  const [orders, setOrders] = useState<WooOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [limit, setLimit] = useState(20);

  const [statusFilter, setStatusFilter] = useState('any');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Per-order import state
  const [importStatuses, setImportStatuses] = useState<Record<number, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [importResults, setImportResults] = useState<Record<number, ImportResult>>({});
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  // Per-order direct shipment loading state
  const [shipLoading, setShipLoading] = useState<Record<number, boolean>>({});

  // Full courier modal state
  const [shipOrder, setShipOrder] = useState<WooOrder | null>(null);

  const { fetchData } = useFetch();
  const { courierServices, fetchCourierServices, createCourierShipment } = useCourier();

  useEffect(() => {
    fetchCourierServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = useCallback(async (pg = page, st = statusFilter, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(limit),
      });
      if (st && st !== 'any') params.set('status', st);
      if (q) params.set('search', q);

      const res = await fetchData({
        method: 'GET',
        endpoint: `/woocommerce/orders?${params.toString()}`,
        silent: true,
      });

      if (res?.success && res.data) {
        const rawData = res.data as any;
        let ordersData: WooOrder[] = [];
        if (Array.isArray(rawData)) {
          ordersData = rawData;
        } else if (Array.isArray(rawData.orders)) {
          ordersData = rawData.orders;
        } else if (rawData.orders && typeof rawData.orders === 'object' && rawData.orders.message) {
          // WooCommerce host returned an error object (e.g. Imunify360 bot-protection block)
          toast.error(`WooCommerce blocked: ${rawData.orders.message}`);
        }
        setOrders(ordersData);
        const pag = rawData.pagination;
        if (pag) {
          setTotalOrders(pag.total ?? 0);
          setTotalPages(pag.totalPages ?? 1);
        }
      } else {
        toast.error(res?.message ?? 'Failed to load orders');
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, statusFilter, search, limit]);

  useEffect(() => {
    loadOrders(page, statusFilter, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search, limit]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleStatusChange = (s: string) => {
    setPage(1);
    setStatusFilter(s);
  };

  const handleImport = async (order: WooOrder): Promise<ImportResult | null> => {
    setImportStatuses((prev) => ({ ...prev, [order.id]: 'loading' }));
    const res = await fetchData({
      method: 'POST',
      endpoint: `/woocommerce/orders/${order.id}/import`,
      silent: true,
    });

    if (res?.success && res.data) {
      const data = res.data as ImportResult;
      setImportStatuses((prev) => ({ ...prev, [order.id]: 'success' }));
      setImportResults((prev) => ({ ...prev, [order.id]: data }));
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                alreadyImported: true,
                importedSaleId: data.importedSaleId ?? o.importedSaleId ?? null,
              }
            : o
        )
      );
      if (data.alreadyImported) {
        toast.success(`Order #${data.wooOrderNumber}: already imported   stock not deducted again`);
      } else {
        toast.success(`Order #${data.wooOrderNumber}: ${data.deducted.length} item(s) deducted from inventory`);
      }
      return data;
    }

    setImportStatuses((prev) => ({ ...prev, [order.id]: 'error' }));
    toast.error(res?.message ?? 'Failed to import order');
    return null;
  };

  const ensureOrderImported = async (order: WooOrder): Promise<WooOrder> => {
    if (order.alreadyImported && order.importedSaleId) return order;
    const result = await handleImport(order);
    if (!result) throw new Error('Import failed');
    return {
      ...order,
      alreadyImported: true,
      importedSaleId: result.importedSaleId ?? order.importedSaleId ?? null,
    };
  };

  const handleOpenFullCourier = async (order: WooOrder) => {
    setShipLoading((prev) => ({ ...prev, [order.id]: true }));
    try {
      let readyOrder = order;
      try {
        readyOrder = await ensureOrderImported(order);
      } catch {
        return;
      }

      const unresolved = readyOrder.line_items.filter((li) => !li.localProductId);
      if (unresolved.length > 0) {
        toast.error(
          `Order #${readyOrder.number}: ${unresolved.length} product(s) not mapped to local inventory   sync WooCommerce products first`
        );
        return;
      }

      setShipOrder(readyOrder);
    } finally {
      setShipLoading((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleDirectShip = async (order: WooOrder) => {
    setShipLoading((prev) => ({ ...prev, [order.id]: true }));
    try {
      let readyOrder = order;
      try {
        readyOrder = await ensureOrderImported(order);
      } catch {
        return;
      }

      if (!readyOrder.billing.phone && !readyOrder.shipping?.phone) {
        toast.error(`Order #${readyOrder.number}: recipient phone is required to create a shipment`);
        return;
      }

      const unresolved = readyOrder.line_items.filter((li) => !li.localProductId);
      if (unresolved.length > 0) {
        toast.error(
          `Order #${readyOrder.number}: ${unresolved.length} product(s) not mapped to local inventory   sync WooCommerce products first`
        );
        return;
      }

      const defaultService =
        courierServices.find((s: any) => s.isDefault || s.is_default) ?? courierServices[0];

      const paymentMethod = mapWooPaymentMethod(readyOrder);
      const payload = buildWooShipmentPayload(readyOrder, readyOrder.importedSaleId, defaultService);

      if (!payload.courierServiceId && !defaultService) {
        toast.error('No courier service available. Please configure a courier service first.');
        return;
      }

      const response = await createCourierShipment(payload);
      if (response?.success) {
        toast.success(`Shipment created for order #${readyOrder.number} (${paymentMethod.toUpperCase()})`);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === readyOrder.id
              ? {
                  ...o,
                  alreadyImported: true,
                  importedSaleId: readyOrder.importedSaleId ?? o.importedSaleId,
                  shipmentCreated: true,
                  shipmentNumber:
                    (response.data as any)?.shipment_number ??
                    (response.data as any)?.shipmentNumber ??
                    null,
                }
              : o
          )
        );
      } else {
        toast.error(response?.message || 'Failed to create shipment');
      }
    } finally {
      setShipLoading((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5 mx-1 sm:mx-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">WooCommerce Orders</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Fetch orders from WooCommerce and deduct inventory automatically
          </p>
        </div>
        <Button
          onClick={() => loadOrders(page, statusFilter, search)}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex flex-1 gap-2">
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by customer / order number..."
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              className="bg-orange-500 hover:bg-orange-600"
              size="icon"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="any">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="ready-to-ship">Ready to Ship</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </CardContent>
      </Card>

      {/* Orders table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ShoppingBag className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/30 backdrop-blur-sm border-b border-white/20">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Items</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Payment</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Inventory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {(Array.isArray(orders) ? orders : []).map((order) => {
                  const impStatus = importStatuses[order.id] ?? 'idle';
                  const impResult = importResults[order.id];
                  const isExpanded = expandedOrder === order.id;
                  const displayStatus = getDisplayStatus(order);

                  return (
                    <>
                      <tr
                        key={order.id}
                        className="hover:bg-white/30 cursor-pointer transition-colors"
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      >
                        <td className="px-4 py-3 font-mono text-gray-700">#{order.number}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">
                            {order.billing.first_name} {order.billing.last_name}
                          </div>
                          <div className="text-xs text-gray-400">{order.billing.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}
                          >
                            {getStatusIcon(displayStatus)}
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.line_items.length} item{order.line_items.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {order.currency} {parseFloat(order.total).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(order.date_created)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {order.payment_method_title}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {(canShipWooOrder(order) || impStatus === 'success') ? (
                            <div className="flex flex-col gap-1 items-center">
                              {(order.alreadyImported || impStatus === 'success') && (
                                <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  {impStatus === 'success' && impResult
                                    ? `${impResult.deducted.length} deducted`
                                    : 'Imported'}
                                </span>
                              )}
                              {(order.shipmentCreated) ? (
                                <span className="inline-flex items-center gap-1 text-purple-600 text-xs font-medium border border-purple-200 bg-purple-50 rounded px-2 py-0.5">
                                  <Truck className="w-3 h-3" />
                                  {order.shipmentNumber ? `#${order.shipmentNumber}` : 'Shipment Created'}
                                </span>
                              ) : (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50"
                                      disabled={shipLoading[order.id]}
                                    >
                                      {shipLoading[order.id]
                                        ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                        : <Truck className="w-3 h-3 mr-1" />}
                                      {shipLoading[order.id] ? 'Creating...' : 'Ready to Ship'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-52 p-2" align="end">
                                    <p className="text-xs font-semibold text-gray-500 uppercase px-2 pb-1">Create Shipment</p>
                                    <button
                                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                      onClick={() => handleDirectShip(order)}
                                    >
                                      <Zap className="w-4 h-4 text-blue-500 shrink-0" />
                                      <div className="text-left">
                                        <div className="font-medium leading-none">Quick Ship</div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                          Create instantly · {mapWooPaymentMethod(order).toUpperCase()}
                                        </div>
                                      </div>
                                    </button>
                                    <button
                                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                      onClick={() => handleOpenFullCourier(order)}
                                    >
                                      <Settings2 className="w-4 h-4 text-purple-500 shrink-0" />
                                      <div className="text-left">
                                        <div className="font-medium leading-none">Full Courier</div>
                                        <div className="text-xs text-gray-400 mt-0.5">Open form &amp; choose courier</div>
                                      </div>
                                    </button>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          ) : impStatus === 'loading' ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 text-xs">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Processing...
                            </span>
                          ) : impStatus === 'error' ? (
                            <span className="inline-flex items-center gap-1 text-red-500 text-xs">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleImport(order)}
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600 text-xs"
                            >
                              <Download className="w-3 h-3" />
                              Deduct Stock
                            </Button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr key={`${order.id}-detail`} className="bg-white/20 backdrop-blur-sm">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Line items */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                  Line Items
                                </p>
                                <div className="space-y-1">
                                  {order.line_items.map((li) => (
                                    <div key={li.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                      <span className="text-gray-700">{li.name}</span>
                                      <span className="flex gap-3 text-gray-500">
                                        {li.sku && <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{li.sku}</span>}
                                        <span>x{li.quantity}</span>
                                        <span className="font-medium text-gray-800">{order.currency} {parseFloat(li.total).toFixed(2)}</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Import result */}
                              {impResult && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                    Inventory Deduction Result
                                  </p>
                                  {impResult.deducted.length > 0 && (
                                    <div className="mb-2">
                                      <p className="text-xs text-green-600 font-medium mb-1">✓ Deducted</p>
                                      {impResult.deducted.map((d, i) => (
                                        <div key={i} className="text-xs text-gray-600">
                                          {d.name}   qty {d.quantity}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {impResult.skipped.length > 0 && (
                                    <div>
                                      <p className="text-xs text-red-500 font-medium mb-1">✗ Skipped</p>
                                      {impResult.skipped.map((s, i) => (
                                        <div key={i} className="text-xs text-gray-500">
                                          {s.name}   {s.reason}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/20 bg-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{totalOrders} order{totalOrders !== 1 ? 's' : ''} total</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {[5, 10, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Full Courier Modal   pre-filled from WooCommerce order */}
      {shipOrder && (() => {
        const recipient = getWooRecipient(shipOrder);
        const paymentMethod = mapWooPaymentMethod(shipOrder);
        const shippingTotal = getWooShippingTotal(shipOrder);
        const productsSubtotal = shipOrder.line_items.reduce((s, li) => s + (parseFloat(li.total) || 0), 0);
        const orderTotal = parseFloat(shipOrder.total) || 0;
        const txnRef = shipOrder.transaction_id || '';
        const isPrepaidOnline = paymentMethod === 'bank' || paymentMethod === 'online';

        return (
        <CourierShipmentModal
          variant="blue"
          courierServices={courierServices}
          initialPaymentMethod={paymentMethod}
          initialPaymentDescription={txnRef || undefined}
          initialPaymentConfirmed={isPrepaidOnline && !!shipOrder.date_paid}
          initialPaymentConfirmedAmount={isPrepaidOnline && shipOrder.date_paid ? orderTotal : undefined}
          initialProducts={shipOrder.line_items.map((li) => ({
            productId: li.localProductId,
            name: li.localName || li.name,
            sku: li.localSku || li.sku,
            quantity: li.quantity,
            unitPrice: li.quantity > 0 ? parseFloat(li.total) / li.quantity : 0,
          }))}
          initialData={{
            ...recipient,
            shippingCharge: shippingTotal,
            declaredValue: productsSubtotal,
            description: `WooCommerce Order #${shipOrder.number}`,
            deliveryInstructions: shipOrder.customer_note || undefined,
            notes: `WooCommerce #${shipOrder.number} · ${shipOrder.payment_method_title}${txnRef ? ` · TXN ${txnRef}` : ''}`,
            numberOfPieces: shipOrder.line_items.reduce((s, li) => s + li.quantity, 0) || 1,
          }}
          onClose={() => setShipOrder(null)}
          onSave={async (data) => {
            const payload = shipOrder.importedSaleId
              ? { ...data, saleId: shipOrder.importedSaleId }
              : data;
            const response = await createCourierShipment(payload);
            if (response?.success) {
              setOrders((prev) =>
                prev.map((o) =>
                  o.id === shipOrder.id
                    ? {
                        ...o,
                        alreadyImported: true,
                        importedSaleId: shipOrder.importedSaleId ?? o.importedSaleId,
                        shipmentCreated: true,
                        shipmentNumber: (response.data as any)?.shipment_number ?? (response.data as any)?.shipmentNumber ?? null,
                      }
                    : o
                )
              );
              setShipOrder(null);
            } else {
              toast.error(response?.message || 'Failed to create shipment');
            }
            return response;
          }}
        />
        );
      })()}
    </div>
  );
};

export default WooCommerceOrdersPage;
