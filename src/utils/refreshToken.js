/**
 * Refresh Token Management
 * Handles refresh token storage, rotation, and automatic token refresh
 */

const REFRESH_TOKEN_KEY = 'nexus_refresh_token';
const ACCESS_TOKEN_EXPIRY_KEY = 'nexus_token_expiry';
const REFRESH_TOKEN_EXPIRY_KEY = 'nexus_refresh_token_expiry';

let refreshToken = null;
let accessTokenExpiry = null;
let refreshTokenExpiry = null;
let refreshPromise = null; // Prevent concurrent refresh requests

/**
 * Get refresh token from storage
 */
export const getRefreshToken = () => {
  if (refreshToken) {
    return refreshToken;
  }
  
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (stored) {
      refreshToken = stored;
      return refreshToken;
    }
  }
  
  return null;
};

/**
 * Set refresh token
 */
export const setRefreshToken = (token, expiry = null) => {
  refreshToken = token;
  
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
      if (expiry) {
        localStorage.setItem(REFRESH_TOKEN_EXPIRY_KEY, expiry.toString());
        refreshTokenExpiry = expiry;
      }
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_EXPIRY_KEY);
      refreshTokenExpiry = null;
    }
  }
};

/**
 * Clear refresh token
 */
export const clearRefreshToken = () => {
  refreshToken = null;
  refreshTokenExpiry = null;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_EXPIRY_KEY);
  }
};

/**
 * Set access token expiry
 */
export const setAccessTokenExpiry = (expiry) => {
  accessTokenExpiry = expiry;
  
  if (typeof localStorage !== 'undefined') {
    if (expiry) {
      localStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, expiry.toString());
    } else {
      localStorage.removeItem(ACCESS_TOKEN_EXPIRY_KEY);
    }
  }
};

/**
 * Get access token expiry
 */
export const getAccessTokenExpiry = () => {
  if (accessTokenExpiry) {
    return accessTokenExpiry;
  }
  
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(ACCESS_TOKEN_EXPIRY_KEY);
    if (stored) {
      accessTokenExpiry = parseInt(stored);
      return accessTokenExpiry;
    }
  }
  
  return null;
};

/**
 * Check if access token is expired or about to expire
 */
export const isAccessTokenExpired = (bufferMinutes = 5) => {
  const expiry = getAccessTokenExpiry();
  if (!expiry) {
    return true; // No expiry info means we should refresh
  }
  
  const bufferMs = bufferMinutes * 60 * 1000;
  return Date.now() >= (expiry - bufferMs);
};

/**
 * Check if refresh token is expired
 */
export const isRefreshTokenExpired = () => {
  if (!refreshTokenExpiry) {
    const stored = localStorage?.getItem(REFRESH_TOKEN_EXPIRY_KEY);
    if (stored) {
      refreshTokenExpiry = parseInt(stored);
    } else {
      return false; // No expiry info, assume valid
    }
  }
  
  return Date.now() >= refreshTokenExpiry;
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (apiInstance) => {
  // Prevent concurrent refresh requests
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await apiInstance.post('/auth/refresh', {}, {
        skipAuthRefresh: true, // Don't trigger refresh on this request
        withCredentials: true,
      });
      
      const { accessToken, expiresIn } = response.data;
      
      // Update tokens
      if (accessToken) {
        const { setAuthToken } = await import('./tokenStorage.js');
        setAuthToken(accessToken);
        
        // Calculate expiry
        if (expiresIn) {
          const expiry = Date.now() + (expiresIn * 1000);
          setAccessTokenExpiry(expiry);
        }
      }
      
      return accessToken;
    } catch (error) {
      // If refresh fails, clear tokens
      if (error.response?.status === 401 || error.response?.status === 403) {
        clearRefreshToken();
        const { clearAuthToken } = await import('./tokenStorage.js');
        clearAuthToken();
        const { clearCsrfToken } = await import('./securityUtils.js');
        clearCsrfToken();
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
};

/**
 * Clear all tokens
 */
export const clearAllTokens = async () => {
  clearRefreshToken();
  const { clearAuthToken } = await import('./tokenStorage.js');
  clearAuthToken();
};

