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
  Tv2,
  LayoutGrid,
  Columns2,
  Keyboard,
  Pause,
  Split,
  History,
  Lock,
  FileText,
  ArrowLeftRight,
  Pencil,
  ShieldCheck,
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
import { getPrinterConfig, resolveThermalPaperFormat, createDefaultPrinterConfig } from "../../lib/printerConfig";
import { usesStarNativePrint } from "../../lib/starPrint";
import useCashDrawer, {
  type CashDrawerRecord,
  type DayBalanceSummary,
} from "../../hooks/useCashDrawer";
import usePosHeldCart, {
  type PosHeldCartRecord,
  type HeldCartSnapshot,
} from "../../hooks/usePosHeldCart";
import usePosQuotation, {
  type PosQuotationRecord,
} from "../../hooks/usePosQuotation";
import usePosExpense, {
  type PosDaySummary,
  type PosExpenseRecord,
} from "../../hooks/usePosExpense";
import useCourier, { CourierMode } from "../../hooks/useCourier";
import useBusinessProfile from "../../hooks/useBusinessProfile";
import {
  clearCustomerDisplay,
  createCustomerDisplaySessionId,
  publishCustomerDisplay,
  type CustomerDisplayStatus,
} from "../../lib/customerDisplaySync";
import { openCustomerDisplayWindow } from "../../lib/customerDisplayWindow";
import { renderPoleDisplay } from "../../lib/poleDisplay";
import { usePoleDisplay } from "../../hooks/usePoleDisplay";
import PoleDisplayModal from "../../components/branch/pos/PoleDisplayModal";
import PosReturnDrawer from "../../components/branch/pos/PosReturnDrawer";
import QuantityKeypadModal from "../../components/branch/pos/QuantityKeypadModal";
import {
  formatQty,
  formatUnitPrice,
  isWeighted,
  minQtyOf,
  roundQty,
  snapQty,
  stepOf,
  type SellBy,
  type UnitOfMeasure,
} from "../../utils/qty";
import PosExchangeDrawer from "../../components/branch/pos/PosExchangeDrawer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  wholesalePrice?: number;
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
  // Unit of measure. Absent / 'UNIT' means the product is counted in pieces,
  // which is how everything behaved before weight pricing existed.
  sellBy?: SellBy;
  unitOfMeasure?: UnitOfMeasure;
  qtyStep?: number;
  minSaleQty?: number;
  qtyDecimals?: number;
}

type LineDiscountType = "FIXED" | "PERCENTAGE";

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
  sellBy?: SellBy;
  unitOfMeasure?: UnitOfMeasure;
  qtyStep?: number;
  minSaleQty?: number;
  qtyDecimals?: number;
  lineDiscountType?: LineDiscountType;
  lineDiscountValue?: number;
  serialNumber?: string;
  /**
   * Whether this line should actually produce a warranty card.
   *
   * Undefined means yes   a product that carries warranty issues a card, which
   * is the behaviour every existing line already had. Setting it false is the
   * cashier saying "not on this one": no card, no serial demanded, and the
   * line is sent with zero months so the backend issues nothing either.
   * Some customers do not want it, some stock is sold as-is, and the sale
   * should not be blocked over it.
   */
  issueWarranty?: boolean;
}

/**
 * The warranty badge, for wherever a product or a cart line is shown.
 *
 * Drawn only for products that actually carry a warranty   a phone case shows
 * nothing at all, exactly as before. The point is that the cashier can see, at
 * the moment of selling, whether this line will produce a warranty card,
 * rather than finding out afterwards from the printed bill.
 */
function WarrantyBadge({
  months,
  compact = false,
}: {
  months?: number;
  compact?: boolean;
}) {
  const m = Number(months || 0);
  if (!(m > 0)) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold ${
        compact ? "px-1 py-0 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
      }`}
      title={`This item carries a ${m}-month warranty   a warranty card is issued when it sells`}
    >
      <ShieldCheck className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {m}m
    </span>
  );
}

function lineDiscountLkr(item: {
  price: number;
  quantity: number;
  isReload?: boolean;
  lineDiscountType?: LineDiscountType;
  lineDiscountValue?: number;
}): number {
  if (item.isReload) return 0;
  const gross = Number(item.price) * Number(item.quantity);
  const value = Number(item.lineDiscountValue) || 0;
  if (value <= 0 || gross <= 0) return 0;
  if (item.lineDiscountType === "PERCENTAGE") {
    return Math.min((gross * value) / 100, gross);
  }
  return Math.min(value, gross);
}

function cartLineTotal(item: {
  price: number;
  quantity: number;
  isReload?: boolean;
  lineDiscountType?: LineDiscountType;
  lineDiscountValue?: number;
}): number {
  return Math.max(0, Number(item.price) * Number(item.quantity) - lineDiscountLkr(item));
}

function isWarrantyCartLine(item: {
  warrantyMonths?: number;
  isService?: boolean;
  isReload?: boolean;
}): boolean {
  return (item.warrantyMonths || 0) > 0 && !item.isService && !item.isReload;
}

/**
 * A line that CAN carry a warranty and has not been opted out of.
 *
 * isWarrantyCartLine answers "could this have a warranty"; this answers "will
 * it". The serial number is demanded, and the card is issued, only for the
 * second   opting out must not leave the sale stuck behind a field nobody
 * needs to fill.
 */
function isWarrantyIssuingLine(item: {
  warrantyMonths?: number;
  isService?: boolean;
  isReload?: boolean;
  issueWarranty?: boolean;
}): boolean {
  return isWarrantyCartLine(item) && item.issueWarranty !== false;
}

function normalizeCustomerResult(raw: CustomerResult): CustomerResult {
  const row = raw as CustomerResult & { loyalty_points?: number };
  return {
    ...raw,
    loyaltyPoints: Number(row.loyaltyPoints ?? row.loyalty_points ?? 0),
  };
}

interface InventoryItem {
  id: string;
  productId: string;
  product?: {
    name: string;
    unitPrice: number;
    costPrice?: number;
    wholesalePrice?: number;
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
  loyaltyPoints?: number;
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
type QuickPosLayout = "classic" | "checkout";

const QUICK_POS_LAYOUT_KEY = "gadgetchain_quick_pos_layout";

function parseQuickPosLayout(value: string | null | undefined): QuickPosLayout | null {
  return value === "checkout" || value === "classic" ? value : null;
}

function readQuickPosLayout(): QuickPosLayout {
  try {
    const fromLs = parseQuickPosLayout(localStorage.getItem(QUICK_POS_LAYOUT_KEY));
    if (fromLs) return fromLs;
  } catch {
    // ignore private mode
  }
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${QUICK_POS_LAYOUT_KEY}=([^;]*)`),
    );
    const fromCookie = parseQuickPosLayout(
      match ? decodeURIComponent(match[1]) : null,
    );
    if (fromCookie) return fromCookie;
  } catch {
    // ignore cookie parse failures
  }
  return "classic";
}

