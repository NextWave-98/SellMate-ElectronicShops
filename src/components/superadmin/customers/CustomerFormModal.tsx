/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useCustomer, { type CreateCustomerData, type UpdateCustomerData } from '../../../hooks/useCustomer';
import toast from 'react-hot-toast';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId?: string;
  initialData?: {
    name: string;
    email?: string;
    phone: string;
    alternatePhone?: string;
    address?: string;
    city?: string;
    nicNumber?: string;
    branchId?: string;
    customerType: 'WALK_IN' | 'REGULAR' | 'VIP';
    notes?: string;
    isActive: boolean;
  };
  mode: 'create' | 'edit';
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  initialData,
  mode,
}) => {
  const { createCustomer, updateCustomer } = useCustomer();

  const [formData, setFormData] = useState({
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
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        alternatePhone: initialData.alternatePhone || '',
        address: initialData.address || '',
        city: initialData.city || '',
        nicNumber: initialData.nicNumber || '',
        branchId: initialData.branchId || '',
        customerType: initialData.customerType || 'WALK_IN',
        notes: initialData.notes || '',
        isActive: initialData.isActive ?? true,
      });
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(?:\+94|0)?[7][0-9]{8}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid Sri Lankan phone number (e.g., 0771234567)';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (formData.alternatePhone && !/^(?:\+94|0)?[7][0-9]{8}$/.test(formData.alternatePhone)) {
      newErrors.alternatePhone = 'Invalid alternate phone number';
    }

    if (formData.nicNumber && !/^(?:\d{9}[VvXx]|\d{12})$/.test(formData.nicNumber)) {
      newErrors.nicNumber = 'Invalid Sri Lankan NIC number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        const customerData: CreateCustomerData = {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          alternatePhone: formData.alternatePhone.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          nicNumber: formData.nicNumber.trim() || null,
          branchId: formData.branchId || null,
          customerType: formData.customerType,
          notes: formData.notes.trim() || null,
          isActive: formData.isActive,
        };

        const response = await createCustomer(customerData);

        if (response?.success) {
          toast.success('Customer created successfully');
          onSuccess();
          onClose();
          resetForm();
        }
      } else if (mode === 'edit' && customerId) {
        const updateData: UpdateCustomerData = {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          alternatePhone: formData.alternatePhone.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          nicNumber: formData.nicNumber.trim() || null,
          branchId: formData.branchId || null,
          customerType: formData.customerType,
          notes: formData.notes.trim() || null,
          isActive: formData.isActive,
        };

        const response = await updateCustomer(customerId, updateData);

        if (response?.success) {
          toast.success('Customer updated successfully');
          onSuccess();
          onClose();
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      alternatePhone: '',
      address: '',
      city: '',
      nicNumber: '',
      branchId: '',
      customerType: 'WALK_IN',
      notes: '',
      isActive: true,
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Customer' : 'Edit Customer'}</DialogTitle>
        </DialogHeader>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  } px-3 py-2 focus:border-orange-400 focus:ring-orange-400`}
                  placeholder="Enter customer name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  } px-3 py-2 focus:border-orange-400 focus:ring-orange-400`}
                  placeholder="0771234567"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              {/* Alternate Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Alternate Phone</label>
                <input
                  type="text"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.alternatePhone ? 'border-red-300' : 'border-gray-300'
                  } px-3 py-2 focus:border-orange-400 focus:ring-orange-400`}
                  placeholder="0777654321"
                />
                {errors.alternatePhone && <p className="mt-1 text-sm text-red-600">{errors.alternatePhone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } px-3 py-2 focus:border-orange-400 focus:ring-orange-400`}
                  placeholder="customer@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* NIC Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700">NIC Number</label>
                <input
                  type="text"
                  value={formData.nicNumber}
                  onChange={(e) => setFormData({ ...formData, nicNumber: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.nicNumber ? 'border-red-300' : 'border-gray-300'
                  } px-3 py-2 focus:border-orange-400 focus:ring-orange-400`}
                  placeholder="123456789V or 123456789012"
                />
                {errors.nicNumber && <p className="mt-1 text-sm text-red-600">{errors.nicNumber}</p>}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-400 focus:ring-orange-400"
                  placeholder="Colombo"
                />
              </div>

              {/* Customer Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Type</label>
                <select
                  value={formData.customerType}
                  onChange={(e) => setFormData({ ...formData, customerType: e.target.value as 'WALK_IN' | 'REGULAR' | 'VIP' })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-400 focus:ring-orange-400"
                >
                  <option value="WALK_IN">Walk-in</option>
                  <option value="REGULAR">Regular</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-400 focus:ring-orange-400"
                  placeholder="Enter customer address"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-400 focus:ring-orange-400"
                  placeholder="Additional notes about the customer"
                />
              </div>

              {/* Is Active */}
              <div className="sm:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-400"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active Customer</span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50"
              >
                Cancel
              </button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
                {loading ? 'Saving...' : mode === 'create' ? 'Create Customer' : 'Update Customer'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerFormModal;
