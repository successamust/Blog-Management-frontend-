import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CollapsibleSidebar = ({
  children,
  defaultCollapsed = false,
  className = '',
}) => {
  const getInitialCollapsed = () => {
    if (defaultCollapsed) return true;
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  };

  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);

  const renderContent =
    typeof children === 'function'
      ? children({ isCollapsed, toggleCollapse: () => setIsCollapsed((prev) => !prev) })
      : children;

  return (
    <motion.div
      className={`sidebar-glass relative ${className}`}
      initial={false}
      animate={{
        width: isCollapsed ? '80px' : '280px',
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="right"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              key="left"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Sidebar Content */}
      <div className="h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={isCollapsed ? 'collapsed' : 'expanded'}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className={isCollapsed ? 'px-3 py-4' : 'p-4'}
          >
            {renderContent}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CollapsibleSidebar;

