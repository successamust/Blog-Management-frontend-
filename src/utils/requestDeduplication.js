/**
 * Request deduplication utility
 * Prevents duplicate simultaneous API requests
 */

const pendingRequests = new Map();

/**
 * Generate request key
 */
const getRequestKey = (method, url, data) => {
  const dataStr = data ? JSON.stringify(data) : '';
  return `${method}:${url}:${dataStr}`;
};

/**
 * Deduplicate request - returns existing promise if request is in flight
 */
export const deduplicateRequest = (requestKey, requestFn) => {
  // If request is already pending, return existing promise
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  // Create new request
  const promise = requestFn()
    .then((response) => {
      pendingRequests.delete(requestKey);
      return response;
    })
    .catch((error) => {
      pendingRequests.delete(requestKey);
      throw error;
    });
  
  pendingRequests.set(requestKey, promise);
  return promise;
};

/**
 * Clear pending requests (useful for testing or cleanup)
 */
export const clearPendingRequests = () => {
  pendingRequests.clear();
};

