import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Clock, X } from 'lucide-react';

const AccountLockoutModal = ({ isOpen, lockoutInfo, onClose }) => {
  const [remainingTime, setRemainingTime] = useState(null);

  useEffect(() => {
    if (!isOpen || !lockoutInfo?.until) return;

    const updateRemainingTime = () => {
      const now = Date.now();
      const until = lockoutInfo.until;
      const remaining = Math.max(0, until - now);
      setRemainingTime(remaining);
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [isOpen, lockoutInfo]);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Account Locked</h2>
          </div>

          <p className="text-[var(--text-secondary)] mb-4">
            {lockoutInfo?.reason || 'Your account has been temporarily locked due to too many failed login attempts.'}
          </p>

          {remainingTime !== null && remainingTime > 0 && (
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

          {remainingTime === 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                Your account lockout has expired. You can now try logging in again.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 btn btn-outline"
            >
              Close
            </button>
            {remainingTime === 0 && (
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/login';
                }}
                className="flex-1 btn btn-primary"
              >
                Try Again
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AccountLockoutModal;

