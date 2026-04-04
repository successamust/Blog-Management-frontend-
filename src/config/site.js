/**
 * Public site origin for canonical URLs, Open Graph, and share links (no trailing slash).
 * In the browser, uses the current deployment origin; otherwise VITE_SITE_URL or production default.
 */
export function getSiteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const fromEnv = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  return 'https://www.nexusblog.xyz';
}
