import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setWasOffline(true);
      // Hide the "back online" message after 3 seconds
      setTimeout(() => {
        setWasOffline(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(isOffline || wasOffline) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-50 p-4 text-center text-sm font-medium ${
            isOffline
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-500 text-white'
          } shadow-lg`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-2">
            {isOffline ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span>You&apos;re offline. Some features may be limited.</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                <span>You&apos;re back online!</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;

