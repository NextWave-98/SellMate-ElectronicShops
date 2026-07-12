import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CreateDeviceData } from '../../../hooks/useDevice';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDeviceData) => Promise<void>;
  customerId: string;
  customerName: string;
}

const DEVICE_TYPES = [
  { value: 'MOBILE', label: 'Mobile Phone' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'SMARTWATCH', label: 'Smart Watch' },
  { value: 'OTHER', label: 'Other' },
];

export default function AddDeviceModal({
  isOpen,
  onClose,
  onSubmit,
  customerId,
  customerName,
}: AddDeviceModalProps) {
  const [formData, setFormData] = useState<CreateDeviceData>({
    customerId,
    deviceType: 'MOBILE',
    brand: '',
    model: '',
    serialNumber: null,
    imei: null,
    purchaseDate: null,
    warrantyExpiry: null,
    notes: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        customerId,
        deviceType: 'MOBILE',
        brand: '',
        model: '',
        serialNumber: null,
        imei: null,
        purchaseDate: null,
        warrantyExpiry: null,
        notes: null,
      });
    }
  }, [isOpen, customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert date-only values (YYYY-MM-DD) to ISO datetimes required by the API
      const submitData: CreateDeviceData = {
        ...formData,
        purchaseDate: formData.purchaseDate ? `${formData.purchaseDate}T00:00:00Z` : null,
        warrantyExpiry: formData.warrantyExpiry ? `${formData.warrantyExpiry}T00:00:00Z` : null,
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Failed to register device:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || null,
    }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]  ">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4">
          <div className="flex items-center">
            <Smartphone className="w-6 h-6 text-orange-600 mr-2" />
            <div>
              <DialogTitle>Register New Device</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">Customer: {customerName}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Device Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Type <span className="text-red-500">*</span>
            </label>
            <select
              name="deviceType"
              value={formData.deviceType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {DEVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
                placeholder="e.g., Apple, Samsung, HP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                placeholder="e.g., iPhone 14 Pro, Galaxy S23"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Serial Number & IMEI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber || ''}
                onChange={handleChange}
                placeholder="Device serial number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IMEI Number
              </label>
              <input
                type="text"
                name="imei"
                value={formData.imei || ''}
                onChange={handleChange}
                placeholder="For mobile devices"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Purchase Date & Warranty Expiry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warranty Expiry
              </label>
              <input
                type="date"
                name="warrantyExpiry"
                value={formData.warrantyExpiry || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={3}
              placeholder="Any additional information about the device..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
              {loading ? 'Registering...' : 'Register Device'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
