import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CreateShopDTO } from '../../../types/shop.types';
import { formatSriLankaPhone, isValidSriLankaPhone } from '../../../utils/phone';

interface AddShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateShopDTO) => Promise<void>;
}

export default function AddShopModal({ isOpen, onClose, onSubmit }: AddShopModalProps) {
  const [formData, setFormData] = useState<CreateShopDTO>({
    name: '',
    address: '',
    phone: '',
    phone2: '',
    phone3: '',
    email: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateShopDTO, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateShopDTO, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Branch name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Branch name must be at least 2 characters';
    }

    // Phone validation (optional) - accept +94 or 0XXXXXXXXX
    if (formData.phone && !isValidSriLankaPhone(formData.phone)) {
      newErrors.phone = 'Format: +94 XX XXX XXXX or 0XXXXXXXXX';
    }

    // Phone2 validation (optional)
    if (formData.phone2 && !isValidSriLankaPhone(formData.phone2)) {
      newErrors.phone2 = 'Format: +94 XX XXX XXXX or 0XXXXXXXXX';
    }

    // At least one phone is required
    if (!formData.phone && !formData.phone2 && !formData.phone3) {
      // attach to primary phone field so it appears under the first phone input
      newErrors.phone = 'At least one phone number is required';
    }

    // Phone3 validation (optional)
    if (formData.phone3 && !isValidSriLankaPhone(formData.phone3)) {
      newErrors.phone3 = 'Format: +94 XX XXX XXXX or 0XXXXXXXXX';
    }

    // Email validation (optional)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Normalize phones before sending to backend
      const payload: CreateShopDTO = {
        ...formData,
        phone: formData.phone ? formatSriLankaPhone(formData.phone) : formData.phone,
        phone2: formData.phone2 ? formatSriLankaPhone(formData.phone2) : formData.phone2,
        phone3: formData.phone3 ? formatSriLankaPhone(formData.phone3) : formData.phone3,
      };

      await onSubmit(payload);
      // handleClose();
    } catch (error) {
      // Error is handled by parent component
      console.error('Error in modal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        address: '',
        phone: '',
        phone2: '',
        phone3: '',
        email: '',
      });
      setErrors({});
      onClose();
    }
  };

  const handleChange = (field: keyof CreateShopDTO, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // If user edits any phone field, clear the group-level "at least one" error
    if ((field === 'phone' || field === 'phone2' || field === 'phone3') && errors.phone) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl p-0  ">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Add New Branch</DialogTitle>
        </DialogHeader>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branch Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Colombo Main Branch"
                  disabled={isSubmitting}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              {/* Branch Code */}
              {/* <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Code (Optional - Auto-generated if not provided)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="COL0001 (Leave empty for auto-generation)"
                  disabled={isSubmitting}
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-500">{errors.code}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  If not provided, code will be auto-generated from branch name
                </p>
              </div> */}

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="123 Galle Road, Colombo 03"
                  disabled={isSubmitting}
                />
                {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
              </div>

              {/* Phone 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number 1
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+94 11 234 5678"
                  disabled={isSubmitting}
                />
           
                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                {/* {!errors.phone && <p className="mt-1 text-xs text-gray-500">Accepts <code>+94 XX XXX XXXX</code> or <code>0XXXXXXXXX</code> (will be normalized)</p>} */}
              </div>

              {/* Phone 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number 2
                </label>
                <input
                  type="tel"
                  value={formData.phone2}
                  onChange={(e) => handleChange('phone2', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.phone2 ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+94 77 123 4567"
                  disabled={isSubmitting}
                />
                {errors.phone2 && <p className="mt-1 text-sm text-red-500">{errors.phone2}</p>}
                {/* {!errors.phone2 && <p className="mt-1 text-xs text-gray-500">Accepts <code>+94 XX XXX XXXX</code> or <code>0XXXXXXXXX</code></p>} */}
              </div>

              {/* Phone 3 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number 3
                </label>
                <input
                  type="tel"
                  value={formData.phone3}
                  onChange={(e) => handleChange('phone3', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.phone3 ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+94 76 234 5678"
                  disabled={isSubmitting}
                />
                {errors.phone3 && <p className="mt-1 text-sm text-red-500">{errors.phone3}</p>}
                {/* {!errors.phone3 && <p className="mt-1 text-xs text-gray-500">Accepts <code>+94 XX XXX XXXX</code> or <code>0XXXXXXXXX</code></p>} */}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="colombo@lankatech.lk"
                  disabled={isSubmitting}
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
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
                {isSubmitting ? 'Creating...' : 'Create Branch'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}
