import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import useSupplier from '../../../hooks/useSupplier';
import LoadingSpinner from '../../common/LoadingSpinner';
import { isValidSriLankaPhone, formatSriLankaPhone } from '../../../utils/phone';

interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  fax?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  taxId?: string;
  registrationNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
  creditDays: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  swiftCode?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  contactPersonDesignation?: string;
  rating?: number;
  supplierType: string;
  status: string;
  notes?: string;
  isActive: boolean;
}

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: Supplier | null;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Supplier name is required')
    .min(2, 'Name must be at least 2 characters'),
  companyName: Yup.string()
    .optional(),
  phone: Yup.string()
    .required('Phone number is required')
    .test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !!value && isValidSriLankaPhone(value)),
  alternatePhone: Yup.string()
    .test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value))
    .optional(),
  email: Yup.string()
    .email('Invalid email format')
    .optional(),
  website: Yup.string()
    .url('Invalid website URL')
    .optional(),
  address: Yup.string()
    .optional(),
  city: Yup.string()
    .optional(),
  state: Yup.string()
    .optional(),
  postalCode: Yup.string()
    .optional(),
  country: Yup.string()
    .optional(),
  taxId: Yup.string()
    .required('Tax ID is required'),
  registrationNumber: Yup.string()
    .optional(),
  paymentTerms: Yup.string()
    .optional(),
  creditLimit: Yup.number()
    .positive('Credit limit must be positive')
    .optional(),
  creditDays: Yup.number()
    .integer('Credit days must be a whole number')
    .min(0, 'Credit days cannot be negative')
    .optional(),
  bankName: Yup.string()
    .optional(),
  accountNumber: Yup.string()
    .optional(),
  accountName: Yup.string()
    .optional(),
  swiftCode: Yup.string()
    .optional(),
  contactPersonName: Yup.string()
    .optional(),
  contactPersonPhone: Yup.string()
    .test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value))
    .optional(),
  contactPersonEmail: Yup.string()
    .email('Invalid email format')
    .optional(),
  contactPersonDesignation: Yup.string()
    .optional(),
  rating: Yup.number()
    .integer()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot be more than 5')
    .optional(),
  supplierType: Yup.string()
    .oneOf(['LOCAL', 'INTERNATIONAL', 'MANUFACTURER', 'DISTRIBUTOR', 'WHOLESALER', 'RETAILER'], 'Invalid supplier type')
    .optional(),
  status: Yup.string()
    .oneOf(['ACTIVE', 'INACTIVE'], 'Invalid status')
    .optional(),
  notes: Yup.string()
    .optional(),
});

