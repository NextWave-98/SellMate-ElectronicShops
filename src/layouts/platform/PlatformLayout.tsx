import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PlatformSidebar from './PlatformSidebar';
import PlatformTopNavbar from './PlatformTopNavbar';

/**
 * Platform Management Layout
 * For super admin platform-level operations:
 * - Organization Management
 * - Permission Management
 * - Subscription Management
 * - System Configuration
 */
export default function PlatformLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Function to get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;

    if (path === '/platform' || path === '/platform/') {
      return 'Platform Overview';
    } else if (path.startsWith('/platform/organizations')) {
      return 'Organizations Management';
    } else if (path.startsWith('/platform/permissions')) {
      return 'Permissions Management';
    } else if (path.startsWith('/platform/roles')) {
      return 'Role Management';
    } else if (path.startsWith('/platform/subscriptions')) {
      return 'Subscriptions Management';
    } else if (path.startsWith('/platform/settings')) {
      return 'Platform Settings';
    }

    return 'Platform Management';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <PlatformSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <PlatformTopNavbar
          title={getPageTitle()}
          isSidebarCollapsed={isSidebarCollapsed}
          onMobileMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 min-w-0">
          <div className="w-full max-w-full min-w-0 mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
}
