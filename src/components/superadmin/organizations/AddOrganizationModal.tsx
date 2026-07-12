import { useState } from 'react';
import { Building2, User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CreateOrganizationDTO } from '../../../types/organization.types';
import toast from 'react-hot-toast';

interface AddOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateOrganizationDTO) => Promise<void>;
  isLoading: boolean;
}

export default function AddOrganizationModal({ isOpen, onClose, onSubmit, isLoading }: AddOrganizationModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLocationFields, setShowLocationFields] = useState(false);
  
  const [formData, setFormData] = useState({
    // Business Info
    businessName: '',
    businessAddress: '',
    businessCity: '',
    businessCountry: 'Sri Lanka',
    businessEmail: '',
    businessTelephone: '',
    businessType: 'RETAIL',
    industryType: 'GENERAL',
    businessWebsite: '',
    // Owner Info
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerConfirmPassword: '',
    ownerPhone: '',
    // Location Info (optional)
    locationName: '',
    locationAddress: '',
    locationCity: '',
    locationCountry: '',
    // Options
    autoSubscribe: false,
    subscriptionPlan: 'BASIC',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Business validations
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!formData.businessEmail.trim()) {
      newErrors.businessEmail = 'Business email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) {
      newErrors.businessEmail = 'Invalid email format';
    }
    if (!formData.businessCity.trim()) {
      newErrors.businessCity = 'City is required';
    }

    // Owner validations
    if (!formData.ownerFirstName.trim()) {
      newErrors.ownerFirstName = 'First name is required';
    }
    if (!formData.ownerLastName.trim()) {
      newErrors.ownerLastName = 'Last name is required';
    }
    if (!formData.ownerEmail.trim()) {
      newErrors.ownerEmail = 'Owner email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Invalid email format';
    }
    if (!formData.ownerPassword) {
      newErrors.ownerPassword = 'Password is required';
    } else if (formData.ownerPassword.length < 8) {
      newErrors.ownerPassword = 'Password must be at least 8 characters';
    }
    if (formData.ownerPassword !== formData.ownerConfirmPassword) {
      newErrors.ownerConfirmPassword = 'Passwords do not match';
    }

    // Location validations (only if location fields are shown and partially filled)
    if (showLocationFields && formData.locationName.trim()) {
      if (!formData.locationCity.trim()) {
        newErrors.locationCity = 'Location city is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    const createData: CreateOrganizationDTO = {
      business: {
        name: formData.businessName,
        address: formData.businessAddress || formData.businessCity, // fallback to city if address empty
        city: formData.businessCity,
        email: formData.businessEmail,
        telephone: formData.businessTelephone || '-', // default if empty
        businessType: (formData.businessType as 'RETAIL' | 'WHOLESALE' | 'SERVICE' | 'MANUFACTURING' | 'OTHER') || undefined,
        industryType: (formData.industryType as 'ELECTRONICS' | 'CLOTHING' | 'GENERAL' | 'VEHICLE_RENTAL' | 'CAR_WASH' | 'GARAGE') || 'GENERAL',
        website: formData.businessWebsite || undefined,
      },
      owner: {
        firstName: formData.ownerFirstName,
        lastName: formData.ownerLastName,
        email: formData.ownerEmail,
        password: formData.ownerPassword,
        phone: formData.ownerPhone || '-', // default if empty
      },
    };

    // Add optional location
    if (showLocationFields && formData.locationName.trim()) {
      createData.initialLocation = {
        locationCode: formData.locationName.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
        name: formData.locationName,
        locationType: 'STORE',
        address: formData.locationAddress || formData.locationCity,
        city: formData.locationCity || formData.businessCity,
        phone: formData.businessTelephone || '-',
      };
    }

    // Add subscription options
    if (formData.autoSubscribe && formData.subscriptionPlan) {
      createData.autoSubscribe = {
        planId: formData.subscriptionPlan,
        billingCycle: 'MONTHLY',
        autoRenew: true,
        startImmediately: true,
      };
    }

    try {
      await onSubmit(createData);
      toast.success('Organization created successfully');
      handleClose();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create organization';
      toast.error(errorMsg);
    }
  };

  const handleClose = () => {
    setFormData({
      businessName: '',
      businessAddress: '',
      businessCity: '',
      businessCountry: 'Sri Lanka',
      businessEmail: '',
      businessTelephone: '',
      businessType: 'RETAIL',
      industryType: 'GENERAL',
      businessWebsite: '',
      ownerFirstName: '',
      ownerLastName: '',
      ownerEmail: '',
      ownerPassword: '',
      ownerConfirmPassword: '',
      ownerPhone: '',
      locationName: '',
      locationAddress: '',
      locationCity: '',
      locationCountry: '',
      autoSubscribe: false,
      subscriptionPlan: 'BASIC',
    });
    setErrors({});
    setShowLocationFields(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]  p-0">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Organization
              </DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add a new business with owner account
              </p>
            </div>
          </div>
        </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Business Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Business Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Enter business name"
                    className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.businessName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.businessName && (
                    <p className="mt-1 text-sm text-red-500">{errors.businessName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="businessEmail"
                      value={formData.businessEmail}
                      onChange={handleChange}
                      placeholder="business@example.com"
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.businessEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  </div>
                  {errors.businessEmail && (
                    <p className="mt-1 text-sm text-red-500">{errors.businessEmail}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      name="businessTelephone"
                      value={formData.businessTelephone}
                      onChange={handleChange}
                      placeholder="+94 XX XXX XXXX"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="businessAddress"
                      value={formData.businessAddress}
                      onChange={handleChange}
                      placeholder="Street address"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="businessCity"
                    value={formData.businessCity}
                    onChange={handleChange}
                    placeholder="City"
                    className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.businessCity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.businessCity && (
                    <p className="mt-1 text-sm text-red-500">{errors.businessCity}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    name="businessCountry"
                    value={formData.businessCountry}
                    onChange={handleChange}
                    placeholder="Country"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="SERVICE">Service</option>
                    <option value="MANUFACTURING">Manufacturing</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Industry Type
                  </label>
                  <select
                    name="industryType"
                    value={formData.industryType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="GENERAL">General Retail</option>
                    <option value="ELECTRONICS">Electronics / Gadget Repair</option>
                    <option value="CLOTHING">Clothing / Apparel</option>
                    <option value="VEHICLE_RENTAL">Vehicle Rental (Rent-a-Car)</option>
                    <option value="CAR_WASH">Car Wash / Detailing</option>
                    <option value="GARAGE">Garage / Auto Workshop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      name="businessWebsite"
                      value={formData.businessWebsite}
                      onChange={handleChange}
                      placeholder="https://www.example.com"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Owner Account
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="ownerFirstName"
                    value={formData.ownerFirstName}
                    onChange={handleChange}
                    placeholder="First name"
                    className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.ownerFirstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.ownerFirstName && (
                    <p className="mt-1 text-sm text-red-500">{errors.ownerFirstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="ownerLastName"
                    value={formData.ownerLastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.ownerLastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.ownerLastName && (
                    <p className="mt-1 text-sm text-red-500">{errors.ownerLastName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      placeholder="owner@example.com"
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.ownerEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  </div>
                  {errors.ownerEmail && (
                    <p className="mt-1 text-sm text-red-500">{errors.ownerEmail}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleChange}
                      placeholder="+94 XX XXX XXXX"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="ownerPassword"
                      value={formData.ownerPassword}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      className={`w-full pl-10 pr-10 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.ownerPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.ownerPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.ownerPassword}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="ownerConfirmPassword"
                      value={formData.ownerConfirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      className={`w-full pl-10 pr-10 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.ownerConfirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.ownerConfirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.ownerConfirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Initial Location (Collapsible) */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                type="button"
                onClick={() => setShowLocationFields(!showLocationFields)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Initial Location (Optional)
                  </span>
                </div>
                {showLocationFields ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {showLocationFields && (
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location Name
                    </label>
                    <input
                      type="text"
                      name="locationName"
                      value={formData.locationName}
                      onChange={handleChange}
                      placeholder="e.g., Main Branch"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      name="locationAddress"
                      value={formData.locationAddress}
                      onChange={handleChange}
                      placeholder="Street address"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="locationCity"
                      value={formData.locationCity}
                      onChange={handleChange}
                      placeholder="City"
                      className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.locationCity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.locationCity && (
                      <p className="mt-1 text-sm text-red-500">{errors.locationCity}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="locationCountry"
                      value={formData.locationCountry}
                      onChange={handleChange}
                      placeholder="Country"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Auto Subscription */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900 dark:text-white">Auto Subscribe</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically create a subscription for this organization
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="autoSubscribe"
                  checked={formData.autoSubscribe}
                  onChange={handleChange}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>
              {formData.autoSubscribe && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subscription Plan
                  </label>
                  <select
                    name="subscriptionPlan"
                    value={formData.subscriptionPlan}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="BASIC">Basic</option>
                    <option value="STANDARD">Standard</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
