import { useState } from 'react';
import { Send, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import useSMS from '../../../hooks/useSMS';
import type { Customer } from '../../../types/customer.types';

interface BulkSMSSameModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomers: Customer[];
  onSuccess?: () => void;
}

const validationSchema = Yup.object({
  message: Yup.string()
    .min(1, 'Message is required')
    .max(1000, 'Message too long')
    .required('Message is required'),
});

const BulkSMSSameModal: React.FC<BulkSMSSameModalProps> = ({
  isOpen,
  onClose,
  selectedCustomers,
  onSuccess,
}) => {
  const { sendBulkSameSMS } = useSMS();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      message: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (selectedCustomers.length === 0) {
        toast.error('Please select at least one customer');
        return;
      }

      setIsSubmitting(true);
      try {
        const phoneNumbers = selectedCustomers
          .map(customer => customer.phone)
          .filter(phone => phone && phone.trim() !== '');

        if (phoneNumbers.length === 0) {
          toast.error('No valid phone numbers found');
          return;
        }

        const result = await sendBulkSameSMS({
          to: phoneNumbers,
          msg: values.message,
        });

        if (result?.success) {
          const smsResult = result.data as { deliveryWarning?: boolean };
          if (smsResult?.deliveryWarning) {
            toast.success('SMS request sent, but delivery may be delayed. Please check your SMS account balance and sender ID approval.', {
              duration: 6000,
            });
          } else {
            toast.success('Bulk SMS sent successfully');
          }
          onClose();
          onSuccess?.();
        } else {
          toast.error(result?.message || 'Failed to send SMS');
        }
      } catch (error) {
        console.error('Bulk SMS error:', error);
        toast.error('Failed to send bulk SMS');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]  ">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-orange-600" />
            <DialogTitle>Send Bulk SMS (Same Message)</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="space-y-6">
          {/* Selected Customers Summary */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-900">
                {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="text-sm text-orange-700">
              Valid phone numbers: {selectedCustomers.filter(c => c.phone && c.phone.trim() !== '').length}
            </div>
          </div>

          {/* Message Input */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
              placeholder="Enter your message..."
              value={formik.values.message}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.message && formik.errors.message && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formik.values.message.length}/1000 characters
            </p>
          </div>

          {/* Cost Check Option */}
          {/* Cost estimation not supported by current SMS provider */}
          
          {/* Cost Estimate Display */}
          {/* Cost estimation not supported by current SMS provider */}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting || selectedCustomers.length === 0}>
              {isSubmitting ? 'Sending...' : 'Send SMS'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkSMSSameModal;