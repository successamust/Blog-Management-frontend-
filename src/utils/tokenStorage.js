const TOKEN_COOKIE_KEY = 'nexus_auth_token';
const TOKEN_TTL_DAYS = 7;

let inMemoryToken = null;

const isSecureContext = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.location.protocol === 'https:';
};

const buildCookie = (value, expires) => {
  const secureFlag = isSecureContext() ? '; Secure' : '';
  const sameSite = '; SameSite=Strict';
  const base = `${TOKEN_COOKIE_KEY}=${value}; Path=/`;
  return `${base}${sameSite}${secureFlag}; Expires=${expires.toUTCString()}`;
};

export const setAuthToken = (token) => {
  inMemoryToken = token || null;

  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    document.cookie = buildCookie(encodeURIComponent(token || ''), expires);
  }

  // Store in localStorage for persistence across tab closes
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_COOKIE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_COOKIE_KEY);
    }
  }

  // Also store in sessionStorage for faster access during the session
  if (typeof sessionStorage !== 'undefined') {
    if (token) {
      sessionStorage.setItem(TOKEN_COOKIE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_COOKIE_KEY);
    }
  }
};

export const getAuthToken = () => {
  if (inMemoryToken) {
    return inMemoryToken;
  }

  let foundToken = null;
  let source = '';

  // Prioritize cookies over sessionStorage since cookies persist across tab closes
  // Cookies are more reliable for "remember me" functionality
  if (typeof document !== 'undefined') {
    const cookies = document.cookie?.split(';') || [];
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === TOKEN_COOKIE_KEY && value) {
        try {
          const decoded = decodeURIComponent(value);
          foundToken = decoded;
          source = 'cookie';
          break;
        } catch (error) {
          console.warn('Failed to decode auth token cookie', error);
        }
      }
    }
  }

  // Fallback to localStorage (persists across tab closes)
  if (!foundToken && typeof localStorage !== 'undefined') {
    const localToken = localStorage.getItem(TOKEN_COOKIE_KEY);
    if (localToken) {
      foundToken = localToken;
      source = 'localStorage';
    }
  }

  // Fallback to sessionStorage if cookie and localStorage not found
  if (!foundToken && typeof sessionStorage !== 'undefined') {
    const sessionToken = sessionStorage.getItem(TOKEN_COOKIE_KEY);
    if (sessionToken) {
      foundToken = sessionToken;
      source = 'sessionStorage';
    }
  }

  if (foundToken) {
    inMemoryToken = foundToken;
    // Sync to all storage locations for consistency
    if (source !== 'cookie' && typeof document !== 'undefined') {
      try {
        const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
        document.cookie = buildCookie(encodeURIComponent(foundToken), expires);
      } catch (e) {
        // Ignore cookie setting errors
      }
    }
    if (source !== 'localStorage' && typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_COOKIE_KEY, foundToken);
    }
    if (source !== 'sessionStorage' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TOKEN_COOKIE_KEY, foundToken);
    }
    
    if (import.meta.env.DEV) {
      console.log(`[Token] Retrieved from ${source}`);
    }
    
    return foundToken;
  }

  if (import.meta.env.DEV) {
    console.warn('[Token] No token found in any storage');
  }

  return null;
};

export const clearAuthToken = () => {
  inMemoryToken = null;

  if (typeof document !== 'undefined') {
    document.cookie = buildCookie('', new Date(0));
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_COOKIE_KEY);
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(TOKEN_COOKIE_KEY);
  }
};