function persistQuickPosLayout(next: QuickPosLayout) {
  try {
    localStorage.setItem(QUICK_POS_LAYOUT_KEY, next);
  } catch {
    // ignore private mode
  }
  try {
    document.cookie = `${QUICK_POS_LAYOUT_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // ignore cookie write failures
  }
}
type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "COD"
  | "KOKO"
  | "MINTPAY"
  | "PAZY";

type SplitPayMethod = "CASH" | "CARD" | "BANK_TRANSFER";

interface SplitTenderRow {
  id: string;
  method: SplitPayMethod;
  amount: string;
}

interface RecentPosSale {
  id: string;
  saleNumber: string;
  totalAmount: number;
  paymentMethod: string;
  customerName?: string;
  createdAt: string;
}

const SPLIT_PAY_OPTIONS: { val: SplitPayMethod; label: string }[] = [
  { val: "CASH", label: "Cash" },
  { val: "CARD", label: "Card" },
  { val: "BANK_TRANSFER", label: "Bank" },
];

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
const POS_OPEN_CART_BACKUP_KEY = "gadgetchain_pos_open_cart";

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

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
    updateSale,
    downloadInvoice,
    getSaleById,
    getPosSaleById,
    printAcknowledgement,
    silentPrintInvoice,
    getSales,
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
  const { getActiveDrawer, getDayBalance, closeDrawer } = useCashDrawer();
  const { listHeldCarts, createHeldCart, getHeldCart, discardHeldCart } =
    usePosHeldCart();
  const {
    listQuotations,
    createQuotation,
    getQuotation,
    convertQuotation,
    voidQuotation,
  } = usePosQuotation();
  const { listExpenses, createExpense, voidExpense, getDaySummary } =
    usePosExpense();

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
  /** Product awaiting a weight / volume entry, or null when the keypad is closed. */
  const [keypadProduct, setKeypadProduct] = useState<Product | null>(null);
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
    if (!locId) return null;
    const saved = getPrinterConfig(locId);
    if (saved) return saved;
    if (usesStarNativePrint()) {
      return createDefaultPrinterConfig();
    }
    return null;
  }, [user?.locationId, user?.branchId, selectedLocationId]);

  const resolveThermalFormat = useCallback(
    () =>
      resolveThermalPaperFormat(resolvePrinterConf(), posSettings.defaultFormat),
    [resolvePrinterConf, posSettings.defaultFormat],
  );

  // ── Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeMatches, setBarcodeMatches] = useState<ScannedProduct[]>([]);
  const [showBarcodeSelect, setShowBarcodeSelect] = useState(false);
  const [lastScannedValue, setLastScannedValue] = useState<string>("");
  const { scanProduct, scanning } = useBarcode();
  const scannerBufferRef = useRef("");
  const scannerLastTimeRef = useRef(0);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [heldCarts, setHeldCarts] = useState<PosHeldCartRecord[]>([]);
  const [holdingCart, setHoldingCart] = useState(false);
  const cartBackupRestoredRef = useRef(false);

  // ── Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const customerDisplaySessionRef = useRef<string | null>(null);
  const customerDisplayWindowRef = useRef<Window | null>(null);
  const lastDisplayItemIdRef = useRef<string | null>(null);
  const [customerDisplayActive, setCustomerDisplayActive] = useState(false);

  // ── Checkout wizard
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [posLayout, setPosLayout] = useState<QuickPosLayout>(readQuickPosLayout);
  const isCheckoutLayout = posLayout === "checkout";

  const changePosLayout = useCallback((next: QuickPosLayout) => {
    setPosLayout(next);
    persistQuickPosLayout(next);
  }, []);

  useEffect(() => {
    persistQuickPosLayout(posLayout);
  }, [posLayout]);

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
  const paymentMethodRef = useRef<PaymentMethod>("CASH");
  paymentMethodRef.current = paymentMethod;
  const [splitRows, setSplitRows] = useState<SplitTenderRow[]>([]);
  const splitRowIdRef = useRef(2);
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
  const [activeDrawerRecord, setActiveDrawerRecord] =
    useState<CashDrawerRecord | null>(null);
  const [dayBalance, setDayBalance] = useState<DayBalanceSummary | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [registerBusy, setRegisterBusy] = useState(false);
  const [recentSales, setRecentSales] = useState<RecentPosSale[]>([]);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [reprintingSaleId, setReprintingSaleId] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingSaleNumber, setEditingSaleNumber] = useState<string | null>(
    null,
  );
  const [loadingEditSaleId, setLoadingEditSaleId] = useState<string | null>(
    null,
  );
  const [showPosReturn, setShowPosReturn] = useState(false);
  const [showPosExchange, setShowPosExchange] = useState(false);
  const [quotations, setQuotations] = useState<PosQuotationRecord[]>([]);
  const [showQuotations, setShowQuotations] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(null);
  const [loyaltyRedeemInput, setLoyaltyRedeemInput] = useState("");
  const [daySummary, setDaySummary] = useState<PosDaySummary | null>(null);
  const [posExpenses, setPosExpenses] = useState<PosExpenseRecord[]>([]);
  const [pettyAmount, setPettyAmount] = useState("");
  const [pettyCategory, setPettyCategory] = useState("OTHER");
  const [pettyNote, setPettyNote] = useState("");
  const [savingPetty, setSavingPetty] = useState(false);
  const [useWholesalePrices, setUseWholesalePrices] = useState(false);

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
      // Org admin not tied to a specific location   skip the gate
      setDrawerChecked(true);
      setDrawerIsOpen(true);
      return;
    }
    const locationId = user?.locationId || user?.branchId;
    if (!locationId) return;
    getActiveDrawer(locationId)
      .then((res: any) => {
        const drawer = (res?.data as CashDrawerRecord | null) ?? null;
        setActiveDrawerRecord(drawer);
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
  const poleDisplay = usePoleDisplay();
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
    // Unit-of-measure columns are newer than the inventory hook's row type.
    const uom = i.product as
      | {
          sellBy?: string;
          unitOfMeasure?: string;
          qtyStep?: number;
          minSaleQty?: number;
          qtyDecimals?: number;
        }
      | undefined;
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
      wholesalePrice: Number(i.product?.wholesalePrice) || 0,
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
      sellBy: (uom?.sellBy ?? "UNIT") as SellBy,
      unitOfMeasure: (uom?.unitOfMeasure ?? "PCS") as UnitOfMeasure,
      qtyStep: Number(uom?.qtyStep ?? 1),
      minSaleQty: Number(uom?.minSaleQty ?? 1),
      qtyDecimals: Number(uom?.qtyDecimals ?? 0),
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
        itemType: selectedItemType,
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

  const grossSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const lineDiscountTotal = cart.reduce((s, i) => s + lineDiscountLkr(i), 0);
  const subtotal = Math.max(0, grossSubtotal - lineDiscountTotal);
  const billDiscount = (() => {
    const d = parseFloat(discountAmount) || 0;
    if (d <= 0) return 0;
    if (discountType === "PERCENTAGE")
      return Math.min((subtotal * d) / 100, subtotal);
    return Math.min(d, subtotal);
  })();
  const loyaltyAvailable = Number(selectedCustomer?.loyaltyPoints) || 0;
  const loyaltyRedeem = Math.min(
    loyaltyAvailable,
    Math.max(0, Math.floor(parseFloat(loyaltyRedeemInput) || 0)),
  );
  const discountVal = Math.min(subtotal, billDiscount + loyaltyRedeem);
  const productTotal = subtotal - discountVal;
  const courierPieces = cart.reduce((sum, item) => sum + item.quantity, 0);
  const courierChargesTotal =
    (Number(shippingCharge) || 0) +
    (Number(insuranceCharge) || 0) +
    (Number(additionalCharges) || 0);
  const total = courierEnabled
    ? productTotal + courierChargesTotal
    : productTotal;
  const posLocationId =
    user?.locationId || user?.branchId || selectedLocationId;
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
    const displayItems = cart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      lineTotal: cartLineTotal(item),
    }));

    const lastItem = (() => {
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
        lineTotal: cartLineTotal(item),
      };
    })();

    // Counter-top serial pole display runs independently of the second-screen
    // window   it only needs the cable connected.
    renderPoleDisplay({
      items: displayItems,
      lastItem,
      total,
      status: mapStepToDisplayStatus(step),
      businessName: businessData?.name,
      change: change > 0 ? change : undefined,
    });

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
      items: displayItems,
      lastItem,
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
    change,
    customerDisplayEnabled,
    discountVal,
    mapStepToDisplayStatus,
    step,
    subtotal,
    total,
  ]);

  useEffect(() => {
    syncCustomerDisplay();
    // poleDisplay.connected re-pushes the current cart the moment the
    // pole display cable comes online, instead of waiting for the next scan.
  }, [syncCustomerDisplay, poleDisplay.connected]);

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
    void syncCustomerDisplay();
    void (async () => {
      const popup = await openCustomerDisplayWindow(sessionId);
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
    })();
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
  const canSplitPay =
    !courierEnabled &&
    !isAdvancePayment &&
    !["KOKO", "MINTPAY", "PAZY", "COD"].includes(paymentMethod);
  const isSplitTender = canSplitPay && splitRows.length >= 2;
  const splitAllocated = splitRows.reduce(
    (sum, row) => sum + (parseFloat(row.amount) || 0),
    0,
  );
  const splitRemainder = Math.round((total - splitAllocated) * 100) / 100;
  const splitOk =
    isSplitTender &&
    splitRows.filter((row) => (parseFloat(row.amount) || 0) > 0.001).length >=
      2 &&
    Math.abs(splitRemainder) < 0.05;

  const loadRecentSales = useCallback(async () => {
    if (!posLocationId) {
      setRecentSales([]);
      return;
    }
    try {
      const response = await getSales({
        locationId: posLocationId,
        status: "COMPLETED",
        page: 1,
        limit: 20,
      });
      const payload = (response as any)?.data;
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      setRecentSales(
        rows.map((sale: any) => ({
          id: sale.id,
          saleNumber: sale.saleNumber || sale.sale_number || sale.id,
          totalAmount: Number(sale.totalAmount ?? sale.total_amount ?? 0),
          paymentMethod: String(sale.paymentMethod || sale.payment_method || ""),
          customerName: sale.customerName || sale.customer_name || undefined,
          createdAt: sale.createdAt || sale.created_at || "",
        })),
      );
    } catch {
      setRecentSales([]);
    }
  }, [getSales, posLocationId]);

  const openRegister = useCallback(async () => {
    const locationId = posLocationId;
    if (!locationId) {
      toast.error("Select a branch/location to view the register");
      return;
    }
    setShowRegister(true);
    setRegisterBusy(true);
    try {
      const [drawerRes, balanceRes, profitRes, expenseRes] = await Promise.all([
        getActiveDrawer(locationId),
        getDayBalance(locationId),
        getDaySummary(locationId),
        listExpenses(locationId),
      ]);
      const drawer = ((drawerRes as any)?.data as CashDrawerRecord | null) ?? null;
      setActiveDrawerRecord(drawer);
      if (!isOrgAdmin) setDrawerIsOpen(!!drawer);
      setDayBalance(((balanceRes as any)?.data as DayBalanceSummary | null) ?? null);
      setDaySummary(((profitRes as any)?.data as PosDaySummary | null) ?? null);
      const expenseRows = (expenseRes as any)?.data;
      setPosExpenses(Array.isArray(expenseRows) ? expenseRows : []);
    } catch {
      toast.error("Could not load register");
    } finally {
      setRegisterBusy(false);
    }
  }, [getActiveDrawer, getDayBalance, getDaySummary, listExpenses, isOrgAdmin, posLocationId]);

  const submitPettyExpense = async () => {
    if (!posLocationId) {
      toast.error("Select a branch/location first");
      return;
    }
    const amount = Number(pettyAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a petty cash amount");
      return;
    }
    setSavingPetty(true);
    try {
      const res = await createExpense({
        locationId: posLocationId,
        amount,
        category: pettyCategory,
        note: pettyNote.trim() || undefined,
      });
      if (!res?.success && !res?.data) {
        throw new Error(res?.message || "Failed to record expense");
      }
      toast.success("Petty cash recorded");
      setPettyAmount("");
      setPettyNote("");
      await openRegister();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not record expense");
    } finally {
      setSavingPetty(false);
    }
  };

  const submitCloseRegister = useCallback(async () => {
    if (!activeDrawerRecord?.id) {
      toast.error("No open register for this location");
      return;
    }
    const counted = parseFloat(closingCash);
    if (Number.isNaN(counted) || counted < 0) {
      toast.error("Enter counted cash");
      return;
    }
    setRegisterBusy(true);
    try {
      await closeDrawer(
        activeDrawerRecord.id,
        counted,
        closingNotes.trim() || undefined,
      );
      toast.success("Register closed");
      setShowCloseRegister(false);
      setShowRegister(false);
      setClosingCash("");
      setClosingNotes("");
      setActiveDrawerRecord(null);
      if (!isOrgAdmin) setDrawerIsOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not close register";
      toast.error(message);
    } finally {
      setRegisterBusy(false);
    }
  }, [activeDrawerRecord, closeDrawer, closingCash, closingNotes, isOrgAdmin]);

  const reprintRecentSale = useCallback(
    async (sale: RecentPosSale) => {
      setReprintingSaleId(sale.id);
      try {
        await silentPrintInvoice(sale.id, {
          format: resolveThermalFormat(),
          printerConf: resolvePrinterConf(),
        });
        toast.success(`Reprinted ${sale.saleNumber}`);
      } catch {
        toast.error("Failed to reprint. Check printer connection.");
      } finally {
        setReprintingSaleId(null);
      }
    },
    [resolvePrinterConf, resolveThermalFormat, silentPrintInvoice],
  );

  const startEditRecentSale = useCallback(
    async (sale: RecentPosSale) => {
      if (cart.length > 0 && !editingSaleId) {
        const ok = window.confirm(
          "Current cart will be replaced with this sale. Continue?",
        );
        if (!ok) return;
      }
      setLoadingEditSaleId(sale.id);
      try {
        const res = await getPosSaleById(sale.id);
        const data = (res as any)?.data?.data ?? (res as any)?.data ?? res;
        if (!data?.id) throw new Error("Sale not found");

        if (data.shipment?.id || data.courierShipmentId) {
          throw new Error(
            "Courier sales cannot be edited from Recent. Update the shipment instead.",
          );
        }
        const refunds = data.saleRefunds || data.refunds || [];
        if (Array.isArray(refunds) && refunds.length > 0) {
          throw new Error("This sale has refunds and cannot be edited.");
        }
        const status = String(data.status || "").toUpperCase();
        if (
          status === "CANCELLED" ||
          status === "REFUNDED" ||
          status === "PARTIAL_REFUND"
        ) {
          throw new Error(`Cannot edit a ${status.toLowerCase()} sale.`);
        }

        const lines: CartItem[] = (
          data.saleItems ||
          data.items ||
          []
        ).map((item: any, idx: number) => {
          const product = item.product || {};
          const productId = item.productId || product.id;
          const catalog = products.find((p) => p.productId === productId);
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
          const lineDiscount = Number(
            item.discountAmount ?? item.discount_amount ?? item.discount ?? 0,
          );
          const isReload =
            catalog?.isReload === true ||
            product.isReload === true ||
            Boolean(item.reloadPhone);
          const isService =
            catalog?.isService === true || product.isService === true;
          const liveStock = Number(catalog?.stock ?? 0);
          // Stock on shelf already excludes this sale's qty   add it back for edit.
          const editableStock = liveStock + qty;
          const serialized =
            Number(item.warrantyMonths || catalog?.warrantyMonths || 0) > 0 &&
            !isService &&
            !isReload;
          return {
            id: serialized
              ? `edit-${item.id || idx}-${Date.now()}`
              : catalog?.id || productId,
            productId,
            name: item.productName || product.name || catalog?.name || "Item",
            price: unitPrice,
            costPrice: Number(
              item.costPrice ?? product.costPrice ?? catalog?.costPrice ?? 0,
            ),
            quantity: qty,
            stock: editableStock,
            category:
              product.category?.name || catalog?.category || "General",
            warrantyMonths: Number(
              item.warrantyMonths || catalog?.warrantyMonths || 0,
            ),
            isService,
            isReload,
            reloadPhone: item.reloadPhone || undefined,
            serialNumber: item.serialNumber || undefined,
            ...(lineDiscount > 0
              ? {
                  lineDiscountType: "FIXED" as const,
                  lineDiscountValue: lineDiscount,
                }
              : {}),
          };
        });

        if (lines.length === 0) {
          throw new Error("Sale has no line items to edit.");
        }

        clearCart();
        setCart(lines);
        lastDisplayItemIdRef.current = lines[lines.length - 1]?.id ?? null;

        const cust = data.customer;
        if (cust?.id) {
          setSelectedCustomer({
            id: cust.id,
            name: cust.name || data.customerName || "",
            phone: cust.phone || data.customerPhone || "",
            email: cust.email || data.customerEmail || "",
          } as any);
          setCustomerSearch(cust.name || data.customerName || "");
        } else {
          setSelectedCustomer(null);
          setCustomerSearch("");
        }
        setCustomerName(data.customerName || cust?.name || "");
        setCustomerPhone(data.customerPhone || cust?.phone || "");
        setCustomerEmail(data.customerEmail || cust?.email || "");

        const headerDiscount = Number(
          data.discountAmount ?? data.discount ?? 0,
        );
        if (headerDiscount > 0) {
          setDiscountAmount(String(headerDiscount));
          setDiscountType("FIXED");
        }

        const payments = data.salePayments || data.payments || [];
        if (Array.isArray(payments) && payments.length >= 2) {
          setSplitRows(
            payments.map((p: any, i: number) => ({
              id: `edit-pay-${i}`,
              method: (String(p.paymentMethod || p.method || "CASH").toUpperCase() ===
              "BANK_TRANSFER"
                ? "BANK_TRANSFER"
                : String(p.paymentMethod || p.method || "CASH").toUpperCase() ===
                    "CARD"
                  ? "CARD"
                  : "CASH") as SplitPayMethod,
              amount: String(Number(p.amount) || 0),
            })),
          );
        } else if (Array.isArray(payments) && payments.length === 1) {
          const pm = String(
            payments[0].paymentMethod || payments[0].method || data.paymentMethod || "CASH",
          ).toUpperCase();
          const method = (
            ["CARD", "BANK_TRANSFER", "KOKO", "MINTPAY", "PAYZY", "PAZY", "COD"].includes(pm)
              ? pm === "PAYZY"
                ? "PAZY"
                : pm
              : "CASH"
          ) as PaymentMethod;
          setPaymentMethod(method);
          paymentMethodRef.current = method;
          if (method === "CASH") {
            setCashReceived(String(Number(payments[0].amount) || 0));
          }
        } else if (data.paymentMethod) {
          const pm = String(data.paymentMethod).toUpperCase();
          const method = (
            ["CARD", "BANK_TRANSFER", "KOKO", "MINTPAY", "PAYZY", "PAZY"].includes(pm)
              ? pm === "PAYZY"
                ? "PAZY"
                : pm
              : "CASH"
          ) as PaymentMethod;
          setPaymentMethod(method);
          paymentMethodRef.current = method;
        }

        setEditingSaleId(data.id);
        setEditingSaleNumber(
          data.saleNumber || data.sale_number || sale.saleNumber,
        );
        setCourierEnabled(false);
        setShowRecentSales(false);
        setStep("cart");
        toast.success(
          `Editing ${data.saleNumber || sale.saleNumber}   update cart then save`,
        );
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Could not load sale for edit",
        );
      } finally {
        setLoadingEditSaleId(null);
      }
    },
    // clearCart is stable enough in this component; include deps used above
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart.length, editingSaleId, getPosSaleById, products],
  );

  const enableSplitTender = () => {
    const first: SplitPayMethod =
      paymentMethod === "CARD" || paymentMethod === "BANK_TRANSFER"
        ? paymentMethod
        : "CASH";
    const second: SplitPayMethod = first === "CASH" ? "CARD" : "CASH";
    splitRowIdRef.current = 2;
    setSplitRows([
      { id: "1", method: first, amount: total > 0 ? total.toFixed(2) : "" },
      { id: "2", method: second, amount: "" },
    ]);
    setPartialAmountInput("");
  };

  const updateSplitRow = (
    id: string,
    patch: Partial<Pick<SplitTenderRow, "method" | "amount">>,
  ) => {
    setSplitRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const addSplitRow = () => {
    splitRowIdRef.current += 1;
    const used = new Set(splitRows.map((row) => row.method));
    const nextMethod =
      SPLIT_PAY_OPTIONS.find((opt) => !used.has(opt.val))?.val || "CASH";
    setSplitRows((prev) => [
      ...prev,
      {
        id: String(splitRowIdRef.current),
        method: nextMethod,
        amount: splitRemainder > 0 ? splitRemainder.toFixed(2) : "",
      },
    ]);
  };

  const removeSplitRow = (id: string) => {
    setSplitRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length < 2 ? [] : next;
    });
  };

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
      if (showScanner || showBarcodeSelect || showCourierTrackingScanner || showPosReturn)
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
  }, [showScanner, showBarcodeSelect, showCourierTrackingScanner, showPosReturn]);

  // ─── Cart actions ───────────────────────────────────────────────────────────

  const wholesaleUnitPrice = (product: Product, wholesale: boolean) =>
    wholesale && Number(product.wholesalePrice) > 0
      ? Number(product.wholesalePrice)
      : product.price;

  const applyWholesaleMode = (next: boolean) => {
    setUseWholesalePrices(next);
    setCart((prev) =>
      prev.map((item) => {
        const product = products.find((p) => p.productId === item.productId);
        if (!product) return item;
        return { ...item, price: wholesaleUnitPrice(product, next) };
      }),
    );
    toast.success(next ? "Wholesale prices on" : "Retail prices on");
  };

  /**
   * Add a product to the cart.
   *
   * Products sold by weight, volume or length cannot just get "1" added: one
   * kilo of rice is rarely what was asked for. Those open the quantity keypad
   * first, and land here through addWeighedToCart once an amount is entered.
   */
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
    if (isWeighted(product)) {
      setKeypadProduct(product);
      return;
    }
    lastDisplayItemIdRef.current = product.id;
    const sellPrice = wholesaleUnitPrice(product, useWholesalePrices);
    setCart((prev) => {
      const serialized = isWarrantyCartLine(product);
      if (serialized) {
        const sameQty = prev
          .filter((i) => i.productId === product.productId)
          .reduce((sum, i) => sum + i.quantity, 0);
        if (!product.isService && sameQty >= product.stock) {
          toast.error(`Only ${product.stock} units available`);
          return prev;
        }
      }
      const existing = serialized
        ? undefined
        : prev.find((i) => i.id === product.id);
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
      const lineId = serialized ? `${product.id}:${Date.now()}` : product.id;
      return [
        ...prev,
        {
          id: lineId,
          productId: product.productId,
          name: product.name,
          price: sellPrice,
          costPrice: product.costPrice || 0,
          quantity: 1,
          stock: product.stock,
          category: product.category,
          image: product.image,
          warrantyMonths: product.warrantyMonths || 0,
          isService: product.isService ?? false,
          isReload: false,
          sellBy: product.sellBy,
          unitOfMeasure: product.unitOfMeasure,
          qtyStep: product.qtyStep,
          minSaleQty: product.minSaleQty,
          qtyDecimals: product.qtyDecimals,
          lineDiscountType: "FIXED",
          lineDiscountValue: 0,
          serialNumber: "",
        },
      ];
    });
  };

  /**
   * Commit a quantity chosen on the keypad.
   *
   * Adds to any existing line for the same product rather than creating a second
   * one   weighing the same item twice at the counter is normal, and two lines
   * for 250 g and 250 g reads worse on the bill than one for 500 g.
   */
  const addWeighedToCart = (product: Product, quantity: number) => {
    const qty = snapQty(quantity, product);
    if (qty <= 0) return;

    lastDisplayItemIdRef.current = product.id;
    const sellPrice = wholesaleUnitPrice(product, useWholesalePrices);

    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const alreadyInCart = existing ? Number(existing.quantity) : 0;
      const total = roundQty(alreadyInCart + qty);

      if (!product.isService && total > Number(product.stock || 0)) {
        toast.error(
          `Only ${formatQty(Number(product.stock || 0), product)} available`,
        );
        return prev;
      }

      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: total } : i));
      }

      toast.success(`${formatQty(qty, product)} ${product.name} added`, {
        duration: 1500,
      });
      return [
        ...prev,
        {
          id: product.id,
          productId: product.productId,
          name: product.name,
          price: sellPrice,
          costPrice: product.costPrice || 0,
          quantity: qty,
          stock: product.stock,
          category: product.category,
          image: product.image,
          warrantyMonths: product.warrantyMonths || 0,
          isService: product.isService ?? false,
          isReload: false,
          sellBy: product.sellBy,
          unitOfMeasure: product.unitOfMeasure,
          qtyStep: product.qtyStep,
          minSaleQty: product.minSaleQty,
          qtyDecimals: product.qtyDecimals,
          lineDiscountType: "FIXED",
          lineDiscountValue: 0,
          serialNumber: "",
        },
      ];
    });
    setKeypadProduct(null);
  };

  const addReloadToCart = () => {
    const product = products.find((p) => p.id === reloadProviderId);
    if (!product || !product.isReload) {
      toast.error("Select a reload provider");
      return;
    }
    const phone = reloadPhone.trim();
    const amount = Math.floor(Number(reloadAmount));
    if (!Number.isFinite(amount) || amount < 1) {
      toast.error("Enter a valid reload amount (whole LKR)");
      return;
    }
    const cartId = `${product.id}:${phone || "_"}`;
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
          lineDiscountType: "FIXED",
          lineDiscountValue: 0,
          ...(phone ? { reloadPhone: phone } : {}),
        },
      ];
    });
    toast.success(
      phone
        ? `${product.name} · ${phone} · Rs.${amount.toLocaleString()} added`
        : `${product.name} · Rs.${amount.toLocaleString()} added`,
      { duration: 1500 },
    );
    setReloadAmount("");
  };

  /**
   * Turn this line's warranty on or off.
   *
   * Clearing the serial when warranty is switched off keeps the two honest:
   * a serial captured for a card that will not exist is just a stale value
   * waiting to be sent somewhere it does not belong.
   */
  const setLineWarranty = (id: string, issue: boolean) => {
    lastDisplayItemIdRef.current = id;
    setCart((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              issueWarranty: issue,
              ...(issue ? {} : { serialNumber: "" }),
            }
          : i,
      ),
    );
  };

  const updateSerialNumber = (id: string, value: string) => {
    lastDisplayItemIdRef.current = id;
    setCart((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, serialNumber: value.slice(0, 64) } : i,
      ),
    );
  };

  const updateQty = (id: string, qty: number) => {
    const line = cart.find((i) => i.id === id);

    // Weighted lines step by the product's own increment (10 g, 100 ml) and drop
    // out of the cart below their minimum rather than at zero, so tapping "-" on
    // a 100 g minimum item removes it instead of leaving an unsellable 50 g.
    if (line && isWeighted(line)) {
      const snapped = roundQty(qty);
      if (snapped < minQtyOf(line)) {
        setCart((prev) => prev.filter((i) => i.id !== id));
        return;
      }
      const product = products.find((pr) => pr.id === id);
      const maxStock = editingSaleId
        ? Number(line.stock ?? product?.stock ?? 0)
        : Number(product?.stock ?? line.stock ?? 0);
      if (!line.isService && maxStock > 0 && snapped > maxStock) {
        toast.error(`Only ${formatQty(maxStock, line)} available`);
        return;
      }
      lastDisplayItemIdRef.current = id;
      setCart((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: snapped } : i)),
      );
      return;
    }

    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    const cartItem = cart.find((i) => i.id === id);
    if (cartItem && isWarrantyCartLine(cartItem)) {
      return;
    }
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
    const maxStock = editingSaleId
      ? Number(cartItem?.stock ?? product?.stock ?? 0)
      : Number(product?.stock ?? 0);
    if (
      (product || editingSaleId) &&
      !cartItem?.isService &&
      maxStock > 0 &&
      qty > maxStock
    ) {
      toast.error(`Only ${maxStock} units available`);
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

  const updateLineDiscount = (
    id: string,
    type: LineDiscountType,
    rawValue: string,
  ) => {
    const parsed = rawValue === "" ? 0 : parseFloat(rawValue);
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    lastDisplayItemIdRef.current = id;
    setCart((prev) =>
      prev.map((i) =>
        i.id === id && !i.isReload
          ? { ...i, lineDiscountType: type, lineDiscountValue: value }
          : i,
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
    setSplitRows([]);
    setLoyaltyRedeemInput("");
    setOpenQuoteId(null);
    setEditingSaleId(null);
    setEditingSaleNumber(null);
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
        setCustomerResults(list.map(normalizeCustomerResult));
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
    // Read from ref so express Cash/Card can set the method synchronously
    // before this runs, without waiting for a React state flush.
    const paymentMethod = paymentMethodRef.current;
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
    const missingImei = cart.find(
      (item) => isWarrantyIssuingLine(item) && !String(item.serialNumber || "").trim(),
    );
    if (missingImei) {
      toast.error(`Enter IMEI / serial for ${missingImei.name}`);
      return;
    }
    if (!validateCourierDetails()) return;

    if (editingSaleId && courierEnabled) {
      toast.error("Disable courier delivery while editing a sale");
      return;
    }

    if (paymentMethod === "COD" && !courierEnabled) {
      toast.error("COD is only available for courier delivery");
      return;
    }

    const useSplit = splitRows.length >= 2 && canSplitPay;
    if (useSplit) {
      const splitPayments = splitRows
        .map((row) => ({
          method: row.method,
          amount: parseFloat(row.amount) || 0,
        }))
        .filter((row) => row.amount > 0.001);
      if (splitPayments.length < 2) {
        toast.error("Add at least two payment amounts to split");
        return;
      }
      const splitSum = splitPayments.reduce((sum, row) => sum + row.amount, 0);
      if (Math.abs(splitSum - total) > 0.05) {
        toast.error("Split amounts must equal the total");
        return;
      }
      const cashAlloc =
        splitPayments.find((row) => row.method === "CASH")?.amount || 0;
      if (cashAlloc > 0 && cashReceived.trim() !== "") {
        const received = parseFloat(cashReceived) || 0;
        if (received < cashAlloc) {
          toast.error("Cash received is less than the cash portion");
          return;
        }
      }
    } else if (paymentMethod === "CASH" && !isAdvancePayment) {
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
        discount: lineDiscountLkr(item),
        discountType: "FIXED" as const,
        tax: 0,
        warrantyMonths: isWarrantyIssuingLine(item)
          ? item.warrantyMonths || 0
          : 0,
        ...(item.isReload && item.reloadPhone
          ? { reloadPhone: item.reloadPhone }
          : {}),
        ...(item.serialNumber?.trim()
          ? { serialNumber: item.serialNumber.trim() }
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
        if (editingSaleId) {
          throw new Error("Cannot convert an edited sale into a courier shipment");
        }
        const shipmentPm = mapPaymentToShipmentMethod(paymentMethod);
        const isCodShipment = shipmentPm === "cod";
        const paymentFlags = getShipmentPaymentFlags(shipmentPm, total);
        const itemDescription = cart
          .map((item) =>
            item.isReload
              ? `${item.name}${item.reloadPhone ? ` · ${item.reloadPhone}` : ""} · Rs.${item.quantity}`
              // Weighted lines carry their unit: "Rice x0.5" on a courier manifest
              // is ambiguous, "Rice 500 g" is not.
              : `${item.name} ${isWeighted(item) ? formatQty(item.quantity, item) : `x${item.quantity}`}`,
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
            await printAcknowledgement(saleId, resolveThermalFormat());
          } else {
            const cashAmt =
              paymentMethod === "CASH" && !isAdvancePayment
                ? parseFloat(cashReceived) || 0
                : 0;
            await silentPrintInvoice(saleId, {
              format: resolveThermalFormat(),
              cashReceived: cashAmt > 0 ? cashAmt : undefined,
              printerConf: resolvePrinterConf(),
              openDrawer: paymentMethod === "CASH",
            });
          }
        }
        await loadProducts();
        void loadRecentSales();
        return;
      }

      // BNPL methods with no entered amount stay fully deferred (amount=0)
      const splitPayments = useSplit
        ? splitRows
            .map((row) => ({
              method: row.method as
                | "CASH"
                | "CARD"
                | "BANK_TRANSFER"
                | "CHEQUE"
                | "COD"
                | "KOKO"
                | "MINTPAY"
                | "PAYZY",
              amount: parseFloat(row.amount) || 0,
              reference: `QPOS-SPLIT-${row.method}-${Date.now()}`,
              receivedById: user.id,
            }))
            .filter((row) => row.amount > 0.001)
        : [];
      if (useSplit && splitPayments[0]) {
        paymentMethodRef.current = splitPayments[0].method as PaymentMethod;
      }
      const payments = useSplit
        ? splitPayments
        : [
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

      const salePayload = {
        locationId,
        soldById: user.id,
        customerId,
        ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
        ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
        ...(customerEmail.trim() ? { customerEmail: customerEmail.trim() } : {}),
        items: saleItems,
        payments,
        type: "DIRECT_SALE" as const,
        saleType: useWholesalePrices ? ("WHOLESALE" as const) : ("POS" as const),
        saleChannel: useWholesalePrices ? "WHOLESALE" : "POS",
        discount: discountVal,
        discountType: loyaltyRedeem > 0 ? ("FIXED" as const) : discountType,
        notes:
          notes ||
          [
            editingSaleId ? "Quick POS Sale (edited)" : "Quick POS Sale",
            useWholesalePrices ? "WHOLESALE" : null,
            useSplit ? "SPLIT" : null,
          ]
            .filter(Boolean)
            .join(" | "),
        ...(!editingSaleId && loyaltyRedeem > 0
          ? { loyaltyRedeemPoints: loyaltyRedeem }
          : {}),
        ...(isPartialPayment && advanceDueDate ? { advanceDueDate } : {}),
        // Do not create a new job when editing an existing sale
        ...(!editingSaleId && saleJob.isJob && saleJob.title.trim()
          ? { job: { ...saleJob, title: saleJob.title.trim() } }
          : {}),
        ...(user.businessId ? { businessId: user.businessId } : {}),
      };

      const saleRes = editingSaleId
        ? await updateSale(editingSaleId, salePayload as any)
        : await createSale(salePayload as any);

      const saleData = saleRes?.data as any;
      const saleId = saleData?.sale?.id || saleData?.id || editingSaleId;
      const saleNumber =
        saleData?.sale?.saleNumber ||
        saleData?.saleNumber ||
        editingSaleNumber;

      if (!saleId || !saleNumber)
        throw new Error("Invalid response from server");

      if (openQuoteId && !editingSaleId) {
        await convertQuotation(openQuoteId, saleId).catch(() => undefined);
        setOpenQuoteId(null);
      }

      const editedSaleId = editingSaleId;
      setEditingSaleId(null);
      setEditingSaleNumber(null);

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
      const usedCash =
        paymentMethod === "CASH" ||
        (useSplit && splitPayments.some((row) => row.method === "CASH"));
      if (usedCash && !isDeferredMethod && posSettings.autoCashDrawer) {
        setShowCashDrawer(true);
      }
      toast.success(
        editedSaleId
          ? `Sale ${saleNumber} updated!`
          : isDeferredMethod
            ? `Order ${saleNumber} created – payment pending!`
            : `Sale ${saleNumber} completed!`,
        { duration: 4000 },
      );
      // Quick POS receipt routing:
      // advance/partial -> /acknowledgement?format=80mm
      // normal sale      -> /invoice/html?format=80mm
      const printerConf = resolvePrinterConf();
      if (
        !isDeferredMethod &&
        (posSettings.autoPrintOnSale ||
          printerConf?.autoPrintOnSale ||
          isPartialPayment)
      ) {
        const cashAmt =
          paymentMethod === "CASH" && !isAdvancePayment
            ? parseFloat(cashReceived) || 0
            : 0;
        if (isPartialPayment) {
          await printAcknowledgement(saleId, resolveThermalFormat());
        } else {
          await silentPrintInvoice(saleId, {
            format: resolveThermalFormat(),
            cashReceived: cashAmt > 0 ? cashAmt : undefined,
            printerConf,
            openDrawer: usedCash,
          });
        }
      }
      await loadProducts();
      void loadRecentSales();
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
          ? resolveThermalFormat()
          : ((format as "a4" | "80mm" | "58mm" | undefined) ??
            resolveThermalFormat());

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
        setSplitRows([]);
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

  const expressCheckout = (method: "CASH" | "CARD") => {
    if (isProcessing || cart.length === 0) return;
    if (courierEnabled || isAdvancePayment || step !== "cart") {
      toast.error("Use checkout for courier, advance, or wizard payments");
      if (step === "cart") setStep("customer");
      return;
    }
    paymentMethodRef.current = method;
    setPaymentMethod(method);
    setPartialAmountInput("");
    setCashReceived("");
    setSplitRows([]);
    void handleProcessSale();
  };

  const requestClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Clear the current cart?")) clearCart();
  };

  const buildHeldSnapshot = (): HeldCartSnapshot => ({
    cart: cart as unknown as HeldCartSnapshot["cart"],
    customer: {
      id: selectedCustomer?.id,
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      loyaltyPoints: selectedCustomer?.loyaltyPoints,
    },
    discountAmount,
    discountType,
    notes,
    loyaltyRedeemInput,
  });

  const applyHeldSnapshot = (snap: HeldCartSnapshot) => {
    const lines = Array.isArray(snap.cart) ? snap.cart : [];
    setCart(lines as unknown as CartItem[]);
    lastDisplayItemIdRef.current =
      (lines[lines.length - 1] as { id?: string } | undefined)?.id ?? null;
    const customer = snap.customer;
    if (customer?.id) {
      setSelectedCustomer({
        id: customer.id,
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email,
        loyaltyPoints: Number(customer.loyaltyPoints) || 0,
      });
    } else {
      setSelectedCustomer(null);
    }
    setCustomerName(customer?.name || "");
    setCustomerPhone(customer?.phone || "");
    setCustomerEmail(customer?.email || "");
    setCustomerSearch(customer?.phone || customer?.name || "");
    setDiscountAmount(snap.discountAmount || "");
    if (snap.discountType === "PERCENTAGE" || snap.discountType === "FIXED") {
      setDiscountType(snap.discountType);
    }
    setNotes(snap.notes || "");
    setLoyaltyRedeemInput(snap.loyaltyRedeemInput || "");
    setStep("cart");
  };

  const refreshQuotations = async () => {
    if (!posLocationId) {
      setQuotations([]);
      return;
    }
    const res = await listQuotations(posLocationId);
    const rows = (res?.data as PosQuotationRecord[] | undefined) || [];
    setQuotations(
      Array.isArray(rows) ? rows.filter((row) => row.status === "OPEN") : [],
    );
  };

  const saveCurrentQuote = async () => {
    if (cart.length === 0 || savingQuote) return;
    if (!posLocationId) {
      toast.error("Select a branch/location before saving a quote");
      return;
    }
    const note =
      window.prompt(
        "Quote note (customer name or phone)?",
        customerName || customerPhone || "",
      ) ?? "";
    setSavingQuote(true);
    try {
      const res = await createQuotation({
        locationId: posLocationId,
        note: note.trim() || undefined,
        cartJson: buildHeldSnapshot(),
        itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: total,
        customerId: selectedCustomer?.id,
        customerName: customerName || selectedCustomer?.name,
        customerPhone: customerPhone || selectedCustomer?.phone,
      });
      const row = res?.data as PosQuotationRecord | undefined;
      if (!res?.success && !row) {
        throw new Error(res?.message || "Failed to save quote");
      }
      if (row?.id) setOpenQuoteId(row.id);
      toast.success(row?.quoteNumber ? `Quote ${row.quoteNumber} saved` : "Quote saved");
      await refreshQuotations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not save quote";
      toast.error(message);
    } finally {
      setSavingQuote(false);
    }
  };

  const resumeQuote = async (id: string) => {
    if (cart.length > 0) {
      const ok = window.confirm("Replace the current cart with this quote?");
      if (!ok) return;
    }
    const res = await getQuotation(id);
    const row = res?.data as PosQuotationRecord | undefined;
    const snap = row?.cartJson;
    if (!row?.id || !snap || !Array.isArray(snap.cart) || snap.cart.length === 0) {
      toast.error("Quote is empty");
      return;
    }
    applyHeldSnapshot(snap);
    setOpenQuoteId(row.id);
    setShowQuotations(false);
    toast.success(row.quoteNumber ? `Loaded ${row.quoteNumber}` : "Quote loaded");
  };

  const voidQuote = async (id: string) => {
    if (!window.confirm("Void this quotation?")) return;
    await voidQuotation(id);
    if (openQuoteId === id) setOpenQuoteId(null);
    await refreshQuotations();
  };

  const refreshHeldCarts = async () => {
    if (!posLocationId) {
      setHeldCarts([]);
      return;
    }
    const res = await listHeldCarts(posLocationId);
    const rows = (res?.data as PosHeldCartRecord[] | undefined) || [];
    setHeldCarts(Array.isArray(rows) ? rows : []);
  };

  const holdCurrentCart = async () => {
    if (cart.length === 0 || holdingCart) return;
    if (!posLocationId) {
      toast.error("Select a branch/location before holding the cart");
      return;
    }
    const note =
      window.prompt(
        "Hold note (customer name or phone)?",
        customerName || customerPhone || "",
      ) ?? "";
    setHoldingCart(true);
    try {
      const res = await createHeldCart({
        locationId: posLocationId,
        note: note.trim() || undefined,
        cartJson: buildHeldSnapshot(),
        itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: subtotal,
      });
      if (!res?.success && !res?.data) {
        throw new Error(res?.message || "Failed to hold cart");
      }
      toast.success("Cart held   no sale or stock change");
      clearCart();
      try {
        sessionStorage.removeItem(POS_OPEN_CART_BACKUP_KEY);
      } catch {
        /* ignore */
      }
      await refreshHeldCarts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not hold cart";
      toast.error(message);
    } finally {
      setHoldingCart(false);
    }
  };

  const resumeHeldCart = async (id: string) => {
    if (cart.length > 0) {
      const ok = window.confirm("Replace the current cart with the held cart?");
      if (!ok) return;
    }
    const res = await getHeldCart(id);
    const row = res?.data as PosHeldCartRecord | undefined;
    const snap = row?.cartJson;
    if (!snap || !Array.isArray(snap.cart) || snap.cart.length === 0) {
      toast.error("Held cart is empty");
      return;
    }
    applyHeldSnapshot(snap);
    await discardHeldCart(id);
    setShowHeldCarts(false);
    toast.success("Held cart restored");
    await refreshHeldCarts();
  };

  const discardHeld = async (id: string) => {
    if (!window.confirm("Discard this held cart?")) return;
    await discardHeldCart(id);
    await refreshHeldCarts();
  };

  useEffect(() => {
    void refreshHeldCarts();
    void refreshQuotations();
    void loadRecentSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posLocationId]);

  useEffect(() => {
    if (!posLocationId) return;
    try {
      sessionStorage.setItem(
        POS_OPEN_CART_BACKUP_KEY,
        JSON.stringify({
          locationId: posLocationId,
          snapshot: buildHeldSnapshot(),
          savedAt: Date.now(),
        }),
      );
    } catch {
      /* ignore quota */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, customerName, customerPhone, customerEmail, discountAmount, discountType, notes, posLocationId]);

  useEffect(() => {
    if (!posLocationId || cartBackupRestoredRef.current) return;
    cartBackupRestoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(POS_OPEN_CART_BACKUP_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        locationId?: string;
        savedAt?: number;
        snapshot?: HeldCartSnapshot;
      };
      if (parsed.locationId !== posLocationId) return;
      if (!parsed.savedAt || Date.now() - parsed.savedAt > 4 * 60 * 60 * 1000) return;
      if (!parsed.snapshot?.cart?.length) return;
      applyHeldSnapshot(parsed.snapshot);
      toast.success("Restored unsaved cart");
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posLocationId]);

  const holdCurrentCartRef = useRef(holdCurrentCart);
  holdCurrentCartRef.current = holdCurrentCart;

  const expressCheckoutRef = useRef(expressCheckout);
  expressCheckoutRef.current = expressCheckout;
  const requestClearCartRef = useRef(requestClearCart);
  requestClearCartRef.current = requestClearCart;

  const applyWholesaleModeRef = useRef(applyWholesaleMode);
  applyWholesaleModeRef.current = applyWholesaleMode;
  const openRegisterRef = useRef(openRegister);
  openRegisterRef.current = openRegister;

  // Cashier shortcuts. Enter is intentionally NOT bound to pay   HID barcode
  // scanners send Enter after each scan and must not complete the sale.
  useEffect(() => {
    const onShortcut = (e: KeyboardEvent) => {
      if (
        showScanner ||
        showBarcodeSelect ||
        showCourierTrackingScanner ||
        showPosReturn ||
        showPosExchange
      )
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "F4") {
        e.preventDefault();
        productSearchInputRef.current?.focus();
        productSearchInputRef.current?.select();
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        const buttons = document.querySelectorAll<HTMLButtonElement>(
          "[data-pos-qty-plus]",
        );
        buttons[buttons.length - 1]?.focus();
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        if (isEditableKeyboardTarget(e.target)) return;
        e.preventDefault();
        setShowShortcutHelp((open) => !open);
        return;
      }

      if (isEditableKeyboardTarget(e.target)) return;

      if (e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        expressCheckoutRef.current("CASH");
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        requestClearCartRef.current();
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        void holdCurrentCartRef.current();
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setShowPosReturn(true);
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        applyWholesaleModeRef.current(!useWholesalePrices);
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        setShowPosExchange(true);
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        void openRegisterRef.current();
      }
    };

    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, [
    showScanner,
    showBarcodeSelect,
    showCourierTrackingScanner,
    showPosReturn,
    showPosExchange,
    useWholesalePrices,
  ]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Show cash drawer gate for branch-level users before POS is usable
  const branchLocationId = user?.locationId || user?.branchId || "";

  if (drawerChecked && !drawerIsOpen && !isOrgAdmin && branchLocationId) {
    return (
      <CashDrawerBlocker
        locationId={branchLocationId}
        onDrawerOpened={() => {
          setDrawerIsOpen(true);
          getActiveDrawer(branchLocationId)
            .then((res: any) => {
              setActiveDrawerRecord(
                (res?.data as CashDrawerRecord | null) ?? null,
              );
            })
            .catch(() => setActiveDrawerRecord(null));
        }}
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
    <div
      className={
        isCheckoutLayout
          ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:h-[calc(100vh-6rem)] min-h-[calc(100vh-6rem)] w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          : "flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-6rem)] w-full"
      }
    >
      <PoleDisplayModal open={poleDisplay.setupOpen} onClose={poleDisplay.closeSetup} />

      {/* Weight / volume / length products ask for an amount before joining the
          cart   see components/branch/pos/QuantityKeypadModal. */}
      {keypadProduct && (
        <QuantityKeypadModal
          product={keypadProduct}
          initialQuantity={
            cart.find((i) => i.id === keypadProduct.id)?.quantity ?? undefined
          }
          onConfirm={(qty) => {
            const existing = cart.find((i) => i.id === keypadProduct.id);
            if (existing) {
              // Re-opening the keypad on a cart line replaces its amount rather
              // than adding to it   the cashier is correcting a weight.
              updateQty(keypadProduct.id, qty);
              setKeypadProduct(null);
            } else {
              addWeighedToCart(keypadProduct, qty);
            }
          }}
          onClose={() => setKeypadProduct(null)}
        />
      )}
      {/* ═══ LEFT: Product Grid ═══════════════════════════════════════════════ */}
      <div
        className={
          isCheckoutLayout
            ? "flex flex-col min-h-[40vh] lg:min-h-0 lg:h-full border-b lg:border-b-0 lg:border-r border-gray-200 overflow-hidden min-w-0 bg-white"
            : "flex-[2] flex flex-col min-h-[50vh] lg:min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-0"
        }
      >
        {/* Header */}
        <div className={`border-b border-gray-100 flex items-center gap-3 ${isCheckoutLayout ? "p-2.5 flex-wrap" : "p-4"}`}>
          <Zap className="w-5 h-5 text-[#1e3a8a]" />
          <h1 className={`font-bold text-gray-900 ${isCheckoutLayout ? "text-sm" : "text-lg"}`}>Quick POS</h1>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
            <button
              type="button"
              title="Classic: large product grid"
              onClick={() => changePosLayout("classic")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                posLayout === "classic"
                  ? "bg-white text-[#1e3a8a] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Classic</span>
            </button>
            <button
              type="button"
              title="Checkout: compact products, wide payment"
              onClick={() => changePosLayout("checkout")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                posLayout === "checkout"
                  ? "bg-white text-[#1e3a8a] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Checkout</span>
            </button>
          </div>
          {customerDisplayEnabled && (
            <button
              type="button"
              onClick={openCustomerDisplay}
              title="Open customer display on second screen"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                customerDisplayActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              {!isCheckoutLayout && (customerDisplayActive ? "Display on" : "Customer display")}
            </button>
          )}
          {poleDisplay.supported && (
            <button
              type="button"
              onClick={poleDisplay.openSetup}
              title={
                poleDisplay.connected
                  ? "Pole display connected   click to change settings"
                  : "Set up the counter pole display (serial/COM)"
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                poleDisplay.connected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
              }`}
            >
              <Tv2 className="w-3.5 h-3.5" />
              {!isCheckoutLayout && (poleDisplay.connected ? "Pole display on" : "Pole display")}
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {totalProducts} products
          </span>
          <button
            type="button"
            title="POS return   Shift+R"
            onClick={() => setShowPosReturn(true)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Return</span>
          </button>
          <button
            type="button"
            title="Exchange   cart is the replacement   Shift+X"
            onClick={() => {
              if (cart.length === 0) {
                toast.error("Add replacement items to the cart first");
                return;
              }
              const missingImei = cart.find(
                (item) =>
                  isWarrantyIssuingLine(item) &&
                  !String(item.serialNumber || "").trim(),
              );
              if (missingImei) {
                toast.error(`Enter IMEI / serial for ${missingImei.name}`);
                return;
              }
              setShowPosExchange(true);
            }}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exchange</span>
          </button>
          <button
            type="button"
            title="Recent completed sales"
            onClick={() => {
              void loadRecentSales();
              setShowRecentSales(true);
            }}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recent</span>
          </button>
          <button
            type="button"
            title={useWholesalePrices ? "Using wholesale prices   Shift+W" : "Retail prices   Shift+W"}
            onClick={() => applyWholesaleMode(!useWholesalePrices)}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold ${
              useWholesalePrices
                ? "text-violet-700 bg-violet-50 border border-violet-200"
                : "text-slate-600 bg-slate-100 hover:bg-slate-200"
            }`}
          >
            <span className="hidden sm:inline">
              {useWholesalePrices ? "Wholesale" : "Retail"}
            </span>
          </button>
          <button
            type="button"
            title="Cash register   Shift+G"
            onClick={() => void openRegister()}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Register</span>
          </button>
          <button
            type="button"
            title="Keyboard shortcuts"
            onClick={() => setShowShortcutHelp(true)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keys</span>
          </button>
        </div>

        {/* Search + Category */}
        <div className={`border-b border-gray-100 space-y-2 ${isCheckoutLayout ? "p-2" : "p-3"}`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                ref={productSearchInputRef}
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
        <div className={`flex-1 overflow-y-auto ${isCheckoutLayout ? "p-2" : "p-3"}`}>
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
                  <div className={isCheckoutLayout ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 sm:grid-cols-3 gap-3"}>
                    {typeFilteredProducts.map((product) => {
                      const selected = reloadProviderId === product.id;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => setReloadProviderId(product.id)}
                          className={`relative flex text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${
                            isCheckoutLayout
                              ? "flex-col bg-white border rounded-lg p-2"
                              : "flex-col bg-white border rounded-xl p-3"
                          } ${
                            selected
                              ? "border-emerald-600 bg-emerald-50/40"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <div className={`rounded-lg bg-emerald-50 flex items-center justify-center ${isCheckoutLayout ? "w-full h-12 mb-1.5" : "w-full h-16 mb-2"}`}>
                            <Smartphone className={isCheckoutLayout ? "w-5 h-5 text-emerald-600" : "w-7 h-7 text-emerald-600"} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                              {product.name}
                            </p>
                            <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                              Balance: Rs.{product.stock.toLocaleString()}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {reloadProviderId && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                      <p className="text-sm font-semibold text-gray-800">
                        Reload details  {" "}
                        {products.find((p) => p.id === reloadProviderId)?.name}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Phone number{" "}
                            <span className="font-normal text-gray-400">
                              (optional)
                            </span>
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
                            Amount (LKR) / Cards
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
            <div
              className={
                isCheckoutLayout
                  ? "grid grid-cols-2 gap-2"
                  : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3"
              }
            >
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
                    className={`relative bg-white border text-left transition-all hover:shadow-md hover:border-[#1e3a8a]/40 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 ${
                      isCheckoutLayout
                        ? "flex flex-col rounded-lg p-2"
                        : "flex flex-col rounded-xl p-3"
                    } ${
                      !product.isService && !product.isReload && product.stock <= 0
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    } ${inCart ? "border-[#1e3a8a] bg-blue-50/30" : "border-gray-200"}`}
                  >
                    {inCart && !product.isReload && (
                      <span className={`absolute bg-[#1e3a8a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isCheckoutLayout ? "top-1 right-1" : "top-2 right-2"}`}>
                        {inCart.quantity}
                      </span>
                    )}
                    {product.discountInfo && !isCheckoutLayout && (
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
                        className={`object-cover rounded-lg bg-gray-50 ${isCheckoutLayout ? "w-full h-16 mb-1.5" : "w-full h-28 mb-2"}`}
                      />
                    ) : (
                      <div className={`rounded-lg bg-gray-100 flex items-center justify-center ${isCheckoutLayout ? "w-full h-16 mb-1.5" : "w-full h-28 mb-2"}`}>
                        {product.isReload ? (
                          <Smartphone className={isCheckoutLayout ? "w-5 h-5 text-emerald-400" : "w-8 h-8 text-emerald-400"} />
                        ) : (
                          <Package className={isCheckoutLayout ? "w-5 h-5 text-gray-300" : "w-8 h-8 text-gray-300"} />
                        )}
                      </div>
                    )}
                    <div className={`min-w-0 ${isCheckoutLayout ? "flex-1" : ""}`}>
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
                      {product.name}
                    </p>
                    {!product.isService && !product.isReload && (
                      <div className="mt-0.5">
                        <WarrantyBadge
                          months={product.warrantyMonths}
                          compact={isCheckoutLayout}
                        />
                      </div>
                    )}
                    {product.brand && !isCheckoutLayout && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {product.brand}
                      </p>
                    )}
                    <div className={`flex items-center justify-between ${isCheckoutLayout ? "pt-0.5 gap-2" : "mt-auto pt-2"}`}>
                      <div>
                        {product.isReload ? (
                          <span className="text-xs font-bold text-emerald-700">
                            Reload
                          </span>
                        ) : (
                          <>
                            {/* A weighted product's price is meaningless without
                                its unit: "Rs. 1,250.00" vs "Rs. 1,250.00 / kg". */}
                            <span
                              className={`text-xs font-bold ${product.discountInfo ? "text-red-600" : "text-[#1e3a8a]"}`}
                            >
                              {isWeighted(product)
                                ? formatUnitPrice(product.price, product)
                                : formatCurrency(product.price)}
                            </span>
                            {product.originalPrice !== undefined && !isCheckoutLayout && (
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
        {!isCheckoutLayout && (
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
        )}
      </div>

      {/* ═══ RIGHT: Checkout Panel ════════════════════════════════════════════ */}
      <div
        className={
          isCheckoutLayout
            ? "flex flex-col min-h-[50vh] lg:min-h-0 lg:h-full overflow-hidden min-w-0 bg-white"
            : "w-full lg:flex-1 lg:h-[80vh] lg:min-w-0 flex flex-col min-h-[40vh] lg:min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        }
      >
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
                {editingSaleId && (
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Editing {editingSaleNumber || "sale"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void refreshHeldCarts();
                    setShowHeldCarts(true);
                  }}
                  className="text-xs font-semibold text-[#1e3a8a] hover:underline"
                >
                  Parked ({heldCarts.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void refreshQuotations();
                    setShowQuotations(true);
                  }}
                  className="text-xs font-semibold text-[#1e3a8a] hover:underline"
                >
                  Quotes ({quotations.length})
                </button>
                {openQuoteId && (
                  <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                    Quote open
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void saveCurrentQuote()}
                    disabled={savingQuote}
                    title="Save quotation"
                    className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 disabled:opacity-40"
                  >
                    <FileText className="w-3 h-3" />
                    Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => void holdCurrentCart()}
                    disabled={holdingCart}
                    title="Hold cart   Shift+H"
                    className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 disabled:opacity-40"
                  >
                    <Pause className="w-3 h-3" />
                    Hold
                  </button>
                  <button
                    type="button"
                    onClick={requestClearCart}
                    className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
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
                  {cart.map((item) => {
                    const itemDisc = lineDiscountLkr(item);
                    const itemTotal = cartLineTotal(item);
                    return (
                    <li
                      key={item.id}
                      className="px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {item.isReload
                            ? item.reloadPhone
                              ? `${item.name} · ${item.reloadPhone}`
                              : item.name
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
                            {itemDisc > 0 ? (
                              <span className="ml-1 text-green-600">
                                · {formatCurrency(itemTotal)}
                              </span>
                            ) : null}
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
                      ) : isWarrantyCartLine(item) ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 text-center text-sm font-bold text-gray-800">
                            1
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
                            onClick={() =>
                              updateQty(
                                item.id,
                                roundQty(item.quantity - stepOf(item)),
                              )
                            }
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          {/* Weighted lines show the amount with its unit and are
                              tappable, since typing 0.375 kg with +/- would take
                              dozens of presses. */}
                          {isWeighted(item) ? (
                            <button
                              type="button"
                              onClick={() => {
                                const p = products.find((pr) => pr.id === item.id);
                                if (p) setKeypadProduct(p);
                              }}
                              className="min-w-14 rounded px-1 text-center text-sm font-bold text-gray-800 underline decoration-dotted underline-offset-2 hover:text-orange-600"
                              title="Tap to type an exact amount"
                            >
                              {formatQty(item.quantity, item)}
                            </button>
                          ) : (
                            <span className="w-6 text-center text-sm font-bold text-gray-800">
                              {item.quantity}
                            </span>
                          )}
                          <button
                            type="button"
                            data-pos-qty-plus
                            onClick={() =>
                              updateQty(
                                item.id,
                                roundQty(item.quantity + stepOf(item)),
                              )
                            }
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
                      </div>
                      {!item.isReload && !staffDiscountHidden && (
                        <div className="flex items-center gap-1.5 pl-0.5">
                          <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.lineDiscountValue
                                ? item.lineDiscountValue
                                : ""
                            }
                            onChange={(e) =>
                              updateLineDiscount(
                                item.id,
                                item.lineDiscountType || "FIXED",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            className="w-16 rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-800"
                          />
                          <select
                            value={item.lineDiscountType || "FIXED"}
                            onChange={(e) =>
                              updateLineDiscount(
                                item.id,
                                e.target.value as LineDiscountType,
                                item.lineDiscountValue
                                  ? String(item.lineDiscountValue)
                                  : "",
                              )
                            }
                            className="rounded-md border border-gray-200 px-1 py-0.5 text-[11px] bg-white text-gray-600"
                          >
                            <option value="FIXED">LKR</option>
                            <option value="PERCENTAGE">%</option>
                          </select>
                          {itemDisc > 0 && (
                            <span className="text-[11px] font-medium text-green-600">
                              −{formatCurrency(itemDisc)}
                            </span>
                          )}
                        </div>
                      )}
                      {isWarrantyCartLine(item) && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {item.issueWarranty === false ? (
                            <>
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                                no warranty
                              </span>
                              <button
                                type="button"
                                onClick={() => setLineWarranty(item.id, true)}
                                className="text-[10px] font-medium text-emerald-700 underline underline-offset-2"
                              >
                                add warranty
                              </button>
                            </>
                          ) : (
                            <>
                              <WarrantyBadge months={item.warrantyMonths} />
                              <span className="text-[10px] text-emerald-700">
                                warranty card will be issued
                              </span>
                              <button
                                type="button"
                                onClick={() => setLineWarranty(item.id, false)}
                                className="text-[10px] font-medium text-gray-500 underline underline-offset-2"
                              >
                                skip
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {isWarrantyIssuingLine(item) && (
                        <input
                          value={item.serialNumber || ""}
                          onChange={(e) =>
                            updateSerialNumber(item.id, e.target.value)
                          }
                          placeholder="IMEI / serial required"
                          className="w-full rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-mono text-gray-800"
                        />
                      )}
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Cart totals + proceed */}
            <div className="border-t border-gray-100 p-4 space-y-3">
              {recentSales.length > 0 && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-gray-500">
                      Recent sales
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRecentSales(true)}
                      className="text-[11px] font-semibold text-[#1e3a8a] hover:underline"
                    >
                      See all
                    </button>
                  </div>
                  <ul className="space-y-0.5">
                    {recentSales.slice(0, 4).map((sale) => (
                      <li
                        key={sale.id}
                        className="flex items-center justify-between gap-2 text-[11px] text-gray-700"
                      >
                        <span className="truncate">
                          {sale.saleNumber}
                          {sale.customerName ? ` · ${sale.customerName}` : ""}
                        </span>
                        <span className="shrink-0 font-semibold">
                          {formatCurrency(sale.totalAmount)}
                        </span>
                        <button
                          type="button"
                          title="Edit"
                          disabled={loadingEditSaleId === sale.id}
                          onClick={() => void startEditRecentSale(sale)}
                          className="shrink-0 text-gray-400 hover:text-amber-600 disabled:opacity-40"
                        >
                          {loadingEditSaleId === sale.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Pencil className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Reprint"
                          disabled={reprintingSaleId === sale.id}
                          onClick={() => void reprintRecentSale(sale)}
                          className="shrink-0 text-gray-400 hover:text-[#1e3a8a] disabled:opacity-40"
                        >
                          {reprintingSaleId === sale.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Printer className="w-3 h-3" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lineDiscountTotal > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Line discounts</span>
                  <span>− {formatCurrency(lineDiscountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-gray-800">
                <span>Total</span>
                <span className="text-[#1e3a8a]">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={goToCustomer}
                disabled={cart.length === 0 || isProcessing}
                className="w-full py-3 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#1e40af] transition-colors"
              >
                Checkout <ChevronRight className="w-4 h-4" />
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

            <div className={`flex-1 overflow-y-auto p-4 ${isCheckoutLayout ? "lg:p-6" : ""} space-y-4`}>
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
                        setLoyaltyRedeemInput("");
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
                              {Number(c.loyaltyPoints) > 0
                                ? ` · ${c.loyaltyPoints} pts`
                                : ""}
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
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-800">
                      {selectedCustomer.name}
                    </p>
                    <p className="text-[10px] text-green-600">
                      {selectedCustomer.phone || selectedCustomer.contactNumber}
                      {loyaltyAvailable > 0
                        ? ` · ${loyaltyAvailable} loyalty pts (1 pt = Rs.1)`
                        : ""}
                    </p>
                  </div>
                </div>
              )}
              {selectedCustomer && loyaltyAvailable > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Redeem loyalty points
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={loyaltyAvailable}
                      value={loyaltyRedeemInput}
                      onChange={(e) => setLoyaltyRedeemInput(e.target.value)}
                      placeholder="0"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setLoyaltyRedeemInput(String(loyaltyAvailable))}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      All
                    </button>
                  </div>
                  {loyaltyRedeem > 0 && (
                    <p className="text-[11px] text-green-700 mt-1">
                      Redeeming {loyaltyRedeem} pts = {formatCurrency(loyaltyRedeem)} off
                    </p>
                  )}
                </div>
              )}

              {/* ── Advance Payment + Courier (side by side in checkout layout) ── */}
              <div className={isCheckoutLayout ? "grid grid-cols-1 xl:grid-cols-2 gap-4 items-start" : "space-y-4"}>
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

                    {/* Auto job summary   type & title from product, due date auto */}
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5 space-y-2">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">
                          Job type (auto   change if needed)
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
                        setSplitRows([]);
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
                            Use a USB/barcode reader on this step   the tracking
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

            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isCheckoutLayout ? "lg:p-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 lg:content-start" : ""}`}>
              {/* Optional: turn this sale into a Job (auto-creates a Sale Job).
                  Hidden for advance payments   those are always jobs and are
                  configured (type/title/due/priority) back on the customer step. */}
              {isAdvancePayment ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span>
                    Advance job:{" "}
                    <strong>{SALE_JOB_TYPE_LABELS[saleJob.jobType]}</strong>  {" "}
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
                  <span>{formatCurrency(grossSubtotal)}</span>
                </div>
                {lineDiscountTotal > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Line discounts</span>
                    <span>- {formatCurrency(lineDiscountTotal)}</span>
                  </div>
                )}
                {billDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Bill discount</span>
                    <span>- {formatCurrency(billDiscount)}</span>
                  </div>
                )}
                {loyaltyRedeem > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Loyalty ({loyaltyRedeem} pts)</span>
                    <span>- {formatCurrency(loyaltyRedeem)}</span>
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

              {selectedCustomer && loyaltyAvailable > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Redeem loyalty ({loyaltyAvailable} pts, 1 pt = Rs.1)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={loyaltyAvailable}
                      value={loyaltyRedeemInput}
                      onChange={(e) => setLoyaltyRedeemInput(e.target.value)}
                      placeholder="0"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setLoyaltyRedeemInput(String(loyaltyAvailable))}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      All
                    </button>
                  </div>
                </div>
              )}

              {/* Payment method */}
              <div className={isCheckoutLayout ? "lg:col-span-2" : undefined}>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Payment Method
                </label>
                <div className={`grid gap-2 ${isCheckoutLayout ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
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
                        if (["KOKO", "MINTPAY", "PAZY", "COD"].includes(val)) {
                          setSplitRows([]);
                        }
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
                {canSplitPay && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        isSplitTender ? setSplitRows([]) : enableSplitTender()
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                        isSplitTender
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Split className="w-3.5 h-3.5" />
                      {isSplitTender ? "Split on" : "Split tender"}
                    </button>
                  </div>
                )}
              </div>

              {isSplitTender && (
                <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-700">
                    Split tender   amounts must equal {formatCurrency(total)}
                  </p>
                  {splitRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <select
                        value={row.method}
                        onChange={(e) =>
                          updateSplitRow(row.id, {
                            method: e.target.value as SplitPayMethod,
                          })
                        }
                        className="w-28 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                      >
                        {SPLIT_PAY_OPTIONS.map((opt) => (
                          <option key={opt.val} value={opt.val}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.amount}
                        onChange={(e) =>
                          updateSplitRow(row.id, { amount: e.target.value })
                        }
                        placeholder="0.00"
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                      />
                      {splitRemainder > 0.009 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSplitRow(row.id, {
                              amount: (
                                (parseFloat(row.amount) || 0) + splitRemainder
                              ).toFixed(2),
                            })
                          }
                          className="text-[11px] font-semibold text-[#1e3a8a] shrink-0"
                        >
                          Fill
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSplitRow(row.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {splitRows.length < 3 && (
                    <button
                      type="button"
                      onClick={addSplitRow}
                      className="text-xs font-semibold text-[#1e3a8a] inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add payment
                    </button>
                  )}
                  <p
                    className={`text-xs font-medium ${
                      splitOk ? "text-green-600" : "text-amber-700"
                    }`}
                  >
                    {splitOk
                      ? "Split covers the total"
                      : `Allocated ${formatCurrency(splitAllocated)} · remaining ${formatCurrency(Math.abs(splitRemainder))}${
                          splitRemainder < 0 ? " over" : ""
                        }`}
                  </p>
                  {splitRows.some((row) => row.method === "CASH") && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Cash received{" "}
                        <span className="text-gray-400">
                          (optional, for change)
                        </span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder={String(
                          splitRows.find((row) => row.method === "CASH")
                            ?.amount || "",
                        )}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

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
              {paymentMethod === "CASH" && !isSplitTender && (
                <div className="space-y-3">
                  {/* Advance is decided on the customer step (it makes the sale a
                      job). A normal cash sale can't be switched to advance here  
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
                          Credit / Due remaining:{" "}
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
                !isSplitTender &&
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
                        Credit / Due remaining:{" "}
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
                      Credit / Due remaining:{" "}
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
                onClick={() => void handleProcessSale()}
                disabled={
                  isProcessing ||
                  (isSplitTender && !splitOk) ||
                  (paymentMethod === "CASH" &&
                    !isAdvancePayment &&
                    !isSplitTender &&
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
                ) : isSplitTender ? (
                  <>
                    <Split className="w-4 h-4" /> Complete Split –{" "}
                    {formatCurrency(total)}
                  </>
                ) : isPartialPayment ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Record Credit / Due –{" "}
                    {formatCurrency(paidAmount)}
                  </>
                ) : editingSaleId ? (
                  <>
                    <Pencil className="w-4 h-4" /> Update Sale –{" "}
                    {formatCurrency(total)}
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
                    Credit / Due recorded
                  </h2>
                  <p className="text-sm text-orange-600 mt-1 font-medium">
                    Credit / Due outstanding
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
                        <span>Credit / Due</span>
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

      <PosReturnDrawer
        open={showPosReturn}
        locationId={posLocationId}
        userId={user?.id}
        onClose={() => setShowPosReturn(false)}
        onCompleted={() => {
          void loadProducts();
          void loadRecentSales();
        }}
      />

      <PosExchangeDrawer
        open={showPosExchange}
        locationId={posLocationId}
        userId={user?.id}
        replacementItems={cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: Number(item.price),
          costPrice: item.costPrice,
          discount: lineDiscountLkr(item),
          warrantyMonths: isWarrantyIssuingLine(item) ? item.warrantyMonths : 0,
          serialNumber: item.serialNumber?.trim() || undefined,
          reloadPhone: item.reloadPhone,
        }))}
        replacementTotal={total}
        customerId={selectedCustomer?.id}
        customerName={customerName || selectedCustomer?.name}
        customerPhone={customerPhone || selectedCustomer?.phone}
        onClose={() => setShowPosExchange(false)}
        onCompleted={() => {
          clearCart();
          void loadProducts();
          void loadRecentSales();
        }}
      />

      {showHeldCarts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowHeldCarts(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white border border-gray-200 p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Pause className="w-4 h-4" />
                Parked carts
              </h2>
              <button
                type="button"
                onClick={() => setShowHeldCarts(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {heldCarts.length === 0 ? (
              <p className="text-sm text-gray-500">No parked carts for this location.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {heldCarts.map((row) => (
                  <li key={row.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {row.note || "Held cart"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.itemCount} items · {formatCurrency(Number(row.totalAmount) || 0)}
                        {row.heldBy?.name ? ` · ${row.heldBy.name}` : ""}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void resumeHeldCart(row.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#1e3a8a] text-white"
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        onClick={() => void discardHeld(row.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md text-red-600 hover:bg-red-50"
                      >
                        Discard
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Held carts are stored separately from sales. Stock is not reserved
              until you complete the sale.
            </p>
          </div>
        </div>
      )}

      {showQuotations && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowQuotations(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white border border-gray-200 p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Open quotations
              </h2>
              <button
                type="button"
                onClick={() => setShowQuotations(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {quotations.length === 0 ? (
              <p className="text-sm text-gray-500">No open quotes for this location.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {quotations.map((row) => (
                  <li key={row.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {row.quoteNumber}
                        {row.note ? ` · ${row.note}` : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.itemCount} items · {formatCurrency(Number(row.totalAmount) || 0)}
                        {row.customerName ? ` · ${row.customerName}` : ""}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {row.expiresAt
                          ? `Expires ${new Date(row.expiresAt).toLocaleDateString()}`
                          : row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void resumeQuote(row.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#1e3a8a] text-white"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => void voidQuote(row.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md text-red-600 hover:bg-red-50"
                      >
                        Void
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Quotes do not reserve stock. Completing the sale converts the loaded quote.
            </p>
          </div>
        </div>
      )}

      {showRecentSales && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowRecentSales(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white border border-gray-200 p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent completed sales
              </h2>
              <button
                type="button"
                onClick={() => setShowRecentSales(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {recentSales.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                No completed sales for this location yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentSales.map((sale) => (
                  <li
                    key={sale.id}
                    className="py-2.5 flex items-center gap-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">
                        {sale.saleNumber}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {sale.customerName || "Walk-in"}
                        {sale.paymentMethod ? ` · ${sale.paymentMethod}` : ""}
                        {sale.createdAt
                          ? ` · ${new Date(sale.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#1e3a8a] shrink-0">
                      {formatCurrency(sale.totalAmount)}
                    </span>
                    <button
                      type="button"
                      disabled={loadingEditSaleId === sale.id}
                      onClick={() => void startEditRecentSale(sale)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 disabled:opacity-40"
                    >
                      {loadingEditSaleId === sale.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Pencil className="w-3 h-3" />
                      )}
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={reprintingSaleId === sale.id}
                      onClick={() => void reprintRecentSale(sale)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-40"
                    >
                      {reprintingSaleId === sale.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Printer className="w-3 h-3" />
                      )}
                      Reprint
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showRegister && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowRegister(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white border border-gray-200 p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Banknote className="w-4 h-4" />
                Register
              </h2>
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {registerBusy && !dayBalance ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#1e3a8a]" />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`font-semibold ${
                      activeDrawerRecord ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {activeDrawerRecord ? "Open" : "Closed"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Opening cash</span>
                  <span>
                    {formatCurrency(
                      dayBalance?.cashFlow.openingBalance ??
                        activeDrawerRecord?.openingBalance ??
                        0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cash sales</span>
                  <span>
                    {formatCurrency(dayBalance?.paymentBreakdown.cash ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Card</span>
                  <span>
                    {formatCurrency(dayBalance?.paymentBreakdown.card ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bank</span>
                  <span>
                    {formatCurrency(
                      dayBalance?.paymentBreakdown.bankTransfer ?? 0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cash refunds</span>
                  <span>
                    {formatCurrency(dayBalance?.cashFlow.cashRefunds ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Petty cash out</span>
                  <span>
                    {formatCurrency(dayBalance?.cashFlow.pettyCashOut ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t border-gray-100">
                  <span>Expected cash</span>
                  <span>
                    {formatCurrency(
                      dayBalance?.cashFlow.totalExpectedCash ??
                        activeDrawerRecord?.expectedClosingBalance ??
                        0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Today POS sales</span>
                  <span>
                    {dayBalance?.todaySales.totalPOSSalesCount ?? 0} ·{" "}
                    {formatCurrency(dayBalance?.todaySales.totalPOSRevenue ?? 0)}
                  </span>
                </div>
                {daySummary && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5 space-y-1 text-xs">
                    <div className="flex justify-between font-semibold text-emerald-900">
                      <span>Today profit</span>
                      <span>{formatCurrency(daySummary.netProfit)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Revenue / cost</span>
                      <span>
                        {formatCurrency(daySummary.revenue)} / {formatCurrency(daySummary.cogs)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Refunds / petty</span>
                      <span>
                        {formatCurrency(daySummary.refunds)} / {formatCurrency(daySummary.pettyExpenses)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-gray-100 p-2.5 space-y-2">
                  <p className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5" /> Petty cash out
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pettyAmount}
                      onChange={(e) => setPettyAmount(e.target.value)}
                      placeholder="Amount"
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                    />
                    <select
                      value={pettyCategory}
                      onChange={(e) => setPettyCategory(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                    >
                      <option value="TEA">Tea</option>
                      <option value="TRANSPORT">Transport</option>
                      <option value="PACKAGING">Packaging</option>
                      <option value="UTILITIES">Utilities</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <input
                    value={pettyNote}
                    onChange={(e) => setPettyNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                  />
                  <button
                    type="button"
                    disabled={savingPetty}
                    onClick={() => void submitPettyExpense()}
                    className="w-full py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-40"
                  >
                    {savingPetty ? "Saving…" : "Record petty out"}
                  </button>
                  {posExpenses.length > 0 && (
                    <ul className="max-h-24 overflow-y-auto divide-y divide-gray-50">
                      {posExpenses.map((row) => (
                        <li key={row.id} className="py-1 flex justify-between gap-2 text-[11px]">
                          <span className="truncate">
                            {row.category} · {formatCurrency(Number(row.amount))}
                            {row.note ? ` · ${row.note}` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              await voidExpense(row.id);
                              await openRegister();
                            }}
                            className="text-red-500 hover:underline shrink-0"
                          >
                            Void
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {activeDrawerRecord && (
                  <button
                    type="button"
                    onClick={() => {
                      setClosingCash(
                        String(
                          dayBalance?.cashFlow.totalExpectedCash ??
                            activeDrawerRecord.expectedClosingBalance ??
                            "",
                        ),
                      );
                      setShowCloseRegister(true);
                    }}
                    className="mt-3 w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-900"
                  >
                    <Lock className="w-4 h-4" /> Close register
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showCloseRegister && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCloseRegister(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white border border-gray-200 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold text-gray-900 mb-3">
              Counted cash
            </h2>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Closing cash in drawer
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3"
            />
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Notes (optional)
            </label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCloseRegister(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={registerBusy}
                onClick={() => void submitCloseRegister()}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold disabled:opacity-40"
              >
                {registerBusy ? "Closing…" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShortcutHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowShortcutHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white border border-gray-200 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Quick POS shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setShowShortcutHelp(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex justify-between gap-4">
                <span>Express cash (walk-in)</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">Shift+E</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>Focus product search</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">F4</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>Last line quantity +</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">F2</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>Clear cart</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">Shift+C</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>Hold / park cart</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">Shift+H</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>POS return</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">Shift+R</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>Retail / wholesale prices</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">Shift+W</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>Exchange</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">Shift+X</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>Cash register</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">Shift+G</kbd>
              </li>
              <li className="flex justify-between gap-4">
                <span>Save / load quote</span>
                <span className="text-xs text-gray-500">Quote button</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Split tender</span>
                <span className="text-xs text-gray-500">Checkout</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>This help</span>
                <kbd className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded">?</kbd>
              </li>
            </ul>
            <p className="text-xs text-gray-400 mt-3">
              Courier, advance, and BNPL still use Checkout. Enter is reserved
              for the barcode scanner.
            </p>
          </div>
        </div>
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
