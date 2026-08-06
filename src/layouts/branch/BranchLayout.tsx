import { Outlet, useLocation } from 'react-router-dom';
import BranchNavbar from './BranchNavbar';
import BranchSidebar from './BranchSidebar';
import { useEffect, useRef, useState } from 'react';
import { ShieldX, Loader2 } from 'lucide-react';
import useBranchScope from '../../hooks/useBranchScope';
import { useActivityHeartbeat } from '../../hooks/useActivityHeartbeat';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';

const isPosPath = (pathname: string) =>
  pathname.endsWith('/pos') || pathname.endsWith('/quick-pos');

const BranchLayout = () => {
  const location = useLocation();
  const { ready, syncing, error: scopeError } = useBranchScope();
  const { hasPermission } = usePermissions();
  useActivityHeartbeat(hasPermission(PERMISSIONS.ACTIVITY_MONITORING_VIEW_OWN));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPosFullscreen, setIsPosFullscreen] = useState(false);
  const [accessDenied, setAccessDenied] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });

  const isPosRoute = isPosPath(location.pathname);
  const hideChrome = isPosRoute && isPosFullscreen;

  const deniedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const handlePermissionDenied = (event: Event) => {
      const { message } = (event as CustomEvent<{ message: string }>).detail;
      setAccessDenied(prev => {
        if (prev.show) return prev;
        return { show: true, message: message || 'You do not have permission to access this resource.' };
      });
      if (deniedTimerRef.current) clearTimeout(deniedTimerRef.current);
    };
    window.addEventListener('permission:denied', handlePermissionDenied);
    return () => {
      window.removeEventListener('permission:denied', handlePermissionDenied);
      if (deniedTimerRef.current) clearTimeout(deniedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setAccessDenied({ show: false, message: '' });
  }, [location.pathname]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setIsPosFullscreen(isPosRoute);
  }, [isPosRoute]);

  useEffect(() => {
    document.documentElement.dataset.theme = 'branch';
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, []);

  return (
    <div className="theme-branch flex h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {!hideChrome && (
        <BranchSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div
        className={`transition-all duration-300 flex flex-col flex-1 w-full min-w-0 ${
          hideChrome ? 'ml-0' : isSidebarCollapsed ? 'lg:ml-[60px]' : 'lg:ml-64'
        }`}
      >
        <BranchNavbar
          onMobileMenuClick={() => setIsMobileSidebarOpen(prev => !prev)}
          isPosRoute={isPosRoute}
          isPosFullscreen={hideChrome}
          onTogglePosFullscreen={
            isPosRoute ? () => setIsPosFullscreen(prev => !prev) : undefined
          }
        />

        <main
          className={`relative z-0 flex-1 overflow-y-auto overflow-x-hidden min-w-0 ${
            hideChrome ? 'p-2 sm:p-3' : 'p-3 sm:p-4 md:p-6'
          }`}
        >
          <div className="w-full max-w-full min-w-0">
            {syncing || !ready ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-[#1e3a8a] mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Loading page...</p>
                </div>
              </div>
            ) : scopeError ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <div className="text-center max-w-sm">
                  <ShieldX className="w-10 h-10 text-red-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-700">{scopeError}</p>
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>

        {accessDenied.show && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/40 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.18)] w-full max-w-sm mx-4 overflow-hidden">
              <div className="bg-red-600 px-6 py-5 flex flex-col items-center">
                <div className="bg-white/20 rounded-full p-3 mb-2">
                  <ShieldX className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-white text-xl font-bold">Access Denied</h2>
              </div>

              <div className="px-6 py-5 text-center">
                <p className="text-gray-700 text-sm leading-relaxed mb-1">
                  You don't have permission to access this resource.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Please contact your administrator to request access.
                </p>
                {accessDenied.message && (
                  <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-4 py-2 text-xs text-red-700 text-left wrap-break-word">
                    {accessDenied.message}
                  </div>
                )}
              </div>

              <div className="px-6 pb-5 flex gap-3">
                <button
                  onClick={() => setAccessDenied({ show: false, message: '' })}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  OK, Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!hideChrome && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default BranchLayout;
