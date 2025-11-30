/**
 * Vite plugin to remove console.log statements in production builds
 * Keeps console.error and console.warn for debugging
 */
export function removeConsolePlugin() {
  return {
    name: 'remove-console',
    enforce: 'post',
    transform(code, id) {
      // Only process in production and for JS/JSX/TS/TSX files
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }

      if (!/\.(js|jsx|ts|tsx)$/.test(id)) {
        return null;
      }

      // Remove console.log, console.info, console.debug
      // Keep console.error and console.warn
      const transformedCode = code
        .replace(/console\.(log|info|debug)\s*\([^)]*\)\s*;?/g, '')
        .replace(/console\.(log|info|debug)\s*\([^)]*\)/g, '');

      if (transformedCode !== code) {
        return {
          code: transformedCode,
          map: null,
        };
      }

      return null;
    },
  };
}

