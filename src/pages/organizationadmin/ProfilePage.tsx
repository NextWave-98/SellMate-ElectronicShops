/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { User, Shield, Download, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import useProfile, { type ProfileFormData } from '../../hooks/useProfile';
import useBusinessProfile from '../../hooks/useBusinessProfile';
import toast from 'react-hot-toast';


const ProfilePage = () => {

  const [activeTab, setActiveTab] = useState('general');

  const {
    profileData,
    loading,
    updatingProfile,
    changingPassword,
    exportingData,
    loadProfile,
    updateProfile,
    changePassword,
    exportData,
    calculatePasswordStrength,
    getPasswordStrengthColor,
    getPasswordStrengthText,
    profileToFormData,
  } = useProfile();

  const {
    businessData,
    loading: loadingBusiness,
    updatingBusiness,
    loadBusinessProfile,
    updateBusinessProfile,
  } = useBusinessProfile();

  // Fetch profile data on mount
  useEffect(() => {
    loadProfile();
    loadBusinessProfile();
  }, []);

  const tabs = [
    { id: 'general', label: 'General Settings', icon: User },
    { id: 'business', label: 'Business Profile', icon: Building2 },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Generate Data Change', icon: Download },
  ];

  if (loading || loadingBusiness) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4">
      <div className="mx-auto">
        <Card>
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-white/20">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1 text-sm">Manage your account settings and preferences</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-white/20 overflow-x-auto">
            <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-orange-400 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-white/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden xs:inline sm:inline">{tab.label}</span>
                    <span className="xs:hidden sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'general' && (
              <GeneralSettingsTab
                profileData={profileData}
                updateProfile={updateProfile as any}
                updatingProfile={updatingProfile}
                profileToFormData={profileToFormData}
              />
            )}
            {activeTab === 'business' && (
              <BusinessProfileTab
                businessData={businessData}
                updateBusinessProfile={updateBusinessProfile}
                updatingBusiness={updatingBusiness}
              />
            )}
            {activeTab === 'security' && (
              <SecurityTab
                changePassword={changePassword as any}
                changingPassword={changingPassword}
                calculatePasswordStrength={calculatePasswordStrength}
                getPasswordStrengthColor={getPasswordStrengthColor}
                getPasswordStrengthText={getPasswordStrengthText}
              />
            )}
            {activeTab === 'data' && (
              <DataChangeTab
                exportData={exportData as any}
                exportingData={exportingData}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const GeneralSettingsTab = ({ 
  profileData, 
  updateProfile, 
  updatingProfile,
  profileToFormData,
}: {
  profileData: {
    name?: string;
    email?: string;
    staff?: {
      phoneNumber?: string;
      additionalPhone?: string;
      address?: string;
      nicNumber?: string;
      dateOfBirth?: string;
      emergencyContact?: string;
      emergencyName?: string;
      emergencyRelation?: string;
      qualifications?: string;
      experience?: string;
      notes?: string;
    };
  } | null;
  updateProfile: (formData: ProfileFormData) => Promise<{ success: boolean; message: string }>;
  updatingProfile: boolean;
  profileToFormData: (profile: { name?: string; email?: string; staff?: Record<string, string> } | null) => ProfileFormData;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    additionalPhone: '',
    address: '',
    nicNumber: '',
    dateOfBirth: '',
    emergencyContact: '',
    emergencyName: '',
    emergencyRelation: '',
    qualifications: '',
    experience: '',
    notes: '',
  });

  // Update form data when profile data loads
  useEffect(() => {
    if (profileData) {
      setFormData(profileToFormData(profileData));
    }
  }, [profileData, profileToFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateProfile(formData);
    alert(result.message);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div>
            <Label>
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="mt-1"
            />
          </div>

          <div>
            <Label>
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              className="mt-1"
            />
          </div>

          <div>
            <Label>
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Enter primary phone number"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Additional Phone</Label>
            <Input
              type="tel"
              name="additionalPhone"
              value={formData.additionalPhone}
              onChange={handleChange}
              placeholder="Enter additional phone number"
              className="mt-1"
            />
          </div>
        </div>

        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>

          <div>
            <Label>
              NIC Number <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              name="nicNumber"
              value={formData.nicNumber}
              onChange={handleChange}
              placeholder="Enter NIC number (e.g., 123456789V)"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Date of Birth</Label>
            <Input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Address</Label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              placeholder="Enter your full address"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-400 focus:border-orange-400"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Contact Name</Label>
            <Input
              type="text"
              name="emergencyName"
              value={formData.emergencyName}
              onChange={handleChange}
              placeholder="Enter emergency contact name"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Contact Number</Label>
            <Input
              type="tel"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              placeholder="Enter emergency contact number"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Relationship</Label>
            <Input
              type="text"
              name="emergencyRelation"
              value={formData.emergencyRelation}
              onChange={handleChange}
              placeholder="Enter relationship (e.g., Parent, Spouse)"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Professional Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Qualifications</Label>
            <textarea
              name="qualifications"
              value={formData.qualifications}
              onChange={handleChange}
              rows={3}
              placeholder="Enter your educational qualifications"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-400 focus:border-orange-400"
            />
          </div>
          <div>
            <Label>Experience</Label>
            <textarea
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              rows={3}
              placeholder="Enter your work experience"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-400 focus:border-orange-400"
            />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Enter any additional notes"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-400 focus:border-orange-400"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={updatingProfile}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {updatingProfile ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

const SecurityTab = ({ 
  changePassword, 
  changingPassword,
  calculatePasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthText,
}: {
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) => Promise<{ success: boolean; message: string }>;
  changingPassword: boolean;
  calculatePasswordStrength: (password: string) => number;
  getPasswordStrengthColor: (strength: number) => string;
  getPasswordStrengthText: (strength: number) => string;
}) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    const result = await changePassword({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });

    toast.success(result.message);
    if (result.success) {
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-6">
      <div>
        <Label>Current Password</Label>
        <Input
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          placeholder="Enter your current password"
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label>New Password</Label>
        <Input
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="Enter your new password"
          className="mt-1"
          required
        />
        {formData.newPassword && (
            <div className="mt-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getPasswordStrengthColor(passwordStrength)}`}
                  style={{ width: `${(passwordStrength / 5) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{getPasswordStrengthText(passwordStrength)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Password must contain at least 8 characters with uppercase, lowercase, number, and special character.
            </div>
          </div>
        )}
      </div>

      <div>
        <Label>Confirm New Password</Label>
        <Input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your new password"
          className="mt-1"
          required
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={changingPassword}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {changingPassword ? 'Changing...' : 'Change Password'}
        </Button>
      </div>
    </form>
  );
};

const BusinessProfileTab = ({
  businessData,
  updateBusinessProfile,
  updatingBusiness,
}: {
  businessData: {
    id?: string;
    name: string;
    logo: string;
    address: string;
    telephone: string;
    email: string;
    city: string;
    postalCode: string;
    district: string;
    website?: string;
    whatsappGroupLink?: string;
  } | null;
  updateBusinessProfile: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  updatingBusiness: boolean;
}) => {
  const CLOUDINARY_URL = import.meta.env.VITE_CLOUDINARY_URL || '';
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    address: '',
    telephone: '',
    email: '',
    city: '',
    postalCode: '',
    district: '',
    website: '',
    whatsappGroupLink: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Update form data when business data loads
  useEffect(() => {
    if (businessData) {
      const initialData = {
        name: businessData.name || '',
        logo: businessData.logo || '',
        address: businessData.address || '',
        telephone: businessData.telephone || '',
        email: businessData.email || '',
        city: businessData.city || '',
        postalCode: businessData.postalCode || '',
        district: businessData.district || '',
        website: businessData.website || '',
        whatsappGroupLink: businessData.whatsappGroupLink || '',
      };
      setFormData(initialData);
      if (businessData.logo) {
        setLogoPreview(`${businessData.logo}`);
      }
    }
  }, [businessData, CLOUDINARY_URL]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setHasChanges(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setHasChanges(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('address', formData.address);
    submitData.append('telephone', formData.telephone);
    submitData.append('email', formData.email);
    submitData.append('city', formData.city);
    submitData.append('postalCode', formData.postalCode);
    submitData.append('district', formData.district);
    submitData.append('website', formData.website);
    submitData.append('whatsappGroupLink', formData.whatsappGroupLink);

    if (logoFile) {
      submitData.append('logo', logoFile);
    }

    const result = await updateBusinessProfile(submitData);
    if (result.success) {
      setHasChanges(false);
      setLogoFile(null);
    }
    toast.success(result.message);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Business Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Business Information</h3>

          <div>
            <Label>Business Name</Label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter business name"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter business email"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label>Telephone</Label>
            <Input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              placeholder="Enter telephone number"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label>City</Label>
            <Input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
              className="mt-1"
            />
          </div>

          <div>
            <Label>District</Label>
            <Input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder="Enter district"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Postal Code</Label>
            <Input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="Enter postal code"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Address</Label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              placeholder="Enter business address"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-400 focus:border-orange-400"
              required
            />
          </div>

          <div>
            <Label>Website</Label>
            <Input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label>WhatsApp Group Link</Label>
            <Input
              type="url"
              name="whatsappGroupLink"
              value={formData.whatsappGroupLink}
              onChange={handleChange}
              placeholder="https://chat.whatsapp.com/..."
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">Shown as a QR code on printed receipts</p>
          </div>
        </div>

        {/* Right Column - Logo */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Business Logo</h3>

          <div className="flex flex-col items-center space-y-4">
            {logoPreview && (
              <div className="w-48 h-48 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                <img
                  src={logoPreview}
                  alt="Business Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload New Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-orange-50 file:text-orange-700
                  hover:file:bg-orange-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Recommended: Square image, PNG or JPG format
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updatingBusiness}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {updatingBusiness ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </form>
  );
};

const DataChangeTab = ({
  exportData,
  exportingData
}: {
  exportData: () => Promise<{ success: boolean; message: string }>;
  exportingData: boolean;
}) => {
  const handleExportData = async () => {
    const result = await exportData();
    toast.error(result.message);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Export Your Data</h3>
        <p className="text-gray-600 mt-1">
          Download a copy of your personal data including profile information, activity logs, and transaction history.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Personal Data Export</h4>
            <p className="text-sm text-gray-600">Includes all your profile and activity data</p>
          </div>
          <Button
            onClick={handleExportData}
            disabled={exportingData}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {exportingData ? 'Exporting...' : 'Export Data'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;