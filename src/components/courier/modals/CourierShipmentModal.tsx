/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus,
  Package, 
  MapPin, 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  DollarSign,
} from 'lucide-react';
import {
  type CourierService,
  type CourierShipment,
  type PhoneOrderInsights,
  type BusinessCourierSettings,
  DeliveryMethod,
  CourierServiceProvider,
  isStaffCourierPermissionsLimited,
} from '../../../hooks/useCourier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInventory } from '../../../hooks/useInventory';
import useBusinessProfile from '../../../hooks/useBusinessProfile';
import useCustomer, { type Customer as CustomerType } from '../../../hooks/useCustomer';
import useCourier from '../../../hooks/useCourier';
import { useLocation } from '../../../hooks/useLocation';
import { useAppSelector } from '../../../store/hooks';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { glassFieldBase, glassFieldFocus } from '@/lib/theme-fields';
import { sriLankaCities, sriLankaDistricts } from '../../../data/sriLankaCities';

type Variant = 'orange' | 'blue';

const fieldBase = cn(
  'flex h-9 w-full disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  glassFieldBase,
  glassFieldFocus,
  'text-sm'
);

interface ThemeColors {
  ring: string;
  text: string;
  bg: string;
  hover: string;
  border: string;
  bgLight: string;
  textDark: string;
  spinnerBorder: string;
  accentCheckbox: string;
  field: string;
  dropdownItemHover: string;
  sectionBorder: string;
}

const getTheme = (variant: Variant): ThemeColors => {
  if (variant === 'blue') {
    return {
      ring: 'focus:ring-blue-400',
      text: 'text-blue-600',
      bg: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
      border: 'border-blue-500',
      bgLight: 'bg-blue-50',
      textDark: 'text-blue-700',
      spinnerBorder: 'border-blue-600',
      accentCheckbox: 'accent-blue-600',
      field: fieldBase,
      dropdownItemHover: 'hover:bg-blue-50',
      sectionBorder: 'border-blue-200/60',
    };
  }
  return {
    ring: 'focus:ring-orange-400',
    text: 'text-orange-600',
    bg: 'bg-orange-600',
    hover: 'hover:bg-orange-700',
    border: 'border-orange-500',
    bgLight: 'bg-orange-50',
    textDark: 'text-orange-700',
    spinnerBorder: 'border-orange-600',
    accentCheckbox: 'accent-orange-600',
    field: fieldBase,
    dropdownItemHover: 'hover:bg-orange-50',
    sectionBorder: 'border-orange-200/60',
  };
};

