import { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import * as Yup from 'yup';
import { formatSriLankaPhone, isValidSriLankaPhone, toLocalSriLankaPhone } from '../../../utils/phone';
import useFetch from '../../../hooks/useFetch';
import { useAuth } from '../../../context/AuthContext';

interface CreateCustomerPayload {
  name: string;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  address?: string | null;
  city?: string | null;
  nicNumber?: string | null;
  branchId?: string | null;
  customerType: 'WALK_IN' | 'REGULAR' | 'VIP';
  notes?: string | null;
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerPayload) => Promise<void>;
  initialPhone?: string;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  email: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .email('Invalid email format')
    .optional(),
  phone: Yup.string()
    .required('Phone number is required')
    .test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value)),
  alternatePhone: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value))
    .optional(),
  nicNumber: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .matches(/^(?:\d{9}[VvXx]|\d{12})$/, 'Invalid NIC format (e.g., 123456789V or 199012345678)')
    .optional(),
  customerType: Yup.string()
    .oneOf(['WALK_IN', 'REGULAR', 'VIP'], 'Invalid customer type')
    .required('Customer type is required'),
});

export default function AddCustomerModal({ isOpen, onClose, onSubmit, initialPhone }: AddCustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const { user } = useAuth();

  const branchesFetch = useFetch<{ branches: Branch[]; pagination: unknown }>('/branches');

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: initialPhone || '',
      alternatePhone: '',
      address: '',
      city: '',
      nicNumber: '',
      branchId: '',
      customerType: 'WALK_IN' as 'WALK_IN' | 'REGULAR' | 'VIP',
      notes: '',
      isActive: true,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        const payload: CreateCustomerPayload = {
          name: values.name.trim(),
          phone: values.phone ? toLocalSriLankaPhone(formatSriLankaPhone(values.phone)) : values.phone.trim(),
          email: values.email.trim() || null,
          alternatePhone: values.alternatePhone
            ? toLocalSriLankaPhone(formatSriLankaPhone(values.alternatePhone))
            : null,
          address: values.address.trim() || null,
          city: values.city.trim() || null,
          nicNumber: values.nicNumber.trim() || null,
          branchId: values.branchId || null,
          customerType: values.customerType,
          notes: values.notes.trim() || null,
          isActive: values.isActive,
        };

        await onSubmit(payload);
      } catch (error) {
        console.error('Error in modal:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Check if user is admin
  const isAdmin = user?.role?.name === 'ADMIN';

  // Load branches when modal opens and update phone if initialPhone is provided
  useEffect(() => {
    if (isOpen) {
      // Load branches only for admin users
      if (isAdmin) {
        loadBranches();
      } else {
        // For non-admin users, set branchId to their locationId
        const userLocationId = user?.locationId || user?.location?.id || null;
        if (userLocationId) {
          formik.setFieldValue('branchId', userLocationId);
        }
      }
      // Update phone field if initialPhone is provided
      if (initialPhone) {
        formik.setFieldValue('phone', initialPhone);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPhone, isAdmin]);

  const loadBranches = async () => {
    try {
      const response = await branchesFetch.fetchData({ method: 'GET', silent: true, endpoint: '/branches' });
      if (response?.data?.branches) {
        setBranches(response.data.branches);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      formik.resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.name && formik.touched.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter customer name"
                />
                {formik.errors.name && formik.touched.name && (
                  <p className="mt-1 text-sm text-red-500">{formik.errors.name}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.phone && formik.touched.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0771234567"
                />
                {formik.errors.phone && formik.touched.phone && (
                  <p className="mt-1 text-sm text-red-500">{formik.errors.phone}</p>
                )}
              </div>

              {/* Alternate Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                <input
                  type="text"
                  name="alternatePhone"
                  value={formik.values.alternatePhone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.alternatePhone && formik.touched.alternatePhone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0777654321"
                />
                {formik.errors.alternatePhone && formik.touched.alternatePhone && (
                  <p className="mt-1 text-sm text-red-500">{formik.errors.alternatePhone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.email && formik.touched.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="customer@example.com"
                />
                {formik.errors.email && formik.touched.email && (
                  <p className="mt-1 text-sm text-red-500">{formik.errors.email}</p>
                )}
              </div>

              {/* NIC Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIC Number</label>
                <input
                  type="text"
                  name="nicNumber"
                  value={formik.values.nicNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.nicNumber && formik.touched.nicNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="123456789V or 123456789012"
                />
                {formik.errors.nicNumber && formik.touched.nicNumber && (
                  <p className="mt-1 text-sm text-red-500">{formik.errors.nicNumber}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formik.values.city}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Colombo"
                />
              </div>

              {/* Customer Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="customerType"
                  value={formik.values.customerType}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.customerType && formik.touched.customerType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="WALK_IN">Walk-in</option>
                  <option value="REGULAR">Regular</option>
                  <option value="VIP">VIP</option>
                </select>
                {formik.errors.customerType && formik.touched.customerType && (
                  <p className="mt-1 text-sm text-red-500">{formik.errors.customerType}</p>
                )}
              </div>

              {/* Branch - Only show for ADMIN users */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    name="branchId"
                    value={formik.values.branchId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Select branch (optional)</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Enter customer address"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Additional notes about the customer"
                />
              </div>

              {/* Is Active */}
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formik.values.isActive}
                    onChange={formik.handleChange}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-400"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active Customer</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
