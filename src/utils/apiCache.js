/**
 * Simple in-memory API response cache
 * For production, consider using React Query or SWR
 */

const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

// Cache statistics for monitoring (production-safe)
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  clears: 0,
  lastHitTime: null,
  lastMissTime: null,
};

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
    // Cache hit
    cacheStats.hits++;
    cacheStats.lastHitTime = Date.now();
    
    // Production-safe monitoring: use Performance API
    if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
      try {
        window.performance.mark('cache-hit');
      } catch (e) {
        // Silently fail if performance API is not available
      }
    }
    
    return cached.data;
  }
  
  // Cache miss
  cacheStats.misses++;
  cacheStats.lastMissTime = Date.now();
  
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
  cacheStats.sets++;
};

/**
 * Get cache statistics (for debugging and monitoring)
 */
export const getCacheStats = () => {
  const now = Date.now();
  const stats = {
    total: cache.size,
    valid: 0,
    expired: 0,
    keys: [],
    // Performance metrics
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    sets: cacheStats.sets,
    clears: cacheStats.clears,
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
      : '0%',
    lastHitTime: cacheStats.lastHitTime,
    lastMissTime: cacheStats.lastMissTime,
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
    const clearedCount = cache.size;
    cache.clear();
    cacheStats.clears += clearedCount;
    return;
  }
  
  let clearedCount = 0;
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
      clearedCount++;
    }
  }
  cacheStats.clears += clearedCount;
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
  
  // Expose cache stats to window for production debugging (optional)
  // Access via: window.__cacheStats() in browser console
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_CACHE_DEBUG === 'true') {
    window.__cacheStats = getCacheStats;
    window.__cacheClear = clearCache;
  }
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

