/**
 * Retry utility for failed API calls
 */
export const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2); // Exponential backoff
  }
};

/**
 * Retry with custom error handler
 */
export const retryWithHandler = async (fn, onError, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (onError) {
      onError(error, retries);
    }
    if (retries <= 0) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithHandler(fn, onError, retries - 1, delay * 2);
  }
};

export default retry;

