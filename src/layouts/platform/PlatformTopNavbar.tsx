import { Menu, User, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PlatformTopNavbarProps {
  title: string;
  isSidebarCollapsed: boolean;
  onMobileMenuClick: () => void;
}

export default function PlatformTopNavbar({
  title,
  isSidebarCollapsed,
  onMobileMenuClick,
}: PlatformTopNavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      // No need to navigate - logout will handle redirect with window.location.href
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect to login even if logout fails
      window.location.href = '/admin/login';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
      <div className="h-16 px-3 sm:px-4 md:px-6 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>

          {/* Page Title */}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate">{title}</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Platform Management</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Super Admin'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role?.name || 'SUPER_ADMIN'}</p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    navigate('/superadmin/profile');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Profile</span>
                </button>

                <hr className="my-2" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 text-left hover:bg-red-50 transition-colors text-red-600"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
