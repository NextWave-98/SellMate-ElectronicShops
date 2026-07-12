import { useState } from 'react';
import { MapPin, Phone, Mail, Calendar, Users, Package, FileText, ShoppingCart, Eye, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Location } from '../../../types/location.types';

interface ExtendedLocation extends Omit<Location, '_count'> {
  city?: string;
  phone2?: string | null;
  phone3?: string | null;
  warehouseId?: string | null;
  branchId?: string | null;
  _count?: {
    productInventory?: number;
    jobSheets?: number;
    sales?: number;
    users?: number;
  };
  users?: Array<{
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    lastLogin?: string | null;
    createdAt: string;
    role: {
      id: string;
      name: string;
      description?: string | null;
    };
  }>;
}

interface ViewShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ExtendedLocation | null;
  onAddBranch?: () => void;
  onViewBranch?: (branchId: string) => void;
}

export default function ViewShopModal({ isOpen, onClose, shop, onAddBranch, onViewBranch }: ViewShopModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'users' | 'stats'>('details');

  if (!isOpen || !shop) return null;

  // Use the shop directly since it's already ExtendedLocation
  const shopData = shop;

  const tabs = [
    { id: 'details', label: 'Details', icon: MapPin },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'stats', label: 'Statistics', icon: Package },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0  ">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="shrink-0 h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <DialogTitle className="text-lg font-medium text-gray-900">{shopData.name}</DialogTitle>
                <p className="text-sm text-gray-500">{shopData.locationCode} • {shopData.locationType}</p>
              </div>
            </div>
          </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'details' | 'users' | 'stats')}
                      className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-orange-400 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-96">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Address:</span>
                          <span className="text-sm text-gray-900 ml-2">{shopData.address || 'N/A'}</span>
                        </div>
                        {shopData.city && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">City:</span>
                            <span className="text-sm text-gray-900 ml-2">{shopData.city}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Phone:</span>
                          <span className="text-sm text-gray-900 ml-2">{shopData.phone || 'N/A'}</span>
                        </div>
                        {shopData.phone2 && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Phone 2:</span>
                            <span className="text-sm text-gray-900 ml-2">{shopData.phone2}</span>
                          </div>
                        )}
                        {shopData.phone3 && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Phone 3:</span>
                            <span className="text-sm text-gray-900 ml-2">{shopData.phone3}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Email:</span>
                          <span className="text-sm text-gray-900 ml-2">{shopData.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Status & Timestamps</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${shopData.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className={`text-sm ml-2 ${shopData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {shopData.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Created:</span>
                          <span className="text-sm text-gray-900 ml-2">
                            {new Date(shopData.createdAt).toLocaleDateString()} {new Date(shopData.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Updated:</span>
                          <span className="text-sm text-gray-900 ml-2">
                            {new Date(shopData.updatedAt).toLocaleDateString()} {new Date(shopData.updatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Relations */}
                  {(shopData.warehouseId || shopData.branchId) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Relations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shopData.warehouseId && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600">Warehouse ID</div>
                            <div className="text-sm font-mono text-gray-900">{shopData.warehouseId}</div>
                          </div>
                        )}
                        {shopData.branchId && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600">Branch ID</div>
                            <div className="text-sm font-mono text-gray-900">{shopData.branchId}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'users' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Assigned Users ({shopData.users?.length || 0})</h4>
                    {/* {onAddBranch && (
                      <button
                        onClick={onAddBranch}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-orange-600 hover:bg-orange-700"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add User
                      </button>
                    )} */}
                  </div>

                  {shopData.users && shopData.users.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {shopData.users?.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{user.role?.name || 'N/A'}</div>
                                {user.role?.description && (
                                  <div className="text-xs text-gray-500">{user.role.description}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No users assigned</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by adding a user to this location.</p>
                      {/* {onAddBranch && (
                        <div className="mt-6">
                          <button
                            onClick={onAddBranch}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add User
                          </button>
                        </div>
                      )} */}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <h4 className="text-sm font-medium text-gray-900">Location Statistics</h4>

                  {shopData._count ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-orange-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <Package className="w-8 h-8 text-orange-600" />
                          <div className="ml-4">
                            <div className="text-2xl font-bold text-orange-900">{shopData._count.productInventory || 0}</div>
                            <div className="text-sm text-orange-600">Products in Inventory</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <FileText className="w-8 h-8 text-green-600" />
                          <div className="ml-4">
                            <div className="text-2xl font-bold text-green-900">{shopData._count.jobSheets || 0}</div>
                            <div className="text-sm text-green-600">Job Sheets</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <ShoppingCart className="w-8 h-8 text-purple-600" />
                          <div className="ml-4">
                            <div className="text-2xl font-bold text-purple-900">{shopData._count.sales || 0}</div>
                            <div className="text-sm text-purple-600">Sales</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No statistics available</h3>
                      <p className="mt-1 text-sm text-gray-500">Statistics data is not available for this location.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              type="button"
              onClick={onClose}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Close
            </Button>
            {/* {shopData.locationType === 'BRANCH' && onViewBranch && shopData.branchId && (
              <button
                type="button"
                onClick={() => onViewBranch(shopData.branchId!)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Branch Details
              </button>
            )} */}
          </div>
      </DialogContent>
    </Dialog>
  );
}