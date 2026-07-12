import { Building2, Users, MapPin, Package, Mail, Phone, Globe, Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Organization } from '../../../types/organization.types';

interface ViewOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization | null;
}

export default function ViewOrganizationModal({ isOpen, onClose, organization }: ViewOrganizationModalProps) {
  if (!isOpen || !organization) return null;

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]  p-0">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {organization.name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                    organization.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {organization.isActive ? 'Active' : 'Suspended'}
                </span>
                {organization.businessType && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    • {organization.businessType}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Users</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {organization._count?.users || 0}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Locations</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {organization._count?.locations || 0}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Products</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {organization._count?.products || 0}
                </p>
              </div>

            </div>

            {/* Business Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                Business Information
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-gray-900 dark:text-white">{organization.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="text-gray-900 dark:text-white">{organization.telephone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                      <p className="text-gray-900 dark:text-white">
                        {[organization.address, organization.city, organization.province]
                          .filter(Boolean)
                          .join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Website</p>
                      <p className="text-gray-900 dark:text-white">{organization.website || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Details */}
            {organization.owner && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                  Owner Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        {organization.owner.firstName?.[0]}{organization.owner.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {organization.owner.firstName} {organization.owner.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {organization.owner.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Details */}
            {organization.subscription && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                  Subscription Details
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {organization.subscription.planName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {organization.subscription.billingCycle}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                        organization.subscription.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : organization.subscription.status === 'EXPIRED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {organization.subscription.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formatDate(organization.subscription.startDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">End Date</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formatDate(organization.subscription.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Locations */}
            {organization.locations && organization.locations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                  Locations ({organization.locations.length})
                </h3>
                <div className="space-y-2">
                  {organization.locations.map((location) => (
                    <div
                      key={location.id}
                      className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{location.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {[location.city, location.address].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                          location.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Created: {formatDate(organization.createdAt)}</span>
                <span>Updated: {formatDate(organization.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
