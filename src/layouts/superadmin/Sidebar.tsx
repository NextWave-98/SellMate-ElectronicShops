/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import { useBusinessContext } from '../../context/BusinessContext';
import { industryAllowsFeature } from '../../utils/industryFeatures';
import {
  LayoutDashboard,
  Store,
  Users,
  Package,
  PackageCheck,
  DollarSign,
  Warehouse,
  Activity,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
  Contact,
  BaggageClaim,
  FileCog,
  Bell,
  Shield,
  FolderTree,
  PackagePlus,
  Truck,
  Key,
  CreditCard,
  MessageSquare,
  ShoppingCart,
  ClipboardList,
  Wrench,
  Zap,
  QrCode,
  Settings2,
  Clock,
  Banknote,
  BookOpen,
  Facebook,
  Car,
  Droplets,
  Smartphone,
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { SUPERADMIN_SIDEBAR_PERMISSIONS, type SidebarPermissionConfig } from '../../config/permissions.config';

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  badge?: number;
  section?: string;
  children?: MenuItem[];
}

interface BusinessProfile {
  id: string;
  name: string;
  logo?: string | null;
  email?: string;
  city?: string;
  staffManagementEnabled?: boolean;
  supplierOrdersEnabled?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  people:     'People',
  operations: 'Operations',
  inventory:  'Inventory',
  courier:    'Courier',
  ecommerce:  'E-Commerce',
  admin:      'Admin',
};

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },

  // ── People ──────────────────────────────────────────
  { id: 'shops',     label: 'Shops',          path: '/superadmin/shops/management',     icon: Store,        section: 'people' },
  { id: 'staff',      label: 'Staff',           path: '/superadmin/staff/management',  icon: Users,        section: 'people' },
  { id: 'attendance', label: 'Attendance',      path: '/superadmin/attendance',        icon: Clock,        section: 'people' },
  { id: 'payroll',    label: 'Payroll',         path: '/superadmin/payroll',           icon: Banknote,     section: 'people' },
  { id: 'roles',     label: 'Role Management', path: '/superadmin/roles/management',  icon: Shield,       section: 'people' },
  { id: 'customer',  label: 'Customers',      path: '/superadmin/customers/management', icon: Contact,      section: 'people' },
  { id: 'suppliers', label: 'Suppliers',      path: '/superadmin/suppliers/management', icon: BaggageClaim, section: 'people' },

  // ── Operations ──────────────────────────────────────
  { id: 'quick-pos',    label: 'Quick POS',     path: '/superadmin/quick-pos',           icon: Zap,         section: 'operations' },
  { id: 'advance-payments', label: 'Advance Payments', path: '/superadmin/advance-payments', icon: CreditCard, section: 'operations' },
  { id: 'sales',        label: 'Sales Monitor', path: '/superadmin/sales/monitor',       icon: DollarSign,  section: 'operations' },
  { id: 'orders',       label: 'Orders',        path: '/superadmin/orders/monitor',      icon: Package,     section: 'operations' },
  { id: 'jobsheets',    label: 'Job Sheets',    path: '/superadmin/job-sheets/monitor',  icon: Wrench,      section: 'operations' },
  { id: 'sale-jobs',    label: 'Sale Jobs',     path: '/superadmin/sale-jobs/monitor',   icon: ClipboardList, section: 'operations' },
  { id: 'warranty',     label: 'Warranty',      path: '/superadmin/warranty/management', icon: Shield,      section: 'operations' },
  { id: 'payments',     label: 'Payments',      path: '/superadmin/payments/management', icon: DollarSign,  section: 'operations' },
  { id: 'installments', label: 'Installments',  path: '/superadmin/installments',        icon: CreditCard,  section: 'operations' },
  { id: 'returns',      label: 'Returns',       path: '/superadmin/returns',             icon: PackageCheck,section: 'operations' },

  // ── New verticals (industry-gated) ──────────────────
  { id: 'rental',    label: 'Vehicle Rental',     path: '/superadmin/rental',    icon: Car,        section: 'operations' },
  { id: 'carwash',   label: 'Car Wash',           path: '/superadmin/carwash',   icon: Droplets,   section: 'operations' },
  { id: 'garage',    label: 'Garage / Workshop',  path: '/superadmin/garage',    icon: Wrench,     section: 'operations' },
  { id: 'trade-ins', label: 'Trade-In / Buyback', path: '/superadmin/trade-ins', icon: Smartphone, section: 'operations' },

  // ── Inventory ───────────────────────────────────────
  {
    id: 'stock', label: 'Stock Management', path: '/superadmin/stock', icon: Activity, section: 'inventory',
    children: [
      { id: 'product',         label: 'Products',          path: '/superadmin/stock/management',      icon: Package },
      { id: 'stock-dashboard', label: 'Stock Dashboard',   path: '/superadmin/stock/dashboard',       icon: Activity },
      { id: 'barcodes',        label: 'Barcode Generator',  path: '/superadmin/stock/barcodes',         icon: QrCode },
      { id: 'inventory',       label: 'Inventory Monitor', path: '/superadmin/inventory/monitor',     icon: Warehouse },
      { id: 'categories',      label: 'Categories',        path: '/superadmin/categories/management', icon: FolderTree },
      {id: 'discounts',        label: 'Discounts',         path: '/superadmin/discounts',  icon: FileCog },
      // {id:'brand-management', label: 'Brands',             path: '/superadmin/brands/management',     icon: Contact },
    ],
  },
  { id: 'goods-receipts', label: 'Goods Receipts',  path: '/superadmin/goods-receipts',   icon: PackageCheck, section: 'inventory' },
  { id: 'product-usage',  label: 'Product Usage',   path: '/superadmin/product-usage',    icon: BookOpen,     section: 'inventory' },
  { id: 'parts',          label: 'Parts & Stock',   path: '/superadmin/parts/management', icon: Wrench,       section: 'inventory' },
  { id: 'addon-requests', label: 'Addon Requests',  path: '/superadmin/addon-requests',   icon: PackagePlus,  section: 'inventory' },

  // ── Courier ─────────────────────────────────────────
  {
    id: 'courier', label: 'Courier & Delivery', path: '/superadmin/courier', icon: Truck, section: 'courier',
    children: [
      { id: 'courier-services',  label: 'Services',          path: '/superadmin/courier/services',  icon: Truck },
      { id: 'shipment-tracking', label: 'Shipment Tracking', path: '/superadmin/courier/shipments', icon: Package },
    ],
  },

  // ── E-Commerce ──────────────────────────────────────
  {
    id: 'woocommerce', label: 'WooCommerce', path: '/superadmin/woocommerce', icon: ShoppingCart, section: 'ecommerce',
    children: [
      { id: 'woocommerce-settings', label: 'Settings', path: '/superadmin/woocommerce',        icon: ShoppingCart },
      { id: 'woocommerce-orders',   label: 'Orders',   path: '/superadmin/woocommerce/orders', icon: ClipboardList },
    ],
  },

  // ── Admin ───────────────────────────────────────────
  { id: 'reports',       label: 'Reports',       path: '/superadmin/reports',                 icon: FileCog,      section: 'admin' },
  { id: 'ai-analytics',  label: 'AI Analytics',  path: '/superadmin/ai-analytics',             icon: Activity,     section: 'admin' },
  { id: 'activity-logs', label: 'Activity Logs', path: '/superadmin/activity-logs',            icon: ClipboardList,section: 'admin' },
  { id: 'notifications', label: 'Notifications', path: '/superadmin/notifications/dashboard', icon: Bell,         section: 'admin' },
  {
    id: 'communication', label: 'Communication', path: '/superadmin/communication', icon: MessageSquare, section: 'admin',
    children: [
      { id: 'communication-settings', label: 'Channel Credentials',   path: '/superadmin/communication/settings', icon: Key },
      { id: 'whatsapp-settings',      label: 'WhatsApp Business',     path: '/superadmin/communication/whatsapp', icon: MessageSquare },
      { id: 'whatsapp-ai',            label: 'WhatsApp AI Replies',   path: '/superadmin/communication/whatsapp/ai', icon: MessageSquare },
      { id: 'whatsapp-inbox',         label: 'WhatsApp Inbox',        path: '/superadmin/communication/whatsapp/inbox', icon: MessageSquare },
      { id: 'whatsapp-orders',        label: 'WhatsApp Orders',       path: '/superadmin/communication/whatsapp/orders', icon: ShoppingCart },
      { id: 'facebook-leads',         label: 'Facebook Leads',        path: '/superadmin/facebook-leads', icon: Facebook },
      { id: 'facebook-leads-settings',label: 'Facebook Connect',      path: '/superadmin/facebook-leads/settings', icon: Facebook },
      { id: 'notification-settings',  label: 'Notification Settings', path: '/superadmin/notifications/settings', icon: Bell },
    ],
  },
  { id: 'pos-settings', label: 'POS Settings', path: '/superadmin/pos/settings', icon: Settings2, section: 'admin' },
  { id: 'subscription-checkout', label: 'Subscription Checkout', path: '/superadmin/subscription/checkout', icon: CreditCard, section: 'admin' },

];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const useFilteredMenuItems = (items: MenuItem[], orgFeatures?: BusinessProfile | null): MenuItem[] => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule, isSuperAdmin, hasAnyRole } = usePermissions();
  const { industryType } = useBusinessContext();

  return useMemo(() => {
    const check = (config: SidebarPermissionConfig | undefined): boolean => {
      if (!config) return true;
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

    const filter = (list: MenuItem[]): MenuItem[] =>
      list.map(item => {
        if (item.id === 'staff' && orgFeatures?.staffManagementEnabled === false) return null;
        if (item.id === 'suppliers' && orgFeatures?.supplierOrdersEnabled === false) return null;
        if (item.id === 'goods-receipts' && orgFeatures?.supplierOrdersEnabled === false) return null;
        if (item.id === 'jobsheets' && !industryAllowsFeature(industryType, 'jobsheets')) return null;
        if (item.id === 'parts' && !industryAllowsFeature(industryType, 'parts')) return null;
        if (item.id === 'warranty' && !industryAllowsFeature(industryType, 'warranty')) return null;
        // New verticals — only for their own industry (GENERAL sees all)
        if (item.id === 'rental' && !industryAllowsFeature(industryType, 'rental')) return null;
        if (item.id === 'carwash' && !industryAllowsFeature(industryType, 'carwash')) return null;
        if (item.id === 'garage' && !industryAllowsFeature(industryType, 'garage')) return null;
        if (item.id === 'trade-ins' && !industryAllowsFeature(industryType, 'tradein')) return null;
        // Retail-only modules hidden for rental / car wash / garage orgs
        const retailOnlyIds = [
          'quick-pos', 'advance-payments', 'sales', 'orders', 'sale-jobs', 'installments', 'returns',
          'stock', 'goods-receipts', 'product-usage', 'addon-requests', 'woocommerce',
        ];
        if (retailOnlyIds.includes(item.id) && !industryAllowsFeature(industryType, 'retail')) return null;
        const permConfig = SUPERADMIN_SIDEBAR_PERMISSIONS.find(p => p.id === item.id);
        if (item.children?.length) {
          const childPerms = permConfig?.children ?? [];
          const filteredChildren = item.children.filter(child => {
            const childCfg = childPerms.find(c => c.id === child.id);
            if (childCfg) return check(childCfg);
            if (permConfig) return check(permConfig);
            return true;
          });
          if (!filteredChildren.length) return null;
          // Per-child rules: show parent when any child is visible (e.g. WhatsApp vs Channel Credentials)
          if (childPerms.length > 0) {
            return { ...item, children: filteredChildren };
          }
          if (!check(permConfig)) return null;
          return { ...item, children: filteredChildren };
        }
        if (!check(permConfig)) return null;
        return item;
      }).filter((item): item is MenuItem => item !== null);

    return filter(items);
  }, [items, hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule, isSuperAdmin, hasAnyRole, industryType, orgFeatures]);
};

