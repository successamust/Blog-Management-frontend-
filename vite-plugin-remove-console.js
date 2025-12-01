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
      // Use a more careful regex that doesn't break function parsing
      let transformedCode = code;
      try {
        // Match console.log/info/debug with balanced parentheses
        const regex = /console\.(log|info|debug)\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*;?/g;
        transformedCode = transformedCode.replace(regex, '');
      } catch (e) {
        // If regex fails, return original code
        return null;
      }

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

