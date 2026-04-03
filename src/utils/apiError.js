/**
 * Normalizes API error bodies from the Nexus backend (v2): `message`, `detail`,
 * `code`, express-validator `errors[]`, and legacy `error` string.
 *
 * @param {import('axios').AxiosError | Error | unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong.') {
  if (!error || typeof error !== 'object') return fallback;

  const axiosError = /** @type {import('axios').AxiosError} */ (error);
  const data = axiosError.response?.data;
  const status = axiosError.response?.status;

  if (data && typeof data === 'object') {
    const errs = data.errors;
    if (Array.isArray(errs) && errs.length > 0) {
      const parts = errs
        .map((e) => {
          if (typeof e === 'string') return e.trim();
          if (e && typeof e === 'object') {
            if (typeof e.msg === 'string') return e.msg.trim();
            if (typeof e.message === 'string') return e.message.trim();
          }
          return '';
        })
        .filter(Boolean);
      if (parts.length) return parts.join('. ');
    }

    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }

    if (import.meta.env.DEV && typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail.trim();
    }

    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }

    if (data.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
      return data.error.message.trim();
    }

    if (status === 404 && data.code === 'ROUTE_NOT_FOUND') {
      return typeof data.message === 'string' && data.message.trim()
        ? data.message.trim()
        : 'The requested resource was not found.';
    }
  }

  const msg = axiosError.message;
  if (typeof msg === 'string' && msg.trim() && !/^Request failed with status code \d+$/.test(msg)) {
    return msg.trim();
  }

  return fallback;
}

/**
 * Ensures `error.response.data.message` is set when the backend used another shape
 * (so existing `error.response?.data?.message` call sites keep working).
 *
 * @param {import('axios').AxiosError} error
 */
export function hydrateAxiosErrorMessage(error) {
  const msg = getApiErrorMessage(error, '');
  if (!msg) return;
  error.userMessage = msg;
  const data = error.response?.data;
  if (data && typeof data === 'object' && !data.message) {
    data.message = msg;
  }
}
