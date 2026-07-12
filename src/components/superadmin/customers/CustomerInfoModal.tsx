import { User, Mail, Phone, MapPin, CreditCard, Calendar, Star, ShoppingBag, DollarSign, FileText, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Customer } from '../../../types/customer.types';

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function CustomerInfoModal({ isOpen, onClose, customer }: CustomerInfoModalProps) {

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: 'bg-orange-100 text-orange-700 border-orange-300',
      silver: 'bg-gray-100 text-gray-700 border-gray-300',
      gold: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      platinum: 'bg-purple-100 text-purple-700 border-purple-300',
    };
    return colors[tier] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border-green-300',
      inactive: 'bg-gray-100 text-gray-700 border-gray-300',
      blocked: 'bg-red-100 text-red-700 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  return (
    <Dialog open={isOpen && !!customer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]  p-0">
        <DialogHeader className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">Customer Information</DialogTitle>
              <p className="text-orange-100 text-sm">{customer?.customerId}</p>
            </div>
          </div>
        </DialogHeader>

        {customer && (
          <div className="p-6 overflow-y-auto">
            {/* Status and Tier Badges */}
            <div className="flex gap-3 mb-6">
              <span className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${getStatusColor(customer.status)}`}>
                {customer.status.toUpperCase()}
              </span>
              <span className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${getTierColor(customer.tier)}`}>
                {customer.tier.toUpperCase()} TIER
              </span>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-600" />
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <InfoRow
                    label="Full Name"
                    value={`${customer.firstName} ${customer.lastName}`}
                    icon={<User className="w-4 h-4" />}
                  />
                  <InfoRow
                    label="Email"
                    value={customer.email || 'N/A'}
                    icon={<Mail className="w-4 h-4" />}
                  />
                  <InfoRow
                    label="Phone"
                    value={customer.phone}
                    icon={<Phone className="w-4 h-4" />}
                  />
                  {customer.alternatePhone && (
                    <InfoRow
                      label="Alternate Phone"
                      value={customer.alternatePhone}
                      icon={<Phone className="w-4 h-4" />}
                    />
                  )}
                  {customer.nic && (
                    <InfoRow
                      label="NIC Number"
                      value={customer.nic}
                      icon={<CreditCard className="w-4 h-4" />}
                    />
                  )}
                  {customer.dateOfBirth && (
                    <InfoRow
                      label="Date of Birth"
                      value={formatDate(customer.dateOfBirth)}
                      icon={<Calendar className="w-4 h-4" />}
                    />
                  )}
                </div>
              </div>

              {/* Location & Address */}
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  Location & Address
                </h3>
                <div className="space-y-3">
                  {customer.location && (
                    <>
                      <InfoRow
                        label="Branch Location"
                        value={customer.location.name}
                        icon={<Building2 className="w-4 h-4" />}
                        highlight
                      />
                      <InfoRow
                        label="Branch Address"
                        value={customer.location.address}
                        icon={<MapPin className="w-4 h-4" />}
                      />
                    </>
                  )}
                  <InfoRow
                    label="City"
                    value={customer.city || 'N/A'}
                    icon={<MapPin className="w-4 h-4" />}
                  />
                  {customer.address && (
                    <InfoRow
                      label="Address"
                      value={customer.address}
                      icon={<MapPin className="w-4 h-4" />}
                    />
                  )}
                  {customer.postalCode && (
                    <InfoRow
                      label="Postal Code"
                      value={customer.postalCode}
                      icon={<MapPin className="w-4 h-4" />}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Purchase & Loyalty Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={<Star className="w-6 h-6 text-yellow-500" />}
                label="Loyalty Points"
                value={customer.loyaltyPoints.toLocaleString()}
                color="yellow"
              />
              <StatCard
                icon={<ShoppingBag className="w-6 h-6 text-orange-400" />}
                label="Total Purchases"
                value={customer.totalPurchases.toString()}
                color="blue"
              />
              <StatCard
                icon={<DollarSign className="w-6 h-6 text-green-500" />}
                label="Total Spent"
                value={formatCurrency(customer.totalSpent)}
                color="green"
              />
            </div>

            {/* Dates */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Important Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  label="Registered Date"
                  value={formatDate(customer.registeredDate)}
                  icon={<Calendar className="w-4 h-4" />}
                />
                {customer.lastPurchaseDate && (
                  <InfoRow
                    label="Last Purchase"
                    value={formatDate(customer.lastPurchaseDate)}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                )}
                <InfoRow
                  label="Last Updated"
                  value={formatDate(customer.updatedAt)}
                  icon={<Calendar className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Notes */}
            {customer.notes && (
              <div className="bg-amber-50 rounded-lg p-5 border border-amber-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  Notes
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="bg-orange-600 hover:bg-orange-700 text-white">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function InfoRow({ label, value, icon, highlight = false }: InfoRowProps) {
  return (
    <div className={`flex items-start gap-3 ${highlight ? 'bg-orange-50 -mx-2 px-2 py-2 rounded-md' : ''}`}>
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm ${highlight ? 'font-semibold text-orange-900' : 'text-gray-900'} mt-0.5 break-words`}>
          {value}
        </p>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'yellow' | 'blue' | 'green';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 border-2`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
