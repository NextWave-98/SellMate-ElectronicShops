import { useState, useEffect } from 'react';
import { ClipboardList, Search, Plus, Smartphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import type { CreateJobSheetData } from '../../../hooks/useJobSheet';
import type { Customer } from '../../../hooks/useCustomer';
import type { Device, CreateDeviceData } from '../../../hooks/useDevice';
import useCustomer from '../../../hooks/useCustomer';
import useDevice from '../../../hooks/useDevice';
import useFetch from '../../../hooks/useFetch';
import { useStaff } from '../../../hooks/useStaff';
import { useBranch } from '../../../hooks/useBranch';
import AddDeviceModal from './AddDeviceModal';
import AddCustomerModal from '../customers/AddCustomerModal';
import LoadingSpinner from '../../common/LoadingSpinner';
import { formatCurrency } from '../../../utils/currency';

interface AddJobSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateJobSheetData) => Promise<void>;
  lockLocation?: boolean;
  defaultLocationId?: string;
}

interface StaffOption {
  userId: string;
  name: string;
  roleName: string;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'text-gray-600' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-orange-600' },
  { value: 'HIGH', label: 'High', color: 'text-orange-600' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-600' },
];

export default function AddJobSheetModal({
  isOpen,
  onClose,
  onSubmit,
  lockLocation = false,
  defaultLocationId,
}: AddJobSheetModalProps) {
  const { getCustomers, createCustomer } = useCustomer();
  const { getCustomerDevices, createDevice } = useDevice();
  const { fetchData } = useFetch();
  const { getAllStaff } = useStaff();

  const [step, setStep] = useState(1); // 1: Customer, 2: Device, 3: Job Details
  const [loading, setLoading] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const { branchCode } = useBranch();

  const [formData, setFormData] = useState<CreateJobSheetData>({
    customerId: '',
    deviceId: '',
    locationId: '',
    issueDescription: '',
    status: 'PENDING',
    priority: 'MEDIUM',
    assignedToId: null,
    labourCost: 0,
    partsCost: 0,
    discountAmount: 0,
    paidAmount: 0,
    warrantyPeriod: 90,
    expectedCompletionDate: '',
    accessories: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Search customers
  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearch]);

  // Load devices when customer selected
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  // Load staff when branch/location is selected
  useEffect(() => {
    if (!formData.locationId) {
      setStaffOptions([]);
      return;
    }

    const loadStaff = async () => {
      setLoadingStaff(true);
      try {
        const response = await getAllStaff(1, 100, {
          branchId: formData.locationId,
          isActive: true,
        });
        const staffList = (response as { staff?: Array<{ user: { id: string; name: string; role?: { name: string } } }> })?.staff ?? [];
        setStaffOptions(
          staffList.map((member) => ({
            userId: member.user.id,
            name: member.user.name,
            roleName: member.user.role?.name ?? 'Staff',
          }))
        );
      } catch (error) {
        console.error('Failed to load staff for location:', error);
        setStaffOptions([]);
      } finally {
        setLoadingStaff(false);
      }
    };

    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.locationId]);

  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const response = await fetchData({
        endpoint: '/locations?page=1&limit=100',
        method: 'GET',
      });
      const branchesArray = (response?.data && (response.data.locations ?? response.data)) ?? [];
      if (!Array.isArray(branchesArray)) {
        setBranches([]);
        setFormData((prev) => ({ ...prev, locationId: '' }));
        return;
      }

      // If branchCode is provided (via URL or user), filter to that branch and preselect it
      if (branchCode || defaultLocationId || lockLocation) {
        const match = defaultLocationId
          ? branchesArray.find((b: { id: string }) => b.id === defaultLocationId)
          : branchesArray.find((b: { code?: string; locationCode?: string }) =>
              b.code === branchCode ||
              b.locationCode === branchCode ||
              b.code === branchCode?.toUpperCase()
            );
        if (match) {
          setBranches([{ id: match.id, name: match.name, code: match.code || match.locationCode }]);
          setFormData((prev) => ({ ...prev, locationId: match.id }));
          return;
        }
        // no match: clear selection
        setBranches([]);
        setFormData((prev) => ({ ...prev, locationId: '' }));
        return;
      }

      // Otherwise set all branches
      setBranches(branchesArray.map((b: any) => ({ id: b.id, name: b.name, code: b.code || b.locationCode })));
    } catch (error) {
      console.error('Failed to load branches for step 3:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  const searchCustomers = async () => {
    setSearchingCustomers(true);
    try {
      const response = await getCustomers({
        search: customerSearch,
        page: 1,
        limit: 10,
      });
      // API may return `{ data: { customers: [...] } }` or `{ data: [...] }`.
      const customersArray = ((response?.data) as any)?.customers ?? (response?.data as any);
      if (customersArray && Array.isArray(customersArray)) {
        setCustomers(customersArray as Customer[]);
      }
    } catch (error) {
      console.error('Failed to search customers:', error);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const loadCustomerDevices = async () => {
    if (!selectedCustomer) return;
    
    setLoadingDevices(true);
    try {
      const response = await getCustomerDevices(selectedCustomer.id);
      // API may return `{ data: [...] }` or `{ data: { devices: [...] } }`.
      const devicesArray = ((response?.data) as any)?.devices ?? (response?.data as any);
      if (devicesArray && Array.isArray(devicesArray)) {
        setDevices(devicesArray as Device[]);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({ ...prev, customerId: customer.id }));
    setCustomerSearch('');
    setCustomers([]);
  };

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device);
    setFormData((prev) => ({ ...prev, deviceId: device.id }));
  };

  const handleAddDevice = async (deviceData: CreateDeviceData) => {
    try {
      const response = await createDevice(deviceData);
      if (response?.data) {
        await loadCustomerDevices();
        setShowAddDevice(false);
      }
    } catch (error) {
      console.error('Failed to add device:', error);
    }
  };

  const handleAddCustomer = async (customerData: any) => {
    try {
      // Map the payload to match useCustomer's CreateCustomerData
      const payload = {
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email,
        alternatePhone: customerData.alternatePhone,
        address: customerData.address,
        city: customerData.city,
        nicNumber: customerData.nicNumber,
        locationId: customerData.branchId, // Map branchId to locationId
        customerType: customerData.customerType,
        notes: customerData.notes,
        isActive: customerData.isActive,
      };

      const response = await createCustomer(payload);
      if (response?.data) {
        const newCustomer = response.data;
        handleCustomerSelect(newCustomer);
        setShowAddCustomer(false);
        toast.success('Customer created successfully');
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      throw error; // Re-throw to let AddCustomerModal handle the error
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? (name.includes('Cost') || name.includes('Amount') || name === 'warrantyPeriod' ? 0 : null) : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? 0 : parseFloat(value) || 0,
    }));
  };

  const resetForm = () => {
    setStep(1);
    setSelectedCustomer(null);
    setSelectedDevice(null);
    setCustomerSearch('');
    setCustomers([]);
    setDevices([]);
    setShowAddDevice(false);
    setShowAddCustomer(false);
    setFormData({
      customerId: '',
      deviceId: '',
      locationId: '',
      issueDescription: '',
      status: 'PENDING',
      priority: 'MEDIUM',
      assignedToId: null,
      labourCost: 0,
      partsCost: 0,
      discountAmount: 0,
      paidAmount: 0,
      warrantyPeriod: 90,
      expectedCompletionDate: '',
      accessories: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data
      const submitData = {
        ...formData,
        expectedCompletionDate: formData.expectedCompletionDate,
      };
     await onSubmit(submitData);
    // console.log(res)
    //   if(res){
    //   onClose();
    //   resetForm();}

    } catch (error) {
      console.error('Failed to create job sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = selectedCustomer !== null;
  const canProceedToStep3 = selectedDevice !== null;
  const canSubmit = formData.locationId && formData.issueDescription.length >= 10 && formData.expectedCompletionDate;

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh]  ">
          {/* Header */}
          <DialogHeader className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4">
            <div className="flex items-center">
              <ClipboardList className="w-6 h-6 text-orange-600 mr-2" />
              <div>
                <DialogTitle>Create New Job Sheet</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm ${step >= 1 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    1. Customer
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className={`text-sm ${step >= 2 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    2. Device
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className={`text-sm ${step >= 3 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    3. Job Details
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Step 1: Select Customer */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Customer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by name, phone, email, NIC..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                      disabled={!!selectedCustomer}
                    />
                  </div>

                  {/* Search Results */}
                  {searchingCustomers && (
                    <div className="mt-2 p-4 border border-gray-200 rounded-lg text-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                  
                  {!selectedCustomer && customers.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                          <p className="text-xs text-gray-500">{customer.customerId}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No customers found - show create option */}
                  {!selectedCustomer && !searchingCustomers && customerSearch.length >= 2 && customers.length === 0 && (
                    <div className="mt-2 p-4 border border-gray-200 rounded-lg text-center">
                      <p className="text-gray-600 mb-3">No customers found matching "{customerSearch}"</p>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomer(true)}
                        className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Customer
                      </button>
                    </div>
                  )}

                  {/* Selected Customer */}
                  {selectedCustomer && (
                    <div className="mt-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                          <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                          <p className="text-xs text-gray-500">{selectedCustomer.customerId}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setFormData((prev) => ({ ...prev, customerId: '' }));
                          }}
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedToStep2}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Select Device
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Select or Add Device */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Selected Customer Info */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium text-gray-900">{selectedCustomer?.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                  >
                    Back
                  </button>
                </div>

                {/* Devices List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Device <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddDevice(true)}
                      className="inline-flex items-center text-sm text-orange-600 hover:text-orange-800 font-medium"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add New Device
                    </button>
                  </div>

                  {loadingDevices ? (
                    <div className="p-8 border border-gray-200 rounded-lg text-center">
                      <LoadingSpinner size="sm" />
                      <p className="text-sm text-gray-600 mt-2">Loading devices...</p>
                    </div>
                  ) : devices.length === 0 ? (
                    <div className="p-8 border border-gray-200 rounded-lg text-center">
                      <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-2">No devices registered for this customer</p>
                      <button
                        type="button"
                        onClick={() => setShowAddDevice(true)}
                        className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Register First Device
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {devices.map((device) => {
                        const isAvailable = (device as any).isAvailable !== false;
                        const activeJob = (device as any).activeJob;
                        
                        return (
                          <button
                            key={device.id}
                            type="button"
                            onClick={() => isAvailable && handleDeviceSelect(device)}
                            disabled={!isAvailable}
                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                              !isAvailable
                                ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed'
                                : selectedDevice?.id === device.id
                                ? 'border-orange-400 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {device.brand} {device.model}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">{device.deviceType}</p>
                                {device.serialNumber && (
                                  <p className="text-xs text-gray-500 mt-1">S/N: {device.serialNumber}</p>
                                )}
                                {device.imei && (
                                  <p className="text-xs text-gray-500">IMEI: {device.imei}</p>
                                )}
                              </div>
                              {!isAvailable && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                  In Use
                                </span>
                              )}
                            </div>
                            {!isAvailable && activeJob && (
                              <div className="mt-2 pt-2 border-t border-red-200">
                                <p className="text-xs text-red-600">
                                  Active Job: {activeJob.jobNumber} ({activeJob.status})
                                </p>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await loadBranches();
                      setStep(3);
                    }}
                    disabled={!canProceedToStep3 || loadingBranches}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingBranches ? 'Loading...' : 'Next: Job Details'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Job Details */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Selected Info */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600">Customer</p>
                    <p className="text-sm font-medium text-gray-900">{selectedCustomer?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Device</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedDevice?.brand} {selectedDevice?.model}
                    </p>
                  </div>
                </div>

                {/* Branch, Staff & Priority */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="locationId"
                      value={formData.locationId}
                      onChange={handleChange}
                      required
                      disabled={lockLocation}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100"
                    >
                      <option value="">Select Location</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Technician
                    </label>
                    <select
                      name="assignedToId"
                      value={formData.assignedToId || ''}
                      onChange={handleChange}
                      disabled={!formData.locationId || loadingStaff}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100"
                    >
                      <option value="">
                        {loadingStaff ? 'Loading staff...' : 'Unassigned'}
                      </option>
                      {staffOptions.map((staff) => (
                        <option key={staff.userId} value={staff.userId}>
                          {staff.name} ({staff.roleName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Issue Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="issueDescription"
                    value={formData.issueDescription}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Describe the problem in detail (min 10 characters)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.issueDescription.length} / 10 minimum characters
                  </p>
                </div>

                {/* Accessories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                   Accessories
                  </label>
                  <textarea
                    name="accessories"
                    value={formData.accessories}
                    onChange={handleChange}
                    rows={3}
                    placeholder="List accessories received with the device..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>

                {/* Cost Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Labour Cost (LKR)
                    </label>
                    <input
                      type="number"
                      name="labourCost"
                      value={formData.labourCost}
                      onChange={handleNumberChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parts Cost (LKR)
                    </label>
                    <input
                      type="number"
                      name="partsCost"
                      value={formData.partsCost}
                      onChange={handleNumberChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount (LKR)
                    </label>
                    <input
                      type="number"
                      name="discountAmount"
                      value={formData.discountAmount}
                      onChange={handleNumberChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Advance Payment (LKR)
                    </label>
                    <input
                      type="number"
                      name="paidAmount"
                      value={formData.paidAmount}
                      onChange={handleNumberChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>

                {/* Warranty & Completion Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty Period (Days)
                    </label>
                    <input
                      type="number"
                      name="warrantyPeriod"
                      value={formData.warrantyPeriod}
                      onChange={handleNumberChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Completion Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="expectedCompletionDate"
                      value={formData.expectedCompletionDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>

                {/* Total Preview */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">
                        {formatCurrency((formData.labourCost || 0) + (formData.partsCost || 0) - (formData.discountAmount || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Balance:</span>
                      <span className="font-medium text-orange-600">
                        {formatCurrency((formData.labourCost || 0) + (formData.partsCost || 0) - (formData.discountAmount || 0) - (formData.paidAmount || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={loading}>Back</Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={loading || !canSubmit}>
                    {loading ? 'Creating...' : 'Create Job Sheet'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Device Modal */}
      {showAddDevice && selectedCustomer && (
        <AddDeviceModal
          isOpen={showAddDevice}
          onClose={() => setShowAddDevice(false)}
          onSubmit={handleAddDevice}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
        />
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <AddCustomerModal
          isOpen={showAddCustomer}
          onClose={() => setShowAddCustomer(false)}
          onSubmit={handleAddCustomer}
          initialPhone={customerSearch}
        />
      )}
    </>
  );
}
