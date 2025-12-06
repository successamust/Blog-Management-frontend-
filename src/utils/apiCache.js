/**
 * Simple in-memory API response cache
 * For production, consider using React Query or SWR
 */

const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from request config
 */
const getCacheKey = (url, params = {}) => {
  if (!url) return '';
  
  // Normalize URL - remove trailing slashes (except root)
  const normalizedUrl = url.endsWith('/') && url !== '/' ? url.slice(0, -1) : url;
  
  // Handle params - filter out undefined/null and sort for consistency
  const validParams = {};
  Object.keys(params || {}).forEach(key => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      validParams[key] = String(value);
    }
  });
  
  const sortedParams = Object.keys(validParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(validParams[key])}`)
    .join('&');
    
  return `${normalizedUrl}${sortedParams ? `?${sortedParams}` : ''}`;
};

/**
 * Check if cached data is still valid
 */
const isCacheValid = (cachedData) => {
  if (!cachedData) return false;
  return Date.now() < cachedData.expiresAt;
};

/**
 * Get cached response
 */
export const getCachedResponse = (url, params = {}) => {
  const key = getCacheKey(url, params);
  const cached = cache.get(key);
  
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }
  
  // Remove expired cache
  if (cached) {
    cache.delete(key);
  }
  
  // Periodically clean up expired entries (every 100 cache checks)
  // This is more efficient than checking on every call
  if (cache.size > 0 && Math.random() < 0.01) {
    clearExpiredCache();
  }
  
  return null;
};

/**
 * Set cached response
 */
export const setCachedResponse = (url, params = {}, data, ttl = DEFAULT_TTL) => {
  const key = getCacheKey(url, params);
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
};

/**
 * Get cache statistics (for debugging)
 */
export const getCacheStats = () => {
  const now = Date.now();
  const stats = {
    total: cache.size,
    valid: 0,
    expired: 0,
    keys: [],
  };
  
  for (const [key, value] of cache.entries()) {
    if (now < value.expiresAt) {
      stats.valid++;
    } else {
      stats.expired++;
    }
    stats.keys.push(key);
  }
  
  return stats;
};

/**
 * Clear cache for specific URL pattern
 */
export const clearCache = (urlPattern) => {
  if (!urlPattern) {
    cache.clear();
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
};

/**
 * Clear all expired cache entries
 */
export const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now >= value.expiresAt) {
      cache.delete(key);
    }
  }
};

// Clean up expired cache every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(clearExpiredCache, 10 * 60 * 1000);
}

/**
 * Cache configuration for different endpoints
 */
export const CACHE_CONFIG = {
  // Long cache (1 hour)
  categories: { ttl: 60 * 60 * 1000 },
  tags: { ttl: 60 * 60 * 1000 },
  userProfile: { ttl: 30 * 60 * 1000 },
  
  // Medium cache (5 minutes)
  posts: { ttl: 5 * 60 * 1000 },
  postDetail: { ttl: 5 * 60 * 1000 },
  authorProfile: { ttl: 5 * 60 * 1000 },
  
  // Short cache (1 minute)
  notifications: { ttl: 1 * 60 * 1000 },
  unreadCount: { ttl: 1 * 60 * 1000 },
  
  // No cache
  create: { ttl: 0 },
  update: { ttl: 0 },
  delete: { ttl: 0 },
};

/**
 * Determine if request should be cached
 */
export const shouldCache = (method, url) => {
  // Only cache GET requests
  if (method !== 'get') return false;
  
  // Don't cache auth endpoints
  if (url.includes('/auth/')) return false;
  
  // Don't cache admin endpoints
  if (url.includes('/admin/')) return false;
  
  return true;
};

