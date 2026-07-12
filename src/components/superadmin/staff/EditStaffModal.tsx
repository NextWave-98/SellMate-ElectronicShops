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
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { Staff } from '../../../types/staff.types';

interface UpdateStaffPayload {
  email?: string;
  name?: string;
  password?: string;
  roleId?: string;
  branchId?: string | null;
  isActive?: boolean;
  nicNumber?: string;
  dateOfBirth?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  additionalPhone?: string | null;
  emergencyContact?: string | null;
  emergencyName?: string | null;
  emergencyRelation?: string | null;
  qualifications?: string | null;
  experience?: string | null;
  joiningDate?: string | null;
  notes?: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface BranchesResponse {
  branches: Branch[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface StaffDetails {
  id: string;
  staffId: string;
  userId: string;
  nicNumber: string;
  dateOfBirth: string | null;
  address: string | null;
  phoneNumber: string | null;
  additionalPhone: string | null;
  emergencyContact: string | null;
  emergencyName: string | null;
  emergencyRelation: string | null;
  qualifications: string | null;
  experience: string | null;
  joiningDate: string;
  notes: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    role: {
      id: string;
      name: string;
    };
    branch?: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
}

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: string, data: UpdateStaffPayload) => Promise<void>;
  staff: Staff | null;
}

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email format')
    .optional(),
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .optional(),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .optional(),
  roleId: Yup.string()
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid role selected')
    .optional(),
  branchId: Yup.string()
    .optional(),
  isActive: Yup.boolean()
    .optional(),
  nicNumber: Yup.string()
    .matches(/^(?:\d{9}[VvXx]|\d{12})$/, 'Invalid NIC format (e.g., 123456789V or 199012345678)')
    .optional(),
  dateOfBirth: Yup.string()
    .optional(),
  address: Yup.string()
    .optional(),
  phoneNumber: Yup.string()
    .test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value))
    .optional(),
  additionalPhone: Yup.string()
    .test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value))
    .optional(),
  emergencyContact: Yup.string()
    .test('phone', 'Format: +94 XX XXX XXXX or 0XXXXXXXXX', (value) => !value || isValidSriLankaPhone(value))
    .optional(),
  emergencyName: Yup.string()
    .optional(),
  emergencyRelation: Yup.string()
    .optional(),
  qualifications: Yup.string()
    .optional(),
  experience: Yup.string()
    .optional(),
  joiningDate: Yup.string()
    .optional(),
  notes: Yup.string()
    .optional(),
});

