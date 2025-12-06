import axios from 'axios';
import { getAuthToken, clearAuthToken } from '../utils/tokenStorage.js';
import { getCachedResponse, setCachedResponse, shouldCache, CACHE_CONFIG, clearCache } from '../utils/apiCache.js';
import { deduplicateRequest } from '../utils/requestDeduplication.js';
import { 
  getCsrfToken, 
  fetchCsrfToken, 
  getSecurityHeaders,
  sanitizeInput,
  sanitizeHtml 
} from '../utils/securityUtils.js';
import { 
  refreshAccessToken, 
  isAccessTokenExpired,
  setAccessTokenExpiry,
  clearRefreshToken,
  clearAllTokens 
} from '../utils/refreshToken.js';
import { 
  handleRateLimitError, 
  getRateLimitInfo,
  formatRetryMessage 
} from '../utils/rateLimiter.js';

// Determine base URL based on environment
let BASE_URL = import.meta.env.VITE_API_BASE_URL;

// If no explicit base URL is set, use intelligent defaults
if (!BASE_URL) {
  if (import.meta.env.DEV) {
    // Development: use proxy (vite.config.js proxies /v1 to backend)
    BASE_URL = '/v1';
  } else {
    // Production: MUST have VITE_API_BASE_URL set
    // Don't use hardcoded fallback for security and flexibility
    console.error('[API] VITE_API_BASE_URL environment variable is required in production');
    BASE_URL = '/v1'; // Fallback to proxy (will fail if proxy not configured)
  }
}

// Ensure BASE_URL doesn't have trailing slash (but keep /v1 if it's just /v1)
if (BASE_URL !== '/v1') {
  BASE_URL = BASE_URL.replace(/\/$/, '');
}

// Security: Only log API configuration in development to prevent exposing backend URLs
if (import.meta.env.DEV) {
  console.log('[API] Base URL configured:', BASE_URL);
  console.log('[API] Mode:', import.meta.env.MODE);
  console.log('[API] Is Production:', import.meta.env.PROD);
} else if (!import.meta.env.VITE_API_BASE_URL) {
  // Only warn in production if configuration is missing (this is a critical issue)
  console.warn('[API] VITE_API_BASE_URL not set. Using default backend URL.');
}

// Log API configuration in development (only in verbose mode)
if (import.meta.env.DEV && import.meta.env.VITE_VERBOSE_LOGGING === 'true') {
  console.log('[API] Base URL:', BASE_URL);
  console.log('[API] Environment:', import.meta.env.MODE);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send httpOnly cookies (refresh token)
});

