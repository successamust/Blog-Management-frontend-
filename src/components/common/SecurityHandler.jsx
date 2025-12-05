import React, { useState, useEffect } from 'react';
import SessionWarningModal from './SessionWarningModal';
import AccountLockoutModal from './AccountLockoutModal';
import { useAuth } from '../../context/AuthContext';

/**
 * Global Security Handler
 * Listens for security events and displays appropriate modals
 */
const SecurityHandler = () => {
  const { isAuthenticated } = useAuth();
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState(null);
  const [showLockout, setShowLockout] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Listen for session warning events
    const handleSessionWarning = () => {
      setShowSessionWarning(true);
    };

    // Listen for session expired events
    const handleSessionExpired = () => {
      // Session expired is handled by AuthContext
    };

    // Listen for account lockout events (from API errors)
    const handleAccountLockout = (event) => {
      if (event.detail?.lockoutInfo) {
        setLockoutInfo(event.detail.lockoutInfo);
        setShowLockout(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('session-warning', handleSessionWarning);
      window.addEventListener('session-expired', handleSessionExpired);
      window.addEventListener('account-lockout', handleAccountLockout);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('session-warning', handleSessionWarning);
        window.removeEventListener('session-expired', handleSessionExpired);
        window.removeEventListener('account-lockout', handleAccountLockout);
      }
    };
  }, [isAuthenticated]);

  // Check for lockout info in localStorage (persisted across page reloads)
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const storedLockout = localStorage.getItem('account_lockout');
      if (storedLockout) {
        try {
          const lockout = JSON.parse(storedLockout);
          if (lockout.until && Date.now() < lockout.until) {
            setLockoutInfo(lockout);
            setShowLockout(true);
          } else {
            // Lockout expired, clear it
            localStorage.removeItem('account_lockout');
          }
        } catch (error) {
          localStorage.removeItem('account_lockout');
        }
      }
    }
  }, []);

  // Store lockout info when it changes
  useEffect(() => {
    if (lockoutInfo) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('account_lockout', JSON.stringify(lockoutInfo));
      }
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('account_lockout');
      }
    }
  }, [lockoutInfo]);

  return (
    <>
      <SessionWarningModal
        isOpen={showSessionWarning}
        onExtend={() => {
          // Session extended
        }}
        onClose={() => setShowSessionWarning(false)}
      />
      <AccountLockoutModal
        isOpen={showLockout}
        lockoutInfo={lockoutInfo}
        onClose={() => {
          setShowLockout(false);
          // Don't clear lockout info - it should persist until expired
        }}
      />
    </>
  );
};

export default SecurityHandler;

