import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { removeConsolePlugin } from './vite-plugin-remove-console.js'

export default defineConfig({
  plugins: [
    react(),
    // Remove console.log in production (keeps console.error and console.warn)
    ...(process.env.NODE_ENV === 'production' ? [removeConsolePlugin()] : []),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    proxy: {
      '/v1': {
        target: 'https://blog-management-sx5c.onrender.com',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015',
    cssCodeSplit: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 600,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Ensure proper module resolution
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Don't split React - keep it in entry chunk to ensure it's always available
          // This prevents "Cannot set properties of undefined" errors
          if (id.includes('node_modules')) {
            // React core - keep in entry chunk (don't split)
            if (
              id === 'react' || 
              id === 'react-dom' ||
              id.endsWith('/react') ||
              id.endsWith('/react-dom') ||
              id.includes('/react/') || 
              id.includes('/react-dom/') ||
              id.includes('scheduler') ||
              id.includes('/react/jsx-runtime') ||
              id.includes('/react/jsx-dev-runtime')
            ) {
              // Return undefined to keep in entry chunk
              return undefined;
            }
            // React Router - keep with React in entry
            if (id.includes('react-router')) {
              return undefined;
            }
            // React Query - keep with React in entry
            if (id.includes('@tanstack/react-query')) {
              return undefined;
            }
            // ALL React-related libraries - keep in entry
            if (
              id.includes('react-hot-toast') || 
              id.includes('react-markdown') ||
              id.includes('react-quill') ||
              id.includes('@tiptap/react') ||
              (id.includes('react-') && !id.includes('react-dom'))
            ) {
              return undefined;
            }
            // UI libraries (these don't bundle React, but depend on it)
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            // Editor libraries (non-React parts)
            if (id.includes('quill') || (id.includes('tiptap') && !id.includes('react'))) {
              return 'editor-vendor';
            }
            // Chart libraries
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            // Other large vendors
            if (id.includes('axios') || id.includes('socket.io')) {
              return 'network-vendor';
            }
            // Everything else
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Preserve email-assets folder structure for email templates
          if (assetInfo.name && assetInfo.name.includes('email-assets')) {
            return `email-assets/[name][extname]`;
          }
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
