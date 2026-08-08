/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../hooks/useInventory";
import useSales from "../../hooks/useSales";
import useCustomer from "../../hooks/useCustomer";
import ProductGrid from "../../components/branch/pos/ProductGrid";
import CartSummary from "../../components/branch/pos/CartSummary";
import PaymentModal, {
  type OrderData,
} from "../../components/branch/pos/PaymentModal";
import BillModal from "../../components/branch/pos/BillModal";
import CashDrawerBlocker from "../../components/branch/pos/CashDrawerBlocker";
import CashDrawerOpenOverlay from "../../components/branch/pos/CashDrawerOpenOverlay";
import POSSettingsBlocker from "../../components/branch/pos/POSSettingsBlocker";
import { usePOSSettings } from "../../hooks/usePOSSettings";
import { usePrinter } from "../../hooks/usePrinter";
import { getPrinterConfig } from "../../lib/printerConfig";
import { Loader2, ScanLine, Monitor } from "lucide-react";
import toast from "react-hot-toast";
import useBarcode from "../../hooks/useBarcode";
import type { ScannedProduct } from "../../hooks/useBarcode";
import BarcodeScannerModal from "../../components/common/BarcodeScannerModal";
import BarcodeProductSelectModal from "../../components/common/BarcodeProductSelectModal";
import useCashDrawer from "../../hooks/useCashDrawer";
import useBusinessProfile from "../../hooks/useBusinessProfile";
import {
  clearCustomerDisplay,
  createCustomerDisplaySessionId,
  publishCustomerDisplay,
} from "../../lib/customerDisplaySync";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image?: string;
  category: string;
  productId: string;
  warrantyMonths?: number;
  isService?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
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
  description?: string;
  productId: string;
  brand?: string;
  model?: string;
  warrantyMonths?: number;
  productCode?: string;
  isService?: boolean;
}

