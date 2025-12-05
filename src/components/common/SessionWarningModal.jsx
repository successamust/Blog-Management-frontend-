import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RefreshCw, X } from 'lucide-react';
import { extendSession, getRemainingTime } from '../../utils/sessionManager';

const SessionWarningModal = ({ isOpen, onExtend, onClose }) => {
  const [remainingTime, setRemainingTime] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const updateRemainingTime = () => {
      const remaining = getRemainingTime();
      setRemainingTime(remaining);
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExtend = () => {
    extendSession(30 * 60 * 1000); // Extend by 30 minutes
    if (onExtend) {
      onExtend();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--surface-bg)] rounded-2xl border border-[var(--border-subtle)] shadow-xl max-w-md w-full p-6 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Session Expiring Soon</h2>
          </div>

          <p className="text-[var(--text-secondary)] mb-4">
            Your session will expire soon. Please save your work and extend your session to continue.
          </p>

          {remainingTime !== null && (
            <div className="bg-[var(--surface-subtle)] rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">Time remaining</span>
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                {formatTime(remainingTime)}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 btn btn-outline"
            >
              Continue
            </button>
            <button
              onClick={handleExtend}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Extend Session
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SessionWarningModal;

