/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Package, User, Hash, FileText, ScanLine, Truck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import type { CreateProductReturnData } from '../../../hooks/useProductReturn';
import { useProductCategory } from '../../../hooks/useProductCategory';
import { useProduct } from '../../../hooks/useProduct';
import { useLocation } from '../../../hooks/useLocation';
import useSales from '../../../hooks/useSales';
import useFetch from '../../../hooks/useFetch';
import { formatCurrency } from '../../../utils/currency';
import useBarcode from '../../../hooks/useBarcode';
import BarcodeScannerModal from '../../common/BarcodeScannerModal';

interface CreateReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductReturnData) => Promise<void>;
  searchCustomers: (searchTerm: string, limit?: number) => Promise<any>;
  locationId?: string;
}

export default function CreateReturnModal({
  isOpen,
  onClose,
  onSubmit,
  searchCustomers,
  locationId
}: CreateReturnModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProductReturnData>({
    locationId: '',
    customerId: null,
    productId: '',
    sourceType: 'DIRECT',
    sourceId: null,
    returnCategory: 'CUSTOMER_RETURN',
    returnReason: '',
    quantity: 1,
    productValue: 0,
    refundAmount: null,
    notes: null,
    customerName: null,
    customerPhone: null,
    customerEmail: null,
    productSerialNumber: null,
    productBatchNumber: null,
    createdById: '' // Will be set by parent component
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customerPhoneSearch, setCustomerPhoneSearch] = useState('');
  const [searchedCustomer, setSearchedCustomer] = useState<{ id: string; name: string; phone: string; email?: string } | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);

  // Sale search states
  const [saleNumberSearch, setSaleNumberSearch] = useState('');
  const [searchedSale, setSearchedSale] = useState<{ id: string; saleNumber: string; total: number; items: any[] } | null>(null);
  const [isSearchingSale, setIsSearchingSale] = useState(false);
  const [saleNotFound, setSaleNotFound] = useState(false);
  const [selectedSaleProduct, setSelectedSaleProduct] = useState<any>(null);
  const [saleProduct, setSaleProduct] = useState<any[]>([]);
  const [isProductFromSale, setIsProductFromSale] = useState(false);

  // Courier tracking auto-fill states
  const [courierTrackingInput, setCourierTrackingInput] = useState('');
  const [isSearchingTracking, setIsSearchingTracking] = useState(false);
  const [trackingFound, setTrackingFound] = useState(false);
  const [trackingNotFound, setTrackingNotFound] = useState(false);
  const [showTrackingScanner, setShowTrackingScanner] = useState(false);

  const [branches, setBranches] = useState<{ id: string; name: string; locationCode: string }[]>([]);

  const { getAllCategories, categories, loading: categoriesLoading } = useProductCategory();
  const { getAllProducts, products: fetchedProducts, loading: productsLoading } = useProduct();
  const { getBranches, loading: branchesLoading } = useLocation();
  const { fetchData: searchSaleFetch } = useFetch('/sales/pos');
  const { fetchData: fetchCourierTracking } = useFetch();
  const { getSaleById } = useSales();
  const { scanProduct } = useBarcode();

  // Barcode scanner state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const handleBarcodeProductScan = async (value: string) => {
    const scanned = await scanProduct(value, false);
    if (!scanned) {
      toast.error(`No product found for barcode: ${value}`);
      return;
    }
    const product = fetchedProducts?.find(
      (p) => p.id === scanned.productId || p.productCode === scanned.productCode
    );
    if (product) {
      setShowBarcodeScanner(false);
      handleProductChange(product.id);
      if (scanned.unitPrice && scanned.unitPrice > 0) {
        setFormData((prev) => ({ ...prev, productValue: scanned.unitPrice }));
      }
      toast.success(`Product found: ${scanned.name}`);
    } else {
      toast.error(`"${scanned.name}" not found in product list`);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        locationId: locationId || '',
        customerId: null,
        productId: '',
        sourceType: 'DIRECT',
        sourceId: null,
        returnCategory: 'CUSTOMER_RETURN',
        returnReason: '',
        quantity: 1,
        productValue: 0,
        refundAmount: null,
        notes: null,
        customerName: null,
        customerPhone: null,
        customerEmail: null,
        productSerialNumber: null,
        productBatchNumber: null,
        createdById: '', // Will be set by parent component
        courierTrackingNumber: null,
      });
      setSelectedProduct('');
      setSelectedCategory('');
      setCustomerPhoneSearch('');
      setSearchedCustomer(null);
      setCustomerNotFound(false);
      setSaleNumberSearch('');
      setSearchedSale(null);
      setSaleNotFound(false);
      setSelectedSaleProduct(null);
      setCourierTrackingInput('');
      setTrackingFound(false);
      setTrackingNotFound(false);

      // Fetch all categories
      getAllCategories({ limit: 1000 });
      // Fetch all products
      getAllProducts({ limit: 1000 });
      // Fetch branches - handle multiple response shapes
      getBranches().then((res: any) => {
        if (!res) return;

        // Case 1: API returns an array directly in `data`
        if (res?.success && Array.isArray(res.data)) {
          setBranches(res.data.map((l: any) => ({ id: l.id, name: l.name, locationCode: l.locationCode || '' })));
          return;
        }

        // Case 2: API returns an object with `locations` array: { data: { locations: [...] } }
        const locationsArray = res?.data?.locations;
        if (Array.isArray(locationsArray)) {
          setBranches(locationsArray.map((l: any) => ({ id: l.id, name: l.name, locationCode: l.locationCode || '' })));
          return;
        }

        // Case 3: API returns data at top-level (legacy) - e.g., { locations: [...] }
        if (Array.isArray(res?.locations)) {
          setBranches(res.locations.map((l: any) => ({ id: l.id, name: l.name, locationCode: l.locationCode || '' })));
          return;
        }
      });
    }
  }, [isOpen]);

  const handleSearchCustomer = async () => {
    if (!customerPhoneSearch.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    // Process phone number: remove +94 prefix if present
    let processedPhone = customerPhoneSearch.trim();
    if (processedPhone.startsWith('+94')) {
      processedPhone = processedPhone.substring(3); // Remove +94
    }

    setIsSearchingCustomer(true);
    try {
      const response = await searchCustomers(processedPhone, 5);
      const customers = response?.data || [];

      if (customers.length > 0) {
        const customer = customers[0]; // Take the first match
        setSearchedCustomer(customer);
        setCustomerNotFound(false);
        setFormData(prev => ({
          ...prev,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email || null
        }));
        toast.success(`Customer found: ${customer.name}`);
      } else {
        setSearchedCustomer(null);
        setCustomerNotFound(true);
        setFormData(prev => ({
          ...prev,
          customerId: null,
          customerName: null,
          customerPhone: processedPhone,
          customerEmail: null
        }));
      }
    } catch (error) {
      console.error('Error searching customer:', error);
      toast.error('Failed to search customer');
      setCustomerNotFound(true);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleCreateNewCustomer = () => {
    setSearchedCustomer(null);
    setCustomerNotFound(false);
    setFormData(prev => ({
      ...prev,
      customerId: null,
      customerName: '',
      customerPhone: customerPhoneSearch.trim(),
      customerEmail: ''
    }));
  };

  const handleSearchSale = async () => {
    if (!saleNumberSearch.trim()) {
      toast.error('Please enter a sale number');
      return;
    }

    setIsSearchingSale(true);
    try {
      // Call API to search for sale by sale number using the search parameter
      const result = await searchSaleFetch({
        method: 'GET',
        data: { search: saleNumberSearch.trim(), limit: 10 },
      });
      
      if (result && result.success && result.data && Array.isArray(result.data.data) && result.data.data.length > 0) {
        const sale = result.data.data[0];
        const saleProduct = result.data.saleProduct || [];
        
        // Store sale product data
        setSaleProduct(saleProduct);
        
        // Auto-fill customer information
        if (sale.customer) {
          setSearchedCustomer({
            id: sale.customer.id,
            name: sale.customer.name,
            phone: sale.customer.phone,
            email: sale.customer.email
          });
          setCustomerNotFound(false);
          setFormData(prev => ({
            ...prev,
            customerId: sale.customer.id,
            customerName: sale.customer.name,
            customerPhone: sale.customer.phone,
            customerEmail: sale.customer.email || null
          }));
        }
        
        // Auto-fill location/branch information
        if (sale.location) {
          setFormData(prev => ({
            ...prev,
            locationId: sale.location.id
          }));
        }
        
        // Set sale info
        setSearchedSale({
          id: sale.id,
          saleNumber: sale.saleNumber,
          total: parseFloat(sale.totalAmount),
          items: sale.saleItems || []
        });
        setSaleNotFound(false);
        setFormData(prev => ({
          ...prev,
          sourceId: sale.id,
          sourceType: 'SALE'
        }));

        // Handle product selection
        if (sale.saleItems && sale.saleItems.length > 0) {
          if (sale.saleItems.length === 1) {
            // Single product, auto-fill
            const item = sale.saleItems[0];
            const product = saleProduct.find(p => p.id === item.productId);
            handleSaleProductSelect(item, product);
            setIsProductFromSale(true);
          } else {
            // Multiple products, let user select
            setSelectedSaleProduct(null);
            setIsProductFromSale(false);
          }
        }

        toast.success(`Sale found and details auto-filled: ${sale.saleNumber}`);
      } else {
        setSearchedSale(null);
        setSaleNotFound(true);
        setFormData(prev => ({
          ...prev,
          sourceId: null
        }));
        toast.error('Sale not found');
      }
    } catch (error) {
      console.error('Error searching sale:', error);
      toast.error('Failed to search sale');
      setSaleNotFound(true);
      setFormData(prev => ({
        ...prev,
        sourceId: null
      }));
    } finally {
      setIsSearchingSale(false);
    }
  };

  const handleSaleProductSelect = (saleItem: any, product?: any) => {
    setSelectedSaleProduct(saleItem);
    setIsProductFromSale(true);
    
    if (saleItem.productId) {
      setSelectedProduct(saleItem.productId);
      if (product) {
        setSelectedCategory(product.categoryId || '');
      }
      setFormData(prev => ({
        ...prev,
        productId: saleItem.productId,
        productName: saleItem.productName || product?.name || '',
        productCategoryId: product?.categoryId || '',
        productValue: parseFloat(saleItem.unit_price) || (parseFloat(saleItem.subtotal) / saleItem.quantity) || 0,
        quantity: saleItem.quantity || 1,
        productSerialNumber: saleItem.serialNumber || null,
        productBatchNumber: saleItem.batchNumber || null
      }));
    }
  };

  const handleTrackingLookup = async (trackingOverride?: string) => {
    const tracking = (trackingOverride ?? courierTrackingInput).trim();
    if (!tracking) {
      toast.error('Please enter a tracking number');
      return;
    }

    setIsSearchingTracking(true);
    setTrackingFound(false);
    setTrackingNotFound(false);

    try {
      const result = await fetchCourierTracking({
        method: 'GET',
        silent: true,
        endpoint: `/courier/shipments/tracking/${tracking}`,
        showToastOnError: false,
      });

      if (result && result.success && result.data) {
        const shipment = result.data as any;
        const recipientName: string = shipment.recipientName || shipment.recipient_name || '';
        const recipientPhone: string = shipment.recipientPhone || shipment.recipient_phone || '';
        const recipientEmail: string | null = shipment.recipientEmail || shipment.recipient_email || null;
        const saleId: string | null = shipment.saleId || shipment.sale_id || null;
        const pickupLocationId: string | null = shipment.pickupLocationId || shipment.pickup_location_id || null;
        const declaredValue = parseFloat(shipment.declaredValue ?? shipment.declared_value ?? '0') || 0;

        setFormData(prev => ({
          ...prev,
          ...(recipientName && { customerName: recipientName }),
          ...(recipientPhone && { customerPhone: recipientPhone }),
          ...(recipientEmail && { customerEmail: recipientEmail }),
          ...(saleId && { sourceType: 'SALE' as const, sourceId: saleId }),
          ...(!locationId && pickupLocationId && { locationId: pickupLocationId }),
          ...(declaredValue > 0 && { productValue: declaredValue }),
          courierTrackingNumber: tracking,
        }));

        if (recipientPhone) setCustomerPhoneSearch(recipientPhone);
        if (saleId) { setSaleNumberSearch(''); setSearchedSale(null); setSaleNotFound(false); }
        setSearchedCustomer(null);
        setCustomerNotFound(true); // reveal customer fields pre-filled from tracking
        setTrackingFound(true);
        toast.success('Customer info auto-filled from tracking number');
      } else {
        setTrackingNotFound(true);
        toast.error('Tracking number not found');
      }
    } catch {
      setTrackingNotFound(true);
      toast.error('Failed to look up tracking number');
    } finally {
      setIsSearchingTracking(false);
    }
  };

  const handleBarcodeTrackingScan = async (value: string) => {
    setCourierTrackingInput(value);
    setShowTrackingScanner(false);
    await handleTrackingLookup(value);
  };

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const product = fetchedProducts?.find(p => p.id === productId);
    if (product) {
      setSelectedCategory(product.categoryId || '');
      setFormData(prev => ({
        ...prev,
        productId: product.id
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId) {
      toast.error('Please select a product');
      return;
    }

    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (formData.productValue <= 0) {
      toast.error('Product value must be greater than 0');
      return;
    }

    if (formData.sourceType === 'SALE' && !formData.sourceId) {
      toast.error('Please search and select a sale for this return');
      return;
    }

    // Customer validation: conditional based on source type and return category
    const requiresCustomerInfo = () => {
      // Always required for SALE and WARRANTY_CLAIM
      if (formData.sourceType === 'SALE' || formData.sourceType === 'WARRANTY_CLAIM') {
        return true;
      }
      
      // For DIRECT returns, depends on category
      if (formData.sourceType === 'DIRECT') {
        return formData.returnCategory === 'CUSTOMER_RETURN' || 
               formData.returnCategory === 'WARRANTY_RETURN';
      }
      
      // For JOB_SHEET, customer info typically required (service customer)
      if (formData.sourceType === 'JOB_SHEET') {
        return true;
      }
      
      // Not required for STOCK_CHECK, GOODS_RECEIPT
      return false;
    };

    if (!formData.locationId) {
      toast.error('Please select a branch to return to');
      return;
    }

    if (requiresCustomerInfo()) {
      if (!formData.customerName?.trim()) {
        toast.error('Customer name is required for this return type');
        return;
      }

      if (!formData.customerPhone?.trim()) {
        toast.error('Customer phone is required for this return type');
        return;
      }
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      // onClose();
    } catch (error) {
      console.error('Error creating return:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-5xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>Create Product Return</DialogTitle>
        </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Courier Tracking Auto-Fill */}
            <div className="space-y-3 p-4 bg-sky-50 border border-sky-200 rounded-lg">
              <h3 className="text-sm font-semibold text-sky-900 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Auto-Fill from Courier Tracking
                <span className="text-xs font-normal text-sky-600">(Optional)</span>
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Courier Tracking Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={courierTrackingInput}
                    onChange={(e) => {
                      setCourierTrackingInput(e.target.value);
                      setFormData(prev => ({ ...prev, courierTrackingNumber: e.target.value || null }));
                      setTrackingFound(false);
                      setTrackingNotFound(false);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTrackingLookup(); } }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                    placeholder="Enter or scan tracking number"
                  />
                  <button
                    type="button"
                    onClick={() => handleTrackingLookup()}
                    disabled={isSearchingTracking}
                    className="px-4 py-2 bg-sky-600 text-white text-sm rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearchingTracking ? 'Looking up...' : 'Lookup'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTrackingScanner(true)}
                    title="Scan tracking number barcode"
                    className="px-3 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
                  >
                    <ScanLine className="w-4 h-4" />
                  </button>
                </div>
                {trackingFound && (
                  <p className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1">
                    ✓ Customer info auto-filled from tracking number
                  </p>
                )}
                {trackingNotFound && (
                  <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-1">
                    Tracking number not found: {courierTrackingInput}
                  </p>
                )}
              </div>
            </div>

              {/* Return Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Return Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch selector - only shown when no locationId is pre-set */}
                {!locationId && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Return to Branch *
                    </label>
                    <select
                      value={formData.locationId}
                      onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                      disabled={branchesLoading}
                    >
                      <option value="">
                        {branchesLoading ? 'Loading branches...' : '-- Select Branch --'}
                      </option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}{branch.locationCode ? ` (${branch.locationCode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Type *
                  </label>
                  <select
                    value={formData.sourceType}
                    onChange={(e) => {
                      const newSourceType = e.target.value as any;
                      setFormData(prev => ({ 
                        ...prev, 
                        sourceType: newSourceType, 
                        sourceId: null,
                        // Reset auto-filled data when changing source type
                        ...(newSourceType !== 'SALE' && {
                          customerId: null,
                          customerName: null,
                          customerPhone: null,
                          customerEmail: null,
                          productId: '',
                          productValue: 0
                        })
                      }));
                      setSearchedSale(null);
                      setSaleNotFound(false);
                      setSaleNumberSearch('');
                      setIsProductFromSale(false);
                      if (newSourceType !== 'SALE') {
                        setSearchedCustomer(null);
                        setCustomerNotFound(false);
                        setSelectedProduct('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="SALE">Sale</option>
                    <option value="WARRANTY_CLAIM">Warranty Claim</option>
                    <option value="JOB_SHEET">Job Sheet</option>
                    <option value="STOCK_CHECK">Stock Check</option>
                    <option value="DIRECT">Direct</option>
                    <option value="GOODS_RECEIPT">Goods Receipt</option>
                  </select>
                </div>

                {/* Sale Search - only show if sourceType is SALE */}
                {formData.sourceType === 'SALE' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sale Number *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={saleNumberSearch}
                        onChange={(e) => setSaleNumberSearch(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="Enter sale number (e.g., SAL-2024-000001)"
                      />
                      <button
                        type="button"
                        onClick={handleSearchSale}
                        disabled={isSearchingSale}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSearchingSale ? 'Searching...' : 'Search'}
                      </button>
                    </div>

                    {searchedSale && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 text-green-800">
                          <Hash className="w-4 h-4" />
                          <span className="font-medium">Sale Found:</span>
                        </div>
                        <div className="mt-1 text-sm text-green-700">
                          <p><strong>Sale Number:</strong> {searchedSale.saleNumber}</p>
                          <p><strong>Total:</strong> {formatCurrency(searchedSale.total)}</p>
                        </div>
                      </div>
                    )}

                    {searchedSale && searchedSale.items && searchedSale.items.length > 1 && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Product from Sale *
                        </label>
                        <select
                          value={selectedSaleProduct?.id || ''}
                          onChange={(e) => {
                            const item = searchedSale.items.find(item => item.id === e.target.value);
                            if (item) {
                              const product = saleProduct.find(p => p.id === item.productId);
                              handleSaleProductSelect(item, product);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          <option value="">Select a product</option>
                          {searchedSale.items.map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.productName} - Qty: {item.quantity} - Price: {formatCurrency(parseFloat(item.unit_price))}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {searchedSale && selectedSaleProduct && (
                      <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="flex items-center gap-2 text-orange-800">
                          <Package className="w-4 h-4" />
                          <span className="font-medium">Selected Product:</span>
                        </div>
                        <div className="mt-1 text-sm text-orange-700">
                          <p><strong>Product:</strong> {selectedSaleProduct.productName}</p>
                          <p><strong>Quantity:</strong> {selectedSaleProduct.quantity}</p>
                          <p><strong>Unit Price:</strong> {formatCurrency(parseFloat(selectedSaleProduct.unit_price))}</p>
                          {selectedSaleProduct.productCode && <p><strong>Serial Number:</strong> {selectedSaleProduct.productCode}</p>}
                          {selectedSaleProduct.batchNumber && <p><strong>Batch Number:</strong> {selectedSaleProduct.batchNumber}</p>}
                        </div>
                      </div>
                    )}

                    {saleNotFound && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center gap-2 text-red-800">
                          <Hash className="w-4 h-4" />
                          <span className="font-medium">Sale not found</span>
                        </div>
                        <p className="mt-1 text-sm text-red-700">
                          No sale found with number: {saleNumberSearch}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Category *
                  </label>
                  <select
                    value={formData.returnCategory}
                    onChange={(e) => {
                      const newCategory = e.target.value as any;
                      setFormData(prev => ({ 
                        ...prev, 
                        returnCategory: newCategory,
                        // Clear customer data only if locationId is set and category is not CUSTOMER_RETURN
                        ...(formData.locationId && newCategory !== 'CUSTOMER_RETURN' && {
                          customerId: null,
                          customerName: null,
                          customerPhone: null,
                          customerEmail: null
                        })
                      }));
                      // Reset customer search states only if locationId is set and category is not CUSTOMER_RETURN
                      if (formData.locationId && newCategory !== 'CUSTOMER_RETURN') {
                        setCustomerPhoneSearch('');
                        setSearchedCustomer(null);
                        setCustomerNotFound(false);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="CUSTOMER_RETURN">Customer Return</option>
                    <option value="WARRANTY_RETURN">Warranty Return</option>
                    <option value="DEFECTIVE">Defective</option>
                    <option value="EXCESS_STOCK">Excess Stock</option>
                    <option value="QUALITY_FAILURE">Quality Failure</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="INTERNAL_TRANSFER">Internal Transfer</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Reason (Optional)
                  </label>
                  <textarea
                    value={formData.returnReason}
                    onChange={(e) => setFormData(prev => ({ ...prev, returnReason: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Describe the reason for the return"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Additional notes"
                  />
                </div>
              </div>
            </div>
            {/* Customer Information - Show based on source type and return category */}
            {(formData.sourceType === 'SALE' || 
              formData.sourceType === 'WARRANTY_CLAIM' ||
              formData.sourceType === 'JOB_SHEET' ||
              (formData.sourceType === 'DIRECT' && 
               (formData.returnCategory === 'CUSTOMER_RETURN' || formData.returnCategory === 'WARRANTY_RETURN')) ||
              searchedCustomer || 
              customerNotFound) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                  {(formData.sourceType === 'DIRECT' && 
                    (formData.returnCategory === 'DAMAGED' || 
                     formData.returnCategory === 'EXCESS_STOCK' || 
                     formData.returnCategory === 'DEFECTIVE' ||
                     formData.returnCategory === 'QUALITY_FAILURE' ||
                     formData.returnCategory === 'INTERNAL_TRANSFER')) && (
                    <span className="text-sm font-normal text-gray-500 ml-2">(Optional - Not Required)</span>
                  )}
                </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Phone Number {formData.locationId ? '*' : '(Optional)'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={customerPhoneSearch}
                      onChange={(e) => setCustomerPhoneSearch(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="Enter phone number"
                    />
                    <button
                      type="button"
                      onClick={handleSearchCustomer}
                      disabled={isSearchingCustomer}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSearchingCustomer ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {searchedCustomer && (
                  <div className="md:col-span-2 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2 text-green-800">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Customer Found:</span>
                    </div>
                    <div className="mt-2 text-sm text-green-700">
                      <p><strong>Name:</strong> {searchedCustomer.name}</p>
                      <p><strong>Phone:</strong> {searchedCustomer.phone}</p>
                      {searchedCustomer.email && <p><strong>Email:</strong> {searchedCustomer.email}</p>}
                    </div>
                  </div>
                )}

                {customerNotFound && (
                  <div className="md:col-span-2 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Customer not found</span>
                    </div>
                    <p className="mt-2 text-sm text-yellow-700">
                      No customer found with phone number: {customerPhoneSearch}
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateNewCustomer}
                      className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                    >
                      Create New Customer
                    </button>
                  </div>
                )}

                {(searchedCustomer || customerNotFound) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name {formData.locationId ? '*' : '(Optional)'}
                      </label>
                      <input
                        type="text"
                        value={formData.customerName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={formData.customerEmail || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="Enter email address"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            )}

            {/* Product Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Category (Optional)
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border overflow-y-auto border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 max-h-40"
                    disabled={categoriesLoading || isProductFromSale}
                  >
                    <option value="">
                      {categoriesLoading ? 'Loading categories...' : 'Select Category'}
                    </option>
                    {categories?.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedProduct}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                      disabled={productsLoading || isProductFromSale}
                    >
                      <option value="">
                        {productsLoading ? 'Loading products...' : 'Select Product'}
                      </option>
                      {(fetchedProducts || []).filter(product =>
                        !selectedCategory || product.categoryId === selectedCategory
                      ).map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.productCode})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowBarcodeScanner(true)}
                      disabled={isProductFromSale}
                      title="Scan barcode to find product"
                      className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ScanLine className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Value (LKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.productValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, productValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="0.00"
                    disabled={isProductFromSale}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Amount (LKR) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.refundAmount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, refundAmount: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="0.00"
                  />
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.productSerialNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, productSerialNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Enter serial number"
                    disabled={isProductFromSale}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.productBatchNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, productBatchNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Enter batch number"
                    disabled={isProductFromSale}
                  />
                </div> */}
              </div>
            </div>

            

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
                {loading ? 'Creating...' : 'Create Return'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>

    {/* Barcode Scanner Modal for product lookup */}
    <BarcodeScannerModal
      open={showBarcodeScanner}
      onClose={() => setShowBarcodeScanner(false)}
      onScan={handleBarcodeProductScan}
      title="Scan Product Barcode"
    />

    {/* Barcode Scanner Modal for courier tracking number */}
    <BarcodeScannerModal
      open={showTrackingScanner}
      onClose={() => setShowTrackingScanner(false)}
      onScan={handleBarcodeTrackingScan}
      title="Scan Courier Tracking Number"
    />
    </>
  );
}