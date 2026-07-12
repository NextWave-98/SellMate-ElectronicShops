import toast from 'react-hot-toast';

const alert = {
  success: (message: string) => {
    toast.success(message);
  },
  error: (message: string) => {
    toast.error(message);
  },
  warn: (message: string) => {
    toast.error(message, {
      icon: '⚠️',
    });
  },
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
    });
  },
};

export default alert;

