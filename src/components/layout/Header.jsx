import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  User, 
  LogOut, 
  Menu, 
  X,
  PenSquare,
  LayoutDashboard,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandWordmark from '../common/BrandWordmark';
import NotificationCenter from '../common/NotificationCenter';
import ThemeToggle from '../common/ThemeToggle';
import LanguageSwitcher from '../common/LanguageSwitcher';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Check if user can apply to become an author
  const canApplyForAuthor = isAuthenticated && user?.role !== 'author' && user?.role !== 'admin';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-[var(--border-subtle)]" style={{ boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <BrandWordmark variant="navigation" className="text-[var(--text-primary)]" />
          </Link>

          {/* Search Bar - Compact */}
          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--text-primary)] focus:border-transparent transition-all placeholder:text-[var(--text-muted)]"
              />
            </div>
          </form>

          {/* Navigation - Compact with Icons */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link
              to="/"
              className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !w-auto transition-all duration-200 hover:scale-105"
            >
              Home
            </Link>
            <Link
              to="/posts"
              className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !w-auto transition-all duration-200 hover:scale-105"
            >
              Posts
            </Link>
            <Link
              to="/categories"
              className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !w-auto transition-all duration-200 hover:scale-105"
            >
              Categories
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-2 ml-2 pl-2 border-l border-[var(--border-subtle)]">
                <LanguageSwitcher />
                <ThemeToggle />
                <NotificationCenter />
                {isAdmin() && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      to="/admin"
                      className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !w-auto transition-all duration-200"
                      title="Admin Dashboard"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                    </Link>
                  </motion.div>
                )}
                {canApplyForAuthor && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      to="/dashboard?tab=author"
                      className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !w-auto transition-all duration-200"
                      title="Become Author"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Become Author</span>
                    </Link>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/dashboard"
                    className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !w-auto transition-all duration-200"
                    title="Dashboard"
                  >
                    <User className="w-4 h-4" />
                  </Link>
                </motion.div>
                {/* Profile Avatar */}
                <Link to="/dashboard?tab=settings">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    {user?.profilePicture || user?.avatar ? (
                      <>
                        <img
                          src={user.profilePicture || user.avatar}
                          alt={user?.username || 'User'}
                          className="w-8 h-8 rounded-full object-cover border-2 border-[var(--border-subtle)] cursor-pointer hover:ring-2 hover:ring-[var(--border-subtle)] transition-all"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                        <div 
                          className="w-8 h-8 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-white text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-[var(--border-subtle)] transition-all hidden"
                        >
                          {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </>
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-white text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-[var(--border-subtle)] transition-all"
                      >
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </motion.div>
                </Link>
                <motion.button
                  onClick={handleLogout}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-ghost text-[var(--text-primary)] hover:text-red-600 hover:bg-red-50 !w-auto transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 ml-2">
                <Link
                  to="/login"
                  className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !w-auto transition-all duration-200 hover:scale-105"
                >
                  Login
                </Link>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/register"
                    className="btn btn-secondary !w-auto"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <motion.button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="btn-icon-square md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="md:hidden py-4 border-t border-[var(--border-subtle)] will-change-transform bg-white"
          >
            {/* Mobile Search Bar */}
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
            
            <div className="flex flex-col space-y-1">
              <Link
                to="/"
                className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !justify-start text-left transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/posts"
                className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !justify-start text-left transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Posts
              </Link>
              <Link
                to="/categories"
                className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !justify-start text-left transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
              
              {isAuthenticated ? (
                <>
                  {isAdmin() && (
                    <Link
                      to="/admin"
                      className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !justify-start text-left transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !justify-start text-left transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Dashboard
                  </Link>
                  {canApplyForAuthor && (
                    <Link
                      to="/dashboard?tab=author"
                      className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !justify-start text-left transition-all duration-200"
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
                    className="btn btn-ghost text-left text-[var(--text-primary)] hover:text-red-600 hover:bg-red-50 !justify-start transition-all duration-200"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn btn-ghost text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] !justify-start text-left transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-secondary !justify-start text-left"
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