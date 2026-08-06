/* eslint-disable react-hooks/exhaustive-deps */
import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Activity,
  TrendingUp,
  Users,
  Briefcase,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Shield,
  RotateCcw,
  PackagePlus,
  CreditCard,
  Truck,
  Zap,
  Store,
  QrCode,
  Wallet,
  ShoppingBag,
  Clock,
  CalendarDays,
  Globe,
  ListChecks,
  Wrench,
  X,
  BaggageClaim,
  BookOpen,
  Car,
  Droplets,
  Smartphone,
  CircleHelp,
} from 'lucide-react';
import { useMemo } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import useOrgFeatures from '../../hooks/useOrgFeatures';
import { useBusinessContext } from '../../context/BusinessContext';
import { industryAllowsFeature } from '../../utils/industryFeatures';
import { BRANCH_SIDEBAR_PERMISSIONS, type SidebarPermissionConfig } from '../../config/permissions.config';

interface MenuItemConfig {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

interface BranchSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const BranchSidebar = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}: BranchSidebarProps) => {
  const { branchCode } = useParams();
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule, hasCourierAccess, isSuperAdmin, hasAnyRole } = usePermissions();
  const { supplierOrdersEnabled } = useOrgFeatures();
  const { industryType } = useBusinessContext();

  const allMenuItems: MenuItemConfig[] = [
    { id: 'dashboard',      name: 'Dashboard',      path: `/${branchCode}/dashboard`,      icon: LayoutDashboard },
    { id: 'pos',            name: 'POS',             path: `/${branchCode}/pos`,            icon: Store,         section: 'sales' },
    { id: 'quick-pos',      name: 'Quick POS',       path: `/${branchCode}/quick-pos`,      icon: Zap,           section: 'sales' },
    { id: 'cash-drawer',    name: 'Cash Drawer',     path: `/${branchCode}/cash-drawer`,    icon: Wallet,        section: 'sales' },
    { id: 'advance-payments', name: 'Advance Payments', path: `/${branchCode}/advance-payments`, icon: CreditCard,    section: 'sales' },
    { id: 'sales',          name: 'Branch Sales',       path: `/${branchCode}/sales`,          icon: ShoppingCart,  section: 'sales' },
    { id: 'orders',         name: 'Orders',          path: `/${branchCode}/orders`,         icon: ShoppingBag,   section: 'sales' },
    { id: 'courier',        name: 'Courier Sales',   path: `/${branchCode}/courier`,        icon: Truck,         section: 'sales' },
    { id: 'products',       name: 'Products',        path: `/${branchCode}/products`,       icon: Package },
    { id: 'stock-dashboard', name: 'Stock Dashboard', path: `/${branchCode}/stock/dashboard`, icon: Activity },
    { id: 'product-usage',  name: 'Product Usage',   path: `/${branchCode}/product-usage`,  icon: BookOpen },
     { id: 'returns',        name: 'Returns',         path: `/${branchCode}/returns`,        icon: RotateCcw },
    { id: 'barcodes',       name: 'Barcode Generator', path: `/${branchCode}/barcodes`,      icon: QrCode },
    { id: 'addon-requests', name: 'Addon Requests',  path: `/${branchCode}/addon-requests`, icon: PackagePlus },
    { id: 'customers',      name: 'Customers',       path: `/${branchCode}/customers`,      icon: Users },
    { id: 'jobsheets',      name: 'Job Sheets',      path: `/${branchCode}/jobsheets`,      icon: FileText },
    { id: 'sale-jobs',      name: 'Sale Jobs',       path: `/${branchCode}/sale-jobs`,      icon: Briefcase },
    { id: 'parts',          name: 'Parts & Stock',   path: `/${branchCode}/parts`,          icon: Wrench },
    { id: 'warranty',       name: 'Warranty',        path: `/${branchCode}/warranty`,       icon: Shield },
    { id: 'installments',   name: 'Installments',    path: `/${branchCode}/installments`,   icon: CreditCard },
    { id: 'woocommerce-orders', name: 'WooCommerce Orders', path: `/${branchCode}/woocommerce/orders`, icon: ShoppingBag },
    { id: 'attendance',          name: 'My Attendance',      path: `/${branchCode}/attendance`,            icon: Clock },
    { id: 'suppliers',           name: 'Supplier Orders',    path: `/${branchCode}/suppliers/management`,  icon: BaggageClaim },
    // New verticals (industry-gated)
    { id: 'rental',    name: 'Vehicle Rental',     path: `/${branchCode}/rental`,    icon: Car },
    { id: 'carwash',   name: 'Car Wash',           path: `/${branchCode}/carwash`,   icon: Droplets },
    { id: 'garage',    name: 'Garage',             path: `/${branchCode}/garage`,    icon: Wrench },
    { id: 'trade-ins', name: 'Trade-In / Buyback', path: `/${branchCode}/trade-ins`, icon: Smartphone },
    { id: 'appointments', name: 'Appointments', path: `/${branchCode}/appointments`, icon: CalendarDays },
    { id: 'towing', name: 'Towing / Roadside', path: `/${branchCode}/towing`, icon: Truck },
    { id: 'accounting', name: 'Accounting', path: `/${branchCode}/accounting`, icon: BookOpen },
    { id: 'website', name: 'Website / CMS', path: `/${branchCode}/website`, icon: Globe },
    { id: 'crm-tasks', name: 'CRM Tasks', path: `/${branchCode}/crm-tasks`, icon: ListChecks },
    { id: 'leads', name: 'Leads', path: `/${branchCode}/leads`, icon: Users },
    { id: 'my-activity', name: 'My Activity', path: `/${branchCode}/my-activity`, icon: Activity },
    { id: 'my-scorecard', name: 'My Scorecard', path: `/${branchCode}/my-scorecard`, icon: TrendingUp },
    { id: 'system-usage', name: 'System Usage', path: `/${branchCode}/system-usage`, icon: CircleHelp },
  ];

  const menuItems = useMemo(() => {
    // Fail-closed: missing config hides the item. SuperAdmin bypass only (matches PermissionRoute).
    const checkPermissionConfig = (config: SidebarPermissionConfig | undefined): boolean => {
      if (!config) return false;
      if (isSuperAdmin) return true;
      if (config.allowedRoles?.length && !hasAnyRole(config.allowedRoles)) return false;
      if (config.requiredModule && !canAccessModule(config.requiredModule)) return false;
      if (config.requiredPermission && !hasPermission(config.requiredPermission)) return false;
      if (config.requiredPermissions?.length) {
        const ok = config.requireAnyPermission
          ? hasAnyPermission(config.requiredPermissions)
          : hasAllPermissions(config.requiredPermissions);
        if (!ok) return false;
      }
      return true;
    };

    return allMenuItems.filter(item => {
      if (item.id === 'suppliers' && supplierOrdersEnabled === false) return false;
      if (item.id === 'jobsheets' && !industryAllowsFeature(industryType, 'jobsheets')) return false;
      if (item.id === 'parts' && !industryAllowsFeature(industryType, 'parts')) return false;
      if (item.id === 'warranty' && !industryAllowsFeature(industryType, 'warranty')) return false;
      // New verticals — only for their own industry (GENERAL sees all)
      if (item.id === 'rental' && !industryAllowsFeature(industryType, 'rental')) return false;
      if (item.id === 'carwash' && !industryAllowsFeature(industryType, 'carwash')) return false;
      if (item.id === 'garage' && !industryAllowsFeature(industryType, 'garage')) return false;
      if (item.id === 'trade-ins' && !industryAllowsFeature(industryType, 'tradein')) return false;
      if (item.id === 'appointments' && !industryAllowsFeature(industryType, 'appointment')) return false;
      if (item.id === 'towing' && !industryAllowsFeature(industryType, 'towing')) return false;
      // Retail-only menus hidden for rental / car wash / garage orgs
      const branchRetailOnlyIds = [
        'pos', 'quick-pos', 'advance-payments', 'sales', 'orders', 'courier', 'products',
        'stock-dashboard', 'product-usage', 'returns', 'barcodes', 'addon-requests',
        'sale-jobs', 'installments', 'woocommerce-orders', 'suppliers',
      ];
      if (branchRetailOnlyIds.includes(item.id) && !industryAllowsFeature(industryType, 'retail')) return false;
      // Courier + WooCommerce are tied: no courier access → hide both
      if (
        (item.id === 'courier' || item.id === 'woocommerce-orders') &&
        !hasCourierAccess()
      ) {
        return false;
      }
      const permConfig = BRANCH_SIDEBAR_PERMISSIONS.find(p => p.id === item.id);
      return checkPermissionConfig(permConfig);
    });
  }, [allMenuItems, hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule, hasCourierAccess, isSuperAdmin, hasAnyRole, industryType, supplierOrdersEnabled]);

  const showExpanded = isMobileOpen || !isCollapsed;

  const handleToggle = () => {
    onToggleCollapse?.(!isCollapsed);
  };

  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <aside
      className={`
        flex flex-col fixed z-50 md:z-auto left-0 top-0 h-screen
        bg-white/70 backdrop-blur-2xl backdrop-saturate-150
        border-r border-white/40
        transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-[60px] w-64' : 'w-64'}
      `}
      style={{ boxShadow: '1px 0 0 rgba(255,255,255,0.4), 4px 0 24px rgba(0,0,0,0.08)' }}
    >
      {/* Header */}
      <div className="h-14 flex items-center px-3 border-b border-white/40 flex-shrink-0 gap-2">
        {showExpanded && (
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1 flex-1 min-w-0 truncate">
            Menu
          </span>
        )}

        <button
          onClick={handleToggle}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          className={`hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 transition-colors flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'ml-auto'}`}
        >
          {isCollapsed ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>

        <button
          onClick={onMobileClose}
          className="lg:hidden flex z-50 md:z-auto w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 transition-colors ml-auto"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const prevItem = menuItems[index - 1];
          const showSectionHeader = item.section === 'sales' && (!prevItem || prevItem.section !== 'sales');
          const showSectionEnd = item.section === 'sales' && (!menuItems[index + 1] || menuItems[index + 1]?.section !== 'sales');

          return (
            <div key={item.path}>
              {showSectionHeader && showExpanded && (
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" />
                    Sales
                  </span>
                </div>
              )}
              {showSectionHeader && !showExpanded && (
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-5 h-px bg-gray-200" />
                </div>
              )}

              <NavLink
                to={item.path}
                onClick={handleNavClick}
                title={!showExpanded ? item.name : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-lg transition-all duration-150 ${
                    showExpanded
                      ? `${item.section === 'sales' ? 'pl-5 pr-3' : 'px-3'} py-2.5`
                      : 'justify-center px-2 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[#1e3a8a]/90 text-white shadow-[0_2px_10px_rgba(30,58,138,0.30)]'
                      : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    {showExpanded && (
                      <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : ''}`}>
                        {item.name}
                      </span>
                    )}

                    {!showExpanded && (
                      <span className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                        {item.name}
                        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                      </span>
                    )}
                  </>
                )}
              </NavLink>

              {showSectionEnd && showExpanded && (
                <div className="px-3 pt-1 pb-1">
                  <div className="border-b border-gray-100" />
                </div>
              )}
              {showSectionEnd && !showExpanded && (
                <div className="flex justify-center pt-1 pb-1">
                  <div className="w-5 h-px bg-gray-200" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {showExpanded && (
        <div className="px-4 py-3 border-t border-white/40 flex-shrink-0">
          <p className="text-[11px] font-semibold text-gray-700">GC Manager</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Branch System v1.0</p>
        </div>
      )}
    </aside>
  );
};

export default BranchSidebar;
