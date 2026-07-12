import { Building2, Shield, CreditCard, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PlatformOverviewPage() {
  const navigate = useNavigate();

  const managementCards = [
    {
      title: 'Organizations',
      description: 'Manage all organizations, businesses, and their configurations',
      icon: Building2,
      path: '/platform/organizations',
      color: 'from-blue-500 to-blue-600',
      stats: 'View & Manage',
    },
    {
      title: 'Permissions',
      description: 'Configure roles, permissions, and access control across the platform',
      icon: Shield,
      path: '/platform/permissions',
      color: 'from-green-500 to-green-600',
      stats: 'View & Configure',
    },
    {
      title: 'Subscriptions',
      description: 'Monitor subscription plans, billing, and organization limits',
      icon: CreditCard,
      path: '/platform/subscriptions',
      color: 'from-purple-500 to-purple-600',
      stats: 'View & Manage',
    },
    {
      title: 'User Management',
      description: 'View and manage all users across all organizations',
      icon: Users,
      path: '/superadmin/staff/management',
      color: 'from-orange-500 to-orange-600',
      stats: 'View Users',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Platform Management</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Centralized control for organization management, permissions, and platform-wide settings.
        </p>
      </div>

      {/* Management Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {managementCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`p-2 sm:p-3 rounded-lg bg-linear-to-br ${card.color} flex-shrink-0`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2 group-hover:text-purple-700 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3">{card.description}</p>
                  <span className="inline-flex items-center text-sm font-medium text-purple-600 group-hover:text-purple-700">
                    {card.stats}
                    <svg
                      className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/platform/organizations')}
            className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
          >
            <p className="font-medium text-gray-900 text-sm sm:text-base">Create Organization</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Add a new business</p>
          </button>
          <button
            onClick={() => navigate('/platform/permissions')}
            className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
          >
            <p className="font-medium text-gray-900 text-sm sm:text-base">Manage Roles</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Configure permissions</p>
          </button>
          <button
            onClick={() => navigate('/superadmin/dashboard')}
            className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
          >
            <p className="font-medium text-gray-900 text-sm sm:text-base">Super Admin Dashboard</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">View operations</p>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start gap-2 sm:gap-3">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0 mt-0.5 sm:mt-1" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-purple-900 mb-1 text-sm sm:text-base">Platform-Level Access</h3>
            <p className="text-xs sm:text-sm text-purple-700">
              This section is for platform-wide management. Changes made here affect all organizations.
              Use Super Admin Dashboard for operational monitoring and day-to-day management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
