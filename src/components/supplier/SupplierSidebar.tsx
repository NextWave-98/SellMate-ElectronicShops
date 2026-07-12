import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiShoppingBag,
  FiDollarSign,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import { useSupplierAuth } from '../../hooks';

interface SupplierSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const SupplierSidebar = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}: SupplierSidebarProps) => {
  const { logout, getStoredSupplier } = useSupplierAuth();
  const supplier = getStoredSupplier();
  const showExpanded = isMobileOpen || !isCollapsed;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/supplier/login';
    }
  };

  const menuItems = [
    {
      path: '/supplier/dashboard',
      icon: <FiHome size={20} />,
      label: 'Dashboard',
    },
    {
      path: '/supplier/purchase-orders',
      icon: <FiShoppingBag size={20} />,
      label: 'Purchase Orders',
    },
    {
      path: '/supplier/payments',
      icon: <FiDollarSign size={20} />,
      label: 'Payments',
    },
    {
      path: '/supplier/profile',
      icon: <FiUser size={20} />,
      label: 'Profile',
    },
  ];

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full bg-gradient-to-b from-indigo-900 to-indigo-800 text-white
        transition-all duration-300 ease-in-out z-50
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'}
        overflow-hidden
      `}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 sm:p-6 border-b border-indigo-700 flex items-center justify-between gap-2">
          {showExpanded ? (
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold truncate">Supplier Portal</h2>
              {supplier && (
                <p className="text-xs text-indigo-300 mt-1 truncate">
                  {supplier.companyName || supplier.name}
                </p>
              )}
            </div>
          ) : (
            <span className="mx-auto text-lg font-bold">SP</span>
          )}

          <button
            onClick={() => onToggleCollapse?.(!isCollapsed)}
            className="hidden lg:flex p-2 hover:bg-indigo-700 rounded-lg transition-colors flex-shrink-0"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <FiMenu size={18} /> : <FiX size={18} />}
          </button>

          <button
            onClick={onMobileClose}
            className="lg:hidden p-2 hover:bg-indigo-700 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? 'bg-indigo-700 text-white shadow-lg'
                        : 'text-indigo-200 hover:bg-indigo-700/50 hover:text-white'
                    }
                    ${!showExpanded ? 'justify-center' : ''}`
                  }
                  title={!showExpanded ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {showExpanded && <span className="font-medium truncate">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-indigo-700">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-4 px-4 py-3 rounded-lg
              text-indigo-200 hover:bg-red-600 hover:text-white
              transition-all duration-200
              ${!showExpanded ? 'justify-center' : ''}
            `}
            title={!showExpanded ? 'Logout' : undefined}
          >
            <FiLogOut size={20} />
            {showExpanded && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SupplierSidebar;
