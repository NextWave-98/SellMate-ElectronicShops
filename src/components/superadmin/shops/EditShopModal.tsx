import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Shop, UpdateShopDTO } from '../../../types/shop.types';
import type { Location, UpdateLocationDTO } from '../../../types/location.types';
import { formatSriLankaPhone, isValidSriLankaPhone, toLocalSriLankaPhone } from '../../../utils/phone';

type ShopOrLocation = Shop | Location;

interface EditShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateShopDTO | UpdateLocationDTO) => Promise<void>;
  shop: ShopOrLocation | null;
}

export default function EditShopModal({ isOpen, onClose, onSubmit, shop }: EditShopModalProps) {
  const [formData, setFormData] = useState<UpdateShopDTO>({
    name: '',
    code: '',
    address: '',
    phone: '',
    phone2: '',
    phone3: '',
    email: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UpdateShopDTO, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load shop data when modal opens
  useEffect(() => {
    if (shop && isOpen) {
      const shopCode = 'locationCode' in shop ? shop.locationCode : shop.code;
      setFormData({
        name: shop.name,
        code: shopCode,
        address: shop.address || '',
        // Convert +94 to 0-prefixed numbers for easier editing in UI
        phone: shop.phone ? toLocalSriLankaPhone(shop.phone) : '',
        phone2: shop.phone2 ? toLocalSriLankaPhone(shop.phone2) : '',
        phone3: shop.phone3 ? toLocalSriLankaPhone(shop.phone3) : '',
        email: shop.email || '',
        isActive: shop.isActive,
      });
      setErrors({});
    }
  }, [shop, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdateShopDTO, string>> = {};

    // Name validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Branch name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Branch name must be at least 2 characters';
    }

    // Phone validation (optional)
    if (formData.phone && !isValidSriLankaPhone(formData.phone)) {
      newErrors.phone = 'Format: +94 XX XXX XXXX or 0XXXXXXXXX';
    }

    // Phone2 validation (optional)
    if (formData.phone2 && !isValidSriLankaPhone(formData.phone2)) {
      newErrors.phone2 = 'Format: +94 XX XXX XXXX or 0XXXXXXXXX';
    }

    // Phone3 validation (optional)
    if (formData.phone3 && !isValidSriLankaPhone(formData.phone3)) {
      newErrors.phone3 = 'Format: +94 XX XXX XXXX or 0XXXXXXXXX';
    }

    // At least one phone is required
    if (!formData.phone && !formData.phone2 && !formData.phone3) {
      newErrors.phone = 'At least one phone number is required';
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

    if (!validateForm() || !shop) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Normalize phone numbers to +94 format before sending to backend
      const payload: UpdateShopDTO = {
        ...formData,
        phone: formData.phone ? formatSriLankaPhone(formData.phone) : formData.phone,
        phone2: formData.phone2 ? formatSriLankaPhone(formData.phone2) : formData.phone2,
        phone3: formData.phone3 ? formatSriLankaPhone(formData.phone3) : formData.phone3,
      };

      await onSubmit(shop.id, payload);
      handleClose();
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        code: '',
        address: '',
        phone: '',
        phone2: '',
        phone3: '',
        email: '',
        isActive: true,
      });
      setErrors({});
      onClose();
    }
  };

  const handleChange = (field: keyof UpdateShopDTO, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof typeof errors];
        return newErrors;
      });
    }

    // Clear the group-level phone error when any phone field is edited
    if ((field === 'phone' || field === 'phone2' || field === 'phone3') && errors.phone) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };

  if (!isOpen || !shop) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !isSubmitting && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]  p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 sticky top-0 z-10 shrink-0 bg-transparent">
          <DialogTitle className="text-2xl font-bold text-gray-900">Edit Branch</DialogTitle>
        </div>

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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent 
                    border-gray-300 border-dashed text-gray-500 bg-gray-100 cursor-not-allowed
                  `}
                  placeholder="COL0001"
                  disabled
                />
                {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="123 Main Street, Colombo 03"
                  disabled={isSubmitting}
                  rows={3}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
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

              {/* Status */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-400"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm font-medium text-gray-700">Branch is Active</span>
                </label>
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
                {isSubmitting ? 'Updating...' : 'Update Branch'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}
