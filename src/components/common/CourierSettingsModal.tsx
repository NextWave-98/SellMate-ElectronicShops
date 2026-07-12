/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { Settings, CheckCircle, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CourierMode, CourierServiceProvider, type CourierService, type BusinessCourierPreference, type CourierLabelSettings } from '../../hooks/useCourier';
import useCourier from '../../hooks/useCourier';
import { toast } from 'react-hot-toast';

interface CourierSettingsModalProps {
  businessId: string;
  currentSettings: {
    courierMode: CourierMode;
    defaultCourierServiceId?: string;
    discountApprovalRequired?: boolean;
    courierStaffLimitedPermissions?: boolean;
    labelSettings?: CourierLabelSettings;
  } | null;
  courierServices: CourierService[];
  businessPreferences?: BusinessCourierPreference[];
  onClose: () => void;
  onSave: (
    courierMode: CourierMode,
    defaultCourierServiceId?: string,
    labelSettings?: Partial<CourierLabelSettings>,
    discountApprovalRequired?: boolean,
    courierStaffLimitedPermissions?: boolean,
  ) => Promise<void>;
  onSavePreference?: (courierServiceId: string, customConfig: any) => Promise<void>;
}

const CourierSettingsModal = ({
  businessId,
  currentSettings,
  courierServices,
  businessPreferences,
  onClose,
  onSave,
  onSavePreference
}: CourierSettingsModalProps) => {
  const [courierMode, setCourierMode] = useState<CourierMode>(
    currentSettings?.courierMode || CourierMode.SYSTEM_ONLY
  );
  const [defaultCourierServiceId, setDefaultCourierServiceId] = useState<string>(
    currentSettings?.defaultCourierServiceId || ''
  );
  const [saving, setSaving] = useState(false);

  // Label print settings
  const [hideSenderSection, setHideSenderSection] = useState<boolean>(
    currentSettings?.labelSettings?.hideSenderSection ?? false
  );
  const [showPhoneBelowShipment, setShowPhoneBelowShipment] = useState<boolean>(
    currentSettings?.labelSettings?.showPhoneBelowShipment ?? false
  );
  const [labelPhoneNumber, setLabelPhoneNumber] = useState<string>(
    currentSettings?.labelSettings?.labelPhoneNumber ?? ''
  );

  // Staff discount approval requirement (org-level)
  const [discountApprovalRequired, setDiscountApprovalRequired] = useState<boolean>(
    currentSettings?.discountApprovalRequired ?? false
  );
  const [courierStaffLimitedPermissions, setCourierStaffLimitedPermissions] = useState<boolean>(
    currentSettings?.courierStaffLimitedPermissions ?? false
  );

  // Keep local state in sync with the persisted settings once they load.
  // The modal can mount before `currentSettings` is fetched, which initialises
  // every toggle to its default (e.g. approval = OFF) while the saved value is
  // actually ON. Without this sync the admin sees "off" but the org setting was
  // never changed, so staff discounts keep going to admin approval.
  useEffect(() => {
    if (!currentSettings) return;
    setCourierMode(currentSettings.courierMode || CourierMode.SYSTEM_ONLY);
    setDefaultCourierServiceId(currentSettings.defaultCourierServiceId || '');
    setHideSenderSection(currentSettings.labelSettings?.hideSenderSection ?? false);
    setShowPhoneBelowShipment(currentSettings.labelSettings?.showPhoneBelowShipment ?? false);
    setLabelPhoneNumber(currentSettings.labelSettings?.labelPhoneNumber ?? '');
    setDiscountApprovalRequired(currentSettings.discountApprovalRequired ?? false);
    setCourierStaffLimitedPermissions(currentSettings.courierStaffLimitedPermissions ?? false);
    // Depend on primitive values (not the object identity) so this only re-syncs
    // when the persisted settings actually change, not on every parent re-render.
  }, [
    currentSettings?.courierMode,
    currentSettings?.defaultCourierServiceId,
    currentSettings?.discountApprovalRequired,
    currentSettings?.courierStaffLimitedPermissions,
    currentSettings?.labelSettings?.hideSenderSection,
    currentSettings?.labelSettings?.showPhoneBelowShipment,
    currentSettings?.labelSettings?.labelPhoneNumber,
  ]);

  // Curfox-specific credential state
  const [curfoxApiKey, setCurfoxApiKey] = useState('');
  const [curfoxApiSecret, setCurfoxApiSecret] = useState('');
  const [curfoxTenant, setCurfoxTenant] = useState('');
  const [curfoxMerchantId, setCurfoxMerchantId] = useState('');
  const [curfoxOriginCity, setCurfoxOriginCity] = useState('');
  const [curfoxOriginState, setCurfoxOriginState] = useState('');

  // City autocomplete state
  const { getCourierCities } = useCourier();
  const [courierCities, setCourierCities] = useState<Array<{ id: number; name: string; stateName: string }>>([]);
  const [originCitySearchTerm, setOriginCitySearchTerm] = useState('');
  const [showOriginCityDropdown, setShowOriginCityDropdown] = useState(false);
  const originCityDropdownRef = useRef<HTMLDivElement>(null);

  const selectedService = courierServices.find(s => s.id === defaultCourierServiceId);
  const isCurfox = selectedService?.provider === CourierServiceProvider.CURFOX;

  // Pre-fill Curfox fields from existing preference when service changes
  useEffect(() => {
    if (isCurfox && businessPreferences) {
      const existing = businessPreferences.find(p => p.courierServiceId === defaultCourierServiceId);
      if (existing?.customConfig) {
        setCurfoxApiKey(existing.customConfig.apiKey || '');
        setCurfoxApiSecret(existing.customConfig.apiSecret || '');
        setCurfoxTenant(existing.customConfig.additionalConfig?.tenant || '');
        setCurfoxMerchantId(existing.customConfig.additionalConfig?.merchant_business_id || '');
        setCurfoxOriginCity(existing.customConfig.additionalConfig?.origin_city_name || '');
        setCurfoxOriginState(existing.customConfig.additionalConfig?.origin_state_name || '');
      } else {
        setCurfoxApiKey(''); setCurfoxApiSecret('');
        setCurfoxTenant(''); setCurfoxMerchantId('');
        setCurfoxOriginCity(''); setCurfoxOriginState('');
      }
    }
  }, [defaultCourierServiceId, isCurfox, businessPreferences]);

  // Fetch Curfox city list when a Curfox service is selected
  useEffect(() => {
    if (isCurfox && defaultCourierServiceId && businessId) {
      getCourierCities(businessId, defaultCourierServiceId).then(cities => {
        setCourierCities(cities);
      }).catch(() => setCourierCities([]));
    } else {
      setCourierCities([]);
    }
  }, [isCurfox, defaultCourierServiceId, businessId, getCourierCities]);

  // Sync origin city search term when prefilled value changes
  useEffect(() => {
    setOriginCitySearchTerm(curfoxOriginCity);
  }, [curfoxOriginCity]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (originCityDropdownRef.current && !originCityDropdownRef.current.contains(e.target as Node)) {
        setShowOriginCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-select first active courier service if API_ENABLED but none selected
  useEffect(() => {
    if (courierMode === CourierMode.API_ENABLED && !defaultCourierServiceId) {
      const firstActive = courierServices.find(s => s.isActive && s.apiEnabled);
      if (firstActive) {
        setDefaultCourierServiceId(firstActive.id);
      }
    }
  }, [courierMode, courierServices, defaultCourierServiceId]);

  const handleSave = async () => {
    // Validation
    if (courierMode === CourierMode.API_ENABLED && !defaultCourierServiceId) {
      toast.error('Please select a default courier service for API-enabled mode');
      return;
    }

    if (isCurfox && onSavePreference) {
      if (!curfoxApiSecret || !curfoxTenant || !curfoxMerchantId) {
        toast.error('Please fill in the required Curfox credentials (email, tenant, merchant ID)');
        return;
      }
    }

    try {
      setSaving(true);
      await onSave(courierMode, defaultCourierServiceId || undefined, {
        hideSenderSection,
        showPhoneBelowShipment,
        labelPhoneNumber: labelPhoneNumber.trim() || undefined,
      }, discountApprovalRequired, courierStaffLimitedPermissions);

      // Save Curfox-specific credentials into BusinessCourierPreference
      if (isCurfox && onSavePreference && defaultCourierServiceId) {
        const curfoxConfig = {
          apiKey: curfoxApiKey,
          apiSecret: curfoxApiSecret,
          apiEndpoint: 'https://v1.api.curfox.com',
          additionalConfig: {
            tenant: curfoxTenant,
            merchant_business_id: curfoxMerchantId,
            origin_city_name: curfoxOriginCity,
            origin_state_name: curfoxOriginState
          }
        };
        await onSavePreference(defaultCourierServiceId, curfoxConfig);
      }

      toast.success('Courier settings updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update courier settings');
      console.error('Error saving courier settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const apiEnabledCouriers = courierServices.filter(s => s.isActive && s.apiEnabled);
  const [dialogOpen, setDialogOpen] = useState(true);

  return (
    <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh]  p-0  ">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-600" />
            <DialogTitle className="text-xl font-bold text-gray-900">Courier Configuration</DialogTitle>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Configure how your business handles courier shipments</p>
              <p>Choose between internal tracking only or full API integration with external courier services.</p>
            </div>
          </div>

          {/* Courier Mode Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Courier Mode *
            </label>

            {/* System Only Mode */}
            <div
              onClick={() => setCourierMode(CourierMode.SYSTEM_ONLY)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                courierMode === CourierMode.SYSTEM_ONLY
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  courierMode === CourierMode.SYSTEM_ONLY
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-gray-300'
                }`}>
                  {courierMode === CourierMode.SYSTEM_ONLY && (
                    <CheckCircle className="w-4 h-4 text-white fill-current" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    System Only Mode
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Default</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Track shipments internally without external courier API integration. Perfect for businesses that:
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                    <li>• Handle their own deliveries</li>
                    <li>• Use manual courier coordination</li>
                    <li>• Don't need real-time tracking from couriers</li>
                    <li>• Want simple internal shipment records</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* API Enabled Mode */}
            <div
              onClick={() => setCourierMode(CourierMode.API_ENABLED)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                courierMode === CourierMode.API_ENABLED
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  courierMode === CourierMode.API_ENABLED
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-gray-300'
                }`}>
                  {courierMode === CourierMode.API_ENABLED && (
                    <CheckCircle className="w-4 h-4 text-white fill-current" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    API-Enabled Mode
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Advanced</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Integrate with external courier service APIs (Pronto, Fardar, DHL, etc.). Benefits:
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                    <li>• Automatic shipment creation with courier</li>
                    <li>• Real-time tracking updates</li>
                    <li>• Get tracking numbers automatically</li>
                    <li>• Professional courier management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Default Courier Service Selection (only show if API_ENABLED) */}
          {courierMode === CourierMode.API_ENABLED && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Default Courier Service *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                This courier will be used automatically when creating shipments unless you specify a different one.
              </p>
              <select
                value={defaultCourierServiceId}
                onChange={(e) => setDefaultCourierServiceId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                required={courierMode === CourierMode.API_ENABLED}
              >
                <option value="">Select a courier service...</option>
                {apiEnabledCouriers.length === 0 && (
                  <option value="" disabled>No API-enabled courier services available</option>
                )}
                {apiEnabledCouriers.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.provider})
                    {service.baseCharge && ` - Base: LKR ${service.baseCharge}`}
                  </option>
                ))}
              </select>

              {apiEnabledCouriers.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No API-enabled courier services found. Please configure courier services with API credentials first.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Curfox-specific credentials */}
          {courierMode === CourierMode.API_ENABLED && isCurfox && (
            <div className="space-y-4 border border-orange-200 bg-orange-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-orange-800">Curfox / Royal Express Credentials</h3>
              <p className="text-xs text-orange-700">
                These credentials are stored per-organization and used for automated shipment creation via the Curfox API.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Merchant Email (API Secret) *</label>
                  <input
                    type="email"
                    value={curfoxApiSecret}
                    onChange={e => setCurfoxApiSecret(e.target.value)}
                    placeholder="merchant@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Merchant Password (API Key)</label>
                  <input
                    type="password"
                    value={curfoxApiKey}
                    onChange={e => setCurfoxApiKey(e.target.value)}
                    placeholder="Enter merchant password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tenant *</label>
                  <input
                    type="text"
                    value={curfoxTenant}
                    onChange={e => setCurfoxTenant(e.target.value)}
                    placeholder="e.g. royalexpress"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Merchant Business ID *</label>
                  <input
                    type="text"
                    value={curfoxMerchantId}
                    onChange={e => setCurfoxMerchantId(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="col-span-2" ref={originCityDropdownRef}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Origin City</label>
                  {courierCities.length > 0 ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={originCitySearchTerm}
                        onChange={e => {
                          setOriginCitySearchTerm(e.target.value);
                          setShowOriginCityDropdown(true);
                        }}
                        onFocus={() => setShowOriginCityDropdown(true)}
                        placeholder="Search Curfox city..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                      />
                      {curfoxOriginCity && (
                        <div className="mt-1 text-xs text-green-700 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Selected: {curfoxOriginCity}{curfoxOriginState ? ` (${curfoxOriginState})` : ''}
                        </div>
                      )}
                      {showOriginCityDropdown && (() => {
                        const term = originCitySearchTerm.toLowerCase();
                        const filtered = courierCities.filter(c =>
                          c.name.toLowerCase().includes(term) || c.stateName.toLowerCase().includes(term)
                        ).slice(0, 20);
                        return filtered.length > 0 ? (
                          <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                            {filtered.map(city => (
                              <li
                                key={city.id}
                                onMouseDown={() => {
                                  setCurfoxOriginCity(city.name);
                                  setCurfoxOriginState(city.stateName);
                                  setOriginCitySearchTerm(city.name);
                                  setShowOriginCityDropdown(false);
                                }}
                                className="px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer flex justify-between items-center"
                              >
                                <span className="font-medium">{city.name}</span>
                                <span className="text-xs text-gray-400">{city.stateName}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={curfoxOriginCity}
                        onChange={e => setCurfoxOriginCity(e.target.value)}
                        placeholder="e.g. Colombo 03"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                      />
                      <p className="text-xs text-gray-400">Save credentials first to enable city autocomplete</p>
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Origin State</label>
                  <input
                    type="text"
                    value={curfoxOriginState}
                    onChange={e => setCurfoxOriginState(e.target.value)}
                    placeholder="Auto-filled when selecting city above"
                    readOnly={courierCities.length > 0}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 ${courierCities.length > 0 ? 'bg-gray-50 text-gray-500 cursor-default' : ''}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Label Print Settings */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              🏷️ Label Print Settings
            </h3>
            <p className="text-xs text-gray-500">
              Customize what appears on printed courier labels for this organization.
            </p>

            {/* Hide Sender (FROM) Section */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <p className="text-sm font-medium text-gray-700">Hide sender (FROM) section</p>
                <p className="text-xs text-gray-500">Remove the FROM address block from printed labels</p>
              </div>
              <button
                type="button"
                onClick={() => setHideSenderSection(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  hideSenderSection ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hideSenderSection ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            {/* Show Org Phone Below Shipment Number */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <p className="text-sm font-medium text-gray-700">Show phone number below shipment number</p>
                <p className="text-xs text-gray-500">Print the organization's phone number directly under the shipment/barcode line</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneBelowShipment(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  showPhoneBelowShipment ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showPhoneBelowShipment ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            {/* Phone number input — shown when showPhoneBelowShipment is enabled */}
            {showPhoneBelowShipment && (
              <div className="mt-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phone number to print on label
                </label>
                <input
                  type="tel"
                  value={labelPhoneNumber}
                  onChange={(e) => setLabelPhoneNumber(e.target.value)}
                  placeholder="e.g. +94 77 123 4567"
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to use the organization's registered telephone number.</p>
              </div>
            )}
          </div>

          {/* Staff Discount Approval */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              🔐 Staff Discount Approval
            </h3>
            <p className="text-xs text-gray-500">
              Control whether discounts applied by staff on courier shipments need admin sign-off.
            </p>

            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <p className="text-sm font-medium text-gray-700">Require admin approval for staff discounts</p>
                <p className="text-xs text-gray-500">
                  When ON, a shipment created by a non-admin with a discount is held for admin approval before the courier is created.
                  When OFF, staff discounts create the courier directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDiscountApprovalRequired(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                  discountApprovalRequired ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    discountApprovalRequired ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Limit staff courier permissions</h3>
            <p className="text-xs text-gray-500">
              When enabled, staff can create courier orders and edit recipient details, but may only change pickup, handover, on hold, damage, and return statuses. They cannot confirm payments, update sales, or import Excel tracker status/payment updates. Bulk Import CSV for new orders remains available. Download and print remain available.
            </p>
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="text-sm font-medium text-gray-700">Enable limited staff courier permissions</span>
              <button
                type="button"
                onClick={() => setCourierStaffLimitedPermissions((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  courierStaffLimitedPermissions ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    courierStaffLimitedPermissions ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Current Configuration Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Configuration Summary</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Mode:</dt>
                <dd className="font-medium text-gray-900">
                  {courierMode === CourierMode.SYSTEM_ONLY ? 'System Only (Internal)' : 'API-Enabled (External)'}
                </dd>
              </div>
              {courierMode === CourierMode.API_ENABLED && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Default Courier:</dt>
                  <dd className="font-medium text-gray-900">
                    {defaultCourierServiceId 
                      ? courierServices.find(s => s.id === defaultCourierServiceId)?.name || 'Selected'
                      : 'Not selected'}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">API Calls:</dt>
                <dd className={`font-medium ${
                  courierMode === CourierMode.API_ENABLED ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {courierMode === CourierMode.API_ENABLED ? 'Enabled' : 'Disabled'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Staff Discount Approval:</dt>
                <dd className={`font-medium ${
                  discountApprovalRequired ? 'text-amber-600' : 'text-gray-600'
                }`}>
                  {discountApprovalRequired ? 'Required' : 'Not required'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Staff Permissions:</dt>
                <dd className={`font-medium ${
                  courierStaffLimitedPermissions ? 'text-amber-600' : 'text-gray-600'
                }`}>
                  {courierStaffLimitedPermissions ? 'Limited' : 'Full access'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || (courierMode === CourierMode.API_ENABLED && !defaultCourierServiceId)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourierSettingsModal;
