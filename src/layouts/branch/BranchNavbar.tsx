import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useBusinessProfile from '../../hooks/useBusinessProfile';
import useCourier from '../../hooks/useCourier';

import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Truck,
  Maximize,
  Minimize,
  User,
  Settings,
  Store,
  LogOut,
  ChevronDown,
  Menu,
} from 'lucide-react';

interface BranchNavbarProps {
  onMobileMenuClick?: () => void;
  isPosRoute?: boolean;
  isPosFullscreen?: boolean;
  onTogglePosFullscreen?: () => void;
}
import { CourierShipmentModal } from '@/components/courier/modals';

const BranchNavbar = ({
  onMobileMenuClick,
  isPosRoute = false,
  isPosFullscreen = false,
  onTogglePosFullscreen,
}: BranchNavbarProps) => {
  const { user, logout } = useAuth();
  const { branchCode } = useParams();
  const { businessData, loadBusinessProfile } = useBusinessProfile();
  const { courierServices, fetchCourierServices, createCourierShipment } = useCourier();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBusinessProfile();
  }, [loadBusinessProfile]);

  useEffect(() => {
    if (showCourierModal) fetchCourierServices();
  }, [showCourierModal]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const syncBrowserFullscreen = () => setIsBrowserFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', syncBrowserFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncBrowserFullscreen);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/login';
    }
  };

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
        // Browser may block fullscreen without a user gesture or policy; chrome hide still works.
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

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <>
    <nav className={`sticky top-0 isolate  bg-white/70 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/40 ${isProfileOpen ? 'z-[100]' : ''}`} style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      <div className="px-3 sm:px-4 md:px-5 h-14 flex items-center justify-between gap-2 sm:gap-4 min-w-0">

        {/* ── Left: menu + brand + branch pill + clock ── */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {!isPosFullscreen && (
            <button
              onClick={onMobileMenuClick}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white/60 transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Org name */}
          {businessData?.name && (
            <div className="hidden xl:flex flex-col leading-tight border-r border-gray-100 pr-4 flex-shrink-0">
              <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Organization</span>
              <span className="text-sm font-bold text-gray-800 truncate max-w-[160px]">{businessData.name}</span>
            </div>
          )}

          {/* Branch pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-blue-500/10 border border-blue-300/40 backdrop-blur-sm rounded-xl px-2 sm:px-3 py-1.5 min-w-0">
            <Store className="w-4 h-4 text-[#1e3a8a] flex-shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wide hidden sm:block">Branch</p>
              <p className="text-xs font-bold text-[#1e3a8a] truncate">{branchCode || user?.branchId}</p>
            </div>
          </div>

          {/* Clock */}
          <div className="hidden lg:flex flex-col leading-tight pl-1 flex-shrink-0">
            <span className="text-[11px] text-gray-400">{formatDate(currentTime)}</span>
            <span className="text-xs font-semibold text-gray-700 tabular-nums">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* ── Right: actions ── */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

          {/* Quick POS */}
          <Link
            to={`/${branchCode}/pos`}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2 bg-[#1e3a8a]/90 hover:bg-[#162d6e] text-white text-xs font-semibold rounded-xl transition-colors shadow-[0_2px_10px_rgba(30,58,138,0.35)]"
            title="Quick POS"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Quick PoS</span>
          </Link>

          {/* Quick Courier */}
          <button
            onClick={() => setShowCourierModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-[0_2px_10px_rgba(5,150,105,0.30)]"
            title="Quick Courier"
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Quick Courier</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={
              isPosRoute
                ? isFullscreenActive
                  ? 'Exit POS fullscreen'
                  : 'Enter POS fullscreen'
                : isFullscreenActive
                  ? 'Exit Fullscreen'
                  : 'Enter Fullscreen'
            }
            className="flex w-8 h-8 items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white/60 rounded-lg transition-colors"
          >
            {isFullscreenActive ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/60 border border-transparent hover:border-white/50 transition-all"
            >
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {userInitial}
              </div>
              {/* Name + role */}
              <div className="hidden sm:flex flex-col leading-tight text-left">
                <span className="text-xs font-semibold text-gray-800 truncate max-w-[96px]">{user?.name}</span>
                <span className="text-[10px] text-gray-400 truncate max-w-[96px]">{user?.role?.name}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown */}
            {isProfileOpen && (
              <div
                className="absolute right-0 mt-1.5 w-[min(240px,calc(100vw-2rem))] z-[110] bg-white/95 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl border border-white/40 py-1.5"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
              >
                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-3 border-b border-white/40 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user?.role?.name}</p>
                  </div>
                </div>

                {/* Menu items */}
                <Link
                  to={`/${branchCode}/profile`}
                  onClick={() => setIsProfileOpen(false)}
                  className="flex z-50 items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-white/60 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Profile Settings
                </Link>
                <Link
                  to={`/${branchCode}/settings`}
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-white/60 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Notification Settings
                </Link>

                <div className="border-t border-white/40 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
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
    </nav>

    {showCourierModal && (
      <CourierShipmentModal
        onClose={() => setShowCourierModal(false)}
        onSave={async (data) => {
          const response = await createCourierShipment(data);
          if (!response?.success) {
            toast.error(response?.message || 'Failed to create shipment');
          }
          return response;
        }}
        courierServices={courierServices}
        variant="blue"
      />
    )}
  </>);
};

export default BranchNavbar;