import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatSriLankaPhone, isValidSriLankaPhone } from '../../../utils/phone';
import useFetch from '../../../hooks/useFetch';
import { usePermissions } from '../../../hooks/usePermissions';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface CreateStaffPayload {
  email: string;
  name: string;
  password: string;
  roleId: string;
  locationId?: string;
  nicNumber: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  additionalPhone?: string;
  emergencyContact?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  qualifications?: string;
  experience?: string;
  joiningDate?: string;
  notes?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Branch {
  id: string;
  name: string;
  locationCode: string;
  branchCode?: string | null;
}

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStaffPayload) => Promise<void>;
}

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email format').required('Email is required'),
  name: Yup.string().min(2, 'Name must be at least 2 characters').required('Name is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  roleId: Yup.string().required('Role is required'),
  nicNumber: Yup.string().matches(/^(?:\d{9}[VvXx]|\d{12})$/, 'Invalid NIC format (e.g., 123456789V or 199012345678)').required('NIC number is required'),
  phoneNumber: Yup.string().test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value)),
  additionalPhone: Yup.string().test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value)),
  emergencyContact: Yup.string().test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value)),
});

export default function AddStaffModal({ isOpen, onClose, onSubmit }: AddStaffModalProps) {
  const { isAdmin, isSuperAdmin } = usePermissions();
  const canAssignAdminRole = isAdmin || isSuperAdmin;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const rolesFetch = useFetch<{roles: Role[]}>('/roles');
  const branchesFetch = useFetch<{locations: Branch[]}>('/locations');
  const myBranchesFetch = useFetch<Array<{ locationId: string; name: string; locationCode: string }>>('/staff/me/branches');

  const formik = useFormik({
    initialValues: {
      email: '',
      name: '',
      password: '',
      roleId: '',
      locationId: '',
      nicNumber: '',
      dateOfBirth: '',
      address: '',
      phoneNumber: '',
      additionalPhone: '',
      emergencyContact: '',
      emergencyName: '',
      emergencyRelation: '',
      qualifications: '',
      experience: '',
      joiningDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        const payload: CreateStaffPayload = {
          ...values,
          phoneNumber: values.phoneNumber ? formatSriLankaPhone(values.phoneNumber).replace(/\s+/g, '') : undefined,
          additionalPhone: values.additionalPhone ? formatSriLankaPhone(values.additionalPhone).replace(/\s+/g, '') : undefined,
          emergencyContact: values.emergencyContact ? formatSriLankaPhone(values.emergencyContact).replace(/\s+/g, '') : undefined,
          locationId: values.locationId || undefined,
          dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : undefined,
          joiningDate: values.joiningDate ? new Date(values.joiningDate).toISOString() : undefined,
        };

        await onSubmit(payload);
      } catch (error) {
        console.error('Error in modal:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadRoles();
      loadBranches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadRoles = async () => {
    try {
      const response = await rolesFetch.fetchData({method: 'GET',  silent: true, endpoint: '/roles' });
      if (response?.data?.roles) {
        const availableRoles = canAssignAdminRole
          ? response.data.roles
          : response.data.roles.filter((role) => !['ADMIN', 'SUPER_ADMIN'].includes(role.name.toUpperCase()));
        setRoles(availableRoles);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadBranches = async () => {
    try {
      if (canAssignAdminRole) {
        const response = await branchesFetch.fetchData({method: 'GET',  silent: true, endpoint: '/locations?branch=branch' });
        if (response?.data?.locations) {
          setBranches(response.data.locations);
        }
        return;
      }

      const response = await myBranchesFetch.fetchData({ method: 'GET', silent: true, endpoint: '/staff/me/branches' });
      const assigned = (response?.data as Array<{ locationId: string; name: string; locationCode: string }> | undefined) || [];
      setBranches(assigned.map((branch) => ({
        id: branch.locationId,
        name: branch.name,
        locationCode: branch.locationCode,
      })));
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[min(90vh,100dvh)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="py-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">Add New Staff Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogBody className="space-y-6 py-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
                  placeholder="e.g., Saman Kumara"
                />
                {formik.errors.name && formik.touched.name && <p className="mt-1 text-sm text-red-500">{formik.errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.email && formik.touched.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="staff@lankatech.lk"
                />
                {formik.errors.email && formik.touched.email && <p className="mt-1 text-sm text-red-500">{formik.errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.password && formik.touched.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Minimum 6 characters"
                />
                {formik.errors.password && formik.touched.password && <p className="mt-1 text-sm text-red-500">{formik.errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIC Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nicNumber"
                  value={formik.values.nicNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.nicNumber && formik.touched.nicNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="123456789V or 199012345678"
                />
                {formik.errors.nicNumber && formik.touched.nicNumber && <p className="mt-1 text-sm text-red-500">{formik.errors.nicNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  name="roleId"
                  value={formik.values.roleId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.roleId && formik.touched.roleId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} 
                    </option>
                  ))}
                </select>
                {formik.errors.roleId && formik.touched.roleId && <p className="mt-1 text-sm text-red-500">{formik.errors.roleId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  name="locationId"
                  value={formik.values.locationId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Select branch (optional)</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.branchCode || branch.locationCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formik.values.dateOfBirth}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formik.values.joiningDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                name="address"
                value={formik.values.address}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Full address"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formik.values.phoneNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.phoneNumber && formik.touched.phoneNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+94 77 123 4567 or 0771234567"
                />
                {formik.errors.phoneNumber && formik.touched.phoneNumber && <p className="mt-1 text-sm text-red-500">{formik.errors.phoneNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Phone
                </label>
                <input
                  type="text"
                  name="additionalPhone"
                  value={formik.values.additionalPhone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.additionalPhone && formik.touched.additionalPhone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+94 77 123 4567 or 0771234567"
                />
                {formik.errors.additionalPhone && formik.touched.additionalPhone && <p className="mt-1 text-sm text-red-500">{formik.errors.additionalPhone}</p>}
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="emergencyName"
                  value={formik.values.emergencyName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g., Nimal Kumara"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  name="emergencyRelation"
                  value={formik.values.emergencyRelation}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g., Brother, Father"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formik.values.emergencyContact}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                    formik.errors.emergencyContact && formik.touched.emergencyContact ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+94 77 123 4567 or 0771234567"
                />
                {formik.errors.emergencyContact && formik.touched.emergencyContact && <p className="mt-1 text-sm text-red-500">{formik.errors.emergencyContact}</p>}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qualifications
                </label>
                <textarea
                  name="qualifications"
                  value={formik.values.qualifications}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Educational qualifications and certifications"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience
                </label>
                <textarea
                  name="experience"
                  value={formik.values.experience}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Previous work experience"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formik.values.notes}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Any additional notes"
              />
            </div>
          </div>

          </DialogBody>

          <DialogFooter className="border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSubmitting ? 'Adding...' : 'Add Staff Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
