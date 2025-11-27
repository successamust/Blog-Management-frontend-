import React, { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = [
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['/', 'Ctrl', 'K'], description: 'Focus search' },
    { keys: ['Esc'], description: 'Close modals/dialogs' },
    { keys: ['Ctrl', '/'], description: 'Toggle dark mode' },
    { keys: ['g', 'h'], description: 'Go to home' },
    { keys: ['g', 'p'], description: 'Go to posts' },
    { keys: ['g', 'd'], description: 'Go to dashboard' },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Show shortcuts with ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowHelp(true);
      }

      // Focus search with / or Ctrl+K
      if (
        (e.key === '/' && !e.ctrlKey && !e.metaKey) ||
        (e.key === 'k' && (e.ctrlKey || e.metaKey))
      ) {
        const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }

      // Navigation shortcuts (g + key)
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        const handleNavigation = (nextKey) => {
          if (nextKey === 'h') {
            window.location.href = '/';
          } else if (nextKey === 'p') {
            window.location.href = '/posts';
          } else if (nextKey === 'd') {
            window.location.href = '/dashboard';
          }
        };

        const navigationHandler = (e2) => {
          handleNavigation(e2.key);
          document.removeEventListener('keydown', navigationHandler);
        };

        document.addEventListener('keydown', navigationHandler);
        setTimeout(() => {
          document.removeEventListener('keydown', navigationHandler);
        }, 1000);
      }

      // Close modals with Esc
      if (e.key === 'Escape') {
        setShowHelp(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderKeys = (keys) => {
    return keys.map((key, index) => (
      <React.Fragment key={index}>
        {index > 0 && <span className="text-gray-400 mx-1">+</span>}
        <kbd className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded shadow-sm">
          {key}
        </kbd>
      </React.Fragment>
    ));
  };

  return (
    <AnimatePresence>
      {showHelp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center">
                    {renderKeys(shortcut.keys)}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Press <kbd className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border rounded">Esc</kbd> to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcuts;

