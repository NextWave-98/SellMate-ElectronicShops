/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../hooks/useInventory";
import useSales from "../../hooks/useSales";
import useCustomer from "../../hooks/useCustomer";
import SaleJobFields, { type SaleJobFormValue } from "../../components/sales/SaleJobFields";
import {
  deriveJobTypeFromCart,
  deriveJobTitleFromCart,
  defaultJobDueDate,
} from "../../components/sales/saleJobDerive";
import { SALE_JOB_TYPE_LABELS, type Priority, type SaleJobType } from "../../types/saleJob.types";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  CheckCircle,
  Loader2,
  X,
  ChevronRight,
  Tag,
  Receipt,
  Printer,
  Download,
  RotateCcw,
  Phone,
  Zap,
  Wallet,
  Smartphone,
  Layers,
  ScanLine,
  MapPin,
  Clock,
  Truck,
  Briefcase,
  Monitor,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../utils/currency";
import useBarcode from "../../hooks/useBarcode";
import type { ScannedProduct } from "../../hooks/useBarcode";
import BarcodeScannerModal from "../../components/common/BarcodeScannerModal";
import BarcodeProductSelectModal from "../../components/common/BarcodeProductSelectModal";
import { useLocation } from "../../hooks/useLocation";
import PrintOptionsModal from "../../components/branch/pos/PrintOptionsModal";
import CashDrawerOpenOverlay from "../../components/branch/pos/CashDrawerOpenOverlay";
import CashDrawerBlocker from "../../components/branch/pos/CashDrawerBlocker";
import POSSettingsBlocker from "../../components/branch/pos/POSSettingsBlocker";
import { usePOSSettings } from "../../hooks/usePOSSettings";
import { getPrinterConfig } from "../../lib/printerConfig";
import useCashDrawer from "../../hooks/useCashDrawer";
import useCourier, { CourierMode } from "../../hooks/useCourier";
import useBusinessProfile from "../../hooks/useBusinessProfile";
import {
  clearCustomerDisplay,
  createCustomerDisplaySessionId,
  publishCustomerDisplay,
  type CustomerDisplayStatus,
} from "../../lib/customerDisplaySync";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  discountInfo?: {
    discountName: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    discountAmount: number;
    effectivePrice: number;
  } | null;
  stock: number;
  category: string;
  image?: string;
  brand?: string;
  model?: string;
  warrantyMonths?: number;
  productCode?: string;
  isService?: boolean;
  isReload?: boolean;
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  costPrice?: number;
  quantity: number;
  stock: number;
  category: string;
  image?: string;
  warrantyMonths?: number;
  isService?: boolean;
  isReload?: boolean;
  reloadPhone?: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  product?: {
    name: string;
    unitPrice: number;
    costPrice?: number;
    category?: { name: string };
    primaryImage?: string;
    model?: string;
    brand?: string;
    isActive: boolean;
    warrantyMonths?: number;
    productCode?: string;
    isService?: boolean;
    isReload?: boolean;
    discountInfo?: {
      discountName: string;
      discountType: "PERCENTAGE" | "FIXED";
      discountValue: number;
      discountAmount: number;
      effectivePrice: number;
    } | null;
  };
  quantity: number;
  availableQuantity: number;
}

interface CustomerResult {
  id: string;
  name: string;
  phone: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  city?: string;
}

interface LocationDetails {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  postalCode?: string;
}

type CheckoutStep = "cart" | "customer" | "payment" | "success";
type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "COD"
  | "KOKO"
  | "MINTPAY"
  | "PAZY";

interface SaleResult {
  saleId: string;
  saleNumber: string;
  shipmentNumber?: string;
  paymentStatus?: "COMPLETED" | "PENDING" | "PARTIAL";
  remainingBalance?: number;
  nonCashChange?: number;
  isCourier?: boolean;
}

const SCANNER_HID_THRESHOLD_MS = 45;
const SCANNER_RESET_AFTER_MS = 400;
const SCANNER_MIN_LENGTH = 4;
const COURIER_TRACKING_MIN_LENGTH = 4;

const normalizeCourierTrackingScan = (raw: string): string => {
  return raw.replace(/[\r\n\t]/g, "").trim().toUpperCase();
};

const mapScannedToProduct = (scanned: ScannedProduct): Product => ({
  id: scanned.id,
  productId: scanned.productId,
  name: scanned.name,
  price: scanned.unitPrice,
  costPrice: 0,
  stock: scanned.isService ? 9999 : scanned.stock,
  category: scanned.category ?? "other",
  brand: scanned.brand,
  model: scanned.model,
  warrantyMonths: scanned.warrantyMonths ?? 0,
  productCode: scanned.productCode,
  isService: scanned.isService ?? false,
});

// ─── Step indicator ───────────────────────────────────────────────────────────

const steps: { key: CheckoutStep; label: string }[] = [
  { key: "cart", label: "Cart" },
  { key: "customer", label: "Customer" },
  { key: "payment", label: "Payment" },
  { key: "success", label: "Done" },
];

const stepIndex = (s: CheckoutStep) => steps.findIndex((x) => x.key === s);

