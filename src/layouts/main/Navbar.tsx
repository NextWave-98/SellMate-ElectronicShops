import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <NavLink to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-rose-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-gradient-to-r from-indigo-600 to-rose-500 p-2 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              SellMate
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => scrollToSection('home')}
              className="px-5 py-2.5 text-gray-700 hover:text-indigo-600 font-semibold transition-all duration-200 rounded-lg hover:bg-indigo-50"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('packages')}
              className="px-5 py-2.5 text-gray-700 hover:text-indigo-600 font-semibold transition-all duration-200 rounded-lg hover:bg-indigo-50"
            >
              Packages
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="px-5 py-2.5 text-gray-700 hover:text-indigo-600 font-semibold transition-all duration-200 rounded-lg hover:bg-indigo-50"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="px-5 py-2.5 text-gray-700 hover:text-indigo-600 font-semibold transition-all duration-200 rounded-lg hover:bg-indigo-50"
            >
              Contact
            </button>
            
            {/* Login Button */}
            <button
              onClick={() => navigate('/login')}
              className="ml-4 px-8 py-3 bg-gradient-to-r from-indigo-600 to-rose-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Login</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2.5 hover:bg-gray-100 rounded-xl transition duration-200"
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className={`h-0.5 w-full bg-gray-700 rounded transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`h-0.5 w-full bg-gray-700 rounded transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`h-0.5 w-full bg-gray-700 rounded transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="py-4 space-y-2 border-t border-gray-200">
            <button
              onClick={() => scrollToSection('home')}
              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-semibold transition duration-200"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('packages')}
              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-semibold transition duration-200"
            >
              Packages
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-semibold transition duration-200"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-semibold transition duration-200"
            >
              Contact
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-rose-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Login</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
