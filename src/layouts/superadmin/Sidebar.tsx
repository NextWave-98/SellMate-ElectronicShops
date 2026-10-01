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
  BarChart3,
  CircleHelp,
  ListChecks,
  GraduationCap,
  Smartphone,
  Tags,
  Facebook,
  Globe,
  ShoppingBag,
  FileText,
  Newspaper,
  Star,
  Inbox,
  Wallet,
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
  /** Off unless the organization has switched warranty on. */
  warrantyEnabled?: boolean;
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
  { id: 'staff-skills', label: 'Technician Skills', path: '/superadmin/staff-skills',   icon: GraduationCap, section: 'people' },
  { id: 'attendance', label: 'Attendance',      path: '/superadmin/attendance',        icon: Clock,        section: 'people' },
  { id: 'payroll',    label: 'Payroll',         path: '/superadmin/payroll',           icon: Banknote,     section: 'people' },
  { id: 'roles',     label: 'Role Management', path: '/superadmin/roles/management',  icon: Shield,       section: 'people' },
  { id: 'customer',  label: 'Customers',      path: '/superadmin/customers/management', icon: Contact,      section: 'people' },
  { id: 'suppliers', label: 'Suppliers',      path: '/superadmin/suppliers/management', icon: BaggageClaim, section: 'people' },

  // ── Operations ──────────────────────────────────────
  { id: 'quick-pos',    label: 'Quick POS',     path: '/superadmin/quick-pos',           icon: Zap,         section: 'operations' },
  { id: 'cash-drawer',  label: 'Cash Drawer',   path: '/superadmin/cash-drawer',         icon: Wallet,      section: 'operations' },
  { id: 'crm-tasks', label: 'CRM Tasks',      path: '/superadmin/crm-tasks',            icon: ListChecks,   section: 'operations' },
  {
    id: 'trade-ins', label: 'Trade-In / Buyback', path: '/superadmin/trade-ins', icon: Smartphone, section: 'operations',
    children: [
      { id: 'trade-ins-list',  label: 'Trade-Ins',   path: '/superadmin/trade-ins',       icon: Smartphone },
      { id: 'trade-ins-rules', label: 'Price Rules', path: '/superadmin/trade-ins/rules', icon: Tags },
    ],
  },
  { id: 'advance-payments', label: 'Advance Payments', path: '/superadmin/advance-payments', icon: CreditCard, section: 'operations' },
  { id: 'sales',        label: 'Sales Monitor', path: '/superadmin/sales/monitor',       icon: DollarSign,  section: 'operations' },
  { id: 'orders',       label: 'Orders',        path: '/superadmin/orders/monitor',      icon: Package,     section: 'operations' },
  { id: 'jobsheets',    label: 'Job Sheets',    path: '/superadmin/job-sheets/monitor',  icon: Wrench,      section: 'operations' },
  { id: 'sale-jobs',    label: 'Sale Jobs',     path: '/superadmin/sale-jobs/monitor',   icon: ClipboardList, section: 'operations' },
  { id: 'warranty',     label: 'Warranty',      path: '/superadmin/warranty/management', icon: Shield,      section: 'operations' },
  { id: 'payments',     label: 'Payments',      path: '/superadmin/payments/management', icon: DollarSign,  section: 'operations' },
  { id: 'invoices',     label: 'Invoices & Quotes', path: '/superadmin/invoices',        icon: FileText,    section: 'operations' },
  { id: 'installments', label: 'Installments',  path: '/superadmin/installments',        icon: CreditCard,  section: 'operations' },
  { id: 'returns',      label: 'Returns',       path: '/superadmin/returns',             icon: PackageCheck,section: 'operations' },

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
      {id: 'free-offers',      label: 'Free Offers',       path: '/superadmin/free-offers', icon: Tags },
      // {id:'brand-management', label: 'Brands',             path: '/superadmin/brands/management',     icon: Contact },
    ],
  },
  { id: 'goods-receipts', label: 'Goods Receipts',  path: '/superadmin/goods-receipts',   icon: PackageCheck, section: 'inventory' },
  { id: 'transfers',      label: 'Stock Transfers', path: '/superadmin/transfers',        icon: Activity,     section: 'inventory' },
  { id: 'product-usage',  label: 'Product Usage',   path: '/superadmin/product-usage',    icon: BookOpen,     section: 'inventory' },
  { id: 'serials',        label: 'Serial / IMEI',   path: '/superadmin/serials',          icon: BookOpen,     section: 'inventory' },
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
    id: 'website', label: 'Website / CMS', path: '/superadmin/website', icon: Globe, section: 'ecommerce',
    children: [
      { id: 'website-settings',     label: 'Site Settings',      path: '/superadmin/website',              icon: Settings2 },
      { id: 'website-pages',        label: 'Pages',              path: '/superadmin/website/pages',        icon: FileText },
      { id: 'website-blog',         label: 'Blog / Promotions',  path: '/superadmin/website/blog',         icon: Newspaper },
      { id: 'website-testimonials', label: 'Testimonials',       path: '/superadmin/website/testimonials', icon: Star },
    ],
  },
  { id: 'website-orders', label: 'Website Orders', path: '/superadmin/website-orders', icon: ShoppingBag, section: 'ecommerce' },
  {
    id: 'woocommerce', label: 'WooCommerce', path: '/superadmin/woocommerce', icon: ShoppingCart, section: 'ecommerce',
    children: [
      { id: 'woocommerce-settings', label: 'Settings', path: '/superadmin/woocommerce',        icon: ShoppingCart },
      { id: 'woocommerce-orders',   label: 'Orders',   path: '/superadmin/woocommerce/orders', icon: ClipboardList },
    ],
  },

  // ── Admin ───────────────────────────────────────────
  { id: 'reports',       label: 'Reports',       path: '/superadmin/reports',                 icon: FileCog,      section: 'admin' },
  {
    id: 'accounting', label: 'Accounting', path: '/superadmin/accounting', icon: BookOpen, section: 'admin',
    children: [
      { id: 'accounting-accounts', label: 'Chart of Accounts', path: '/superadmin/accounting',          icon: FileText },
      { id: 'accounting-journals', label: 'Journal Entries',   path: '/superadmin/accounting/journals', icon: BookOpen },
      { id: 'accounting-reports',  label: 'Reports',           path: '/superadmin/accounting/reports',  icon: BarChart3 },
    ],
  },
  { id: 'ai-analytics',  label: 'AI Analytics',  path: '/superadmin/ai-analytics',             icon: Activity,     section: 'admin' },
  { id: 'activity-logs', label: 'Activity Logs', path: '/superadmin/activity-logs',            icon: ClipboardList,section: 'admin' },
  { id: 'notifications', label: 'Notifications', path: '/superadmin/notifications/dashboard', icon: Bell,         section: 'admin' },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    path: '/superadmin/communication/whatsapp',
    icon: MessageSquare,
    section: 'admin',
    children: [
      { id: 'whatsapp-settings', label: 'WhatsApp Business',   path: '/superadmin/communication/whatsapp',        icon: MessageSquare },
      { id: 'whatsapp-ai',       label: 'WhatsApp AI Replies', path: '/superadmin/communication/whatsapp/ai',     icon: MessageSquare },
      { id: 'whatsapp-inbox',    label: 'WhatsApp Inbox',      path: '/superadmin/communication/whatsapp/inbox',  icon: MessageSquare },
      { id: 'whatsapp-orders',   label: 'WhatsApp Orders',     path: '/superadmin/communication/whatsapp/orders', icon: ShoppingCart },
    ],
  },
  {
    id: 'lead-forms-group',
    label: 'Lead Forms',
    path: '/superadmin/facebook-leads/forms',
    icon: ClipboardList,
    section: 'admin',
    children: [
      { id: 'facebook-leads',          label: 'Leads Inbox',      path: '/superadmin/facebook-leads',          icon: Inbox },
      { id: 'lead-forms',              label: 'Manage Forms',     path: '/superadmin/facebook-leads/forms',    icon: ClipboardList },
      { id: 'facebook-leads-settings', label: 'Facebook Connect', path: '/superadmin/facebook-leads/settings', icon: Facebook },
    ],
  },
  {
    id: 'communication', label: 'Communication', path: '/superadmin/communication', icon: Key, section: 'admin',
    children: [
      { id: 'communication-settings', label: 'Channel Credentials',   path: '/superadmin/communication/settings', icon: Key },
      { id: 'notification-settings',  label: 'Notification Settings', path: '/superadmin/notifications/settings', icon: Bell },
    ],
  },
  { id: 'pos-settings', label: 'POS Settings', path: '/superadmin/pos/settings', icon: Settings2, section: 'admin' },
  { id: 'subscription-checkout', label: 'Subscription Checkout', path: '/superadmin/subscription/checkout', icon: CreditCard, section: 'admin' },
  { id: 'system-usage', label: 'System Usage', path: '/superadmin/system-usage', icon: CircleHelp, section: 'admin' },

];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const useFilteredMenuItems = (items: MenuItem[], orgFeatures?: BusinessProfile | null): MenuItem[] => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule, hasCourierAccess, isSuperAdmin, hasAnyRole } = usePermissions();
  const { industryType } = useBusinessContext();

  return useMemo(() => {
    // Fail-closed: missing config hides the item. Intentionally open items
    // (e.g. dashboard) must have an explicit entry with no requirements.
    const check = (config: SidebarPermissionConfig | undefined): boolean => {
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

    const filter = (list: MenuItem[], parentChildConfigs?: SidebarPermissionConfig[]): MenuItem[] =>
      list.map(item => {
        if (item.id === 'staff' && orgFeatures?.staffManagementEnabled === false) return null;
        if (item.id === 'suppliers' && orgFeatures?.supplierOrdersEnabled === false) return null;
        if (item.id === 'goods-receipts' && orgFeatures?.supplierOrdersEnabled === false) return null;
        if (item.id === 'jobsheets' && !industryAllowsFeature(industryType, 'jobsheets')) return null;
        if (item.id === 'parts' && !industryAllowsFeature(industryType, 'parts')) return null;
        if (item.id === 'trade-ins' && !industryAllowsFeature(industryType, 'tradein')) return null;
        // Warranty is an organization setting now, not an industry trait.
        // `=== false` is not enough here: the flag defaults to OFF, so an
        // undefined value (profile still loading, or an older API) must hide it
        // rather than show a menu the organization never enabled.
        if (item.id === 'warranty' && orgFeatures?.warrantyEnabled !== true) return null;

        // Courier + WooCommerce are tied: no courier access → hide both
        if (
          (item.id === 'courier' || item.id === 'woocommerce' || item.id === 'woocommerce-orders') &&
          !hasCourierAccess()
        ) {
          return null;
        }

        // Inside a parent: only use that parent's child configs (no top-level fallback).
        const permConfig = parentChildConfigs
          ? parentChildConfigs.find(p => p.id === item.id)
          : SUPERADMIN_SIDEBAR_PERMISSIONS.find(p => p.id === item.id);

        if (item.children?.length) {
          const childConfigs = permConfig?.children;
          const filteredChildren = filter(item.children, childConfigs);

          if (childConfigs !== undefined) {
            if (!filteredChildren.length) return null;
            if (!check(permConfig)) return null;
            return { ...item, children: filteredChildren };
          }

          if (!check(permConfig)) return null;
          if (!filteredChildren.length) return null;
          return { ...item, children: filteredChildren };
        }

        if (!check(permConfig)) return null;
        return item;
      }).filter((item): item is MenuItem => item !== null);

    return filter(items);
  }, [items, hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule, hasCourierAccess, isSuperAdmin, hasAnyRole, industryType, orgFeatures]);
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

  const collectPaths = (items: MenuItem[]): string[] =>
    items.flatMap((it) => [it.path, ...(it.children ? collectPaths(it.children) : [])]);

  const allNavPaths = useMemo(
    () => collectPaths(filteredMenuItems),
    [filteredMenuItems],
  );

  const isActiveRoute = (path: string) => {
    if (path === '/superadmin') {
      return location.pathname === '/superadmin' || location.pathname === '/superadmin/';
    }
    const matches =
      location.pathname === path || location.pathname.startsWith(`${path}/`);
    if (!matches) return false;
    // Prefer the longest matching path so /facebook-leads doesn't steal /forms active state
    const longerMatch = allNavPaths.some(
      (p) =>
        p !== path &&
        p.length > path.length &&
        (p === path || p.startsWith(`${path}/`)) &&
        (location.pathname === p || location.pathname.startsWith(`${p}/`)),
    );
    return !longerMatch;
  };

  const pathMatches = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const itemOrChildActive = (item: MenuItem): boolean => {
    if (pathMatches(item.path)) return true;
    return item.children?.some((c) => itemOrChildActive(c)) ?? false;
  };

  useEffect(() => {
    const init: Record<string, boolean> = {};
    const walk = (items: MenuItem[]) => {
      items.forEach((it) => {
        if (it.children?.length) {
          init[it.id] = itemOrChildActive(it);
          walk(it.children);
        }
      });
    };
    walk(filteredMenuItems);
    setExpandedMenus(init);
    if (isMobileOpen && onMobileClose) onMobileClose();
  }, [location.pathname, filteredMenuItems]);

  const toggleExpand = (id: string) =>
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));

  /* ── Reusable item class builder ── */
  const itemBase = (isActive: boolean, extra = '') =>
    `group relative flex items-center rounded-xl transition-all duration-150 ${extra} ${
      isActive
        ? 'bg-orange-500/90 text-white shadow-[0_2px_12px_0_rgba(249,115,22,0.35)] backdrop-blur-sm'
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
          const isActive = isParent ? itemOrChildActive(item) : isActiveRoute(item.path);

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

                {/* Sub-items (supports one nested group level, e.g. Lead Forms) */}
                {!isCollapsed && isExpanded && (
                  <div className="mt-0.5 ml-3 pl-4 border-l border-gray-100 space-y-0.5 pb-1">
                    {item.children!.map(child => {
                      const ChildIcon = child.icon;
                      const isNestedGroup = Boolean(child.children?.length);
                      const childActive = isNestedGroup
                        ? itemOrChildActive(child)
                        : isActiveRoute(child.path);
                      const nestedExpanded = !!expandedMenus[child.id];

                      if (isNestedGroup) {
                        return (
                          <div key={child.id} className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => toggleExpand(child.id)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                                childActive
                                  ? 'bg-orange-400/20 text-orange-700 font-medium ring-1 ring-orange-300/40'
                                  : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                              }`}
                            >
                              <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${childActive ? 'text-orange-500' : 'text-gray-400'}`} />
                              <span className="truncate flex-1 text-left">{child.label}</span>
                              <ChevronDown
                                className={`w-3 h-3 shrink-0 transition-transform ${
                                  nestedExpanded ? 'rotate-180' : ''
                                } ${childActive ? 'text-orange-400' : 'text-gray-400'}`}
                              />
                            </button>
                            {nestedExpanded && (
                              <div className="ml-3 pl-3 border-l border-orange-100/80 space-y-0.5">
                                {child.children!.map((grand) => {
                                  const GrandIcon = grand.icon;
                                  const grandActive = isActiveRoute(grand.path);
                                  return (
                                    <Link
                                      key={grand.id}
                                      to={grand.path}
                                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-150 ${
                                        grandActive
                                          ? 'bg-orange-400/25 text-orange-800 font-semibold'
                                          : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                                      }`}
                                    >
                                      <GrandIcon
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          grandActive ? 'text-orange-500' : 'text-gray-400'
                                        }`}
                                      />
                                      <span className="truncate">{grand.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={child.id}
                          to={child.path}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                            childActive
                              ? 'bg-orange-400/20 text-orange-700 font-medium ring-1 ring-orange-300/40'
                              : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                          }`}
                        >
                          <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${childActive ? 'text-orange-500' : 'text-gray-400'}`} />
                          <span className="truncate">{child.label}</span>
                          {child.badge && (
                            <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              childActive ? 'bg-orange-100 text-orange-700' : 'bg-red-50 text-red-500'
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