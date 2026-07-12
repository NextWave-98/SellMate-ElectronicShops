import { StaffRole } from '../../../types/staff.types';
import { Shield, UserCog, Briefcase, Wrench, ShoppingBag, DollarSign, Package } from 'lucide-react';

interface StaffRoleBadgeProps {
  role: StaffRole;
}

export default function StaffRoleBadge({ role }: StaffRoleBadgeProps) {
  const getRoleConfig = () => {
    switch (role) {
      case StaffRole.SUPER_ADMIN:
        return {
          text: 'Super Admin',
          icon: Shield,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case StaffRole.ADMIN:
        return {
          text: 'Admin',
          icon: UserCog,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
        };
      case StaffRole.MANAGER:
        return {
          text: 'Manager',
          icon: Briefcase,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
        };
      case StaffRole.TECHNICIAN:
        return {
          text: 'Technician',
          icon: Wrench,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
        };
      case StaffRole.SALES_PERSON:
        return {
          text: 'Sales Person',
          icon: ShoppingBag,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case StaffRole.CASHIER:
        return {
          text: 'Cashier',
          icon: DollarSign,
          color: 'text-teal-600',
          bgColor: 'bg-teal-50',
          borderColor: 'border-teal-200',
        };
      case StaffRole.STOCK_KEEPER:
        return {
          text: 'Stock Keeper',
          icon: Package,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
        };
      default:
        return {
          text: role,
          icon: UserCog,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const config = getRoleConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      <Icon className="w-3 h-3" />
      {config.text}
    </span>
  );
}