const StepBar: React.FC<{ current: CheckoutStep }> = ({ current }) => {
  const ci = stepIndex(current);
  return (
    <div className="flex items-center gap-1 mb-4">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              i < ci
                ? "bg-green-100 text-green-700"
                : i === ci
                  ? "bg-[#1e3a8a] text-white"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {i < ci ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <span>{i + 1}</span>
            )}
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <ChevronRight
              className={`w-3.5 h-3.5 shrink-0 ${i < ci ? "text-green-400" : "text-gray-300"}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const QuickPOSPage: React.FC = () => {
  const { user } = useAuth();
  const { getAllInventory } = useInventory();
  const {
    createSale,
    downloadInvoice,
    getSaleById,
    printAcknowledgement,
    silentPrintInvoice,
  } = useSales();
  const { searchCustomers, createCustomer } = useCustomer();
  const { getBranches, getLocationById } = useLocation();
  const {
    courierServices,
    courierSettings,
    createCourierShipment,
    fetchCourierServices,
    fetchCourierSettings,
  } = useCourier();
  const {
    getSettings: getPOSSettings,
    isConfigured: posSettingsConfigured,
    loadingSettings: posSettingsLoading,
  } = usePOSSettings();
  const posSettings = getPOSSettings();
  const { businessData, loadBusinessProfile } = useBusinessProfile();
  const { getActiveDrawer } = useCashDrawer();

  const isOrgAdmin = !user?.locationId && !user?.branchId;

  // ── Products
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItemType, setSelectedItemType] = useState<
    "all" | "products" | "services" | "reload"
  >("all");
  const [productPage, setProductPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState("1");
  const [reloadProviderId, setReloadProviderId] = useState<string | null>(null);
  const [reloadPhone, setReloadPhone] = useState("");
  const [reloadAmount, setReloadAmount] = useState("");

  // ── Location selector (org admin only)
  const [locations, setLocations] = useState<LocationDetails[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedLocationDetails, setSelectedLocationDetails] =
    useState<LocationDetails | null>(null);

  const resolvePrinterConf = useCallback(() => {
    const locId =
      user?.locationId || user?.branchId || selectedLocationId || "";
    return locId ? getPrinterConfig(locId) : null;
  }, [user?.locationId, user?.branchId, selectedLocationId]);

  // ── Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeMatches, setBarcodeMatches] = useState<ScannedProduct[]>([]);
  const [showBarcodeSelect, setShowBarcodeSelect] = useState(false);
  const [lastScannedValue, setLastScannedValue] = useState<string>("");
  const { scanProduct, scanning } = useBarcode();
  const scannerBufferRef = useRef("");
  const scannerLastTimeRef = useRef(0);

  // ── Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const customerDisplaySessionRef = useRef<string | null>(null);
  const customerDisplayWindowRef = useRef<Window | null>(null);
  const lastDisplayItemIdRef = useRef<string | null>(null);
  const [customerDisplayActive, setCustomerDisplayActive] = useState(false);

  // ── Checkout wizard
  const [step, setStep] = useState<CheckoutStep>("cart");

  // ── Customer step
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerResult | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // ── Optional courier delivery
  const [courierEnabled, setCourierEnabled] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [recipientPostalCode, setRecipientPostalCode] = useState("");
  const [courierWeight, setCourierWeight] = useState(1);
  const [courierTrackingNumber, setCourierTrackingNumber] = useState("");
  const [showCourierTrackingScanner, setShowCourierTrackingScanner] =
    useState(false);
  const courierTrackingInputRef = useRef<HTMLInputElement>(null);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [insuranceCharge, setInsuranceCharge] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);

  // ── Payment step
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [partialAmountInput, setPartialAmountInput] = useState("");
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);
  const [advanceDueDate, setAdvanceDueDate] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">(
    "FIXED",
  );
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  // Optional Sale Job (POS work order). Auto-created after the sale regardless of
  // payment type (full / advance / partial).
  const [saleJob, setSaleJob] = useState<SaleJobFormValue>({
    isJob: false,
    jobType: "PHOTO_FRAME",
    title: "",
  });

  // ── Cash drawer gate
  const [drawerChecked, setDrawerChecked] = useState(false);
  const [drawerIsOpen, setDrawerIsOpen] = useState(false);

  // ── Success step
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const [isPrintOptionsOpen, setIsPrintOptionsOpen] = useState(false);
  const [showCashDrawer, setShowCashDrawer] = useState(false);

  const playScanSuccessBeep = useCallback(() => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + 0.11,
      );
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
      osc.onended = () => {
        void audioCtx.close();
      };
    } catch {
      // Ignore audio errors (browser policy / unsupported device).
    }
  }, []);

  // ─── Cash drawer check on mount ──────────────────────────────────────────────

  useEffect(() => {
    if (isOrgAdmin) {
      // Org admin not tied to a specific location — skip the gate
      setDrawerChecked(true);
      setDrawerIsOpen(true);
      return;
    }
    const locationId = user?.locationId || user?.branchId;
    if (!locationId) return;
    getActiveDrawer(locationId)
      .then((res: any) => {
        const drawer = res?.data ?? null;
        setDrawerIsOpen(!!drawer);
      })
      .catch(() => {
        // On error, allow POS (don't block on network issues)
        setDrawerIsOpen(true);
      })
      .finally(() => setDrawerChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.locationId, user?.branchId, isOrgAdmin]);

  // ─── Load products ──────────────────────────────────────────────────────────

  // ── Load branches for org admin
  useEffect(() => {
    if (!isOrgAdmin) return;
    getBranches()
      .then((res: any) => {
        const data = res?.data;
        const list: LocationDetails[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.locations)
            ? data.locations
            : Array.isArray(data?.branches)
              ? data.branches
              : [];
        setLocations(list);
        if (list.length === 1) setSelectedLocationId(list[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrgAdmin]);

  useEffect(() => {
    const locationId = user?.locationId || user?.branchId || selectedLocationId;
    if (!locationId) {
      setSelectedLocationDetails(null);
      return;
    }

    const localMatch = locations.find((location) => location.id === locationId);
    if (localMatch) {
      setSelectedLocationDetails(localMatch);
    }

    let cancelled = false;
    getLocationById(locationId)
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data?.location || res?.data;
        if (data) setSelectedLocationDetails(data as LocationDetails);
      })
      .catch(() => {
        if (!cancelled && !localMatch) setSelectedLocationDetails(null);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.locationId, user?.branchId, selectedLocationId, locations]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  useEffect(() => {
    setProductPage(1);
  }, [
    debouncedProductSearch,
    selectedCategory,
    selectedItemType,
    pageSize,
    user?.locationId,
    user?.branchId,
    selectedLocationId,
  ]);

  useEffect(() => {
    setSelectedCategory("all");
  }, [selectedItemType]);

  useEffect(() => {
    setJumpPageInput(String(productPage));
  }, [productPage]);

  const staffDiscountHidden = businessData?.posStaffDiscountHidden ?? false;
  const customerDisplayEnabled =
    businessData?.posCustomerDisplayEnabled ?? false;
  const orgDefaultDiscountType =
    businessData?.posDefaultDiscountType ?? ("FIXED" as const);
  const orgDefaultDiscountValue = Number(businessData?.posDefaultDiscountValue ?? 0);

  useEffect(() => {
    if (!staffDiscountHidden) return;
    if (orgDefaultDiscountValue > 0) {
      setDiscountAmount(String(orgDefaultDiscountValue));
      setDiscountType(orgDefaultDiscountType);
    } else {
      setDiscountAmount("");
    }
  }, [staffDiscountHidden, orgDefaultDiscountType, orgDefaultDiscountValue]);

  const mapInventoryItemToProduct = useCallback((i: InventoryItem): Product => {
    const unitPrice = Number(i.product?.unitPrice) || 0;
    const discountInfo = i.product?.discountInfo ?? null;
    const effectivePrice = discountInfo
      ? discountInfo.effectivePrice
      : unitPrice;
    return {
      id: i.id,
      productId: i.productId,
      name: i.product?.name ?? "Unknown",
      price: effectivePrice,
      originalPrice: discountInfo ? unitPrice : undefined,
      costPrice: Number(i.product?.costPrice) || 0,
      discountInfo,
      stock: i.availableQuantity || 0,
      category: i.product?.category?.name?.toLowerCase() ?? "other",
      image: i.product?.primaryImage,
      brand: i.product?.brand,
      model: i.product?.model,
      warrantyMonths: i.product?.warrantyMonths || 0,
      productCode: i.product?.productCode,
      isService: i.product?.isService ?? false,
      isReload: i.product?.isReload ?? false,
    };
  }, []);

  const loadProducts = useCallback(async () => {
    const locationId = user?.locationId || user?.branchId || selectedLocationId;
    // For org admin, load all inventory for the business (no location filter needed);
    // the inventory hook auto-scopes by businessId
    try {
      setLoadingProducts(true);
      const filters: Record<string, unknown> = {
        sortBy: "name",
        sortOrder: "asc",
        includeDiscount: true,
        availableOnly: true,
        includeServices: selectedItemType !== "products" && selectedItemType !== "reload",
        page: productPage,
        limit: pageSize,
      };
      if (locationId) filters.locationId = locationId;
      if (debouncedProductSearch) filters.search = debouncedProductSearch;
      if (selectedCategory !== "all") filters.category = selectedCategory;
      const response = await getAllInventory(filters as any);
      if (response?.data) {
        const payload = response.data as any;
        const pagination = payload?.pagination;
        const items: InventoryItem[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.inventory)
            ? payload.inventory
            : Array.isArray(payload?.items)
              ? payload.items
              : [];

        setTotalProducts(Number(pagination?.total ?? items.length ?? 0));

        const totalPages = Number(pagination?.totalPages ?? 1);
        if (totalPages > 0 && productPage > totalPages) {
          setProductPage(totalPages);
          return;
        }

        setProducts(
          items
            .filter(
              (i) =>
                (i.quantity > 0 || i.product?.isService) && i.product?.isActive,
            )
            .map((i) => mapInventoryItemToProduct(i)),
        );
      }
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
      setHasLoadedProducts(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.locationId,
    user?.branchId,
    selectedLocationId,
    isOrgAdmin,
    productPage,
    pageSize,
    debouncedProductSearch,
    selectedCategory,
    selectedItemType,
    mapInventoryItemToProduct,
  ]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ─── Derived values ─────────────────────────────────────────────────────────

  const typeFilteredProducts = products.filter((p) => {
    if (selectedItemType === "products") return !p.isService && !p.isReload;
    if (selectedItemType === "services") return !!p.isService;
    if (selectedItemType === "reload") return !!p.isReload;
    return true;
  });
  const categories = [
    "all",
    ...Array.from(new Set(typeFilteredProducts.map((p) => p.category))).sort(),
  ];
  const displayedProducts =
    selectedCategory === "all"
      ? typeFilteredProducts
      : typeFilteredProducts.filter((p) => p.category === selectedCategory);
  const totalPages = Math.max(1, Math.ceil((totalProducts || 0) / pageSize));

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountVal = (() => {
    const d = parseFloat(discountAmount) || 0;
    if (d <= 0) return 0;
    if (discountType === "PERCENTAGE")
      return Math.min((subtotal * d) / 100, subtotal);
    return Math.min(d, subtotal);
  })();
  const productTotal = subtotal - discountVal;
  const courierPieces = cart.reduce((sum, item) => sum + item.quantity, 0);
  const courierChargesTotal =
    (Number(shippingCharge) || 0) +
    (Number(insuranceCharge) || 0) +
    (Number(additionalCharges) || 0);
  const total = courierEnabled
    ? productTotal + courierChargesTotal
    : productTotal;
  const change =
    paymentMethod === "CASH" && !isAdvancePayment
      ? Math.max(0, (parseFloat(cashReceived) || 0) - total)
      : 0;

  const mapStepToDisplayStatus = useCallback(
    (currentStep: CheckoutStep): CustomerDisplayStatus => {
      if (currentStep === "success") return "success";
      if (currentStep === "payment") return "payment";
      if (cart.length === 0) return "idle";
      return "cart";
    },
    [cart.length],
  );

  const syncCustomerDisplay = useCallback(() => {
    const sessionId = customerDisplaySessionRef.current;
    if (!sessionId || !customerDisplayEnabled) return;

    const win = customerDisplayWindowRef.current;
    if (win && win.closed) {
      customerDisplaySessionRef.current = null;
      customerDisplayWindowRef.current = null;
      setCustomerDisplayActive(false);
      return;
    }

    publishCustomerDisplay({
      sessionId,
      businessName: businessData?.name,
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        lineTotal: item.price * item.quantity,
      })),
      lastItem: (() => {
        const lastId = lastDisplayItemIdRef.current;
        const match = lastId
          ? cart.find((item) => item.id === lastId)
          : undefined;
        const item = match ?? cart[cart.length - 1];
        if (!item) return null;
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          lineTotal: item.price * item.quantity,
        };
      })(),
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discount: discountVal,
      total,
      status: mapStepToDisplayStatus(step),
      updatedAt: Date.now(),
    });
  }, [
    businessData?.name,
    cart,
    customerDisplayEnabled,
    discountVal,
    mapStepToDisplayStatus,
    step,
    subtotal,
    total,
  ]);

  useEffect(() => {
    syncCustomerDisplay();
  }, [syncCustomerDisplay]);

  const openCustomerDisplay = useCallback(() => {
    if (!customerDisplayEnabled) return;

    const existing = customerDisplayWindowRef.current;
    if (existing && !existing.closed && customerDisplaySessionRef.current) {
      existing.focus();
      syncCustomerDisplay();
      return;
    }

    const sessionId = createCustomerDisplaySessionId();
    customerDisplaySessionRef.current = sessionId;
    const popup = window.open(
      `/pos/customer-display?session=${encodeURIComponent(sessionId)}`,
      "pos_customer_display",
      "width=1024,height=768",
    );
    if (!popup) {
      customerDisplaySessionRef.current = null;
      toast.error("Pop-up blocked. Allow pop-ups to open the customer display.");
      return;
    }
    customerDisplayWindowRef.current = popup;
    setCustomerDisplayActive(true);
    syncCustomerDisplay();
    // Re-broadcast after the new window has time to subscribe.
    window.setTimeout(() => {
      syncCustomerDisplay();
    }, 300);
  }, [customerDisplayEnabled, syncCustomerDisplay]);

  useEffect(() => {
    return () => {
      const sessionId = customerDisplaySessionRef.current;
      if (sessionId) clearCustomerDisplay(sessionId);
    };
  }, []);

  // Partial payment derived values. Quick POS keeps walk-in full payment fast,
  // but supports cash advances and non-cash partial payments when requested.
  const parsedPartialAmount = parseFloat(partialAmountInput) || 0;
  const isDeferredBNPL =
    ["KOKO", "MINTPAY", "PAZY"].includes(paymentMethod) && !partialAmountInput;
  const isCourierCOD = courierEnabled && paymentMethod === "COD";
  const paidAmount =
    isCourierCOD
      ? 0
      : 
    paymentMethod === "CASH" && isAdvancePayment
      ? parsedPartialAmount
      : paymentMethod !== "CASH"
      ? partialAmountInput
        ? parsedPartialAmount
        : total
      : total;
  const remainingBalance = Math.max(0, total - paidAmount);
  const isPartialPayment =
    !isCourierCOD &&
    !isDeferredBNPL &&
    ((paymentMethod === "CASH" && isAdvancePayment) ||
      paymentMethod !== "CASH") &&
    remainingBalance > 0.001;
  const nonCashChange =
    paymentMethod !== "CASH" && partialAmountInput
      ? Math.max(0, paidAmount - total)
      : 0;

  // ─── Barcode scan handler ───────────────────────────────────────────────────

  const resolveProductFromScan = (scanned: ScannedProduct): Product =>
    products.find(
      (p) => p.productId === scanned.productId || p.id === scanned.id,
    ) ?? mapScannedToProduct(scanned);

  const addScannedProductToCart = (scanned: ScannedProduct) => {
    const product = resolveProductFromScan(scanned);
    const inCart = cart.find((i) => i.id === product.id);
    const canAdd =
      product.isService ||
      (product.stock > 0 &&
        (inCart ? inCart.quantity < product.stock : true));
    if (!canAdd) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    addToCart(product);
    playScanSuccessBeep();
    setProductSearch("");
    setShowScanner(false);
  };

  const handleBarcodeScan = async (value: string) => {
    const matches = await scanProduct(value, true);
    if (!matches || matches.length === 0) {
      toast.error(`No product found for: ${value}`);
      return;
    }

    const availableMatches = matches.filter((m) => m.isService || m.stock > 0);
    if (availableMatches.length === 0) {
      toast.error(`Products are out of stock for: ${value}`);
      return;
    }

    if (availableMatches.length > 1) {
      setLastScannedValue(value);
      setBarcodeMatches(availableMatches);
      setShowBarcodeSelect(true);
      setShowScanner(false);
      return;
    }

    addScannedProductToCart(availableMatches[0]);
  };

  const handleBarcodeProductSelect = (scanned: ScannedProduct) => {
    const product = resolveProductFromScan(scanned);
    const inCart = cart.find((i) => i.id === product.id);
    const canAdd =
      product.isService ||
      (product.stock > 0 && (inCart ? inCart.quantity < product.stock : true));
    if (!canAdd) {
      toast.error(`${product.name} is out of stock`);
    } else {
      addToCart(product);
      playScanSuccessBeep();
      setProductSearch("");
    }
    setShowBarcodeSelect(false);
    setBarcodeMatches([]);
  };

  const handleBarcodeScanRef = useRef(handleBarcodeScan);
  useEffect(() => {
    handleBarcodeScanRef.current = handleBarcodeScan;
  });

  const applyCourierTrackingScan = useCallback(
    (raw: string, options?: { silent?: boolean }) => {
      const normalized = normalizeCourierTrackingScan(raw);
      if (normalized.length < COURIER_TRACKING_MIN_LENGTH) {
        if (!options?.silent) {
          toast.error("Invalid tracking barcode");
        }
        return false;
      }
      setCourierTrackingNumber(normalized);
      playScanSuccessBeep();
      if (!options?.silent) {
        toast.success(`Tracking number: ${normalized}`, { duration: 2000 });
      }
      return true;
    },
    [playScanSuccessBeep],
  );

  const applyCourierTrackingScanRef = useRef(applyCourierTrackingScan);
  useEffect(() => {
    applyCourierTrackingScanRef.current = applyCourierTrackingScan;
  });

  const courierEnabledRef = useRef(courierEnabled);
  const isCourierStockAdjustmentOnlyRef = useRef(false);
  const stepRef = useRef(step);
  useEffect(() => {
    courierEnabledRef.current = courierEnabled;
  }, [courierEnabled]);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const shouldCaptureCourierTrackingScan = () =>
    courierEnabledRef.current &&
    isCourierStockAdjustmentOnlyRef.current &&
    (stepRef.current === "customer" || stepRef.current === "payment");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showScanner || showBarcodeSelect || showCourierTrackingScanner)
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();

      if (e.key === "Enter") {
        const value = scannerBufferRef.current;
        scannerBufferRef.current = "";
        scannerLastTimeRef.current = 0;
        if (value.length >= SCANNER_MIN_LENGTH) {
          e.preventDefault();
          if (shouldCaptureCourierTrackingScan()) {
            applyCourierTrackingScanRef.current(value);
          } else {
            handleBarcodeScanRef.current(value);
          }
        }
      } else if (e.key === "Escape") {
        scannerBufferRef.current = "";
        scannerLastTimeRef.current = 0;
      } else if (e.key.length === 1) {
        if (
          scannerLastTimeRef.current &&
          now - scannerLastTimeRef.current > SCANNER_RESET_AFTER_MS
        ) {
          scannerBufferRef.current = "";
        }

        const interKeyDelay = scannerLastTimeRef.current
          ? now - scannerLastTimeRef.current
          : 0;
        scannerBufferRef.current += e.key;
        scannerLastTimeRef.current = now;

        if (interKeyDelay > 0 && interKeyDelay <= SCANNER_HID_THRESHOLD_MS) {
          // Scanner input should not leak into active text fields.
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [showScanner, showBarcodeSelect, showCourierTrackingScanner]);

  // ─── Cart actions ───────────────────────────────────────────────────────────

  const addToCart = (product: Product) => {
    if (product.isReload) {
      setSelectedItemType("reload");
      setReloadProviderId(product.id);
      return;
    }
    if (!product.isService && product.stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    lastDisplayItemIdRef.current = product.id;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (!product.isService && existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} units available`);
          return prev;
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      toast.success(`${product.name} added`, { duration: 1500 });
      return [
        ...prev,
        {
          id: product.id,
          productId: product.productId,
          name: product.name,
          price: product.price,
          costPrice: product.costPrice || 0,
          quantity: 1,
          stock: product.stock,
          category: product.category,
          image: product.image,
          warrantyMonths: product.warrantyMonths || 0,
          isService: product.isService ?? false,
          isReload: false,
        },
      ];
    });
  };

  const addReloadToCart = () => {
    const product = products.find((p) => p.id === reloadProviderId);
    if (!product || !product.isReload) {
      toast.error("Select a reload provider");
      return;
    }
    const phone = reloadPhone.trim();
    if (!phone) {
      toast.error("Phone number is required");
      return;
    }
    const amount = Math.floor(Number(reloadAmount));
    if (!Number.isFinite(amount) || amount < 1) {
      toast.error("Enter a valid reload amount (whole LKR)");
      return;
    }
    const cartId = `${product.id}:${phone}`;
    const otherAmt = cart
      .filter(
        (i) =>
          i.isReload &&
          i.productId === product.productId &&
          i.id !== cartId,
      )
      .reduce((sum, i) => sum + i.quantity, 0);
    if (otherAmt + amount > product.stock) {
      toast.error(
        `Insufficient balance for ${product.name}. Available: Rs.${Math.max(0, product.stock - otherAmt).toLocaleString()}`,
      );
      return;
    }
    const unitPrice =
      Number(product.price) > 0 ? Number(product.price) : 1;
    lastDisplayItemIdRef.current = cartId;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === cartId);
      if (existing) {
        return prev.map((i) =>
          i.id === cartId
            ? {
                ...i,
                quantity: amount,
                stock: product.stock,
                price: unitPrice,
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: cartId,
          productId: product.productId,
          name: product.name,
          price: unitPrice,
          costPrice: product.costPrice || 0,
          quantity: amount,
          stock: product.stock,
          category: product.category,
          image: product.image,
          warrantyMonths: 0,
          isService: false,
          isReload: true,
          reloadPhone: phone,
        },
      ];
    });
    toast.success(
      `${product.name} · ${phone} · Rs.${amount.toLocaleString()} added`,
      { duration: 1500 },
    );
    setReloadAmount("");
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    const cartItem = cart.find((i) => i.id === id);
    if (cartItem?.isReload) {
      const product = products.find((p) => p.productId === cartItem.productId && p.isReload);
      const balance = product?.stock ?? cartItem.stock;
      const otherAmt = cart
        .filter(
          (i) =>
            i.isReload &&
            i.productId === cartItem.productId &&
            i.id !== id,
        )
        .reduce((sum, i) => sum + i.quantity, 0);
      if (otherAmt + qty > balance) {
        toast.error(
          `Insufficient balance. Available: Rs.${Math.max(0, balance - otherAmt).toLocaleString()}`,
        );
        return;
      }
      setCart((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
      );
      return;
    }
    const product = products.find((p) => p.id === id);
    if (product && !cartItem?.isService && qty > product.stock) {
      toast.error(`Only ${product.stock} units available`);
      return;
    }
    lastDisplayItemIdRef.current = id;
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
    );
  };

  const updateServicePrice = (id: string, value: number) => {
    if (!Number.isFinite(value) || value < 0) return;
    lastDisplayItemIdRef.current = id;
    setCart((prev) =>
      prev.map((i) =>
        i.id === id && i.isService ? { ...i, price: value } : i,
      ),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (lastDisplayItemIdRef.current === id) {
        lastDisplayItemIdRef.current = next[next.length - 1]?.id ?? null;
      }
      return next;
    });
  };

  const clearCart = () => {
    lastDisplayItemIdRef.current = null;
    setCart([]);
    setStep("cart");
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCourierEnabled(false);
    setSelectedCourierId("");
    setRecipientAddress("");
    setRecipientCity("");
    setRecipientPostalCode("");
    setCourierWeight(1);
    setCourierTrackingNumber("");
    setShippingCharge(0);
    setInsuranceCharge(0);
    setAdditionalCharges(0);
    setDiscountAmount("");
    setCashReceived("");
    setPartialAmountInput("");
    setIsAdvancePayment(false);
    setAdvanceDueDate("");
    setNotes("");
    setSaleJob({ isJob: false, jobType: "PHOTO_FRAME", title: "" });
    setSaleResult(null);
  };

  // ─── Customer search ────────────────────────────────────────────────────────

  useEffect(() => {
    if (customerSearchTimer.current) clearTimeout(customerSearchTimer.current);
    if (customerSearch.length < 3) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }
    customerSearchTimer.current = setTimeout(async () => {
      setIsSearchingCustomer(true);
      setShowCustomerDropdown(true);
      try {
        const res = await searchCustomers(customerSearch, 10);
        const data = (res as any)?.data;
        let list: CustomerResult[] = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray(data?.customers)) list = data.customers;
        else if (Array.isArray(data?.data)) list = data.data;
        setCustomerResults(list);
      } catch {
        setCustomerResults([]);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 300);
    return () => {
      if (customerSearchTimer.current)
        clearTimeout(customerSearchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearch]);

  useEffect(() => {
    if (!user?.businessId) return;
    loadBusinessProfile();
    fetchCourierServices({ isActive: true });
    fetchCourierSettings(user.businessId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.businessId]);

  useEffect(() => {
    if (!courierEnabled || selectedCourierId || courierServices.length === 0)
      return;
    const firstActive = courierServices.find((service) => service.isActive);
    if (firstActive) setSelectedCourierId(firstActive.id);
  }, [courierEnabled, selectedCourierId, courierServices]);

  useEffect(() => {
    if (courierEnabled) {
      if (paymentMethod === "CASH") {
        setPaymentMethod("COD");
        setCashReceived("");
        setIsAdvancePayment(false);
        setAdvanceDueDate("");
        setPartialAmountInput("");
      }
      return;
    }
    if (paymentMethod === "COD") {
      setPaymentMethod("CASH");
    }
  }, [courierEnabled, paymentMethod]);

  const selectedCourierService = courierServices.find(
    (service) => service.id === selectedCourierId,
  );
  const isSystemOnlyCourierFlow =
    courierSettings?.courierMode === CourierMode.SYSTEM_ONLY ||
    selectedCourierService?.apiEnabled === false;
  const isCourierStockAdjustmentOnly =
    courierEnabled &&
    (businessData?.courierStockAdjustmentOnly ||
      posSettings.courierStockAdjustmentOnly) &&
    isSystemOnlyCourierFlow;

  useEffect(() => {
    isCourierStockAdjustmentOnlyRef.current = isCourierStockAdjustmentOnly;
  }, [isCourierStockAdjustmentOnly]);

  useEffect(() => {
    if (
      !isCourierStockAdjustmentOnly ||
      !courierEnabled ||
      step !== "customer"
    ) {
      return;
    }
    const timer = window.setTimeout(
      () => courierTrackingInputRef.current?.focus(),
      120,
    );
    return () => window.clearTimeout(timer);
  }, [isCourierStockAdjustmentOnly, courierEnabled, step]);

  const getInternalCourierRecipient = (locationId: string) => {
    const locationName =
      selectedLocationDetails?.name ||
      user?.location?.name ||
      user?.branch?.name ||
      user?.business?.name ||
      "Walk-in Customer";
    const address =
      selectedLocationDetails?.address ||
      user?.business?.name ||
      locationName;

    return {
      customerId: undefined,
      recipientName: locationName,
      recipientPhone: selectedLocationDetails?.phone || "0000000000",
      recipientEmail: undefined,
      recipientAddress: address,
      recipientCity: selectedLocationDetails?.city || "Colombo",
      recipientPostalCode: selectedLocationDetails?.postalCode || undefined,
      notesSuffix: `Stock adjustment only | Location: ${locationId}`,
    };
  };

  // Auto-calculate shipping from courier service (same idea as CourierShipmentModal)
  useEffect(() => {
    if (!courierEnabled || !selectedCourierId || cart.length === 0) return;
    const svc = courierServices.find((s) => s.id === selectedCourierId);
    const baseCharge = svc?.baseCharge ?? 350;
    const perKg = svc?.perKgCharge ?? 50;
    const minimum = svc?.minimumCharge ?? 0;
    let charge = baseCharge + (courierWeight || 1) * perKg;
    if (minimum > 0 && charge < minimum) charge = minimum;
    setShippingCharge(parseFloat(charge.toFixed(2)));
  }, [
    courierEnabled,
    selectedCourierId,
    courierWeight,
    cart.length,
    courierServices,
  ]);

  useEffect(() => {
    if (!selectedCustomer) return;
    setCustomerName(selectedCustomer.name || "");
    setCustomerPhone(selectedCustomer.phone || selectedCustomer.contactNumber || "");
    setCustomerEmail(selectedCustomer.email || "");
    setRecipientAddress(selectedCustomer.address || "");
    setRecipientCity(selectedCustomer.city || "");
  }, [selectedCustomer]);

  const validateCourierDetails = () => {
    if (!courierEnabled) return true;
    if (!selectedCourierId) {
      toast.error("Please select a courier service");
      return false;
    }
    if (isCourierStockAdjustmentOnly) return true;
    if (!customerName.trim()) {
      toast.error("Customer name is required for courier delivery");
      return false;
    }
    if (!customerPhone.trim()) {
      toast.error("Customer phone is required for courier delivery");
      return false;
    }
    if (!recipientAddress.trim()) {
      toast.error("Delivery address is required for courier delivery");
      return false;
    }
    if (!recipientCity.trim()) {
      toast.error("Delivery city is required for courier delivery");
      return false;
    }
    return true;
  };

  const mapPaymentToShipmentMethod = (
    method: PaymentMethod,
  ): "cash" | "bank" | "cod" | "koko" | "mintpay" | "payzy" => {
    if (method === "COD") return "cod";
    if (method === "CASH") return "cash";
    if (method === "CARD" || method === "BANK_TRANSFER") return "bank";
    if (method === "KOKO") return "koko";
    if (method === "MINTPAY") return "mintpay";
    return "payzy";
  };

  const getShipmentPaymentFlags = (
    shipmentPm: ReturnType<typeof mapPaymentToShipmentMethod>,
    grandTotal: number,
  ) => {
    if (shipmentPm === "cod") {
      return { paymentConfirmed: false, paymentConfirmedAmount: undefined };
    }
    if (["koko", "mintpay", "payzy"].includes(shipmentPm) && !partialAmountInput) {
      return { paymentConfirmed: false, paymentConfirmedAmount: undefined };
    }
    if (shipmentPm === "cash") {
      if (isAdvancePayment) {
        return {
          paymentConfirmed: parsedPartialAmount > 0,
          paymentConfirmedAmount: parsedPartialAmount,
        };
      }
      return {
        paymentConfirmed: true,
        paymentConfirmedAmount: parseFloat(cashReceived) || grandTotal,
      };
    }
    if (paidAmount > 0) {
      return {
        paymentConfirmed: true,
        paymentConfirmedAmount: paidAmount,
      };
    }
    return {
      paymentConfirmed: true,
      paymentConfirmedAmount: grandTotal,
    };
  };

  // ─── Process sale ───────────────────────────────────────────────────────────

  const handleProcessSale = async () => {
    const locationId = user?.locationId || user?.branchId || selectedLocationId;
    if (!locationId || !user?.id) {
      if (isOrgAdmin && !selectedLocationId) {
        toast.error(
          "Please select a branch/location before processing the sale",
        );
      } else {
        toast.error("User/location info missing");
      }
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!validateCourierDetails()) return;

    if (paymentMethod === "COD" && !courierEnabled) {
      toast.error("COD is only available for courier delivery");
      return;
    }

    if (paymentMethod === "CASH" && !isAdvancePayment) {
      const received = cashReceived.trim() === "" ? total : parseFloat(cashReceived) || 0;
      if (received < total) {
        toast.error("Cash received is less than total amount");
        return;
      }
    }

    if (paymentMethod === "CASH" && isAdvancePayment) {
      // Advance amount may be anything from 0 (fully deferred) up to the full
      // total (paid in full but still a job). Only reject over/under-payment.
      if (parsedPartialAmount < 0) {
        toast.error("Advance amount cannot be negative");
        return;
      }
      if (parsedPartialAmount > total) {
        toast.error("Advance amount cannot exceed the total");
        return;
      }
      if (!advanceDueDate) {
        toast.error("Job due date is required");
        return;
      }
    }

    if (paymentMethod !== "CASH" && partialAmountInput !== "") {
      const partialAmount = parseFloat(partialAmountInput);
      if (isNaN(partialAmount) || partialAmount < 0) {
        toast.error("Amount cannot be negative");
        return;
      }
    }

    // Pre-compute before going async so these are available for print decisions.
    const isDeferredMethod =
      ["KOKO", "MINTPAY", "PAZY"].includes(paymentMethod) &&
      !partialAmountInput;
    setIsProcessing(true);
    try {
      const internalCourierRecipient = isCourierStockAdjustmentOnly
        ? getInternalCourierRecipient(locationId)
        : null;

      // Resolve customer
      let customerId: string | undefined;
      if (selectedCustomer?.id) {
        customerId = selectedCustomer.id;
      } else if (customerPhone.trim() || customerSearch.trim()) {
        // Try to find by phone
        try {
          const phoneToSearch = customerPhone.trim() || customerSearch.trim();
          const res = await searchCustomers(phoneToSearch, 1);
          const data = (res as any)?.data;
          const list: CustomerResult[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.customers)
              ? data.customers
              : [];
          if (list.length > 0) customerId = list[0].id;
        } catch {
          // no customer found – proceed as walk-in
        }
      }

      // Auto-save the customer for courier orders AND advance-payment jobs
      // (advance requires a named customer so the balance can be tracked).
      if (
        !customerId &&
        ((courierEnabled && !isCourierStockAdjustmentOnly) || isAdvancePayment)
      ) {
        const created = await createCustomer(
          {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim() || null,
            address: recipientAddress.trim() || null,
            city: recipientCity.trim() || null,
            locationId,
            customerType: "WALK_IN",
          },
          true,
        );
        const createdCustomer = (created?.data as any) || {};
        customerId = createdCustomer.id || createdCustomer.customer?.id;
      }

      const saleItems = cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.price),
        costPrice: item.costPrice || 0,
        discount: 0,
        discountType: "FIXED" as const,
        tax: 0,
        warrantyMonths: item.warrantyMonths || 0,
        ...(item.isReload && item.reloadPhone
          ? { reloadPhone: item.reloadPhone }
          : {}),
      }));

      const shipmentSaleItems = saleItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
      }));

      if (courierEnabled) {
        const shipmentPm = mapPaymentToShipmentMethod(paymentMethod);
        const isCodShipment = shipmentPm === "cod";
        const paymentFlags = getShipmentPaymentFlags(shipmentPm, total);
        const itemDescription = cart
          .map((item) =>
            item.isReload
              ? `${item.name} · ${item.reloadPhone} · Rs.${item.quantity}`
              : `${item.name} x${item.quantity}`,
          )
          .join(", ");
        const shipmentResponse = await createCourierShipment({
          courierServiceId: selectedCourierId,
          customerId: internalCourierRecipient?.customerId ?? customerId,
          pickupLocationId: locationId,
          deliveryMethod: "STANDARD" as any,
          recipientName:
            internalCourierRecipient?.recipientName ?? customerName.trim(),
          recipientPhone:
            internalCourierRecipient?.recipientPhone ?? customerPhone.trim(),
          recipientEmail:
            internalCourierRecipient?.recipientEmail ??
            (customerEmail.trim() || undefined),
          recipientAddress:
            internalCourierRecipient?.recipientAddress ??
            recipientAddress.trim(),
          recipientCity:
            internalCourierRecipient?.recipientCity ?? recipientCity.trim(),
          recipientPostalCode:
            internalCourierRecipient?.recipientPostalCode ??
            (recipientPostalCode.trim() || undefined),
          weight: courierWeight || 1,
          numberOfPieces: courierPieces || 1,
          declaredValue: subtotal,
          shippingCharge: Number(shippingCharge) || 0,
          insuranceCharge: Number(insuranceCharge) || 0,
          additionalCharges: Number(additionalCharges) || 0,
          totalCharge: courierChargesTotal,
          codEnabled: isCodShipment,
          codAmount: isCodShipment ? total : 0,
          paymentMethod: shipmentPm as any,
          paymentConfirmed: paymentFlags.paymentConfirmed,
          paymentConfirmedAmount: paymentFlags.paymentConfirmedAmount,
          discountType,
          discountValue:
            discountType === "PERCENTAGE"
              ? parseFloat(discountAmount) || 0
              : discountVal,
          description:
            itemDescription.length > 100
              ? itemDescription.slice(0, 97) + "..."
              : itemDescription,
          notes:
            notes ||
            `Quick POS Courier – ${paymentMethod}${isAdvancePayment && advanceDueDate ? ` | Due: ${advanceDueDate}` : ""}${
              internalCourierRecipient
                ? ` | ${internalCourierRecipient.notesSuffix}`
                : ""
            }`,
          paymentDescription: `QPOS-${paymentMethod}-${Date.now()}`,
          skipCustomerNotification: !!internalCourierRecipient,
          ...(isCourierStockAdjustmentOnly && courierTrackingNumber.trim()
            ? {
                trackingNumber: courierTrackingNumber.trim(),
                shipmentNumber: courierTrackingNumber.trim(),
              }
            : {}),
          saleItems: shipmentSaleItems,
        } as any);

        if (!shipmentResponse?.success || !shipmentResponse.data) {
          throw new Error(
            shipmentResponse?.message || "Failed to create courier shipment",
          );
        }

        const shipmentData = shipmentResponse.data as any;
        const saleId = shipmentData.saleId || shipmentData.sale_id;
        if (!saleId) {
          throw new Error("Courier shipment was created, but sale ID was missing");
        }

        const saleLookup = await getSaleById(saleId);
        const saleData = (saleLookup?.data as any)?.sale || saleLookup?.data;
        const saleNumber =
          saleData?.saleNumber ||
          saleData?.sale_number ||
          shipmentData.saleNumber ||
          shipmentData.shipment_number ||
          shipmentData.shipmentNumber;
        const salePaymentStatus = (
          saleData?.paymentStatus ||
          saleData?.payment_status ||
          (isCodShipment || isDeferredMethod ? "PENDING" : "COMPLETED")
        ).toUpperCase();
        const saleRemaining = Math.abs(
          Number(
            saleData?.balanceAmount ??
              saleData?.balance_amount ??
              (salePaymentStatus === "PARTIAL" ? remainingBalance : 0),
          ),
        );

        setSaleResult({
          saleId,
          saleNumber: saleNumber || saleId,
          shipmentNumber:
            shipmentData.shipment_number || shipmentData.shipmentNumber,
          paymentStatus:
            salePaymentStatus === "PARTIAL"
              ? "PARTIAL"
              : salePaymentStatus === "PENDING"
                ? "PENDING"
                : "COMPLETED",
          remainingBalance:
            salePaymentStatus === "PARTIAL" || salePaymentStatus === "PENDING"
              ? saleRemaining || (isCodShipment ? total : remainingBalance)
              : 0,
          nonCashChange: nonCashChange > 0 ? nonCashChange : 0,
          isCourier: true,
        });
        setStep("success");
        if (
          paymentMethod === "CASH" &&
          !isDeferredMethod &&
          posSettings.autoCashDrawer
        ) {
          setShowCashDrawer(true);
        }
        toast.success(
          isCodShipment
            ? `Courier COD shipment created! ${shipmentData.shipment_number || shipmentData.shipmentNumber || ""}`
            : `Courier shipment created! ${saleNumber || ""}`,
          { duration: 4000 },
        );
        if (!isDeferredMethod && (posSettings.autoPrintOnSale || isPartialPayment)) {
          if (isPartialPayment || (paymentMethod === "CASH" && isAdvancePayment)) {
            await printAcknowledgement(saleId, "80mm");
          } else {
            const cashAmt =
              paymentMethod === "CASH" && !isAdvancePayment
                ? parseFloat(cashReceived) || 0
                : 0;
            await silentPrintInvoice(saleId, {
              format: "80mm",
              cashReceived: cashAmt > 0 ? cashAmt : undefined,
              printerConf: resolvePrinterConf(),
              openDrawer: paymentMethod === "CASH",
            });
          }
        }
        await loadProducts();
        return;
      }

      // BNPL methods with no entered amount stay fully deferred (amount=0)
      const payments = [
        {
          method: (paymentMethod === "PAZY" ? "PAYZY" : paymentMethod) as
            | "CASH"
            | "CARD"
            | "BANK_TRANSFER"
            | "CHEQUE"
            | "COD"
            | "KOKO"
            | "MINTPAY"
            | "PAYZY",
          amount: isDeferredMethod ? 0 : paidAmount,
          reference: `QPOS-${paymentMethod}-${Date.now()}`,
          receivedById: user.id,
        },
      ];

      const saleRes = await createSale({
        locationId,
        soldById: user.id,
        customerId,
        ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
        ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
        ...(customerEmail.trim() ? { customerEmail: customerEmail.trim() } : {}),
        items: saleItems,
        payments,
        type: "DIRECT_SALE",
        discount: discountVal,
        discountType,
        notes: notes || "Quick POS Sale",
        ...(isPartialPayment && advanceDueDate ? { advanceDueDate } : {}),
        // Auto-create a Sale Job when flagged (works for full, advance & partial sales).
        ...(saleJob.isJob && saleJob.title.trim()
          ? { job: { ...saleJob, title: saleJob.title.trim() } }
          : {}),
        ...(user.businessId ? { businessId: user.businessId } : {}),
      } as any);

      const saleData = saleRes?.data as any;
      const saleId = saleData?.sale?.id || saleData?.id;
      const saleNumber = saleData?.sale?.saleNumber || saleData?.saleNumber;

      if (!saleId || !saleNumber)
        throw new Error("Invalid response from server");

      setSaleResult({
        saleId,
        saleNumber,
        paymentStatus: isDeferredMethod
          ? "PENDING"
          : isPartialPayment
            ? "PARTIAL"
            : "COMPLETED",
        remainingBalance: isPartialPayment ? remainingBalance : 0,
        nonCashChange: nonCashChange > 0 ? nonCashChange : 0,
        isCourier: false,
      });
      setStep("success");
      // Show cash drawer overlay for cash payments
      if (
        paymentMethod === "CASH" &&
        !isDeferredMethod &&
        posSettings.autoCashDrawer
      ) {
        setShowCashDrawer(true);
      }
      toast.success(
        isDeferredMethod
          ? `Order ${saleNumber} created – payment pending!`
          : `Sale ${saleNumber} completed!`,
        { duration: 4000 },
      );
      // Quick POS receipt routing:
      // advance/partial -> /acknowledgement?format=80mm
      // normal sale      -> /invoice/html?format=80mm
      if (!isDeferredMethod && (posSettings.autoPrintOnSale || isPartialPayment)) {
        const cashAmt =
          paymentMethod === "CASH" && !isAdvancePayment
            ? parseFloat(cashReceived) || 0
            : 0;
        if (isPartialPayment) {
          await printAcknowledgement(saleId, "80mm");
        } else {
          await silentPrintInvoice(saleId, {
            format: "80mm",
            cashReceived: cashAmt > 0 ? cashAmt : undefined,
            printerConf: resolvePrinterConf(),
            openDrawer: paymentMethod === "CASH",
          });
        }
      }
      await loadProducts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to process sale", { duration: 5000 });
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Print handler ─────────────────────────────────────────────────────────

  const handlePrint = async (format?: "a4" | "80mm" | "58mm" | "thermal") => {
    if (!saleResult) return;

    const printFormat: "a4" | "80mm" | "58mm" =
      format === "a4"
        ? "a4"
        : format === "thermal"
          ? "80mm"
          : ((format as "a4" | "80mm" | "58mm" | undefined) ?? "80mm");

    try {
      if (saleResult.paymentStatus === "PARTIAL") {
        await printAcknowledgement(saleResult.saleId, printFormat);
        return;
      }
      await silentPrintInvoice(saleResult.saleId, {
        format: printFormat,
        printerConf: resolvePrinterConf(),
      });
    } catch {
      toast.error("Failed to print. Check printer connection.");
    }
  };

  // ─── Navigation helpers ─────────────────────────────────────────────────────

  const goToCustomer = () => {
    if (cart.length === 0) {
      toast.error("Add at least one item to cart first");
      return;
    }
    setStep("customer");
  };

  // Advance Payment = Job sale. Toggled from the customer step. Turning it on
  // makes the customer mandatory and auto-derives the Sale Job (type from the
  // product category, title from the product, due date = today + 7). The only
  // field the cashier chooses is priority.
  const toggleAdvancePayment = () => {
    setIsAdvancePayment((value) => {
      const next = !value;
      if (next) {
        setCourierEnabled(false); // advance is cash-based, not courier COD
        setPaymentMethod("CASH");
        setCashReceived("");
        setPartialAmountInput("");
        const due = defaultJobDueDate();
        setAdvanceDueDate(due);
        setSaleJob({
          isJob: true,
          jobType: deriveJobTypeFromCart(cart),
          title: deriveJobTitleFromCart(cart),
          dueDate: due,
          priority: "NORMAL",
        });
      } else {
        setAdvanceDueDate("");
        setPartialAmountInput("");
        setSaleJob({ isJob: false, jobType: "PHOTO_FRAME", title: "" });
      }
      return next;
    });
  };

  const goToPayment = () => {
    if (!validateCourierDetails()) return;
    if (isAdvancePayment) {
      if (!customerName.trim()) {
        toast.error("Customer name is required for advance payment");
        return;
      }
      if (!customerPhone.trim()) {
        toast.error("Customer phone is required for advance payment");
        return;
      }
      if (!saleJob.title.trim()) {
        toast.error("Job title is required");
        return;
      }
    }
    setStep("payment");
  };

  const goBack = () => {
    if (step === "customer") setStep("cart");
    else if (step === "payment") setStep("customer");
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Show cash drawer gate for branch-level users before POS is usable
  const branchLocationId = user?.locationId || user?.branchId || "";

  if (drawerChecked && !drawerIsOpen && !isOrgAdmin && branchLocationId) {
    return (
      <CashDrawerBlocker
        locationId={branchLocationId}
        onDrawerOpened={() => setDrawerIsOpen(true)}
      />
    );
  }

  // Block POS if settings haven't been configured in the backend yet
  if (!isOrgAdmin && !posSettingsLoading && posSettingsConfigured === false) {
    return <POSSettingsBlocker settingsPath="/superadmin/pos/settings" />;
  }

  if (!hasLoadedProducts && loadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1e3a8a] mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Loading Quick POS…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-6rem)] lg:max-w-4xl xl:max-w-6xl 2xl:max-w-6xl min-[1950px]:max-w-[83.333%] w-full max-w-full mx-auto">
      {/* ═══ LEFT: Product Grid ═══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Zap className="w-5 h-5 text-[#1e3a8a]" />
          <h1 className="text-lg font-bold text-gray-900">Quick POS</h1>
          {customerDisplayEnabled && (
            <button
              type="button"
              onClick={openCustomerDisplay}
              title="Open customer display on second screen"
              className={`ml-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                customerDisplayActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              {customerDisplayActive ? "Display on" : "Customer display"}
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {totalProducts} products
          </span>
        </div>

        {/* Search + Category */}
        <div className="p-3 border-b border-gray-100 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, code, SKU, or ID…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
              />
              {productSearch && (
                <button
                  onClick={() => setProductSearch("")}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowScanner(true)}
              disabled={scanning}
              title="Scan barcode"
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shrink-0 disabled:opacity-50"
            >
              <ScanLine className="w-4 h-4" />
              <span className="hidden sm:inline">Scan</span>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: "all", label: "All" },
              { id: "products", label: "Products" },
              { id: "services", label: "Services" },
              { id: "reload", label: "Reload" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() =>
                  setSelectedItemType(
                    tab.id as "all" | "products" | "services" | "reload",
                  )
                }
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  selectedItemType === tab.id
                    ? "bg-[#1e3a8a] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-[#1e3a8a] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat === "all"
                  ? "All"
                  : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid / Reload form */}
        <div className="flex-1 overflow-y-auto p-3">
          {selectedItemType === "reload" ? (
            <div className="space-y-4">
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Loading reload providers…</p>
                </div>
              ) : typeFilteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Smartphone className="w-10 h-10 mb-2" />
                  <p className="text-sm">No reload providers found</p>
                  <p className="text-xs mt-1 text-center px-4">
                    Create a Reload product (Dialog, Hutch, …) and add credit amount in Stock.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {typeFilteredProducts.map((product) => {
                      const selected = reloadProviderId === product.id;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => setReloadProviderId(product.id)}
                          className={`relative flex flex-col bg-white border rounded-xl p-3 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${
                            selected
                              ? "border-emerald-600 bg-emerald-50/40"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="w-full h-16 rounded-lg mb-2 bg-emerald-50 flex items-center justify-center">
                            <Smartphone className="w-7 h-7 text-emerald-600" />
                          </div>
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                            {product.name}
                          </p>
                          <p className="mt-2 text-[11px] font-medium text-emerald-700">
                            Balance: Rs.{product.stock.toLocaleString()}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {reloadProviderId && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                      <p className="text-sm font-semibold text-gray-800">
                        Reload details —{" "}
                        {products.find((p) => p.id === reloadProviderId)?.name}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Phone number
                          </label>
                          <input
                            type="tel"
                            value={reloadPhone}
                            onChange={(e) => setReloadPhone(e.target.value)}
                            placeholder="07XXXXXXXX"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Amount (LKR)
                          </label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={reloadAmount}
                            onChange={(e) => setReloadAmount(e.target.value)}
                            placeholder="100"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addReloadToCart}
                        className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Add Reload to Cart
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : loadingProducts ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Loading products…</p>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Package className="w-10 h-10 mb-2" />
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
              {displayedProducts.map((product) => {
                const inCart = cart.find((i) =>
                  product.isReload
                    ? i.productId === product.productId && i.isReload
                    : i.id === product.id,
                );
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={!product.isService && !product.isReload && product.stock <= 0}
                    className={`relative flex flex-col bg-white border rounded-xl p-3 text-left transition-all hover:shadow-md hover:border-[#1e3a8a]/40 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 ${
                      !product.isService && !product.isReload && product.stock <= 0
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    } ${inCart ? "border-[#1e3a8a] bg-blue-50/30" : "border-gray-200"}`}
                  >
                    {inCart && !product.isReload && (
                      <span className="absolute top-2 right-2 bg-[#1e3a8a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {inCart.quantity}
                      </span>
                    )}
                    {product.discountInfo && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {product.discountInfo.discountType === "PERCENTAGE"
                          ? `${product.discountInfo.discountValue}% OFF`
                          : `${formatCurrency(product.discountInfo.discountAmount)} OFF`}
                      </span>
                    )}
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-28 object-cover rounded-lg mb-2 bg-gray-50"
                      />
                    ) : (
                      <div className="w-full h-28 rounded-lg mb-2 bg-gray-100 flex items-center justify-center">
                        {product.isReload ? (
                          <Smartphone className="w-8 h-8 text-emerald-400" />
                        ) : (
                          <Package className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
                      {product.name}
                    </p>
                    {product.brand && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {product.brand}
                      </p>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <div>
                        {product.isReload ? (
                          <span className="text-xs font-bold text-emerald-700">
                            Reload
                          </span>
                        ) : (
                          <>
                            <span
                              className={`text-xs font-bold ${product.discountInfo ? "text-red-600" : "text-[#1e3a8a]"}`}
                            >
                              {formatCurrency(product.price)}
                            </span>
                            {product.originalPrice !== undefined && (
                              <span className="block text-[10px] text-gray-400 line-through">
                                {formatCurrency(product.originalPrice)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-medium ${
                          product.isService
                            ? "text-indigo-600"
                            : product.isReload
                              ? "text-emerald-600"
                              : product.stock <= 5
                                ? "text-orange-500"
                                : "text-green-600"
                        }`}
                      >
                        {product.isService
                          ? "Service"
                          : product.isReload
                            ? `Rs.${product.stock.toLocaleString()}`
                            : product.stock <= 0
                              ? "Out"
                              : `${product.stock} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500">
            Page {productPage} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Rows</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setProductPage(1);
              }}
              className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
            >
              {[10, 30, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <button
              onClick={() => setProductPage((p) => Math.max(1, p - 1))}
              disabled={productPage <= 1 || loadingProducts}
              className="px-2.5 py-1 text-xs rounded-md border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setProductPage((p) => Math.min(totalPages, p + 1))}
              disabled={productPage >= totalPages || loadingProducts}
              className="px-2.5 py-1 text-xs rounded-md border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
        <div className="px-3 pb-2 border-t-0 bg-gray-50 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500">Go to page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const parsed = Number(jumpPageInput);
                if (!Number.isFinite(parsed)) return;
                setProductPage(
                  Math.min(totalPages, Math.max(1, Math.floor(parsed))),
                );
              }
            }}
            className="w-16 text-xs border border-gray-300 rounded-md px-2 py-1 text-center bg-white"
          />
          <button
            onClick={() => {
              const parsed = Number(jumpPageInput);
              if (!Number.isFinite(parsed)) return;
              setProductPage(
                Math.min(totalPages, Math.max(1, Math.floor(parsed))),
              );
            }}
            className="px-2.5 py-1 text-xs rounded-md border border-gray-300 bg-white"
          >
            Go
          </button>
        </div>
      </div>

      {/* ═══ RIGHT: Checkout Panel ════════════════════════════════════════════ */}
      <div className="w-full lg:w-96 lg:h-[80vh] lg:flex-shrink-0 flex flex-col min-h-[40vh] lg:min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Step bar */}
        <div className="p-4 border-b border-gray-100">
          <StepBar current={step} />
        </div>

        {/* ── STEP: CART ── */}
        {step === "cart" && (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">
                  Cart ({cart.length})
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Cart is empty</p>
                  <p className="text-xs mt-1">Click products to add them</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {cart.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {item.isReload
                            ? `${item.name} · ${item.reloadPhone}`
                            : item.name}
                        </p>
                        {item.isReload ? (
                          <p className="text-xs text-emerald-700 font-medium mt-0.5">
                            Reload Rs.{item.quantity.toLocaleString()}
                            {item.price !== 1
                              ? ` · ${formatCurrency(item.price * item.quantity)}`
                              : ""}
                          </p>
                        ) : !item.isService ? (
                          <p className="text-xs text-[#1e3a8a] font-medium mt-0.5">
                            {formatCurrency(item.price)}
                          </p>
                        ) : (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500">
                              Amount
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={
                                Number.isFinite(item.price) ? item.price : 0
                              }
                              onChange={(e) =>
                                updateServicePrice(
                                  item.id,
                                  Number(e.target.value),
                                )
                              }
                              className="w-20 rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-800"
                            />
                          </div>
                        )}
                      </div>
                      {item.isReload ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-gray-800">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-1 text-red-300 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-1 text-red-300 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Cart totals + proceed */}
            <div className="border-t border-gray-100 p-4 space-y-3">
              <div className="flex justify-between text-sm font-semibold text-gray-800">
                <span>Total</span>
                <span className="text-[#1e3a8a]">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <button
                onClick={goToCustomer}
                disabled={cart.length === 0}
                className="w-full py-3 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#1e40af] transition-colors"
              >
                Proceed to Checkout <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ── STEP: CUSTOMER ── */}
        {step === "customer" && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">
                  Customer
                </span>
              </div>
              <span className="text-xs text-gray-400 italic">
                {isCourierStockAdjustmentOnly
                  ? "Receiver skipped by POS setting"
                  : courierEnabled
                    ? "Required for delivery"
                    : "Optional – you can skip"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Customer search */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />
                  Search by phone / name
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerPhone(e.target.value);
                      if (
                        selectedCustomer &&
                        e.target.value !== selectedCustomer.phone
                      ) {
                        setSelectedCustomer(null);
                        setCustomerName("");
                        setCustomerEmail("");
                      }
                    }}
                    placeholder="07xxxxxxxx or name…"
                    className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                  />
                  {isSearchingCustomer && (
                    <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                  )}
                  {selectedCustomer && (
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch("");
                        setCustomerName("");
                        setCustomerPhone("");
                        setCustomerEmail("");
                        setRecipientAddress("");
                        setRecipientCity("");
                      }}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown results */}
                {showCustomerDropdown && !selectedCustomer && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
                    {customerResults.length === 0 && !isSearchingCustomer ? (
                      <div className="px-4 py-3 text-xs text-gray-500">
                        No customers found
                      </div>
                    ) : (
                      customerResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerSearch(c.phone || c.contactNumber || "");
                            setCustomerName(c.name || "");
                            setCustomerPhone(c.phone || c.contactNumber || "");
                            setCustomerEmail(c.email || "");
                            setRecipientAddress(c.address || "");
                            setRecipientCity(c.city || "");
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-[#1e3a8a]" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">
                              {c.name}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {c.phone || c.contactNumber}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected customer badge */}
              {selectedCustomer && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-green-800">
                      {selectedCustomer.name}
                    </p>
                    <p className="text-[10px] text-green-600">
                      {selectedCustomer.phone || selectedCustomer.contactNumber}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Advance Payment (auto-creates a Job) ── */}
              <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                <button
                  type="button"
                  onClick={toggleAdvancePayment}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Advance Payment
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      isAdvancePayment
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {isAdvancePayment ? "ON" : "OFF"}
                  </span>
                </button>

                {isAdvancePayment && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      Advance payment creates a job. Customer name &amp; phone are
                      required and saved automatically.
                    </p>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Customer Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="07xxxxxxxx"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                      />
                    </div>

                    {/* Auto job summary — type & title from product, due date auto */}
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5 space-y-2">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Job type (auto — change if needed)
                        </label>
                        <select
                          value={saleJob.jobType}
                          onChange={(e) =>
                            setSaleJob({
                              ...saleJob,
                              jobType: e.target.value as SaleJobType,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md"
                        >
                          {(
                            [
                              "PHOTO_FRAME",
                              "GRAPHIC_DESIGN",
                              "PRINTING",
                              "CUSTOM",
                              "OTHER",
                            ] as SaleJobType[]
                          ).map((t) => (
                            <option key={t} value={t}>
                              {SALE_JOB_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Title (auto)
                        </label>
                        <input
                          value={saleJob.title}
                          onChange={(e) =>
                            setSaleJob({ ...saleJob, title: e.target.value })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1">
                            Priority
                          </label>
                          <select
                            value={saleJob.priority || "NORMAL"}
                            onChange={(e) =>
                              setSaleJob({
                                ...saleJob,
                                priority: e.target.value as Priority,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md"
                          >
                            {(["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map(
                              (p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1">
                            Due date
                          </label>
                          <input
                            type="date"
                            value={saleJob.dueDate || advanceDueDate}
                            onChange={(e) => {
                              setSaleJob({ ...saleJob, dueDate: e.target.value });
                              setAdvanceDueDate(e.target.value);
                            }}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Enter the advance amount at the payment step (0 up to full).
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setCourierEnabled((value) => {
                      const next = !value;
                      if (next) {
                        setShippingCharge(0);
                        setInsuranceCharge(0);
                        setAdditionalCharges(0);
                        setCourierWeight(1);
                        setCourierTrackingNumber("");
                        setPaymentMethod("COD");
                        setCashReceived("");
                        setIsAdvancePayment(false);
                        setAdvanceDueDate("");
                        setPartialAmountInput("");
                      } else {
                        setShippingCharge(0);
                        setInsuranceCharge(0);
                        setAdditionalCharges(0);
                        setCourierWeight(1);
                        setCourierTrackingNumber("");
                      }
                      return next;
                    });
                  }}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <Truck className="w-4 h-4 text-[#1e3a8a]" />
                    Courier Delivery
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      courierEnabled
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {courierEnabled ? "ON" : "OFF"}
                  </span>
                </button>

                {courierEnabled && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Courier Service <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedCourierId}
                        onChange={(e) => setSelectedCourierId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 bg-white"
                      >
                        <option value="">Select courier…</option>
                        {courierServices
                          .filter((service) => service.isActive)
                          .map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {isCourierStockAdjustmentOnly ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                          Receiver details are skipped. This will create an
                          internal system-only courier record and adjust stock
                          using the selected branch details.
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Tracking number{" "}
                            <span className="text-gray-400 font-normal">
                              (optional)
                            </span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              ref={courierTrackingInputRef}
                              type="text"
                              value={courierTrackingNumber}
                              onChange={(e) =>
                                setCourierTrackingNumber(
                                  e.target.value.toUpperCase(),
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  applyCourierTrackingScan(
                                    courierTrackingNumber,
                                    { silent: true },
                                  );
                                }
                              }}
                              placeholder="Scan or enter e.g. CCP14760959"
                              className="flex-1 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowCourierTrackingScanner(true)
                              }
                              title="Open camera scanner"
                              className="px-3 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af] transition-colors shrink-0"
                            >
                              <ScanLine className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-400">
                            Use a USB/barcode reader on this step — the tracking
                            number fills automatically. It is saved as the
                            shipment and tracking number on the courier record.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Phone <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Address <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              City <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={recipientCity}
                              onChange={(e) => setRecipientCity(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Postal Code
                            </label>
                            <input
                              type="text"
                              value={recipientPostalCode}
                              onChange={(e) =>
                                setRecipientPostalCode(e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Weight (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={courierWeight}
                          onChange={(e) =>
                            setCourierWeight(
                              Math.max(0.1, parseFloat(e.target.value) || 1),
                            )
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Pieces
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={courierPieces || 1}
                          className="w-full px-3 py-2 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Shipping (Rs.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={shippingCharge}
                          onChange={(e) =>
                            setShippingCharge(parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Insurance (Rs.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={insuranceCharge}
                          onChange={(e) =>
                            setInsuranceCharge(parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Additional charges (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={additionalCharges}
                        onChange={(e) =>
                          setAdditionalCharges(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                      />
                    </div>

                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-1 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Products</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Courier charges</span>
                        <span>{formatCurrency(courierChargesTotal)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                        <span>Order total</span>
                        <span>{formatCurrency(productTotal + courierChargesTotal)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 pt-1">
                        Discount applied on payment step. COD collects full order
                        total including shipping.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                {isCourierStockAdjustmentOnly
                  ? "Stock adjustment only: receiver details are not required."
                  : courierEnabled
                    ? "Courier orders need customer and delivery details."
                  : "No customer? That's fine – tap "}
                {!courierEnabled && <strong>Skip</strong>}
                {!courierEnabled && " to proceed as walk-in."}
              </p>
            </div>

            <div className="border-t border-gray-100 p-4 space-y-2">
              <button
                onClick={goToPayment}
                className="w-full py-3 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1e40af] transition-colors"
              >
                {courierEnabled
                  ? "Continue to Payment"
                  : selectedCustomer
                    ? "Continue"
                    : "Skip & Continue"}{" "}
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={goBack}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-700"
              >
                ← Back to Cart
              </button>
            </div>
          </>
        )}

        {/* ── STEP: PAYMENT ── */}
        {step === "payment" && (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">
                Payment
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Optional: turn this sale into a Job (auto-creates a Sale Job).
                  Hidden for advance payments — those are always jobs and are
                  configured (type/title/due/priority) back on the customer step. */}
              {isAdvancePayment ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span>
                    Advance job:{" "}
                    <strong>{SALE_JOB_TYPE_LABELS[saleJob.jobType]}</strong> —{" "}
                    {saleJob.title || "untitled"}
                  </span>
                </div>
              ) : (
                <SaleJobFields value={saleJob} onChange={setSaleJob} />
              )}

              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>- {formatCurrency(discountVal)}</span>
                  </div>
                )}
                {courierEnabled && (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>Products (after discount)</span>
                      <span>{formatCurrency(productTotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Courier charges</span>
                      <span>{formatCurrency(courierChargesTotal)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>{courierEnabled && paymentMethod === "COD" ? "Total COD" : "Total"}</span>
                  <span className="text-[#1e3a8a] text-sm">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Branch selector for org admin */}
              {isOrgAdmin && (
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
                    <MapPin className="w-3 h-3" /> Branch / Location{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 bg-white"
                  >
                    <option value="">Select branch/location…</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  {!selectedLocationId && (
                    <p className="text-xs text-amber-600 mt-1">
                      Select a branch to process the sale
                    </p>
                  )}
                </div>
              )}

              {/* Discount */}
              {!staffDiscountHidden ? (
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
                  <Tag className="w-3 h-3" /> Discount (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                  />
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as "FIXED" | "PERCENTAGE")
                    }
                    className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                  >
                    <option value="FIXED">LKR</option>
                    <option value="PERCENTAGE">%</option>
                  </select>
                </div>
              </div>
              ) : orgDefaultDiscountValue > 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                  Organization discount applied:{" "}
                  {orgDefaultDiscountType === "PERCENTAGE"
                    ? `${orgDefaultDiscountValue}%`
                    : formatCurrency(orgDefaultDiscountValue)}
                </div>
              ) : null}

              {/* Payment method */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[
                    ...(!courierEnabled
                      ? [
                          {
                            val: "CASH" as PaymentMethod,
                            label: "Cash",
                            Icon: Banknote,
                          },
                        ]
                      : [
                          {
                            val: "COD" as PaymentMethod,
                            label: "COD",
                            Icon: Truck,
                          },
                        ]),
                    {
                      val: "CARD" as PaymentMethod,
                      label: "Card",
                      Icon: CreditCard,
                    },
                    {
                      val: "BANK_TRANSFER" as PaymentMethod,
                      label: "Bank",
                      Icon: Receipt,
                    },
                    {
                      val: "KOKO" as PaymentMethod,
                      label: "KoKo",
                      Icon: Layers,
                    },
                    {
                      val: "MINTPAY" as PaymentMethod,
                      label: "MintPay",
                      Icon: Wallet,
                    },
                    {
                      val: "PAZY" as PaymentMethod,
                      label: "Pazy",
                      Icon: Smartphone,
                    },
                  ].map(({ val, label, Icon }) => (
                    <button
                      key={val}
                      onClick={() => {
                        setPaymentMethod(val);
                        setPartialAmountInput("");
                        if (val !== "CASH") {
                          setIsAdvancePayment(false);
                          setAdvanceDueDate("");
                        }
                      }}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-colors ${
                        paymentMethod === val
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pending payment notice for BNPL methods */}
              {["KOKO", "MINTPAY", "PAZY"].includes(paymentMethod) && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-amber-700">
                    <strong>
                      {paymentMethod === "PAZY" ? "Pazy" : paymentMethod}
                    </strong>{" "}
                    is a deferred payment – sale will be created with{" "}
                    <strong>Payment Pending</strong> status until the provider
                    confirms.
                  </p>
                </div>
              )}

              {/* Cash received */}
              {paymentMethod === "CASH" && (
                <div className="space-y-3">
                  {/* Advance is decided on the customer step (it makes the sale a
                      job). A normal cash sale can't be switched to advance here —
                      it must be paid in full. */}
                  {isAdvancePayment && (
                    <div className="w-full flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Advance payment (job)
                      </span>
                      <span>ON</span>
                    </div>
                  )}

                  {isAdvancePayment ? (
                    <>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                          Advance Amount{" "}
                          <span className="text-gray-400">
                            (0 up to {formatCurrency(total)})
                          </span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={partialAmountInput}
                          onChange={(e) => setPartialAmountInput(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                          Balance Due Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={advanceDueDate}
                          onChange={(e) => setAdvanceDueDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                        />
                      </div>
                      {isPartialPayment && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          Balance remaining:{" "}
                          <strong>{formatCurrency(remainingBalance)}</strong>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                        Cash Received{" "}
                        <span className="text-gray-400">
                          (leave blank for exact {formatCurrency(total)})
                        </span>
                      </label>
                      <input
                        type="number"
                        min={total}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder={total.toString()}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                      />
                      {cashReceived && parseFloat(cashReceived) >= total && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Change: {formatCurrency(change)}
                        </p>
                      )}
                      {cashReceived && parseFloat(cashReceived) < total && (
                        <p className="text-xs text-red-500 mt-1">
                          Insufficient – need{" "}
                          {formatCurrency(total - parseFloat(cashReceived))}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Amount being paid (non-cash methods – supports partial payments) */}
              {paymentMethod !== "CASH" &&
                !["KOKO", "MINTPAY", "PAZY"].includes(paymentMethod) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Amount Being Paid{" "}
                      <span className="text-gray-400 font-normal">
                        (leave blank for full {formatCurrency(total)})
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partialAmountInput}
                      onChange={(e) => setPartialAmountInput(e.target.value)}
                      placeholder={total.toFixed(2)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                    />
                    {isPartialPayment && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Partial payment – remaining balance:{" "}
                        <strong>{formatCurrency(remainingBalance)}</strong>
                      </div>
                    )}
                    {partialAmountInput && nonCashChange > 0.001 && (
                      <p className="text-xs text-green-600 mt-1.5 font-medium">
                        Change to return to customer:{" "}
                        <strong>{formatCurrency(nonCashChange)}</strong>
                      </p>
                    )}
                    {partialAmountInput &&
                      paidAmount >= total &&
                      nonCashChange < 0.001 && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Full amount covered ✓
                        </p>
                      )}
                  </div>
                )}

              {/* BNPL methods – optional upfront partial amount */}
              {["KOKO", "MINTPAY", "PAZY"].includes(paymentMethod) && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Upfront Amount Paid{" "}
                    <span className="text-gray-400 font-normal">
                      (optional – leave blank if fully deferred)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partialAmountInput}
                    onChange={(e) => setPartialAmountInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                  />
                  {isPartialPayment && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Partial payment – remaining:{" "}
                      <strong>{formatCurrency(remainingBalance)}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add a note…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 resize-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 space-y-2">
              <button
                onClick={handleProcessSale}
                disabled={
                  isProcessing ||
                  (paymentMethod === "CASH" &&
                    !isAdvancePayment &&
                    cashReceived.trim() !== "" &&
                    (parseFloat(cashReceived) || 0) < total) ||
                  (paymentMethod === "CASH" &&
                    isAdvancePayment &&
                    // Advance may be 0 (fully deferred) up to the full total.
                    ((parseFloat(partialAmountInput) || 0) < 0 ||
                      (parseFloat(partialAmountInput) || 0) > total ||
                      !advanceDueDate)) ||
                  (isOrgAdmin && !selectedLocationId)
                }
                className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-green-700 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                  </>
                ) : paymentMethod === "CASH" && isAdvancePayment ? (
                  <>
                    <Clock className="w-4 h-4" /> Save Advance –{" "}
                    {formatCurrency(paidAmount)}
                  </>
                ) : courierEnabled ? (
                  <>
                    <Truck className="w-4 h-4" />{" "}
                    {paymentMethod === "COD"
                      ? "Create COD Shipment"
                      : "Create Shipment & Sale"}{" "}
                    – {formatCurrency(total)}
                  </>
                ) : ["KOKO", "MINTPAY", "PAZY"].includes(paymentMethod) &&
                  !partialAmountInput ? (
                  <>
                    <Clock className="w-4 h-4" /> Place Order –{" "}
                    {formatCurrency(total)}
                  </>
                ) : isPartialPayment ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Record Partial –{" "}
                    {formatCurrency(paidAmount)}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Complete Sale –{" "}
                    {formatCurrency(total)}
                  </>
                )}
              </button>
              <button
                onClick={goBack}
                disabled={isProcessing}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
              >
                ← Back
              </button>
            </div>
          </>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === "success" && saleResult && (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Success banner */}
              {saleResult.paymentStatus === "PENDING" ? (
                <div className="flex flex-col items-center text-center py-5">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                    <Clock className="w-9 h-9 text-amber-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Order Created!
                  </h2>
                  <p className="text-sm text-amber-600 mt-1 font-medium">
                    Payment Pending
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Sale #{saleResult.saleNumber}
                  </p>
                </div>
              ) : saleResult.paymentStatus === "PARTIAL" ? (
                <div className="flex flex-col items-center text-center py-5">
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                    <Clock className="w-9 h-9 text-orange-500" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Partial Payment Recorded!
                  </h2>
                  <p className="text-sm text-orange-600 mt-1 font-medium">
                    Balance Outstanding
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Sale #{saleResult.saleNumber}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-5">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <CheckCircle className="w-9 h-9 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Sale Complete!
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Sale #{saleResult.saleNumber}
                  </p>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Items</span>
                  <span>
                    {cart.length > 0
                      ? cart.reduce((s, i) => s + i.quantity, 0)
                      : "–"}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>
                    {saleResult.paymentStatus === "PENDING"
                      ? "Total Due"
                      : "Total"}
                  </span>
                  <span className="text-[#1e3a8a] text-sm">
                    {formatCurrency(total)}
                  </span>
                </div>
                {saleResult.paymentStatus === "PARTIAL" &&
                  saleResult.remainingBalance &&
                  saleResult.remainingBalance > 0 && (
                    <>
                      <div className="flex justify-between text-orange-600">
                        <span>Amount Paid</span>
                        <span className="font-medium">
                          {formatCurrency(total - saleResult.remainingBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between text-red-600 font-semibold">
                        <span>Remaining Balance</span>
                        <span>
                          {formatCurrency(saleResult.remainingBalance)}
                        </span>
                      </div>
                    </>
                  )}
                {saleResult.paymentStatus === "PENDING" && (
                  <div className="flex items-start gap-1.5 pt-1 border-t border-amber-100">
                    <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-600">
                      {paymentMethod === "COD"
                        ? "Courier will collect payment on delivery."
                        : "Payment will be confirmed by the provider."}
                    </p>
                  </div>
                )}
                {saleResult.isCourier && (
                  <div className="flex justify-between text-indigo-600 pt-1 border-t border-gray-200">
                    <span>Delivery</span>
                    <span className="font-medium">Courier</span>
                  </div>
                )}
                {saleResult.shipmentNumber && (
                  <div className="flex justify-between text-indigo-600">
                    <span>Shipment</span>
                    <span className="font-medium">{saleResult.shipmentNumber}</span>
                  </div>
                )}
                {saleResult.paymentStatus === "PARTIAL" && advanceDueDate && (
                  <div className="flex justify-between text-orange-600">
                    <span>Due Date</span>
                    <span>{new Date(advanceDueDate).toLocaleDateString()}</span>
                  </div>
                )}
                {paymentMethod === "CASH" && change > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Change Given</span>
                    <span>{formatCurrency(change)}</span>
                  </div>
                )}
                {saleResult.nonCashChange &&
                  saleResult.nonCashChange > 0.001 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Change to Return</span>
                      <span>{formatCurrency(saleResult.nonCashChange)}</span>
                    </div>
                  )}
                {selectedCustomer && (
                  <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-200">
                    <span>Customer</span>
                    <span className="font-medium">{selectedCustomer.name}</span>
                  </div>
                )}
                {!selectedCustomer && customerName && (
                  <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-200">
                    <span>Customer</span>
                    <span className="font-medium">{customerName}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrint("thermal")}
                    className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors shadow-sm"
                    title="Print short thermal receipt"
                  >
                    <Printer className="w-4 h-4" /> Short (Thermal)
                  </button>
                  <button
                    onClick={() => handlePrint("a4")}
                    className="flex-1 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#1e40af] transition-colors shadow-sm"
                    title="Print long A4 invoice"
                  >
                    <Printer className="w-4 h-4" /> Long (A4)
                  </button>
                </div>
                <button
                  onClick={() =>
                    downloadInvoice(saleResult.saleId, { format: "a4" })
                  }
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download A4 Invoice
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4">
              <button
                onClick={clearCart}
                className="w-full py-3 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1e40af] transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> New Sale
              </button>
            </div>
          </>
        )}
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan to Add to Cart"
      />

      <BarcodeScannerModal
        open={showCourierTrackingScanner}
        onClose={() => setShowCourierTrackingScanner(false)}
        onScan={(value) => {
          applyCourierTrackingScan(value);
          setShowCourierTrackingScanner(false);
        }}
        title="Scan Courier Tracking Number"
      />

      {/* Barcode Product Select Modal – shown when multiple products share a barcode */}
      <BarcodeProductSelectModal
        open={showBarcodeSelect}
        onClose={() => {
          setShowBarcodeSelect(false);
          setBarcodeMatches([]);
        }}
        matches={barcodeMatches}
        onSelect={handleBarcodeProductSelect}
        scannedValue={lastScannedValue}
      />

      {/* Cash Drawer Opening Overlay */}
      <CashDrawerOpenOverlay
        visible={showCashDrawer}
        onDone={() => setShowCashDrawer(false)}
      />

      {/* Print Options Modal */}
      {saleResult && (
        <PrintOptionsModal
          isOpen={isPrintOptionsOpen}
          onClose={() => setIsPrintOptionsOpen(false)}
          saleId={saleResult.saleId}
          defaultPrinterId={posSettings.defaultPrinterId}
          defaultFormat={posSettings.defaultFormat}
        />
      )}
    </div>
  );
};

// Fix missing Package import used in empty states
function Package(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

export default QuickPOSPage;
