/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Search, User, ChevronDown, Menu, X, LogOut, Settings, ShoppingCart, Truck, Maximize, Minimize } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useNotification, { type Notification as NotificationItem } from '../../hooks/useNotification';
import useCourier from '../../hooks/useCourier';
import { CourierShipmentModal } from '../../components/courier/modals';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';

interface TopNavbarProps {
  title: string;
  isSidebarCollapsed?: boolean;
  onMobileMenuClick?: () => void;
  isPosRoute?: boolean;
  isPosFullscreen?: boolean;
  onTogglePosFullscreen?: () => void;
}

export default function TopNavbar({
  title,
  isSidebarCollapsed = false,
  onMobileMenuClick,
  isPosRoute = false,
  isPosFullscreen = false,
  onTogglePosFullscreen,
}: TopNavbarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { getMyNotifications } = useNotification();
  const { courierServices, fetchCourierServices, createCourierShipment } = useCourier();
  const { hasPermission, hasCourierAccess, isSuperAdmin } = usePermissions();
  const canQuickPos = isSuperAdmin || hasPermission(PERMISSIONS.SALES_CREATE);
  const canQuickCourier = hasCourierAccess();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!isNotificationOpen) return;
      setLoadingNotifications(true);
      try {
        const response = await getMyNotifications({ limit: 10 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (response as any)?.data ?? (Array.isArray(response) ? response : []);
        setNotifications(data.filter((n: NotificationItem) => n.status === 'PENDING' || n.status === 'SENT'));
      } catch {
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };
    loadNotifications();
  }, [isNotificationOpen]);

  useEffect(() => {
    const syncBrowserFullscreen = () => setIsBrowserFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', syncBrowserFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncBrowserFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    if (isPosRoute && onTogglePosFullscreen) {
      const entering = !isPosFullscreen;
      onTogglePosFullscreen();
      try {
        if (entering && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else if (!entering && document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // Chrome hide still works if browser fullscreen is blocked.
      }
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen API errors
    }
  };

  const isFullscreenActive = isPosRoute ? isPosFullscreen : isBrowserFullscreen;
  const unreadCount = notifications.length;
  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'A';

  const getNotifRoute = (n: NotificationItem) => {
    if (n.saleId) return '/superadmin/sales';
    if (n.productReturnId) return '/superadmin/returns';
    if (n.jobSheetId) return '/superadmin/jobsheets';
    return '/superadmin/notifications/dashboard';
  };

  const getNotifColor = (type: string) => {
    if (type.includes('SALE')) return { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' };
    if (type.includes('RETURN')) return { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' };
    return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' };
  };

  const formatTimeAgo = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
  <>
    <div
      className={`fixed top-0 right-0 left-0  transition-all duration-300
        bg-white/70 backdrop-blur-2xl backdrop-saturate-150
        border-b border-white/40 ${isProfileOpen ? 'z-100' : 'z-10'} ${
        isPosFullscreen ? 'lg:ml-0' : isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
    >
      <div className="h-14 px-4 lg:px-6 flex items-center justify-between gap-4">

        {/* ── Left: hamburger + title ── */}
        <div className="flex items-center gap-3 min-w-0">
          {!isPosFullscreen && (
            <button
              onClick={onMobileMenuClick}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white/60 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">{title}</h1>
            <p className="hidden sm:block text-[11px] text-gray-400 tabular-nums truncate">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── Right: search + notifs + profile ── */}
        <div className="flex items-center gap-1.5">

          {/* Quick POS */}
          {canQuickPos && !isPosRoute && (
            <button
              onClick={() => navigate('/superadmin/quick-pos')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e3a8a]/90 hover:bg-[#162d6e] text-white text-xs font-semibold rounded-xl transition-colors shadow-[0_2px_10px_rgba(30,58,138,0.25)]"
              title="Quick POS"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Quick POS</span>
            </button>
          )}

          {isPosRoute ? (
            <button
              onClick={toggleFullscreen}
              title={isPosFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                isPosFullscreen
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-[0_2px_10px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-700/90 hover:bg-slate-800 text-white shadow-[0_2px_10px_rgba(51,65,85,0.3)]'
              }`}
            >
              {isPosFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {isPosFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </span>
            </button>
          ) : (
            <button
              onClick={toggleFullscreen}
              title={isFullscreenActive ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="hidden sm:flex w-8 h-8 items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white/60 rounded-lg transition-colors"
            >
              {isFullscreenActive ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}

          {/* Quick Courier */}
          {canQuickCourier && (
            <button
              onClick={() => { fetchCourierServices(); setShowCourierModal(true); }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-[0_2px_10px_rgba(5,150,105,0.25)]"
              title="Quick Courier"
            >
              <Truck className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Quick Courier</span>
            </button>
          )}

          {/* Search — desktop */}
          <div className="relative hidden md:block">
            {isSearchOpen ? (
              <div className="flex items-center gap-2 bg-white/50 border border-white/50 backdrop-blur-sm rounded-xl px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search shops, staff, inventory…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
                />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white/60 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search — mobile toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white/60 transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setIsNotificationOpen(!isNotificationOpen); setIsProfileOpen(false); }}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white/60 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>

            {isNotificationOpen && (
              <div
                className="absolute right-0 mt-1.5 w-[min(360px,calc(100vw-2rem))] bg-white/90 backdrop-blur-xl backdrop-saturate-150 rounded-2xl border border-white/40 z-50 overflow-hidden"
                style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.14)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/40">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[11px] font-semibold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-white/30">
                  {loadingNotifications ? (
                    <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
                  ) : notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">All caught up</p>
                    </div>
                  ) : notifications.map((n) => {
                    const color = getNotifColor(n.type);
                    return (
                      <Link
                        key={n.id}
                        to={getNotifRoute(n)}
                        onClick={() => setIsNotificationOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-white/50 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Bell className={`w-4 h-4 ${color.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {n.type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full ${color.dot} flex-shrink-0 mt-2`} />
                      </Link>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="border-t border-white/40 px-4 py-2.5">
                  <Link
                    to="/superadmin/notifications/dashboard"
                    onClick={() => setIsNotificationOpen(false)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View all notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotificationOpen(false); }}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-white/60 border border-transparent hover:border-white/50 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-blue-950 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {userInitial}
              </div>
              <div className="hidden sm:flex flex-col leading-tight text-left">
                <span className="text-xs font-semibold text-gray-800 truncate max-w-[96px]">{user?.name ?? 'Super Admin'}</span>
                <span className="text-[10px] text-gray-400 truncate max-w-[96px]">{user?.email ?? ''}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <div
                className="absolute right-0 mt-1.5 w-[min(240px,calc(100vw-2rem))] bg-white/90 backdrop-blur-xl backdrop-saturate-150 rounded-2xl border border-white/40 py-1.5 z-50 overflow-hidden"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/40 mb-1">
                  <div className="w-9 h-9 rounded-full bg-blue-950 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name ?? 'Super Admin'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user?.email ?? ''}</p>
                  </div>
                </div>

                <Link
                  to="/superadmin/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-white/60 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Profile Settings
                </Link>
                <Link
                  to="/superadmin/notifications/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-white/60 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Notification Settings
                </Link>

                <div className="border-t border-white/40 mt-1 pt-1">
                  <button
                    onClick={async () => {
                      setIsProfileOpen(false);
                      try { await logout(); }
                      catch { window.location.href = '/admin/login'; }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      {isSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1">
          <div className="flex items-center gap-2 bg-white/50 border border-white/50 backdrop-blur-sm rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search shops, staff, inventory…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
            />
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

    </div>

    {/* Quick Courier Modal — rendered outside the fixed navbar div to avoid stacking-context clipping */}
    {showCourierModal && (
      <CourierShipmentModal
        courierServices={courierServices}
        onClose={() => setShowCourierModal(false)}
        onSave={async (data: any) => {
          const response = await createCourierShipment(data);
          if (!response?.success) {
            toast.error(response?.message || 'Failed to create shipment');
          }
          return response;
        }}
        variant="orange"
      />
    )}
  </>
  );
}