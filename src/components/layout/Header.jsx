import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Menu, 
  X,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandWordmark from '../common/BrandWordmark';
import NotificationCenter from '../common/NotificationCenter';
import ThemeToggle from '../common/ThemeToggle';
import LanguageSwitcher from '../common/LanguageSwitcher';
import WriteButton from '../common/WriteButton';
import ProfileDropdown from '../common/ProfileDropdown';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  
  const canApplyForAuthor = isAuthenticated && user?.role !== 'author' && user?.role !== 'admin';
  const isAuthorOrAdmin = isAuthenticated && (user?.role === 'author' || user?.role === 'admin');

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };

    if (showSearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowSearch(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };


  return (
    <header className="bg-[var(--surface-bg)] sticky top-0 z-50 border-b border-[var(--border-subtle)]" style={{ boxShadow: '0 2px 10px var(--shadow-default)' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8 relative" style={{ position: 'relative' }}>
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center group">
            <motion.img
              src="/nexus-logo-icon.svg"
              alt="Nexus"
              className="logo-theme-aware h-10 w-10 md:h-12 md:w-12 transition-transform group-hover:scale-110"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            {/* Navigation Links */}
            <div className="flex items-center gap-3 lg:gap-4">
              <Link
                to="/posts"
                className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
              >
                Posts
              </Link>
              <Link
                to="/categories"
                className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
              >
                Categories
              </Link>
            </div>

            {/* Vertical Separator */}
            {isAuthenticated && (
              <div className="h-6 w-px bg-[var(--border-subtle)]" />
            )}

            {isAuthenticated ? (
              <>
                {/* Primary Action - Write Button */}
                {isAuthorOrAdmin && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <WriteButton
                      as={Link}
                      to="/admin/posts/create"
                    >
                      Write.
                    </WriteButton>
                  </motion.div>
                )}

                {/* Utilities Group */}
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => setShowSearch(!showSearch)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-lg hover:bg-[var(--surface-subtle)] transition-colors"
                    title="Search"
                    aria-label="Search"
                  >
                    <Search className="w-5 h-5 text-[var(--text-secondary)]" />
                  </motion.button>
                  <NotificationCenter />
                </div>

                {/* Profile Dropdown */}
                <div className="pl-2 border-l border-[var(--border-subtle)]">
                  <ProfileDropdown />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                >
                  Login
                </Link>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/register"
                    className="btn btn-primary !w-auto"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </div>
            )}
          </nav>

          {/* Search Overlay */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                ref={searchRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="hidden md:block absolute top-full left-0 right-0 bg-[var(--surface-bg)] border-b border-[var(--border-subtle)] p-4 z-40 shadow-lg"
                style={{ position: 'absolute' }}
              >
                <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-10 pr-12 py-3 text-sm bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all placeholder:text-[var(--text-muted)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSearch(false)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label="Close search"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="btn-icon-square md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>

        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="md:hidden py-4 border-t border-[var(--border-subtle)] will-change-transform bg-[var(--surface-bg)]"
          >
            <form onSubmit={handleSearch} className="mb-4 px-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--text-primary)] focus:border-transparent"
                />
              </div>
            </form>

            {isAuthenticated && (
              <div className="flex items-center justify-between px-2 mb-4 gap-3">
                <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  Notifications
                </span>
                <NotificationCenter />
              </div>
            )}
            <div className="flex items-center justify-between px-2 mb-4 gap-3">
              <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Appearance
              </span>
              <ThemeToggle className="p-2 rounded-lg bg-[var(--surface-subtle)]" />
            </div>
            
            <div className="flex flex-col space-y-1 px-2">
              <Link
                to="/posts"
                className="px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Posts
              </Link>
              <Link
                to="/categories"
                className="px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
              
              {isAuthenticated ? (
                <>
                  {isAuthorOrAdmin && (
                    <div className="my-2">
                      <WriteButton
                        as={Link}
                        to="/admin/posts/create"
                        className="!w-auto !px-4 !py-2.5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Write.
                      </WriteButton>
                    </div>
                  )}
                  {isAdmin() && (
                    <Link
                      to="/admin"
                      className="px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className="px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Dashboard
                  </Link>
                  {canApplyForAuthor && (
                    <Link
                      to="/dashboard?tab=author"
                      className="px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-all duration-200 flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Become Author</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="px-3 py-2.5 text-left text-[var(--text-primary)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-all duration-200 text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
};

export default Header;