api.interceptors.request.use(
  async (config) => {
    // Handle FormData - remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      // Remove the default application/json Content-Type for FormData
      if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }
    
    // Skip security features if explicitly requested (e.g., for refresh token endpoint)
    const skipSecurity = config.skipAuthRefresh || config.skipCsrf || false;
    
    // Always get fresh token - it might have been restored from storage
    // This is especially important when tab becomes visible again
    let token = getAuthToken();
    
    // Check if token is expired and refresh if needed (unless skipping)
    if (!skipSecurity && token && isAccessTokenExpired()) {
      try {
        token = await refreshAccessToken(api);
      } catch (error) {
        // Only log refresh failures - don't clear tokens here
        // Network errors shouldn't cause logout - let the actual API call handle 401s
        // Only clear tokens on actual 401/403 responses from the API
        if (import.meta.env.DEV) {
          // Security: Only log token refresh failures in development
          if (import.meta.env.DEV) {
            console.warn('[API] Token refresh failed:', error);
          }
        }
        // Continue with original token - if it's actually expired, the API will return 401
        // and the response interceptor will handle it properly
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Log when token is missing for protected endpoints (in dev only)
      if (import.meta.env.DEV && config.url && (
        config.url.startsWith('/admin/') ||
        config.url.startsWith('/auth/') ||
        config.url.includes('/dashboard')
      )) {
        // Security: Only log in development to prevent exposing endpoint structure
        if (import.meta.env.DEV) {
          console.warn('[API] Request to protected endpoint without token:', config.url);
        }
      }
    }
    
    // Add CSRF token for state-changing requests (unless skipping)
    if (!skipSecurity && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const csrf = await getCsrfToken();
      if (!csrf && !config.url?.includes('/auth/csrf-token')) {
        // Try to fetch CSRF token if we don't have one
        await fetchCsrfToken(api);
        const newCsrf = await getCsrfToken();
        if (newCsrf) {
          config.headers['X-CSRF-Token'] = newCsrf;
        }
      } else if (csrf) {
        config.headers['X-CSRF-Token'] = csrf;
      }
    }
    
    // Add security headers
    if (!skipSecurity) {
      const securityHeaders = await getSecurityHeaders(api);
      Object.assign(config.headers, securityHeaders);
    }
    
    // Sanitize request data (skip FormData - it needs to be sent as-is for file uploads)
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      if (Array.isArray(config.data)) {
        config.data = config.data.map(item => 
          typeof item === 'string' ? sanitizeInput(item) : item
        );
      } else {
        // Sanitize string values in data object
        const sanitized = {};
        for (const [key, value] of Object.entries(config.data)) {
          if (typeof value === 'string' && key !== 'content' && key !== 'html') {
            sanitized[key] = sanitizeInput(value);
          } else if (key === 'content' || key === 'html') {
            // Use HTML sanitization for content fields
            sanitized[key] = sanitizeHtml(value);
          } else {
            sanitized[key] = value;
          }
        }
        config.data = sanitized;
      }
    }
    
    if (typeof window !== 'undefined') {
      config._startTime = Date.now();
    }
    
    if (shouldCache(config.method, config.url)) {
      // Extract base URL and params properly
      // Axios keeps params separate in config.params, but we need to handle both cases
      let baseUrl = config.url || '';
      let params = config.params || {};
      
      // If URL already contains query params (e.g., from manual URL construction), extract them
      const queryIndex = baseUrl.indexOf('?');
      if (queryIndex !== -1) {
        const queryString = baseUrl.substring(queryIndex + 1);
        baseUrl = baseUrl.substring(0, queryIndex);
        
        // Parse query string and merge with config.params (config.params takes precedence)
        const urlParams = {};
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key) {
            urlParams[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
          }
        });
        params = { ...urlParams, ...params };
      }
      
      const cached = getCachedResponse(baseUrl, params);
      if (cached) {
        // Mark this as a cached response for performance tracking
        if (typeof window !== 'undefined') {
          config._fromCache = true;
        }
        return Promise.reject({
          __cached: true,
          data: cached,
          config,
        });
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  async (response) => {
    if (typeof window !== 'undefined' && response.config._startTime) {
      const duration = Date.now() - response.config._startTime;
      import('../utils/performanceMonitor.js').then(({ default: perfMonitor }) => {
        perfMonitor.trackAPICall(
          response.config.url,
          response.config.method,
          duration,
          response.status
        );
      });
    }

    // Handle CSRF token from response (if provided)
    const csrfToken = response.headers['x-csrf-token'] || response.data?.csrfToken;
    if (csrfToken) {
      import('../utils/securityUtils.js').then(({ setCsrfToken }) => {
        setCsrfToken(csrfToken);
      }).catch(() => {
        // Silently fail if module doesn't exist
      });
    }

    // Handle token expiry info from response
    if (response.data?.expiresIn) {
      const expiry = Date.now() + (response.data.expiresIn * 1000);
      setAccessTokenExpiry(expiry);
    }

    // Store rate limit info
    const rateLimitInfo = getRateLimitInfo(response);
    if (rateLimitInfo.limit !== null) {
      import('../utils/rateLimiter.js').then(({ storeRateLimitInfo }) => {
        storeRateLimitInfo(response.config?.url || 'unknown', rateLimitInfo);
      }).catch(() => {
        // Silently fail if module doesn't exist
      });
    }

    const config = response.config;
    if (shouldCache(config.method, config.url)) {
      // Extract base URL and params properly (same logic as request interceptor)
      let baseUrl = config.url || '';
      let params = config.params || {};
      
      // If URL already contains query params, extract them
      const queryIndex = baseUrl.indexOf('?');
      if (queryIndex !== -1) {
        const queryString = baseUrl.substring(queryIndex + 1);
        baseUrl = baseUrl.substring(0, queryIndex);
        
        const urlParams = {};
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key) {
            urlParams[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
          }
        });
        params = { ...urlParams, ...params };
      }
      
      let ttl = CACHE_CONFIG.posts.ttl;
      
      if (baseUrl.includes('/categories') || baseUrl.includes('/tags')) {
        ttl = CACHE_CONFIG.categories.ttl;
      } else if (baseUrl.includes('/notifications')) {
        ttl = CACHE_CONFIG.notifications.ttl;
      } else if (baseUrl.includes('/auth/profile') || baseUrl.includes('/authors/')) {
        ttl = CACHE_CONFIG.authorProfile.ttl;
      }
      
      setCachedResponse(baseUrl, params, response.data, ttl);
    }
    
    return response;
  },
  async (error) => {
    if (error.__cached) {
      // Return cached response as a proper axios response
      const cachedResponse = {
        data: error.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        __fromCache: true,
      };
      
      // Track performance for cached responses
      if (typeof window !== 'undefined' && error.config._startTime) {
        const duration = Date.now() - error.config._startTime;
        import('../utils/performanceMonitor.js').then(({ default: perfMonitor }) => {
          perfMonitor.trackAPICall(
            error.config.url,
            error.config.method,
            duration,
            200
          );
        }).catch(() => {
          // Silently fail if module doesn't exist
        });
      }
      
      return Promise.resolve(cachedResponse);
    }
    
    // Log errors (but not sensitive data) - only in development
    // Skip logging 404s for optional features (audit logs, 2FA) to reduce noise
    const isOptionalFeature = error.config?.url?.includes('/audit-logs') || 
                              error.config?.url?.includes('/2fa/status');
    
    if (!error.silent && import.meta.env.DEV && !(error.response?.status === 404 && isOptionalFeature)) {
      const fullUrl = error.config?.baseURL 
        ? `${error.config.baseURL}${error.config.url}` 
        : error.config?.url;
      // Security: Only log detailed error info in development to prevent exposing API structure
      if (import.meta.env.DEV) {
        console.error('API request failed:', {
          url: error.config?.url,
          fullUrl: fullUrl,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
          hasToken: !!error.config?.headers?.Authorization,
        });
      }
    }
    
    // Mark 404s for optional features as silent to prevent error toasts
    if (error.response?.status === 404 && isOptionalFeature) {
      error.silent = true;
    }
    
    // Network errors (no response from server)
    if (!error.response) {
      // Security: Only log network errors in development
      if (import.meta.env.DEV) {
        console.error('Network error:', error.message);
      }
      // For network errors, don't treat as auth issue - just reject
      // Don't clear tokens on network errors
      error.silent = true; // Don't show error toasts for network issues
      return Promise.reject(error);
    }
    
    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const rateLimitInfo = getRateLimitInfo(error.response);
      const retryAfter = rateLimitInfo.retryAfter || rateLimitInfo.reset 
        ? Math.ceil((rateLimitInfo.reset * 1000 - Date.now()) / 1000)
        : null;
      
      error.rateLimitInfo = rateLimitInfo;
      error.message = `Rate limit exceeded. ${formatRetryMessage(retryAfter)}`;
      
      // Don't show toast immediately - let the component handle it
      error.silent = false;
      
      return Promise.reject(error);
    }
    
    // Handle account lockout (423)
    if (error.response?.status === 423) {
      const lockoutInfo = error.response.data || {};
      const lockoutDuration = lockoutInfo.lockoutDuration || lockoutInfo.duration;
      const lockoutReason = lockoutInfo.reason || lockoutInfo.message || 'Account temporarily locked';
      
      const lockoutData = {
        duration: lockoutDuration,
        reason: lockoutReason,
        until: lockoutInfo.lockoutUntil || (lockoutDuration ? Date.now() + (lockoutDuration * 1000) : null),
      };
      
      error.lockoutInfo = lockoutData;
      error.message = lockoutDuration 
        ? `${lockoutReason} Please try again in ${Math.ceil(lockoutDuration / 60)} minute(s).`
        : lockoutReason;
      
      error.silent = false; // Show lockout message
      
      // Dispatch account lockout event for SecurityHandler
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('account-lockout', {
          detail: { lockoutInfo: lockoutData },
        }));
      }
      
      return Promise.reject(error);
    }
    
    // Handle forbidden (403) - might be CSRF or permission issue
    if (error.response?.status === 403) {
      const errorData = error.response.data || {};
      
      // Check if it's a CSRF error
      if (errorData.code === 'CSRF_ERROR' || errorData.message?.toLowerCase().includes('csrf')) {
        // Try to fetch new CSRF token and retry
        try {
          await fetchCsrfToken(api);
          // Retry the original request
          const retryConfig = { ...error.config };
          const csrf = await getCsrfToken();
          if (csrf) {
            retryConfig.headers['X-CSRF-Token'] = csrf;
          }
          return api.request(retryConfig);
        } catch (csrfError) {
          error.message = 'Security token expired. Please refresh the page.';
          error.silent = false;
          return Promise.reject(error);
        }
      }
      
      // Other 403 errors
      error.message = errorData.message || 'Access forbidden';
      error.silent = false;
      return Promise.reject(error);
    }
    
    // Handle 401 - try refresh token first
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const requestNormalizedUrl = requestUrl.replace(/^\/v1\//, '').replace(/^\//, '');
      
      // Don't try to refresh on refresh endpoint or auth endpoints (except /auth/me)
      const isAuthEndpoint = requestNormalizedUrl.startsWith('auth/') && 
        !requestNormalizedUrl.includes('refresh') && 
        requestNormalizedUrl !== 'auth/me';
      
      // Try to refresh token if we have a refresh token and it's not an auth endpoint
      if (!isAuthEndpoint && !error.config?.skipAuthRefresh) {
        try {
          const newToken = await refreshAccessToken(api);
          if (newToken) {
            // Retry the original request with new token
            const retryConfig = { ...error.config };
            retryConfig.headers.Authorization = `Bearer ${newToken}`;
            return api.request(retryConfig);
          }
        } catch (refreshError) {
          // Refresh failed, continue with normal 401 handling
          // Security: Only log token refresh failures in development
          if (import.meta.env.DEV) {
            console.warn('[API] Token refresh failed:', refreshError);
          }
        }
      }
      
      // Normal 401 handling
      // Only redirect to login for protected endpoints, not public content
      // Axios provides the URL in error.config.url (relative to baseURL)
      const baseURL = error.config?.baseURL || '';
      
      // Normalize URL - remove base path to check endpoint pattern
      // Handle both /v1/posts/slug and /posts/slug formats, and full URLs
      let normalizedUrl = requestUrl.replace(/^\/v1\//, '').replace(/^\//, '');
      // Also handle full URLs if baseURL is included in url
      if (normalizedUrl.includes('://')) {
        normalizedUrl = normalizedUrl.replace(/^https?:\/\/[^/]+/, '').replace(/^\/v1\//, '').replace(/^\//, '');
      }
      // Remove baseURL from normalizedUrl if it's there
      if (baseURL && normalizedUrl.startsWith(baseURL.replace(/^https?:\/\/[^/]+/, ''))) {
        normalizedUrl = normalizedUrl.replace(baseURL.replace(/^https?:\/\/[^/]+/, ''), '').replace(/^\/v1\//, '').replace(/^\//, '');
      }
      
      
      // Check if this is a public endpoint that shouldn't require authentication
      // Match patterns like: posts/slug, categories/slug, authors/username, tags/tag, search
      const isPublicEndpoint = 
        // Public post endpoints (GET /posts/:slug, but not create/update/delete/bulk)
        (normalizedUrl.match(/^posts\/[^/]+$/) && !normalizedUrl.includes('/create') && !normalizedUrl.includes('/update') && !normalizedUrl.includes('/delete') && !normalizedUrl.includes('/bulk')) ||
        // Public post-related endpoints (related posts)
        normalizedUrl.match(/^posts\/[^/]+\/related$/) ||
        // Public comments endpoints (GET comments for a post)
        normalizedUrl.match(/^comments\/[^/]+\/comments$/) ||
        // Public category endpoints
        (normalizedUrl.startsWith('categories') && !normalizedUrl.includes('/create') && !normalizedUrl.includes('/update') && !normalizedUrl.includes('/delete')) ||
        // Public author profile endpoints
        normalizedUrl.match(/^authors\/[^/]+$/) ||
        // Public tag endpoints
        normalizedUrl.match(/^tags\/[^/]+$/) ||
        // Search endpoint
        normalizedUrl.startsWith('search') ||
        // Public polls endpoint (GET poll by post)
        normalizedUrl.match(/^polls\/post\/[^/]+$/);
      
      // Special case: /auth/me endpoint - NEVER redirect for this endpoint
      // It's just a verification call, and failing it shouldn't force login
      // This allows users to browse public content even with invalid/expired token
      const isAuthMe = normalizedUrl === 'auth/me';
      
      // Special case: /collaborations endpoints - these are optional and should fail silently
      // They're already handled with try-catch in components, so don't redirect
      const isCollaborationsEndpoint = normalizedUrl.startsWith('collaborations/');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isOnPublicPage = currentPath && (
        currentPath.startsWith('/posts/') ||
        currentPath.startsWith('/categories/') ||
        currentPath.startsWith('/authors/') ||
        currentPath.startsWith('/tags/') ||
        currentPath.startsWith('/search') ||
        currentPath === '/' ||
        currentPath.startsWith('/preview/')
      );
      
      // For protected endpoints, redirect to login (unless it's /auth/me, collaborations, or a public endpoint)
      // IMPORTANT: /auth/me and /collaborations should NEVER cause a redirect
      if (!isPublicEndpoint && !isAuthMe && !isCollaborationsEndpoint) {
          clearAllTokens();
          localStorage.removeItem('user');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
      } else {
        // For public endpoints with 401, just clear invalid token but don't redirect
        // This allows users to view public content even if their token is invalid
        if (import.meta.env.DEV) {
          console.warn('[API] 401 on public endpoint or auth/me on public page, clearing token but not redirecting:', {
            normalizedUrl,
            fullUrl: url,
            currentPage: currentPath,
            isPublicEndpoint,
            isAuthMe,
            isOnPublicPage
          });
        }
        clearAllTokens();
        // Don't remove user from localStorage as they might still be viewing public content
      }
    }
    
    if (error.response?.status === 404) {
      const url = error.config?.url || '';
      const normalizedUrl = url.replace(/^\/v1\//, '').replace(/^\//, '');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      // Silent 404s for optional resources
      if (url.includes('/polls/post/')) {
        error.silent = true;
        return Promise.reject(error);
      }
      
      // Posts endpoints are public - 404s might be legitimate OR might indicate a routing issue
      // Check if it's the main /posts endpoint (which should always exist)
      const isPostsEndpoint = 
        normalizedUrl === 'posts' ||
        normalizedUrl.startsWith('posts/') ||
        normalizedUrl.startsWith('categories/') ||
        normalizedUrl.startsWith('tags/') ||
        normalizedUrl.startsWith('authors/') ||
        normalizedUrl.startsWith('search');
      
      // Special handling for main /posts endpoint - this should NEVER 404
      // If it does, it's likely a routing/server issue, not a missing resource
      if (normalizedUrl === 'posts') {
        // Main posts endpoint 404 = server/routing issue, not auth issue
        // Log it but don't clear token
        if (import.meta.env.DEV) {
          // Security: Only log critical errors in development to prevent exposing API structure
          if (import.meta.env.DEV) {
            console.error('[API] CRITICAL: /posts endpoint returned 404. This should never happen. Check backend routing.');
            console.error('[API] Full request details:', {
              url: error.config?.url,
              baseURL: error.config?.baseURL,
              fullUrl: error.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : error.config?.url,
              method: error.config?.method,
              hasToken: !!error.config?.headers?.Authorization
            });
          }
        }
        error.silent = true;
        return Promise.reject(error);
      }
      
      if (isPostsEndpoint) {
        // Other posts endpoints (specific post, categories, etc.) - legitimate 404s possible
        // Mark as silent to avoid error toasts for missing posts
        error.silent = true;
        return Promise.reject(error);
      }
      
      // Check if this is a protected endpoint (admin, auth, dashboard related)
      // Exclude /auth/me and /auth/login/register as they're handled separately
      const isProtectedEndpoint = 
        (normalizedUrl.startsWith('admin/') ||
        normalizedUrl.startsWith('auth/allusers') ||
        normalizedUrl.startsWith('auth/stats') ||
        normalizedUrl.includes('/dashboard') ||
        normalizedUrl.includes('/settings') ||
        normalizedUrl.includes('/collaborations') ||
        normalizedUrl.includes('/authors/apply') ||
        normalizedUrl.includes('/authors/applications')) &&
        !normalizedUrl.includes('/polls/post/') &&
        normalizedUrl !== 'auth/me';
      
      // Check if user is on a protected page
      const isProtectedPage = currentPath && (
        currentPath.startsWith('/admin/') ||
        currentPath.startsWith('/dashboard') ||
        currentPath.startsWith('/settings')
      );
      
      // If 404 on a protected endpoint or protected page, might be expired token or server issue
      // Be more conservative - only clear token if we're sure it's an auth issue
      if (isProtectedEndpoint || isProtectedPage) {
        // Don't show 404 error toast - it might be an auth issue
        error.silent = true;
        
        // Only clear token and redirect if:
        // 1. We're on a protected page AND
        // 2. The endpoint is definitely an auth endpoint (not just any protected endpoint)
        // This prevents clearing valid tokens due to server issues or missing endpoints
        const isAuthEndpoint = normalizedUrl.startsWith('auth/') && 
          (normalizedUrl === 'auth/me' || normalizedUrl.startsWith('auth/allusers') || normalizedUrl.startsWith('auth/stats'));
        
        // Only clear token for auth endpoints, not for all protected endpoints
        // Other 404s might be legitimate (missing resources, etc.)
        if (isProtectedPage && isAuthEndpoint && typeof window !== 'undefined') {
          // This is likely an auth issue - clear token and redirect
          clearAuthToken();
          localStorage.removeItem('user');
          localStorage.removeItem('lastAuthCheck');
          const redirectPath = `/login?redirect=${encodeURIComponent(currentPath)}`;
          window.location.href = redirectPath;
        }
        // For other protected endpoints with 404, don't clear token
        // It might be a server issue or missing resource, not an auth problem
      }
    }
    
    // Mark collaborations 401 errors as silent (expected for public posts)
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/collaborations/') && url.includes('/collaborators')) {
        error.silent = true;
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  getUserProfile: (userId) => api.get(`/auth/profile/${userId}`),
  updateProfile: (userId, data) => api.put(`/auth/update/${userId}`, data),
  deleteUser: (userId) => api.delete(`/auth/delete/${userId}`),
  forgotPassword: (email, frontendUrl = null) => {
    const data = { email };
    // Include frontend URL so backend can generate correct reset link
    if (frontendUrl) {
      data.frontendUrl = frontendUrl;
    } else if (typeof window !== 'undefined') {
      data.frontendUrl = window.location.origin;
    }
    return api.post('/auth/forgot-password', data);
  },
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  validateResetToken: (token) => api.get('/auth/validate-reset-token', { params: { token } }),
  refresh: () => api.post('/auth/refresh', {}, { skipAuthRefresh: true, skipCsrf: true, withCredentials: true }),
  getCsrfToken: () => api.get('/auth/csrf-token', { skipAuthRefresh: true, skipCsrf: true }),
  logout: () => api.post('/auth/logout', {}, { skipAuthRefresh: true }),
  // 2FA endpoints
  setup2FA: () => api.post('/auth/2fa/setup'),
  verify2FA: (code) => api.post('/auth/2fa/verify', { code }, { skipAuthRefresh: true }),
  verify2FALogin: (code, tempToken) => api.post('/auth/login', { twoFactorCode: code, tempToken }, { skipAuthRefresh: true, skipCsrf: true }),
  disable2FA: (code) => api.post('/auth/2fa/disable', { code }),
  get2FAStatus: () => api.get('/auth/2fa/status'),
  // Session management
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (sessionId) => api.delete(`/auth/sessions/${sessionId}`),
  revokeAllSessions: () => api.delete('/auth/sessions/all'),
  // Audit logging
  getAuditLogs: (params) => api.get('/auth/audit-logs', { params }),
  getMyAuditLogs: (params) => api.get('/auth/me/audit-logs', { params }),
};

export const postsAPI = {
  getAll: (params) => {
    const requestKey = `get:/posts:${JSON.stringify(params || {})}`;
    return deduplicateRequest(requestKey, () => {
      const url = '/posts';
      if (import.meta.env.DEV) {
        console.log('[PostsAPI] Fetching posts from:', url, 'with params:', params);
        console.log('[PostsAPI] Base URL:', BASE_URL);
        console.log('[PostsAPI] Full URL will be:', `${BASE_URL}${url}`);
      }
      return api.get(url, { params });
    });
  },
  getBySlug: (slug) => {
    const requestKey = `get:/posts/${slug}:`;
    return deduplicateRequest(requestKey, () => api.get(`/posts/${slug}`));
  },
  create: async (data) => {
    const response = await api.post('/posts/create', data);
    clearCache('/posts');
    clearCache('/categories');
    return response;
  },
  update: async (id, data) => {
    const response = await api.put(`/posts/update/${id}`, data);
    clearCache('/posts');
    clearCache(`/posts/${id}`);
    return response;
  },
  delete: async (id) => {
    const response = await api.delete(`/posts/delete/${id}`);
    clearCache('/posts');
    clearCache(`/posts/${id}`);
    return response;
  },
  like: (id) => api.post(`/interactions/${id}/like`),
  dislike: (id) => api.post(`/interactions/${id}/dislike`),
  share: (id) => api.post(`/interactions/${id}/share`),
  bookmark: (id) => api.post(`/interactions/${id}/bookmark`),
  getRelated: (id) => api.get(`/posts/${id}/related`),
  bulkDelete: async (postIds) => {
    const response = await api.post('/posts/bulk-delete', { postIds });
    clearCache('/posts');
    return response;
  },
  bulkUpdate: async (postIds, updates) => {
    const response = await api.put('/posts/bulk-update', { postIds, updates });
    clearCache('/posts');
    return response;
  },
};

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  markAsViewed: (notificationId) => api.patch(`/notifications/${notificationId}/viewed`),
  markAllAsRead: () => api.patch('/notifications/mark-all-read'),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (settings) => api.put('/notifications/settings', settings),
  delete: (notificationId) => api.delete(`/notifications/${notificationId}`),
  deleteAll: () => api.delete('/notifications/clear-all'),
};

export const interactionsAPI = {
  like: (postId) => api.post(`/interactions/${postId}/like`),
  dislike: (postId) => api.post(`/interactions/${postId}/dislike`),
  share: (postId) => api.post(`/interactions/${postId}/share`),
  bookmark: (postId) => api.post(`/interactions/${postId}/bookmark`),
  getPostInteractions: (postId) => api.get(`/interactions/${postId}/interactions`),
  getUserLikedPosts: (params) => api.get('/interactions/me/likes', { params }),
  getUserBookmarkedPosts: (params) => api.get('/interactions/me/bookmarks', { params }),
  react: (postId, reactionType) => api.post(`/interactions/${postId}/react`, { reactionType }),
  getReactions: (postId) => api.get(`/interactions/${postId}/reactions`),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
  getPosts: (slug, params) => api.get(`/categories/${slug}/posts`, { params }),
  getStats: () => api.get('/categories/stats'),
  create: (data) => api.post('/categories/create', data),
  update: (id, data) => api.put(`/categories/update/${id}`, data),
  delete: (id) => api.delete(`/categories/delete/${id}`),
};

export const commentsAPI = {
  getByPost: (postId, params) => api.get(`/comments/${postId}/comments`, { params }),
  create: async (postId, data) => {
    const response = await api.post(`/comments/create/${postId}`, data);
    clearCache(`/comments/${postId}`);
    clearCache(`/posts/${postId}`);
    return response;
  },
  update: async (id, data) => {
    const response = await api.put(`/comments/update/${id}`, data);
    clearCache('/comments');
    return response;
  },
  delete: async (id) => {
    const response = await api.delete(`/comments/delete/${id}`);
    clearCache('/comments');
    return response;
  },
  like: async (id) => {
    const response = await api.post(`/comments/like/${id}`);
    // Clear cache to ensure fresh data on next fetch
    clearCache('/comments');
    return response;
  },
};

export const newsletterAPI = {
  subscribe: (payload) => {
    const body = typeof payload === 'string' ? { email: payload } : payload;
    return api.post('/newsletters/subscribe', body);
  },
  unsubscribe: (email) => api.get('/newsletters/unsubscribe', { params: { email } }),
  getAll: (params) => api.get('/newsletters', { params }),
  getArchive: (params) => api.get('/newsletters/archive', { params }),
};

export const searchAPI = {
  search: (params) => api.get('/search', { params }),
  getPopularTags: () => api.get('/search/tags/popular'),
  getSuggestions: (q) => api.get('/search/suggestions', { params: { q } }),
};

export const dashboardAPI = {
  getOverview: () => api.get('/dashboard'),
  getPosts: (params) => api.get('/dashboard/posts', { params }),
  getComments: (params) => api.get('/dashboard/comments', { params }),
  getLikes: (params) => api.get('/dashboard/likes', { params }),
  getHistory: (params) => api.get('/dashboard/history', { params }),
  getBookmarks: (params) => api.get('/interactions/me/bookmarks', { params }),
};

export const adminAPI = {
  getUsers: (params) => api.get('/auth/allusers', { params }),
  getUserStats: () => api.get('/auth/stats'),
  promoteUser: (userId) => api.post(`/admin/promote/${userId}`),
  demoteUser: (userId) => api.post(`/admin/demote/${userId}`),
  demoteToAuthor: (userId) => api.post(`/admin/demote-to-author/${userId}`),
  getNewsletterStats: () => api.get('/newsletters/stats'),
  getNewsletterSubscribers: () => api.get('/newsletters/subscribers'),
  sendNewsletter: (data) => api.post('/newsletters/send', data),
  notifyNewPost: (postId) => api.post(`/newsletters/notify-new-post/${postId}`),
};

export const imagesAPI = {
  upload: (formData) => {
    // Don't set Content-Type header manually - browser needs to set it with boundary
    // The interceptor will handle removing the default Content-Type for FormData
    return api.post('/images/upload', formData);
  },
  getInfo: () => api.get('/images'),
  delete: (imageUrl) => api.delete('/images/delete', { data: { imageUrl } }),
};

export const authorsAPI = {
  apply: (data) => api.post('/authors/apply', data),
  getApplications: (params) => api.get('/authors/applications', { params }),
  reviewApplication: (applicationId, data) => api.post(`/authors/applications/${applicationId}/review`, data),
  promoteToAuthor: (userId) => api.post(`/authors/users/${userId}/promote`),
  demoteFromAuthor: (userId) => api.post(`/authors/users/${userId}/demote`),
};

export const pollsAPI = {
  getAll: (params) => api.get('/polls', { params }),
  getById: (pollId) => api.get(`/polls/${pollId}`),
  create: (data) => api.post('/polls', data),
  update: (pollId, data) => api.put(`/polls/${pollId}`, data),
  delete: (pollId) => api.delete(`/polls/${pollId}`),
  vote: (pollId, optionId) => api.post(`/polls/${pollId}/vote`, { optionId }),
  getResults: (pollId) => api.get(`/polls/${pollId}/results`),
  getByPost: (postId) => {
    return api.get(`/polls/post/${postId}`, {
      validateStatus: function (status) {
        return status === 200 || status === 404;
      }
    });
  },
  getAnalytics: (pollId) => api.get(`/polls/${pollId}/analytics`),
  exportResults: (pollId, format = 'json') => api.get(`/polls/${pollId}/export`, { 
    params: { format },
    responseType: format === 'csv' ? 'blob' : 'json'
  }),
};

export const collaborationsAPI = {
  invite: (postId, email, role) => api.post(`/collaborations/${postId}/invite`, { email, role }),
  acceptInvitation: (invitationId) => api.post(`/collaborations/invitations/${invitationId}/accept`),
  rejectInvitation: (invitationId) => api.post(`/collaborations/invitations/${invitationId}/reject`),
  revokeInvitation: (invitationId) => api.post(`/collaborations/invitations/${invitationId}/revoke`),
  getCollaborators: (postId) => api.get(`/collaborations/${postId}/collaborators`),
  removeCollaborator: (postId, userId) => api.delete(`/collaborations/${postId}/collaborators/${userId}`),
  getMyInvitations: (includeSent = false) => {
    const params = includeSent ? { include: 'sent' } : {};
    return api.get('/collaborations/me/invitations', { params });
  },
  getSentInvitations: (postId) => api.get(`/collaborations/${postId}/invitations/sent`),
  getPostInvitations: (postId) => api.get(`/collaborations/${postId}/invitations`),
  getMySentInvitations: () => api.get('/collaborations/me/invitations/sent'),
};

export const followsAPI = {
  follow: (userId) => api.post(`/follows/${userId}/follow`),
  unfollow: (userId) => api.delete(`/follows/${userId}/follow`),
  getStatus: (userId) => api.get(`/follows/${userId}/status`),
  getFollowers: (userId, params) => api.get(`/follows/${userId}/followers`, { params }),
  getFollowing: (userId, params) => api.get(`/follows/${userId}/following`, { params }),
  getStats: (userId) => api.get(`/follows/${userId}/stats`),
};

export const templatesAPI = {
  getAll: () => api.get('/templates'),
  getById: (templateId) => api.get(`/templates/${templateId}`),
  create: (data) => api.post('/templates', data),
  update: (templateId, data) => api.put(`/templates/${templateId}`, data),
  delete: (templateId) => api.delete(`/templates/${templateId}`),
  use: (templateId) => api.post(`/templates/${templateId}/use`),
  initializeDefaults: () => api.post('/templates/initialize-defaults'),
};

export default api;