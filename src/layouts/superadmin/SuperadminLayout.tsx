import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { usePermissions } from '@/hooks/usePermissions';

export default function SuperadminLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const { isOrganizationAdmin, isSuperAdmin } = usePermissions();

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
    }

    return 'Super Admin Panel';
  };

  return (
    <div className="theme-organization flex h-screen bg-gradient-to-br from-slate-100 via-orange-50/40 to-indigo-100">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div
        className={`transition-all duration-300 flex flex-col flex-1 w-full min-w-0 ${
          isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* Top Navbar */}
        <TopNavbar
          title={getPageTitle()}
          isSidebarCollapsed={isSidebarCollapsed}
          onMobileMenuClick={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />

        {/* Page Content */}
        <main className="pt-16 sm:pt-20 px-2 sm:px-4 pb-6 sm:pb-8 min-h-screen w-full min-w-0 overflow-x-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
          <div className="w-full max-w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
}