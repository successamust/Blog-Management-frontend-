/**
 * Session Management
 * Handles session timeouts, warnings, and activity tracking
 */

const SESSION_TIMEOUT_KEY = 'nexus_session_timeout';
const SESSION_WARNING_KEY = 'nexus_session_warning';
const LAST_ACTIVITY_KEY = 'nexus_last_activity';
const SESSION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

let sessionTimeout = null;
let warningShown = false;
let activityCheckInterval = null;
let sessionWarningCallback = null;
let sessionExpiredCallback = null;

/**
 * Initialize session management
 */
export const initSessionManager = (options = {}) => {
  const {
    timeout = 30 * 60 * 1000, // 30 minutes default
    warningTime = SESSION_WARNING_TIME,
    onWarning = null,
    onExpired = null,
  } = options;
  
  sessionWarningCallback = onWarning;
  sessionExpiredCallback = onExpired;
  
  // Update last activity
  updateLastActivity();
  
  // Set up activity tracking
  setupActivityTracking();
  
  // Set up session timeout
  setSessionTimeout(timeout, warningTime);
  
  return {
    extendSession,
    clearSession,
    getRemainingTime,
    isSessionExpired,
  };
};

/**
 * Update last activity timestamp
 */
export const updateLastActivity = () => {
  const now = Date.now();
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  }
  
  // Reset warning flag if session was extended
  if (warningShown) {
    warningShown = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_WARNING_KEY);
    }
  }
};

/**
 * Get last activity timestamp
 */
export const getLastActivity = () => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  return stored ? parseInt(stored) : null;
};

/**
 * Set up activity tracking
 */
const setupActivityTracking = () => {
  if (typeof window === 'undefined') return;
  
  // Track user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const handleActivity = () => {
    updateLastActivity();
  };
  
  events.forEach(event => {
    window.addEventListener(event, handleActivity, { passive: true });
  });
  
  // Check activity periodically
  activityCheckInterval = setInterval(() => {
    const lastActivity = getLastActivity();
    if (lastActivity) {
      const inactiveTime = Date.now() - lastActivity;
      // If inactive for more than 5 minutes, show warning
      if (inactiveTime > SESSION_WARNING_TIME && !warningShown) {
        showSessionWarning();
      }
    }
  }, ACTIVITY_CHECK_INTERVAL);
};

/**
 * Set session timeout
 */
const setSessionTimeout = (timeout, warningTime) => {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
  }
  
  const warningTimeout = timeout - warningTime;
  
  // Show warning before timeout
  sessionTimeout = setTimeout(() => {
    showSessionWarning();
    
    // Set actual timeout
    sessionTimeout = setTimeout(() => {
      handleSessionExpired();
    }, warningTime);
  }, warningTimeout);
  
  if (typeof localStorage !== 'undefined') {
    const expiryTime = Date.now() + timeout;
    localStorage.setItem(SESSION_TIMEOUT_KEY, expiryTime.toString());
  }
};

/**
 * Show session warning
 */
const showSessionWarning = () => {
  if (warningShown) return;
  
  warningShown = true;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SESSION_WARNING_KEY, 'true');
  }
  
  if (sessionWarningCallback) {
    sessionWarningCallback();
  }
  
  // Also dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-warning', {
      detail: { remainingTime: SESSION_WARNING_TIME },
    }));
  }
};

/**
 * Handle session expired
 */
const handleSessionExpired = () => {
  clearSession();
  
  if (sessionExpiredCallback) {
    sessionExpiredCallback();
  }
  
  // Dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-expired'));
  }
};

/**
 * Extend session
 */
export const extendSession = (timeout = 30 * 60 * 1000) => {
  updateLastActivity();
  setSessionTimeout(timeout, SESSION_WARNING_TIME);
};

/**
 * Clear session
 */
export const clearSession = () => {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }
  
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
    activityCheckInterval = null;
  }
  
  warningShown = false;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SESSION_TIMEOUT_KEY);
    localStorage.removeItem(SESSION_WARNING_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  }
};

/**
 * Get remaining session time
 */
export const getRemainingTime = () => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  
  const expiryTime = localStorage.getItem(SESSION_TIMEOUT_KEY);
  if (!expiryTime) {
    return null;
  }
  
  const remaining = parseInt(expiryTime) - Date.now();
  return remaining > 0 ? remaining : 0;
};

/**
 * Check if session is expired
 */
export const isSessionExpired = () => {
  const remaining = getRemainingTime();
  return remaining === null || remaining <= 0;
};

/**
 * Get session status
 */
export const getSessionStatus = () => {
  const remaining = getRemainingTime();
  const lastActivity = getLastActivity();
  
  return {
    isActive: remaining !== null && remaining > 0,
    remainingTime: remaining,
    lastActivity,
    inactiveTime: lastActivity ? Date.now() - lastActivity : null,
    warningShown,
  };
};

