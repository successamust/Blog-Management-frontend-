/**
 * Rate Limiting Handler
 * Manages rate limit errors, retries, and user feedback
 */

const RATE_LIMIT_STORAGE_KEY = 'nexus_rate_limits';
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second

/**
 * Get rate limit info from response headers
 */
export const getRateLimitInfo = (response) => {
  const headers = response?.headers || {};
  
  return {
    limit: parseInt(headers['x-ratelimit-limit']) || null,
    remaining: parseInt(headers['x-ratelimit-remaining']) || null,
    reset: parseInt(headers['x-ratelimit-reset']) || null,
    retryAfter: parseInt(headers['retry-after']) || null,
  };
};

/**
 * Calculate retry delay with exponential backoff
 */
export const calculateRetryDelay = (attempt, retryAfter = null) => {
  if (retryAfter) {
    return retryAfter * 1000; // Convert to milliseconds
  }
  
  // Exponential backoff: 1s, 2s, 4s
  return BASE_RETRY_DELAY * Math.pow(2, attempt);
};

/**
 * Store rate limit info
 */
export const storeRateLimitInfo = (endpoint, info) => {
  if (typeof localStorage === 'undefined') return;
  
  try {
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_STORAGE_KEY) || '{}');
    stored[endpoint] = {
      ...info,
      timestamp: Date.now(),
    };
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.warn('[RateLimit] Failed to store rate limit info:', error);
  }
};

/**
 * Get stored rate limit info
 */
export const getStoredRateLimitInfo = (endpoint) => {
  if (typeof localStorage === 'undefined') return null;
  
  try {
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_STORAGE_KEY) || '{}');
    return stored[endpoint] || null;
  } catch (error) {
    return null;
  }
};

/**
 * Format retry time message
 */
export const formatRetryMessage = (retryAfter) => {
  if (!retryAfter) {
    return 'Please try again in a moment.';
  }
  
  const seconds = Math.ceil(retryAfter);
  if (seconds < 60) {
    return `Please try again in ${seconds} second${seconds !== 1 ? 's' : ''}.`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
  }
  
  const hours = Math.ceil(minutes / 60);
  return `Please try again in ${hours} hour${hours !== 1 ? 's' : ''}.`;
};

/**
 * Handle rate limit error with retry logic
 */
export const handleRateLimitError = async (error, retryFn, attempt = 0) => {
  if (error.response?.status !== 429) {
    throw error; // Not a rate limit error
  }
  
  const rateLimitInfo = getRateLimitInfo(error.response);
  const endpoint = error.config?.url || 'unknown';
  
  // Store rate limit info
  storeRateLimitInfo(endpoint, rateLimitInfo);
  
  // Check if we should retry
  if (attempt >= MAX_RETRIES) {
    const message = formatRetryMessage(rateLimitInfo.retryAfter);
    throw {
      ...error,
      rateLimitInfo,
      message: `Rate limit exceeded. ${message}`,
    };
  }
  
  // Calculate retry delay
  const delay = calculateRetryDelay(attempt, rateLimitInfo.retryAfter);
  
  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Retry the request
  try {
    return await retryFn();
  } catch (retryError) {
    if (retryError.response?.status === 429 && attempt < MAX_RETRIES - 1) {
      return handleRateLimitError(retryError, retryFn, attempt + 1);
    }
    throw retryError;
  }
};

/**
 * Check if endpoint is currently rate limited
 */
export const isEndpointRateLimited = (endpoint) => {
  const stored = getStoredRateLimitInfo(endpoint);
  if (!stored) {
    return false;
  }
  
  // Check if rate limit has reset
  if (stored.reset && Date.now() < stored.reset * 1000) {
    return true;
  }
  
  return false;
};

/**
 * Get remaining time until rate limit resets
 */
export const getRateLimitResetTime = (endpoint) => {
  const stored = getStoredRateLimitInfo(endpoint);
  if (!stored || !stored.reset) {
    return null;
  }
  
  const resetTime = stored.reset * 1000;
  const remaining = resetTime - Date.now();
  
  return remaining > 0 ? remaining : null;
};