export default function EditSupplierModal({ isOpen, onClose, onSuccess, supplier }: EditSupplierModalProps) {
  const supplierHook = useSupplier();
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: '',
      companyName: '',
      email: '',
      phone: '',
      alternatePhone: '',
      fax: '',
      website: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Sri Lanka',
      taxId: '',
      registrationNumber: '',
      paymentTerms: '',
      creditLimit: '',
      creditDays: '30',
      bankName: '',
      accountNumber: '',
      accountName: '',
      swiftCode: '',
      contactPersonName: '',
      contactPersonPhone: '',
      contactPersonEmail: '',
      contactPersonDesignation: '',
      rating: '3',
      supplierType: 'LOCAL',
      status: 'ACTIVE',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!supplier?.id) return;

      setLoading(true);
      try {
        const submitData = {
          id: supplier.id,
          ...values,
          creditLimit: values.creditLimit ? parseFloat(values.creditLimit) : undefined,
          creditDays: parseInt(values.creditDays) || 30,
          rating: parseInt(values.rating) || 3,
          isActive: values.status === 'ACTIVE',
          supplierType: values.supplierType as 'LOCAL' | 'INTERNATIONAL' | 'MANUFACTURER' | 'DISTRIBUTOR' | 'WHOLESALER' | 'RETAILER',
          status: values.status as 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'PENDING_APPROVAL',
        };

        const response = await supplierHook.updateSupplier(submitData);
        
        if (response?.success) {
         
          onSuccess();
          onClose();
        }
      } catch (error) {
        console.error('Error updating supplier:', error);
        toast.error('Failed to update supplier');
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    if (supplier && isOpen) {
      loadSupplierDetails();
    }
  }, [supplier, isOpen]);

  const loadSupplierDetails = useCallback(async () => {
    if (!supplier?.id) return;
    
    setFetchingDetails(true);
    try {
      const response = await supplierHook.getSupplierById(supplier.id);
      const data = response?.data as Supplier;
      
      if (data) {
        formik.resetForm({
          values: {
            name: data.name || '',
            companyName: data.companyName || '',
            email: data.email || '',
            phone: data.phone || '',
            alternatePhone: data.alternatePhone || '',
            fax: data.fax || '',
            website: data.website || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            postalCode: data.postalCode || '',
            country: data.country || 'Sri Lanka',
            taxId: data.taxId || '',
            registrationNumber: data.registrationNumber || '',
            paymentTerms: data.paymentTerms || '',
            creditLimit: data.creditLimit?.toString() || '',
            creditDays: data.creditDays?.toString() || '30',
            bankName: data.bankName || '',
            accountNumber: data.accountNumber || '',
            accountName: data.accountName || '',
            swiftCode: data.swiftCode || '',
            contactPersonName: data.contactPersonName || '',
            contactPersonPhone: data.contactPersonPhone || '',
            contactPersonEmail: data.contactPersonEmail || '',
            contactPersonDesignation: data.contactPersonDesignation || '',
            rating: data.rating?.toString() || '3',
            supplierType: data.supplierType || 'LOCAL',
            status: data.status || 'ACTIVE',
            notes: data.notes || '',
          },
        });
      }
    } catch (error) {
      console.error('Error loading supplier details:', error);
      toast.error('Failed to load supplier details');
    } finally {
      setFetchingDetails(false);
    }
  }, [supplier?.id, supplierHook, formik]);

  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="glass-modal-header flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Supplier</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {fetchingDetails ? (
          <div className="glass-modal-scroll flex flex-1 items-center justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <form onSubmit={formik.handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="glass-modal-scroll px-6 py-6">
            {/* Basic Information */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.name && formik.touched.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {formik.errors.name && formik.touched.name && <p className="mt-1 text-sm text-red-500">{formik.errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formik.values.companyName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={(e) => {
                      formik.handleBlur(e);
                      if (formik.values.phone) {
                        formik.setFieldValue('phone', formatSriLankaPhone(formik.values.phone));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.phone && formik.touched.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {formik.errors.phone && formik.touched.phone && <p className="mt-1 text-sm text-red-500">{formik.errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    name="alternatePhone"
                    value={formik.values.alternatePhone}
                    onChange={formik.handleChange}
                    onBlur={(e) => {
                      formik.handleBlur(e);
                      if (formik.values.alternatePhone) {
                        formik.setFieldValue('alternatePhone', formatSriLankaPhone(formik.values.alternatePhone));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.alternatePhone && formik.touched.alternatePhone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.alternatePhone && formik.touched.alternatePhone && <p className="mt-1 text-sm text-red-500">{formik.errors.alternatePhone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.email && formik.touched.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.email && formik.touched.email && <p className="mt-1 text-sm text-red-500">{formik.errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formik.values.website}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.website && formik.touched.website ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.website && formik.touched.website && <p className="mt-1 text-sm text-red-500">{formik.errors.website}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Type</label>
                  <select
                    name="supplierType"
                    value={formik.values.supplierType}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.supplierType && formik.touched.supplierType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="LOCAL">Local</option>
                    <option value="INTERNATIONAL">International</option>
                    <option value="MANUFACTURER">Manufacturer</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                    <option value="WHOLESALER">Wholesaler</option>
                    <option value="RETAILER">Retailer</option>
                  </select>
                  {formik.errors.supplierType && formik.touched.supplierType && <p className="mt-1 text-sm text-red-500">{formik.errors.supplierType}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.status && formik.touched.status ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="BLACKLISTED">Blacklisted</option>
                  </select>
                  {formik.errors.status && formik.touched.status && <p className="mt-1 text-sm text-red-500">{formik.errors.status}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                  <input
                    type="number"
                    name="rating"
                    min="1"
                    max="5"
                    value={formik.values.rating}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.rating && formik.touched.rating ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.rating && formik.touched.rating && <p className="mt-1 text-sm text-red-500">{formik.errors.rating}</p>}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formik.values.address}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.address && formik.touched.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.address && formik.touched.address && <p className="mt-1 text-sm text-red-500">{formik.errors.address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formik.values.city}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.city && formik.touched.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.city && formik.touched.city && <p className="mt-1 text-sm text-red-500">{formik.errors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                  <input
                    type="text"
                    name="state"
                    value={formik.values.state}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.state && formik.touched.state ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.state && formik.touched.state && <p className="mt-1 text-sm text-red-500">{formik.errors.state}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formik.values.postalCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.postalCode && formik.touched.postalCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.postalCode && formik.touched.postalCode && <p className="mt-1 text-sm text-red-500">{formik.errors.postalCode}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formik.values.country}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.country && formik.touched.country ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.country && formik.touched.country && <p className="mt-1 text-sm text-red-500">{formik.errors.country}</p>}
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formik.values.taxId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.taxId && formik.touched.taxId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.taxId && formik.touched.taxId && <p className="mt-1 text-sm text-red-500">{formik.errors.taxId}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formik.values.registrationNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.registrationNumber && formik.touched.registrationNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.registrationNumber && formik.touched.registrationNumber && <p className="mt-1 text-sm text-red-500">{formik.errors.registrationNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    name="paymentTerms"
                    value={formik.values.paymentTerms}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="e.g., Net 30"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.paymentTerms && formik.touched.paymentTerms ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.paymentTerms && formik.touched.paymentTerms && <p className="mt-1 text-sm text-red-500">{formik.errors.paymentTerms}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Days</label>
                  <input
                    type="number"
                    name="creditDays"
                    value={formik.values.creditDays}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.creditDays && formik.touched.creditDays ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.creditDays && formik.touched.creditDays && <p className="mt-1 text-sm text-red-500">{formik.errors.creditDays}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit (LKR)</label>
                  <input
                    type="number"
                    name="creditLimit"
                    value={formik.values.creditLimit}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.creditLimit && formik.touched.creditLimit ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.creditLimit && formik.touched.creditLimit && <p className="mt-1 text-sm text-red-500">{formik.errors.creditLimit}</p>}
                </div>
              </div>
            </div>

            {/* Banking Information */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Banking Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    value={formik.values.bankName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.bankName && formik.touched.bankName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.bankName && formik.touched.bankName && <p className="mt-1 text-sm text-red-500">{formik.errors.bankName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    name="accountName"
                    value={formik.values.accountName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.accountName && formik.touched.accountName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.accountName && formik.touched.accountName && <p className="mt-1 text-sm text-red-500">{formik.errors.accountName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formik.values.accountNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.accountNumber && formik.touched.accountNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.accountNumber && formik.touched.accountNumber && <p className="mt-1 text-sm text-red-500">{formik.errors.accountNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT Code</label>
                  <input
                    type="text"
                    name="swiftCode"
                    value={formik.values.swiftCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.swiftCode && formik.touched.swiftCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.swiftCode && formik.touched.swiftCode && <p className="mt-1 text-sm text-red-500">{formik.errors.swiftCode}</p>}
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Person</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="contactPersonName"
                    value={formik.values.contactPersonName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.contactPersonName && formik.touched.contactPersonName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.contactPersonName && formik.touched.contactPersonName && <p className="mt-1 text-sm text-red-500">{formik.errors.contactPersonName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="contactPersonPhone"
                    value={formik.values.contactPersonPhone}
                    onChange={formik.handleChange}
                    onBlur={(e) => {
                      formik.handleBlur(e);
                      if (formik.values.contactPersonPhone) {
                        formik.setFieldValue('contactPersonPhone', formatSriLankaPhone(formik.values.contactPersonPhone));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.contactPersonPhone && formik.touched.contactPersonPhone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.contactPersonPhone && formik.touched.contactPersonPhone && <p className="mt-1 text-sm text-red-500">{formik.errors.contactPersonPhone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="contactPersonEmail"
                    value={formik.values.contactPersonEmail}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.contactPersonEmail && formik.touched.contactPersonEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.contactPersonEmail && formik.touched.contactPersonEmail && <p className="mt-1 text-sm text-red-500">{formik.errors.contactPersonEmail}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    name="contactPersonDesignation"
                    value={formik.values.contactPersonDesignation}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                      formik.errors.contactPersonDesignation && formik.touched.contactPersonDesignation ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formik.errors.contactPersonDesignation && formik.touched.contactPersonDesignation && <p className="mt-1 text-sm text-red-500">{formik.errors.contactPersonDesignation}</p>}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formik.values.notes}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.errors.notes && formik.touched.notes ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formik.errors.notes && formik.touched.notes && <p className="mt-1 text-sm text-red-500">{formik.errors.notes}</p>}
            </div>

            </div>

            {/* Form Actions */}
            <div className="glass-modal-footer flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Supplier'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
