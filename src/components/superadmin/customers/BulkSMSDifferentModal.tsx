import { useState } from 'react';
import { Send, Users, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import type { FormikErrors } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import useSMS from '../../../hooks/useSMS';
import type { Customer } from '../../../types/customer.types';

interface BulkSMSDifferentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomers: Customer[];
  onSuccess?: () => void;
}

interface MessageItem {
  to: string;
  msg: string;
  customerName: string;
}

const validationSchema = Yup.object({
  messages: Yup.array()
    .of(
      Yup.object({
        to: Yup.string().required('Phone number is required'),
        msg: Yup.string()
          .min(1, 'Message is required')
          .max(1000, 'Message too long')
          .required('Message is required'),
        customerName: Yup.string().required(),
      })
    )
    .min(1, 'At least one message is required')
    .max(20, 'Maximum 20 messages allowed'),
});

const BulkSMSDifferentModal: React.FC<BulkSMSDifferentModalProps> = ({
  isOpen,
  onClose,
  selectedCustomers,
  onSuccess,
}) => {
  const { sendBulkDifferentSMS } = useSMS();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialMessages: MessageItem[] = selectedCustomers
    .filter(customer => customer.phone && customer.phone.trim() !== '')
    .map(customer => ({
      to: customer.phone,
      msg: '',
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
    }));

  const formik = useFormik({
    initialValues: {
      messages: initialMessages,
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (values.messages.length === 0) {
        toast.error('Please add at least one message');
        return;
      }

      setIsSubmitting(true);
      try {
        const msgList = values.messages.map(({ to, msg }) => ({ to, msg }));

        const result = await sendBulkDifferentSMS({
          msgList,
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]  ">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Send className="w-6 h-6 text-orange-600" />
            <DialogTitle>Send Bulk SMS (Different Messages)</DialogTitle>
          </div>
        </DialogHeader>

        <FormikProvider value={formik}>
          <form onSubmit={formik.handleSubmit} className="p-6 space-y-6">
            {/* Selected Customers Summary */}
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-900">
                  {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="text-sm text-orange-700">
                Messages to create: {initialMessages.length}
              </div>
            </div>

            {/* Messages List */}
            <FieldArray name="messages">
              {({ push, remove }) => (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Messages</h3>
                    <button
                      type="button"
                      onClick={() => push({ to: '', msg: '', customerName: '' })}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Message
                    </button>
                  </div>

                  {formik.values.messages.map((message, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Message {index + 1}
                          </span>
                          {message.customerName && (
                            <span className="text-sm text-gray-600">
                              - {message.customerName}
                            </span>
                          )}
                        </div>
                        {formik.values.messages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number *
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            {...formik.getFieldProps(`messages.${index}.to`)}
                          />
                          {formik.touched.messages?.[index]?.to && typeof formik.errors.messages?.[index] === 'object' && (formik.errors.messages[index] as FormikErrors<MessageItem>).to && (
                            <p className="mt-1 text-sm text-red-600">
                              {(formik.errors.messages[index] as FormikErrors<MessageItem>).to}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            {...formik.getFieldProps(`messages.${index}.customerName`)}
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Message *
                        </label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                          placeholder="Enter message..."
                          {...formik.getFieldProps(`messages.${index}.msg`)}
                        />
                        {formik.touched.messages?.[index]?.msg && formik.errors.messages?.[index] && (
                          <p className="mt-1 text-sm text-red-600">
                            {typeof formik.errors.messages[index] === 'object' &&
                             'msg' in formik.errors.messages[index] &&
                             (formik.errors.messages[index] as FormikErrors<MessageItem>).msg}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">
                          {formik.values.messages[index]?.msg?.length || 0}/1000 characters
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FieldArray>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting || formik.values.messages.length === 0}>
                {isSubmitting ? 'Sending...' : 'Send SMS'}
              </Button>
            </div>
          </form>
        </FormikProvider>
      </DialogContent>
    </Dialog>
  );
};

export default BulkSMSDifferentModal;