/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  Key,
  Lock,
  RefreshCw,
  Save,
  CheckCircle,
  XCircle,
  Loader2,
  ShoppingCart,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Zap,
  Copy,
  Link2,
  RefreshCcw,
  X,
  Upload,
  Package,
  Search,
  BarChart2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';

interface WooCommerceSettings {
  woocommerceUrl: string | null;
  woocommerceConsumerKey: string | null;
  woocommerceConsumerSecretSet: boolean;
  woocommerceSyncEnabled: boolean;
  woocommerceLastSyncAt: string | null;
  woocommerceWebhookSecretSet: boolean;
  businessId: string;
}

interface SyncResult {
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface WooSaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface WooSale {
  id: string;
  saleNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  status: string;
  createdAt: string;
  saleItems?: WooSaleItem[];
}

const WooCommercePage = () => {
  const [settings, setSettings] = useState<WooCommerceSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Form state
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');

  // Webhook URL copy state
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);
  const apiBase = import.meta.env.VITE_BASE_URL || 'https://gadgetchain-manager-backend-production.up.railway.app/api';

  // UI state
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncPolling, setSyncPolling] = useState(false);
  const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedProductsRef = useRef(false);

  // Sales Monitor state
  const [sales, setSales] = useState<WooSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [salesTotalCount, setSalesTotalCount] = useState(0);
  const [salesLimit, setSalesLimit] = useState(15);

  const { fetchData: fetchSettings } = useFetch('/woocommerce/settings');
  const { fetchData: saveFetch, loading: saving } = useFetch();
  const { fetchData: testFetch, loading: testing } = useFetch();
  const { fetchData: syncFetch, loading: syncing } = useFetch();
  const { fetchData: fetchProducts } = useFetch();
  const { fetchData: pushFetch } = useFetch();
  const { fetchData: fetchSales } = useFetch();

  const loadSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const res = await fetchSettings({ method: 'GET', silent: true });
      if (res?.success && res.data) {
        const data = res.data as WooCommerceSettings;
        setSettings(data);
        setStoreUrl(data.woocommerceUrl ?? '');
        setConsumerKey(data.woocommerceConsumerKey ?? '');
        setSyncEnabled(data.woocommerceSyncEnabled);
        // Don't prefill secret — it is write-only from the UI
      }
    } catch {
      // silent
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadSales = useCallback(async (page = 1) => {
    setSalesLoading(true);
    try {
      const res = await fetchSales({
        method: 'GET',
        endpoint: `/woocommerce/sales?page=${page}&per_page=${salesLimit}`,
        silent: true,
      });
      if (res?.success) {
        setSales((res.data as WooSale[]) ?? []);
        setSalesPage(res.pagination?.page ?? page);
        setSalesTotalPages(res.pagination?.totalPages ?? 1);
        setSalesTotalCount(res.pagination?.total ?? 0);
      }
    } finally {
      setSalesLoading(false);
    }
  }, [fetchSales, salesLimit]);

  useEffect(() => {
    if (settings?.woocommerceSyncEnabled) {
      loadSales(1);
    }
  }, [settings?.woocommerceSyncEnabled]);

  const handleSave = async () => {
    if (storeUrl && !/^https?:\/\/.+/.test(storeUrl)) {
      toast.error('Store URL must start with http:// or https://');
      return;
    }

    const payload: any = {
      woocommerceUrl: storeUrl || null,
      woocommerceSyncEnabled: syncEnabled,
    };

    // Only send key/secret if user typed something new
    if (consumerKey && !consumerKey.includes('••••')) {
      payload.woocommerceConsumerKey = consumerKey;
    }
    if (consumerSecret) {
      payload.woocommerceConsumerSecret = consumerSecret;
    }
    if (webhookSecret) {
      payload.woocommerceWebhookSecret = webhookSecret;
    }

    const res = await saveFetch({
      method: 'PUT',
      endpoint: '/woocommerce/settings',
      data: payload,
    });

    if (res?.success) {
      toast.success('WooCommerce settings saved!');
      setConsumerSecret(''); // clear secret field after save
      setWebhookSecret('');  // clear webhook secret field after save
      await loadSettings();
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('idle');
    setTestMessage('');
    const res = await testFetch({
      method: 'POST',
      endpoint: '/woocommerce/test-connection',
      silent: true,
    });

    if (res?.success) {
      setTestStatus('success');
      setTestMessage((res.data as any)?.message ?? 'Connection successful');
    } else {
      setTestStatus('error');
      setTestMessage(res?.message ?? 'Connection failed');
    }
  };

  const handleSyncStock = async () => {
    setSyncResult(null);
    if (syncPollRef.current) clearInterval(syncPollRef.current);

    const res = await syncFetch({
      method: 'POST',
      endpoint: '/woocommerce/sync-stock',
      silent: true,
    });

    if (!res?.success) {
      toast.error(res?.message ?? 'Stock sync failed');
      return;
    }

    const jobId = (res.data as any)?.jobId as string | undefined;
    if (!jobId) {
      // Older response format — direct result
      setSyncResult(res.data as SyncResult);
      toast.success(res.message ?? 'Stock sync complete!');
      await loadSettings();
      return;
    }

    toast.success('Sync started — running in background…');
    setSyncPolling(true);

    syncPollRef.current = setInterval(async () => {
      const statusRes = await syncFetch({
        method: 'GET',
        endpoint: `/woocommerce/sync-status/${jobId}`,
        silent: true,
      });
      if (!statusRes?.success) return;

      const job = statusRes.data as any;
      if (job.status === 'done') {
        if (syncPollRef.current) clearInterval(syncPollRef.current);
        setSyncPolling(false);
        setSyncResult(job.result);
        toast.success(statusRes.message ?? 'Stock sync complete!');
        await loadSettings();
      } else if (job.status === 'failed') {
        if (syncPollRef.current) clearInterval(syncPollRef.current);
        setSyncPolling(false);
        toast.error(`Sync failed: ${job.error ?? 'Unknown error'}`);
      }
    }, 3000);

    // Safety: stop polling after 20 minutes
    setTimeout(() => {
      if (syncPollRef.current) {
        clearInterval(syncPollRef.current);
        setSyncPolling(false);
      }
    }, 20 * 60 * 1000);
  };

  // Products list
  const [products, setProducts] = useState<any[] | null>(null);
  const [loadingProductsState, setLoadingProductsState] = useState(false);
  const [showSkippedOnly, setShowSkippedOnly] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'linked' | 'not-linked'>('all');

  // Per-product export state keyed by local product id
  const [exportStatuses, setExportStatuses] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [exportDetails, setExportDetails] = useState<Record<string, { wooProductId: number | null; error?: string }>>({}); 
  const [exportingAll, setExportingAll] = useState(false);

  const [productsLimit, setProductsLimit] = useState(20);
  const PRODUCTS_PER_PAGE = productsLimit;
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const [productsTotal, setProductsTotal] = useState(0);

  // Per-product sync state
  const [syncStatuses, setSyncStatuses] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [syncDetails, setSyncDetails] = useState<Record<string, { message?: string; error?: string }>>({});
  // Sidebar state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadProducts = async (page = 1, searchVal?: string, filterVal?: string) => {
    const search = searchVal ?? productSearch;
    const filter = filterVal ?? productFilter;
    setLoadingProductsState(true);
    setProducts(null);
    setExportStatuses({});
    setExportDetails({});
    setSyncStatuses({});
    setSyncDetails({});
    const params = new URLSearchParams({ page: String(page), per_page: String(PRODUCTS_PER_PAGE) });
    if (search) params.set('search', search);
    if (filter && filter !== 'all') params.set('filter', filter);
    const res = await fetchProducts({ method: 'GET', endpoint: `/woocommerce/products?${params.toString()}`, silent: true });
    if (res?.success && Array.isArray(res.data)) {
      setProducts(res.data as any[]);
      const pg = res.pagination as any;
      setProductsPage(pg?.page ?? page);
      setProductsTotalPages(pg?.totalPages ?? 1);
      setProductsTotal(pg?.total ?? 0);
      hasLoadedProductsRef.current = true;
    } else {
      toast.error(res?.message ?? 'Could not fetch products');
    }
    setLoadingProductsState(false);
  };

  // Export a single local product to WooCommerce
  const handleExportOne = async (p: any) => {
    const id: string = p.id;
    setExportStatuses((prev) => ({ ...prev, [id]: 'loading' }));
    const res = await saveFetch({
      method: 'POST',
      endpoint: '/woocommerce/export',
      data: { productIds: [id] },
      silent: true,
    });
    if (res?.success && res.data) {
      const productResult = (res.data as any).results?.[0];
      if (productResult?.success) {
        setExportStatuses((prev) => ({ ...prev, [id]: 'success' }));
        setExportDetails((prev) => ({ ...prev, [id]: { wooProductId: productResult.wooProductId ?? null } }));
      } else {
        setExportStatuses((prev) => ({ ...prev, [id]: 'error' }));
        setExportDetails((prev) => ({ ...prev, [id]: { wooProductId: null, error: productResult?.error ?? 'Export failed' } }));
      }
    } else {
      setExportStatuses((prev) => ({ ...prev, [id]: 'error' }));
      setExportDetails((prev) => ({ ...prev, [id]: { wooProductId: null, error: res?.message ?? 'Export failed' } }));
    }
  };

  // Export all local products not yet in WooCommerce (found: false), one by one
  const handleExportAll = async () => {
    if (!products) return;
    const pending = products.filter(
      (p) => !p.found && (exportStatuses[p.id] ?? 'idle') === 'idle',
    );
    if (pending.length === 0) {
      toast('All products already exported or no pending products');
      return;
    }
    setExportingAll(true);
    for (const p of pending) {
      await handleExportOne(p);
    }
    setExportingAll(false);
    toast.success('Export complete');
    await loadProducts(productsPage);
  };

  // Remote-only products (in WooCommerce but not in our DB)
  const [remoteOnly, setRemoteOnly] = useState<any[] | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remotePage, setRemotePage] = useState(1);
  const [remoteTotalPages, setRemoteTotalPages] = useState(1);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [remoteLimit, setRemoteLimit] = useState(20);
  const REMOTE_PER_PAGE = remoteLimit;

  // Per-product import state keyed by woo_id
  const [importStatuses, setImportStatuses] = useState<Record<number, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [importDetails, setImportDetails] = useState<Record<number, { variantsCreated: number; categoryCreated: string | null; stockSet: boolean; error?: string }>>({});
  const [importingAll, setImportingAll] = useState(false);

  const loadRemoteOnly = async (page = 1) => {
    setLoadingRemote(true);
    setRemoteOnly(null);
    setImportStatuses({});
    setImportDetails({});
    const res = await fetchProducts({ method: 'GET', endpoint: `/woocommerce/remote-only?page=${page}&per_page=${REMOTE_PER_PAGE}`, silent: true });
    if (res?.success && Array.isArray(res.data)) {
      setRemoteOnly(res.data as any[]);
      const pg = res.pagination as any;
      setRemotePage(pg?.page ?? page);
      setRemoteTotalPages(pg?.totalPages ?? 1);
      setRemoteTotal(pg?.total ?? 0);
    } else {
      toast.error(res?.message ?? 'Could not fetch remote products');
    }
    setLoadingRemote(false);
  };

  // Import a single product (pass full item including raw)
  const handleImportOne = async (item: any) => {
    const id: number = item.woo_id;
    setImportStatuses((prev) => ({ ...prev, [id]: 'loading' }));
    const res = await saveFetch({
      method: 'POST',
      endpoint: '/woocommerce/import',
      data: { items: [item] },
      silent: true,
    });
    if (res?.success && res.data) {
      const data = res.data as any;
      const productResult = data.results?.[0];
      if (productResult?.success) {
        setImportStatuses((prev) => ({ ...prev, [id]: 'success' }));
        setImportDetails((prev) => ({
          ...prev,
          [id]: {
            variantsCreated: productResult.variantsCreated ?? 0,
            categoryCreated: productResult.categoryCreated ?? null,
            stockSet: productResult.stockSet ?? false,
          },
        }));
      } else {
        setImportStatuses((prev) => ({ ...prev, [id]: 'error' }));
        setImportDetails((prev) => ({
          ...prev,
          [id]: { variantsCreated: 0, categoryCreated: null, stockSet: false, error: productResult?.error ?? 'Import failed' },
        }));
      }
    } else {
      setImportStatuses((prev) => ({ ...prev, [id]: 'error' }));
      setImportDetails((prev) => ({
        ...prev,
        [id]: { variantsCreated: 0, categoryCreated: null, stockSet: false, error: res?.message ?? 'Import failed' },
      }));
    }
  };

  // Import all pending (idle) products one-by-one so status is visible per row
  const handleImportAll = async () => {
    if (!remoteOnly) return;
    const pending = remoteOnly.filter((p) => (importStatuses[p.woo_id] ?? 'idle') === 'idle');
    if (pending.length === 0) {
      toast('All products already imported');
      return;
    }
    setImportingAll(true);
    for (const item of pending) {
      await handleImportOne(item);
    }
    setImportingAll(false);
    toast.success('Import complete');
    await loadProducts();
  };

  // Push single product stock to WooCommerce immediately
  const handleSyncOne = async (p: any) => {
    const id: string = p.id;
    setSyncStatuses((prev) => ({ ...prev, [id]: 'loading' }));
    setSyncDetails((prev) => ({ ...prev, [id]: {} }));
    const res = await pushFetch({
      method: 'POST',
      endpoint: `/woocommerce/products/${id}/push`,
      silent: true,
    });
    if (res?.success) {
      setSyncStatuses((prev) => ({ ...prev, [id]: 'success' }));
      setSyncDetails((prev) => ({ ...prev, [id]: { message: (res.data as any)?.message ?? res.message ?? 'Synced successfully' } }));
      toast.success(`Stock synced for ${p.name}`);
    } else {
      setSyncStatuses((prev) => ({ ...prev, [id]: 'error' }));
      setSyncDetails((prev) => ({ ...prev, [id]: { error: res?.message ?? 'Sync failed' } }));
      toast.error(res?.message ?? `Sync failed for ${p.name}`);
    }
  };

  if (loadingSettings) {
    return (
      <div className="min-h-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <ShoppingCart className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">WooCommerce Integration</h1>
          <p className="text-sm text-gray-500">
            Connect your WooCommerce store and sync product stock automatically.
          </p>
        </div>
      </div>

      {/* Credentials Card */}
      <Card className="p-5 space-y-5">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Key className="h-4 w-4 text-gray-500" />
          Store Credentials
        </h2>

        {/* Store URL */}
        <div className="space-y-1">
          <Label>
            Store URL <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="url"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="https://mystore.com"
              className="pl-9"
            />
          </div>
          <p className="text-xs text-gray-400">
            Your WooCommerce website URL (without trailing slash).
          </p>
        </div>

        {/* Consumer Key */}
        <div className="space-y-1">
          <Label>
            Consumer Key
          </Label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              placeholder={settings?.woocommerceConsumerKey ? 'Leave blank to keep current' : 'ck_xxxxxxxxxxxx'}
              className="pl-9 font-mono"
            />
          </div>
        </div>

        {/* Consumer Secret */}
        <div className="space-y-1">
          <Label>
            Consumer Secret
            {settings?.woocommerceConsumerSecretSet && (
              <span className="ml-2 text-xs text-green-600 font-normal">
                ✓ Secret saved
              </span>
            )}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="password"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              placeholder={settings?.woocommerceConsumerSecretSet ? 'Leave blank to keep current' : 'cs_xxxxxxxxxxxx'}
              className="pl-9 font-mono"
            />
          </div>
          <p className="text-xs text-gray-400">
            Generate Read/Write API keys from WooCommerce → Settings → Advanced → REST API.
          </p>
        </div>

        {/* Sync Enabled Toggle */}
        <div className="flex items-center justify-between bg-white/30 backdrop-blur-sm rounded-xl p-3 border border-white/20">
          <div>
            <p className="text-sm font-medium text-gray-700">Enable Stock Sync</p>
            <p className="text-xs text-gray-500">
              When enabled, stock quantities are automatically pushed to WooCommerce on every change.
            </p>
          </div>
          <button
            onClick={() => setSyncEnabled(!syncEnabled)}
            className="shrink-0"
          >
            {syncEnabled ? (
              <ToggleRight className="h-8 w-8 text-green-500" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-gray-400" />
            )}
          </button>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </Card>

      {/* Order Webhook Card */}
      <Card className="p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-500" />
          Order Webhooks
          <span className="ml-auto text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Automatic stock deduction
          </span>
        </h2>

        <p className="text-sm text-gray-500">
          When an order is placed on your WooCommerce store, WooCommerce can automatically
          notify this system to deduct stock — no manual sync needed.
        </p>

        {/* Webhook URL */}
        {settings?.businessId && (
          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5" />
              Webhook URL <span className="text-xs font-normal text-gray-400">(copy & paste into WooCommerce)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${apiBase}/woocommerce/webhook/${settings.businessId}`}
                className="font-mono text-xs bg-white/30 cursor-default"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${apiBase}/woocommerce/webhook/${settings!.businessId}`).then(() => {
                    setWebhookUrlCopied(true);
                    setTimeout(() => setWebhookUrlCopied(false), 2000);
                  });
                }}
                className="shrink-0 p-2 rounded border border-white/40 hover:bg-white/30 backdrop-blur-sm transition-colors"
                title="Copy URL"
              >
                {webhookUrlCopied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Webhook Secret */}
        <div className="space-y-1">
          <Label className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            Webhook Secret
            {settings?.woocommerceWebhookSecretSet && !webhookSecret && (
              <span className="ml-2 text-xs text-green-600 font-normal">✓ Secret saved</span>
            )}
          </Label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={settings?.woocommerceWebhookSecretSet ? 'Leave blank to keep current' : 'Enter or generate a secret'}
              className="font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                const array = new Uint8Array(32);
                window.crypto.getRandomValues(array);
                let result = '';
                array.forEach((n) => { result += chars[n % chars.length]; });
                setWebhookSecret(result);
              }}
              className="shrink-0 p-2 rounded border border-white/40 hover:bg-white/30 backdrop-blur-sm transition-colors"
              title="Generate random secret"
            >
              <RefreshCcw className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Set the same secret in WooCommerce → Settings → Advanced → Webhooks → Secret.
            Leave blank to skip signature verification (not recommended).
          </p>
        </div>

        {/* How to set up */}
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 space-y-1.5 text-xs text-purple-700">
          <p className="font-semibold">How to set up in WooCommerce:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <strong>WooCommerce → Settings → Advanced → Webhooks</strong></li>
            <li>Click <strong>Add webhook</strong></li>
            <li>Set <strong>Topic</strong> to <em>Order updated</em></li>
            <li>Paste the <strong>Webhook URL</strong> above into the Delivery URL field</li>
            <li>Copy the same <strong>Webhook Secret</strong> into the Secret field</li>
            <li>Set Status to <strong>Active</strong> and save</li>
            <li>Click <strong>Save Settings</strong> on this page to store the secret</li>
          </ol>
          <p className="mt-1 text-purple-600">
            Stock is only deducted for orders with status <strong>processing</strong> or <strong>completed</strong>.
          </p>
        </div>
      </Card>

      {/* Test & Sync Card */}
      <Card className="p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-gray-500" />
          Connection & Stock Sync
        </h2>

        {/* Test Connection */}
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !settings?.woocommerceUrl}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            {testing ? 'Testing…' : 'Test Connection'}
          </Button>

          {testStatus !== 'idle' && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                testStatus === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {testStatus === 'success' ? (
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{testMessage}</span>
            </div>
          )}
        </div>

        {/* Stock Sync */}
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Sync Stock to WooCommerce</p>
              <p className="text-xs text-gray-500">
                Matches products by SKU and updates stock quantity on your WooCommerce store.
              </p>
              {settings?.woocommerceLastSyncAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Last sync:{' '}
                  {new Date(settings.woocommerceLastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

            {/* Sync status banner */}
            {syncEnabled && settings?.woocommerceUrl && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Real-time sync is <strong>ON</strong> — stock updates to WooCommerce automatically on every change.
                </span>
              </div>
            )}
            {!syncEnabled && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Sync is <strong>OFF</strong> — enable it in settings to push stock changes to WooCommerce automatically.</span>
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleSyncStock}
              disabled={syncing || syncPolling || !settings?.woocommerceUrl}
            >
              {(syncing || syncPolling) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {syncing ? 'Starting…' : syncPolling ? 'Syncing in background…' : 'Sync Stock Now'}
            </Button>
            {syncResult && (
              <div className="bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex gap-4">
                  <span className="text-green-700 font-medium">
                    ✓ Synced: {syncResult.synced}
                  </span>
                  <span className="text-yellow-700 font-medium">
                    ⟳ Skipped: {syncResult.skipped}
                  </span>
                  <span className="text-red-700 font-medium">
                    ✗ Failed: {syncResult.failed}
                  </span>
                </div>
                {syncResult.errors.length > 0 && (
                  <div className="space-y-1">
                    {syncResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
      </Card>

      {/* Info Banner */}
      <Card className="p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-gray-500" />
          WooCommerce Products
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => loadProducts(1)}
            disabled={loadingProductsState}
          >
            {loadingProductsState ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {loadingProductsState ? 'Loading…' : 'Load Products'}
          </Button>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => {
                const val = e.target.value;
                setProductSearch(val);
                if (!hasLoadedProductsRef.current) return;
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                if (val.length === 0) {
                  // Cleared — reload immediately
                  loadProducts(1, '', productFilter);
                } else if (val.length >= 3) {
                  // Wait 500ms after user stops typing
                  searchDebounceRef.current = setTimeout(() => loadProducts(1, val, productFilter), 500);
                }
                // 1–2 chars: wait for more input
              }}
              placeholder="Search by name or SKU (min 3 chars)…"
              className="pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
            />
            {productSearch && (
              <button
                onClick={() => {
                  setProductSearch('');
                  if (hasLoadedProductsRef.current) loadProducts(1, '', productFilter);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter dropdown */}
          <select
            value={productFilter}
            onChange={(e) => {
              const val = e.target.value as 'all' | 'linked' | 'not-linked';
              setProductFilter(val);
              if (hasLoadedProductsRef.current) loadProducts(1, productSearch, val);
            }}
            className="text-sm border border-gray-300 rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="all">All products</option>
            <option value="linked">Linked to WooCommerce</option>
            <option value="not-linked">Not linked (export needed)</option>
          </select>
        </div>

        {products && products.length === 0 && (
          <p className="text-sm text-gray-500 py-4 text-center">No products match your search or filter.</p>
        )}

        {products && products.length > 0 && (
          <p className="text-xs text-gray-400">Showing {products.length} of {productsTotal} products</p>
        )}

        {products && products.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-white/20">
              <thead className="bg-white/30 backdrop-blur-sm text-xs text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-right">Available</th>
                  <th className="px-3 py-2 text-left">Found</th>
                  <th className="px-3 py-2 text-left">Woo ID</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {products.map((p, i) => {
                    const expStatus = exportStatuses[p.id] ?? 'idle';
                    const expDetail = exportDetails[p.id];
                    const syncStatus = syncStatuses[p.id] ?? 'idle';
                    const syncDetail = syncDetails[p.id];
                    return (
                      <tr
                        key={i}
                        className={
                          syncStatus === 'success'
                            ? 'bg-blue-50'
                            : syncStatus === 'error'
                            ? 'bg-red-50'
                            : expStatus === 'success'
                            ? 'bg-green-50'
                            : expStatus === 'error'
                            ? 'bg-red-50'
                            : 'hover:bg-white/30'
                        }
                      >
                        <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2 text-right">{p.availableQuantity}</td>
                        <td className="px-3 py-2">
                          {p.found ? (
                            <span className="text-green-700 font-medium">✓</span>
                          ) : (
                            <span className="text-red-600 font-medium">✗</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {expDetail?.wooProductId ?? p.wooProductId ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {/* Sync status (takes priority if active) */}
                          {syncStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                          {syncStatus === 'success' && (
                            <span className="text-blue-700 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Synced
                            </span>
                          )}
                          {syncStatus === 'error' && (
                            <span className="text-red-600 flex items-start gap-1">
                              <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              {syncDetail?.error ?? 'Sync error'}
                            </span>
                          )}
                          {/* Export status (shown when sync is idle) */}
                          {syncStatus === 'idle' && expStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
                          {syncStatus === 'idle' && expStatus === 'success' && (
                            <span className="text-green-700 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Exported
                            </span>
                          )}
                          {syncStatus === 'idle' && expStatus === 'error' && (
                            <span className="text-red-600 flex items-start gap-1">
                              <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              {expDetail?.error ?? 'Error'}
                            </span>
                          )}
                          {syncStatus === 'idle' && expStatus === 'idle' && p.error && (
                            <span className="text-red-600">{p.error}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Export button for products not yet in WooCommerce */}
                            {!p.found && (expStatus === 'idle' || expStatus === 'error') && (
                              <button
                                onClick={() => handleExportOne(p)}
                                disabled={exportingAll}
                                className="text-xs border border-gray-300 hover:bg-gray-100 disabled:opacity-50 px-2 py-1 rounded transition-colors"
                              >
                                {expStatus === 'error' ? 'Retry' : 'Export'}
                              </button>
                            )}
                            {expStatus === 'success' && !p.found && (
                              <span className="text-xs text-green-600 font-medium">Exported</span>
                            )}
                            {/* Sync Stock button for products already in WooCommerce */}
                            {p.found && (
                              <button
                                onClick={() => { setSelectedProduct(p); setSidebarOpen(true); }}
                                className="text-xs border border-blue-300 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                              >
                                <Upload className="h-3 w-3" />
                                Sync
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Products pagination */}
        {products !== null && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Page {productsPage} of {productsTotalPages} ({productsTotal} total)</span>
              <select
                value={productsLimit}
                onChange={(e) => { setProductsLimit(Number(e.target.value)); loadProducts(1); }}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[5, 10, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => loadProducts(productsPage - 1)}
                disabled={productsPage <= 1 || loadingProductsState}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => loadProducts(productsPage + 1)}
                disabled={productsPage >= productsTotalPages || loadingProductsState}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}

          <div className="mt-4 flex items-center gap-3">
<Button
            variant="outline"
            onClick={() => loadRemoteOnly(1)}
            disabled={loadingRemote}
          >
            {loadingRemote ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
            {loadingRemote ? 'Loading…' : 'Load Remote-only Products'}
          </Button>

            {products && products.some((p) => !p.found) && (
              <Button
                onClick={handleExportAll}
                disabled={exportingAll || (products ?? []).filter((p) => !p.found).every((p) => (exportStatuses[p.id] ?? 'idle') !== 'idle')}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
              >
                {exportingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {exportingAll
                  ? 'Exporting…'
                  : `Export All (${products.filter((p) => !p.found && (exportStatuses[p.id] ?? 'idle') === 'idle').length} pending)`}
              </Button>
            )}
          </div>

          {remoteOnly && remoteOnly.length > 0 && (
            <div className="mt-4 bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium text-gray-700">
                  Remote-only products — Page {remotePage} of {remoteTotalPages} ({remoteTotal} total)
                </div>
                <Button
                  onClick={handleImportAll}
                  disabled={importingAll || remoteOnly.every((p) => (importStatuses[p.woo_id] ?? 'idle') !== 'idle')}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400"
                  size="sm"
                >
                  {importingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
                  {importingAll ? 'Importing…' : `Import This Page (${remoteOnly.filter((p) => (importStatuses[p.woo_id] ?? 'idle') === 'idle').length} pending)`}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-white/20">
                  <thead className="bg-white/30 backdrop-blur-sm text-xs text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {remoteOnly.map((p, i) => {
                      const status = importStatuses[p.woo_id] ?? 'idle';
                      const detail = importDetails[p.woo_id];
                      const productType = p.raw?.type ?? 'simple';
                      return (
                        <tr
                          key={i}
                          className={
                            status === 'success'
                              ? 'bg-green-50'
                              : status === 'error'
                              ? 'bg-red-50'
                              : 'hover:bg-white/30'
                          }
                        >
                          <td className="px-3 py-2 font-mono text-xs">{p.sku ?? <span className="text-gray-400 italic">no sku</span>}</td>
                          <td className="px-3 py-2 max-w-xs truncate" title={p.name}>{p.name}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${productType === 'variable' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {productType}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{p.price ?? '-'}</td>
                          <td className="px-3 py-2">
                            {status === 'idle' && <span className="text-gray-400 text-xs">—</span>}
                            {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
                            {status === 'success' && (
                              <div className="text-xs text-green-700 space-y-0.5">
                                <div className="flex items-center gap-1 font-medium"><CheckCircle className="h-3.5 w-3.5" /> Imported</div>
                                {detail?.categoryCreated && <div className="text-green-600">Category: {detail.categoryCreated}</div>}
                                {(detail?.variantsCreated ?? 0) > 0 && <div className="text-green-600">Variants: {detail!.variantsCreated}</div>}
                                {detail?.stockSet && <div className="text-green-600">Stock set ✓</div>}
                              </div>
                            )}
                            {status === 'error' && (
                              <div className="text-xs text-red-600 flex items-start gap-1">
                                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>{detail?.error ?? 'Error'}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {status === 'idle' || status === 'error' ? (
                              <button
                                onClick={() => handleImportOne(p)}
                                disabled={importingAll}
                                className="text-xs border border-gray-300 hover:bg-gray-100 disabled:opacity-50 px-2 py-1 rounded transition-colors"
                              >
                                {status === 'error' ? 'Retry' : 'Import'}
                              </button>
                            ) : status === 'success' ? (
                              <span className="text-xs text-green-600 font-medium">Done</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Page {remotePage} of {remoteTotalPages}</span>
                    <select
                      value={remoteLimit}
                      onChange={(e) => { setRemoteLimit(Number(e.target.value)); loadRemoteOnly(1); }}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[5, 10, 30, 50, 100].map((n) => (
                        <option key={n} value={n}>{n} / page</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => loadRemoteOnly(remotePage - 1)}
                      disabled={remotePage <= 1 || loadingRemote}
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => loadRemoteOnly(remotePage + 1)}
                      disabled={remotePage >= remoteTotalPages || loadingRemote}
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
            </div>
          )}
        
      </Card>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 space-y-1">
        <p className="font-semibold">How it works</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-600 text-xs">
          <li>Add your WooCommerce REST API credentials above (Read/Write permissions required).</li>
          <li>Products are matched by <strong>SKU</strong> — make sure SKUs match between both systems.</li>
          <li>Click <strong>Sync Stock Now</strong> to push current available stock from your store to WooCommerce.</li>
        </ul>
      </div>

      {/* Sales Monitor Card */}
      {settings?.woocommerceSyncEnabled && (
        <Card className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900 text-base">WooCommerce Sales Monitor</h3>
                <p className="text-xs text-gray-500">Orders captured from WooCommerce webhooks</p>
              </div>
            </div>
            <button
              onClick={() => loadSales(salesPage)}
              disabled={salesLoading}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-green-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${salesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Summary stat */}
          {!salesLoading && salesTotalCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <span className="font-medium text-gray-900">{salesTotalCount}</span> WooCommerce sale{salesTotalCount !== 1 ? 's' : ''} recorded
            </div>
          )}

          {/* Table */}
          {salesLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading sales…</span>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No WooCommerce sales yet</p>
              <p className="text-xs mt-1">Sales will appear here once orders are processed via webhook.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/30 backdrop-blur-sm text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-2.5 font-medium">Order</th>
                    <th className="px-3 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 font-medium">Items</th>
                    <th className="px-3 py-2.5 font-medium">Total</th>
                    <th className="px-3 py-2.5 font-medium">Payment</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-white/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs text-gray-700 font-medium">{sale.saleNumber}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs">
                          <p className="text-gray-800 font-medium truncate max-w-[120px]">{sale.customerName || '—'}</p>
                          {sale.customerEmail && (
                            <p className="text-gray-400 truncate max-w-[120px]">{sale.customerEmail}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">
                        {sale.saleItems?.length ?? 0}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-semibold text-gray-900">
                          {Number(sale.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {(() => {
                          const ps = (sale.paymentStatus || '').toUpperCase();
                          const colors: Record<string, string> = {
                            COMPLETED: 'bg-green-100 text-green-700',
                            PENDING: 'bg-yellow-100 text-yellow-700',
                            PARTIAL: 'bg-blue-100 text-blue-700',
                            REFUNDED: 'bg-orange-100 text-orange-700',
                          };
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[ps] ?? 'bg-gray-100 text-gray-600'}`}>
                              {ps}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5">
                        {(() => {
                          const s = (sale.status || '').toUpperCase();
                          const colors: Record<string, string> = {
                            COMPLETED: 'bg-green-100 text-green-700',
                            CANCELLED: 'bg-red-100 text-red-700',
                            REFUNDED: 'bg-orange-100 text-orange-700',
                            DRAFT: 'bg-gray-100 text-gray-600',
                          };
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] ?? 'bg-gray-100 text-gray-600'}`}>
                              {s}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>Page {salesPage} of {salesTotalPages}</span>
                <select
                  value={salesLimit}
                  onChange={(e) => { setSalesLimit(Number(e.target.value)); loadSales(1); }}
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[5, 10, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => loadSales(salesPage - 1)}
                  disabled={salesPage <= 1 || salesLoading}
                  className="p-1.5 rounded border border-white/40 hover:bg-white/30 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
                </button>
                <button
                  onClick={() => loadSales(salesPage + 1)}
                  disabled={salesPage >= salesTotalPages || salesLoading}
                  className="p-1.5 rounded border border-white/40 hover:bg-white/30 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                </button>
              </div>
            </div>
        </Card>
      )}

      {/* Per-product Sync Sidebar */}
      {sidebarOpen && selectedProduct && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 bg-white/20 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm text-gray-800">Sync Stock to WooCommerce</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Product Details */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-3 space-y-2 text-sm border border-white/20">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Product</span>
                  <p className="font-medium text-gray-900 mt-0.5">{selectedProduct.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">SKU</span>
                    <p className="font-mono text-xs text-gray-800 mt-0.5">{selectedProduct.sku ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Available Qty</span>
                    <p className="font-semibold text-gray-900 mt-0.5">{selectedProduct.availableQuantity}</p>
                  </div>
                </div>
                {selectedProduct.wooProductId && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">WooCommerce ID</span>
                    <p className="font-mono text-xs text-gray-800 mt-0.5">#{selectedProduct.wooProductId}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">WooCommerce Status</span>
                  <p className="mt-0.5">
                    {selectedProduct.found ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <CheckCircle className="h-3 w-3" /> Linked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                        <XCircle className="h-3 w-3" /> Not found in WooCommerce
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Sync result for this product */}
              {(() => {
                const st = syncStatuses[selectedProduct.id] ?? 'idle';
                const det = syncDetails[selectedProduct.id];
                if (st === 'success') {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Stock synced successfully</p>
                        {det?.message && <p className="text-xs mt-0.5 text-blue-600">{det.message}</p>}
                      </div>
                    </div>
                  );
                }
                if (st === 'error') {
                  return (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-red-800">
                        <p className="font-medium">Sync failed</p>
                        {det?.error && <p className="text-xs mt-0.5 text-red-600">{det.error}</p>}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="text-xs text-gray-500 bg-white/30 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                Pushing stock will immediately update the stock quantity of this product in your WooCommerce store to match the current available quantity shown above.
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t px-4 py-3 space-y-2">
              {selectedProduct.found ? (
                <Button
                  onClick={() => handleSyncOne(selectedProduct)}
                  disabled={syncStatuses[selectedProduct.id] === 'loading'}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {syncStatuses[selectedProduct.id] === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Syncing…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {syncStatuses[selectedProduct.id] === 'success' ? 'Sync Again' : 'Sync Stock Now'}
                    </>
                  )}
                </Button>
              ) : (
                <div className="text-xs text-center text-red-600">
                  This product is not linked to WooCommerce. Use Export to create it first.
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WooCommercePage;
