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
    <header className="glass sticky top-0 z-50 border-b border-white/20">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <img 
                src="/nexus-logo-icon.svg" 
                alt="The Nexus Blog Logo" 
                className="w-7 h-7"
              />
            </motion.div>
            <span className="hidden sm:inline text-base font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              The Nexus Blog
            </span>
          </Link>

          {/* Search Bar - Compact */}
          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/50 focus:bg-white/80 transition-all placeholder:text-slate-400"
              />
            </div>
          </form>

          {/* Navigation - Compact with Icons */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link
              to="/"
              className="text-slate-600 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/50"
            >
              Home
            </Link>
            <Link
              to="/posts"
              className="text-slate-600 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/50"
            >
              Posts
            </Link>
            <Link
              to="/categories"
              className="text-slate-600 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/50"
            >
              Categories
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-2 ml-2 pl-2 border-l border-white/30">
                {isAdmin() && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      to="/admin"
                      className="flex items-center space-x-1.5 text-slate-600 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/50"
                      title="Admin Dashboard"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                    </Link>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-1.5 text-slate-600 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/50"
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
                          className="w-8 h-8 rounded-full object-cover border-2 border-indigo-300 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                        <div 
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all hidden"
                        >
                          {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </>
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
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
                  className="text-slate-600 hover:text-red-600 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/50"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 ml-2">
                <Link
                  to="/login"
                  className="text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/50"
                >
                  Login
                </Link>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
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
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white/50 transition-all"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-white/20"
          >
            {/* Mobile Search Bar */}
            <form onSubmit={handleSearch} className="mb-4 px-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/50"
                />
              </div>
            </form>
            
            <div className="flex flex-col space-y-1">
              <Link
                to="/"
                className="text-slate-600 hover:text-indigo-600 hover:bg-white/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/posts"
                className="text-slate-600 hover:text-indigo-600 hover:bg-white/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                onClick={() => setIsMenuOpen(false)}
              >
                Posts
              </Link>
              <Link
                to="/categories"
                className="text-slate-600 hover:text-indigo-600 hover:bg-white/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
              
              {isAuthenticated ? (
                <>
                  {isAdmin() && (
                    <Link
                      to="/admin"
                      className="text-slate-600 hover:text-indigo-600 hover:bg-white/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className="text-slate-600 hover:text-indigo-600 hover:bg-white/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Dashboard
                  </Link>
                  {canApplyForAuthor && (
                    <Link
                      to="/dashboard?tab=author"
                      className="flex items-center space-x-2 text-slate-600 hover:text-indigo-600 hover:bg-white/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
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
                    className="text-left text-slate-600 hover:text-red-600 hover:bg-white/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-slate-600 hover:text-indigo-600 hover:bg-white/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
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