export default function Sidebar({
  isCollapsed: externalIsCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps = {}) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { fetchData: fetchBusiness } = useFetch<BusinessProfile>('/business');
  const [businessData, setBusinessData] = useState<BusinessProfile | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.businessId) return;
    fetchBusiness({ method: 'GET', silent: true, showToastOnError: false })
      .then(res => { if (res?.data) setBusinessData(res.data as BusinessProfile); })
      .catch(() => {});
  }, [user?.businessId]);

  const filteredMenuItems = useFilteredMenuItems(menuItems, businessData);
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;

  const handleToggle = () => {
    const next = !isCollapsed;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    onToggleCollapse ? onToggleCollapse(next) : setInternalIsCollapsed(next);
  };

  const isActiveRoute = (path: string) =>
    path === '/superadmin'
      ? location.pathname === '/superadmin' || location.pathname === '/superadmin/'
      : location.pathname.startsWith(path);

  useEffect(() => {
    const init: Record<string, boolean> = {};
    filteredMenuItems.forEach(it => {
      if (it.children) init[it.id] = it.children.some(c => location.pathname.startsWith(c.path));
    });
    setExpandedMenus(init);
    if (isMobileOpen && onMobileClose) onMobileClose();
  }, [location.pathname, filteredMenuItems]);

  const toggleExpand = (id: string) =>
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));

  /* ── Reusable item class builder ── */
  const itemBase = (isActive: boolean, extra = '') =>
    `group relative flex items-center rounded-xl transition-all duration-150 ${extra} ${
      isActive
        ? 'bg-blue-600/90 text-white shadow-[0_2px_12px_0_rgba(37,99,235,0.35)] backdrop-blur-sm'
        : 'text-gray-700 hover:bg-white/60 hover:text-gray-900'
    }`;

  const iconCls = (isActive: boolean) =>
    `w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`;

  /* Tooltip shown when collapsed */
  const Tooltip = ({ label, badge }: { label: string; badge?: number }) => (
    <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[60] shadow-lg">
      {label}
      {badge ? <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 rounded-full text-[10px]">{badge}</span> : null}
    </span>
  );

  return (
    <div
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
      {/* ── Header ── */}
      <div className="h-14 flex items-center px-3 border-b border-white/40 flex-shrink-0 gap-2">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gray-800/80 flex items-center justify-center overflow-hidden flex-shrink-0">
              {businessData?.logo ? (
                <img
                  src={businessData.logo}
                  alt={businessData.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Activity className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight" title={businessData?.name || 'GC Manager'}>
                {businessData?.name || 'GC Manager'}
              </p>
              <p className="text-[10px] text-gray-400 truncate leading-tight">
                {user?.role?.name?.replace(/_/g, ' ') || 'Super Admin'}
              </p>
            </div>
          </div>
        )}

        {/* Desktop toggle */}
        <button
          onClick={handleToggle}
          className={`hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/50 transition-colors flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'ml-auto'}`}
        >
          {isCollapsed ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>

        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="lg:hidden flex z-50 md:z-auto w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/50 transition-colors ml-auto"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {filteredMenuItems.map((item, index) => {
          const Icon = item.icon;
          const isParent = !!item.children?.length;
          const isActive = isParent
            ? item.children!.some(c => isActiveRoute(c.path))
            : isActiveRoute(item.path);

          // Section header detection
          const prevItem = filteredMenuItems[index - 1];
          const showSectionHeader = !!(item.section && item.section !== prevItem?.section);
          const sectionHeader = showSectionHeader ? (
            !isCollapsed ? (
              <div className="px-3 pt-4 pb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {SECTION_LABELS[item.section!] || item.section}
                </span>
              </div>
            ) : (
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-5 h-px bg-gray-200" />
              </div>
            )
          ) : null;

          /* ── Parent with children ── */
          if (isParent) {
            const isExpanded = !!expandedMenus[item.id];
            return (
              <div key={item.id}>
                {sectionHeader}
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className={itemBase(isActive, `w-full ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`)}
                >
                  <Icon className={iconCls(isActive)} />
                  {!isCollapsed && (
                    <>
                      <span className="ml-2.5 text-sm font-medium flex-1 text-left truncate">{item.label}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                          isActive ? 'text-white/70' : 'text-gray-400'
                        } ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                  {isCollapsed && <Tooltip label={item.label} />}
                </button>

                {/* Sub-items */}
                {!isCollapsed && isExpanded && (
                  <div className="mt-0.5 ml-3 pl-4 border-l border-gray-100 space-y-0.5 pb-1">
                    {item.children!.map(child => {
                      const ChildIcon = child.icon;
                      const childActive = isActiveRoute(child.path);
                      return (
                        <Link
                          key={child.id}
                          to={child.path}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                            childActive
                              ? 'bg-blue-400/20 text-blue-700 font-medium ring-1 ring-blue-300/40'
                              : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                          }`}
                        >
                          <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${childActive ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="truncate">{child.label}</span>
                          {child.badge && (
                            <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              childActive ? 'bg-blue-100 text-blue-700' : 'bg-red-50 text-red-500'
                            }`}>
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          /* ── Regular item ── */
          return (
            <div key={item.id}>
              {sectionHeader}
              <Link
                to={item.path}
                className={itemBase(isActive, `${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`)}
              >
                <Icon className={iconCls(isActive)} />
                {!isCollapsed && (
                  <>
                    <span className="ml-2.5 text-sm font-medium flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-red-50 text-red-500'
                      }`}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && (
                  <>
                    {item.badge && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                    <Tooltip label={item.label} badge={item.badge} />
                  </>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-white/40 flex-shrink-0">
          <p className="text-[11px] font-semibold text-gray-700">GC Manager</p>
          <p className="text-[10px] text-gray-400 mt-0.5">v1.0.0</p>
        </div>
      )}
    </div>
  );
}