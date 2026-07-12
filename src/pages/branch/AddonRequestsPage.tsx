import { useState, useEffect } from 'react';
import { useAddonRequest } from '../../hooks/useAddonRequest';
import type { AddonRequest } from '@/types/addonRequest';
import toast from 'react-hot-toast';
import {
  PackagePlus,
  Calendar,
  User,
  Package,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '../../context/AuthContext';

const AddonRequestsPage = () => {
  const { user } = useAuth();
  const { getAllAddonRequests } = useAddonRequest();
  const [requests, setRequests] = useState<AddonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await getAllAddonRequests();
      
      if (response?.data && Array.isArray(response.data)) {
        // Filter by location for branch users
        const filteredRequests = user?.locationId 
          ? response.data.filter((req: AddonRequest) => req.locationId === user.locationId)
          : response.data;
        
        setRequests(filteredRequests);
      }
    } catch (error) {
      console.error('Error loading addon requests:', error);
      toast.error('Failed to load addon requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRequests = statusFilter === 'ALL' 
    ? requests 
    : requests.filter(req => req.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      COMPLETED: { bg: 'bg-orange-100', text: 'text-orange-800', icon: CheckCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getSMSStatusBadge = (smsSent: boolean, smsDelivered: boolean | null) => {
    if (!smsSent) {
      return <span className="text-xs text-gray-500">Not Sent</span>;
    }
    if (smsDelivered === true) {
      return <span className="text-xs text-green-600 font-semibold">✓ Delivered</span>;
    }
    if (smsDelivered === false) {
      return <span className="text-xs text-red-600 font-semibold">✗ Failed</span>;
    }
    return <span className="text-xs text-yellow-600 font-semibold">⏳ Pending</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className=" space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Addon Requests</h1>
          <p className="text-sm text-gray-600 mt-1">
            View all addon quantity requests from your location
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Label>Status:</Label>
          <div className="flex gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
            </div>
            <PackagePlus className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {requests.filter(r => r.status === 'PENDING').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {requests.filter(r => r.status === 'APPROVED').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-orange-600">
                {requests.filter(r => r.status === 'COMPLETED').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Requests List */}
      <Card className="overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <PackagePlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No addon requests found</p>
            <p className="text-sm text-gray-500 mt-2">
              {statusFilter === 'ALL' 
                ? 'Start by requesting addon quantities from the Products page'
                : `No ${statusFilter.toLowerCase()} requests`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SMS Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.Product?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Code: {request.Product?.code || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {request.User?.fullName || 'Unknown'}
                        </div>
                      </div>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSMSStatusBadge(request.smsSent, request.smsDelivered)}
                    </td>
                    <td className="px-6 py-4">
                      {request.remark ? (
                        <div className="flex items-start max-w-xs">
                          <MessageSquare className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 line-clamp-2">
                            {request.remark}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No remarks</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AddonRequestsPage;
