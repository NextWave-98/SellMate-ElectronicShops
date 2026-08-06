import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { usePermissions } from '@/hooks/usePermissions';
import { useActivityHeartbeat } from '@/hooks/useActivityHeartbeat';
import { PERMISSIONS } from '@/store/types';

const isPosPath = (pathname: string) =>
  pathname.endsWith('/pos') || pathname.endsWith('/quick-pos');

export default function SuperadminLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPosFullscreen, setIsPosFullscreen] = useState(false);
  const location = useLocation();
  const { isOrganizationAdmin, isSuperAdmin, hasPermission } = usePermissions();
  useActivityHeartbeat(hasPermission(PERMISSIONS.ACTIVITY_MONITORING_VIEW_OWN));

  const isPosRoute = isPosPath(location.pathname);
  const hideChrome = isPosRoute && isPosFullscreen;

  useEffect(() => {
    if (isOrganizationAdmin && !isSuperAdmin) {
      document.documentElement.dataset.theme = 'organization';
    } else if (document.documentElement.dataset.theme === 'organization') {
      delete document.documentElement.dataset.theme;
    }
    return () => {
      if (document.documentElement.dataset.theme === 'organization') {
        delete document.documentElement.dataset.theme;
      }
    };
  }, [isOrganizationAdmin, isSuperAdmin]);

  useEffect(() => {
    setIsPosFullscreen(isPosRoute);
  }, [isPosRoute]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Get page title based on route
  const getPageTitle = () => {
    const path = location.pathname;

    if (path === '/superadmin' || path === '/superadmin/') {
      return 'Dashboard Overview';
    } else if (path.startsWith('/superadmin/shops')) {
      return 'Shops Management';
    } else if (path.startsWith('/superadmin/staff')) {
      return 'Staff Management';
    } else if (path.startsWith('/superadmin/stock')) {
      return 'Stock Management';
    } else if (path.startsWith('/superadmin/transfers')) {
      return 'Stock Transfers';
    } else if (path.startsWith('/superadmin/sales')) {
      return 'Sales Monitor';
    } else if (path.startsWith('/superadmin/jobsheets')) {
      return 'Job Sheets Monitor';
    } else if (path.startsWith('/superadmin/inventory')) {
      return 'Inventory Monitor';
    } else if (path.startsWith('/superadmin/notifications/dashboard')) {
      return 'Notification Dashboard';
    } else if (path.startsWith('/superadmin/notifications/settings')) {
      return 'Notification Settings';
    } else if (path.startsWith('/superadmin/notifications')) {
      return 'Notifications';
    } else if (path.startsWith('/superadmin/settings')) {
      return 'Settings';
    } else if (path.endsWith('/quick-pos')) {
      return 'Quick POS';
    }

    return 'Super Admin Panel';
  };

  return (
    <div className="theme-organization flex h-screen bg-gradient-to-br from-slate-100 via-orange-50/40 to-indigo-100">
      {!hideChrome && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div
        className={`transition-all duration-300 flex flex-col flex-1 w-full min-w-0 ${
          hideChrome ? 'ml-0' : isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        <TopNavbar
          title={getPageTitle()}
          isSidebarCollapsed={isSidebarCollapsed}
          onMobileMenuClick={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
          isPosRoute={isPosRoute}
          isPosFullscreen={hideChrome}
          onTogglePosFullscreen={
            isPosRoute ? () => setIsPosFullscreen(prev => !prev) : undefined
          }
        />

        <main
          className={`w-full min-w-0 overflow-x-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 ${
            hideChrome
              ? 'pt-14 px-2 pb-2 min-h-0 flex-1 overflow-y-auto'
              : 'pt-16 sm:pt-20 px-2 sm:px-4 pb-6 sm:pb-8 min-h-screen'
          }`}
        >
          <div className="w-full max-w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {!hideChrome && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
}
