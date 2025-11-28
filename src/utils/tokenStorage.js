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

  if (typeof sessionStorage !== 'undefined') {
    const sessionToken = sessionStorage.getItem(TOKEN_COOKIE_KEY);
    if (sessionToken) {
      inMemoryToken = sessionToken;
      return sessionToken;
    }
  }

  if (typeof document !== 'undefined') {
    const cookies = document.cookie?.split(';') || [];
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === TOKEN_COOKIE_KEY && value) {
        try {
          const decoded = decodeURIComponent(value);
          inMemoryToken = decoded;
          return decoded;
        } catch (error) {
          console.warn('Failed to decode auth token cookie', error);
        }
      }
    }
  }

  return null;
};

export const clearAuthToken = () => {
  inMemoryToken = null;

  if (typeof document !== 'undefined') {
    document.cookie = buildCookie('', new Date(0));
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(TOKEN_COOKIE_KEY);
  }
};