export default function EditStaffModal({ isOpen, onClose, onSubmit, staff }: EditStaffModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffDetails, setStaffDetails] = useState<StaffDetails | null>(null);

  const rolesFetch = useFetch<Role[]>('/roles');
  const branchesFetch = useFetch<BranchesResponse>('/branches');
  const staffDetailsFetch = useFetch<StaffDetails>('/staff/details/:id');

  const formik = useFormik({
    initialValues: {
      email: '',
      name: '',
      password: '',
      roleId: '',
      branchId: '',
      isActive: true,
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
      joiningDate: '',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!staff || !staffDetails) return;

      setIsSubmitting(true);
      try {
        // Only include changed fields
        const payload: UpdateStaffPayload = {};
        
        if (values.email !== staffDetails.user.email) payload.email = values.email;
        if (values.name !== staffDetails.user.name) payload.name = values.name;
        if (values.password) payload.password = values.password; // Only if new password provided
        if (values.roleId && values.roleId !== staffDetails.user.role.id) payload.roleId = values.roleId;
        if (values.branchId !== (staffDetails.user.branch?.id || '')) {
          payload.branchId = values.branchId || null;
        }
        if (values.isActive !== staffDetails.user.isActive) payload.isActive = values.isActive;
        if (values.nicNumber !== staffDetails.nicNumber) payload.nicNumber = values.nicNumber;
        
        // Normalize date comparison and format for API
        const originalDateOfBirth = staffDetails.dateOfBirth ? new Date(staffDetails.dateOfBirth).toISOString().split('T')[0] : '';
        if (values.dateOfBirth !== originalDateOfBirth) {
          payload.dateOfBirth = values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : null;
        }
        
        if (values.address !== staffDetails.address) payload.address = values.address || null;
        
        // Normalize phones (remove spaces for API)
        if (values.phoneNumber !== staffDetails.phoneNumber) {
          payload.phoneNumber = values.phoneNumber ? formatSriLankaPhone(values.phoneNumber).replace(/\s+/g, '') : null;
        }
        if (values.additionalPhone !== staffDetails.additionalPhone) {
          payload.additionalPhone = values.additionalPhone ? formatSriLankaPhone(values.additionalPhone).replace(/\s+/g, '') : null;
        }
        if (values.emergencyContact !== staffDetails.emergencyContact) {
          payload.emergencyContact = values.emergencyContact ? formatSriLankaPhone(values.emergencyContact).replace(/\s+/g, '') : null;
        }
        
        if (values.emergencyName !== staffDetails.emergencyName) {
          payload.emergencyName = values.emergencyName || null;
        }
        if (values.emergencyRelation !== staffDetails.emergencyRelation) {
          payload.emergencyRelation = values.emergencyRelation || null;
        }
        if (values.qualifications !== staffDetails.qualifications) {
          payload.qualifications = values.qualifications || null;
        }
        if (values.experience !== staffDetails.experience) {
          payload.experience = values.experience || null;
        }
        
        // Normalize joining date
        const originalJoiningDate = staffDetails.joiningDate ? new Date(staffDetails.joiningDate).toISOString().split('T')[0] : '';
        if (values.joiningDate !== originalJoiningDate) {
          payload.joiningDate = values.joiningDate ? new Date(values.joiningDate).toISOString() : null;
        }
        
        if (values.notes !== staffDetails.notes) {
          payload.notes = values.notes || null;
        }

        await onSubmit(staff.id, payload);
        // handleClose();
      } catch (error) {
        console.error('Error in modal:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });



  const loadStaffDetails = async () => {
    if (!staff) return;
    
    setLoading(true);
    try {
      const response = await staffDetailsFetch.fetchData({
      method: 'GET',  silent: true,  
        endpoint: `/staff/details/${staff.id}`,
      });
      
      if (response?.data) {
        const details = response.data;
        setStaffDetails(details);
        
        // Populate form with existing data
        formik.resetForm({
          values: {
            email: details.user.email,
            name: details.user.name,
            password: '', // Keep empty for security
            roleId: details.user.role.id,
            branchId: details.user.branch?.id || '',
            isActive: details.user.isActive,
            nicNumber: details.nicNumber,
            dateOfBirth: details.dateOfBirth || '',
            address: details.address || '',
            phoneNumber: details.phoneNumber || '',
            additionalPhone: details.additionalPhone || '',
            emergencyContact: details.emergencyContact || '',
            emergencyName: details.emergencyName || '',
            emergencyRelation: details.emergencyRelation || '',
            qualifications: details.qualifications || '',
            experience: details.experience || '',
            joiningDate: details.joiningDate || '',
            notes: details.notes || '',
          },
        });
      }
    } catch (error) {
      console.error('Failed to load staff details:', error);
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => {
    if (isOpen && staff) {
      loadRoles();
      loadBranches();
      loadStaffDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, staff]);
  
  const loadRoles = async () => {
    try {
      const response = await rolesFetch.fetchData({method: 'GET',  silent: true, endpoint: '/roles' });
      if (response?.data) {
        console.log('All roles from API:', response.data); // Debug log
        // Filter only STAFF and MANAGER roles
        const staffRoles = response.data.roles;
        setRoles(staffRoles);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await branchesFetch.fetchData({method: 'GET',  silent: true, endpoint: '/branches' });
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
      setStaffDetails(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[min(90vh,100dvh)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="py-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">Edit Staff Member</DialogTitle>
        </DialogHeader>

        {loading ? (
          <DialogBody className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <p className="mt-2 text-gray-600">Loading staff details...</p>
            </div>
          </DialogBody>
        ) : (
          <form onSubmit={formik.handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DialogBody className="space-y-6 py-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
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
                    Email
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
                    New Password (leave empty to keep current)
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
                    NIC Number
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
                    Role
                  </label>
                  <select
                    name="roleId"
                    value={formik.values.roleId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    // disabled
                    className={`w-full px-3 bg-gray-100 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                      formik.errors.roleId && formik.touched.roleId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                  {formik.errors.roleId && formik.touched.roleId && <p className="mt-1 text-sm text-red-500">{formik.errors.roleId}</p>}
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
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
                </div> */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formik.values.dateOfBirth || ''}
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
                    value={formik.values.joiningDate || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="isActive"
                    value={formik.values.isActive ? 'active' : 'inactive'}
                    onChange={(e) => formik.setFieldValue('isActive', e.target.value === 'active')}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formik.values.address || ''}
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
                    value={formik.values.phoneNumber || ''}
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
                    value={formik.values.additionalPhone || ''}
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
                    value={formik.values.emergencyName || ''}
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
                    value={formik.values.emergencyRelation || ''}
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
                    value={formik.values.emergencyContact || ''}
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
                    value={formik.values.qualifications || ''}
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
                    value={formik.values.experience || ''}
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
                  value={formik.values.notes || ''}
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
                {isSubmitting ? 'Updating...' : 'Update Staff Member'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
