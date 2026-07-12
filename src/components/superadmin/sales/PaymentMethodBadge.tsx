import { PaymentMethod } from '../../../types/sales.types';
import { Banknote, CreditCard, Building2, Smartphone, Receipt } from 'lucide-react';

interface PaymentMethodBadgeProps {
  method: PaymentMethod;
}

export default function PaymentMethodBadge({ method }: PaymentMethodBadgeProps) {
  const getMethodConfig = () => {
    switch (method) {
      case PaymentMethod.CASH:
        return {
          text: 'Cash',
          icon: Banknote,
          color: 'text-green-700',
          bgColor: 'bg-green-50',
        };
      case PaymentMethod.CARD:
        return {
          text: 'Card',
          icon: CreditCard,
          color: 'text-orange-700',
          bgColor: 'bg-orange-50',
        };
      case PaymentMethod.BANK_TRANSFER:
        return {
          text: 'Bank Transfer',
          icon: Building2,
          color: 'text-purple-700',
          bgColor: 'bg-purple-50',
        };
      case PaymentMethod.MOBILE_PAYMENT:
        return {
          text: 'Mobile Payment',
          icon: Smartphone,
          color: 'text-indigo-700',
          bgColor: 'bg-indigo-50',
        };
      case PaymentMethod.CREDIT:
        return {
          text: 'Credit',
          icon: Receipt,
          color: 'text-orange-700',
          bgColor: 'bg-orange-50',
        };
      default:
        return {
          text: method,
          icon: Receipt,
          color: 'text-gray-700',
          bgColor: 'bg-gray-50',
        };
    }
  };

  const config = getMethodConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.bgColor} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.text}
    </span>
  );
}
