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
import type { Customer } from '../../../types/customer.types';

interface UpdateCustomerPayload {
  name?: string;
  email?: string | null;
  phone?: string;
  alternatePhone?: string | null;
  address?: string | null;
  city?: string | null;
  nicNumber?: string | null;
  branchId?: string | null;
  customerType?: 'WALK_IN' | 'REGULAR' | 'VIP';
  notes?: string | null;
  isActive?: boolean;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface CustomerDetails {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  nicNumber: string | null;
  customerType: 'WALK_IN' | 'REGULAR' | 'VIP';
  notes: string | null;
  isActive: boolean;
  branchId?: string | null;
  locationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customerId: string, data: UpdateCustomerPayload) => Promise<void>;
  customer: Customer | null;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .optional(),
  email: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .email('Invalid email format')
    .optional(),
  phone: Yup.string()
    .test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value))
    .optional(),
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
    .optional(),
});

export default function EditCustomerModal({ isOpen, onClose, onSubmit, customer }: EditCustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);

  const branchesFetch = useFetch<{ branches: Branch[]; pagination: unknown }>('/branches');
  const customerDetailsFetch = useFetch<CustomerDetails>('/customers/:id');

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
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
      if (!customer || !customerDetails) return;

      setIsSubmitting(true);
      try {
        const normalizeEmpty = (value: string | null | undefined) => {
          const trimmed = (value ?? '').trim();
          return trimmed ? trimmed : null;
        };

        // Only include changed fields
        const payload: UpdateCustomerPayload = {};

        if (values.name.trim() !== (customerDetails.name || '').trim()) {
          payload.name = values.name.trim();
        }
        if (normalizeEmpty(values.email) !== normalizeEmpty(customerDetails.email)) {
          payload.email = normalizeEmpty(values.email);
        }
        if (toLocalSriLankaPhone(values.phone) !== toLocalSriLankaPhone(customerDetails.phone)) {
          payload.phone = values.phone
            ? toLocalSriLankaPhone(formatSriLankaPhone(values.phone))
            : values.phone.trim();
        }
        if (
          toLocalSriLankaPhone(values.alternatePhone) !==
          toLocalSriLankaPhone(customerDetails.alternatePhone)
        ) {
          payload.alternatePhone = values.alternatePhone?.trim()
            ? toLocalSriLankaPhone(formatSriLankaPhone(values.alternatePhone))
            : null;
        }
        if (normalizeEmpty(values.address) !== normalizeEmpty(customerDetails.address)) {
          payload.address = normalizeEmpty(values.address);
        }
        if (normalizeEmpty(values.city) !== normalizeEmpty(customerDetails.city)) {
          payload.city = normalizeEmpty(values.city);
        }
        if (normalizeEmpty(values.nicNumber) !== normalizeEmpty(customerDetails.nicNumber)) {
          payload.nicNumber = normalizeEmpty(values.nicNumber);
        }
        if (values.branchId !== (customerDetails.branchId || customerDetails.locationId || '')) {
          payload.branchId = values.branchId || null;
        }
        if (values.customerType !== customerDetails.customerType) {
          payload.customerType = values.customerType;
        }
        if (normalizeEmpty(values.notes) !== normalizeEmpty(customerDetails.notes)) {
          payload.notes = normalizeEmpty(values.notes);
        }
        if (values.isActive !== customerDetails.isActive) {
          payload.isActive = values.isActive;
        }

        await onSubmit(customer.id, payload);
        formik.resetForm();
        setCustomerDetails(null);
        onClose();
      } catch (error) {
        console.error('Error in modal:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (isOpen && customer) {
      loadBranches();
      loadCustomerDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer]);

  const loadCustomerDetails = async () => {
    if (!customer) return;

    setLoading(true);
    try {
      const response = await customerDetailsFetch.fetchData({
        method: 'GET',
        silent: true,
        endpoint: `/customers/${customer.id}`,
      });

      if (response?.data) {
        const details = response.data;
        setCustomerDetails(details);

        // Populate form with existing data
        formik.resetForm({
          values: {
            name: details.name || '',
            email: details.email || '',
            phone: details.phone || '',
            alternatePhone: details.alternatePhone || '',
            address: details.address || '',
            city: details.city || '',
            nicNumber: details.nicNumber || '',
            branchId: details.branchId || details.locationId || '',
            customerType: details.customerType || 'WALK_IN',
            notes: details.notes || '',
            isActive: details.isActive ?? true,
          },
        });
      }
    } catch (error) {
      console.error('Failed to load customer details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await branchesFetch.fetchData({ method: 'GET', silent: true, endpoint: '/branches' });
      if (response?.data?.branches) {
        setBranches(Array.isArray(response.data.branches) ? response.data.branches : []);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      formik.resetForm();
      setCustomerDetails(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-2 text-gray-600">Loading customer details...</p>
          </div>
        ) : (
          <form onSubmit={formik.handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
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
                    placeholder="Optional alternate number"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
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

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    name="branchId"
                    value={formik.values.branchId || ''}
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

                {/* Status */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="isActive"
                    value={formik.values.isActive ? 'true' : 'false'}
                    onChange={(e) => formik.setFieldValue('isActive', e.target.value === 'true')}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Customer'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
