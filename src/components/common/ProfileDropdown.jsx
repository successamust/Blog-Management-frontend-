import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  UserCheck,
  ChevronDown,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const ProfileDropdown = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, isAdmin, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const canApplyForAuthor = user?.role !== 'author' && user?.role !== 'admin';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
    if (onLogout) onLogout();
  };

  const handleThemeToggle = () => {
    toggleTheme();
    // Don't close dropdown when toggling theme
  };

  const menuItems = [
    {
      icon: User,
      label: 'My Dashboard',
      to: '/dashboard',
      onClick: () => setIsOpen(false),
    },
    {
      icon: Settings,
      label: 'Settings',
      to: '/dashboard?tab=settings',
      onClick: () => setIsOpen(false),
    },
    {
      icon: isDark ? Sun : Moon,
      label: isDark ? 'Light Mode' : 'Dark Mode',
      onClick: handleThemeToggle,
      isThemeToggle: true,
    },
    ...(isAdmin() ? [{
      icon: LayoutDashboard,
      label: 'Admin Dashboard',
      to: '/admin',
      onClick: () => setIsOpen(false),
    }] : []),
    ...(canApplyForAuthor ? [{
      icon: UserCheck,
      label: 'Become Author',
      to: '/dashboard?tab=author',
      onClick: () => setIsOpen(false),
    }] : []),
    {
      icon: LogOut,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--surface-subtle)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {user?.profilePicture || user?.avatar ? (
          <img
            src={user.profilePicture || user.avatar}
            alt={user?.username || 'User'}
            className="w-8 h-8 rounded-full object-cover border-2 border-[var(--border-subtle)]"
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) {
                e.target.nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div 
          className={`w-8 h-8 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-white text-xs font-semibold ${user?.profilePicture || user?.avatar ? 'hidden' : ''}`}
        >
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface-bg)] rounded-xl shadow-lg border border-[var(--border-subtle)] z-50 overflow-hidden"
          >
            <div className="py-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const content = (
                  <div className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    item.danger
                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : item.isThemeToggle
                      ? 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
                  }`}>
                    <Icon className={`w-4 h-4 ${item.isThemeToggle && isDark ? 'text-amber-500' : item.isThemeToggle ? 'text-gray-600' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                );

                if (item.to) {
                  return (
                    <Link
                      key={index}
                      to={item.to}
                      onClick={item.onClick}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className="w-full text-left"
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;