const parseNumberInput = (value: string, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOptionalNumberInput = (value: string): number | undefined => {
  if (value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toSafeNumber = (value: unknown, fallback = 0): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

type ShipmentPaymentMethod = 'bank' | 'online' | 'cod' | 'koko' | 'mintpay' | 'payzy';

export const CourierShipmentModal = ({
  onClose,
  onSave,
  courierServices,
  variant = 'orange',
  initialData,
  initialProducts,
  initialPaymentMethod,
  initialPaymentDescription,
  initialPaymentConfirmed,
  initialPaymentConfirmedAmount,
  courierSettings: courierSettingsProp,
}: {
  onClose: () => void;
  onSave: (data: Partial<CourierShipment>) => Promise<any>;
  courierServices: CourierService[];
  variant?: Variant;
  initialData?: Partial<CourierShipment>;
  initialProducts?: Array<{ productId?: string; name: string; sku: string; quantity: number; unitPrice: number }>;
  initialPaymentMethod?: ShipmentPaymentMethod;
  initialPaymentDescription?: string;
  initialPaymentConfirmed?: boolean;
  initialPaymentConfirmedAmount?: number;
  courierSettings?: BusinessCourierSettings | null;
}) => {
  const theme = getTheme(variant);
  const isEditMode = !!initialData?.id;
  const { user } = useAppSelector((state) => state.auth);
  const { getAllInventory } = useInventory();
  const { loadBusinessProfile } = useBusinessProfile();
  const { getCustomers, createCustomer } = useCustomer();
  const { getCourierCities, getPhoneOrderInsights, courierSettings: hookCourierSettings, fetchCourierSettings } = useCourier();
  const { getBranches } = useLocation();
  const effectiveSettings = courierSettingsProp ?? hookCourierSettings;

  useEffect(() => {
    if (!effectiveSettings && user?.businessId) {
      void fetchCourierSettings(user.businessId);
    }
  }, [effectiveSettings, user?.businessId, fetchCourierSettings]);

  const staffPermissionsLimited = isStaffCourierPermissionsLimited(effectiveSettings, user?.role?.name);

  // Branch / pickup location state
  const [branches, setBranches] = useState<Array<{ id: string; name: string; locationCode?: string }>>([]);
  const [fetchingBranches, setFetchingBranches] = useState(false);

  // Curfox city lookup state
  const [courierCities, setCourierCities] = useState<Array<{ id: number; name: string; stateName: string }>>([]);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<ShipmentPaymentMethod>(initialPaymentMethod ?? 'cod');
  const [_manualSenderEdit, _setManualSenderEdit] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Customer search state
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [saveAsCustomer, setSaveAsCustomer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shipmentConfirm, setShipmentConfirm] = useState<{
    shipmentNumber: string;
    paymentReference: string | null;
    paymentMethod: string;
    amount: number;
    recipientName: string;
  } | null>(null);
  const [customerLoading ,setCustomerLoading] = useState(false);
  const recipientSectionRef = React.useRef<HTMLDivElement>(null);

  // Payment confirmation state for bank/online
  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(initialPaymentConfirmed ?? false);
  const [paymentConfirmedAmount, setPaymentConfirmedAmount] = useState<number>(initialPaymentConfirmedAmount ?? 0);
  const [paymentDescription, setPaymentDescription] = useState<string>(initialPaymentDescription ?? '');

  // Discount state
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Actual shipping cost paid to courier (for P&L). Separate from
  // shippingCharge which is the flat rate billed to the customer on the invoice.
  const [actualShippingCost, setActualShippingCost] = useState<number>(0);

  const [formData, setFormData] = useState<Partial<CourierShipment>>({
    shipmentNumber: initialData?.shipmentNumber || '',
    courierServiceId: '',
    pickupLocationId: initialData?.pickupLocationId || '',
    deliveryMethod: DeliveryMethod.STANDARD,
    senderName: '',
    senderPhone: '',
    senderAddress: '',
    senderCity: '',
    senderDistrict: '',
    senderPostalCode: '',
    recipientName: '',
    recipientPhone: '',
    recipientPhone2: '',
    recipientEmail: '',
    recipientAddress: '',
    recipientCity: '',
    recipientDistrict: '',
    recipientPostalCode: '',
    weight: 1,
    length: undefined,
    width: undefined,
    height: undefined,
    numberOfPieces: 1,
    description: '',
    declaredValue: undefined,
    shippingCharge: 0,
    insuranceCharge: 0,
    additionalCharges: 0,
    codEnabled: false,
    codAmount: undefined,
    pickupDate: undefined,
    estimatedDeliveryDate: undefined,
    notes: '',
    deliveryInstructions: '',
    ...initialData,
  });

  // Customer order insight (success rate, return history, duplicate detection)
  const [phoneInsights, setPhoneInsights] = useState<PhoneOrderInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // Load business profile and branches on mount
  React.useEffect(() => {
    loadBusinessProfile();
  }, [loadBusinessProfile]);

  React.useEffect(() => {
    if (!formData.pickupLocationId && user?.locationId) {
      setFormData((prev) => ({ ...prev, pickupLocationId: user.locationId }));
    }
  }, [user?.locationId]);

  // Look up the recipient phone across all branches and surface a success-rate /
  // return-history insight plus any possible duplicate orders. Debounced.
  React.useEffect(() => {
    const phone = (formData.recipientPhone || '').replace(/\D/g, '');
    if (phone.length < 9) {
      setPhoneInsights(null);
      setDuplicateDismissed(false);
      return;
    }
    let cancelled = false;
    setInsightsLoading(true);
    const timer = setTimeout(async () => {
      const result = await getPhoneOrderInsights(formData.recipientPhone);
      if (cancelled) return;
      setPhoneInsights(result);
      setDuplicateDismissed(false);
      setInsightsLoading(false);
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setInsightsLoading(false);
    };
  }, [formData.recipientPhone]);

  React.useEffect(() => {
    const fetchBranches = async () => {
      setFetchingBranches(true);
      try {
        const res = await getBranches();
        const list: any[] = (res as any)?.data?.locations || (res as any)?.data?.branches || (res as any)?.data || [];
        const mapped = list.map((b: any) => ({ id: b.id, name: b.name, locationCode: b.locationCode }));
        setBranches(mapped);
        // Auto-select if exactly one branch exists and none pre-selected
        if (mapped.length === 1 && !initialData?.pickupLocationId) {
          setFormData(prev => ({ ...prev, pickupLocationId: mapped[0].id }));
        }
      } catch {
        // silent
      } finally {
        setFetchingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  // Search customers when customerSearchTerm changes
  React.useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearchTerm.trim().length < 1) {
        setCustomers([]);
        setShowCustomerDropdown(false);
        return;
      }
      setLoadingCustomers(true);
      try {
        const response = await getCustomers({ search: customerSearchTerm, isActive: true, limit: 20 });
        if (response?.success && response.data) {
          const list = (response as any).data?.customers || (response as any).data?.data || (response as any).data || [];
          setCustomers(list);
          setShowCustomerDropdown(true);
        } else {
          setCustomers([]);
        }
      } catch {
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };
    const timeout = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timeout);
  }, [customerSearchTerm]);

  const handleSelectCustomer = (customer: CustomerType) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm(customer.name);
    setShowCustomerDropdown(false);
    setFormData(prev => ({
      ...prev,
      recipientName: customer.name,
      recipientPhone: customer.phone,
      recipientEmail: customer.email || '',
      recipientAddress: customer.address || '',
      recipientCity: customer.city || '',
    }));
  };

  // Auto-select first active courier service and auto-fill base charge
  React.useEffect(() => {
    if (courierServices.length > 0 && !formData.courierServiceId) {
      const firstActiveService = courierServices.find(s => s.isActive);
      if (firstActiveService) {
        const charge = firstActiveService.baseCharge && firstActiveService.baseCharge > 0
          ? firstActiveService.baseCharge
          : 0;
        const preserveShipping = (initialData?.shippingCharge ?? 0) > 0;
        setFormData(prev => ({
          ...prev,
          courierServiceId: firstActiveService.id,
          shippingCharge: preserveShipping ? prev.shippingCharge : (charge || prev.shippingCharge),
        }));
        if (charge > 0 && !preserveShipping) setActualShippingCost(charge);
      }
    }
  }, [courierServices, formData.courierServiceId]);

  // Update shipping charge when selected courier changes (only if not already set)
  React.useEffect(() => {
    if (formData.courierServiceId) {
      const svc = courierServices.find(s => s.id === formData.courierServiceId);
      if (svc && svc.baseCharge && svc.baseCharge > 0 && !(initialData?.shippingCharge && initialData.shippingCharge > 0)) {
        setFormData(prev => {
          if ((prev.shippingCharge ?? 0) > 0) return prev;
          return { ...prev, shippingCharge: svc.baseCharge as number };
        });
        setActualShippingCost(prev => (prev > 0 ? prev : svc.baseCharge as number));
      }
    }
  }, [formData.courierServiceId, courierServices]);

  const totalProductQuantity = useMemo(
    () => selectedProducts.reduce((sum, p) => sum + p.quantity, 0) || 1,
    [selectedProducts]
  );

  // Keep number of pieces in sync with total product quantity
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, numberOfPieces: totalProductQuantity }));
  }, [totalProductQuantity]);

  // Fetch Curfox city list when a Curfox courier is selected
  React.useEffect(() => {
    if (!formData.courierServiceId || !user?.businessId) return;
    const svc = courierServices.find(s => s.id === formData.courierServiceId);
    if (svc?.provider === CourierServiceProvider.CURFOX) {
      getCourierCities(user.businessId, formData.courierServiceId).then(cities => {
        setCourierCities(cities);
      });
    } else {
      setCourierCities([]);
    }
  }, [formData.courierServiceId, courierServices, user?.businessId]);

  // When products change, update declaredValue only (shipping/COD are useMemo-computed)
  React.useEffect(() => {
    if (selectedProducts.length > 0) {
      const totalValue = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      setFormData(prev => ({ ...prev, declaredValue: totalValue }));
    }
  }, [selectedProducts]);

  // Fetch products on component mount
  React.useEffect(() => {
    const fetchAllProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await getAllInventory({ limit: 500, includeDiscount: true });
        if (response?.data) {
          const inventoryList: any[] = (response as any).data?.inventory || (response as any).data?.items || (response as any).data?.data || (response as any).data || [];
          // De-duplicate by productId, summing availableQuantity across locations
          const productMap = new Map<string, any>();
          for (const item of inventoryList) {
            if (!item.productId) continue;
            if (productMap.has(item.productId)) {
              productMap.get(item.productId).stock += item.availableQuantity || 0;
            } else {
              const unitPrice = Number(item.product?.unitPrice) || 0;
              const discountInfo = item.product?.discountInfo ?? null;
              productMap.set(item.productId, {
                id: item.productId,
                name: item.product?.name || 'Unknown Product',
                sku: item.product?.sku || item.product?.productCode || '',
                price: discountInfo ? discountInfo.effectivePrice : unitPrice,
                originalPrice: discountInfo ? unitPrice : undefined,
                discountInfo,
                costPrice: Number(item.product?.costPrice) || 0,
                stock: item.availableQuantity || 0,
                isActive: item.product?.isActive ?? true,
              });
            }
          }
          setProducts([...productMap.values()]);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Failed to fetch all products:', error);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchAllProducts();
  }, []);

  // Pre-select products from initialProducts once inventory is loaded
  React.useEffect(() => {
    if (!initialProducts?.length || !products.length || selectedProducts.length > 0) return;
    const norm = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const matched = initialProducts.flatMap((item) => {
      const itemSku = norm(item.sku);
      const itemName = norm(item.name);
      const found =
        // 0. Exact local product id (resolved by backend — most reliable)
        (item.productId ? products.find((p) => p.id === item.productId) : undefined) ??
        // 1. SKU exact match
        (itemSku ? products.find((p) => norm(p.sku) === itemSku) : undefined) ??
        // 2. Exact name match
        products.find((p) => norm(p.name) === itemName) ??
        // 3. Partial name match (one contains the other)
        products.find((p) => {
          const pName = norm(p.name);
          return itemName && pName && (pName.includes(itemName) || itemName.includes(pName));
        });
      if (!found) {
        // Backend resolved a local product that isn't in the loaded inventory page
        // (e.g. beyond the fetch limit). Build a minimal entry so it still auto-selects.
        if (item.productId) {
          return [{
            id: item.productId,
            name: item.name,
            sku: item.sku,
            price: item.unitPrice > 0 ? item.unitPrice : 0,
            costPrice: 0,
            stock: 0,
            quantity: item.quantity,
          }];
        }
        return [];
      }
      return [{ ...found, quantity: item.quantity, price: item.unitPrice > 0 ? item.unitPrice : found.price }];
    });
    if (matched.length > 0) setSelectedProducts(matched);
  }, [products]);

  // Search products when productSearchTerm changes
  React.useEffect(() => {
    if (!productSearchTerm.trim()) return;
    const fetchProductsBySearch = async () => {
      setLoadingProducts(true);
      try {
        const response = await getAllInventory({ search: productSearchTerm, limit: 50, includeDiscount: true });
        if (response?.data) {
          const inventoryList: any[] = (response as any).data?.inventory || (response as any).data?.items || (response as any).data?.data || (response as any).data || [];
          const productMap = new Map<string, any>();
          for (const item of inventoryList) {
            if (!item.productId || !item.product?.isActive) continue;
            if (productMap.has(item.productId)) {
              productMap.get(item.productId).stock += item.availableQuantity || 0;
            } else {
              const unitPrice = Number(item.product?.unitPrice) || 0;
              const discountInfo = item.product?.discountInfo ?? null;
              productMap.set(item.productId, {
                id: item.productId,
                name: item.product?.name || 'Unknown Product',
                sku: item.product?.sku || item.product?.productCode || '',
                price: discountInfo ? discountInfo.effectivePrice : unitPrice,
                originalPrice: discountInfo ? unitPrice : undefined,
                discountInfo,
                costPrice: Number(item.product?.costPrice) || 0,
                stock: item.availableQuantity || 0,
              });
            }
          }
          setProducts([...productMap.values()]);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Failed to search products:', error);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    const timeoutId = setTimeout(fetchProductsBySearch, 300);
    return () => clearTimeout(timeoutId);
  }, [productSearchTerm]);

  const filteredProducts = products;

  const handleAddProduct = (product: any) => {
    const existingProduct = selectedProducts.find(p => p.id === product.id);
    if (!existingProduct) {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
    setProductSearchTerm('');
    setShowProductDropdown(false);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const handleProductQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
    ));
  };

  const handleProductPriceChange = (productId: string, price: number) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.id === productId ? { ...p, price: Math.max(0, price) } : p
    ));
  };

  // ── Memoised calculations ────────────────────────────────────────────────

  const selectedCourier = useMemo(
    () => courierServices.find(s => s.id === formData.courierServiceId),
    [courierServices, formData.courierServiceId]
  );

  /** Raw product subtotal (before discount) */
  const subtotal = useMemo(
    () => selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0),
    [selectedProducts]
  );

  /** Discount amount applied to the product subtotal */
  const discountAmount = useMemo(() => {
    if (discountType === 'PERCENTAGE') return subtotal * (discountValue / 100);
    return Math.min(discountValue, subtotal);
  }, [subtotal, discountType, discountValue]);

  /** Product value after discount – what the customer is paying for goods */
  const productValueAfterDiscount = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
  );

  /**
   * Invoice total = what the customer pays.
   * = productValueAfterDiscount + shippingCharge (flat rate on invoice) + additionalCharges
   * This is also the COD amount for cash-on-delivery orders.
   */
  const invoiceTotal = useMemo(
    () =>
      productValueAfterDiscount +
      toSafeNumber(formData.shippingCharge) +
      toSafeNumber(formData.additionalCharges),
    [productValueAfterDiscount, formData.shippingCharge, formData.additionalCharges]
  );

  /** Extra weight surcharge applied by the courier (business cost, not shown on customer invoice) */
  const extraWeightCharge = useMemo(() => {
    const weight = toSafeNumber(formData.weight);
    const perKgCharge = toSafeNumber(selectedCourier?.perKgCharge);
    return weight > 1 ? (Math.ceil(weight) - 1) * perKgCharge : 0;
  }, [formData.weight, selectedCourier]);

  /**
   * Total actual courier cost (for P&L).
   * = actualShippingCost + insuranceCharge + extraWeightCharge
   * Does NOT affect the customer invoice.
   */
  const actualCourierCost = useMemo(
    () =>
      toSafeNumber(actualShippingCost) +
      toSafeNumber(formData.insuranceCharge) +
      extraWeightCharge,
    [actualShippingCost, formData.insuranceCharge, extraWeightCharge]
  );

  /** Total cost-of-goods across all selected products */
  const costOfGoods = useMemo(
    () => selectedProducts.reduce((sum, p) => sum + (p.costPrice || 0) * p.quantity, 0),
    [selectedProducts]
  );

  /**
   * Gross profit = Invoice Total − Actual Courier Cost − Cost of Goods
   * P&L breakdown visible in the summary section.
   */
  const grossProfit = useMemo(
    () => invoiceTotal - actualCourierCost - costOfGoods,
    [invoiceTotal, actualCourierCost, costOfGoods]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.courierServiceId) {
      toast.error('Please select a courier service');
      return;
    }

    if (!formData.recipientName || !formData.recipientPhone) {
      toast.error('Please fill in recipient name and phone');
      return;
    }

    if (!isEditMode && selectedProducts.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    if ((paymentMethod === 'bank' || paymentMethod === 'online') && paymentConfirmed) {
      if (!paymentConfirmedAmount || paymentConfirmedAmount <= 0) {
        toast.error('Please enter the confirmed payment amount');
        return;
      }
    }

    const submitData = {
      ...formData,
      shipmentNumber: formData.shipmentNumber?.trim() || undefined,
      customerId: selectedCustomer?.id,
      shippingCharge: toSafeNumber(formData.shippingCharge),      // flat rate billed to customer
      insuranceCharge: toSafeNumber(formData.insuranceCharge),
      additionalCharges: toSafeNumber(formData.additionalCharges),
      actualShippingCost: actualShippingCost,                      // actual cost paid to courier (P&L)
      // totalCharge = customer-facing delivery charges; backend adds this to product total for sale
      totalCharge: toSafeNumber(formData.shippingCharge) + toSafeNumber(formData.additionalCharges),
      declaredValue: invoiceTotal,
      codEnabled: paymentMethod === 'cod',
      codAmount: paymentMethod === 'cod' ? invoiceTotal : 0,
      description: formData.description?.trim() || '',
      notes: `Payment Method: ${paymentMethod.toUpperCase()}${paymentDescription ? ' | ' + paymentDescription : ''}${formData.notes ? ' | ' + formData.notes : ''}`,
      paymentMethod,
      paymentConfirmed: (paymentMethod === 'bank' || paymentMethod === 'online') ? paymentConfirmed : undefined,
      paymentConfirmedAmount: (paymentMethod === 'bank' || paymentMethod === 'online') && paymentConfirmed ? paymentConfirmedAmount : undefined,
      paymentDescription: paymentDescription || undefined,
      discountType: discountValue > 0 ? discountType : undefined,
      discountValue: discountValue > 0 ? discountValue : undefined,
      pickupLocationId: formData.pickupLocationId || undefined,
      saleItems: selectedProducts.map(p => ({
        productId: p.id,
        name: p.name,
        quantity: p.quantity,
        unitPrice: p.price,
        costPrice: p.costPrice || 0,
      })),
    };
    
    if (!selectedCustomer && saveAsCustomer && formData.recipientName && formData.recipientPhone) {
      try {
        setCustomerLoading(true);
        await createCustomer({
          name: formData.recipientName,
          phone: formData.recipientPhone,
          email: formData.recipientEmail || null,
          address: formData.recipientAddress || null,
          city: formData.recipientCity || null,
        }, true);
        toast.success('Customer created successfully');
      } catch (err) {
        console.error('Failed to create customer:', err);
      } finally {
        setCustomerLoading(false);
      }
    }
    setIsSubmitting(true);
    try {
      const result = await onSave(submitData);
      if (result?.success) {
        setShipmentConfirm({
          shipmentNumber: result.data?.shipmentNumber || result.data?.shipment_number || '',
          paymentReference: result.data?.paymentReference || paymentDescription || null,
          paymentMethod,
          amount: invoiceTotal,
          recipientName: formData.recipientName || '',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Possible duplicate order warning — user can review and still continue */}
      {phoneInsights?.hasPossibleDuplicate && !duplicateDismissed && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900">Possible Duplicate Order</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This phone number already has {phoneInsights.possibleDuplicates.length} active
                  order{phoneInsights.possibleDuplicates.length > 1 ? 's' : ''} today across your branches.
                  Please confirm this isn&apos;t a duplicate before continuing.
                </p>
              </div>
            </div>
            <div className="mt-3 max-h-40 overflow-y-auto space-y-1.5">
              {phoneInsights.possibleDuplicates.map((dup) => (
                <div key={dup.id} className="flex items-center justify-between text-xs bg-amber-50 border border-amber-100 rounded px-2.5 py-1.5">
                  <span className="font-medium text-gray-800">#{dup.shipmentNumber}</span>
                  <span className="text-gray-500">{dup.status}</span>
                  <span className="text-gray-400">
                    {new Date(dup.createdAt).toLocaleDateString('en-LK', { timeZone: 'Asia/Colombo' })}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={() => setDuplicateDismissed(true)}>
                Continue Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
      {shipmentConfirm ? (
        <div className="glass-modal-panel w-full max-w-md p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{isEditMode ? 'Shipment Updated!' : 'Shipment Created!'}</h2>
          {shipmentConfirm.shipmentNumber && (
            <p className="text-sm text-gray-500 mb-4">#{shipmentConfirm.shipmentNumber}</p>
          )}
          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Recipient</span>
              <span className="font-medium text-gray-900">{shipmentConfirm.recipientName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment</span>
              <span className="font-medium text-gray-900">{shipmentConfirm.paymentMethod.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium text-gray-900">Rs. {shipmentConfirm.amount.toLocaleString()}</span>
            </div>
            {shipmentConfirm.paymentReference && (
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-500">Reference No.</span>
                <span className="font-semibold text-blue-700">{shipmentConfirm.paymentReference}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            Done
          </button>
        </div>
      ) : (
      <div
        className="glass-modal-panel max-w-5xl"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-modal-header flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{isEditMode ? 'Edit Shipment' : 'Create New Shipment'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="glass-modal-scroll space-y-6 px-6 py-6">
          <div className="grid grid-cols-2 gap-4">

            {/* Customer (Recipient) */}
            <div className="col-span-2">
              <Label className="mb-1">
                Customer (Recipient) *
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    if (!e.target.value) setSelectedCustomer(null);
                  }}
                  onFocus={() => customerSearchTerm && setShowCustomerDropdown(true)}
                  placeholder="Search customer by name or phone..."
                  className="mt-1 pr-10"
                />
                {loadingCustomers && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${theme.spinnerBorder}`}></div>
                  </div>
                )}
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearchTerm('');
                      setFormData(prev => ({ ...prev, recipientName: '', recipientPhone: '', recipientEmail: '', recipientAddress: '', recipientCity: '' }));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                  >&times;</button>
                )}
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className={cn('cursor-pointer border-b px-4 py-3 last:border-b-0', theme.dropdownItemHover)}
                      >
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.phone}{customer.city ? ` · ${customer.city}` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
                {showCustomerDropdown && customerSearchTerm && customers.length === 0 && !loadingCustomers && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                    <div className="px-4 py-3 text-sm text-gray-500 border-b">
                      No customers found for "{customerSearchTerm}"
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSaveAsCustomer(true);
                        setFormData(prev => ({ ...prev, recipientName: customerSearchTerm }));
                        setShowCustomerDropdown(false);
                        setTimeout(() => recipientSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                      }}
                      className={cn('flex w-full items-center gap-2 px-4 py-3 text-sm font-medium', theme.text, theme.dropdownItemHover)}
                    >
                      <Plus className="w-4 h-4" />
                      Create "{customerSearchTerm}" as new customer
                    </button>
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <p className="text-xs text-green-600 mt-1">✓ Customer selected – recipient fields auto-filled</p>
              )}
              {!selectedCustomer && (
                <p className={`text-xs ${theme.text} mt-1`}>✓ Fill in recipient details below or search for an existing customer above</p>
              )}
            </div>

            {/* Courier Service Selection */}
            <div className="col-span-2">
              <Label className="mb-1">
                Courier Service *
              </Label>
              <select
                value={formData.courierServiceId}
                onChange={(e) => setFormData(prev => ({ ...prev, courierServiceId: e.target.value }))}
                className={theme.field}
                required
              >
                <option value="">Select courier service</option>
                {courierServices.filter(s => s.isActive).map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.provider}){service.baseCharge && service.baseCharge > 0 ? ` – Base: LKR ${service.baseCharge}` : ''}
                  </option>
                ))}
              </select>
              {formData.courierServiceId && (() => {
                const sc = courierServices.find(s => s.id === formData.courierServiceId);
                return sc?.baseCharge ? (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Auto-filled base charge: LKR {sc.baseCharge.toLocaleString()}
                  </p>
                ) : null;
              })()}
            </div>

            <div className="col-span-2">
              <Label className="mb-1">Shipment Number (Optional)</Label>
              <Input
                type="text"
                value={formData.shipmentNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, shipmentNumber: e.target.value }))}
                placeholder="e.g. SHP-260500001"
                className={theme.field}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to auto-generate.
              </p>
            </div>

            {/* Pickup Branch Selection */}
            <div className="col-span-2">
              <Label className="mb-1 flex items-center gap-1">
                <MapPin className={`w-4 h-4 ${theme.text}`} />
                Pickup Branch
              </Label>
              {fetchingBranches ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${theme.spinnerBorder}`}></div>
                  Loading branches...
                </div>
              ) : (
                <select
                  value={formData.pickupLocationId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickupLocationId: e.target.value }))}
                  className={theme.field}
                >
                  <option value="">Select branch (optional)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}{b.locationCode ? ` (${b.locationCode})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {branches.length === 1 && formData.pickupLocationId && (
                <p className="text-xs text-green-600 mt-1">✓ Branch auto-selected</p>
              )}
            </div>

            {/* Product Selection Section */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <h3 className={`text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2`}>
                <Package className={`w-5 h-5 ${theme.text}`} />
                Product Selection
              </h3>

              <div className="mb-3 relative">
                <Label className="mb-1">
                  Search & Add Products
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search by product name or SKU..."
                    className={cn('pr-10', theme.field)}
                  />
                  {loadingProducts && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${theme.spinnerBorder}`}></div>
                    </div>
                  )}
                </div>

                {showProductDropdown && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className={cn('cursor-pointer border-b px-4 py-3 last:border-b-0', theme.dropdownItemHover)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{product.name}</span>
                          {product.discountInfo && (
                            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-semibold">
                              {product.discountInfo.discountType === 'PERCENTAGE'
                                ? `${product.discountInfo.discountValue}% OFF`
                                : `LKR ${product.discountInfo.discountAmount} OFF`}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                          <span>SKU: {product.sku}</span>
                          <span>|</span>
                          {product.discountInfo ? (
                            <>
                              <span className="text-red-600 font-semibold">LKR {product.price.toLocaleString()}</span>
                              <span className="line-through text-gray-400">LKR {product.originalPrice?.toLocaleString()}</span>
                            </>
                          ) : (
                            <span>Price: LKR {product.price.toLocaleString()}</span>
                          )}
                          <span>| Stock: {product.stock}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showProductDropdown && productSearchTerm && filteredProducts.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    No products found matching "{productSearchTerm}"
                  </div>
                )}
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Selected Products</h4>
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900">{product.name}</span>
                          {product.discountInfo && (
                            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-semibold">
                              {product.discountInfo.discountType === 'PERCENTAGE'
                                ? `${product.discountInfo.discountValue}% OFF`
                                : `LKR ${product.discountInfo.discountAmount} OFF`}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <span>SKU: {product.sku}</span>
                          {product.originalPrice && (
                            <>
                              <span>|</span>
                              <span className="line-through text-gray-400">LKR {product.originalPrice.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-600">Qty:</div>
                        <input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => handleProductQuantityChange(product.id, parseInt(e.target.value) || 1)}
                          className={cn(theme.field, 'h-8 w-16 px-2 py-1 text-center text-sm')}
                        
                        />
                        <div className="text-xs text-gray-600">Price:</div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => handleProductPriceChange(product.id, parseFloat(e.target.value) || 0)}
                          className={cn(theme.field, 'h-8 w-28 px-2 py-1 text-sm')}
                          placeholder="LKR"
                          disabled={variant==='blue'?true:false}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className={`border-t pt-3 mt-2 flex justify-between items-center ${theme.bgLight} px-3 py-2 rounded`}>
                    <span className="text-sm font-semibold text-gray-900">Total Product Value:</span>
                    <span className={`text-lg font-bold ${theme.text}`}>LKR {productValueAfterDiscount.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Recipient Information */}
            <div className="col-span-2 border-t pt-4 mt-2" ref={recipientSectionRef}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className={`w-5 h-5 ${theme.text}`} />
                  Recipient Information
                </h3>
                {!selectedCustomer && (
                  <label className={`flex items-center gap-2 text-sm font-medium ${theme.textDark} cursor-pointer select-none`}>
                    <input
                      type="checkbox"
                      checked={saveAsCustomer}
                      onChange={(e) => setSaveAsCustomer(e.target.checked)}
                      className={`w-4 h-4 ${theme.accentCheckbox}`}
                    />
                    Save as Customer
                  </label>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-1">Recipient Name *</Label>
              <Input
                type="text"
                value={formData.recipientName}
                onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label className="mb-2">Recipient Phone *</Label>
              <Input
                type="tel"
                value={formData.recipientPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, recipientPhone: e.target.value }))}
                className="mt-1"
                required
              />

              {/* Customer order-history insight (success rate / returns, all branches) */}
              {insightsLoading && (
                <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-spin" /> Checking customer order history…
                </p>
              )}
              {!insightsLoading && phoneInsights && phoneInsights.hasPreviousOrders && (
                <div
                  className={cn(
                    'mt-2 rounded-lg border p-2.5 text-xs',
                    phoneInsights.riskLevel === 'HIGH'
                      ? 'bg-red-50 border-red-200'
                      : phoneInsights.riskLevel === 'MEDIUM'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-green-50 border-green-200',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800 flex items-center gap-1">
                      {phoneInsights.riskLevel === 'HIGH' || phoneInsights.riskLevel === 'MEDIUM' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                      )}
                      Order Success Rate
                    </span>
                    <span
                      className={cn(
                        'font-bold text-sm',
                        (phoneInsights.successRate ?? 0) >= 70
                          ? 'text-green-700'
                          : (phoneInsights.successRate ?? 0) >= 40
                            ? 'text-amber-600'
                            : 'text-red-600',
                      )}
                    >
                      {phoneInsights.successRate !== null ? `${phoneInsights.successRate}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" /> {phoneInsights.totalOrders} orders
                    </span>
                    <span className="flex items-center gap-1 text-green-700">
                      <CheckCircle className="w-3 h-3" /> {phoneInsights.deliveredOrders} delivered
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <RotateCcw className="w-3 h-3" /> {phoneInsights.returnedOrders} returned
                    </span>
                    {phoneInsights.inProgressOrders > 0 && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" /> {phoneInsights.inProgressOrders} in progress
                      </span>
                    )}
                  </div>
                  {phoneInsights.riskLevel === 'HIGH' && (
                    <p className="mt-1 text-red-700 font-medium">
                      High return rate — verify this customer before shipping.
                    </p>
                  )}
                </div>
              )}
              {!insightsLoading && phoneInsights && !phoneInsights.hasPreviousOrders && (
                <p className="mt-1 text-xs text-gray-400">No previous orders found for this number.</p>
              )}
            </div>

            <div>
              <Label className="mb-2">Recipient Phone 2 <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                type="tel"
                value={formData.recipientPhone2 || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, recipientPhone2: e.target.value }))}
                className="mt-1"
                placeholder="Alternate contact number"
              />
            </div>

            <div>
              <Label className="mb-2">Recipient Email</Label>
              <Input
                type="email"
                value={formData.recipientEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label className="mb-2">Recipient Address *</Label>
              <textarea
                value={formData.recipientAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, recipientAddress: e.target.value }))}
                rows={2}
                className={theme.field}
                required
              />
            </div>

            <div>
              <Label className="mb-1">City *</Label>
              {courierCities.length > 0 ? (
                <div className="relative mt-1">
                  <Input
                    type="text"
                    value={citySearchTerm !== '' ? citySearchTerm : (formData.recipientCity || '')}
                    placeholder="Type to search city..."
                    onChange={(e) => {
                      setCitySearchTerm(e.target.value);
                      setShowCityDropdown(true);
                      if (e.target.value === '') setFormData(prev => ({ ...prev, recipientCity: '' }));
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 150)}
                    required
                  />
                  {showCityDropdown && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                      {courierCities
                        .filter(c => c.name.toLowerCase().includes((citySearchTerm || formData.recipientCity || '').toLowerCase()))
                        .slice(0, 30)
                        .map(c => (
                          <li
                            key={c.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onMouseDown={() => {
                              setFormData(prev => ({ ...prev, recipientCity: c.name, recipientDistrict: c.stateName || prev.recipientDistrict }));
                              setCitySearchTerm('');
                              setDistrictSearchTerm('');
                              setShowCityDropdown(false);
                            }}
                          >
                            {c.name}
                            {c.stateName ? <span className="text-gray-400 ml-1">— {c.stateName}</span> : null}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="relative mt-1">
                  <Input
                    type="text"
                    value={citySearchTerm !== '' ? citySearchTerm : (formData.recipientCity || '')}
                    placeholder="Type to search Sri Lankan city..."
                    onChange={(e) => {
                      setCitySearchTerm(e.target.value);
                      setShowCityDropdown(true);
                      if (e.target.value === '') setFormData(prev => ({ ...prev, recipientCity: '' }));
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 150)}
                    required
                  />
                  {showCityDropdown && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                      {sriLankaCities
                        .filter(c => c.name.toLowerCase().includes((citySearchTerm || formData.recipientCity || '').toLowerCase()))
                        .slice(0, 50)
                        .map(c => (
                          <li
                            key={`${c.name}-${c.district}`}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onMouseDown={() => {
                              setFormData(prev => ({ ...prev, recipientCity: c.name, recipientDistrict: c.district }));
                              setCitySearchTerm('');
                              setDistrictSearchTerm('');
                              setShowCityDropdown(false);
                            }}
                          >
                            {c.name}
                            <span className="text-gray-400 ml-1">— {c.district}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="mb-1">District</Label>
              {courierCities.length > 0 ? (
                <div className="relative mt-1">
                  <Input
                    type="text"
                    value={districtSearchTerm !== '' ? districtSearchTerm : (formData.recipientDistrict || '')}
                    placeholder="Type to search district/state..."
                    onChange={(e) => {
                      setDistrictSearchTerm(e.target.value);
                      setShowDistrictDropdown(true);
                      if (e.target.value === '') setFormData(prev => ({ ...prev, recipientDistrict: '' }));
                    }}
                    onFocus={() => setShowDistrictDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDistrictDropdown(false), 150)}
                  />
                  {showDistrictDropdown && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                      {Array.from(new Set(courierCities.map(c => c.stateName).filter(Boolean)))
                        .filter(s => s.toLowerCase().includes((districtSearchTerm || formData.recipientDistrict || '').toLowerCase()))
                        .slice(0, 30)
                        .map(s => (
                          <li
                            key={s}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onMouseDown={() => {
                              setFormData(prev => ({ ...prev, recipientDistrict: s }));
                              setDistrictSearchTerm('');
                              setShowDistrictDropdown(false);
                            }}
                          >
                            {s}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="relative mt-1">
                  <Input
                    type="text"
                    value={districtSearchTerm !== '' ? districtSearchTerm : (formData.recipientDistrict || '')}
                    placeholder="Type to search district..."
                    onChange={(e) => {
                      setDistrictSearchTerm(e.target.value);
                      setShowDistrictDropdown(true);
                      if (e.target.value === '') setFormData(prev => ({ ...prev, recipientDistrict: '' }));
                    }}
                    onFocus={() => setShowDistrictDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDistrictDropdown(false), 150)}
                  />
                  {showDistrictDropdown && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                      {sriLankaDistricts
                        .filter(s => s.toLowerCase().includes((districtSearchTerm || formData.recipientDistrict || '').toLowerCase()))
                        .map(s => (
                          <li
                            key={s}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onMouseDown={() => {
                              setFormData(prev => ({ ...prev, recipientDistrict: s }));
                              setDistrictSearchTerm('');
                              setShowDistrictDropdown(false);
                            }}
                          >
                            {s}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2">Number of Pieces *</Label>
              <Input
                type="number"
                min="1"
                value={formData.numberOfPieces}
                readOnly
                className="mt-1 bg-gray-50 cursor-not-allowed"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-calculated from total product quantity ({totalProductQuantity})
              </p>
            </div>

            {/* Package Details */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <h3 className="font-medium text-gray-900 mb-3">Package Details</h3>
            </div>

            <div>
              <Label className="mb-2">Weight (kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.weight ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: parseOptionalNumberInput(e.target.value) }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-2">Length (cm)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.length ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, length: parseOptionalNumberInput(e.target.value) }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-2">Width (cm)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.width ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, width: parseOptionalNumberInput(e.target.value) }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-2">Height (cm)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.height ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, height: parseOptionalNumberInput(e.target.value) }))}
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label className="mb-2">Description</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className={theme.field}
                placeholder="Package contents description (optional)"
              />
            </div>

            <div className="col-span-2">
              <Label className="mb-2">Note</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className={theme.field}
                placeholder="Add a note (optional)"
              />
            </div>

            <div>
              <Label className="mb-2">Declared Value (LKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.declaredValue ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, declaredValue: parseOptionalNumberInput(e.target.value) }))}
                className="mt-1"
              />
            </div>

            {/* Charges */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <h3 className="font-medium text-gray-900 mb-1">Charges</h3>
              <p className="text-xs text-gray-500 mb-3">
                "Shipping to Customer" appears on the invoice. "Actual Shipping Cost" is what you pay the courier — used only for P&amp;L.
              </p>
            </div>

            <div>
              <Label className="mb-1">Shipping Charged to Customer (LKR) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.shippingCharge}
                onChange={(e) => setFormData(prev => ({ ...prev, shippingCharge: parseNumberInput(e.target.value) }))}
                className="mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Flat rate shown on the customer invoice / COD amount</p>
            </div>

            <div>
              <Label className="mb-1">Actual Shipping Cost (LKR)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={actualShippingCost}
                onChange={(e) => setActualShippingCost(parseNumberInput(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">What you actually pay the courier — for P&amp;L only</p>
            </div>

            <div>
              <Label className="mb-2">Insurance Charge (LKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.insuranceCharge}
                onChange={(e) => setFormData(prev => ({ ...prev, insuranceCharge: parseNumberInput(e.target.value) }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-2">Additional Charges to Customer (LKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.additionalCharges}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalCharges: parseNumberInput(e.target.value) }))}
                className="mt-1"
              />
            </div>

            {/* Discount on Product Total */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <h3 className="font-medium text-gray-900 mb-3">Discount (on product total)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">Discount Type</Label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'FIXED' | 'PERCENTAGE')}
                    className={theme.field}
                  >
                    <option value="FIXED">Fixed Amount (LKR)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-2">{discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount Amount (LKR)'}</Label>
                  <Input
                    type="number"
                    step={discountType === 'PERCENTAGE' ? '0.1' : '0.01'}
                    min={0}
                    max={discountType === 'PERCENTAGE' ? 100 : undefined}
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(parseNumberInput(e.target.value))}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
              </div>
              {discountValue > 0 && (
                <p className="text-xs text-green-700 mt-2">
                  Discount applied: LKR {(discountType === 'PERCENTAGE'
                    ? selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0) * discountValue / 100
                    : discountValue
                  ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className={`w-5 h-5 ${theme.text}`} />
                Payment Method
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Select how the customer will pay for these products
              </p>
            </div>

            <div className="col-span-2">
              <div className="grid grid-cols-3 gap-4">
                {(['bank', 'online', 'cod', 'koko', 'mintpay', 'payzy'] as const).map((method) => {
                  const labels: Record<string, { title: string; sub: string }> = {
                    bank: { title: 'Bank Transfer', sub: 'Already paid' },
                    online: { title: 'Online Payment', sub: 'Already paid' },
                    cod: { title: 'Cash on Delivery', sub: 'Collect on delivery' },
                    koko: { title: 'Koko', sub: 'Installment plan' },
                    mintpay: { title: 'MintPay', sub: 'Installment plan' },
                    payzy: { title: 'Payzy', sub: 'Installment plan' },
                  };
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method);
                        setPaymentConfirmed(false);
                        setPaymentConfirmedAmount(0);
                        setPaymentDescription('');
                      }}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        isSelected
                          ? `${theme.border} ${theme.bgLight} ${theme.textDark} shadow-md`
                          : 'border-gray-300 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-base">{labels[method].title}</div>
                      <div className="text-xs mt-1 text-gray-600">{labels[method].sub}</div>
                      {method === 'cod' ? (
                        <div className={`text-xs font-medium ${theme.text}`}>
                          COD: LKR {invoiceTotal.toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">COD Amount: LKR 0</div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className={`mt-3 p-4 border rounded-lg ${
                paymentMethod === 'cod'
                  ? `${theme.bgLight} ${theme.border.replace('border-', 'border-').replace('-500', '-200')}`
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className={`w-5 h-5 mt-0.5 ${paymentMethod === 'cod' ? theme.text : 'text-blue-600'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${paymentMethod === 'cod' ? `${theme.textDark.replace('700', '900')}` : 'text-blue-900'}`}>
                      {paymentMethod === 'cod'
                        ? 'Cash on Delivery Selected'
                        : paymentMethod === 'koko' || paymentMethod === 'mintpay' || paymentMethod === 'payzy'
                        ? `${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Installment Plan Selected`
                        : 'Pre-paid Order Selected'}
                    </p>
                    <p className={`text-xs mt-1 ${paymentMethod === 'cod' ? theme.textDark : 'text-blue-700'}`}>
                      {paymentMethod === 'cod'
                        ? `Courier will collect LKR ${invoiceTotal.toLocaleString()} from customer on delivery. Shipping charged to customer: LKR ${toSafeNumber(formData.shippingCharge).toLocaleString()}`
                        : paymentMethod === 'koko' || paymentMethod === 'mintpay' || paymentMethod === 'payzy'
                        ? `Customer will pay via ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} installment plan. Courier only delivers the product. COD amount will be LKR 0`
                        : 'Customer has already paid online/via bank. Courier will only deliver the product. COD amount will be LKR 0'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* {console.log(theme)} */}

            {/* Shipment Summary + P&L (always visible when products are selected) */}
            {selectedProducts.length > 0   &&(
              <div className={`col-span-2 p-4 bg-gradient-to-r ${theme.bgLight} to-${variant === 'blue' ? 'blue' : 'orange'}-100 border-2 ${theme.border.replace('-500', '-300')} rounded-lg shadow-sm`}>
                <h4 className="font-semibold text-gray-900 mb-3 text-base">Shipment Summary</h4>

                {/* Product names recap (shown at billing) */}
                <div className="mb-3 p-2 bg-white rounded text-sm">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Products</span>
                  <div className="flex flex-col gap-0.5">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="flex justify-between text-gray-800">
                        <span className="font-medium">{product.name} <span className="text-gray-400">× {product.quantity}</span></span>
                        <span className="text-gray-600">LKR {(product.price * product.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invoice breakdown */}
                <div className="space-y-1 text-sm mb-3">
                  <div className="flex justify-between p-2 bg-white rounded">
                    <span className="text-gray-600">Product Subtotal:</span>
                    <span className="font-medium">LKR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between p-2 bg-white rounded">
                      <span className="text-gray-600">
                        Discount ({discountType === 'PERCENTAGE' ? `${discountValue}%` : 'Fixed'}):
                      </span>
                      <span className="font-medium text-red-600">− LKR {discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-2 bg-white rounded">
                    <span className="text-gray-600">Product Value (after discount):</span>
                    <span className="font-semibold">LKR {productValueAfterDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white rounded">
                    <span className="text-gray-600">Shipping to Customer:</span>
                    <span className="font-medium">LKR {toSafeNumber(formData.shippingCharge).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {toSafeNumber(formData.additionalCharges) > 0 && (
                    <div className="flex justify-between p-2 bg-white rounded">
                      <span className="text-gray-600">Additional Charges:</span>
                      <span className="font-medium">LKR {toSafeNumber(formData.additionalCharges).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className={`flex justify-between p-3 bg-white rounded-lg shadow border-2 ${theme.border.replace('-500', '-300')}`}>
                    <span className="font-bold text-gray-900">
                      {paymentMethod === 'cod' ? 'COD Amount to Collect:' : 'Invoice Total:'}
                    </span>
                    <span className={`font-bold ${theme.text} text-xl`}>
                      LKR {invoiceTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* P&L breakdown — leftover (gross) profit, always shown when COGS known */}
                {costOfGoods > 0 && (
                  <div className="border-t border-gray-200 pt-3 mt-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">P&amp;L Estimate</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">Revenue (Invoice Total):</span>
                        <span className="font-medium text-gray-900">LKR {invoiceTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">
                          (−) Actual Shipping Cost:
                          {actualShippingCost !== toSafeNumber(formData.shippingCharge) && (
                            <span className="text-xs text-gray-400 ml-1">(differs from invoice rate)</span>
                          )}
                        </span>
                        <span className="font-medium text-red-600">− LKR {actualCourierCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">(−) Cost of Goods:</span>
                        <span className="font-medium text-red-600">− LKR {costOfGoods.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className={`flex justify-between p-3 rounded-lg ${grossProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <span className={`font-bold ${grossProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>Leftover Profit:</span>
                        <span className={`font-bold text-lg ${grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          LKR {grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Reference for COD / BNPL methods */}
            {(paymentMethod === 'cod' || paymentMethod === 'koko' || paymentMethod === 'mintpay' || paymentMethod === 'payzy') && (
              <div className="col-span-2">
                <Label className="mb-1">Payment Reference / Notes (optional)</Label>
                <input
                  type="text"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className={theme.field}
                  placeholder={paymentMethod === 'cod' ? 'e.g. order note, tracking ref...' : `e.g. ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} order ID, reference...`}
                />
              </div>
            )}

            {/* Payment Confirmation for Bank Transfer / Online Payment — admin only when staff permissions limited */}
            {(paymentMethod === 'bank' || paymentMethod === 'online') && staffPermissionsLimited && (
              <div className="col-span-2 border border-amber-200 rounded-lg p-3 bg-amber-50 text-sm text-amber-800">
                Payment confirmation is handled by an admin. This order will be saved with pending payment status.
              </div>
            )}
            {(paymentMethod === 'bank' || paymentMethod === 'online') && !staffPermissionsLimited && (
              <div className="col-span-2 border-2 border-blue-300 rounded-lg p-4 bg-blue-50 space-y-4">
                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Payment Confirmation – {paymentMethod === 'bank' ? 'Bank Transfer' : 'Online Payment'}
                </h4>

                <div>
                  <p className="text-sm font-medium text-blue-800 mb-2">Was the payment fully successful?</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentConfirmed(true);
                        if (paymentConfirmedAmount === 0) {
                          setPaymentConfirmedAmount(invoiceTotal);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                        paymentConfirmed
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-green-400'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Yes, Payment Confirmed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentConfirmed(false);
                        setPaymentConfirmedAmount(0);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                        !paymentConfirmed
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-yellow-400'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      Pending / Not Yet Confirmed
                    </button>
                  </div>
                </div>

                {paymentConfirmed && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-blue-800 mb-1">Amount Paid (LKR) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentConfirmedAmount || ''}
                        onChange={(e) => setPaymentConfirmedAmount(parseFloat(e.target.value) || 0)}
                        className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 bg-white"
                        placeholder={`e.g. ${invoiceTotal}`}
                        required={paymentConfirmed}
                      />
                      <p className="text-xs text-blue-600 mt-1">
                        Order total: LKR {invoiceTotal.toLocaleString()}
                        {paymentConfirmedAmount > 0 && paymentConfirmedAmount < invoiceTotal && (
                          <span className="text-yellow-600 font-medium ml-1">
                            (Partial – LKR {(invoiceTotal - paymentConfirmedAmount).toLocaleString()} outstanding)
                          </span>
                        )}
                        {paymentConfirmedAmount >= invoiceTotal && invoiceTotal > 0 && (
                          <span className="text-green-600 font-medium ml-1">(✓ Fully paid)</span>
                        )}
                      </p>
                    </div>

                    <div>
                      <Label className="text-blue-800 mb-1">Payment Reference / Description</Label>
                      <Input
                        type="text"
                        value={paymentDescription}
                        onChange={(e) => setPaymentDescription(e.target.value)}
                        className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 bg-white"
                        placeholder="e.g. Bank ref #12345, screenshot verified"
                      />
                    </div>
                  </div>
                )}

                {!paymentConfirmed && (
                  <div>
                    <Label className="text-blue-800 mb-1">Payment Notes (optional)</Label>
                    <Input
                      type="text"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                      className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 bg-white"
                      placeholder="e.g. Awaiting bank transfer confirmation"
                    />
                    <p className="text-xs text-yellow-700 mt-1">
                      ⚠️ Sale will be marked as Pending until payment is confirmed.
                    </p>
                  </div>
                )}

                {paymentConfirmed && selectedProducts.length > 0 && (
                  <div className="border border-blue-200 rounded-lg p-3 bg-white text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-700">Order Total:</span>
                      <span className="font-semibold">LKR {invoiceTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-700">Amount Paid:</span>
                      <span className={`font-semibold ${paymentConfirmedAmount >= invoiceTotal ? 'text-green-600' : 'text-yellow-600'}`}>
                        LKR {paymentConfirmedAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-700">Actual Courier Cost (your cost):</span>
                      <span className="font-semibold text-gray-900">LKR {actualCourierCost.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          </div>

          <div className="glass-modal-footer flex justify-end gap-3">
            <Button type="button" onClick={onClose} variant="outline" disabled={isSubmitting || customerLoading}>
              Cancel
            </Button>
            <Button type="submit" className={cn(theme.bg, theme.hover, 'text-white flex items-center gap-2')} disabled={isSubmitting || customerLoading}>
              {isSubmitting || customerLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Shipment' : 'Create Shipment'
              )}
            </Button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
};

export default CourierShipmentModal;
