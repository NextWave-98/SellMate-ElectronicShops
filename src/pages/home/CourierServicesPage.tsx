/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Grid, 
  List,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  XCircle,
  Settings,
  Truck
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import useCourier, { type CourierService, CourierServiceProvider, CourierMode } from '../../hooks/useCourier';
import CourierSettingsModal from '../../components/common/CourierSettingsModal';

const CourierServicesPage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const businessId = user?.businessId;
  
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedService, setSelectedService] = useState<CourierService | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const {
    courierServices,
    courierSettings,
    businessPreferences,
    loading,
    fetchCourierServices,
    createCourierService,
    updateCourierService,
    deleteCourierService,
    fetchCourierSettings,
    updateCourierSettings,
    fetchBusinessCourierPreferences,
    addBusinessCourierPreference,
    updateBusinessCourierPreference
  } = useCourier();

  useEffect(() => {
    fetchCourierServices(providerFilter ? { provider: providerFilter } : undefined);
    if (businessId) {
      fetchCourierSettings(businessId);
      fetchBusinessCourierPreferences(businessId);
    }
  }, [providerFilter, businessId]);

  const handleCreateService = () => {
    setSelectedService(null);
    setShowServiceModal(true);
  };

  const handleEditService = (service: CourierService) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const handleDeleteService = async (id: string) => {
    if (confirm('Are you sure you want to delete this courier service?')) {
      try {
        await deleteCourierService(id);
        fetchCourierServices();
      } catch (error) {
        console.error('Error deleting courier service:', error);
      }
    }
  };

  const filteredServices = courierServices.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || (statusFilter === 'active' ? service.isActive : !service.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Truck className="w-8 h-8 text-orange-600" />
          Courier Services Management
        </h1>
        <p className="text-gray-600 mt-2">Manage your courier service providers and configurations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{courierServices.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Services</p>
              <p className="text-2xl font-bold text-green-600">
                {courierServices.filter(s => s.isActive).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Enabled</p>
              <p className="text-2xl font-bold text-purple-600">
                {courierServices.filter(s => s.apiEnabled).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Courier Mode</p>
              <p className="text-lg font-bold text-orange-600">
                {courierSettings?.courierMode === CourierMode.API_ENABLED ? 'API Enabled' : 'System Only'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search courier services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Provider Filter */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Providers</option>
              {Object.values(CourierServiceProvider).map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>

            <button
              onClick={handleCreateService}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Service
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <CourierServicesGrid
          services={filteredServices}
          onEdit={handleEditService}
          onDelete={handleDeleteService}
        />
      ) : (
        <CourierServicesTable
          services={filteredServices}
          onEdit={handleEditService}
          onDelete={handleDeleteService}
        />
      )}

      {/* Modals */}
      {showServiceModal && (
        <CourierServiceModal
          service={selectedService}
          onClose={() => setShowServiceModal(false)}
          onSave={async (data) => {
            try {
              let response;
              if (selectedService) {
                response = await updateCourierService(selectedService.id, data);
              } else {
                response = await createCourierService(data);
              }
              if (!response?.success) {
                return;
              }
              setShowServiceModal(false);
              fetchCourierServices();
            } catch (error) {
              console.error('Error saving courier service:', error);
            }
          }}
        />
      )}

      {showSettingsModal && businessId && (
       <CourierSettingsModal
          businessId={businessId}
          currentSettings={courierSettings}
          courierServices={courierServices}
          businessPreferences={businessPreferences}
          onClose={() => setShowSettingsModal(false)}
          onSave={async (courierMode, defaultCourierServiceId, labelSettings, discountApprovalRequired, courierStaffLimitedPermissions) => {
            await updateCourierSettings(
              businessId,
              courierMode,
              defaultCourierServiceId,
              labelSettings,
              discountApprovalRequired,
              courierStaffLimitedPermissions,
            );
            setShowSettingsModal(false);
          }}
          onSavePreference={async (courierServiceId, customConfig) => {
            const existing = businessPreferences?.find(p => p.courierServiceId === courierServiceId);
            if (existing) {
              await updateBusinessCourierPreference(existing.id, { customConfig }, businessId);
            } else {
              await addBusinessCourierPreference(businessId, {
                courierServiceId,
                isEnabled: true,
                isDefault: true,
                customConfig
              });
            }
          }}
        />
      )}
    </div>
  );
};

// Grid View Component
const CourierServicesGrid = ({
  services,
  onEdit,
  onDelete
}: {
  services: CourierService[];
  onEdit: (service: CourierService) => void;
  onDelete: (id: string) => void;
}) => {
  if (services.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No courier services found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <div
          key={service.id}
          className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                <span className="inline-block px-2 py-1 text-xs bg-white bg-opacity-20  rounded mt-2">
                  {service.provider}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {service.isActive ? (
                  <CheckCircle className="w-5 h-5 text-green-300" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-300" />
                )}
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-3">
            {service.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
            )}

            {/* Contact Info */}
            <div className="space-y-2">
              {service.contactNumber && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{service.contactNumber}</span>
                </div>
              )}
              {service.email && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{service.email}</span>
                </div>
              )}
              {service.website && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a href={service.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline truncate">
                    Visit Website
                  </a>
                </div>
              )}
            </div>

            {/* Pricing Info */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Charge:</span>
                <span className="font-semibold">Rs. {service.baseCharge || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Per Km:</span>
                <span className="font-semibold">Rs. {service.perKmCharge || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Minimum:</span>
                <span className="font-semibold">Rs. {service.minimumCharge || 0}</span>
              </div>
            </div>

            {/* API Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Integration:</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                service.apiEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {service.apiEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Card Footer */}
          <div className="border-t border-gray-200 p-4 flex gap-2">
            <button
              onClick={() => onEdit(service)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onDelete(service.id)}
              className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Table View Component
const CourierServicesTable = ({
  services,
  onEdit,
  onDelete
}: {
  services: CourierService[];
  onEdit: (service: CourierService) => void;
  onDelete: (id: string) => void;
}) => {
  if (services.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No courier services found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pricing
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                API
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{service.name}</div>
                    {service.description && (
                      <div className="text-sm text-gray-500 line-clamp-1">{service.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                    {service.provider}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm space-y-1">
                    {service.contactNumber && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{service.contactNumber}</span>
                      </div>
                    )}
                    {service.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[150px]">{service.email}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm space-y-1">
                    <div>Base: <span className="font-semibold">Rs. {service.baseCharge || 0}</span></div>
                    <div>Per Km: <span className="font-semibold">Rs. {service.perKmCharge || 0}</span></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    service.apiEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {service.apiEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                    service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {service.isActive ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(service)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(service.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Courier Service Modal Component
export  const CourierServiceModal = ({
  service,
  onClose,
  onSave
}: {
  service: CourierService | null;
  onClose: () => void;
  onSave: (data: Partial<CourierService>) => Promise<void>;
}) => {
  const isEditing = !!service;

  const [formData, setFormData] = useState<Partial<CourierService>>({
    provider: service?.provider || CourierServiceProvider.DOMEX,
    name: service?.name || '',
    description: service?.description || '',
    contactNumber: service?.contactNumber || '',
    email: service?.email || '',
    website: service?.website || '',
    apiEndpoint: service?.apiEndpoint || '',
    baseCharge: service?.baseCharge || 0,
    perKmCharge: service?.perKmCharge || 0,
    minimumCharge: service?.minimumCharge || 0,
    perKgCharge: service?.perKgCharge ?? 150,
    baseWeightLimit: service?.baseWeightLimit ?? 1.0,
    apiEnabled: service?.apiEnabled || false,
    isActive: service?.isActive ?? true
  });

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiSecretInput, setApiSecretInput] = useState('');

  const buildUpdatePayload = (): Partial<CourierService> => {
    const payload: Partial<CourierService> = { ...formData };

    const trimmedApiKey = apiKeyInput.trim();
    const trimmedApiSecret = apiSecretInput.trim();

    if (trimmedApiKey) {
      payload.apiKey = trimmedApiKey;
    } else if (!isEditing || !service?.hasApiKey) {
      // Explicitly allow setting an empty key only when none existed before
      delete payload.apiKey;
    }

    if (trimmedApiSecret) {
      payload.apiSecret = trimmedApiSecret;
    } else if (!isEditing || !service?.hasApiSecret) {
      delete payload.apiSecret;
    }

    return payload;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(buildUpdatePayload());
  };

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {service ? 'Edit Courier Service' : 'Add Courier Service'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider *
              </label>
              <select
                value={formData.provider}
                onChange={(e) => {
                  const provider = e.target.value as CourierServiceProvider;
                  const isKoombiyo = provider === CourierServiceProvider.KOOMBIYO;
                  setFormData({
                    ...formData,
                    provider,
                    ...(isKoombiyo ? {
                      apiEnabled: true,
                      apiEndpoint: formData.apiEndpoint || 'https://application.koombiyodelivery.lk/api',
                      website: formData.website || 'https://koombiyodelivery.lk',
                    } : {}),
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                required
              >
                {Object.values(CourierServiceProvider).map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number
              </label>
              <input
                type="tel"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* API Configuration Section */}
            <div className="col-span-2">
              <div className="border-t border-gray-200 pt-4 mb-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">API Configuration</h3>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.apiEnabled}
                    onChange={(e) => setFormData({ ...formData, apiEnabled: e.target.checked })}
                    className="w-4 h-4 text-orange-600 focus:ring-orange-400 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable API Integration</span>
                </label>
                {formData.apiEnabled && (
                  <p className="text-xs text-gray-500 mb-2">
                    Configure API credentials to enable automated shipment creation and tracking.
                  </p>
                )}
              </div>
            </div>

            {formData.apiEnabled && (
              <>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Endpoint
                  </label>
                  <input
                    type="url"
                    value={formData.apiEndpoint}
                    onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                    placeholder="https://api.courier-service.com/v1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                    placeholder={service?.hasApiKey ? 'Enter new API key to update' : 'Enter API key'}
                    autoComplete="off"
                  />
                  {service?.hasApiKey && !apiKeyInput && (
                    <p className="mt-1 text-xs text-green-600">API key is configured. Enter a new value to replace it.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={apiSecretInput}
                    onChange={(e) => setApiSecretInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                    placeholder={service?.hasApiSecret ? 'Enter new API secret to update' : 'Enter API secret'}
                    autoComplete="new-password"
                  />
                  {service?.hasApiSecret && !apiSecretInput && (
                    <p className="mt-1 text-xs text-green-600">API secret is configured. Enter a new value to replace it.</p>
                  )}
                </div>

                <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    <strong>Security Note:</strong> API credentials are encrypted and stored securely. 
                    They are only used for automated shipment operations.
                  </p>
                </div>
              </>
            )}

            {/* Pricing Section */}
            <div className="col-span-2">
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Pricing</h3>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Charge (Rs.)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.baseCharge}
                onChange={(e) => setFormData({ ...formData, baseCharge: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Per KM Charge (Rs.)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.perKmCharge}
                onChange={(e) => setFormData({ ...formData, perKmCharge: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Charge (Rs.)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.minimumCharge}
                onChange={(e) => setFormData({ ...formData, minimumCharge: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Weight Limit (kg)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.1"
                value={formData.baseWeightLimit}
                onChange={(e) => setFormData({ ...formData, baseWeightLimit: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
              />
              <p className="mt-1 text-xs text-gray-500">Base charge covers weight up to this limit</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Charge per KG (Rs.)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.perKgCharge}
                onChange={(e) => setFormData({ ...formData, perKgCharge: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
              />
              <p className="mt-1 text-xs text-gray-500">Applied per kg above the base weight limit</p>
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-400 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              {service ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default CourierServicesPage;
