/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  type CourierService,
  type CourierShipment,
  DeliveryMethod,
  CourierServiceProvider
} from '../../../hooks/useCourier';
import useCourier from '../../../hooks/useCourier';
import useBusinessProfile from '../../../hooks/useBusinessProfile';
import { useProduct } from '../../../hooks/useProduct';
import useCustomer, { type Customer as CustomerType } from '../../../hooks/useCustomer';
import { sriLankaCities, sriLankaDistricts } from '../../../data/sriLankaCities';
import toast from 'react-hot-toast';

const CourierShipmentModal = ({
  onClose,
  onSave,
  courierServices
}: {
  onClose: () => void;
  onSave: (data: Partial<CourierShipment>) => Promise<void>;
  courierServices: CourierService[];
}) => {
  const { getAllProducts } = useProduct();
  const { businessData, loadBusinessProfile } = useBusinessProfile();
  const { getCustomers, createCustomer } = useCustomer();
  const { getCourierCities } = useCourier();

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
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'online' | 'cod' | 'koko' | 'mintpay' | 'payzy'>('cod');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Customer search state
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [createNewCustomerMode, setCreateNewCustomerMode] = useState(false);
  const [saveAsCustomer, setSaveAsCustomer] = useState(false);
  const recipientSectionRef = React.useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<Partial<CourierShipment>>({
    courierServiceId: '',
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
    deliveryInstructions: ''
  });

  // Load business profile on mount
  React.useEffect(() => {
    loadBusinessProfile();
  }, [loadBusinessProfile]);

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
          const list = (response.data as any).customers || (response.data as any).data || response.data || [];
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
    setCreateNewCustomerMode(false);
    setSaveAsCustomer(false);
    setFormData(prev => ({
      ...prev,
      recipientName: customer.name,
      recipientPhone: customer.phone,
      recipientEmail: customer.email || '',
      recipientAddress: customer.address || '',
      recipientCity: customer.city || '',
    }));
    setTimeout(() => recipientSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // Auto-fill sender address when business data is loaded
  React.useEffect(() => {
    if (businessData) {
      setFormData(prev => ({
        ...prev,
        senderName: businessData.name || prev.senderName,
        senderPhone: businessData.telephone || prev.senderPhone,
        senderAddress: businessData.address || prev.senderAddress,
        senderCity: businessData.city || prev.senderCity,
        senderDistrict: businessData.district || prev.senderDistrict,
        senderPostalCode: businessData.postalCode || prev.senderPostalCode
      }));
    }
  }, [businessData]);

  // Auto-select first active courier service
  React.useEffect(() => {
    if (courierServices.length > 0 && !formData.courierServiceId) {
      const firstActiveService = courierServices.find(s => s.isActive);
      if (firstActiveService) {
        setFormData(prev => ({
          ...prev,
          courierServiceId: firstActiveService.id
        }));
      }
    }
  }, [courierServices, formData.courierServiceId]);

  // Auto-calculate charges when products are selected
  React.useEffect(() => {
    if (selectedProducts.length > 0) {
      const totalValue = selectedProducts.reduce((sum, p) => sum + ((p.unitPrice ?? p.price ?? 0) * p.quantity), 0);
      const baseCharge = 350;
      const weightCharge = formData.weight ? formData.weight * 50 : 0;
      
      setFormData(prev => ({
        ...prev,
        declaredValue: totalValue,
        shippingCharge: baseCharge + weightCharge,
        codAmount: paymentMethod === 'cod' ? totalValue : undefined,
        codEnabled: paymentMethod === 'cod'
      }));
    }
  }, [selectedProducts, formData.weight, paymentMethod]);

  // Fetch Curfox city list when a Curfox courier is selected
  React.useEffect(() => {
    if (!formData.courierServiceId || !businessData?.id) return;
    const svc = courierServices.find(s => s.id === formData.courierServiceId);
    if (svc?.provider === CourierServiceProvider.CURFOX) {
      getCourierCities(businessData.id, formData.courierServiceId).then(cities => {
        setCourierCities(cities);
      });
    } else {
      setCourierCities([]);
    }
  }, [formData.courierServiceId, courierServices, businessData?.id]);

  // Fetch products on component mount
  React.useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await getAllProducts({
          isActive: true,
          limit: 100
        });
        if (response?.success && response.data) {
          const productList = (response.data as any).data || (response.data as any).products || response.data || [];
          setProducts(productList);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

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

  const getTotalProductValue = () => {
    return selectedProducts.reduce((sum, p) => sum + ((p.unitPrice ?? p.price ?? 0) * p.quantity), 0);
  };

  const getTotalCharges = () => {
    return (formData.shippingCharge || 0) + 
           (formData.insuranceCharge || 0) + 
           (formData.additionalCharges || 0);
  };

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
    
    if (selectedProducts.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    
    const totalProductValue = getTotalProductValue();
    const shippingCharges = getTotalCharges();
    
    const submitData = {
      ...formData,
      customerId: selectedCustomer?.id,
      shippingCharge: formData.shippingCharge || 0,
      insuranceCharge: formData.insuranceCharge || 0,
      additionalCharges: formData.additionalCharges || 0,
      totalCharge: shippingCharges,
      declaredValue: totalProductValue,
      codEnabled: paymentMethod === 'cod',
      codAmount: paymentMethod === 'cod' ? (totalProductValue + shippingCharges) : 0,
      description: (() => {
        const full = selectedProducts.map(p => `${p.name} x${p.quantity}`).join(', ');
        return full.length > 100 ? full.substring(0, 97) + '...' : full;
      })(),
      notes: `Payment Method: ${paymentMethod.toUpperCase()}${formData.notes ? ' | ' + formData.notes : ''}`,
      paymentMethod: paymentMethod,
      // Sale items — required for auto-sale creation on backend
      saleItems: selectedProducts.map(p => ({
        productId: p.id,
        name: p.name,
        quantity: p.quantity,
        unitPrice: p.unitPrice ?? p.price ?? 0,
        costPrice: p.costPrice || 0,
      })),
    };
    
    if (!selectedCustomer && saveAsCustomer && formData.recipientName && formData.recipientPhone) {
      try {
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
      }
    }
    onSave(submitData);
  };

  const [dialogOpen, setDialogOpen] = useState(true);

  return (
    <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh]  p-0">
        <div className="p-6 border-b border-gray-200">
          <DialogTitle className="text-xl font-bold text-gray-900">Create New Shipment</DialogTitle>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">

            {/* Courier Service */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Courier Service *
              </label>
              <select
                value={formData.courierServiceId}
                onChange={(e) => setFormData({ ...formData, courierServiceId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Courier</option>
                {courierServices.map(service => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>

            {/* Delivery Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Method *
              </label>
              <select
                value={formData.deliveryMethod}
                onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value as DeliveryMethod })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                required
              >
                {Object.values(DeliveryMethod).map(method => (
                  <option key={method} value={method}>{method.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {/* Recipient Section */}
            <div className="col-span-2 border-t pt-4 mt-2" ref={recipientSectionRef}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Recipient Information</h3>
                {!selectedCustomer && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="saveAsCustomer"
                      checked={saveAsCustomer}
                      onCheckedChange={(checked) => setSaveAsCustomer(checked === true)}
                    />
                    <label htmlFor="saveAsCustomer" className="text-sm font-medium text-blue-700 cursor-pointer select-none">Save as Customer</label>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Search */}
            <div className="col-span-2">
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                Customer (Recipient)
                {!selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreateNewCustomerMode(true);
                      setSaveAsCustomer(true);
                      setShowCustomerDropdown(false);
                      setTimeout(() => recipientSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                  >
                    + Enter manually
                  </button>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    if (!e.target.value) setSelectedCustomer(null);
                  }}
                  onFocus={() => customerSearchTerm && setShowCustomerDropdown(true)}
                  placeholder="Search customer by name or phone..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 pr-10"
                />
                {loadingCustomers && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => { setSelectedCustomer(null); setCustomerSearchTerm(''); setFormData(prev => ({ ...prev, recipientName: '', recipientPhone: '', recipientEmail: '', recipientAddress: '', recipientCity: '' })); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                  >&times;</button>
                )}
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
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
                        setCreateNewCustomerMode(true);
                        setSaveAsCustomer(true);
                        setFormData(prev => ({ ...prev, recipientName: customerSearchTerm }));
                        setShowCustomerDropdown(false);
                        setTimeout(() => recipientSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
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
              {createNewCustomerMode && !selectedCustomer && (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-blue-600">✓ New customer mode – fill in recipient details below</p>
                  <button
                    type="button"
                    onClick={() => { setCreateNewCustomerMode(false); setSaveAsCustomer(false); setFormData(prev => ({ ...prev, recipientName: '' })); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Recipient Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Name *</label>
              <input
                type="text"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Phone *</label>
              <input
                type="tel"
                value={formData.recipientPhone}
                onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Phone 2 <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="tel"
                value={formData.recipientPhone2 || ''}
                onChange={(e) => setFormData({ ...formData, recipientPhone2: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                placeholder="Alternate contact number"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Address *</label>
              <textarea
                value={formData.recipientAddress}
                onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              {courierCities.length > 0 ? (
                <div className="relative">
                  <input
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
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
                              setFormData(prev => ({ ...prev, recipientCity: c.name }));
                              setCitySearchTerm('');
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
                <div className="relative">
                  <input
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
              {courierCities.length > 0 ? (
                <div className="relative">
                  <input
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
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
                <div className="relative">
                  <input
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
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

            {/* Products Section */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <h3 className="font-medium text-gray-900 mb-3">Products *</h3>
              <div className="relative">
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Search products..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                />
                {showProductDropdown && productSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingProducts ? (
                      <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                          </div>
                          <div className="text-sm font-medium">Rs. {product.unitPrice}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">No products found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedProducts.map(product => (
                    <div key={product.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">Rs. {product.unitPrice}</div>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(e) => handleProductQuantityChange(product.id, parseInt(e.target.value))}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg font-medium">
                    <span>Total Value:</span>
                    <span>Rs. {getTotalProductValue().toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method *</label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Cash on Delivery (COD)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Bank Transfer</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Online Payment</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="koko"
                    checked={paymentMethod === 'koko'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Koko</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="mintpay"
                    checked={paymentMethod === 'mintpay'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>MintPay</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="payzy"
                    checked={paymentMethod === 'payzy'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Payzy</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {paymentMethod === 'cod'
                  ? 'Courier will collect payment and product value from customer'
                  : paymentMethod === 'koko' || paymentMethod === 'mintpay' || paymentMethod === 'payzy'
                  ? `Customer will pay via ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} installment plan - courier only delivers package`
                  : 'Customer already paid - courier only delivers package'}
              </p>
            </div>

            {/* Shipment Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg) *</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Pieces *</label>
              <input
                type="number"
                min="1"
                value={formData.numberOfPieces}
                onChange={(e) => setFormData({ ...formData, numberOfPieces: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Charge (Rs.) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.shippingCharge}
                onChange={(e) => setFormData({ ...formData, shippingCharge: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Charge (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.insuranceCharge}
                onChange={(e) => setFormData({ ...formData, insuranceCharge: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                placeholder="Any special instructions..."
              />
            </div>

            {/* Summary */}
            <div className="col-span-2 bg-gray-50 rounded-lg p-4 mt-2">
              <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Product Value:</span>
                  <span>Rs. {getTotalProductValue().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Charges:</span>
                  <span>Rs. {getTotalCharges().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-base border-t border-gray-300 pt-2 mt-2">
                  <span>{paymentMethod === 'cod' ? 'Total COD Amount:' : 'Total Value:'}</span>
                  <span>Rs. {(getTotalProductValue() + getTotalCharges()).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Shipment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CourierShipmentModal;