interface InventoryItem {
  id: string;
  productId: string;
  product?: {
    name: string;
    unitPrice: number;
    category?: { name: string };
    primaryImage?: string;
    model?: string;
    brand?: string;
    isActive: boolean;
    warrantyMonths?: number;
    productCode?: string;
    isService?: boolean;
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

interface ApiResponse {
  status: boolean;
  message: string;
  saleId: string;
  saleNumber: string;
  sale: unknown;
  order: OrderData;
}

const SCANNER_HID_THRESHOLD_MS = 45;
const SCANNER_RESET_AFTER_MS = 400;
const SCANNER_MIN_LENGTH = 4;

const mapScannedToProduct = (scanned: ScannedProduct): Product => ({
  id: scanned.id,
  productId: scanned.productId,
  name: scanned.name,
  price: scanned.unitPrice,
  stock: scanned.isService ? 9999 : scanned.stock,
  category: scanned.category ?? "other",
  brand: scanned.brand,
  model: scanned.model,
  warrantyMonths: scanned.warrantyMonths ?? 0,
  productCode: scanned.productCode,
  isService: scanned.isService ?? false,
});

const POSPage: React.FC = () => {
  const { user } = useAuth();
  const { getAllInventory } = useInventory();
  const {
    createSale,
    getESCPOSData,
    silentPrintInvoice,
    downloadAcknowledgement,
  } = useSales();
  const { searchCustomers, createCustomer } = useCustomer();
  const {
    isConfigured: posSettingsConfigured,
    loadingSettings: posSettingsLoading,
    getSettings: getPOSSettings,
  } = usePOSSettings();
  const posSettings = getPOSSettings();
  const { tryPrintESCPOS, tryOpenDrawer } = usePrinter();
  const { businessData, loadBusinessProfile } = useBusinessProfile();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeItemType, setActiveItemType] = useState<
    "all" | "products" | "services"
  >("all");
  const [productPage, setProductPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeMatches, setBarcodeMatches] = useState<ScannedProduct[]>([]);
  const [showBarcodeSelect, setShowBarcodeSelect] = useState(false);
  const [lastScannedValue, setLastScannedValue] = useState<string>("");
  const { scanProduct, scanning } = useBarcode();
  const { getActiveDrawer } = useCashDrawer();
  const [completedOrderData, setCompletedOrderData] =
    useState<OrderData | null>(null);
  const [responseData, setResponseData] = useState<ApiResponse | null>(null);

  // Cash drawer gate
  const [drawerChecked, setDrawerChecked] = useState(false);
  const [drawerIsOpen, setDrawerIsOpen] = useState(false);
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerDisplaySessionRef = useRef<string | null>(null);
  const customerDisplayWindowRef = useRef<Window | null>(null);
  const lastDisplayItemIdRef = useRef<string | null>(null);
  const [customerDisplayActive, setCustomerDisplayActive] = useState(false);
  const [customerDisplayStatus, setCustomerDisplayStatus] = useState<
    "idle" | "cart" | "payment" | "success"
  >("idle");

  const customerDisplayEnabled =
    businessData?.posCustomerDisplayEnabled ?? false;

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

  const scannerBufferRef = useRef("");
  const scannerLastTimeRef = useRef(0);

  useEffect(() => {
    const locationId = user?.locationId || user?.branchId;
    if (!locationId) return;
    getActiveDrawer(locationId)
      .then((res: any) => {
        const drawer = res?.data ?? null;
        setDrawerIsOpen(!!drawer);
      })
      .catch(() => {
        // On network error allow POS
        setDrawerIsOpen(true);
      })
      .finally(() => setDrawerChecked(true));
  }, [user?.locationId, user?.branchId]);

  const mapInventoryItemToProduct = (item: InventoryItem): Product => {
    const unitPrice = Number(item.product?.unitPrice) || 0;
    const discountInfo = item.product?.discountInfo ?? null;
    const effectivePrice = discountInfo
      ? discountInfo.effectivePrice
      : unitPrice;
    return {
      id: item.id,
      productId: item.productId,
      name: item.product?.name || "Unknown Product",
      price: effectivePrice,
      originalPrice: discountInfo ? unitPrice : undefined,
      discountInfo,
      stock: item.availableQuantity || 0,
      category: item.product?.category?.name?.toLowerCase() || "other",
      image: item.product?.primaryImage,
      description: item.product?.model || item.product?.brand || "",
      brand: item.product?.brand,
      model: item.product?.model,
      warrantyMonths: item.product?.warrantyMonths || 0,
      productCode: item.product?.productCode,
      isService: item.product?.isService ?? false,
    };
  };

  const loadProducts = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
    }) => {
      try {
        const page = params?.page ?? productPage;
        const limit = params?.limit ?? pageSize;
        const search = params?.search ?? searchQuery.trim();
        const category = params?.category ?? selectedCategory;

        setLoading((prev) => prev && page === 1);
        setIsFetchingProducts(true);

        const userLocationId = user?.locationId || user?.branchId;
        if (!userLocationId) {
          throw new Error("Location information not available");
        }

        const response = await getAllInventory({
          locationId: userLocationId,
          page,
          limit,
          ...(search ? { search } : {}),
          ...(category !== "all" ? { category } : {}),
          sortBy: "name",
          sortOrder: "asc",
          includeDiscount: true,
          availableOnly: true,
          includeServices: true,
        });

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
          if (totalPages > 0 && page > totalPages) {
            setProductPage(totalPages);
            await loadProducts({ page: totalPages, limit, search, category });
            return;
          }

          const transformedProducts = items
            .filter(
              (item: InventoryItem) =>
                (item.quantity > 0 || item.product?.isService) &&
                item.product?.isActive,
            )
            .map((item: InventoryItem) => mapInventoryItemToProduct(item));

          setProducts(transformedProducts);
          if (transformedProducts.length === 0) {
            // toast.error('No products available in inventory', { duration: 4000 });
          } else {
            // toast.success(`Loaded ${transformedProducts.length} products`, { duration: 2000 });
          }
        }
      } catch (error) {
        console.error("Failed to load products:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load products";
        toast.error(
          <div>
            <p>{errorMessage}</p>
            <button
              onClick={() => {
                void loadProducts();
              }}
              className="mt-2 text-sm underline"
            >
              Retry
            </button>
          </div>,
          { duration: 6000 },
        );
      } finally {
        setLoading(false);
        setIsFetchingProducts(false);
      }
    },
    [
      user?.locationId,
      user?.branchId,
      productPage,
      pageSize,
      searchQuery,
      selectedCategory,
      getAllInventory,
    ],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        setProductPage(1);
        void loadProducts({ page: 1, search: query.trim() });
      }, 300);
    },
    [loadProducts],
  );

  const handleCategoryChange = useCallback(
    (category: string) => {
      setSelectedCategory(category);
      setProductPage(1);
      void loadProducts({ page: 1, category });
    },
    [loadProducts],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setProductPage(page);
      void loadProducts({ page });
    },
    [loadProducts],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setProductPage(1);
      void loadProducts({ page: 1, limit: size });
    },
    [loadProducts],
  );

  useEffect(() => {
    void loadProducts();
  }, []);

  // Calculate totals
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  useEffect(() => {
    loadBusinessProfile();
  }, [loadBusinessProfile]);

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

    const status =
      customerDisplayStatus === "success"
        ? "success"
        : customerDisplayStatus === "payment" || isPaymentModalOpen
          ? "payment"
          : cartItems.length === 0
            ? "idle"
            : "cart";

    publishCustomerDisplay({
      sessionId,
      businessName: businessData?.name,
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        lineTotal: item.price * item.quantity,
      })),
      lastItem: (() => {
        const lastId = lastDisplayItemIdRef.current;
        const match = lastId
          ? cartItems.find((item) => item.id === lastId)
          : undefined;
        const item = match ?? cartItems[cartItems.length - 1];
        if (!item) return null;
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          lineTotal: item.price * item.quantity,
        };
      })(),
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: total,
      discount: 0,
      total,
      status,
      updatedAt: Date.now(),
    });
  }, [
    businessData?.name,
    cartItems,
    customerDisplayEnabled,
    customerDisplayStatus,
    isPaymentModalOpen,
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

  const resolveProductFromScan = (scanned: ScannedProduct): Product =>
    products.find(
      (p) => p.productId === scanned.productId || p.id === scanned.id,
    ) ?? mapScannedToProduct(scanned);

  const addScannedProductToCart = (scanned: ScannedProduct) => {
    const product = resolveProductFromScan(scanned);
    const inCart = cartItems.find((i) => i.id === product.id);
    const canAdd =
      product.isService ||
      (product.stock > 0 &&
        (inCart ? inCart.quantity < product.stock : true));
    if (!canAdd) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    handleAddToCart(product);
    playScanSuccessBeep();
    setSearchQuery("");
    setShowScanner(false);
  };

  // Handle barcode scan → use full API match list, not only the current product page
  const handleBarcodeScan = async (value: string) => {
    const matches = await scanProduct(value, true);
    if (!matches || matches.length === 0) {
      toast.error(`No product found for barcode: ${value}`);
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
    const inCart = cartItems.find((i) => i.id === product.id);
    const canAdd =
      product.isService ||
      (product.stock > 0 && (inCart ? inCart.quantity < product.stock : true));
    if (!canAdd) {
      toast.error(`${product.name} is out of stock`);
    } else {
      handleAddToCart(product);
      playScanSuccessBeep();
      setSearchQuery("");
    }
    setShowBarcodeSelect(false);
    setBarcodeMatches([]);
  };

  // ── Global HID barcode scanner listener (works without opening the modal) ──
  const handleBarcodeScanRef = useRef(handleBarcodeScan);
  useEffect(() => {
    handleBarcodeScanRef.current = handleBarcodeScan;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Let the open scanner modal or select modal handle its own events
      if (showScanner || showBarcodeSelect) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();
      if (e.key === "Enter") {
        const value = scannerBufferRef.current;
        scannerBufferRef.current = "";
        scannerLastTimeRef.current = 0;
        if (value.length >= SCANNER_MIN_LENGTH) {
          e.preventDefault();
          handleBarcodeScanRef.current(value);
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
          // HID scanners type very quickly; prevent polluting focused text inputs.
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [showScanner, showBarcodeSelect]);

  // Add item to cart
  const handleAddToCart = (product: Product) => {
    // Service products are always available; only check stock for physical products
    if (!product.isService && product.stock <= 0) {
      toast.error(`${product.name} is out of stock`, { duration: 3000 });
      return;
    }

    const existingItem = cartItems.find((item) => item.id === product.id);
    lastDisplayItemIdRef.current = product.id;
    setCustomerDisplayStatus("cart");

    if (existingItem) {
      if (product.isService || existingItem.quantity < product.stock) {
        setCartItems(
          cartItems.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
        toast.success(`Added ${product.name} to cart`, { duration: 2000 });
      } else {
        toast.error(
          `Only ${product.stock} units available for ${product.name}`,
          { duration: 3000 },
        );
      }
    } else {
      setCartItems([
        ...cartItems,
        {
          id: product.id,
          productId: product.productId,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
          category: product.category,
          image: product.image,
          warrantyMonths: product.warrantyMonths || 0,
          isService: product.isService ?? false,
        },
      ]);
      toast.success(`${product.name} added to cart`, { duration: 2000 });
    }
  };

  // Update cart item quantity
  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (lastDisplayItemIdRef.current === id) {
          lastDisplayItemIdRef.current = next[next.length - 1]?.id ?? null;
        }
        return next;
      });
      toast.success("Item removed from cart", { duration: 2000 });
      return;
    }

    // Validate stock before updating quantity
    const product = products.find((p) => p.id === id);
    const cartItem = cartItems.find((i) => i.id === id);
    if (product && !cartItem?.isService && quantity > product.stock) {
      toast.error(`Only ${product.stock} units available`, { duration: 3000 });
      return;
    }

    lastDisplayItemIdRef.current = id;
    setCartItems(
      cartItems.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  };

  const handleUpdatePrice = (id: string, price: number) => {
    const item = cartItems.find((i) => i.id === id);
    if (!item?.isService) return;

    const safePrice = Number.isFinite(price) ? Number(price) : 0;
    if (safePrice < 0) return;

    lastDisplayItemIdRef.current = id;
    setCartItems((prev) =>
      prev.map((i) =>
        i.id === id && i.isService ? { ...i, price: safePrice } : i,
      ),
    );
  };

  // Remove item from cart
  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (lastDisplayItemIdRef.current === id) {
        lastDisplayItemIdRef.current = next[next.length - 1]?.id ?? null;
      }
      return next;
    });
  };

  // Clear cart
  const handleClearCart = () => {
    lastDisplayItemIdRef.current = null;
    setCustomerDisplayStatus("idle");
    setCartItems([]);
  };

  // Handle checkout
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty. Please add items before checkout.", {
        duration: 3000,
      });
      return;
    }
    setCustomerDisplayStatus("payment");

    // Validate stock availability for all cart items (skip for service products)
    const outOfStock = cartItems.filter((item) => {
      const product = products.find((p) => p.id === item.id);
      if (product?.isService) return false;
      return !product || product.stock < item.quantity;
    });

    if (outOfStock.length > 0) {
      toast.error(
        `Some items are out of stock or quantity exceeds available stock: ${outOfStock.map((i) => i.name).join(", ")}`,
        { duration: 5000 },
      );
      return;
    }

    setIsPaymentModalOpen(true);
  };

  // Handle payment completion
  const handlePaymentComplete = async (orderData: OrderData) => {
    console.log("==================== PAYMENT COMPLETED ====================");
    console.log("Order received in POSPage:", orderData);
    console.log("===========================================================");

    try {
      // Validate required data
      const userLocationId = user?.locationId || user?.branchId;
      if (!userLocationId) {
        throw new Error("Location information not found");
      }

      if (!user?.id) {
        throw new Error("User information not found");
      }

      if (cartItems.length === 0) {
        throw new Error("Cart is empty");
      }

      // Step 1: Find or create customer (optional for POS)
      let customerId: string | undefined = orderData.customer.id;

      if (orderData.customer.phone && !customerId) {
        // Process phone number: remove +94 prefix if present
        let processedPhone = orderData.customer.phone;
        if (processedPhone.startsWith("+94")) {
          processedPhone = processedPhone.substring(3); // Remove +94
        }

        // Search for existing customer by phone
        const searchResponse = await searchCustomers(processedPhone, 1);
        const customers: Array<{
          id: string;
          name: string;
          phone: string;
          email?: string;
        }> =
          (searchResponse?.data as Array<{
            id: string;
            name: string;
            phone: string;
            email?: string;
          }>) || [];

        if (customers.length > 0) {
          customerId = customers[0].id;
          console.log("Existing customer found:", customerId);
        } else {
          // Create new customer
          const createResponse = await createCustomer({
            name: orderData.customer.name,
            phone: processedPhone,
            email: orderData.customer.email || undefined,
            locationId: userLocationId,
            customerType: "WALK_IN",
          });
          const createData = createResponse?.data as
            | { id?: string }
            | undefined;

          if (createData?.id) {
            customerId = createData.id;
            console.log("New customer created:", customerId);
          }
        }
      }

      // Step 2: Prepare sale items
      const saleItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.price),
        costPrice: Number(item.price * 0.7), // Assume 30% margin if not specified
        discount: 0,
        discountType: "FIXED" as const,
        tax: 0,
        warrantyMonths: item.warrantyMonths || 0,
      }));

      // Step 3: Prepare payment
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const discountAmount = orderData.discount || 0;
      const finalAmount = totalAmount - discountAmount;

      const payments = [
        {
          method: orderData.paymentMethod as
            | "CASH"
            | "CARD"
            | "BANK_TRANSFER"
            | "CHEQUE"
            | "MOBILE_MONEY"
            | "MOBILE_PAYMENT"
            | "KOKO"
            | "MINTPAY"
            | "PAYZY"
            | "COD",
          amount: orderData.paidAmount ?? finalAmount,
          reference: orderData.reference || `POS-${Date.now()}`,
        },
      ];

      // Step 4: Create sale via API
      console.log("Creating sale with data:", {
        branchId: user.branchId,
        customerId,
        items: saleItems,
        payments,
        type: "DIRECT_SALE",
        discount: discountAmount,
        notes: `POS Sale - ${orderData.customer.name}`,
      });

      const saleResponse = await createSale({
        locationId: userLocationId,
        soldById: user.id,
        customerId,
        items: saleItems,
        payments,
        type: "DIRECT_SALE",
        discount: discountAmount,
        discountType: orderData.discountType,
        notes: `POS Sale - ${orderData.customer.name}`,
        ...(orderData.advanceDueDate
          ? { advanceDueDate: orderData.advanceDueDate }
          : {}),
        // Sale Job passthrough: when the checkout flags this order as a job
        // (see SaleJobFields), forward it so the backend auto-creates a SaleJob.
        ...((orderData as any)?.job?.isJob ? { job: (orderData as any).job } : {}),
        ...(user.businessId ? { businessId: user.businessId } : {}),
      } as any);

      console.log("Sale created:", saleResponse?.data);

      if (!saleResponse?.data) {
        throw new Error("No response from sale creation");
      }

      const saleData = saleResponse.data as {
        sale?: { id: string; saleNumber: string };
        id?: string;
        saleNumber?: string;
      };

      const saleId = saleData.sale?.id || saleData.id;
      const saleNumber = saleData.sale?.saleNumber || saleData.saleNumber;

      if (!saleId || !saleNumber) {
        throw new Error("Invalid sale response");
      }

      // Step 5: Return successful response
      const response: { data: ApiResponse } = {
        data: {
          status: true,
          message: "Sale completed successfully",
          saleId,
          saleNumber,
          sale: saleData,
          order: {
            ...orderData,
            customer: { ...orderData.customer, id: customerId },
          },
        },
      };

      toast.success(`Sale completed successfully! Sale Number: ${saleNumber}`, {
        duration: 5000,
      });

      // ── Auto-print: QZ Tray ESC/POS first, fall back to silent browser print ──
      const printerConf = userLocationId
        ? getPrinterConfig(userLocationId)
        : null;
      if (printerConf?.autoPrintOnSale) {
        let qzPrinted = false;
        if (printerConf.printerName) {
          try {
            const escposRes = await getESCPOSData(
              saleId,
              printerConf.paperWidth,
            );
            const escposData = (escposRes as any)?.data;
            if (escposData?.commands?.length) {
              qzPrinted = await tryPrintESCPOS(
                escposData.commands,
                printerConf.printerName,
              );
            }
          } catch {
            console.error(
              "[AutoPrint] ESC/POS fetch failed – falling back to HTML iframe print",
            );
          }
          if (qzPrinted && printerConf.autoOpenDrawer) {
            await tryOpenDrawer(printerConf.printerName);
          }
        }
        if (!qzPrinted) {
          // Use the branch/org configured format – printerConf.paperWidth is for ESC/POS only
          const fallbackFormat: 'a4' | '80mm' | '58mm' = posSettings.defaultFormat ?? '58mm';
          const cashAmt = orderData.paymentMethod === 'CASH' ? (orderData.payment?.cashReceived ?? 0) : 0;
          await silentPrintInvoice(saleId, {
            format: fallbackFormat,
            cashReceived: cashAmt > 0 ? cashAmt : undefined,
            printerConf,
            openDrawer: orderData.paymentMethod === 'CASH',
          });
          // Cash drawer overlay: respect the org/branch autoCashDrawer setting only
          if (
            orderData.paymentMethod === "CASH" &&
            posSettings.autoCashDrawer
          ) {
            setShowCashDrawer(true);
          }
        }
      } else if (posSettings.autoPrintOnSale) {
        const cashAmt = orderData.paymentMethod === 'CASH' ? (orderData.payment?.cashReceived ?? 0) : 0;
        await silentPrintInvoice(saleId, {
          format: posSettings.defaultFormat ?? '58mm',
          cashReceived: cashAmt > 0 ? cashAmt : undefined,
          printerConf,
          openDrawer: orderData.paymentMethod === 'CASH',
        });
      }
      // Show cash drawer overlay for cash payments (when no QZ Tray, or QZ didn't print)
      if (
        orderData.paymentMethod === "CASH" &&
        !printerConf?.autoPrintOnSale &&
        posSettings.autoCashDrawer
      ) {
        setShowCashDrawer(true);
      }

      // Reload products to update stock
      await loadProducts();

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process sale";
      console.error("Sale processing failed:", error);

      // Provide detailed error feedback
      if (
        errorMessage.includes("stock") ||
        errorMessage.includes("inventory")
      ) {
        toast.error("Stock error: " + errorMessage, { duration: 5000 });
      } else if (errorMessage.includes("customer")) {
        toast.error("Customer error: " + errorMessage, { duration: 5000 });
      } else if (errorMessage.includes("payment")) {
        toast.error("Payment error: " + errorMessage, { duration: 5000 });
      } else {
        toast.error("Sale failed: " + errorMessage, { duration: 5000 });
      }

      throw error;
    }
  };

  // Handle payment success (opens BillModal only when auto-print is NOT configured)
  const handlePaymentSuccess = (
    orderData: OrderData,
    apiResponseData: ApiResponse,
  ) => {
    // Store order data for BillModal
    setCompletedOrderData(orderData);
    setResponseData(apiResponseData);

    // Reset cart
    lastDisplayItemIdRef.current = null;
    setCustomerDisplayStatus("success");
    setCartItems([]);
    window.setTimeout(() => setCustomerDisplayStatus("idle"), 4000);

    // If this was an advance/partial payment → auto-download the acknowledgement PDF
    if (orderData.isPartialPayment && apiResponseData?.saleId) {
      const locationId = user?.locationId || user?.branchId;
      const printerConf = locationId ? getPrinterConfig(locationId) : null;
      const ackFormat: "a4" | "80mm" | "58mm" =
        printerConf?.paperWidth ?? posSettings.defaultFormat ?? "a4";

      downloadAcknowledgement(apiResponseData.saleId, ackFormat).catch(() => {
        toast.error(
          "Acknowledgement PDF could not be downloaded. You can re-download it from Advance Payments page.",
        );
      });
      toast.success(
        `Advance payment saved! Acknowledgement (${ackFormat}) PDF downloading...`,
        { duration: 5000 },
      );
      return; // Skip BillModal for advance payments
    }

    // Skip BillModal when auto-print is configured – the receipt is already being
    // printed silently via the hidden-iframe approach.  Only show BillModal when
    // the cashier needs to manually trigger printing.
    const conf =
      user?.locationId || user?.branchId
        ? getPrinterConfig(user.locationId || user.branchId!)
        : null;
    const willAutoPrint = conf?.autoPrintOnSale || posSettings.autoPrintOnSale;
    if (!willAutoPrint) {
      setIsBillModalOpen(true);
    }
  };

  // Handle bill modal close
  const handleBillModalClose = () => {
    setIsBillModalOpen(false);
    setCompletedOrderData(null);
    setResponseData(null);
  };

  if (drawerChecked && !drawerIsOpen) {
    const locationId = user?.locationId || user?.branchId || "";
    return (
      <CashDrawerBlocker
        locationId={locationId}
        onDrawerOpened={() => setDrawerIsOpen(true)}
      />
    );
  }

  // Block POS if settings haven't been configured in the backend yet
  if (!posSettingsLoading && posSettingsConfigured === false) {
    return <POSSettingsBlocker settingsPath="/superadmin/pos/settings" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-white/30 backdrop-blur-sm p-8 rounded-lg shadow-md border border-white/20">
          <Loader2 className="w-12 h-12 animate-spin text-[#1e3a8a] mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-1">Loading POS System</p>
          <p className="text-gray-600 text-sm">Fetching branch inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-2 pb-8">
      {/* Main POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection Area - 2 columns */}
        <div className="lg:col-span-2">
          {/* Scan button row */}
          <div className="flex justify-end mb-2 gap-2">
            {customerDisplayEnabled && (
              <button
                type="button"
                onClick={openCustomerDisplay}
                title="Open customer display on second screen"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm border ${
                  customerDisplayActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent"
                }`}
              >
                <Monitor className="w-4 h-4" />
                {customerDisplayActive ? "Display on" : "Customer display"}
              </button>
            )}
            <button
              onClick={() => setShowScanner(true)}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <ScanLine className="w-4 h-4" />
              {scanning ? "Scanning…" : "Scan Barcode"}
            </button>
          </div>
          <ProductGrid
            products={products}
            searchQuery={searchQuery}
            setSearchQuery={handleSearchChange}
            activeItemType={activeItemType}
            setActiveItemType={setActiveItemType}
            selectedCategory={selectedCategory}
            setSelectedCategory={handleCategoryChange}
            onAddToCart={handleAddToCart}
            isLoadingProducts={isFetchingProducts}
            totalProducts={totalProducts}
            currentPage={productPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>

        {/* Cart Summary Area - 1 column */}
        <div className="lg:col-span-1">
          <CartSummary
            cartItems={cartItems}
            total={total}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdatePrice={handleUpdatePrice}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setCustomerDisplayStatus(cartItems.length ? "cart" : "idle");
          }}
          onPaymentComplete={handlePaymentComplete}
          onPaymentSuccess={handlePaymentSuccess}
          cartItems={cartItems}
          total={total}
        />
      )}

      {/* Bill Modal */}
      <BillModal
        isOpen={isBillModalOpen}
        onClose={handleBillModalClose}
        orderData={completedOrderData}
        responseData={responseData}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan to Add to Cart"
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

      {/* Cash Drawer Open Overlay */}
      <CashDrawerOpenOverlay
        visible={showCashDrawer}
        onDone={() => setShowCashDrawer(false)}
      />
    </div>
  );
};

export default POSPage;
