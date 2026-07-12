import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Building2, 
  Shield, 
  CreditCard, 
  Settings, 
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft
} from 'lucide-react';

interface PlatformSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/platform/overview',
    icon: LayoutDashboard,
  },
  {
    id: 'organizations',
    label: 'Organizations',
    path: '/platform/organizations',
    icon: Building2,
  },
  {
    id: 'permissions',
    label: 'Permissions',
    path: '/platform/permissions',
    icon: Shield,
  },
  {
    id: 'roles',
    label: 'Roles',
    path: '/platform/roles',
    icon: Shield,
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    path: '/platform/subscriptions',
    icon: CreditCard,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/platform/settings',
    icon: Settings,
  },
];

export default function PlatformSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
}: PlatformSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          bg-gradient-to-b from-purple-900 to-purple-800 text-white
          h-screen sticky top-0 transition-all duration-300 flex-col border-r border-purple-700 shadow-sm
          hidden lg:flex
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-purple-700">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <div>
                  <h1 className="text-xl font-bold">Platform</h1>
                  <p className="text-xs text-purple-200">Management Console</p>
                </div>
              )}
              <button
                onClick={() => onToggleCollapse(!isCollapsed)}
                className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Back to Super Admin */}
          {/* <div className="p-4 border-b border-purple-700">
            <Link
              to="/superadmin/dashboard"
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg
                hover:bg-purple-700 transition-colors
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title="Back to Super Admin Dashboard"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm">Super Admin Dashboard</span>}
            </Link>
          </div> */}

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleMenuClick(item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-lg
                        transition-all duration-200
                        ${isCollapsed ? 'justify-center' : ''}
                        ${
                          active
                            ? 'bg-purple-700 text-white shadow-lg'
                            : 'text-purple-100 hover:bg-purple-700/50 hover:text-white'
                        }
                      `}
                      title={isCollapsed ? item.label : ''}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium">{item.label}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`
          fixed top-0 z-50 md:z-auto left-0 h-full w-64 bg-gradient-to-b from-purple-900 to-purple-800 text-white
          transform transition-transform duration-300 z-50
          lg:hidden
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="p-4 border-b border-purple-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Platform</h1>
                <p className="text-xs text-purple-200">Management Console</p>
              </div>
              <button
                onClick={onMobileClose}
                className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Back to Super Admin */}
          <div className="p-4 border-b border-purple-700">
            <Link
              to="/superadmin/dashboard"
              onClick={onMobileClose}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Super Admin Dashboard</span>
            </Link>
          </div>

          {/* Mobile Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleMenuClick(item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-lg
                        transition-all duration-200
                        ${
                          active
                            ? 'bg-purple-700 text-white shadow-lg'
                            : 'text-purple-100 hover:bg-purple-700/50 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
